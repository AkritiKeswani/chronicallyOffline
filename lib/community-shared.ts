import type { VibeNode } from "@/lib/nodes";
import type { SpotSubmission } from "@/lib/supabase";

export const COMMUNITY_PREFIX = "c:";

/** An approved "Drop a spot" submission, as a map node. */
export function submissionToNode(s: SpotSubmission): VibeNode {
  return {
    id: `${COMMUNITY_PREFIX}${s.id}`,
    kind: s.kind,
    vetted: true,
    name: s.name,
    placeId: s.place_id,
    address: s.address,
    neighborhood: s.neighborhood ?? "Houston",
    lat: s.lat,
    lng: s.lng,
    demographic: s.demographic ?? "Community pick",
    tags: s.tags ?? [],
    crowd: s.crowd ?? s.take,
    color: s.color ?? "#f472b6",
    curatedBy: s.credit ?? undefined,
  };
}
