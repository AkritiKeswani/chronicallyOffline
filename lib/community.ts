"use client";

export { COMMUNITY_PREFIX } from "@/lib/community-shared";

import { useEffect, useState, useSyncExternalStore } from "react";
import { submissionToNode } from "@/lib/community-shared";
import { NODES, type VibeNode } from "@/lib/nodes";
import {
  getSupabase,
  PULSE_WINDOW_MS,
  type Checkin,
  type Presence,
  type Pulse,
  type PulseKind,
  type SpotEvent,
  type SpotStats,
  type SpotSubmission,
} from "@/lib/supabase";

export type Community = {
  ready: boolean;
  version: number;
  stats: Record<string, SpotStats>;
  /** Live pulse counts per spot, e.g. { agora: { loud: 3 } } */
  pulses: Record<string, Partial<Record<PulseKind, number>>>;
  here: Record<string, number>;
  eventsToday: Record<string, SpotEvent[]>;
  /** Approved "Drop a spot" submissions, as map nodes. */
  spots: VibeNode[];
};

const EMPTY: Community = {
  ready: false,
  version: 0,
  stats: {},
  pulses: {},
  here: {},
  eventsToday: {},
  spots: [],
};

let state = EMPTY;
let started = false;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

async function load() {
  const supabase = getSupabase();
  if (!supabase) return;

  const since = new Date(Date.now() - PULSE_WINDOW_MS).toISOString();
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const [stats, pulses, here, events, spots] = await Promise.all([
    supabase.from("spot_stats").select("*"),
    supabase.from("pulses").select("spot_id, kind").gte("created_at", since),
    supabase.rpc("presence_counts"),
    supabase
      .from("events")
      .select("*")
      .eq("status", "approved")
      .gte("starts_at", dayStart.toISOString())
      .lt("starts_at", dayEnd.toISOString()),
    supabase.from("spot_submissions").select("*").eq("status", "approved"),
  ]);

  const next: Community = { ...EMPTY, ready: true, version: state.version + 1 };
  for (const s of (stats.data ?? []) as SpotStats[]) next.stats[s.spot_id] = s;
  for (const p of (pulses.data ?? []) as Pick<Pulse, "spot_id" | "kind">[]) {
    const counts = (next.pulses[p.spot_id] ??= {});
    counts[p.kind] = (counts[p.kind] ?? 0) + 1;
  }
  for (const h of (here.data ?? []) as { spot_id: string; n: number }[]) next.here[h.spot_id] = Number(h.n);
  for (const e of (events.data ?? []) as SpotEvent[]) (next.eventsToday[e.spot_id] ??= []).push(e);
  next.spots = ((spots.data ?? []) as SpotSubmission[]).map(submissionToNode);

  state = next;
  listeners.forEach((l) => l());
}

/** Debounced reload; called on realtime changes and after our own writes. */
export function refreshCommunity() {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(load, 400);
}

function start() {
  if (started) return;
  started = true;
  const supabase = getSupabase();
  if (!supabase) return;

  load();
  const channel = supabase.channel("community");
  for (const table of ["checkins", "pulses", "presence", "events", "spot_submissions"]) {
    channel.on("postgres_changes", { event: "*", schema: "public", table }, refreshCommunity);
  }
  channel.subscribe();
  // Presence rows of people who hid their name don't stream to others, and
  // pulses age out, so also refresh on a timer.
  setInterval(refreshCommunity, 60_000);
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCommunity() {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY);
}

/** Hand-picked spots plus approved community submissions. */
export function useAllSpots() {
  const { spots } = useCommunity();
  const [all, setAll] = useState<{ from: VibeNode[]; value: VibeNode[] }>({ from: [], value: NODES });
  if (all.from !== spots) {
    const seen = new Set(NODES.map((n) => n.placeId));
    setAll({ from: spots, value: [...NODES, ...spots.filter((s) => !seen.has(s.placeId))] });
  }
  return all.value;
}

export function findCommunitySpot(id: string) {
  return state.spots.find((s) => s.id === id);
}

// --- Per-spot feed (drawer) ------------------------------------------------

export type SpotFeed = {
  checkins: Checkin[];
  presence: Presence[];
  myPresence: Presence | null;
  pendingEvents: SpotEvent[];
};

export function useSpotFeed(spotId: string, userId: string | null) {
  const { version } = useCommunity();
  const [feed, setFeed] = useState<SpotFeed | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let cancelled = false;

    (async () => {
      const [checkins, presence, mine] = await Promise.all([
        supabase
          .from("checkins")
          .select("*, profiles(display_name, handle)")
          .eq("spot_id", spotId)
          .order("created_at", { ascending: false })
          .limit(15),
        supabase
          .from("presence")
          .select("*, profiles(display_name, handle)")
          .eq("spot_id", spotId)
          .gt("expires_at", new Date().toISOString()),
        userId
          ? supabase.from("events").select("*").eq("spot_id", spotId).eq("status", "pending")
          : Promise.resolve({ data: [] }),
      ]);
      if (cancelled) return;
      const people = (presence.data ?? []) as Presence[];
      setFeed({
        checkins: (checkins.data ?? []) as Checkin[],
        presence: people.filter((p) => p.user_id !== userId),
        myPresence: people.find((p) => p.user_id === userId) ?? null,
        pendingEvents: (mine.data ?? []) as SpotEvent[],
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [spotId, userId, version]);

  return feed;
}

// --- Writes ------------------------------------------------------------------

function client() {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Community features aren't set up");
  return supabase;
}

function friendly(error: { message: string } | null) {
  if (!error) return;
  throw new Error(error.message.replace(/^.*?: /, ""));
}

export async function sendPulse(spotId: string, kind: PulseKind) {
  friendly((await client().from("pulses").insert({ spot_id: spotId, kind })).error);
  refreshCommunity();
}

export async function submitCheckin(
  spotId: string,
  checkin: Pick<Checkin, "wifi" | "outlets" | "noise" | "parking" | "note">,
) {
  friendly((await client().from("checkins").insert({ spot_id: spotId, ...checkin })).error);
  refreshCommunity();
}

export async function setHere(
  spotId: string,
  presence: Pick<Presence, "status" | "open_to_chat" | "show_name">,
) {
  friendly((await client().from("presence").insert({ spot_id: spotId, ...presence })).error);
  refreshCommunity();
}

export async function leaveHere(userId: string) {
  friendly((await client().from("presence").delete().eq("user_id", userId)).error);
  refreshCommunity();
}

export async function submitEvent(
  spotId: string,
  event: Pick<SpotEvent, "title" | "url" | "starts_at" | "ends_at">,
) {
  friendly((await client().from("events").insert({ spot_id: spotId, ...event })).error);
  refreshCommunity();
}
