-- Phase 4: events, RSVP, capacity/waitlist, volunteers, reminder queue
-- Plus minimal groups seam so group leaders can create group-scoped events.
-- Run in Supabase SQL Editor after Phase 1–3 migrations.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.event_kind as enum ('service', 'group', 'special', 'other');
create type public.rsvp_status as enum ('going', 'maybe', 'not_going', 'waitlisted');
create type public.reminder_status as enum ('pending', 'sent', 'cancelled');
create type public.group_member_status as enum ('pending', 'approved');
create type public.group_member_role as enum ('member', 'leader');

-- ---------------------------------------------------------------------------
-- Groups seam (Phase 6 expands browse/join/messaging/attendance)
-- ---------------------------------------------------------------------------
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger groups_set_updated_at
before update on public.groups
for each row
execute function public.set_updated_at();

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  status public.group_member_status not null default 'pending',
  role_in_group public.group_member_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (group_id, profile_id)
);

create index group_members_profile_id_idx on public.group_members (profile_id);
create index group_members_group_id_idx on public.group_members (group_id);

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  kind public.event_kind not null default 'special',
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'America/Chicago',
  -- Full iCal RRULE body (e.g. FREQ=WEEKLY;BYDAY=SU). Null = single occurrence.
  rrule text,
  capacity integer check (capacity is null or capacity > 0),
  group_id uuid references public.groups (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  -- Minutes before occurrence start (e.g. 1440 = 24h, 60 = 1h). Push send in Phase 5.
  reminder_offsets_minutes integer[] not null default '{1440,60}',
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_ends_after_starts check (ends_at is null or ends_at >= starts_at)
);

create index events_starts_at_idx on public.events (starts_at);
create index events_group_id_idx on public.events (group_id);
create index events_published_idx on public.events (published) where published = true;
create index events_kind_idx on public.events (kind);

create trigger events_set_updated_at
before update on public.events
for each row
execute function public.set_updated_at();

-- RSVPs are per occurrence for recurring events (occurrence_start = starts_at for singles)
create table public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  occurrence_start timestamptz not null,
  status public.rsvp_status not null,
  waitlist_position integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, profile_id, occurrence_start)
);

create index event_rsvps_event_occurrence_idx
  on public.event_rsvps (event_id, occurrence_start);
create index event_rsvps_profile_id_idx on public.event_rsvps (profile_id);

create trigger event_rsvps_set_updated_at
before update on public.event_rsvps
for each row
execute function public.set_updated_at();

create table public.volunteer_slots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  title text not null,
  description text,
  slots_needed integer not null default 1 check (slots_needed > 0),
  created_at timestamptz not null default now()
);

create index volunteer_slots_event_id_idx on public.volunteer_slots (event_id);

create table public.volunteer_signups (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.volunteer_slots (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  occurrence_start timestamptz not null,
  created_at timestamptz not null default now(),
  unique (slot_id, profile_id, occurrence_start)
);

create index volunteer_signups_slot_id_idx on public.volunteer_signups (slot_id);

-- Reminder queue — delivery via Expo push is Phase 5
create table public.event_reminder_queue (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  occurrence_start timestamptz not null,
  fire_at timestamptz not null,
  offset_minutes integer not null,
  status public.reminder_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (event_id, profile_id, occurrence_start, offset_minutes)
);

create index event_reminder_queue_fire_at_idx
  on public.event_reminder_queue (fire_at)
  where status = 'pending';

-- Wire Phase 3 photo albums → events
alter table public.photo_albums
  drop constraint if exists photo_albums_event_id_fkey;

alter table public.photo_albums
  add constraint photo_albums_event_id_fkey
  foreign key (event_id) references public.events (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------
create or replace function public.is_group_leader_role()
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
      and role in ('group_leader', 'admin')
  );
$$;

revoke all on function public.is_group_leader_role() from public;
grant execute on function public.is_group_leader_role() to authenticated;

create or replace function public.leads_group(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.group_members gm
      where gm.group_id = p_group_id
        and gm.profile_id = auth.uid()
        and gm.status = 'approved'
        and gm.role_in_group = 'leader'
    );
$$;

revoke all on function public.leads_group(uuid) from public;
grant execute on function public.leads_group(uuid) to authenticated;

create or replace function public.can_manage_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and (
        public.is_admin()
        or (e.group_id is not null and public.leads_group(e.group_id))
        or e.created_by = auth.uid()
      )
  );
$$;

