import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CityId, FieldId } from "@/lib/cities";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Community features switch on only when Supabase env vars are set. */
export const supabaseConfigured = Boolean(URL && KEY);

let browserClient: SupabaseClient | null = null;

/** Shared browser client (persists the Google session in localStorage). */
export function getSupabase(): SupabaseClient | null {
  if (!supabaseConfigured || typeof window === "undefined") return null;
  browserClient ??= createClient(URL!, KEY!, {
    auth: { flowType: "pkce", detectSessionInUrl: true, persistSession: true },
  });
  return browserClient;
}

/**
 * Server-side client. With an access token, queries run as that user so
 * row-level security applies; without one, it's anonymous (public reads).
 */
export function serverSupabase(accessToken?: string): SupabaseClient | null {
  if (!supabaseConfigured) return null;
  return createClient(URL!, KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });
}

// --- Row shapes (mirrors supabase/migrations/0001_community.sql) ----------

export type Profile = {
  id: string;
  display_name: string | null;
  handle: string | null;
  city: CityId | null;
  field: FieldId | null;
  interests: string[];
  is_admin: boolean;
};

export type Checkin = {
  id: string;
  spot_id: string;
  user_id: string;
  wifi: number | null;
  food: number | null;
  drinks: number | null;
  ambience: number | null;
  outlets: "everywhere" | "limited" | "scarce" | null;
  noise: "quiet" | "buzz" | "loud" | null;
  parking: "easy" | "street" | "paid" | null;
  note: string | null;
  created_at: string;
  profiles?: Pick<Profile, "display_name" | "handle"> | null;
};

export const PULSE_KINDS = {
  outlets_open: { emoji: "🔌", label: "Outlets open" },
  no_outlets: { emoji: "🪫", label: "No outlets" },
  quiet: { emoji: "🤫", label: "Quiet" },
  loud: { emoji: "🔊", label: "Loud" },
  laptops: { emoji: "💻", label: "Laptops everywhere" },
  packed: { emoji: "🧍", label: "Packed" },
  seats_open: { emoji: "🪑", label: "Seats open" },
} as const;
export type PulseKind = keyof typeof PULSE_KINDS;

export type Pulse = { id: string; spot_id: string; user_id: string; kind: PulseKind; created_at: string };

export type Presence = {
  id: string;
  spot_id: string;
  user_id: string;
  status: string | null;
  open_to_chat: boolean;
  show_name: boolean;
  expires_at: string;
  profiles?: Pick<Profile, "display_name" | "handle"> | null;
};

export type SpotEvent = {
  id: string;
  spot_id: string;
  title: string;
  url: string | null;
  starts_at: string;
  ends_at: string | null;
  status: "pending" | "approved" | "rejected";
};

export type SpotStats = {
  spot_id: string;
  checkins: number;
  wifi_avg: number | null;
  wifi_count: number;
  food_avg: number | null;
  drinks_avg: number | null;
  ambience_avg: number | null;
  outlets: Checkin["outlets"];
  noise: Checkin["noise"];
  parking: Checkin["parking"];
  last_at: string;
};

export const PULSE_WINDOW_MS = 3 * 60 * 60 * 1000;
