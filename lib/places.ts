import "server-only";

import { METERS_PER_MILE } from "@/lib/geo";
import { isVettedPlace, UNVETTED_COLOR, UNVETTED_PREFIX, type VibeNode } from "@/lib/nodes";

// Prefer a server-only key so the browser key can be locked to your domain.
const PLACES_KEY =
  process.env.GOOGLE_MAPS_SERVER_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "primaryType",
  "types",
  "rating",
  "userRatingCount",
  "businessStatus",
];

type ApiPlace = {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location: { latitude: number; longitude: number };
  primaryType?: string;
  types?: string[];
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
};

// Google tags McDonald's and gelato shops as "cafe" too, so filter on the
// place's *primary* type and a basic quality bar.
const ALLOWED_PRIMARY = new Set([
  "cafe",
  "coffee_shop",
  "coffee_roastery",
  "coffee_stand",
  "tea_house",
  "internet_cafe",
  "library",
]);
const MIN_RATING = 4.0;
const MIN_REVIEWS = 10;

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; value: unknown }>();

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value as T;
  const value = await load();
  cache.set(key, { at: Date.now(), value });
  return value;
}

/** Google Places daily quota is used up. */
export class QuotaError extends Error {
  constructor() {
    super("Google spots hit today's limit — showing hand-picked spots only");
  }
}

async function placesFetch(path: string, init: RequestInit, fieldMask: string) {
  if (!PLACES_KEY) throw new Error("No Google Maps key configured");
  const res = await fetch(`https://places.googleapis.com/v1/${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": PLACES_KEY,
      "X-Goog-FieldMask": fieldMask,
    },
  });
  if (res.status === 429) throw new QuotaError();
  if (!res.ok) throw new Error(`Places ${res.status}: ${await res.text()}`);
  return res.json();
}

function toNode(p: ApiPlace): VibeNode {
  const isLibrary = p.primaryType === "library" || p.types?.includes("library");
  return {
    id: `${UNVETTED_PREFIX}${p.id}`,
    kind: isLibrary ? "library" : "cafe",
    vetted: false,
    name: p.displayName?.text ?? "Unknown place",
    placeId: p.id,
    address: (p.formattedAddress ?? "").replace(/, USA$/, ""),
    neighborhood: "From Google Maps",
    lat: p.location.latitude,
    lng: p.location.longitude,
    demographic: "Not vetted yet",
    tags: [],
    crowd: "",
    color: UNVETTED_COLOR,
    rating: p.rating,
    ratingCount: p.userRatingCount,
  };
}

/** One searchNearby call: up to 20 popular places of the given types. */
async function searchCircle(types: string[], lat: number, lng: number, radiusMi: number) {
  const data = await placesFetch(
    "places:searchNearby",
    {
      method: "POST",
      body: JSON.stringify({
        includedTypes: types,
        maxResultCount: 20,
        rankPreference: "POPULARITY",
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: Math.min(radiusMi * METERS_PER_MILE, 50000),
          },
        },
      }),
    },
    FIELDS.map((f) => `places.${f}`).join(","),
  );
  return (data.places ?? []) as ApiPlace[];
}

/** Popular, open cafes/coffee shops/libraries near a point, excluding vetted spots. */
export function nearbySpots(lat: number, lng: number, radiusMi: number): Promise<VibeNode[]> {
  // ~100m grid so nearby map pans share cache entries.
  const key = `near:${lat.toFixed(3)},${lng.toFixed(3)},${radiusMi}`;
  return cached(key, async () => {
    // Cafes and libraries are searched separately so libraries don't crowd
    // out cafes in the 20-result cap; cafes get tiled, libraries are sparse.
    // Two calls per area (cafes, libraries). The project's Nearby Search
    // quota is small (100/day), so no tiling — results are cached 24h.
    const batches = await Promise.all([
      searchCircle(["cafe", "coffee_shop", "tea_house"], lat, lng, radiusMi),
      searchCircle(["library"], lat, lng, radiusMi),
    ]);

    const byId = new Map<string, ApiPlace>();
    for (const p of batches.flat()) byId.set(p.id, p);

    return [...byId.values()]
      .filter(
        (p) =>
          p.businessStatus === "OPERATIONAL" &&
          ALLOWED_PRIMARY.has(p.primaryType ?? "") &&
          (p.rating ?? 0) >= MIN_RATING &&
          (p.userRatingCount ?? 0) >= MIN_REVIEWS &&
          !isVettedPlace(p.id),
      )
      .map(toNode);
  });
}

/** Look up one place by ID (used to trust-check unvetted spots sent by the client). */
export function placeById(placeId: string): Promise<VibeNode> {
  return cached(`place:${placeId}`, async () =>
    toNode(
      (await placesFetch(
        `places/${encodeURIComponent(placeId)}`,
        { method: "GET" },
        FIELDS.join(","),
      )) as ApiPlace,
    ),
  );
}

const HOUSTON = { latitude: 29.7604, longitude: -95.3698 };

export type FoundPlace = {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  kind: "cafe" | "library";
  /** Primary type is a cafe/coffee shop/tea house/library (vs. e.g. a restaurant). */
  isWorkSpot: boolean;
  open: boolean;
  rating: number | null;
  ratingCount: number;
};

/** Resolve free text ("black hole coffee montrose") to one real Houston-area place. */
export async function findPlace(query: string): Promise<FoundPlace | null> {
  const data = await placesFetch(
    "places:searchText",
    {
      method: "POST",
      body: JSON.stringify({
        textQuery: query,
        pageSize: 1,
        locationBias: { circle: { center: HOUSTON, radius: 50000 } },
      }),
    },
    FIELDS.map((f) => `places.${f}`).join(","),
  );
  const p = (data.places as ApiPlace[] | undefined)?.[0];
  if (!p) return null;
  const node = toNode(p);
  return {
    placeId: p.id,
    name: node.name,
    address: node.address,
    lat: node.lat,
    lng: node.lng,
    kind: node.kind,
    isWorkSpot: ALLOWED_PRIMARY.has(p.primaryType ?? "") || p.primaryType === "bakery",
    open: p.businessStatus === "OPERATIONAL",
    rating: p.rating ?? null,
    ratingCount: p.userRatingCount ?? 0,
  };
}

/** Resolve free text ("equinox river oaks") to a point in the Houston area. */
export async function resolveOrigin(query: string) {
  const place = await findPlace(query);
  return place && { name: place.name, address: place.address, lat: place.lat, lng: place.lng };
}
