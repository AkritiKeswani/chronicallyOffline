import { nearbySpots } from "@/lib/places";
import { getAllSpots } from "@/lib/spots-server";

// GET /api/places?lat=..&lng=..&radiusMi=..  → unvetted Google spots near a point
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  const radiusMi = Math.min(Number(params.get("radiusMi")) || 2, 25);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return Response.json({ error: "lat and lng are required" }, { status: 400 });
  }

  try {
    const [spots, vetted] = await Promise.all([nearbySpots(lat, lng, radiusMi), getAllSpots()]);
    const vettedIds = new Set(vetted.map((v) => v.placeId));
    return Response.json({ spots: spots.filter((s) => !vettedIds.has(s.placeId)) });
  } catch (err) {
    console.error("places error", err);
    return Response.json({ error: "Google Places lookup failed" }, { status: 502 });
  }
}
