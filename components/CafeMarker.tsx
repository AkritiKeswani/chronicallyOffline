"use client";

import { BookOpen, Coffee } from "lucide-react";
import type { VibeNode } from "@/lib/nodes";
import { readable } from "@/lib/theme";

// The button's box is just the 44px orb (label is absolutely positioned),
// so callers can anchor it with translate(-50%, -50%).
export default function CafeMarker({
  node,
  active,
  dimmed,
  compact,
  savedEmojis,
  hereCount = 0,
  eventToday = false,
  onClick,
}: {
  node: VibeNode;
  active: boolean;
  dimmed: boolean;
  /** Small dot with hover-only label, for zoomed-out views. */
  compact: boolean;
  savedEmojis: string[];
  /** People who said they're working here now. */
  hereCount?: number;
  /** An approved event is happening here today. */
  eventToday?: boolean;
  onClick: () => void;
}) {
  const small = compact && !active;

  return (
    <button
      onClick={onClick}
      className={`group relative flex h-11 w-11 cursor-pointer items-center justify-center transition duration-300 hover:z-20 ${
        dimmed ? "scale-75 opacity-25 hover:opacity-70" : ""
      } ${active ? "z-10 scale-110" : "hover:scale-110"}`}
      style={{ color: node.color }}
      aria-label={`Open ${node.name}`}
    >
      <span className={`relative flex items-center justify-center transition-transform ${small ? "scale-[0.6]" : ""}`}>
        {eventToday && (
          <span className="absolute -inset-3 animate-ping rounded-full border-2 border-amber-400" />
        )}
        <span className="cafe-ripple absolute -inset-1 rounded-full border-2 border-current" />
        <span className="cafe-ripple cafe-ripple-delay absolute -inset-1 rounded-full border-2 border-current" />
        <span
          className="absolute -inset-4 rounded-full opacity-60 blur-xl"
          style={{ background: node.color }}
        />
        <span
          className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-black"
          style={{
            background: node.color,
            boxShadow: `0 0 ${active ? 36 : 22}px ${node.color}, 0 0 4px #fff`,
          }}
        >
          {node.kind === "library" ? (
            <BookOpen size={17} strokeWidth={2.5} />
          ) : (
            <Coffee size={17} strokeWidth={2.5} />
          )}
        </span>
        {hereCount > 0 && (
          <span
            className="absolute -bottom-2 -right-3 rounded-full border border-white bg-emerald-500 px-1 text-[10px] font-semibold leading-4 text-white"
            title={`${hereCount} working here now`}
          >
            👥{hereCount}
          </span>
        )}
        {savedEmojis.length > 0 && (
          <span className="absolute -right-3 -top-3 rounded-full border border-line-strong bg-solid px-1 text-[10px] leading-4">
            {savedEmojis.slice(0, 3).join("")}
          </span>
        )}
      </span>

      <span
        className={`pointer-events-none absolute left-1/2 top-full mt-0.5 -translate-x-1/2 whitespace-nowrap rounded-lg border bg-solid/90 px-2.5 py-1 text-center shadow-lg backdrop-blur transition-opacity ${
          small ? "opacity-0 group-hover:opacity-100" : ""
        }`}
        style={{ borderColor: node.color, boxShadow: `0 0 14px ${node.color}55` }}
      >
        <span className="block text-[13px] font-semibold leading-tight text-fg">{node.name}</span>
        <span
          className="block text-[10px] font-medium leading-tight"
          style={{ color: readable(node.color) }}
        >
          {node.demographic}
        </span>
      </span>
    </button>
  );
}
