-- Phase 1 foundation: households, profiles, roles, RLS baseline
-- Apply via Supabase SQL editor or `supabase db push`.

create extension if not exists "pgcrypto";

create type public.user_role as enum ('member', 'group_leader', 'admin');
create type public.membership_status as enum ('visitor', 'pending', 'active', 'inactive');

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  household_id uuid references public.households (id) on delete set null,
  email text,
  phone text,
  first_name text,
  last_name text,
  display_name text,
  photo_url text,
  membership_status public.membership_status not null default 'visitor',
  role public.user_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_household_id_idx on public.profiles (household_id);
create index profiles_role_idx on public.profiles (role);

comment on table public.profiles is '1:1 with auth.users; congregation member profile';
comment on column public.profiles.role is 'member | group_leader | admin — enforced via RLS';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, phone, display_name)
  values (
    new.id,
    new.email,
    new.phone,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Member'
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create or replace function public.is_admin()
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
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Non-admins cannot escalate role or membership_status
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
  end if;
  return new;
end;
$$;

create trigger profiles_protect_sensitive
before update on public.profiles
for each row
execute function public.protect_sensitive_profile_fields();

alter table public.households enable row level security;
alter table public.profiles enable row level security;

create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "profiles_update_admin"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "profiles_insert_admin_only"
on public.profiles
for insert
to authenticated
with check (public.is_admin());

create policy "households_select_member_or_admin"
on public.households
for select
to authenticated
using (
  public.is_admin()
  or id in (
    select household_id
    from public.profiles
    where id = auth.uid()
      and household_id is not null
  )
);

create policy "households_insert_authenticated"
on public.households
for insert
to authenticated
with check (true);

create policy "households_update_member_or_admin"
on public.households
for update
to authenticated
using (
  public.is_admin()
  or id in (
    select household_id
    from public.profiles
    where id = auth.uid()
      and household_id is not null
  )
)
with check (
  public.is_admin()
  or id in (
    select household_id
    from public.profiles
    where id = auth.uid()
      and household_id is not null
  )
);

create policy "households_delete_admin"
on public.households
for delete
to authenticated
using (public.is_admin());
