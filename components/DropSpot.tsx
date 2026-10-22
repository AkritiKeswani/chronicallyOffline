"use client";

import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { accessToken, signInWithGoogle, useAuth } from "@/lib/auth";
import type { SpotSubmission } from "@/lib/supabase";

export default function DropSpot() {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [take, setTake] = useState("");
  const [credit, setCredit] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ submission: SpotSubmission; warning: string | null } | null>(null);

  if (!auth.configured || !auth.ready) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/submit-spot", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken()}` },
        body: JSON.stringify({
          query,
          take,
          credit: credit.trim() || (auth.profile?.handle ? `@${auth.profile.handle}` : ""),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't submit");
      setDone(data);
      setQuery("");
      setTake("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't submit");
    } finally {
      setLoading(false);
    }
  }

  const input =
    "w-full rounded-lg border border-line bg-fg/5 px-2.5 py-2 text-sm text-fg outline-none placeholder:text-muted focus:border-line-strong";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs text-fg shadow-sm backdrop-blur hover:bg-solid"
      >
        <Plus size={14} /> Drop a spot
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md space-y-3 rounded-2xl border border-line bg-solid p-5 text-fg shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Drop a spot</h2>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-muted hover:text-fg">
                <X size={16} />
              </button>
            </div>

            {!auth.user ? (
              <button
                onClick={signInWithGoogle}
                className="w-full rounded-lg bg-invert py-2 text-sm font-medium text-invert-fg"
              >
                Sign in with Google to add spots
              </button>
            ) : done ? (
              <div className="space-y-2 text-sm">
                <p>
                  <b>{done.submission.name}</b> is submitted and waiting for review.
                </p>
                {done.submission.demographic && (
                  <p className="rounded-lg bg-fg/5 p-3 text-xs">
                    <span className="font-medium">{done.submission.demographic}</span>
                    <br />
                    {done.submission.crowd}
                  </p>
                )}
                {done.warning && <p className="text-xs text-amber-500">{done.warning}</p>}
                <button onClick={() => setDone(null)} className="text-xs text-accent hover:underline">
                  Drop another
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Spot name + area, e.g. Black Hole Coffee Montrose"
                  className={input}
                />
                <textarea
                  value={take}
                  onChange={(e) => setTake(e.target.value.slice(0, 500))}
                  rows={3}
                  placeholder="Who's the crowd? e.g. 23–28 grad students and writers, grungy, impossible to find an outlet after 11am"
                  className={input}
                />
                <input
                  value={credit}
                  onChange={(e) => setCredit(e.target.value.slice(0, 40))}
                  placeholder={auth.profile?.handle ? `Credit: @${auth.profile.handle}` : "Credit (optional), e.g. @sarah"}
                  className={input}
                />
                <p className="text-[11px] text-muted">
                  We find the exact location on Google Maps and draft the profile from your take. It shows up
                  once it&rsquo;s reviewed.
                </p>
                {error && <p className="text-xs text-red-500">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || !query.trim() || take.trim().length < 10}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-invert py-2 text-sm font-medium text-invert-fg disabled:opacity-40"
                >
                  {loading && <Loader2 size={14} className="animate-spin" />} Submit spot
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