revoke all on function public.can_manage_event(uuid) from public;
grant execute on function public.can_manage_event(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Reminder helpers
-- ---------------------------------------------------------------------------
create or replace function public.schedule_event_reminders(
  p_event_id uuid,
  p_profile_id uuid,
  p_occurrence_start timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offsets integer[];
  v_offset integer;
begin
  select reminder_offsets_minutes into v_offsets
  from public.events
  where id = p_event_id;

  if v_offsets is null then
    return;
  end if;

  foreach v_offset in array v_offsets
  loop
    insert into public.event_reminder_queue (
      event_id,
      profile_id,
      occurrence_start,
      fire_at,
      offset_minutes,
      status
    )
    values (
      p_event_id,
      p_profile_id,
      p_occurrence_start,
      p_occurrence_start - make_interval(mins => v_offset),
      v_offset,
      'pending'
    )
    on conflict (event_id, profile_id, occurrence_start, offset_minutes)
    do update set
      fire_at = excluded.fire_at,
      status = case
        when public.event_reminder_queue.status = 'sent' then 'sent'
        else 'pending'
      end;
  end loop;
end;
$$;

create or replace function public.cancel_event_reminders(
  p_event_id uuid,
  p_profile_id uuid,
  p_occurrence_start timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.event_reminder_queue
  set status = 'cancelled'
  where event_id = p_event_id
    and profile_id = p_profile_id
    and occurrence_start = p_occurrence_start
    and status = 'pending';
end;
$$;

-- ---------------------------------------------------------------------------
-- RSVP with capacity + waitlist auto-promote
-- ---------------------------------------------------------------------------
create or replace function public.upsert_event_rsvp(
  p_event_id uuid,
  p_occurrence_start timestamptz,
  p_status public.rsvp_status
)
returns public.event_rsvps
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity integer;
  v_going_count integer;
  v_existing public.event_rsvps;
  v_result public.event_rsvps;
  v_next_waitlisted public.event_rsvps;
  v_effective public.rsvp_status;
  v_waitlist_pos integer;
  v_was_going boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_status = 'waitlisted' then
    raise exception 'Cannot set waitlisted directly';
  end if;

  if not exists (
    select 1 from public.events e
    where e.id = p_event_id and (e.published = true or public.can_manage_event(e.id))
  ) then
    raise exception 'Event not found';
  end if;

  select capacity into v_capacity from public.events where id = p_event_id;

  select * into v_existing
  from public.event_rsvps
  where event_id = p_event_id
    and profile_id = auth.uid()
    and occurrence_start = p_occurrence_start;

  v_was_going := coalesce(v_existing.status = 'going', false);

  select count(*)::integer into v_going_count
  from public.event_rsvps
  where event_id = p_event_id
    and occurrence_start = p_occurrence_start
    and status = 'going'
    and profile_id is distinct from auth.uid();

  v_effective := p_status;
  v_waitlist_pos := null;

  if p_status = 'going' then
    if v_capacity is not null and v_going_count >= v_capacity then
      v_effective := 'waitlisted';
      select coalesce(max(waitlist_position), 0) + 1 into v_waitlist_pos
      from public.event_rsvps
      where event_id = p_event_id
        and occurrence_start = p_occurrence_start
        and status = 'waitlisted'
        and profile_id is distinct from auth.uid();
    end if;
  end if;

  insert into public.event_rsvps (
    event_id,
    profile_id,
    occurrence_start,
    status,
    waitlist_position
  )
  values (
    p_event_id,
    auth.uid(),
    p_occurrence_start,
    v_effective,
    v_waitlist_pos
  )
  on conflict (event_id, profile_id, occurrence_start)
  do update set
    status = excluded.status,
    waitlist_position = excluded.waitlist_position,
    updated_at = now()
  returning * into v_result;

  if v_effective = 'going' then
    perform public.schedule_event_reminders(p_event_id, auth.uid(), p_occurrence_start);
  else
    perform public.cancel_event_reminders(p_event_id, auth.uid(), p_occurrence_start);
  end if;

  -- Auto-promote waitlist when a going seat frees
  if v_was_going and v_effective is distinct from 'going' then
    select * into v_next_waitlisted
    from public.event_rsvps
    where event_id = p_event_id
      and occurrence_start = p_occurrence_start
      and status = 'waitlisted'
    order by waitlist_position asc nulls last, created_at asc
    limit 1;

    if found then
      update public.event_rsvps
      set status = 'going',
          waitlist_position = null,
          updated_at = now()
      where id = v_next_waitlisted.id;

      perform public.schedule_event_reminders(
        p_event_id,
        v_next_waitlisted.profile_id,
        p_occurrence_start
      );

      -- Compact remaining waitlist positions
      update public.event_rsvps r
      set waitlist_position = sub.pos
      from (
        select id, row_number() over (order by waitlist_position asc nulls last, created_at asc) as pos
        from public.event_rsvps
        where event_id = p_event_id
          and occurrence_start = p_occurrence_start
          and status = 'waitlisted'
      ) sub
      where r.id = sub.id;
    end if;
  end if;

  return v_result;
end;
$$;

revoke all on function public.upsert_event_rsvp(uuid, timestamptz, public.rsvp_status) from public;
grant execute on function public.upsert_event_rsvp(uuid, timestamptz, public.rsvp_status) to authenticated;

-- Volunteer signup with capacity on the slot
create or replace function public.toggle_volunteer_signup(
  p_slot_id uuid,
  p_occurrence_start timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_needed integer;
  v_count integer;
  v_existing uuid;
  v_event_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select vs.slots_needed, vs.event_id into v_needed, v_event_id
  from public.volunteer_slots vs
  join public.events e on e.id = vs.event_id
  where vs.id = p_slot_id
    and (e.published = true or public.can_manage_event(e.id));

  if not found then
    raise exception 'Slot not found';
  end if;

  select id into v_existing
  from public.volunteer_signups
  where slot_id = p_slot_id
    and profile_id = auth.uid()
    and occurrence_start = p_occurrence_start;

  if found then
    delete from public.volunteer_signups where id = v_existing;
    return false;
  end if;

  select count(*)::integer into v_count
  from public.volunteer_signups
  where slot_id = p_slot_id
    and occurrence_start = p_occurrence_start;

  if v_count >= v_needed then
    raise exception 'This volunteer slot is full';
  end if;

  insert into public.volunteer_signups (slot_id, profile_id, occurrence_start)
  values (p_slot_id, auth.uid(), p_occurrence_start);

  return true;
end;
$$;

revoke all on function public.toggle_volunteer_signup(uuid, timestamptz) from public;
grant execute on function public.toggle_volunteer_signup(uuid, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.volunteer_slots enable row level security;
alter table public.volunteer_signups enable row level security;
alter table public.event_reminder_queue enable row level security;

-- Groups
create policy "groups_select_published_or_member"
on public.groups
for select
to authenticated
using (
  published = true
  or public.is_admin()
  or exists (
    select 1 from public.group_members gm
    where gm.group_id = groups.id and gm.profile_id = auth.uid()
  )
);

create policy "groups_admin_write"
on public.groups
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

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

-- Group members (security definer helpers avoid RLS recursion)
create policy "group_members_select_visible"
on public.group_members
for select
to authenticated
using (
  public.is_admin()
  or profile_id = auth.uid()
  or public.leads_group(group_id)
  or public.is_approved_group_member(group_id)
);

create policy "group_members_admin_or_leader_write"
on public.group_members
for all
to authenticated
using (public.is_admin() or public.leads_group(group_id))
with check (public.is_admin() or public.leads_group(group_id));

-- Events
create policy "events_select_published_or_manage"
on public.events
for select
to authenticated
using (published = true or public.can_manage_event(id) or created_by = auth.uid());

create policy "events_insert_admin_or_leader"
on public.events
for insert
to authenticated
with check (
  created_by = auth.uid()
  and (
    public.is_admin()
    or (
      public.is_group_leader_role()
      and group_id is not null
      and public.leads_group(group_id)
    )
  )
);

create policy "events_update_manage"
on public.events
for update
to authenticated
using (public.can_manage_event(id))
with check (
  public.is_admin()
  or (
    group_id is not null
    and public.leads_group(group_id)
  )
);

create policy "events_delete_manage"
on public.events
for delete
to authenticated
using (public.can_manage_event(id));

-- RSVPs
create policy "event_rsvps_select"
on public.event_rsvps
for select
to authenticated
using (
  profile_id = auth.uid()
  or public.can_manage_event(event_id)
  or exists (
    select 1 from public.events e
    where e.id = event_rsvps.event_id and e.published = true
  )
);

create policy "event_rsvps_insert_own"
on public.event_rsvps
for insert
to authenticated
with check (profile_id = auth.uid());

create policy "event_rsvps_update_own"
on public.event_rsvps
for update
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

create policy "event_rsvps_delete_own"
on public.event_rsvps
for delete
to authenticated
using (profile_id = auth.uid());

-- Volunteer slots
create policy "volunteer_slots_select"
on public.volunteer_slots
for select
to authenticated
using (
  exists (
    select 1 from public.events e
    where e.id = volunteer_slots.event_id
      and (e.published = true or public.can_manage_event(e.id))
  )
);

create policy "volunteer_slots_manage"
on public.volunteer_slots
for all
to authenticated
using (public.can_manage_event(event_id))
with check (public.can_manage_event(event_id));

-- Volunteer signups
create policy "volunteer_signups_select"
on public.volunteer_signups
for select
to authenticated
using (
  profile_id = auth.uid()
  or exists (
    select 1
    from public.volunteer_slots vs
    where vs.id = volunteer_signups.slot_id
      and public.can_manage_event(vs.event_id)
  )
  or exists (
    select 1
    from public.volunteer_slots vs
    join public.events e on e.id = vs.event_id
    where vs.id = volunteer_signups.slot_id
      and e.published = true
  )
);

create policy "volunteer_signups_insert_own"
on public.volunteer_signups
for insert
to authenticated
with check (profile_id = auth.uid());

create policy "volunteer_signups_delete_own"
on public.volunteer_signups
for delete
to authenticated
using (profile_id = auth.uid());

-- Reminder queue: own rows only (Phase 5 worker will use service role)
create policy "event_reminder_queue_select_own"
on public.event_reminder_queue
for select
to authenticated
using (profile_id = auth.uid() or public.is_admin());
