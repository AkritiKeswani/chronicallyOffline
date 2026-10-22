"use client";

import { emojisForCafe, useCollections } from "@/lib/collections";
import { useAllSpots, useCommunity } from "@/lib/community";
import type { VibeNode } from "@/lib/nodes";
import CafeMarker from "./CafeMarker";

const PAD = 0.012;

function projector(spots: VibeNode[]) {
  const lats = spots.map((n) => n.lat);
  const lngs = spots.map((n) => n.lng);
  const minLat = Math.min(...lats) - PAD;
  const maxLat = Math.max(...lats) + PAD;
  const minLng = Math.min(...lngs) - PAD;
  const maxLng = Math.max(...lngs) + PAD;
  return (node: VibeNode) => ({
    left: `${((node.lng - minLng) / (maxLng - minLng)) * 100}%`,
    top: `${((maxLat - node.lat) / (maxLat - minLat)) * 100}%`,
  });
}

export default function RadarGrid({
  selectedId,
  visibleIds,
  onSelect,
}: {
  selectedId: string | null;
  visibleIds: string[] | null;
  onSelect: (node: VibeNode) => void;
}) {
  const { collections } = useCollections();
  const { here, eventsToday } = useCommunity();
  const spots = useAllSpots();
  const project = projector(spots);

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[140%] -translate-x-1/2 -translate-y-1/2">
        {[20, 40, 60, 80].map((s) => (
          <div
            key={s}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--grid)]"
            style={{ width: `${s}%`, height: `${s}%` }}
          />
        ))}
        <div className="radar-sweep absolute inset-0 rounded-full" />
      </div>

      {spots.map((node) => (
        <div
          key={node.id}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ ...project(node), zIndex: node.id === selectedId ? 10 : 1 }}
        >
          <CafeMarker
            node={node}
            active={node.id === selectedId}
            compact
            dimmed={visibleIds !== null && !visibleIds.includes(node.id)}
            savedEmojis={emojisForCafe(collections, node.id)}
            hereCount={here[node.id] ?? 0}
            eventToday={(eventsToday[node.id]?.length ?? 0) > 0}
            onClick={() => onSelect(node)}
          />
        </div>
      ))}

      <div className="absolute bottom-4 right-4 font-mono text-[10px] uppercase tracking-widest text-accent/70">
        HTX Radar · {spots.length} nodes live
      </div>
    </div>
  );
}
