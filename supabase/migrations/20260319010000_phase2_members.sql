-- Phase 2: member directory privacy, onboarding, household invite codes
-- Run in Supabase SQL Editor after Phase 1 migration.

-- ---------------------------------------------------------------------------
-- Profile privacy + onboarding columns
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists directory_visible boolean not null default false,
  add column if not exists show_email boolean not null default false,
  add column if not exists show_phone boolean not null default false,
  add column if not exists show_photo boolean not null default true,
  add column if not exists onboarding_completed_at timestamptz;

comment on column public.profiles.directory_visible is 'Opt-in: appear in the member directory';
comment on column public.profiles.show_email is 'When in directory, expose email';
comment on column public.profiles.show_phone is 'When in directory, expose phone';
comment on column public.profiles.show_photo is 'When in directory, expose photo_url';

create index if not exists profiles_directory_visible_idx
  on public.profiles (directory_visible)
  where directory_visible = true;

-- ---------------------------------------------------------------------------
-- Household invite codes
-- ---------------------------------------------------------------------------
alter table public.households
  add column if not exists invite_code text;

update public.households
set invite_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
where invite_code is null;

alter table public.households
  alter column invite_code set not null,
  alter column invite_code set default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

create unique index if not exists households_invite_code_key
  on public.households (invite_code);

-- ---------------------------------------------------------------------------
-- Directory visibility: members may read opted-in profiles (and own/admin)
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_select_own_or_admin" on public.profiles;

create policy "profiles_select_own_admin_or_directory"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.is_admin()
  or directory_visible = true
);

-- View that masks contact fields per privacy flags (invoker = still RLS-checked)
create or replace view public.member_directory
with (security_invoker = true)
as
select
  p.id,
  p.display_name,
  p.first_name,
  p.last_name,
  case when p.show_photo then p.photo_url else null end as photo_url,
  case when p.show_email then p.email else null end as email,
  case when p.show_phone then p.phone else null end as phone,
  p.membership_status,
  p.household_id
from public.profiles p
where p.directory_visible = true;

grant select on public.member_directory to authenticated;

-- Allow onboarding to set membership_status once; still lock role for non-admins
create or replace function public.protect_sensitive_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.role := old.role;
    -- Permit membership_status change only while completing onboarding
    if not (
      old.onboarding_completed_at is null
      and new.onboarding_completed_at is not null
    ) then
      new.membership_status := old.membership_status;
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Onboarding completion (allows controlled membership_status transition)
-- ---------------------------------------------------------------------------
create or replace function public.complete_onboarding(p_intent text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
  next_status public.membership_status;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_intent = 'visitor' then
    next_status := 'visitor';
  elsif p_intent = 'member' then
    next_status := 'pending';
  else
    raise exception 'Invalid intent. Use visitor or member.';
  end if;

  update public.profiles
  set
    membership_status = next_status,
    onboarding_completed_at = now()
  where id = auth.uid()
  returning * into result;

  if result.id is null then
    raise exception 'Profile not found';
  end if;

  return result;
end;
$$;

revoke all on function public.complete_onboarding(text) from public;
grant execute on function public.complete_onboarding(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Household helpers
-- ---------------------------------------------------------------------------
create or replace function public.create_household(p_name text)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.households;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.households (name)
  values (nullif(trim(p_name), ''))
  returning * into result;

  update public.profiles
  set household_id = result.id
  where id = auth.uid();

  return result;
end;
$$;

revoke all on function public.create_household(text) from public;
grant execute on function public.create_household(text) to authenticated;

create or replace function public.join_household_by_code(p_code text)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.households;
  normalized text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  normalized := upper(trim(p_code));

  select * into result
  from public.households
  where invite_code = normalized;

  if result.id is null then
    raise exception 'Household not found for that code';
  end if;

  update public.profiles
  set household_id = result.id
  where id = auth.uid();

  return result;
end;
$$;

revoke all on function public.join_household_by_code(text) from public;
grant execute on function public.join_household_by_code(text) to authenticated;

create or replace function public.leave_household()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.profiles
  set household_id = null
  where id = auth.uid();
end;
$$;

revoke all on function public.leave_household() from public;
grant execute on function public.leave_household() to authenticated;

-- Household of current user (avoids RLS recursion in policies)
create or replace function public.my_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id
  from public.profiles
  where id = auth.uid();
$$;

revoke all on function public.my_household_id() from public;
grant execute on function public.my_household_id() to authenticated;

-- Household members can read fellow members' profiles in the same household
create policy "profiles_select_same_household"
on public.profiles
for select
to authenticated
using (
  household_id is not null
  and household_id = public.my_household_id()
);

-- Allow household select by invite lookup is via security definer join fn.
-- Members of a household (and admins) already covered; also allow reading
-- a household you just created before profile update completes — covered by member policy.
