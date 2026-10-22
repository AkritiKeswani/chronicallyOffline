import { GoogleGenAI } from "@google/genai";
import { milesBetween, type Origin } from "@/lib/geo";
import type { VibeNode } from "@/lib/nodes";
import { getAllSpots } from "@/lib/spots-server";
import { nearbySpots } from "@/lib/places";

// Picking among many spots is the "think harder" job, so it gets the bigger
// model; spot chats use gemini-3.8-flash for speed.
const GEMINI_MODEL = "gemini-4-argon";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Prefer a server-only key so the browser key can be locked to your domain.
const PLACES_KEY =
  process.env.GOOGLE_MAPS_SERVER_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const HOUSTON = { latitude: 29.7604, longitude: -95.3698 };

async function resolvePlace(query: string): Promise<Origin | null> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": PLACES_KEY!,
      "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location",
    },
    body: JSON.stringify({
      textQuery: query,
      pageSize: 1,
      locationBias: { circle: { center: HOUSTON, radius: 50000 } },
    }),
  });
  if (!res.ok) throw new Error(`Places ${res.status}: ${await res.text()}`);

  const place = (await res.json()).places?.[0];
  if (!place) return null;
  return {
    name: place.displayName?.text ?? query,
    address: (place.formattedAddress ?? "").replace(/, USA$/, ""),
    lat: place.location.latitude,
    lng: place.location.longitude,
  };
}

export async function POST(request: Request) {
  if (!PLACES_KEY) {
    return Response.json({ error: "No Google Maps key configured" }, { status: 500 });
  }

  const { query, coords, radiusMi, vibe, persona } = (await request.json()) as {
    persona?: string;
    query?: string;
    /** From the browser's geolocation, instead of a typed query. */
    coords?: { lat: number; lng: number };
    radiusMi: number;
    vibe?: string;
  };
  const hasCoords = Number.isFinite(coords?.lat) && Number.isFinite(coords?.lng);
  if ((!query?.trim() && !hasCoords) || !(radiusMi > 0)) {
    return Response.json({ error: "Enter a location and a distance" }, { status: 400 });
  }

  let origin: Origin | null;
  try {
    origin = hasCoords
      ? { name: "Your location", address: "", lat: coords!.lat, lng: coords!.lng }
      : await resolvePlace(query!.trim());
  } catch (err) {
    console.error("near: places error", err);
    return Response.json({ error: "Couldn't look up that location" }, { status: 502 });
  }
  if (!origin) {
    return Response.json({ error: `Couldn't find "${query}" on Google Maps` }, { status: 404 });
  }

  const where = hasCoords ? "my current location" : origin.name;
  const spots = await getAllSpots();
  const vettedIds = new Set(spots.map((s) => s.placeId));
  const results = spots
    .map((n) => ({ id: n.id, miles: milesBetween(origin, n) }))
    .filter((r) => r.miles <= radiusMi)
    .sort((a, b) => a.miles - b.miles);

  // Unvetted Google spots in range, so an area with no vetted picks isn't a dead end.
  let others: { node: VibeNode; miles: number }[] = [];
  try {
    others = (await nearbySpots(origin.lat, origin.lng, radiusMi))
      .map((node) => ({ node, miles: milesBetween(origin, node) }))
      .filter((o) => o.miles <= radiusMi && !vettedIds.has(o.node.placeId))
      .sort((a, b) => a.miles - b.miles);
  } catch (err) {
    console.error("near: nearby places error", err);
  }

  let pick: string | null = null;
  if (vibe?.trim() && results.length + others.length > 0 && process.env.GEMINI_API_KEY) {
    const options = [
      ...results.map((r) => {
        const n = spots.find((x) => x.id === r.id)!;
        return `- ${n.name} (${r.miles.toFixed(1)} mi, ${n.kind}, vetted): ${n.demographic}. ${n.crowd}`;
      }),
      ...others.slice(0, 8).map(
        ({ node: n, miles }) =>
          `- ${n.name} (${miles.toFixed(1)} mi, ${n.kind}, not vetted, Google ${n.rating ?? "?"}★ from ${n.ratingCount ?? 0} reviews)`,
      ),
    ].join("\n");
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `I'm near ${where} in Houston and I'm looking for: "${vibe.trim()}".${persona?.trim() ? `\nAbout me: ${persona.trim().slice(0, 200)}` : ""}\nOptions within ${radiusMi} miles:\n${options}`,
        config: {
          systemInstruction:
            "You are a Houston local recommending where to work or hang out. Pick the single best option from the list (only from the list) and say why in at most 2 short sentences. Prefer vetted spots when they fit; if you pick a not-vetted one, say it is not vetted yet. Be honest if none fit well. Plain text, no markdown.",
          maxOutputTokens: 150,
        },
      });
      pick = response.text ?? null;
    } catch (err) {
      console.error("near: gemini error", err);
    }
  }

  const resultSpots = results.map((r) => spots.find((s) => s.id === r.id)!);
  return Response.json({ origin, results, resultSpots, others, pick });
}
