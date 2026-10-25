"use client";

import { useEffect, useState } from "react";
import { signInWithGoogle, useAuth } from "@/lib/auth";
import { CITIES } from "@/lib/cities";
import { useCommunity } from "@/lib/community";
import { getSupabase, type Checkin, type LeaderRow } from "@/lib/supabase";

type Data = {
  row: LeaderRow | null;
  rank: number | null;
  reviews: Checkin[];
};

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-line p-5 sm:border-l sm:first:border-l-0">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">{label}</p>
      <div className="mt-3 font-serif text-3xl leading-none text-fg">{children}</div>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** A user's profile: stats + recent reviews. Shows your own when `userId` is omitted. */
export default function ProfilePage({ userId }: { userId?: string }) {
  const auth = useAuth();
  const { version } = useCommunity();
  const id = userId ?? auth.user?.id ?? null;
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !id) return;
    let cancelled = false;
    (async () => {
      const [row, reviews] = await Promise.all([
        supabase.from("leaderboard").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("checkins")
          .select("*")
          .eq("user_id", id)
          .order("created_at", { ascending: false })
          .limit(30),
      ]);
      const me = (row.data ?? null) as LeaderRow | null;
      let rank: number | null = null;
      if (me?.city) {
        const { count } = await supabase
          .from("leaderboard")
          .select("id", { count: "exact", head: true })
          .eq("city", me.city)
          .gt("score", me.score);
        rank = (count ?? 0) + 1;
      }
      if (!cancelled) setData({ row: me, rank, reviews: (reviews.data ?? []) as Checkin[] });
    })();
    return () => {
      cancelled = true;
    };
  }, [id, version]);

  if (!userId && !auth.user) {
    return (
      <div className="mx-auto max-w-xl px-6 pt-40 text-center">
        <h2 className="font-serif text-4xl">Your profile</h2>
        <p className="mt-3 text-sm text-muted">
          Sign in to rate spots, leave notes and climb your city&rsquo;s leaderboard.
        </p>
        <button
          onClick={signInWithGoogle}
          className="mt-6 rounded-md bg-invert px-5 py-2.5 text-sm font-medium text-invert-fg"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  const row = data?.row;
  const name = row?.display_name ?? (userId ? null : auth.name) ?? row?.handle ?? "";
  const rated = (data?.reviews ?? []).filter((r) => r.overall != null);
  const top = rated.reduce<Checkin | null>((best, r) => (!best || r.overall! > best.overall! ? r : best), null);

  return (
    <div className="mx-auto max-w-5xl px-6 pb-24 pt-32 sm:px-10">
      <header className="flex items-end gap-6">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-md border border-line bg-fg/5 font-serif text-4xl text-fg/70 sm:h-28 sm:w-28">
          {(name || "?").slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h2 className="font-serif text-5xl leading-none tracking-tight sm:text-7xl">{name}</h2>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.25em] text-muted">
            {row?.handle && `@${row.handle}`}
            {row?.city && ` · ${CITIES[row.city].name}`}
          </p>
        </div>
      </header>

      <section className="mt-10 grid grid-cols-2 border-y border-line sm:grid-cols-4">
        <Stat label="Reviews">{row?.reviews ?? 0}</Stat>
        <Stat label="Activity score">
          <span className="text-sky-500">{row?.score ?? 0}</span>
        </Stat>
        <Stat label="Top rated">
          {top ? (
            <span className="text-2xl">
              {top.spot_name ?? "A spot"} <span className="text-sky-500">{top.overall}</span>
            </span>
          ) : (
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-subtle">None yet</span>
          )}
        </Stat>
        <Stat label={row?.city ? `Rank in ${CITIES[row.city].short}` : "Rank"}>
          {data?.rank ? `#${data.rank}` : "–"}
        </Stat>
      </section>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-subtle">
        Review +3 · Note +1 · Pulse +1
      </p>

      <h3 className="mt-14 font-serif text-3xl">Recent reviews</h3>
      {data && data.reviews.length === 0 && (
        <p className="mt-4 text-sm text-muted">No reviews yet — open any spot on the map and rate it.</p>
      )}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(data?.reviews ?? []).map((r) => (
          <article key={r.id} className="rounded-md border border-line bg-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <h4 className="font-serif text-xl leading-tight">{r.spot_name ?? "A spot"}</h4>
              {r.overall != null && <span className="font-serif text-xl text-sky-500">{r.overall}</span>}
            </div>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
              {[r.spot_area, formatDate(r.created_at)].filter(Boolean).join(" · ")}
            </p>
            {r.note && <p className="mt-3 text-sm text-fg/80">&ldquo;{r.note}&rdquo;</p>}
          </article>
        ))}
      </div>
    </div>
  );
}
