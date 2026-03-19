-- Geo Location Clock In schema
-- Run this in Supabase SQL Editor before starting the app.

create extension if not exists pgcrypto;

-- Roles used by application logic.
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'app_role' and n.nspname = 'public'
  ) then
    create type public.app_role as enum ('learner', 'facilitator', 'admin');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) >= 2),
  role public.app_role not null default 'learner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) >= 2),
  address text,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  allowed_radius_m integer not null check (allowed_radius_m > 0 and allowed_radius_m <= 2000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clock_ins (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.profiles(id) on delete restrict,
  venue_id uuid not null references public.venues(id) on delete restrict,
  client_latitude double precision not null check (client_latitude between -90 and 90),
  client_longitude double precision not null check (client_longitude between -180 and 180),
  distance_m double precision not null check (distance_m >= 0),
  clocked_in_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_venues_is_active on public.venues(is_active);
create index if not exists idx_clock_ins_learner_time on public.clock_ins(learner_id, clocked_in_at desc);
create index if not exists idx_clock_ins_venue_time on public.clock_ins(venue_id, clocked_in_at desc);
create index if not exists idx_clock_ins_clocked_in_at on public.clock_ins(clocked_in_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists trg_venues_updated_at on public.venues;
create trigger trg_venues_updated_at
before update on public.venues
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.venues enable row level security;
alter table public.clock_ins enable row level security;

-- Frontend directly reads the signed-in user's profile.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

-- Optional self-update policy (kept conservative).
drop policy if exists "profiles_update_own_name" on public.profiles;
create policy "profiles_update_own_name"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- App uses service role for venues + clock_ins access through API.
-- Keep direct client access blocked by omitting authenticated policies.
