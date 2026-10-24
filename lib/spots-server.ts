import "server-only";

import type { City, CityId } from "@/lib/cities";
import { spotFromRow, type SpotRow, type VibeNode } from "@/lib/nodes";
import {
  PULSE_KINDS,
  PULSE_WINDOW_MS,
  serverSupabase,
  type Checkin,
  type PulseKind,
  type SpotEvent,
} from "@/lib/supabase";

let vettedCache: { at: number; spots: VibeNode[] } | null = null;

/** Admin-vetted spots (all cities, or one), cached for a minute. */
export async function getVettedSpots(city?: CityId): Promise<VibeNode[]> {
  if (!vettedCache || Date.now() - vettedCache.at > 60_000) {
    const supabase = serverSupabase();
    const { data } = supabase ? await supabase.from("spots").select("*") : { data: [] };
    vettedCache = { at: Date.now(), spots: ((data ?? []) as SpotRow[]).map(spotFromRow) };
  }
  return city ? vettedCache.spots.filter((s) => s.city === city) : vettedCache.spots;
}

export async function findVettedSpot(placeId: string) {
  return (await getVettedSpots()).find((s) => s.placeId === placeId);
}

const OUTLETS = { everywhere: "outlets everywhere", limited: "limited outlets", scarce: "outlets scarce" };
const NOISE = { quiet: "quiet", buzz: "ambient buzz", loud: "loud" };
const PARKING = { easy: "easy parking", street: "street parking", paid: "paid parking" };

function ago(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  if (mins < 48 * 60) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

/**
 * Recent community reports for a spot, formatted for the chat's system prompt.
 * Returns "" when there's nothing (or Supabase isn't configured).
 */
export async function communityContext(spotId: string, city: City): Promise<string> {
  const supabase = serverSupabase();
  if (!supabase) return "";

  const since = new Date(Date.now() - PULSE_WINDOW_MS).toISOString();
  const twoWeeks = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const dayStart = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const dayEnd = new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString();

  const [pulses, checkins, here, events] = await Promise.all([
    supabase.from("pulses").select("kind").eq("spot_id", spotId).gte("created_at", since),
    supabase
      .from("checkins")
      .select("wifi, food, drinks, ambience, outlets, noise, parking, note, created_at")
      .eq("spot_id", spotId)
      .gte("created_at", twoWeeks)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.rpc("presence_counts"),
    supabase
      .from("events")
      .select("title, starts_at")
      .eq("spot_id", spotId)
      .eq("status", "approved")
      .gte("starts_at", dayStart)
      .lt("starts_at", dayEnd),
  ]);

  const lines: string[] = [];

  const counts: Partial<Record<PulseKind, number>> = {};
  for (const p of (pulses.data ?? []) as { kind: PulseKind }[]) counts[p.kind] = (counts[p.kind] ?? 0) + 1;
  const pulseText = Object.entries(counts)
    .map(([k, n]) => `${PULSE_KINDS[k as PulseKind].label} ×${n}`)
    .join(", ");
  if (pulseText) lines.push(`Live pulses from visitors in the last 3 hours: ${pulseText}.`);

  const n = ((here.data ?? []) as { spot_id: string; n: number }[]).find((h) => h.spot_id === spotId)?.n;
  if (n) lines.push(`${n} app user(s) say they're working here right now.`);

  for (const c of (checkins.data ?? []) as Checkin[]) {
    const bits = [
      c.wifi != null && `Wi-Fi ${c.wifi}/5`,
      c.food != null && `food ${c.food}/5`,
      c.drinks != null && `drinks ${c.drinks}/5`,
      c.ambience != null && `ambience ${c.ambience}/5`,
      c.outlets && OUTLETS[c.outlets],
      c.noise && NOISE[c.noise],
      c.parking && PARKING[c.parking],
      c.note && `"${c.note.replace(/\s+/g, " ").slice(0, 280)}"`,
    ].filter(Boolean);
    lines.push(`Check-in ${ago(c.created_at)}: ${bits.join(", ")}`);
  }

  for (const e of (events.data ?? []) as Pick<SpotEvent, "title" | "starts_at">[]) {
    const time = new Date(e.starts_at).toLocaleTimeString("en-US", {
      timeZone: city.timeZone,
      hour: "numeric",
      minute: "2-digit",
    });
    lines.push(`Event here today at ${time}: ${e.title}`);
  }

  return lines.join("\n");
}

/** One-line community summary per spot (Wi-Fi, outlets, noise, live pulses), for ranking prompts. */
export async function communityBriefs(): Promise<Record<string, string>> {
  const supabase = serverSupabase();
  if (!supabase) return {};
  const since = new Date(Date.now() - PULSE_WINDOW_MS).toISOString();
  const [stats, pulses] = await Promise.all([
    supabase.from("spot_stats").select("*"),
    supabase.from("pulses").select("spot_id, kind").gte("created_at", since),
  ]);

  const briefs: Record<string, string[]> = {};
  for (const s of (stats.data ?? []) as {
    spot_id: string;
    checkins: number;
    wifi_avg: number | null;
    food_avg: number | null;
    drinks_avg: number | null;
    ambience_avg: number | null;
    outlets: keyof typeof OUTLETS | null;
    noise: keyof typeof NOISE | null;
  }[]) {
    (briefs[s.spot_id] ??= []).push(
      [
        s.wifi_avg != null && `Wi-Fi ${s.wifi_avg}/5`,
        s.food_avg != null && `food ${s.food_avg}/5`,
        s.drinks_avg != null && `drinks ${s.drinks_avg}/5`,
        s.ambience_avg != null && `ambience ${s.ambience_avg}/5`,
        s.outlets && OUTLETS[s.outlets],
        s.noise && NOISE[s.noise],
        `${s.checkins} check-ins`,
      ]
        .filter(Boolean)
        .join(", "),
    );
  }
  const counts: Record<string, Partial<Record<PulseKind, number>>> = {};
  for (const p of (pulses.data ?? []) as { spot_id: string; kind: PulseKind }[]) {
    const c = (counts[p.spot_id] ??= {});
    c[p.kind] = (c[p.kind] ?? 0) + 1;
  }
  for (const [spot, c] of Object.entries(counts)) {
    (briefs[spot] ??= []).push(
      `right now: ${Object.entries(c)
        .map(([k, n]) => `${PULSE_KINDS[k as PulseKind].label} ×${n}`)
        .join(", ")}`,
    );
  }
  return Object.fromEntries(Object.entries(briefs).map(([k, v]) => [k, v.join("; ")]));
}
