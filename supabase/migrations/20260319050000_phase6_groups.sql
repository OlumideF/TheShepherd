-- Phase 6: Groups — browse/join, leader roster, in-group messages,
-- meeting attendance, group-scoped announcements (church-wide table).
-- Run in Supabase SQL Editor after Phase 1–5 migrations.

-- ---------------------------------------------------------------------------
-- Groups: approval toggle + creator
-- ---------------------------------------------------------------------------
alter table public.groups
  add column if not exists requires_approval boolean not null default true,
  add column if not exists created_by uuid references public.profiles (id) on delete set null;

comment on column public.groups.requires_approval is
  'When true, join requests stay pending until a leader/admin approves. When false, join is auto-approved.';

-- ---------------------------------------------------------------------------
-- Group members: display name snapshot for roster (profiles RLS otherwise hides)
-- ---------------------------------------------------------------------------
alter table public.group_members
  add column if not exists member_display_name text;

create or replace function public.stamp_group_member_display_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select coalesce(nullif(display_name, ''), nullif(first_name, ''), 'Member')
  into new.member_display_name
  from public.profiles
  where id = new.profile_id;
  return new;
end;
$$;

drop trigger if exists group_members_stamp_display_name on public.group_members;
create trigger group_members_stamp_display_name
before insert on public.group_members
for each row
execute function public.stamp_group_member_display_name();

update public.group_members gm
set member_display_name = coalesce(
  nullif(p.display_name, ''),
  nullif(p.first_name, ''),
  'Member'
)
from public.profiles p
where p.id = gm.profile_id
  and gm.member_display_name is null;

-- ---------------------------------------------------------------------------
-- Allow security-definer role bump when promoting group leaders
-- ---------------------------------------------------------------------------
create or replace function public.protect_sensitive_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin()
     and current_setting('app.syncing_group_leader', true) is distinct from 'on' then
    new.role := old.role;
    if not (
      old.onboarding_completed_at is null
      and new.onboarding_completed_at is not null
    ) then
      new.membership_status := old.membership_status;
    end if;
  elsif not public.is_admin()
        and current_setting('app.syncing_group_leader', true) = 'on' then
    -- Role sync only — still lock membership_status
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

