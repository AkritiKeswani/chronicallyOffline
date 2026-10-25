"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import type { City } from "@/lib/cities";
import { useCommunity } from "@/lib/community";
import { getSupabase, type LeaderRow } from "@/lib/supabase";

export default function LeaderboardPage({
  city,
  onOpenProfile,
}: {
  city: City;
  onOpenProfile: (userId: string) => void;
}) {
  const auth = useAuth();
  const { version } = useCommunity();
  const [rows, setRows] = useState<LeaderRow[] | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let cancelled = false;
    supabase
      .from("leaderboard")
      .select("*")
      .eq("city", city.id)
      .order("score", { ascending: false })
      .limit(50)
      .then(({ data }) => !cancelled && setRows((data ?? []) as LeaderRow[]));
    return () => {
      cancelled = true;
    };
  }, [city.id, version]);

  return (
    <div className="mx-auto max-w-3xl px-6 pb-24 pt-32 sm:px-10">
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-sky-500">{city.name}</p>
      <h2 className="mt-2 font-serif text-5xl tracking-tight sm:text-6xl">Leaderboard</h2>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-subtle">
        Review +3 · Note +1 · Pulse +1
      </p>

      <ol className="mt-10 border-t border-line">
        {rows?.map((r, i) => (
          <li key={r.id} className="border-b border-line">
            <button
              onClick={() => onOpenProfile(r.id)}
              className={`flex w-full items-center gap-5 py-4 text-left transition hover:bg-fg/5 ${
                r.id === auth.user?.id ? "bg-sky-500/5" : ""
              }`}
            >
              <span className="w-8 text-right font-serif text-2xl text-muted">{i + 1}</span>
              <span className="flex-1">
                <span className="block text-base font-medium text-fg">@{r.handle}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                  {r.reviews} reviews · {r.notes} notes · {r.pulses} pulses
                </span>
              </span>
              <span className="font-serif text-3xl text-sky-500">{r.score}</span>
            </button>
          </li>
        ))}
      </ol>
      {rows && rows.length === 0 && (
        <p className="mt-6 text-sm text-muted">
          Nobody&rsquo;s on the board in {city.name} yet — rate a spot to take #1.
        </p>
      )}
    </div>
  );
}
