-- Unit crosswalk migration for existing TRACE Supabase projects
-- Run in Supabase SQL Editor if calls table already exists without these columns.

do $$ begin
  create type public.trace_mapping_status as enum ('Mapped', 'Unmapped');
exception when duplicate_object then null;
end $$;

alter table public.calls
  add column if not exists reporting_unit text;

alter table public.calls
  add column if not exists mapping_status public.trace_mapping_status not null default 'Unmapped';

create index if not exists calls_reporting_unit_idx on public.calls (reporting_unit);
create index if not exists calls_mapping_status_idx on public.calls (mapping_status);

create table if not exists public.unit_crosswalk (
  id uuid primary key default gen_random_uuid(),
  location_pattern text not null,
  reporting_unit text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists unit_crosswalk_active_idx on public.unit_crosswalk (active);
create index if not exists unit_crosswalk_pattern_idx on public.unit_crosswalk (location_pattern);

alter table public.unit_crosswalk enable row level security;

drop policy if exists "Authenticated users can read unit crosswalk" on public.unit_crosswalk;
create policy "Authenticated users can read unit crosswalk"
  on public.unit_crosswalk for select to authenticated using (true);

drop policy if exists "Authenticated users can insert unit crosswalk" on public.unit_crosswalk;
create policy "Authenticated users can insert unit crosswalk"
  on public.unit_crosswalk for insert to authenticated with check (true);

drop policy if exists "Authenticated users can update unit crosswalk" on public.unit_crosswalk;
create policy "Authenticated users can update unit crosswalk"
  on public.unit_crosswalk for update to authenticated using (true) with check (true);

grant all on table public.unit_crosswalk to postgres, service_role;
grant select, insert, update on table public.unit_crosswalk to authenticated;

drop trigger if exists unit_crosswalk_set_updated_at on public.unit_crosswalk;
create trigger unit_crosswalk_set_updated_at
  before update on public.unit_crosswalk
  for each row execute function public.set_updated_at();
