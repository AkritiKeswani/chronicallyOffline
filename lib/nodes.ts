import spots from "@/data/spots.json";

export type VibeNode = {
  id: string;
  kind: "cafe" | "library";
  /** true = hand-picked with a crowd profile; false = pulled live from Google Maps. */
  vetted: boolean;
  name: string;
  /** Google Places ID — the source of truth for where this spot is. */
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
  /** Credit for community-submitted spots, e.g. "@sarah". */
  curatedBy?: string;
};

/** Hand-picked spots live in data/spots.json; community picks come from Supabase. */
export const NODES: VibeNode[] = (spots as Omit<VibeNode, "vetted">[]).map((s) => ({
  ...s,
  vetted: true,
}));

export const UNVETTED_COLOR = "#94a3b8";
export const UNVETTED_PREFIX = "g:";

export function isVettedPlace(placeId: string) {
  return NODES.some((n) => n.placeId === placeId);
}

export function googleMapsUrl(node: VibeNode) {
  const query = encodeURIComponent(`${node.name}, ${node.address}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${node.placeId}`;
}
