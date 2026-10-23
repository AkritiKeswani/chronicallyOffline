-- Notes shouldn't use up your rating slot. Ratings (Wi-Fi/outlets/noise/parking)
-- stay at one per spot every 3 hours; note-only check-ins are capped at 10 per
-- spot per hour to slow down spam.

create or replace function public.checkin_cooldown() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  has_rating boolean := coalesce(new.wifi::text, new.outlets, new.noise, new.parking) is not null;
begin
  if has_rating and exists (
    select 1 from public.checkins
    where user_id = new.user_id and spot_id = new.spot_id
      and coalesce(wifi::text, outlets, noise, parking) is not null
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
