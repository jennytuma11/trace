-- TRACE Supabase schema
-- Run this in the Supabase SQL Editor for a new project.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type trace_role as enum ('ADMINISTRATOR', 'TEAM_MEMBER', 'VIEWER');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type trace_call_status as enum ('ACTIVE', 'RESOLVED', 'EXCLUDED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type trace_event_type as enum ('Operational', 'Practice', 'Training', 'Test');
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role trace_role not null default 'TEAM_MEMBER',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- calls
-- ---------------------------------------------------------------------------
create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  call_type text not null check (call_type in ('Rapid Response', 'Code Blue')),
  rapid_response_category text,
  unit_location text not null,
  additional_notes text,
  start_time timestamptz not null default now(),
  team_arrival_time timestamptz,
  response_time_seconds integer,
  resolved_time timestamptz,
  total_call_duration_seconds integer,
  outcome text,
  resolution_notes text,
  status trace_call_status not null default 'ACTIVE',
  created_by uuid not null references public.profiles(id),
  excluded_from_reporting boolean not null default false,
  excluded_at timestamptz,
  excluded_by uuid references public.profiles(id),
  exclusion_reason text,
  event_type trace_event_type not null default 'Operational',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calls_start_time_idx on public.calls (start_time desc);
create index if not exists calls_status_idx on public.calls (status);
create index if not exists calls_reporting_idx on public.calls (excluded_from_reporting);
create index if not exists calls_created_by_idx on public.calls (created_by);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists calls_set_updated_at on public.calls;
create trigger calls_set_updated_at
  before update on public.calls
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create profile on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::trace_role, 'TEAM_MEMBER')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.calls enable row level security;

create or replace function public.current_user_role()
returns trace_role as $$
  select role from public.profiles where id = auth.uid();
$$ language sql stable security definer;

-- profiles policies
drop policy if exists "Profiles are readable by authenticated users" on public.profiles;
create policy "Profiles are readable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "Administrators can update profiles" on public.profiles;
create policy "Administrators can update profiles"
  on public.profiles for update
  to authenticated
  using (public.current_user_role() = 'ADMINISTRATOR');

-- calls policies
drop policy if exists "Authenticated users can read calls" on public.calls;
create policy "Authenticated users can read calls"
  on public.calls for select
  to authenticated
  using (true);

drop policy if exists "Team members and admins can insert calls" on public.calls;
create policy "Team members and admins can insert calls"
  on public.calls for insert
  to authenticated
  with check (
    public.current_user_role() in ('ADMINISTRATOR', 'TEAM_MEMBER')
    and created_by = auth.uid()
  );

drop policy if exists "Team members and admins can update active calls" on public.calls;
create policy "Team members and admins can update active calls"
  on public.calls for update
  to authenticated
  using (
    public.current_user_role() in ('ADMINISTRATOR', 'TEAM_MEMBER')
  );

-- ---------------------------------------------------------------------------
-- Demo users (run AFTER creating auth users in Supabase Auth dashboard)
-- Example update statements once users exist:
--
-- update public.profiles set role = 'ADMINISTRATOR', full_name = 'Admin User'
--   where email = 'admin@trace.local';
-- update public.profiles set role = 'TEAM_MEMBER', full_name = 'Team Member'
--   where email = 'member@trace.local';
-- update public.profiles set role = 'VIEWER', full_name = 'Viewer User'
--   where email = 'viewer@trace.local';
