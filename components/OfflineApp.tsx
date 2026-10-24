"use client";

import { useState } from "react";
import { Bookmark, Map as MapIcon, Monitor, Moon, Radar, Sun } from "lucide-react";
import type { MatchResponse } from "@/app/api/match/route";
import { useAuth } from "@/lib/auth";
import { useCity } from "@/lib/city";
import { useCollections } from "@/lib/collections";
import type { VibeNode } from "@/lib/nodes";
import { useTheme, type ThemePref } from "@/lib/theme";
import AccountMenu from "./AccountMenu";
import ChatDrawer from "./ChatDrawer";
import CityPicker, { CitySwitcher } from "./CityPicker";
import CollectionsPanel from "./CollectionsPanel";
import MatchBar from "./MatchBar";
import ProfileSetup from "./ProfileSetup";
import RadarGrid from "./RadarGrid";
import VibeMap from "./VibeMap";

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const hasMapsKey = MAPS_KEY !== "" && !MAPS_KEY.startsWith("your_");

const THEME_OPTIONS: { value: ThemePref; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light mode", Icon: Sun },
  { value: "dark", label: "Dark mode", Icon: Moon },
  { value: "system", label: "Match system", Icon: Monitor },
];

export default function OfflineApp() {
  const city = useCity();
  const auth = useAuth();
  const [view, setView] = useState<"map" | "radar">(hasMapsKey ? "map" : "radar");
  const [selected, setSelected] = useState<VibeNode | null>(null);
  const [listsOpen, setListsOpen] = useState(false);
  const [filterId, setFilterId] = useState<string | null>(null);
  const [match, setMatch] = useState<MatchResponse | null>(null);
  const [matchCity, setMatchCity] = useState(city?.id);
  const { collections } = useCollections();
  const { pref, setPref } = useTheme();

  // Switching cities clears city-specific state.
  if (matchCity !== city?.id) {
    setMatchCity(city?.id);
    setMatch(null);
    setSelected(null);
  }

  if (!city) return <CityPicker />;

  const needsProfile = Boolean(auth.user && auth.profile && (!auth.profile.handle || !auth.profile.field));

  const filter = collections.find((c) => c.id === filterId) ?? null;
  const visibleIds = filter
    ? filter.cafeIds
    : match
      ? match.picks.length > 0
        ? match.picks.map((p) => p.id)
        : match.results.map((r) => r.spot.id)
      : null;
  const savedTotal = new Set(collections.flatMap((c) => c.cafeIds)).size;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 p-4 sm:p-6">
        <div className="pointer-events-auto flex items-stretch gap-2">
          <div className="rounded-2xl border border-line bg-surface px-4 py-3 shadow-sm backdrop-blur">
            <h1 className="text-lg font-semibold tracking-tight">chronicallyOffline</h1>
            <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
              What&rsquo;s happening in {city.short}
            </p>
          </div>
          <CitySwitcher city={city} />
          <button
            onClick={() => setListsOpen((o) => !o)}
            className={`flex items-center gap-1.5 rounded-2xl border px-3 text-xs font-medium backdrop-blur ${
              listsOpen ? "border-invert bg-invert text-invert-fg" : "border-line bg-surface text-fg shadow-sm"
            }`}
          >
            <Bookmark size={14} /> Lists{savedTotal > 0 && ` · ${savedTotal}`}
          </button>
        </div>

        <div className="pointer-events-auto flex flex-col items-end gap-2 sm:flex-row sm:items-start">
          <AccountMenu />
          <div className="flex rounded-xl border border-line bg-surface p-1 shadow-sm backdrop-blur">
            {THEME_OPTIONS.map(({ value, label, Icon }) => (
              <button
                key={value}
                onClick={() => setPref(value)}
                title={label}
                aria-label={label}
                className={`rounded-lg p-1.5 ${pref === value ? "bg-invert text-invert-fg" : "text-muted hover:text-fg"}`}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>
          <div className="flex rounded-xl border border-line bg-surface p-1 shadow-sm backdrop-blur">
            <button
              onClick={() => setView("map")}
              disabled={!hasMapsKey}
              title={hasMapsKey ? "Google Map" : "Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable"}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40 ${
                view === "map" ? "bg-invert text-invert-fg" : "text-muted"
              }`}
            >
              <MapIcon size={14} /> Map
            </button>
            <button
              onClick={() => setView("radar")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs ${
                view === "radar" ? "bg-invert text-invert-fg" : "text-muted"
              }`}
            >
              <Radar size={14} /> Radar
            </button>
          </div>
        </div>
      </header>

      {listsOpen && (
        <CollectionsPanel
          activeId={filterId}
          onFilter={setFilterId}
          onSelect={setSelected}
          onClose={() => setListsOpen(false)}
        />
      )}

      {filter && (
        <button
          onClick={() => setFilterId(null)}
          className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-full border border-line-strong bg-surface px-4 py-2 text-xs shadow-sm backdrop-blur hover:bg-solid"
        >
          Showing {filter.emoji} {filter.name} ({filter.cafeIds.length}) · Show all ✕
        </button>
      )}

      <main className="absolute inset-0">
        {view === "map" && hasMapsKey ? (
          <VibeMap
            key={city.id}
            apiKey={MAPS_KEY}
            city={city}
            selected={selected}
            visibleIds={visibleIds}
            match={match}
            onSelect={setSelected}
          />
        ) : (
          <RadarGrid city={city} selectedId={selected?.id ?? null} visibleIds={visibleIds} onSelect={setSelected} />
        )}
      </main>

      <MatchBar
        city={city}
        match={match}
        onMatch={setMatch}
        onSelect={setSelected}
        drawerOpen={Boolean(selected)}
      />

      {selected && <ChatDrawer key={selected.id} node={selected} onClose={() => setSelected(null)} />}

      {needsProfile && <ProfileSetup />}
    </div>
  );
}
