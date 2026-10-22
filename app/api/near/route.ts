import { GoogleGenAI } from "@google/genai";
import { milesBetween, type Origin } from "@/lib/geo";
import { NODES } from "@/lib/nodes";

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

  const { query, radiusMi, vibe } = (await request.json()) as {
    query: string;
    radiusMi: number;
    vibe?: string;
  };
  if (!query?.trim() || !(radiusMi > 0)) {
    return Response.json({ error: "Enter a location and a distance" }, { status: 400 });
  }

  let origin: Origin | null;
  try {
    origin = await resolvePlace(query.trim());
  } catch (err) {
    console.error("near: places error", err);
    return Response.json({ error: "Couldn't look up that location" }, { status: 502 });
  }
  if (!origin) {
    return Response.json({ error: `Couldn't find "${query}" on Google Maps` }, { status: 404 });
  }

  const results = NODES.map((n) => ({ id: n.id, miles: milesBetween(origin, n) }))
    .filter((r) => r.miles <= radiusMi)
    .sort((a, b) => a.miles - b.miles);

  let pick: string | null = null;
  if (vibe?.trim() && results.length > 0 && process.env.GEMINI_API_KEY) {
    const options = results
      .map((r) => {
        const n = NODES.find((x) => x.id === r.id)!;
        return `- ${n.name} (${r.miles.toFixed(1)} mi, ${n.kind}): ${n.demographic}. ${n.crowd}`;
      })
      .join("\n");
    try {
      const response = await ai.models.generateContent({
        model: "gemini-4-argon",
        contents: `I'm near ${origin.name} in Houston and I'm looking for: "${vibe.trim()}".\nOptions within ${radiusMi} miles:\n${options}`,
        config: {
          systemInstruction:
            "You are a Houston local recommending where to work or hang out. Pick the single best option from the list (only from the list) and say why in at most 2 short sentences. Be honest if none fit well.",
          maxOutputTokens: 150,
        },
      });
      pick = response.text ?? null;
    } catch (err) {
      console.error("near: gemini error", err);
    }
  }

  return Response.json({ origin, results, pick });
}
