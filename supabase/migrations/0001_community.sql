-- Houston Vibe Map: community schema (check-ins, pulses, presence, events, spot submissions).
-- Run once in Supabase → SQL Editor. Safe defaults: everything is readable as
-- reports, but every write is tied to the signed-in user via row-level security.

-- ---------------------------------------------------------------------------
-- Profiles (one per Google sign-in). Only a first name + optional handle are public.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  handle text unique check (handle ~ '^[a-z0-9_]{2,24}$'),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "profiles are readable" on public.profiles for select using (true);
create policy "update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(split_part(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), ' ', 1), '')
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Check-ins: the Workability Index comes only from these.
-- ---------------------------------------------------------------------------
create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  spot_id text not null check (char_length(spot_id) <= 200),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  wifi smallint check (wifi between 1 and 5),
  outlets text check (outlets in ('everywhere', 'limited', 'scarce')),
  noise text check (noise in ('quiet', 'buzz', 'loud')),
  parking text check (parking in ('easy', 'street', 'paid')),
  note text check (char_length(note) <= 280),
  created_at timestamptz not null default now(),
  check (coalesce(wifi::text, outlets, noise, parking, nullif(trim(note), '')) is not null)
);
create index checkins_spot_idx on public.checkins (spot_id, created_at desc);

alter table public.checkins enable row level security;
create policy "checkins are readable" on public.checkins for select using (true);
create policy "insert own checkin" on public.checkins
  for insert to authenticated with check (auth.uid() = user_id);
create policy "delete own checkin" on public.checkins
  for delete to authenticated using (auth.uid() = user_id);

create function public.checkin_cooldown() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (
    select 1 from public.checkins
    where user_id = new.user_id and spot_id = new.spot_id
      and created_at > now() - interval '3 hours'
  ) then
    raise exception 'You already checked in here in the last 3 hours';
  end if;
  return new;
end $$;
create trigger checkin_cooldown before insert on public.checkins
  for each row execute function public.checkin_cooldown();

-- ---------------------------------------------------------------------------
-- Pulses: one-tap "right now" signals. Considered live for 3 hours.
-- ---------------------------------------------------------------------------
create table public.pulses (
  id uuid primary key default gen_random_uuid(),
  spot_id text not null check (char_length(spot_id) <= 200),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('outlets_open', 'no_outlets', 'quiet', 'loud', 'laptops', 'packed', 'seats_open')),
  created_at timestamptz not null default now()
);
create index pulses_recent_idx on public.pulses (created_at desc);

alter table public.pulses enable row level security;
create policy "pulses are readable" on public.pulses for select using (true);
create policy "insert own pulse" on public.pulses
  for insert to authenticated with check (auth.uid() = user_id);
create policy "delete own pulse" on public.pulses
  for delete to authenticated using (auth.uid() = user_id);

create function public.pulse_cooldown() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (
    select 1 from public.pulses
    where user_id = new.user_id and spot_id = new.spot_id and kind = new.kind
      and created_at > now() - interval '30 minutes'
  ) then
    raise exception 'You already sent that pulse in the last 30 minutes';
  end if;
  return new;
end $$;
create trigger pulse_cooldown before insert on public.pulses
  for each row execute function public.pulse_cooldown();

-- ---------------------------------------------------------------------------
-- Presence: "I'm working here now". Opt-in, expires after 3 hours, one spot
-- at a time. Everyone sees counts; names only show for people who chose
-- show_name, and only to signed-in users.
-- ---------------------------------------------------------------------------
create table public.presence (
  id uuid primary key default gen_random_uuid(),
  spot_id text not null check (char_length(spot_id) <= 200),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  status text check (char_length(status) <= 80),
  open_to_chat boolean not null default false,
  show_name boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '3 hours'
);
create index presence_spot_idx on public.presence (spot_id, expires_at);

