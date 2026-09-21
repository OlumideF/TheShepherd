-- =============================================================================
-- ONE-SHOT FIX: promote rccgauburn@gmail.com (SQL Editor safe)
-- Paste this alone into Supabase SQL Editor and Run.
-- =============================================================================

-- Fix the trigger that was silently reverting role changes from the SQL Editor
create or replace function public.protect_sensitive_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(coalesce(old.email, '')) = 'rccgauburn@gmail.com'
     or lower(coalesce(new.email, '')) = 'rccgauburn@gmail.com' then
    new.role := 'admin';
    new.can_upload_media := true;
  end if;

  if auth.uid() is null then
    return new;
  end if;

  if not public.is_admin()
     and current_setting('app.syncing_group_leader', true) is distinct from 'on' then
    new.role := old.role;
    new.can_upload_media := old.can_upload_media;
    if not (
      old.onboarding_completed_at is null
      and new.onboarding_completed_at is not null
    ) then
      new.membership_status := old.membership_status;
    end if;
    return new;
  end if;

  if not public.is_admin()
     and current_setting('app.syncing_group_leader', true) = 'on' then
    new.can_upload_media := old.can_upload_media;
    if not (
      old.onboarding_completed_at is null
      and new.onboarding_completed_at is not null
    ) then
      new.membership_status := old.membership_status;
    end if;
    return new;
  end if;

  if not public.is_super_admin() then
    if old.role = 'admin' and new.role is distinct from old.role then
      new.role := old.role;
    end if;
    if new.role = 'admin' and old.role is distinct from 'admin' then
      new.role := old.role;
    end if;
    if old.role = 'admin' and old.id is distinct from auth.uid() then
      new.role := old.role;
      new.membership_status := old.membership_status;
      new.can_upload_media := old.can_upload_media;
    end if;
  end if;

  if lower(coalesce(old.email, '')) = 'rccgauburn@gmail.com'
     or lower(coalesce(new.email, '')) = 'rccgauburn@gmail.com' then
    new.role := 'admin';
    new.can_upload_media := true;
  end if;

  return new;
end;
$$;

-- Now promote (this will stick)
update public.profiles p
set
  role = 'admin',
  can_upload_media = true,
  membership_status = 'active',
  email = coalesce(nullif(p.email, ''), u.email)
from auth.users u
where p.id = u.id
  and (
    lower(coalesce(p.email, '')) = 'rccgauburn@gmail.com'
    or lower(coalesce(u.email, '')) = 'rccgauburn@gmail.com'
  );

-- Confirm it worked (should show role = admin)
select id, email, role, membership_status, can_upload_media
from public.profiles
where lower(coalesce(email, '')) = 'rccgauburn@gmail.com';
