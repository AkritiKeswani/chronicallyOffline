"use client";

import { BookOpen, Coffee, Star } from "lucide-react";
import type { VibeNode } from "@/lib/nodes";

// Deliberately plain next to vetted CafeMarkers: small, gray, no glow.
export default function UnvettedMarker({
  node,
  active,
  rank,
  onClick,
}: {
  node: VibeNode;
  active: boolean;
  /** 1 or 2 when this is a top match for the user's search. */
  rank?: number;
  onClick: () => void;
}) {
  const Icon = node.kind === "library" ? BookOpen : Coffee;

  return (
    <button
      onClick={onClick}
      className={`group relative flex h-7 w-7 items-center justify-center transition hover:z-20 ${
        active ? "z-10 scale-125" : "hover:scale-110"
      }`}
      aria-label={`Open ${node.name} (not vetted)`}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-slate-400 text-white shadow-md">
        <Icon size={10} strokeWidth={2.75} />
      </span>
      {rank && (
        <span className="absolute -left-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-invert text-[9px] font-bold text-invert-fg">
          {rank}
        </span>
      )}
      <span
        className={`pointer-events-none absolute left-1/2 top-full -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-solid/95 px-2 py-0.5 text-center shadow transition-opacity ${
          active ? "" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <span className="block text-[12px] font-medium leading-tight text-fg">{node.name}</span>
        <span className="flex items-center justify-center gap-1 text-[10px] leading-tight text-muted">
          {node.rating != null && (
            <>
              <Star size={9} className="fill-current" /> {node.rating.toFixed(1)} ·
            </>
          )}{" "}
          Not vetted
        </span>
      </span>
    </button>
  );
}
