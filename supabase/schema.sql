-- Run this file in the Supabase SQL Editor before using auth-dependent pages.

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;
create trigger set_user_profiles_updated_at
before update on public.user_profiles
for each row
execute function public.set_updated_at();

create or replace function public.create_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists create_user_profile_after_auth_insert on auth.users;
create trigger create_user_profile_after_auth_insert
after insert on auth.users
for each row
execute function public.create_user_profile();

drop policy if exists "Users can read own profile" on public.user_profiles;
create policy "Users can read own profile"
on public.user_profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.user_profiles;
create policy "Users can update own profile"
on public.user_profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create table if not exists public.calendars (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.calendar_members (
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (calendar_id, user_id)
);

create table if not exists public.holiday_events (
  country_code text not null check (country_code in ('TW', 'JP')),
  holiday_date date not null,
  local_name text not null,
  name text not null,
  source text not null default 'nager',
  year integer not null,
  synced_at timestamptz not null default now(),
  primary key (country_code, holiday_date, name)
);

create table if not exists public.user_events (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  title text not null,
  start_date date not null,
  end_date date not null,
  note text,
  created_by_user_id uuid not null references auth.users(id),
  updated_by_user_id uuid not null references auth.users(id),
  deleted_by_user_id uuid references auth.users(id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists public.event_audit_logs (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  event_id uuid references public.user_events(id) on delete set null,
  action text not null check (action in ('create', 'update', 'delete')),
  actor_user_id uuid not null references auth.users(id),
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

alter table public.calendars enable row level security;
alter table public.calendar_members enable row level security;
alter table public.holiday_events enable row level security;
alter table public.user_events enable row level security;
alter table public.event_audit_logs enable row level security;

drop trigger if exists set_calendars_updated_at on public.calendars;
create trigger set_calendars_updated_at
before update on public.calendars
for each row
execute function public.set_updated_at();

drop trigger if exists set_user_events_updated_at on public.user_events;
create trigger set_user_events_updated_at
before update on public.user_events
for each row
execute function public.set_updated_at();

create or replace function public.is_calendar_member(calendar_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.calendar_members
    where calendar_members.calendar_id = is_calendar_member.calendar_id
      and calendar_members.user_id = auth.uid()
  );
$$;

create or replace function public.can_edit_calendar(calendar_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.calendar_members
    where calendar_members.calendar_id = can_edit_calendar.calendar_id
      and calendar_members.user_id = auth.uid()
      and calendar_members.role in ('owner', 'editor')
  );
$$;

drop policy if exists "Members can read calendars" on public.calendars;
create policy "Members can read calendars"
on public.calendars
for select
to authenticated
using (owner_user_id = auth.uid() or public.is_calendar_member(id));

drop policy if exists "Users can create calendars" on public.calendars;
create policy "Users can create calendars"
on public.calendars
for insert
to authenticated
with check (owner_user_id = auth.uid());

drop policy if exists "Owners can update calendars" on public.calendars;
create policy "Owners can update calendars"
on public.calendars
for update
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists "Members can read calendar members" on public.calendar_members;
create policy "Members can read calendar members"
on public.calendar_members
for select
to authenticated
using (public.is_calendar_member(calendar_id));

drop policy if exists "Users can create own membership" on public.calendar_members;
create policy "Users can create own membership"
on public.calendar_members
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Authenticated users can read holidays" on public.holiday_events;
create policy "Authenticated users can read holidays"
on public.holiday_events
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can sync holidays" on public.holiday_events;
create policy "Authenticated users can sync holidays"
on public.holiday_events
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated users can update holidays" on public.holiday_events;
create policy "Authenticated users can update holidays"
on public.holiday_events
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Members can read user events" on public.user_events;
create policy "Members can read user events"
on public.user_events
for select
to authenticated
using (public.is_calendar_member(calendar_id));

drop policy if exists "Editors can create user events" on public.user_events;
create policy "Editors can create user events"
on public.user_events
for insert
to authenticated
with check (
  public.can_edit_calendar(calendar_id)
  and created_by_user_id = auth.uid()
  and updated_by_user_id = auth.uid()
);

drop policy if exists "Editors can update user events" on public.user_events;
create policy "Editors can update user events"
on public.user_events
for update
to authenticated
using (public.can_edit_calendar(calendar_id))
with check (
  public.can_edit_calendar(calendar_id)
  and updated_by_user_id = auth.uid()
);

drop policy if exists "Members can read audit logs" on public.event_audit_logs;
create policy "Members can read audit logs"
on public.event_audit_logs
for select
to authenticated
using (public.is_calendar_member(calendar_id));

drop policy if exists "Editors can create audit logs" on public.event_audit_logs;
create policy "Editors can create audit logs"
on public.event_audit_logs
for insert
to authenticated
with check (
  public.can_edit_calendar(calendar_id)
  and actor_user_id = auth.uid()
);
