"use client";

import { useState, useSyncExternalStore } from "react";
import { ChevronDown, Loader2, LocateFixed, Navigation, Search, Sparkles, X } from "lucide-react";
import type { MatchResponse } from "@/app/api/match/route";
import { getPersona } from "@/lib/auth";
import type { VibeNode } from "@/lib/nodes";

const DISTANCES = [1, 3, 5, 10, 25];
const WELCOME_KEY = "houston-vibes:welcome-dismissed";

const welcomeListeners = new Set<() => void>();
function readWelcomeDismissed() {
  try {
    return localStorage.getItem(WELCOME_KEY) === "1";
  } catch {
    return false;
  }
}

export default function MatchBar({
  match,
  onMatch,
  onSelect,
}: {
  match: MatchResponse | null;
  onMatch: (match: MatchResponse | null) => void;
  onSelect: (node: VibeNode) => void;
}) {
  const [need, setNeed] = useState("");
  const [whereOpen, setWhereOpen] = useState(false);
  const [place, setPlace] = useState("");
  const [useMe, setUseMe] = useState(false);
  const [radiusMi, setRadiusMi] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultsOpen, setResultsOpen] = useState(true);
  const welcomeDismissed = useSyncExternalStore(
    (l) => {
      welcomeListeners.add(l);
      return () => welcomeListeners.delete(l);
    },
    readWelcomeDismissed,
    () => true,
  );

  function dismissWelcome() {
    try {
      localStorage.setItem(WELCOME_KEY, "1");
    } catch {
      // Storage blocked — it'll just show again next visit.
    }
    welcomeListeners.forEach((l) => l());
  }

  const whereLabel = useMe ? "Near me" : place.trim() ? `Near ${place.trim()}` : "Anywhere in Houston";

  async function locate(): Promise<{ lat: number; lng: number }> {
    if (!("geolocation" in navigator)) throw new Error("Your browser doesn't support location");
    return new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) =>
          reject(
            new Error(
              err.code === err.PERMISSION_DENIED
                ? "Location is blocked — allow it in your browser, or type a place"
                : "Couldn't get your location — try typing a place",
            ),
          ),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
      ),
    );
  }

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    if (loading || (!need.trim() && !useMe && !place.trim())) return;
    setLoading(true);
    setError(null);
    try {
      const where = useMe ? { coords: await locate() } : place.trim() ? { query: place.trim() } : undefined;
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ need, where, radiusMi, persona: getPersona() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      onMatch(data);
      setResultsOpen(true);
      dismissWelcome();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  function clear() {
    onMatch(null);
    setError(null);
  }

  const all = match ? [...match.results.map((r) => r.spot), ...match.others.map((o) => o.spot)] : [];
  const byId = (id: string) => all.find((s) => s.id === id);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[5.5rem] z-10 flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-xl space-y-2">
        <form
          onSubmit={search}
          className="rounded-2xl border border-line bg-surface shadow-lg backdrop-blur-xl"
        >
          <div className="flex items-center gap-2 px-3 py-2">
            <Search size={16} className="shrink-0 text-muted" />
            <input
              value={need}
              onChange={(e) => setNeed(e.target.value)}
              placeholder="What do you need? e.g. quiet spot with outlets for Zoom calls"
              className="min-w-0 flex-1 bg-transparent py-1 text-sm text-fg outline-none placeholder:text-muted"
            />
            {match && (
              <button type="button" onClick={clear} aria-label="Clear search" className="text-muted hover:text-fg">
                <X size={15} />
              </button>
            )}
            <button
              type="submit"
              disabled={loading || (!need.trim() && !useMe && !place.trim())}
              className="flex items-center gap-1 rounded-lg bg-invert px-3 py-1.5 text-xs font-medium text-invert-fg disabled:opacity-40"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Match me
            </button>
          </div>

          <div className="border-t border-line px-3 py-1.5">
            <button
              type="button"
              onClick={() => setWhereOpen((o) => !o)}
              className="flex items-center gap-1 text-xs text-muted hover:text-fg"
            >
              <LocateFixed size={12} /> {whereLabel}
              {(useMe || place.trim()) && ` · ${radiusMi} mi`}
              <ChevronDown size={12} className={`transition ${whereOpen ? "rotate-180" : ""}`} />
            </button>

            {whereOpen && (
              <div className="space-y-2 pb-1.5 pt-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUseMe((v) => !v);
                      setPlace("");
                    }}
                    className={`flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs ${
                      useMe ? "border-invert bg-invert text-invert-fg" : "border-line text-accent hover:bg-fg/5"
                    }`}
                  >
                    <Navigation size={12} /> Use my location
                  </button>
                  <input
                    value={place}
                    onChange={(e) => {
                      setPlace(e.target.value);
                      setUseMe(false);
                    }}
                    placeholder="or a place, e.g. Equinox River Oaks"
                    className="min-w-0 flex-1 rounded-lg border border-line bg-fg/5 px-2.5 py-1.5 text-xs text-fg outline-none placeholder:text-muted focus:border-line-strong"
                  />
                </div>
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
                  {(useMe || place.trim()) && (
                    <button
                      type="button"
                      onClick={() => {
                        setUseMe(false);
                        setPlace("");
                      }}
                      className="ml-auto text-[11px] text-muted hover:text-fg"
                    >
                      Anywhere
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </form>

        {error && (
          <p className="rounded-xl border border-red-500/40 bg-solid px-3 py-2 text-xs text-red-500 shadow">{error}</p>
        )}

        {!welcomeDismissed && !match && (
          <div className="rounded-2xl border border-line bg-surface p-4 text-sm shadow-lg backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-fg">Find a spot in Houston to work from.</p>
              <button onClick={dismissWelcome} aria-label="Dismiss" className="text-muted hover:text-fg">
                <X size={15} />
              </button>
            </div>
            <ul className="mt-2 space-y-1.5 text-xs text-fg/80">
              <li>✨ Say what you need above and we&rsquo;ll pick your best 2 spots.</li>
              <li>
                <span className="font-medium text-fg">Glowing</span> spots are hand-picked, with crowd profiles.{" "}
                <span className="font-medium text-fg">Gray</span> ones are other cafes and libraries from Google.
              </li>
              <li>☕ Tap any spot to see Wi-Fi, outlets and who&rsquo;s there right now, and chat with it.</li>
              <li>🙋 Sign in to report what it&rsquo;s like — the next person sees it.</li>
            </ul>
            <button
              onClick={dismissWelcome}
              className="mt-3 rounded-lg bg-invert px-3 py-1.5 text-xs font-medium text-invert-fg"
            >
              Got it
            </button>
          </div>
        )}

        {match && (
          <div className="rounded-2xl border border-line bg-surface shadow-lg backdrop-blur-xl">
            <button
              onClick={() => setResultsOpen((o) => !o)}
              className="flex w-full items-center justify-between px-4 py-2 text-xs text-muted"
            >
              <span>
                {match.picks.length > 0 ? `Top ${match.picks.length === 1 ? "pick" : "picks"} for you` : "Results"}
                {match.origin && ` · within ${match.radiusMi} mi of ${match.origin.name}`}
              </span>
              <ChevronDown size={13} className={`transition ${resultsOpen ? "rotate-180" : ""}`} />
            </button>

            {resultsOpen && (
              <div className="space-y-2 px-3 pb-3">
                {match.picks.map((p, i) => {
                  const s = byId(p.id);
                  if (!s) return null;
                  return (
                    <button
                      key={p.id}
                      onClick={() => onSelect(s)}
                      className="flex w-full gap-3 rounded-xl border border-line p-3 text-left hover:bg-fg/5"
                    >
                      <span
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-black"
                        style={{ background: s.color, boxShadow: `0 0 10px ${s.color}` }}
                      >
                        {i + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-fg">
                          {s.name}
                          {!s.vetted && <span className="ml-1.5 text-[10px] font-normal text-muted">not vetted</span>}
                        </span>
                        <span className="block text-xs text-fg/80">{p.why}</span>
                      </span>
                    </button>
                  );
                })}

                {match.picks.length === 0 && match.results.length + match.others.length === 0 && (
                  <p className="px-1 text-xs text-muted">Nothing in range — try a bigger distance.</p>
                )}
                {match.picks.length === 0 && match.results.length + match.others.length > 0 && (
                  <p className="px-1 text-xs text-muted">
                    {match.results.length} hand-picked and {match.others.length} Google spots in range — they&rsquo;re
                    highlighted on the map. Add what you need to get top picks.
                  </p>
                )}
                {match.picks.length > 0 && (
                  <p className="px-1 text-[11px] text-subtle">
                    Other spots are dimmed on the map. Tap a pick to open it.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
