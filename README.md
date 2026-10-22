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

## Roadmap

### Next up: community check-ins

The app should get better the more people use it. If you go to Agora and it's "meh, Wi-Fi kept dropping," the next person should know.

- **Check in at a spot.** Rate Wi-Fi (1–5), noise (silent, chatter, loud) and how busy it was, and leave an optional one-liner.
- **Live community stats** on every spot, e.g. `📶 4.2 · 12 check-ins · mostly chatter · last 2h ago`, plus the latest notes. Wi-Fi ratings come only from real check-ins.
- **Spots remember what people say.** A spot's chat factors in recent check-ins, so if people report bad Wi-Fi tonight, it'll admit it.
- **Smarter near-me picks** using community Wi-Fi and noise data.
- **Sign in with Google** to check in, with one check-in per spot every few hours to keep things honest. Check-ins will be stored in Supabase.

### Also planned

- More spots across Westheimer, River Oaks and Montrose, plus Haraz Pearland
- Near-me results beyond the curated list, clearly marked as uncurated
- Automatic re-verification of every spot against Google Places
- Saved lists that sync across devices
- Public deployment

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in your keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Variable | Used for |
| --- | --- |
| `GEMINI_API_KEY` | Spot chat and near-me recommendations (Google AI Studio; billing must be enabled for `gemini-4-argon` + Maps grounding) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | The map (Maps JavaScript API). Restrict it to your domain before deploying. |
| `GOOGLE_MAPS_SERVER_KEY` | Optional server-only key for Places lookups in near-me search. Falls back to the public key. |

Without a Maps key, the app opens in Radar Grid mode.

## Tech

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · `@vis.gl/react-google-maps` · Google Places API · `@google/genai` (Gemini with Google Maps grounding)
