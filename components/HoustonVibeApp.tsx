"use client";

import { useState } from "react";
import { Map as MapIcon, Radar } from "lucide-react";
import type { VibeNode } from "@/lib/nodes";
import ChatDrawer from "./ChatDrawer";
import RadarGrid from "./RadarGrid";
import VibeMap from "./VibeMap";

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const hasMapsKey = MAPS_KEY !== "" && !MAPS_KEY.startsWith("your_");

export default function HoustonVibeApp() {
  const [view, setView] = useState<"map" | "radar">(hasMapsKey ? "map" : "radar");
  const [selected, setSelected] = useState<VibeNode | null>(null);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#05070d] text-white">
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 p-4 sm:p-6">
        <div className="pointer-events-auto rounded-2xl border border-white/10 bg-black/60 px-4 py-3 backdrop-blur">
          <h1 className="text-lg font-semibold tracking-tight">Houston Vibe Map</h1>
          <p className="font-mono text-[10px] uppercase tracking-widest text-sky-300/70">
            HTX Work &amp; Crowd Radar
          </p>
        </div>

        <div className="pointer-events-auto flex rounded-xl border border-white/10 bg-black/60 p-1 backdrop-blur">
          <button
            onClick={() => setView("map")}
            disabled={!hasMapsKey}
            title={hasMapsKey ? "Google Map" : "Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable"}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40 ${
              view === "map" ? "bg-white text-black" : "text-zinc-300"
            }`}
          >
            <MapIcon size={14} /> Map
          </button>
          <button
            onClick={() => setView("radar")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs ${
              view === "radar" ? "bg-white text-black" : "text-zinc-300"
            }`}
          >
            <Radar size={14} /> Radar Grid
          </button>
        </div>
      </header>

      <main className="absolute inset-0">
        {view === "map" && hasMapsKey ? (
          <VibeMap apiKey={MAPS_KEY} selectedId={selected?.id ?? null} onSelect={setSelected} />
        ) : (
          <RadarGrid selectedId={selected?.id ?? null} onSelect={setSelected} />
        )}
      </main>

      {selected && (
        <ChatDrawer key={selected.id} node={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
