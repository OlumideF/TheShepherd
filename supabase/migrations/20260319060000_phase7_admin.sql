-- =============================================================================
-- Phase 7: Admin
-- Media upload permissions, super admin, album/media RLS, moderation visibility
--
-- Run in Supabase SQL Editor to enable the Admin hub.
-- Prerequisite: Phase 6 migration applied.
-- Safe to re-run (idempotent): drops policies before recreating them.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Schema: upload permission flag
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists can_upload_media boolean not null default false;

comment on column public.profiles.can_upload_media is
  'When true, member may publish media items and photo albums. Admins and group_leaders always can.';

-- ---------------------------------------------------------------------------
-- 2. Helpers: super admin, admin, upload permission
-- ---------------------------------------------------------------------------
-- Super admin = fixed congregation owner email (JWT preferred, then profiles.email)
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(
    nullif(auth.jwt() ->> 'email', ''),
    (select email from public.profiles where id = auth.uid()),
    ''
  )) = 'rccgauburn@gmail.com';
$$;

revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated;

-- Admin role OR super-admin email (so RLS works before role row is synced)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_super_admin()
    or exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'admin'
    );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Who may publish media / albums / storage objects
create or replace function public.can_upload_media()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_super_admin()
    or exists (
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

-- ---------------------------------------------------------------------------
-- 3. Promote existing rccgauburn@gmail.com (auth or profile email)
-- ---------------------------------------------------------------------------
update public.profiles p
set
  role = 'admin',
  can_upload_media = true,
  email = coalesce(nullif(p.email, ''), u.email),
  membership_status = case
    when p.membership_status = 'visitor' then 'active'::public.membership_status
    else p.membership_status
  end
from auth.users u
where p.id = u.id
  and (
    lower(coalesce(p.email, '')) = 'rccgauburn@gmail.com'
    or lower(coalesce(u.email, '')) = 'rccgauburn@gmail.com'
  );

-- ---------------------------------------------------------------------------
-- 4. Login sync: promote current user if JWT email is super admin
-- ---------------------------------------------------------------------------
create or replace function public.ensure_super_admin()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_row public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if v_email = 'rccgauburn@gmail.com' then
    update public.profiles
    set
      role = 'admin',
      can_upload_media = true,
      email = coalesce(nullif(email, ''), auth.jwt() ->> 'email'),
      membership_status = case
        when membership_status = 'visitor' then 'active'::public.membership_status
        else membership_status
      end
    where id = auth.uid()
    returning * into v_row;
  else
    select * into v_row from public.profiles where id = auth.uid();
  end if;

  return v_row;
end;
$$;

revoke all on function public.ensure_super_admin() from public;
grant execute on function public.ensure_super_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Signup: auto-promote super admin on first register
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 6. Protect role / membership / upload flag
--    - Non-admins cannot change them
--    - Only super admin may grant/revoke admin
--    - Super admin email always stays admin + upload
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 7. Media / album / photo RLS (uploaders write; members read published)
-- ---------------------------------------------------------------------------
drop policy if exists "media_items_admin_write" on public.media_items;
drop policy if exists "media_items_uploader_write" on public.media_items;
drop policy if exists "media_items_select_published" on public.media_items;
drop policy if exists "media_items_select_published_or_uploader" on public.media_items;

create policy "media_items_select_published_or_uploader"
on public.media_items
for select
to authenticated
using (published = true or public.can_upload_media());

create policy "media_items_uploader_write"
on public.media_items
for all
to authenticated
using (public.can_upload_media())
with check (public.can_upload_media());

drop policy if exists "photo_albums_admin_write" on public.photo_albums;
drop policy if exists "photo_albums_uploader_write" on public.photo_albums;
drop policy if exists "photo_albums_select_published" on public.photo_albums;
drop policy if exists "photo_albums_select_published_or_uploader" on public.photo_albums;

create policy "photo_albums_select_published_or_uploader"
on public.photo_albums
for select
to authenticated
using (published = true or public.can_upload_media());

create policy "photo_albums_uploader_write"
on public.photo_albums
for all
to authenticated
using (public.can_upload_media())
with check (public.can_upload_media());

drop policy if exists "photos_admin_write" on public.photos;
drop policy if exists "photos_uploader_write" on public.photos;
drop policy if exists "photos_select_published_album" on public.photos;
drop policy if exists "photos_select_published_or_uploader" on public.photos;

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

create policy "photos_uploader_write"
on public.photos
for all
to authenticated
using (public.can_upload_media())
with check (public.can_upload_media());

-- ---------------------------------------------------------------------------
-- 8. Storage RLS (sermon audio + photo albums)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 9. Moderation: admins see all prayers (including private)
-- ---------------------------------------------------------------------------
drop policy if exists "prayer_requests_select_visibility" on public.prayer_requests;

create policy "prayer_requests_select_visibility"
on public.prayer_requests
for select
to authenticated
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

-- =============================================================================
-- Done. Sign out and back in as rccgauburn@gmail.com to refresh the session.
-- =============================================================================
