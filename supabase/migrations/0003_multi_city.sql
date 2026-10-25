-- chronicallyOffline: multi-city foundations.
-- Run once in Supabase → SQL Editor (after 0001 and 0002).

-- ---------------------------------------------------------------------------
-- Profiles: city, field, interests, admin flag
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists city text check (city in ('htx', 'sf', 'nyc', 'phl', 'ldn')),
  add column if not exists field text check (field in ('tech', 'finance', 'fashion', 'other')),
  add column if not exists interests text[] not null default '{}',
  add column if not exists is_admin boolean not null default false;

-- Users can edit their own profile fields, but never is_admin.
revoke update on public.profiles from authenticated;
grant update (handle, city, field, interests) on public.profiles to authenticated;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- You (the owner) are the only admin.
update public.profiles set is_admin = true
where id in (select id from auth.users where email = 'akritikeswani76@gmail.com');

-- ---------------------------------------------------------------------------
-- Vetted spots: curated by admins only, keyed by Google place ID.
-- ---------------------------------------------------------------------------
create table public.spots (
  place_id text primary key,
  city text not null check (city in ('htx', 'sf', 'nyc', 'phl', 'ldn')),
  name text not null,
  address text not null,
  lat double precision not null,
  lng double precision not null,
  kind text not null default 'cafe',
  neighborhood text,
  demographic text check (char_length(demographic) <= 60),
  tags text[] not null default '{}',
  crowd text check (char_length(crowd) <= 400),
  color text check (color ~ '^#[0-9a-fA-F]{6}$'),
  vetted_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index spots_city_idx on public.spots (city);

alter table public.spots enable row level security;
create policy "spots are readable" on public.spots for select using (true);
create policy "admins insert spots" on public.spots for insert to authenticated with check (public.is_admin());
create policy "admins update spots" on public.spots for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete spots" on public.spots for delete to authenticated using (public.is_admin());
grant select on public.spots to anon, authenticated;
grant insert, update, delete on public.spots to authenticated;

insert into public.spots (place_id, city, name, address, lat, lng, kind, neighborhood, demographic, tags, crowd, color) values
  ('ChIJCZ44dX-_QIYR2UJJ-nkD_qY', 'htx', 'Brass Tacks', '612 Live Oak St, Houston, TX 77003', 29.75146, -95.34944, 'cafe', 'EaDo', 'Mid-20s Remote Tech & Creatives', array['Remote eng','Creatives','Outlets galore']::text[], 'Huge warehouse space, tons of outlets, remote engineers grinding.', '#22d3ee'),
  ('ChIJ3VUwj5nAQIYRlAd40VjiTDA', 'htx', 'Agora', '1712 Westheimer Rd, Houston, TX 77098', 29.74294, -95.40261, 'cafe', 'Montrose / Westheimer', 'Late-20s Creatives & Night Owls', array['Creatives','Night owls','Loud']::text[], 'Moody, eclectic 2-story Westheimer spot, chaotic creative energy, bad for quiet calls.', '#f472b6'),
  ('ChIJ27_1pGS_QIYRJB3FWgFpN70', 'htx', 'Siphon Coffee', '701 W Alabama St, Houston, TX 77006', 29.73838, -95.38825, 'cafe', 'West Alabama', '25-32 Professionals & Casual Mix', array['Professionals','Patio','Coffee meetings']::text[], 'Patio seating, coffee meetings, remote workers.', '#fbbf24'),
  ('ChIJiYS_lV3AQIYRnZ65jPAAZu0', 'htx', 'Croissant-Brioche', '2435 Rice Boulevard, Houston, TX 77005', 29.71728, -95.41625, 'cafe', 'Rice Village', '19-24 Rice Students & Academics', array['Undergrads','Grad students','Study groups']::text[], 'Undergrads, grad students, study groups.', '#34d399'),
  ('ChIJp9YS95nAQIYRYQP5SNw4_7Y', 'htx', 'Empire Café', '1732 Westheimer Rd, Houston, TX 77098', 29.74288, -95.40359, 'cafe', 'Montrose / Westheimer', 'Brunch Crowd & Montrose Regulars', array['Brunch','Desserts','Patio']::text[], 'Montrose institution in a renovated gas station: huge breakfasts, rich desserts, busy patio, more social than heads-down work.', '#fb923c'),
  ('ChIJETkDjLvhQIYRKHn7nAnN_TU', 'htx', 'Haraz Coffee House', '13582 University Blvd Ste 100, Sugar Land, TX 77479', 29.58346, -95.64881, 'cafe', 'Sugar Land', 'Yemeni Coffee & Late Hangouts', array['Yemeni coffee','Groups','Open till 10']::text[], 'Yemeni coffee house on University Blvd: cardamom coffee and adeni chai, groups hanging out and students studying into the evening.', '#e879f9'),
  ('ChIJmVkfl7LBQIYR9DhGXU3FnkE', 'htx', 'The Coffee House at West End', '802 Shepherd Dr, Houston, TX 77007', 29.76931, -95.40889, 'cafe', 'West End · Shepherd', 'Med Students & Deep Focus', array['3 floors','Silent top floor','Med students']::text[], 'Three floors on Shepherd; the top floor is for super quiet work, and lots of med students camp out studying.', '#60a5fa'),
  ('ChIJH47xt2TAQIYR_KMXFghaKZI', 'htx', 'Fondren Library', '6100 South Main Street, Houston, TX 77005', 29.71812, -95.40009, 'library', 'Rice University', 'Rice Students & Researchers', array['Library','Quiet floors','Study rooms']::text[], 'Rice''s main library: undergrads, grad students and researchers in heads-down study mode.', '#38bdf8'),
  ('ChIJ76aHT32_QIYRgDs7nSNVPks', 'htx', 'Doherty Library', '1100 W Main St, Houston, TX 77006', 29.73643, -95.39313, 'library', 'University of St. Thomas · Montrose', 'UST Students & Quiet Study', array['Library','Small campus','Quiet']::text[], 'University of St. Thomas library in Montrose: smaller, calmer campus study crowd.', '#a3e635'),
  ('ChIJL1Kii3TAQIYROpx-KeUMPyo', 'htx', 'M.D. Anderson Library', '4333 University Dr, Houston, TX 77204', 29.72108, -95.34205, 'library', 'University of Houston', 'UH Students & Big Study Sessions', array['Library','Huge space','Group study']::text[], 'UH''s main library: big, busy campus study hub with everything from group cram sessions to quiet floors.', '#f87171')
on conflict (place_id) do nothing;

-- ---------------------------------------------------------------------------
-- Community data: key everything by Google place ID, and record the city.
-- ---------------------------------------------------------------------------
create temp table id_map (old_id text, place_id text);
insert into id_map values
    ('brass-tacks', 'ChIJCZ44dX-_QIYR2UJJ-nkD_qY'),
    ('agora', 'ChIJ3VUwj5nAQIYRlAd40VjiTDA'),
    ('siphon', 'ChIJ27_1pGS_QIYRJB3FWgFpN70'),
    ('croissant-brioche', 'ChIJiYS_lV3AQIYRnZ65jPAAZu0'),
    ('empire-cafe', 'ChIJp9YS95nAQIYRYQP5SNw4_7Y'),
    ('haraz-sugar-land', 'ChIJETkDjLvhQIYRKHn7nAnN_TU'),
    ('coffee-house-west-end', 'ChIJmVkfl7LBQIYR9DhGXU3FnkE'),
    ('fondren-library', 'ChIJH47xt2TAQIYR_KMXFghaKZI'),
    ('doherty-library', 'ChIJ76aHT32_QIYRgDs7nSNVPks'),
    ('md-anderson-library', 'ChIJL1Kii3TAQIYROpx-KeUMPyo'),
    ('cafe-ion', 'ChIJBzrhTQC_QIYRJOLjELLkiHQ');

do $$
declare t text;
begin
  foreach t in array array['checkins', 'pulses', 'presence', 'events'] loop
    execute format('alter table public.%I add column if not exists city text check (city in (''htx'', ''sf'', ''nyc'', ''phl'', ''ldn''))', t);
    execute format('update public.%I x set spot_id = m.place_id, city = ''htx'' from id_map m where x.spot_id = m.old_id', t);
    execute format('update public.%I set spot_id = substr(spot_id, 3) where spot_id like ''g:%%''', t);
    execute format('update public.%I x set spot_id = s.place_id from public.spot_submissions s where x.spot_id = ''c:'' || s.id::text', t);
  end loop;
end $$;
drop table id_map;

-- ---------------------------------------------------------------------------
-- Yelp-style ratings
-- ---------------------------------------------------------------------------
alter table public.checkins
  add column if not exists food smallint check (food between 1 and 5),
  add column if not exists drinks smallint check (drinks between 1 and 5),
  add column if not exists ambience smallint check (ambience between 1 and 5);

-- Drop the old "has some content" check (auto-named), wherever it lives.
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.checkins'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%nullif%'
  loop
    execute format('alter table public.checkins drop constraint %I', c);
  end loop;
end $$;
alter table public.checkins add constraint checkins_has_content check (
  coalesce(wifi::text, food::text, drinks::text, ambience::text, outlets, noise, parking, nullif(trim(note), '')) is not null
);

create or replace function public.checkin_cooldown() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  has_rating boolean := coalesce(new.wifi::text, new.food::text, new.drinks::text, new.ambience::text,
                                 new.outlets, new.noise, new.parking) is not null;
begin
  if has_rating and exists (
    select 1 from public.checkins
    where user_id = new.user_id and spot_id = new.spot_id
      and coalesce(wifi::text, food::text, drinks::text, ambience::text, outlets, noise, parking) is not null
      and created_at > now() - interval '3 hours'
  ) then
    raise exception 'You already rated this spot in the last 3 hours';
  end if;

  if not has_rating and (
    select count(*) from public.checkins
    where user_id = new.user_id and spot_id = new.spot_id
      and created_at > now() - interval '1 hour'
  ) >= 10 then
    raise exception 'That''s a lot of notes — try again in a bit';
  end if;

  return new;
end $$;

drop view if exists public.spot_stats;
create view public.spot_stats with (security_invoker = true) as
select
  spot_id,
  count(*) as checkins,
  round(avg(wifi)::numeric, 1) as wifi_avg,
  count(wifi) as wifi_count,
  round(avg(food)::numeric, 1) as food_avg,
  round(avg(drinks)::numeric, 1) as drinks_avg,
  round(avg(ambience)::numeric, 1) as ambience_avg,
  mode() within group (order by outlets) filter (where outlets is not null) as outlets,
  mode() within group (order by noise) filter (where noise is not null) as noise,
  mode() within group (order by parking) filter (where parking is not null) as parking,
  max(created_at) as last_at
from public.checkins
where created_at > now() - interval '90 days'
group by spot_id;
grant select on public.spot_stats to anon, authenticated;

alter publication supabase_realtime add table public.spots;

-- ---------------------------------------------------------------------------
-- Overall 1–10 score, denormalized spot names (so profiles can list reviews
-- of Google spots too), and activity scores / leaderboard.
-- ---------------------------------------------------------------------------
alter table public.checkins
  add column if not exists overall smallint check (overall between 1 and 10),
  add column if not exists spot_name text check (char_length(spot_name) <= 120),
  add column if not exists spot_area text check (char_length(spot_area) <= 120);

alter table public.checkins drop constraint if exists checkins_has_content;
alter table public.checkins add constraint checkins_has_content check (
  coalesce(overall::text, wifi::text, food::text, drinks::text, ambience::text,
           outlets, noise, parking, nullif(trim(note), '')) is not null
);

create or replace function public.checkin_cooldown() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  has_rating boolean := coalesce(new.overall::text, new.wifi::text, new.food::text, new.drinks::text,
                                 new.ambience::text, new.outlets, new.noise, new.parking) is not null;
begin
  if has_rating and exists (
    select 1 from public.checkins
    where user_id = new.user_id and spot_id = new.spot_id
      and coalesce(overall::text, wifi::text, food::text, drinks::text, ambience::text, outlets, noise, parking) is not null
      and created_at > now() - interval '3 hours'
  ) then
    raise exception 'You already rated this spot in the last 3 hours';
  end if;

  if not has_rating and (
    select count(*) from public.checkins
    where user_id = new.user_id and spot_id = new.spot_id
      and created_at > now() - interval '1 hour'
  ) >= 10 then
    raise exception 'That''s a lot of notes — try again in a bit';
  end if;

  return new;
end $$;

drop view if exists public.spot_stats;
create view public.spot_stats with (security_invoker = true) as
select
  spot_id,
  count(*) as checkins,
  round(avg(overall)::numeric, 1) as overall_avg,
  count(overall) as overall_count,
  round(avg(wifi)::numeric, 1) as wifi_avg,
  count(wifi) as wifi_count,
  round(avg(food)::numeric, 1) as food_avg,
  round(avg(drinks)::numeric, 1) as drinks_avg,
  round(avg(ambience)::numeric, 1) as ambience_avg,
  mode() within group (order by outlets) filter (where outlets is not null) as outlets,
  mode() within group (order by noise) filter (where noise is not null) as noise,
  mode() within group (order by parking) filter (where parking is not null) as parking,
  max(created_at) as last_at
from public.checkins
where created_at > now() - interval '90 days'
group by spot_id;
grant select on public.spot_stats to anon, authenticated;

-- Activity score: review with any rating = 3, note-only = 1, pulse = 1.
create view public.leaderboard with (security_invoker = true) as
with c as (
  select user_id,
    count(*) filter (where coalesce(overall::text, wifi::text, food::text, drinks::text, ambience::text,
                                    outlets, noise, parking) is not null) as reviews,
    count(*) filter (where coalesce(overall::text, wifi::text, food::text, drinks::text, ambience::text,
                                    outlets, noise, parking) is null) as notes
  from public.checkins group by user_id
),
p as (select user_id, count(*) as pulses from public.pulses group by user_id)
select
  pr.id, pr.handle, pr.display_name, pr.city,
  coalesce(c.reviews, 0) as reviews,
  coalesce(c.notes, 0) as notes,
  coalesce(p.pulses, 0) as pulses,
  coalesce(c.reviews, 0) * 3 + coalesce(c.notes, 0) + coalesce(p.pulses, 0) as score
from public.profiles pr
left join c on c.user_id = pr.id
left join p on p.user_id = pr.id
where pr.handle is not null;
grant select on public.leaderboard to anon, authenticated;
