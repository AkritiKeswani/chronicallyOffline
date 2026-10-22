# Roadmap

## Why Houston

Houston is spread out and it's hard to find spots that have good coffee **and**
Wi-Fi you can actually work on. Houston Vibe Map is a curated, crowd-aware map of
those spots — and it gets better the more people use it.

## Next up: community check-ins (the network effect)

Let people report how a spot actually was, so the next person benefits.

- **Check-in per spot:** "I went here" → Wi-Fi rating (1–5), noise
  (silent / chatter / loud), how busy (empty / some / packed), optional one-liner
  ("meh, Wi-Fi kept dropping").
- **Live community stats** on markers and in the chat drawer, e.g.
  `📶 4.2 · 12 check-ins · mostly chatter · last 2h ago`, plus the latest notes.
- **Wi-Fi ratings start empty** and come only from real check-ins — no invented
  seed data.
- **The spot's Gemini chat reads recent check-ins**, so if people report Agora's
  Wi-Fi was bad tonight, Agora admits it. Check-ins are passed as reported data,
  never as instructions.
- **Near-me picks** factor in community Wi-Fi/noise.

Decided:

- **Database:** Supabase (Postgres). Table `checkins` (spot_id, user_id, wifi,
  noise, busy, note ≤ 280 chars, created_at), public read, insert only as the
  signed-in user (row-level security), a stats view per spot, realtime so new
  check-ins show up for everyone without a refresh.
- **Identity:** Sign in with Google (via Supabase Auth). Show first name only.
  Limit one check-in per user per spot every few hours.

Setup needed from the owner:

1. Create a Supabase project → copy the project URL + anon key into `.env.local`.
2. Google Cloud Console → create an OAuth client (web) → paste its ID/secret into
   Supabase → Authentication → Providers → Google; add the Supabase callback URL.
3. Run the SQL migration (to be added under `supabase/`).

## Other open items

- **Restrict the Google Maps key** (Cloud Console → Credentials): HTTP-referrer
  restriction to the deployed domain, and limit it to Maps JavaScript API. Use a
  separate server-only key (`GOOGLE_MAPS_SERVER_KEY`) for Places lookups in
  `/api/near`.
- **Verify spot data automatically:** a script that re-checks every spot's
  `placeId` against the Places API (still open, name, location) so a wrong
  entry like the original "Sohn Cafe" can't slip in again.
- **Near-me beyond the curated list:** optionally surface other Google-listed
  cafes/libraries in the radius, clearly marked as uncurated.
- **Radar Grid with far-out spots:** Sugar Land squeezes the inner-Loop spots
  together on the radar; consider an inset or excluding outliers.
- **More spots:** more of Westheimer, River Oaks and Montrose; Haraz Pearland.
- **Deploy** (e.g. Vercel) with env vars set in the host, not committed.
