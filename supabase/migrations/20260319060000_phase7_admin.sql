-- Phase 7: Admin — media upload permissions, super admin, moderation visibility
-- Run in Supabase SQL Editor after Phase 6 migration.

-- ---------------------------------------------------------------------------
-- Upload permission flag (admins assign; leaders/admins always can upload)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists can_upload_media boolean not null default false;

comment on column public.profiles.can_upload_media is
  'When true, member may publish media items and photo albums. Admins and group_leaders always can.';

-- Super admin: fixed congregation owner email
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and lower(coalesce(email, '')) = 'rccgauburn@gmail.com'
  );
$$;

revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated;

create or replace function public.can_upload_media()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (
        role = 'admin'
        or role = 'group_leader'
        or can_upload_media = true
      )
  );
$$;

revoke all on function public.can_upload_media() from public;
grant execute on function public.can_upload_media() to authenticated;

-- Promote / keep super-admin email as admin whenever they exist
update public.profiles
set
  role = 'admin',
  can_upload_media = true,
  membership_status = case
    when membership_status = 'visitor' then 'active'
    else membership_status
  end
where lower(coalesce(email, '')) = 'rccgauburn@gmail.com';

-- Also promote on signup if they register later
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(new.email, ''));
  v_role public.user_role := 'member';
  v_can_upload boolean := false;
begin
  if v_email = 'rccgauburn@gmail.com' then
    v_role := 'admin';
    v_can_upload := true;
  end if;

  insert into public.profiles (id, email, phone, display_name, role, can_upload_media)
  values (
    new.id,
    new.email,
    new.phone,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Member'
    ),
    v_role,
    v_can_upload
  );
  return new;
end;
$$;

-- Protect role / membership / upload flag; only super admin may grant admin
create or replace function public.protect_sensitive_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.role := old.role;
    new.membership_status := old.membership_status;
    new.can_upload_media := old.can_upload_media;
    return new;
  end if;

  -- Regular admins cannot grant or revoke admin, or edit another admin
  if not public.is_super_admin() then
    if old.role = 'admin' and new.role is distinct from old.role then
      new.role := old.role;
    end if;
    if new.role = 'admin' and old.role is distinct from 'admin' then
      new.role := old.role;
    end if;
    if old.role = 'admin' and old.id is distinct from auth.uid() then
      -- non-super cannot change other admins' sensitive fields
      new.role := old.role;
      new.membership_status := old.membership_status;
      new.can_upload_media := old.can_upload_media;
    end if;
  end if;

  -- Super admin email always stays admin
  if lower(coalesce(old.email, '')) = 'rccgauburn@gmail.com' then
    new.role := 'admin';
    new.can_upload_media := true;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Media / album RLS: uploaders (admin, leader, or can_upload_media flag)
-- ---------------------------------------------------------------------------
drop policy if exists "media_items_admin_write" on public.media_items;
drop policy if exists "media_items_uploader_write" on public.media_items;

create policy "media_items_uploader_write"
on public.media_items
for all
to authenticated
using (public.can_upload_media())
with check (public.can_upload_media());

drop policy if exists "photo_albums_admin_write" on public.photo_albums;
drop policy if exists "photo_albums_uploader_write" on public.photo_albums;

create policy "photo_albums_uploader_write"
on public.photo_albums
for all
to authenticated
using (public.can_upload_media())
with check (public.can_upload_media());

drop policy if exists "photos_admin_write" on public.photos;
drop policy if exists "photos_uploader_write" on public.photos;

create policy "photos_uploader_write"
on public.photos
for all
to authenticated
using (public.can_upload_media())
with check (public.can_upload_media());

-- Storage: uploaders may write
drop policy if exists "sermon_audio_admin_write" on storage.objects;
drop policy if exists "sermon_audio_uploader_write" on storage.objects;

create policy "sermon_audio_uploader_write"
on storage.objects
for all
to authenticated
using (bucket_id = 'sermon-audio' and public.can_upload_media())
with check (bucket_id = 'sermon-audio' and public.can_upload_media());

drop policy if exists "photo_albums_admin_write" on storage.objects;
drop policy if exists "photo_albums_uploader_write" on storage.objects;

create policy "photo_albums_uploader_write"
on storage.objects
for all
to authenticated
using (bucket_id = 'photo-albums' and public.can_upload_media())
with check (bucket_id = 'photo-albums' and public.can_upload_media());

-- Uploaders can see unpublished media/albums they manage
drop policy if exists "media_items_select_published" on public.media_items;

create policy "media_items_select_published_or_uploader"
on public.media_items
for select
to authenticated
using (published = true or public.can_upload_media());

drop policy if exists "photo_albums_select_published" on public.photo_albums;

create policy "photo_albums_select_published_or_uploader"
on public.photo_albums
for select
to authenticated
using (published = true or public.can_upload_media());

drop policy if exists "photos_select_published_album" on public.photos;

create policy "photos_select_published_or_uploader"
on public.photos
for select
to authenticated
using (
  public.can_upload_media()
  or exists (
    select 1 from public.photo_albums a
    where a.id = album_id and a.published = true
  )
);

-- ---------------------------------------------------------------------------
-- Moderation: admins see all prayers (incl. private) for delete tooling
-- ---------------------------------------------------------------------------
drop policy if exists "prayer_requests_select_visibility" on public.prayer_requests;

create policy "prayer_requests_select_visibility"
on public.prayer_requests for select to authenticated
using (
  public.is_admin()
  or author_id = auth.uid()
  or visibility = 'public'
  or (
    visibility = 'group_only'
    and group_id is not null
    and public.is_approved_group_member(group_id)
  )
);

-- Admins can list all profiles for role management (already have select)
-- Ensure directory-style browse for admins without directory_visible
-- (profiles_select_own_or_admin already covers this)
