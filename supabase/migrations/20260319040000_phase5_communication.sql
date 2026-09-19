-- Phase 5: announcements (+ reactions/comments), prayer requests, notifications,
-- preferences, broadcasts, push tokens. Delivery via Expo Push (edge function).
-- Run in Supabase SQL Editor after Phase 1–4 migrations.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.prayer_visibility as enum ('public', 'group_only', 'private');
create type public.notification_category as enum (
  'announcements',
  'events',
  'broadcasts',
  'prayer'
);
create type public.push_delivery_status as enum ('pending', 'sent', 'skipped', 'failed');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_approved_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.profile_id = auth.uid()
      and gm.status = 'approved'
  );
$$;

revoke all on function public.is_approved_group_member(uuid) from public;
grant execute on function public.is_approved_group_member(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Announcements
-- ---------------------------------------------------------------------------
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  author_id uuid references public.profiles (id) on delete set null,
  published boolean not null default true,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index announcements_published_at_idx
  on public.announcements (published_at desc)
  where published = true;

create trigger announcements_set_updated_at
before update on public.announcements
for each row
execute function public.set_updated_at();

-- Fixed emoji set enforced in app; DB allows any single grapheme cluster string.
create table public.announcement_reactions (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 8),
  created_at timestamptz not null default now(),
  unique (announcement_id, profile_id, emoji)
);

create index announcement_reactions_announcement_id_idx
  on public.announcement_reactions (announcement_id);

create table public.announcement_comments (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  -- Snapshot so names render even when profiles RLS hides non-directory members.
  author_display_name text,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index announcement_comments_announcement_id_idx
  on public.announcement_comments (announcement_id, created_at);

create trigger announcement_comments_set_updated_at
before update on public.announcement_comments
for each row
execute function public.set_updated_at();

create or replace function public.stamp_announcement_comment_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select coalesce(nullif(display_name, ''), nullif(first_name, ''), 'Member')
  into new.author_display_name
  from public.profiles
  where id = new.author_id;
  return new;
end;
$$;

create trigger announcement_comments_stamp_author
before insert on public.announcement_comments
for each row
execute function public.stamp_announcement_comment_author();

-- ---------------------------------------------------------------------------
-- Prayer requests
-- ---------------------------------------------------------------------------
create table public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  author_display_name text,
  body text not null check (char_length(trim(body)) > 0),
  visibility public.prayer_visibility not null default 'public',
  is_anonymous boolean not null default false,
  group_id uuid references public.groups (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prayer_group_required_when_group_only check (
    (visibility = 'group_only' and group_id is not null)
    or (visibility <> 'group_only')
  )
);

create index prayer_requests_created_at_idx on public.prayer_requests (created_at desc);
create index prayer_requests_group_id_idx on public.prayer_requests (group_id);
create index prayer_requests_author_id_idx on public.prayer_requests (author_id);

create trigger prayer_requests_set_updated_at
before update on public.prayer_requests
for each row
execute function public.set_updated_at();

create or replace function public.stamp_prayer_request_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select coalesce(nullif(display_name, ''), nullif(first_name, ''), 'Member')
  into new.author_display_name
  from public.profiles
  where id = new.author_id;
  return new;
end;
$$;

create trigger prayer_requests_stamp_author
before insert on public.prayer_requests
for each row
execute function public.stamp_prayer_request_author();

-- ---------------------------------------------------------------------------
-- Notification preferences + push tokens + notifications + broadcasts
-- ---------------------------------------------------------------------------
create table public.notification_preferences (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  announcements boolean not null default true,
  events boolean not null default true,
  broadcasts boolean not null default true,
  prayer boolean not null default true,
  updated_at timestamptz not null default now()
);

create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row
execute function public.set_updated_at();

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  token text not null,
  platform text not null default 'unknown',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, token)
);

create index push_tokens_profile_id_idx on public.push_tokens (profile_id);

create trigger push_tokens_set_updated_at
before update on public.push_tokens
for each row
execute function public.set_updated_at();

