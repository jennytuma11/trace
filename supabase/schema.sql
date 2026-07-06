-- =============================================================================
-- TRACE — Initial Supabase Database Schema
-- =============================================================================
-- Paste this ENTIRE file into:
--   Supabase Dashboard → SQL Editor → New query → Run
--
-- Safe to re-run on an empty project. Uses IF NOT EXISTS / OR REPLACE where
-- possible. If you need a full reset, drop public.calls and public.profiles
-- first, then run again.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- App labels: Administrator → ADMINISTRATOR
--              Team Member   → TEAM_MEMBER
--              Viewer        → VIEWER
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.trace_role as enum (
    'ADMINISTRATOR',
    'TEAM_MEMBER',
    'VIEWER'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.trace_call_status as enum (
    'ACTIVE',
    'RESOLVED',
    'EXCLUDED'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.trace_event_type as enum (
    'Operational',
    'Practice',
    'Training',
    'Test'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.trace_mapping_status as enum (
    'Mapped',
    'Unmapped'
  );
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role public.trace_role not null default 'TEAM_MEMBER',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'TRACE user profiles linked to Supabase Auth users.';
comment on column public.profiles.role is 'Administrator | Team Member | Viewer (stored as enum).';

create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists profiles_role_idx on public.profiles (role);

-- ---------------------------------------------------------------------------
-- calls
-- ---------------------------------------------------------------------------
create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  call_type text not null check (call_type in ('Rapid Response', 'Code Blue')),
  rapid_response_category text,
  unit_location text not null,
  reporting_unit text,
  mapping_status public.trace_mapping_status not null default 'Unmapped',
  additional_notes text,
  start_time timestamptz not null default now(),
  team_arrival_time timestamptz,
  response_time_seconds integer check (response_time_seconds is null or response_time_seconds >= 0),
  resolved_time timestamptz,
  total_call_duration_seconds integer check (
    total_call_duration_seconds is null or total_call_duration_seconds >= 0
  ),
  outcome text,
  resolution_notes text,
  status public.trace_call_status not null default 'ACTIVE',
  event_type public.trace_event_type not null default 'Operational',
  excluded_from_reporting boolean not null default false,
  excluded_at timestamptz,
  excluded_by uuid references public.profiles (id),
  exclusion_reason text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.calls is 'TRACE rapid response call events.';

-- Common search / filter indexes
create index if not exists calls_start_time_idx on public.calls (start_time desc);
create index if not exists calls_status_idx on public.calls (status);
create index if not exists calls_event_type_idx on public.calls (event_type);
create index if not exists calls_reporting_idx on public.calls (excluded_from_reporting);
create index if not exists calls_created_by_idx on public.calls (created_by);
create index if not exists calls_unit_location_idx on public.calls (unit_location);
create index if not exists calls_call_type_idx on public.calls (call_type);
create index if not exists calls_outcome_idx on public.calls (outcome);
create index if not exists calls_reporting_unit_idx on public.calls (reporting_unit);
create index if not exists calls_mapping_status_idx on public.calls (mapping_status);

-- ---------------------------------------------------------------------------
-- unit_crosswalk
-- Administrator-defined location → reporting unit rules (no auto-guessing)
-- ---------------------------------------------------------------------------
create table if not exists public.unit_crosswalk (
  id uuid primary key default gen_random_uuid(),
  location_pattern text not null,
  reporting_unit text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.unit_crosswalk is 'Administrator-defined unit location crosswalk patterns.';

create index if not exists unit_crosswalk_active_idx on public.unit_crosswalk (active);
create index if not exists unit_crosswalk_pattern_idx on public.unit_crosswalk (location_pattern);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

drop trigger if exists calls_set_updated_at on public.calls;
create trigger calls_set_updated_at
  before update on public.calls
  for each row
  execute function public.set_updated_at();

drop trigger if exists unit_crosswalk_set_updated_at on public.unit_crosswalk;
create trigger unit_crosswalk_set_updated_at
  before update on public.unit_crosswalk
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create profile when a Supabase Auth user is created
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::public.trace_role, 'TEAM_MEMBER')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security (RLS)
-- Simple policies for now — authenticated users can access TRACE data.
-- TRACE server routes use the service role key and bypass RLS.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.calls enable row level security;
alter table public.unit_crosswalk enable row level security;

-- profiles
drop policy if exists "Authenticated users can read profiles" on public.profiles;
create policy "Authenticated users can read profiles"
  on public.profiles
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert profiles" on public.profiles;
create policy "Authenticated users can insert profiles"
  on public.profiles
  for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update profiles" on public.profiles;
create policy "Authenticated users can update profiles"
  on public.profiles
  for update
  to authenticated
  using (true)
  with check (true);

-- calls
drop policy if exists "Authenticated users can read calls" on public.calls;
create policy "Authenticated users can read calls"
  on public.calls
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert calls" on public.calls;
create policy "Authenticated users can insert calls"
  on public.calls
  for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update calls" on public.calls;
create policy "Authenticated users can update calls"
  on public.calls
  for update
  to authenticated
  using (true)
  with check (true);

-- unit_crosswalk
drop policy if exists "Authenticated users can read unit crosswalk" on public.unit_crosswalk;
create policy "Authenticated users can read unit crosswalk"
  on public.unit_crosswalk
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert unit crosswalk" on public.unit_crosswalk;
create policy "Authenticated users can insert unit crosswalk"
  on public.unit_crosswalk
  for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update unit crosswalk" on public.unit_crosswalk;
create policy "Authenticated users can update unit crosswalk"
  on public.unit_crosswalk
  for update
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- Grants (Supabase roles)
-- ---------------------------------------------------------------------------
grant usage on schema public to postgres, anon, authenticated, service_role;

grant all on table public.profiles to postgres, service_role;
grant select, insert, update on table public.profiles to authenticated;

grant all on table public.calls to postgres, service_role;
grant select, insert, update on table public.calls to authenticated;

grant all on table public.unit_crosswalk to postgres, service_role;
grant select, insert, update on table public.unit_crosswalk to authenticated;

-- ---------------------------------------------------------------------------
-- Verification (optional — run separately after the script succeeds)
-- ---------------------------------------------------------------------------
-- select table_name
-- from information_schema.tables
-- where table_schema = 'public'
--   and table_name in ('profiles', 'calls')
-- order by table_name;
--
-- select column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'calls'
-- order by ordinal_position;

-- ---------------------------------------------------------------------------
-- Demo user role setup (run AFTER creating Auth users in Supabase Auth)
-- ---------------------------------------------------------------------------
-- update public.profiles
-- set role = 'ADMINISTRATOR', full_name = 'Admin User'
-- where email = 'admin@trace.local';
--
-- update public.profiles
-- set role = 'TEAM_MEMBER', full_name = 'Team Member'
-- where email = 'member@trace.local';
--
-- update public.profiles
-- set role = 'VIEWER', full_name = 'Viewer User'
-- where email = 'viewer@trace.local';