create or replace function public.bump_profile_to_group_leader(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.syncing_group_leader', 'on', true);
  update public.profiles
  set role = 'group_leader'
  where id = p_profile_id
    and role = 'member';
end;
$$;

revoke all on function public.bump_profile_to_group_leader(uuid) from public;

create or replace function public.sync_group_leader_role_bump()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and new.role_in_group = 'leader' then
    perform public.bump_profile_to_group_leader(new.profile_id);
  end if;
  return new;
end;
$$;

drop trigger if exists group_members_bump_leader_role on public.group_members;
create trigger group_members_bump_leader_role
after insert or update of status, role_in_group on public.group_members
for each row
execute function public.sync_group_leader_role_bump();

-- ---------------------------------------------------------------------------
-- Announcements: optional group_id (null = church-wide)
-- ---------------------------------------------------------------------------
alter table public.announcements
  add column if not exists group_id uuid references public.groups (id) on delete cascade;

create index if not exists announcements_group_id_idx
  on public.announcements (group_id)
  where group_id is not null;

-- Fan-out: church-wide → everyone; group-scoped → approved members only
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

  if new.group_id is null then
    insert into public.notifications (profile_id, category, title, body, data, push_status)
    select
      p.id,
      'announcements'::public.notification_category,
      new.title,
      left(new.body, 240),
      jsonb_build_object(
        'announcement_id', new.id,
        'type', 'announcement'
      ),
      'pending'::public.push_delivery_status
    from public.profiles p
    left join public.notification_preferences np on np.profile_id = p.id
    where coalesce(np.announcements, true) = true
      and p.id is distinct from new.author_id;
  else
    insert into public.notifications (profile_id, category, title, body, data, push_status)
    select
      gm.profile_id,
      'announcements'::public.notification_category,
      new.title,
      left(new.body, 240),
      jsonb_build_object(
        'announcement_id', new.id,
        'group_id', new.group_id,
        'type', 'group_announcement'
      ),
      'pending'::public.push_delivery_status
    from public.group_members gm
    left join public.notification_preferences np on np.profile_id = gm.profile_id
    where gm.group_id = new.group_id
      and gm.status = 'approved'
      and coalesce(np.announcements, true) = true
      and gm.profile_id is distinct from new.author_id;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- In-group messages (discussion feed; separate from push broadcasts)
-- ---------------------------------------------------------------------------
create table if not exists public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  author_display_name text,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists group_messages_group_id_idx
  on public.group_messages (group_id, created_at desc);

create or replace function public.stamp_group_message_author()
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

drop trigger if exists group_messages_stamp_author on public.group_messages;
create trigger group_messages_stamp_author
before insert on public.group_messages
for each row
execute function public.stamp_group_message_author();

-- ---------------------------------------------------------------------------
-- Attendance: standalone meetings + check-in rows
-- ---------------------------------------------------------------------------
create table if not exists public.group_meetings (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  meeting_on date not null,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (group_id, meeting_on)
);

create index if not exists group_meetings_group_id_idx
  on public.group_meetings (group_id, meeting_on desc);

create table if not exists public.group_attendance (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.group_meetings (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  present boolean not null default true,
  marked_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (meeting_id, profile_id)
);

create index if not exists group_attendance_meeting_id_idx
  on public.group_attendance (meeting_id);

-- ---------------------------------------------------------------------------
-- RPCs: create group, request join
-- ---------------------------------------------------------------------------
create or replace function public.create_church_group(
  p_name text,
  p_description text default null,
  p_requires_approval boolean default true,
  p_published boolean default true
)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group public.groups;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not (public.is_admin() or public.is_group_leader_role()) then
    raise exception 'Only admins and group leaders can create groups';
  end if;

  if char_length(trim(p_name)) = 0 then
    raise exception 'Name is required';
  end if;

  insert into public.groups (name, description, requires_approval, published, created_by)
  values (
    trim(p_name),
    nullif(trim(coalesce(p_description, '')), ''),
    coalesce(p_requires_approval, true),
    coalesce(p_published, true),
    auth.uid()
  )
  returning * into v_group;

  insert into public.group_members (group_id, profile_id, status, role_in_group)
  values (v_group.id, auth.uid(), 'approved', 'leader')
  on conflict (group_id, profile_id) do update
  set status = 'approved',
      role_in_group = 'leader';

  perform public.bump_profile_to_group_leader(auth.uid());

  return v_group;
end;
$$;

revoke all on function public.create_church_group(text, text, boolean, boolean) from public;
grant execute on function public.create_church_group(text, text, boolean, boolean) to authenticated;

create or replace function public.request_join_group(p_group_id uuid)
returns public.group_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group public.groups;
  v_row public.group_members;
  v_status public.group_member_status;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_group
  from public.groups
  where id = p_group_id;

  if v_group.id is null then
    raise exception 'Group not found';
  end if;

  if v_group.published is not true and not public.is_admin() then
    raise exception 'Group is not open for joins';
  end if;

  v_status := case
    when v_group.requires_approval then 'pending'::public.group_member_status
    else 'approved'::public.group_member_status
  end;

  insert into public.group_members (group_id, profile_id, status, role_in_group)
  values (p_group_id, auth.uid(), v_status, 'member')
  on conflict (group_id, profile_id) do update
  set status = case
      when group_members.status = 'approved' then group_members.status
      else excluded.status
    end
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.request_join_group(uuid) from public;
grant execute on function public.request_join_group(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: groups write for leaders; members can request join / leave
-- ---------------------------------------------------------------------------
drop policy if exists "groups_admin_write" on public.groups;

create policy "groups_insert_admin_or_leader"
on public.groups for insert to authenticated
with check (
  public.is_admin()
  or public.is_group_leader_role()
);

create policy "groups_update_admin_or_leader"
on public.groups for update to authenticated
using (
  public.is_admin()
  or public.leads_group(id)
)
with check (
  public.is_admin()
  or public.leads_group(id)
);

create policy "groups_delete_admin"
on public.groups for delete to authenticated
using (public.is_admin());

drop policy if exists "group_members_admin_or_leader_write" on public.group_members;

create policy "group_members_admin_or_leader_write"
on public.group_members for all to authenticated
using (public.is_admin() or public.leads_group(group_id))
with check (public.is_admin() or public.leads_group(group_id));

create policy "group_members_insert_self_request"
on public.group_members for insert to authenticated
with check (
  profile_id = auth.uid()
  and role_in_group = 'member'
  and (
    status = 'pending'
    or (
      status = 'approved'
      and exists (
        select 1
        from public.groups g
        where g.id = group_id
          and g.requires_approval = false
          and g.published = true
      )
    )
  )
);

create policy "group_members_delete_own"
on public.group_members for delete to authenticated
using (profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Announcements RLS (replace church-wide-only policies)
-- ---------------------------------------------------------------------------
drop policy if exists "announcements_select_published_or_admin" on public.announcements;
drop policy if exists "announcements_insert_admin" on public.announcements;
drop policy if exists "announcements_update_admin" on public.announcements;
drop policy if exists "announcements_delete_admin" on public.announcements;

create policy "announcements_select_visible"
on public.announcements for select to authenticated
using (
  public.is_admin()
  or (
    published = true
    and (
      group_id is null
      or public.is_approved_group_member(group_id)
      or public.leads_group(group_id)
    )
  )
);

create policy "announcements_insert_admin_or_leader"
on public.announcements for insert to authenticated
with check (
  author_id = auth.uid()
  and (
    public.is_admin()
    or (
      public.is_group_leader_role()
      and group_id is not null
      and public.leads_group(group_id)
    )
  )
);

create policy "announcements_update_admin_or_leader"
on public.announcements for update to authenticated
using (
  public.is_admin()
  or (group_id is not null and public.leads_group(group_id))
)
with check (
  public.is_admin()
  or (group_id is not null and public.leads_group(group_id))
);

create policy "announcements_delete_admin_or_leader"
on public.announcements for delete to authenticated
using (
  public.is_admin()
  or (group_id is not null and public.leads_group(group_id))
);

-- Reactions / comments: respect group-scoped announcement visibility
drop policy if exists "announcement_reactions_select_authenticated" on public.announcement_reactions;
drop policy if exists "announcement_reactions_insert_own" on public.announcement_reactions;
drop policy if exists "announcement_comments_select_authenticated" on public.announcement_comments;
drop policy if exists "announcement_comments_insert_own" on public.announcement_comments;

create policy "announcement_reactions_select_authenticated"
on public.announcement_reactions for select to authenticated
using (
  exists (
    select 1 from public.announcements a
    where a.id = announcement_id
      and (
        public.is_admin()
        or (
          a.published = true
          and (
            a.group_id is null
            or public.is_approved_group_member(a.group_id)
            or public.leads_group(a.group_id)
          )
        )
      )
  )
);

create policy "announcement_reactions_insert_own"
on public.announcement_reactions for insert to authenticated
with check (
  profile_id = auth.uid()
  and exists (
    select 1 from public.announcements a
    where a.id = announcement_id
      and a.published = true
      and (
        a.group_id is null
        or public.is_approved_group_member(a.group_id)
        or public.leads_group(a.group_id)
      )
  )
);

create policy "announcement_comments_select_authenticated"
on public.announcement_comments for select to authenticated
using (
  exists (
    select 1 from public.announcements a
    where a.id = announcement_id
      and (
        public.is_admin()
        or (
          a.published = true
          and (
            a.group_id is null
            or public.is_approved_group_member(a.group_id)
            or public.leads_group(a.group_id)
          )
        )
      )
  )
);

create policy "announcement_comments_insert_own"
on public.announcement_comments for insert to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.announcements a
    where a.id = announcement_id
      and a.published = true
      and (
        a.group_id is null
        or public.is_approved_group_member(a.group_id)
        or public.leads_group(a.group_id)
      )
  )
);

-- ---------------------------------------------------------------------------
-- Group messages RLS
-- ---------------------------------------------------------------------------
alter table public.group_messages enable row level security;

create policy "group_messages_select_members"
on public.group_messages for select to authenticated
using (
  public.is_admin()
  or public.is_approved_group_member(group_id)
  or public.leads_group(group_id)
);

create policy "group_messages_insert_members"
on public.group_messages for insert to authenticated
with check (
  author_id = auth.uid()
  and (
    public.is_approved_group_member(group_id)
    or public.leads_group(group_id)
    or public.is_admin()
  )
);

create policy "group_messages_delete_own_or_leader"
on public.group_messages for delete to authenticated
using (
  author_id = auth.uid()
  or public.leads_group(group_id)
  or public.is_admin()
);

-- ---------------------------------------------------------------------------
-- Meetings + attendance RLS
-- ---------------------------------------------------------------------------
alter table public.group_meetings enable row level security;
alter table public.group_attendance enable row level security;

create policy "group_meetings_select_members"
on public.group_meetings for select to authenticated
using (
  public.is_admin()
  or public.is_approved_group_member(group_id)
  or public.leads_group(group_id)
);

create policy "group_meetings_write_leaders"
on public.group_meetings for all to authenticated
using (public.is_admin() or public.leads_group(group_id))
with check (public.is_admin() or public.leads_group(group_id));

create policy "group_attendance_select_members"
on public.group_attendance for select to authenticated
using (
  exists (
    select 1 from public.group_meetings m
    where m.id = meeting_id
      and (
        public.is_admin()
        or public.is_approved_group_member(m.group_id)
        or public.leads_group(m.group_id)
      )
  )
);

create policy "group_attendance_write_leaders"
on public.group_attendance for all to authenticated
using (
  exists (
    select 1 from public.group_meetings m
    where m.id = meeting_id
      and (public.is_admin() or public.leads_group(m.group_id))
  )
)
with check (
  exists (
    select 1 from public.group_meetings m
    where m.id = meeting_id
      and (public.is_admin() or public.leads_group(m.group_id))
  )
);