create table public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  group_id uuid not null references public.groups (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index broadcasts_group_id_idx on public.broadcasts (group_id);
create index broadcasts_created_at_idx on public.broadcasts (created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  category public.notification_category not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  push_status public.push_delivery_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index notifications_profile_created_idx
  on public.notifications (profile_id, created_at desc);
create index notifications_push_pending_idx
  on public.notifications (created_at)
  where push_status = 'pending';

-- ---------------------------------------------------------------------------
-- Prefs bootstrap on new profile
-- ---------------------------------------------------------------------------
create or replace function public.ensure_notification_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_preferences (profile_id)
  values (new.id)
  on conflict (profile_id) do nothing;
  return new;
end;
$$;

create trigger profiles_ensure_notification_preferences
after insert on public.profiles
for each row
execute function public.ensure_notification_preferences();

-- Backfill existing profiles
insert into public.notification_preferences (profile_id)
select id from public.profiles
on conflict (profile_id) do nothing;

-- ---------------------------------------------------------------------------
-- Fan-out: announcement → notifications (respect prefs)
-- ---------------------------------------------------------------------------
create or replace function public.fanout_announcement_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.published is not true then
    return new;
  end if;

  insert into public.notifications (profile_id, category, title, body, data, push_status)
  select
    p.id,
    'announcements'::public.notification_category,
    new.title,
    left(new.body, 240),
    jsonb_build_object('announcement_id', new.id, 'type', 'announcement'),
    'pending'::public.push_delivery_status
  from public.profiles p
  left join public.notification_preferences np on np.profile_id = p.id
  where coalesce(np.announcements, true) = true
    and p.id is distinct from new.author_id;

  return new;
end;
$$;

create trigger announcements_fanout_notifications
after insert on public.announcements
for each row
execute function public.fanout_announcement_notifications();

-- ---------------------------------------------------------------------------
-- Fan-out: broadcast → group members
-- ---------------------------------------------------------------------------
create or replace function public.fanout_broadcast_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (profile_id, category, title, body, data, push_status)
  select
    gm.profile_id,
    'broadcasts'::public.notification_category,
    new.title,
    left(new.body, 240),
    jsonb_build_object(
      'broadcast_id', new.id,
      'group_id', new.group_id,
      'type', 'broadcast'
    ),
    'pending'::public.push_delivery_status
  from public.group_members gm
  left join public.notification_preferences np on np.profile_id = gm.profile_id
  where gm.group_id = new.group_id
    and gm.status = 'approved'
    and coalesce(np.broadcasts, true) = true
    and gm.profile_id is distinct from new.author_id;

  return new;
end;
$$;

create trigger broadcasts_fanout_notifications
after insert on public.broadcasts
for each row
execute function public.fanout_broadcast_notifications();

-- ---------------------------------------------------------------------------
-- Fan-out: public prayer → opted-in members
-- ---------------------------------------------------------------------------
create or replace function public.fanout_prayer_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.visibility <> 'public' then
    return new;
  end if;

  insert into public.notifications (profile_id, category, title, body, data, push_status)
  select
    p.id,
    'prayer'::public.notification_category,
    'New prayer request',
    left(new.body, 240),
    jsonb_build_object('prayer_request_id', new.id, 'type', 'prayer'),
    'pending'::public.push_delivery_status
  from public.profiles p
  left join public.notification_preferences np on np.profile_id = p.id
  where coalesce(np.prayer, true) = true
    and p.id is distinct from new.author_id;

  return new;
end;
$$;

create trigger prayer_requests_fanout_notifications
after insert on public.prayer_requests
for each row
execute function public.fanout_prayer_notifications();

-- ---------------------------------------------------------------------------
-- Convert due event reminders into notifications (called by edge function)
-- ---------------------------------------------------------------------------
create or replace function public.materialize_due_event_reminders(p_limit integer default 100)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  r record;
begin
  for r in
    select
      q.id as queue_id,
      q.profile_id,
      q.event_id,
      q.occurrence_start,
      q.offset_minutes,
      e.title as event_title
    from public.event_reminder_queue q
    join public.events e on e.id = q.event_id
    left join public.notification_preferences np on np.profile_id = q.profile_id
    where q.status = 'pending'
      and q.fire_at <= now()
      and coalesce(np.events, true) = true
    order by q.fire_at
    limit greatest(p_limit, 1)
    for update of q skip locked
  loop
    insert into public.notifications (profile_id, category, title, body, data, push_status)
    values (
      r.profile_id,
      'events',
      'Upcoming: ' || r.event_title,
      case
        when r.offset_minutes >= 1440 then
          'Starts in about ' || (r.offset_minutes / 1440)::text || ' day(s).'
        when r.offset_minutes >= 60 then
          'Starts in about ' || (r.offset_minutes / 60)::text || ' hour(s).'
        else
          'Starts in about ' || r.offset_minutes::text || ' minute(s).'
      end,
      jsonb_build_object(
        'event_id', r.event_id,
        'occurrence_start', r.occurrence_start,
        'type', 'event_reminder'
      ),
      'pending'
    );

    update public.event_reminder_queue
    set status = 'sent'
    where id = r.queue_id;

    v_count := v_count + 1;
  end loop;

  -- Cancel due items for users who opted out of event pushes
  update public.event_reminder_queue q
  set status = 'cancelled'
  from public.notification_preferences np
  where q.profile_id = np.profile_id
    and np.events = false
    and q.status = 'pending'
    and q.fire_at <= now();

  return v_count;
end;
$$;

revoke all on function public.materialize_due_event_reminders(integer) from public;
-- Invoked with service role from the edge function only.

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.announcements enable row level security;
alter table public.announcement_reactions enable row level security;
alter table public.announcement_comments enable row level security;
alter table public.prayer_requests enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.push_tokens enable row level security;
alter table public.broadcasts enable row level security;
alter table public.notifications enable row level security;

-- Announcements
create policy "announcements_select_published_or_admin"
on public.announcements for select to authenticated
using (published = true or public.is_admin());

create policy "announcements_insert_admin"
on public.announcements for insert to authenticated
with check (public.is_admin() and author_id = auth.uid());

create policy "announcements_update_admin"
on public.announcements for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "announcements_delete_admin"
on public.announcements for delete to authenticated
using (public.is_admin());

-- Reactions
create policy "announcement_reactions_select_authenticated"
on public.announcement_reactions for select to authenticated
using (
  exists (
    select 1 from public.announcements a
    where a.id = announcement_id
      and (a.published = true or public.is_admin())
  )
);

create policy "announcement_reactions_insert_own"
on public.announcement_reactions for insert to authenticated
with check (
  profile_id = auth.uid()
  and exists (
    select 1 from public.announcements a
    where a.id = announcement_id and a.published = true
  )
);

create policy "announcement_reactions_delete_own"
on public.announcement_reactions for delete to authenticated
using (profile_id = auth.uid());

-- Comments
create policy "announcement_comments_select_authenticated"
on public.announcement_comments for select to authenticated
using (
  exists (
    select 1 from public.announcements a
    where a.id = announcement_id
      and (a.published = true or public.is_admin())
  )
);

create policy "announcement_comments_insert_own"
on public.announcement_comments for insert to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.announcements a
    where a.id = announcement_id and a.published = true
  )
);

