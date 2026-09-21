-- Group invites: invite codes + admin/leader add-member RPCs
-- Run in Supabase SQL Editor after Phase 7 migration.

-- ---------------------------------------------------------------------------
-- Invite code on groups (same pattern as households)
-- ---------------------------------------------------------------------------
alter table public.groups
  add column if not exists invite_code text;

update public.groups
set invite_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
where invite_code is null;

alter table public.groups
  alter column invite_code set not null,
  alter column invite_code set default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

create unique index if not exists groups_invite_code_key
  on public.groups (invite_code);

-- ---------------------------------------------------------------------------
-- Admin / leader: add a member directly (approved)
-- ---------------------------------------------------------------------------
create or replace function public.add_group_member(
  p_group_id uuid,
  p_profile_id uuid
)
returns public.group_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.group_members;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not (public.is_admin() or public.leads_group(p_group_id)) then
    raise exception 'Only admins and group leaders can add members';
  end if;

  if not exists (select 1 from public.profiles where id = p_profile_id) then
    raise exception 'Member not found';
  end if;

  if not exists (select 1 from public.groups where id = p_group_id) then
    raise exception 'Group not found';
  end if;

  insert into public.group_members (group_id, profile_id, status, role_in_group)
  values (p_group_id, p_profile_id, 'approved', 'member')
  on conflict (group_id, profile_id) do update
  set status = 'approved',
      role_in_group = case
        when group_members.role_in_group = 'leader' then 'leader'::public.group_member_role
        else 'member'::public.group_member_role
      end
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.add_group_member(uuid, uuid) from public;
grant execute on function public.add_group_member(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Anyone signed in: join via invite code (auto-approved)
-- ---------------------------------------------------------------------------
create or replace function public.join_group_by_invite(p_code text)
returns public.group_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group public.groups;
  v_row public.group_members;
  normalized text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  normalized := upper(trim(p_code));
  if char_length(normalized) = 0 then
    raise exception 'Invite code is required';
  end if;

  select * into v_group
  from public.groups
  where invite_code = normalized;

  if v_group.id is null then
    raise exception 'Group not found for that invite code';
  end if;

  insert into public.group_members (group_id, profile_id, status, role_in_group)
  values (v_group.id, auth.uid(), 'approved', 'member')
  on conflict (group_id, profile_id) do update
  set status = case
      when group_members.status = 'approved' then group_members.status
      else 'approved'::public.group_member_status
    end
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.join_group_by_invite(text) from public;
grant execute on function public.join_group_by_invite(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Search candidates to add (admins: all profiles; leaders: directory-visible)
-- ---------------------------------------------------------------------------
create or replace function public.search_members_for_group(
  p_group_id uuid,
  p_search text default ''
)
returns table (
  id uuid,
  display_name text,
  first_name text,
  last_name text,
  email text
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_pattern text;
  v_is_admin boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not (public.is_admin() or public.leads_group(p_group_id)) then
    raise exception 'Only admins and group leaders can search members to add';
  end if;

  v_is_admin := public.is_admin();
  v_pattern := nullif(trim(coalesce(p_search, '')), '');
  if v_pattern is not null then
    v_pattern := '%' || v_pattern || '%';
  end if;

  return query
  select
    p.id,
    p.display_name,
    p.first_name,
    p.last_name,
    case when v_is_admin then p.email else null end as email
  from public.profiles p
  where p.id is distinct from auth.uid()
    and not exists (
      select 1
      from public.group_members gm
      where gm.group_id = p_group_id
        and gm.profile_id = p.id
        and gm.status = 'approved'
    )
    and (
      v_is_admin
      or p.directory_visible = true
    )
    and (
      v_pattern is null
      or p.display_name ilike v_pattern
      or p.first_name ilike v_pattern
      or p.last_name ilike v_pattern
      or (v_is_admin and p.email ilike v_pattern)
    )
  order by coalesce(p.display_name, p.first_name, p.email)
  limit 40;
end;
$$;

revoke all on function public.search_members_for_group(uuid, text) from public;
grant execute on function public.search_members_for_group(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Rotate invite code (admin / leader)
-- ---------------------------------------------------------------------------
create or replace function public.rotate_group_invite(p_group_id uuid)
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

  if not (public.is_admin() or public.leads_group(p_group_id)) then
    raise exception 'Only admins and group leaders can rotate invite codes';
  end if;

  update public.groups
  set invite_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
  where id = p_group_id
  returning * into v_group;

  if v_group.id is null then
    raise exception 'Group not found';
  end if;

  return v_group;
end;
$$;

revoke all on function public.rotate_group_invite(uuid) from public;
grant execute on function public.rotate_group_invite(uuid) to authenticated;
