# Houston Vibe Map

**HTX Work & Crowd Radar**: find a Houston spot with good coffee, Wi-Fi you can actually work on, and a crowd that fits you.

## Why Houston?

Houston is huge and spread out, and it's surprisingly hard to find places that have both good coffee **and** a solid work setup. Google Maps tells you a cafe exists. It doesn't tell you whether it's packed with Rice undergrads, loud enough to wreck your Zoom call, or quiet enough on the top floor for med school flashcards. Houston Vibe Map is a curated, crowd-aware map built for that question.

## Features

- **Live map of curated spots.** Dark or light Google Map with glowing markers. Nearby spots group together when you zoom out and expand when you zoom in, like Google Maps.
- **Talk to the spot.** Click a cafe or library to chat with it in first person. It tells you honestly whether you fit its crowd right now. Powered by Gemini with Google Maps grounding, so it knows real hours and details.
- **Near me.** Type where you are, even a keyword like "Equinox River Oaks", pick a radius (1–25 mi) and optionally say what you want ("quiet spot to study"). You get spots in range plus a recommendation.
- **Saved lists.** Save spots to *Want to try*, *Favorites*, *Work spots* or your own lists, and filter the map by list.
- **One tap to Google Maps.** Every spot links to its exact Google Maps listing.
- **Radar Grid.** A stylized fallback view that works without a Maps key.
- **Light, dark or system theme.**

## Spots

| Spot | Area | Crowd |
| --- | --- | --- |
| Cafe Ion | Midtown · The Ion | Founders & co-working |
| Brass Tacks | EaDo | Mid-20s remote tech & creatives |
| Agora | Montrose / Westheimer | Late-20s creatives & night owls |
| Empire Café | Montrose / Westheimer | Brunch crowd & Montrose regulars |
| Siphon Coffee | West Alabama | 25–32 professionals & casual mix |
| The Coffee House at West End | Shepherd | Med students & deep focus (silent top floor) |
| Croissant-Brioche | Rice Village | 19–24 Rice students & academics |
| Haraz Coffee House | Sugar Land | Yemeni coffee & late hangouts |
| Fondren Library | Rice University | Rice students & researchers |
| Doherty Library | University of St. Thomas | UST students & quiet study |
| M.D. Anderson Library | University of Houston | UH students & big study sessions |

Every spot is matched to its Google Places ID, so its location and listing are the real ones.

## Community (live)

Sign in with Google to make the map better for the next person:

- **Pulses**: one tap for what you see right now (🔌 outlets open, 🔊 loud, 💻 laptops everywhere…). Live for 3 hours.
- **Check-ins**: rate Wi-Fi, outlets, noise and parking, and leave a vibe note. The **Workability Index** on each spot comes only from these.
- **"I'm working here now"**: opt-in and auto-expires after 3 hours. Everyone sees head-counts; your name only shows if you choose, and only to signed-in users.
- **Events**: submit a co-working night or meetup; approved events make the spot pulse gold that day.
- **Drop a spot**: name + a two-sentence take. Google Maps finds the real location, Gemini drafts the profile, and it appears as "Curated by @you" once approved.
- **Spots remember**: recent pulses, check-ins and events feed into each spot's chat, and your "About me" tailors its answers.

## Roadmap

- More hand-picked spots (Black Hole, Campesino, Boomtown, Slowpokes, Day 6, Antidote, Switchyards, Tout Suite, Tenfold, BlendIn)
- Vibe-match bar: describe yourself and what you need; the map highlights your top matches
- Filters: late night, parking, neighborhood
- Time-of-day vibe notes per spot
- Friends, so "who's here" can be friends-only
- Model choice via OpenRouter (Google Maps grounding is Gemini-only, so other models would get Places details passed in directly)

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in your keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Variable | Used for |
| --- | --- |
| `GEMINI_API_KEY` | Spot chat and near-me recommendations (Google AI Studio; billing must be enabled for Maps grounding; uses `gemini-3.8-flash`) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | The map (Maps JavaScript API). Restrict it to your domain before deploying. |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Community features (Supabase). Use the publishable key, never the secret key. Run `supabase/migrations/0001_community.sql` in the SQL Editor and enable Google sign-in. |
| `GOOGLE_MAPS_SERVER_KEY` | Optional server-only key for Places lookups in near-me search. Falls back to the public key. |

Without a Maps key, the app opens in Radar Grid mode. Without Supabase, community features are hidden and everything else works.

## Tech

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · `@vis.gl/react-google-maps` · Google Places API · `@google/genai` (Gemini with Google Maps grounding) · Supabase (auth, Postgres, realtime)