alter table public.presence enable row level security;
create policy "see named presence or your own" on public.presence for select using (
  user_id = auth.uid()
  or (show_name and auth.uid() is not null and expires_at > now())
);
create policy "insert own presence" on public.presence
  for insert to authenticated with check (auth.uid() = user_id);
create policy "delete own presence" on public.presence
  for delete to authenticated using (auth.uid() = user_id);

create function public.presence_one_spot() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.presence where user_id = new.user_id;
  return new;
end $$;
create trigger presence_one_spot before insert on public.presence
  for each row execute function public.presence_one_spot();

-- Anonymous head-counts per spot, readable by anyone.
create function public.presence_counts() returns table (spot_id text, n bigint)
language sql stable security definer set search_path = '' as $$
  select spot_id, count(*) from public.presence where expires_at > now() group by spot_id
$$;

-- ---------------------------------------------------------------------------
-- Events (co-working nights, meetups). Submitted as pending; you approve them
-- in the Table Editor by setting status = 'approved'.
-- ---------------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  spot_id text not null check (char_length(spot_id) <= 200),
  title text not null check (char_length(title) between 3 and 120),
  url text check (url ~ '^https://'),
  starts_at timestamptz not null,
  ends_at timestamptz,
  submitted_by uuid default auth.uid() references public.profiles (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;
create policy "approved events or your own" on public.events
  for select using (status = 'approved' or submitted_by = auth.uid());
create policy "submit events as pending" on public.events
  for insert to authenticated with check (submitted_by = auth.uid() and status = 'pending');

-- ---------------------------------------------------------------------------
-- Spot submissions ("+ Drop a spot"). Location comes from Google Places,
-- the profile is drafted by Gemini; you approve in the Table Editor.
-- ---------------------------------------------------------------------------
create table public.spot_submissions (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid default auth.uid() references public.profiles (id) on delete set null,
  place_id text not null,
  name text not null,
  address text not null,
  lat double precision not null,
  lng double precision not null,
  kind text not null default 'cafe' check (kind in ('cafe', 'library')),
  neighborhood text,
  take text not null check (char_length(take) between 10 and 500),
  demographic text check (char_length(demographic) <= 60),
  tags text[] not null default '{}',
  crowd text check (char_length(crowd) <= 400),
  color text check (color ~ '^#[0-9a-fA-F]{6}$'),
  credit text check (char_length(credit) <= 40),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.spot_submissions enable row level security;
create policy "approved spots or your own" on public.spot_submissions
  for select using (status = 'approved' or submitted_by = auth.uid());
create policy "submit spots as pending" on public.spot_submissions
  for insert to authenticated with check (submitted_by = auth.uid() and status = 'pending');

-- ---------------------------------------------------------------------------
-- Workability Index per spot, from the last 90 days of check-ins.
-- ---------------------------------------------------------------------------
create view public.spot_stats with (security_invoker = true) as
select
  spot_id,
  count(*) as checkins,
  round(avg(wifi)::numeric, 1) as wifi_avg,
  count(wifi) as wifi_count,
  mode() within group (order by outlets) filter (where outlets is not null) as outlets,
  mode() within group (order by noise) filter (where noise is not null) as noise,
  mode() within group (order by parking) filter (where parking is not null) as parking,
  max(created_at) as last_at
from public.checkins
where created_at > now() - interval '90 days'
group by spot_id;

-- ---------------------------------------------------------------------------
-- Grants + realtime
-- ---------------------------------------------------------------------------
grant select on public.profiles, public.checkins, public.pulses, public.presence,
  public.events, public.spot_submissions, public.spot_stats to anon, authenticated;
grant update (handle) on public.profiles to authenticated;
grant insert, delete on public.checkins, public.pulses, public.presence to authenticated;
grant insert on public.events, public.spot_submissions to authenticated;
grant execute on function public.presence_counts() to anon, authenticated;

alter publication supabase_realtime add table
  public.checkins, public.pulses, public.presence, public.events, public.spot_submissions;
