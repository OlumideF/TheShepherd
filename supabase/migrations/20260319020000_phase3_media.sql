-- Phase 3: media items, photo albums, storage policies
-- Run in Supabase SQL Editor after Phase 1 + Phase 2 migrations.

create type public.audio_status as enum ('none', 'processing', 'ready');
create type public.media_kind as enum ('sermon', 'event', 'other');

create table public.media_items (
  id uuid primary key default gen_random_uuid(),
  kind public.media_kind not null default 'sermon',
  title text not null,
  series text,
  speaker text,
  preached_at date,
  topic text,
  youtube_id text,
  audio_file_path text,
  audio_status public.audio_status not null default 'none',
  duration_seconds integer,
  is_live boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_items_has_source check (
    youtube_id is not null or audio_file_path is not null
  )
);

create index media_items_preached_at_idx on public.media_items (preached_at desc nulls last);
create index media_items_series_idx on public.media_items (series);
create index media_items_speaker_idx on public.media_items (speaker);
create index media_items_is_live_idx on public.media_items (is_live) where is_live = true;
create index media_items_published_idx on public.media_items (published) where published = true;

create trigger media_items_set_updated_at
before update on public.media_items
for each row
execute function public.set_updated_at();

-- Photo albums (event_id nullable until Phase 4 events table exists)
create table public.photo_albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  cover_path text,
  event_id uuid,
  taken_on date,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger photo_albums_set_updated_at
before update on public.photo_albums
for each row
execute function public.set_updated_at();

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.photo_albums (id) on delete cascade,
  storage_path text not null,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index photos_album_id_idx on public.photos (album_id, sort_order);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.media_items enable row level security;
alter table public.photo_albums enable row level security;
alter table public.photos enable row level security;

create policy "media_items_select_published"
on public.media_items
for select
to authenticated
using (published = true or public.is_admin());

create policy "media_items_admin_write"
on public.media_items
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "photo_albums_select_published"
on public.photo_albums
for select
to authenticated
using (published = true or public.is_admin());

create policy "photo_albums_admin_write"
on public.photo_albums
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "photos_select_published_album"
on public.photos
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.photo_albums a
    where a.id = album_id and a.published = true
  )
);

create policy "photos_admin_write"
on public.photos
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage buckets (sermon audio + photos)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'sermon-audio',
    'sermon-audio',
    false,
    104857600,
    array['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a']
  ),
  (
    'photo-albums',
    'photo-albums',
    false,
    20971520,
    array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
  )
on conflict (id) do nothing;

-- Authenticated members can read sermon audio + photos
create policy "sermon_audio_read_authenticated"
on storage.objects
for select
to authenticated
using (bucket_id = 'sermon-audio');

create policy "sermon_audio_admin_write"
on storage.objects
for all
to authenticated
using (bucket_id = 'sermon-audio' and public.is_admin())
with check (bucket_id = 'sermon-audio' and public.is_admin());

create policy "photo_albums_read_authenticated"
on storage.objects
for select
to authenticated
using (bucket_id = 'photo-albums');

create policy "photo_albums_admin_write"
on storage.objects
for all
to authenticated
using (bucket_id = 'photo-albums' and public.is_admin())
with check (bucket_id = 'photo-albums' and public.is_admin());
