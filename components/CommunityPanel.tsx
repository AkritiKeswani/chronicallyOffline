"use client";

import { useState } from "react";
import { CalendarPlus, Loader2, LogIn, Wifi } from "lucide-react";
import { signInWithGoogle, useAuth } from "@/lib/auth";
import {
  leaveHere,
  sendPulse,
  setHere,
  submitCheckin,
  submitEvent,
  useCommunity,
  useSpotFeed,
} from "@/lib/community";
import type { VibeNode } from "@/lib/nodes";
import { PULSE_KINDS, type Checkin, type PulseKind } from "@/lib/supabase";

const OUTLETS = { everywhere: "Outlets everywhere", limited: "Limited outlets", scarce: "Outlets scarce" };
const NOISE = { quiet: "Quiet", buzz: "Ambient buzz", loud: "Loud" };
const PARKING = { easy: "Easy parking", street: "Street parking", paid: "Paid parking" };

function ago(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 48 * 60) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

/** Compact Workability Index + live pulses, shown above the drawer tabs. */
export function WorkabilitySummary({ spotId }: { spotId: string }) {
  const { stats, pulses } = useCommunity();
  const s = stats[spotId];
  const live = Object.entries(pulses[spotId] ?? {}) as [PulseKind, number][];

  return (
    <div className="space-y-1.5 text-xs">
      {s ? (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-fg">
          {s.wifi_avg != null && (
            <span className="flex items-center gap-1">
              <Wifi size={12} /> {s.wifi_avg}/5
            </span>
          )}
          {s.outlets && <span>🔌 {OUTLETS[s.outlets]}</span>}
          {s.noise && <span>🔊 {NOISE[s.noise]}</span>}
          {s.parking && <span>🚗 {PARKING[s.parking]}</span>}
          <span className="text-muted">
            · {s.checkins} check-in{s.checkins === 1 ? "" : "s"} · last {ago(s.last_at)}
          </span>
        </p>
      ) : (
        <p className="text-muted">No check-ins yet — Wi-Fi, outlets and noise come from people who go here.</p>
      )}
      {live.length > 0 && (
        <p className="flex flex-wrap gap-1.5">
          {live.map(([kind, n]) => (
            <span key={kind} className="rounded-full bg-fg/10 px-2 py-0.5 text-[11px] text-fg">
              {PULSE_KINDS[kind].emoji} {PULSE_KINDS[kind].label}
              {n > 1 && ` ×${n}`}
            </span>
          ))}
          <span className="self-center text-[10px] text-subtle">last 3h</span>
        </p>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted">{title}</h3>
      {children}
    </section>
  );
}

function Choice<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Record<T, string>;
  value: T | null;
  onChange: (v: T | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {(Object.entries(options) as [T, string][]).map(([k, label]) => (
        <button
          type="button"
          key={k}
          onClick={() => onChange(value === k ? null : k)}
          className={`rounded-md border px-2 py-1 text-[11px] ${
            value === k ? "border-invert bg-invert text-invert-fg" : "border-line text-fg/80 hover:bg-fg/5"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-line bg-fg/5 px-2.5 py-1.5 text-sm text-fg outline-none placeholder:text-muted focus:border-line-strong";

export default function CommunityPanel({ node }: { node: VibeNode }) {
  const auth = useAuth();
  const { pulses } = useCommunity();
  const feed = useSpotFeed(node.id, auth.user?.id ?? null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // I'm here
  const [status, setStatus] = useState("");
  const [openToChat, setOpenToChat] = useState(false);
  const [showName, setShowName] = useState(false);

  // Check-in
  const [wifi, setWifi] = useState<number | null>(null);
  const [outlets, setOutlets] = useState<Checkin["outlets"]>(null);
  const [noise, setNoise] = useState<Checkin["noise"]>(null);
  const [parking, setParking] = useState<Checkin["parking"]>(null);
  const [note, setNote] = useState("");

  // Event
  const [eventOpen, setEventOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [url, setUrl] = useState("");

  async function run(key: string, action: () => Promise<void>, success: string) {
    setBusy(key);
    setMessage(null);
    try {
      await action();
      setMessage({ ok: true, text: success });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setBusy(null);
    }
  }

  const signedIn = Boolean(auth.user);
  const canCheckIn = wifi != null || outlets || noise || parking || note.trim();

  return (
    <div className="space-y-6 text-sm">
      {!signedIn && (
        <button
          onClick={signInWithGoogle}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-invert py-2 text-xs font-medium text-invert-fg"
        >
          <LogIn size={14} /> Sign in with Google to check in, send pulses or say you&rsquo;re here
        </button>
      )}

      {message && (
        <p className={`rounded-lg px-3 py-2 text-xs ${message.ok ? "bg-emerald-500/15 text-fg" : "bg-red-500/15 text-red-500"}`}>
          {message.text}
        </p>
      )}

      <Section title="Right now — tap what you see">
        <div className="flex flex-wrap gap-1.5">
          {(Object.entries(PULSE_KINDS) as [PulseKind, (typeof PULSE_KINDS)[PulseKind]][]).map(([kind, p]) => (
            <button
              key={kind}
              disabled={!signedIn || busy !== null}
              onClick={() => run(`pulse-${kind}`, () => sendPulse(node.id, kind), `Thanks — "${p.label}" is live for 3 hours`)}
              className="rounded-full border border-line px-2.5 py-1 text-xs text-fg hover:bg-fg/5 disabled:opacity-50"
            >
              {p.emoji} {p.label}
              {pulses[node.id]?.[kind] ? <span className="ml-1 text-muted">{pulses[node.id]![kind]}</span> : null}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Who's working here">
        {feed?.presence.length ? (
          <ul className="space-y-1">
            {feed.presence.map((p) => (
              <li key={p.id} className="text-xs text-fg">
                <b>{p.profiles?.handle ? `@${p.profiles.handle}` : (p.profiles?.display_name ?? "Someone")}</b>
                {p.status && <span className="text-fg/80"> · {p.status}</span>}
                {p.open_to_chat && <span className="text-accent"> · 👋 open to say hi</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted">
            {signedIn ? "Nobody's shared their name here right now." : "Sign in to see who's sharing."}
          </p>
        )}

        {signedIn &&
          (feed?.myPresence ? (
            <div className="flex items-center justify-between rounded-lg bg-fg/5 px-3 py-2 text-xs">
              <span>
                You&rsquo;re here{feed.myPresence.status && ` · ${feed.myPresence.status}`} · until{" "}
                {new Date(feed.myPresence.expires_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </span>
              <button
                onClick={() => run("leave", () => leaveHere(auth.user!.id), "You've checked out")}
                className="text-muted underline-offset-2 hover:text-fg hover:underline"
              >
                Leave
              </button>
            </div>
          ) : (
            <div className="space-y-2 rounded-lg border border-line p-3">
              <input
                value={status}
                onChange={(e) => setStatus(e.target.value.slice(0, 80))}
                placeholder="What are you up to? e.g. Shipping a feature in Cursor"
                className={inputClass}
              />
              <label className="flex items-center gap-2 text-xs text-fg/80">
                <input type="checkbox" checked={openToChat} onChange={(e) => setOpenToChat(e.target.checked)} />
                Open to say hi
              </label>
              <label className="flex items-center gap-2 text-xs text-fg/80">
                <input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} />
                Show my name to signed-in users (otherwise you&rsquo;re just counted)
              </label>
              <button
                disabled={busy !== null}
                onClick={() =>
                  run(
                    "here",
                    () => setHere(node.id, { status: status.trim() || null, open_to_chat: openToChat, show_name: showName }),
                    "You're on the map here for the next 3 hours",
                  )
                }
                className="w-full rounded-lg bg-invert py-1.5 text-xs font-medium text-invert-fg disabled:opacity-50"
              >
                {busy === "here" ? <Loader2 size={13} className="mx-auto animate-spin" /> : "I'm working here now"}
              </button>
              <p className="text-[10px] text-subtle">Auto-expires after 3 hours. One spot at a time.</p>
            </div>
          ))}
      </Section>

      {signedIn && (
        <Section title="Rate this spot">
          <div className="space-y-2 rounded-lg border border-line p-3">
            <div className="flex items-center gap-1">
              <span className="mr-1 text-[11px] text-muted">Wi-Fi</span>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setWifi(wifi === n ? null : n)}
                  className={`h-6 w-6 rounded-md border text-[11px] ${
                    wifi != null && n <= wifi ? "border-invert bg-invert text-invert-fg" : "border-line text-fg/80"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <Choice options={OUTLETS} value={outlets} onChange={setOutlets} />
            <Choice options={NOISE} value={noise} onChange={setNoise} />
            <Choice options={PARKING} value={parking} onChange={setParking} />
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 280))}
              rows={2}
              placeholder="Vibe note, e.g. “NOT quiet — don't take Zoom calls here”"
              className={inputClass}
            />
            <button
              disabled={!canCheckIn || busy !== null}
              onClick={() =>
                run(
                  "checkin",
                  async () => {
                    await submitCheckin(node.id, { wifi, outlets, noise, parking, note: note.trim() || null });
                    setWifi(null);
                    setOutlets(null);
                    setNoise(null);
                    setParking(null);
                    setNote("");
                  },
                  "Check-in saved — the next person (and this spot's chat) will see it",
                )
              }
              className="w-full rounded-lg bg-invert py-1.5 text-xs font-medium text-invert-fg disabled:opacity-40"
            >
              {busy === "checkin" ? <Loader2 size={13} className="mx-auto animate-spin" /> : "Post check-in"}
            </button>
          </div>
        </Section>
      )}

      <Section title="Recent check-ins">
        {feed?.checkins.length ? (
          <ul className="space-y-2.5">
            {feed.checkins.map((c) => (
              <li key={c.id} className="text-xs">
                <p className="text-muted">
                  <b className="text-fg">{c.profiles?.handle ? `@${c.profiles.handle}` : (c.profiles?.display_name ?? "Someone")}</b> ·{" "}
                  {ago(c.created_at)}
                </p>
                <p className="mt-0.5 text-fg/80">
                  {[
                    c.wifi != null && `📶 ${c.wifi}/5`,
                    c.outlets && `🔌 ${OUTLETS[c.outlets]}`,
                    c.noise && `🔊 ${NOISE[c.noise]}`,
                    c.parking && `🚗 ${PARKING[c.parking]}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {c.note && <p className="mt-0.5 text-fg">&ldquo;{c.note}&rdquo;</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted">{feed ? "No check-ins yet." : "Loading…"}</p>
        )}
      </Section>

      {signedIn && (
        <Section title="Events">
          {feed?.pendingEvents.map((e) => (
            <p key={e.id} className="text-xs text-muted">
              ⏳ {e.title} — waiting for approval
            </p>
          ))}
          {eventOpen ? (
            <div className="space-y-2 rounded-lg border border-line p-3">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Founder co-working night" className={inputClass} />
              <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputClass} />
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://lu.ma/… (optional)" className={inputClass} />
              <button
                disabled={title.trim().length < 3 || !startsAt || busy !== null}
                onClick={() =>
                  run(
                    "event",
                    async () => {
                      await submitEvent(node.id, {
                        title: title.trim(),
                        url: url.trim() || null,
                        starts_at: new Date(startsAt).toISOString(),
                        ends_at: null,
                      });
                      setTitle("");
                      setStartsAt("");
                      setUrl("");
                      setEventOpen(false);
                    },
                    "Event submitted — it shows on the map once approved",
                  )
                }
                className="w-full rounded-lg bg-invert py-1.5 text-xs font-medium text-invert-fg disabled:opacity-40"
              >
                Submit event
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEventOpen(true)}
              className="flex items-center gap-1.5 text-xs text-accent hover:underline"
            >
              <CalendarPlus size={13} /> Add an event here
            </button>
          )}
        </Section>
      )}
    </div>
  );
}