create policy "announcement_comments_update_own"
on public.announcement_comments for update to authenticated
using (author_id = auth.uid() or public.is_admin())
with check (author_id = auth.uid() or public.is_admin());

create policy "announcement_comments_delete_own_or_admin"
on public.announcement_comments for delete to authenticated
using (author_id = auth.uid() or public.is_admin());

-- Prayer: public → all; group_only → approved members; private → author only
create policy "prayer_requests_select_visibility"
on public.prayer_requests for select to authenticated
using (
  author_id = auth.uid()
  or visibility = 'public'
  or (
    visibility = 'group_only'
    and group_id is not null
    and public.is_approved_group_member(group_id)
  )
);

create policy "prayer_requests_insert_own"
on public.prayer_requests for insert to authenticated
with check (
  author_id = auth.uid()
  and (
    visibility <> 'group_only'
    or (
      group_id is not null
      and public.is_approved_group_member(group_id)
    )
  )
);

create policy "prayer_requests_update_own"
on public.prayer_requests for update to authenticated
using (author_id = auth.uid())
with check (author_id = auth.uid());

create policy "prayer_requests_delete_own_or_admin"
on public.prayer_requests for delete to authenticated
using (author_id = auth.uid() or public.is_admin());

-- Preferences
create policy "notification_preferences_select_own"
on public.notification_preferences for select to authenticated
using (profile_id = auth.uid() or public.is_admin());

create policy "notification_preferences_upsert_own"
on public.notification_preferences for insert to authenticated
with check (profile_id = auth.uid());

create policy "notification_preferences_update_own"
on public.notification_preferences for update to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

-- Push tokens
create policy "push_tokens_select_own"
on public.push_tokens for select to authenticated
using (profile_id = auth.uid() or public.is_admin());

create policy "push_tokens_insert_own"
on public.push_tokens for insert to authenticated
with check (profile_id = auth.uid());

create policy "push_tokens_update_own"
on public.push_tokens for update to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

create policy "push_tokens_delete_own"
on public.push_tokens for delete to authenticated
using (profile_id = auth.uid());

-- Broadcasts: members of target group can read; admin or group leader can create
create policy "broadcasts_select_group_or_admin"
on public.broadcasts for select to authenticated
using (
  public.is_admin()
  or public.is_approved_group_member(group_id)
  or public.leads_group(group_id)
);

create policy "broadcasts_insert_admin_or_leader"
on public.broadcasts for insert to authenticated
with check (
  author_id = auth.uid()
  and (
    public.is_admin()
    or public.leads_group(group_id)
  )
);

create policy "broadcasts_delete_admin_or_leader"
on public.broadcasts for delete to authenticated
using (
  public.is_admin()
  or public.leads_group(group_id)
);

-- In-app notifications
create policy "notifications_select_own"
on public.notifications for select to authenticated
using (profile_id = auth.uid());

create policy "notifications_update_own"
on public.notifications for update to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());
