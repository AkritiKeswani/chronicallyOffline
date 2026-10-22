"use client";

import { NODES, type VibeNode } from "@/lib/nodes";

const PAD = 0.012;
const lats = NODES.map((n) => n.lat);
const lngs = NODES.map((n) => n.lng);
const minLat = Math.min(...lats) - PAD;
const maxLat = Math.max(...lats) + PAD;
const minLng = Math.min(...lngs) - PAD;
const maxLng = Math.max(...lngs) + PAD;

function project(node: VibeNode) {
  return {
    left: `${((node.lng - minLng) / (maxLng - minLng)) * 100}%`,
    top: `${((maxLat - node.lat) / (maxLat - minLat)) * 100}%`,
  };
}

export default function RadarGrid({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (node: VibeNode) => void;
}) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#05070d]">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(56,189,248,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,.15) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[140%] -translate-x-1/2 -translate-y-1/2">
        {[20, 40, 60, 80].map((s) => (
          <div
            key={s}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-400/15"
            style={{ width: `${s}%`, height: `${s}%` }}
          />
        ))}
        <div className="radar-sweep absolute inset-0 rounded-full" />
      </div>

      {NODES.map((node) => {
        const active = node.id === selectedId;
        return (
          <button
            key={node.id}
            onClick={() => onSelect(node)}
            className="group absolute -translate-x-1/2 -translate-y-1/2 text-left"
            style={project(node)}
          >
            <span
              className="vibe-pulse block h-4 w-4 rounded-full"
              style={{
                background: node.color,
                boxShadow: `0 0 ${active ? 28 : 16}px ${node.color}`,
                color: node.color,
              }}
            />
            <span
              className={`absolute left-6 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border px-2 py-1 text-xs backdrop-blur transition ${
                active ? "bg-black/80" : "bg-black/50 group-hover:bg-black/80"
              }`}
              style={{ borderColor: `${node.color}66` }}
            >
              <span className="block font-semibold text-white">{node.name}</span>
              <span className="block" style={{ color: node.color }}>
                {node.demographic}
              </span>
            </span>
          </button>
        );
      })}

      <div className="absolute bottom-4 left-4 font-mono text-[10px] uppercase tracking-widest text-sky-300/60">
        HTX Radar · {NODES.length} nodes live
      </div>
    </div>
  );
}
