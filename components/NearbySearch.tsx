"use client";

import { useState } from "react";
import { Loader2, LocateFixed, Navigation, Sparkles, X } from "lucide-react";
import type { Origin } from "@/lib/geo";
import { getPersona } from "@/lib/auth";
import type { VibeNode } from "@/lib/nodes";

export type NearbyResult = {
  origin: Origin;
  radiusMi: number;
  results: { id: string; miles: number }[];
  /** Spot objects for `results`, same order (includes community picks). */
  resultSpots: VibeNode[];
  /** Unvetted Google spots in range. */
  others: { node: VibeNode; miles: number }[];
  pick: string | null;
};

const DISTANCES = [1, 3, 5, 10, 25];

export default function NearbySearch({
  nearby,
  onResult,
  onSelect,
}: {
  nearby: NearbyResult | null;
  onResult: (result: NearbyResult | null) => void;
  onSelect: (node: VibeNode) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [vibe, setVibe] = useState("");
  const [radiusMi, setRadiusMi] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || loading) return;
    run({ query });
  }

  function useMyLocation() {
    if (loading) return;
    if (!("geolocation" in navigator)) {
      setError("Your browser doesn't support location");
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => run({ coords: { lat: pos.coords.latitude, lng: pos.coords.longitude } }),
      (err) => {
        setLoading(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location is blocked — allow it in your browser, or type where you are"
            : "Couldn't get your location — try typing it instead",
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  async function run(where: { query: string } | { coords: { lat: number; lng: number } }) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/near", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...where, radiusMi, vibe, persona: getPersona() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      onResult({ ...data, radiusMi });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="absolute bottom-6 left-4 z-10 flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-muted shadow-sm backdrop-blur hover:text-fg sm:left-6"
      >
        <LocateFixed size={13} /> {nearby ? `Near ${nearby.origin.name}` : "Near…"}
      </button>
    );
  }

  return (
    <div className="absolute bottom-6 left-4 z-10 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-3 shadow-lg backdrop-blur-xl sm:left-6">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-medium">
          <LocateFixed size={13} /> What&rsquo;s near me?
        </p>
        <button onClick={() => setOpen(false)} aria-label="Collapse" className="text-muted hover:text-fg">
          <X size={14} />
        </button>
      </div>

      <form onSubmit={search} className="space-y-2">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={loading}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-line py-1.5 text-xs font-medium text-accent hover:bg-fg/5 disabled:opacity-40"
        >
          <Navigation size={13} /> Use my location
        </button>
        <p className="text-center text-[10px] text-subtle">or type where you are</p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Where are you? e.g. Equinox River Oaks"
          className="w-full rounded-lg border border-line bg-fg/5 px-2.5 py-1.5 text-sm text-fg outline-none placeholder:text-muted focus:border-line-strong"
        />
        <input
          value={vibe}
          onChange={(e) => setVibe(e.target.value)}
          placeholder="Looking for… (optional) e.g. quiet spot to study"
          className="w-full rounded-lg border border-line bg-fg/5 px-2.5 py-1.5 text-sm text-fg outline-none placeholder:text-muted focus:border-line-strong"
        />
        <div className="flex items-center gap-1">
          <span className="mr-1 text-[11px] text-muted">Within</span>
          {DISTANCES.map((d) => (
            <button
              type="button"
              key={d}
              onClick={() => setRadiusMi(d)}
              className={`rounded-md px-2 py-0.5 text-[11px] ${
                radiusMi === d ? "bg-invert text-invert-fg" : "text-muted hover:bg-fg/10"
              }`}
            >
              {d} mi
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-invert py-1.5 text-xs font-medium text-invert-fg disabled:opacity-40"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : null} Find spots
        </button>
      </form>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      {nearby && !error && (
        <div className="mt-3 border-t border-line pt-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] text-muted">
              📍 <span className="text-fg">{nearby.origin.name}</span> · {nearby.radiusMi} mi
              <br />
              {nearby.origin.address}
            </p>
            <button
              onClick={() => onResult(null)}
              className="shrink-0 text-[11px] text-muted underline-offset-2 hover:text-fg hover:underline"
            >
              Clear
            </button>
          </div>

          {nearby.pick && (
            <p className="mt-2 flex gap-1.5 rounded-lg bg-fg/5 p-2 text-xs text-fg">
              <Sparkles size={12} className="mt-0.5 shrink-0 text-accent" /> {nearby.pick}
            </p>
          )}

          {nearby.results.length === 0 && nearby.others.length === 0 ? (
            <p className="mt-2 text-xs text-muted">Nothing within {nearby.radiusMi} mi — try a bigger radius.</p>
          ) : nearby.results.length === 0 ? (
            <p className="mt-2 text-[11px] text-muted">No vetted spots in range yet.</p>
          ) : (
            <ul className="mt-2 max-h-40 space-y-0.5 overflow-y-auto">
              {nearby.results.map((r, i) => {
                const n = nearby.resultSpots[i];
                return (
                  <li key={r.id}>
                    <button
                      onClick={() => onSelect(n)}
                      className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs hover:bg-fg/5"
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: n.color }} />
                      <span className="flex-1 truncate text-fg">{n.name}</span>
                      <span className="text-muted">{r.miles.toFixed(1)} mi</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {nearby.others.length > 0 && (
            <>
              <p className="mt-2 text-[10px] uppercase tracking-wider text-subtle">
                Also nearby · from Google, not vetted
              </p>
              <ul className="mt-1 max-h-32 space-y-0.5 overflow-y-auto">
                {nearby.others.map(({ node: n, miles }) => (
                  <li key={n.id}>
                    <button
                      onClick={() => onSelect(n)}
                      className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs hover:bg-fg/5"
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full border border-white bg-slate-400" />
                      <span className="flex-1 truncate text-fg/80">{n.name}</span>
                      {n.rating != null && <span className="text-subtle">★ {n.rating.toFixed(1)}</span>}
                      <span className="text-muted">{miles.toFixed(1)} mi</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
