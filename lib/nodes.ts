import type { CityId } from "@/lib/cities";

/** A place on the map. `id` is always the Google place ID. */
export type VibeNode = {
  id: string;
  kind: "cafe" | "library";
  /** true = vetted by an admin (has a crowd profile); false = from Google search. */
  vetted: boolean;
  city?: CityId;
  name: string;
  placeId: string;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  demographic: string;
  tags: string[];
  crowd: string;
  color: string;
  rating?: number;
  ratingCount?: number;
};

/** Row shape of the `spots` table (supabase/migrations/0003_multi_city.sql). */
export type SpotRow = {
  place_id: string;
  city: CityId;
  name: string;
  address: string;
  lat: number;
  lng: number;
  kind: string;
  neighborhood: string | null;
  demographic: string | null;
  tags: string[];
  crowd: string | null;
  color: string | null;
};

export const UNVETTED_COLOR = "#94a3b8";
export const DEFAULT_VETTED_COLOR = "#f472b6";

export function spotFromRow(r: SpotRow): VibeNode {
  return {
    id: r.place_id,
    placeId: r.place_id,
    kind: r.kind === "library" ? "library" : "cafe",
    vetted: true,
    city: r.city,
    name: r.name,
    address: r.address,
    neighborhood: r.neighborhood ?? "",
    lat: r.lat,
    lng: r.lng,
    demographic: r.demographic ?? "Vetted pick",
    tags: r.tags ?? [],
    crowd: r.crowd ?? "",
    color: r.color ?? DEFAULT_VETTED_COLOR,
  };
}

export function googleMapsUrl(node: VibeNode) {
  const query = encodeURIComponent(`${node.name}, ${node.address}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${node.placeId}`;
}
