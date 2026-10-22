"use client";

import { useSyncExternalStore } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, supabaseConfigured, type Profile } from "@/lib/supabase";

type AuthState = {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  /** Set when a Google sign-in comes back with an error. */
  error: string | null;
};

const SIGNED_OUT: AuthState = { ready: !supabaseConfigured, session: null, profile: null, error: null };
let state: AuthState = SIGNED_OUT;
let started = false;
const listeners = new Set<() => void>();

function set(next: Partial<AuthState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

async function loadProfile(session: Session | null) {
  const supabase = getSupabase();
  if (!supabase || !session) return set({ profile: null });
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, handle")
    .eq("id", session.user.id)
    .maybeSingle();
  set({ profile: data ?? null });
}

function start() {
  if (started) return;
  started = true;
  const supabase = getSupabase();
  if (!supabase) return set({ ready: true });

  // Failed OAuth round-trips come back as ?error_description=… — surface it
  // and clean the URL instead of silently showing "Sign in" again.
  const params = new URLSearchParams(window.location.search);
  const failure = params.get("error_description");
  if (failure) {
    set({ error: `Sign-in failed: ${failure}` });
    for (const key of ["error", "error_code", "error_description"]) params.delete(key);
    const query = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (query ? `?${query}` : ""));
  }

  supabase.auth.getSession().then(({ data }) => {
    set({ ready: true, session: data.session });
    loadProfile(data.session);
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    set({ ready: true, session, ...(session ? { error: null } : {}) });
    // Defer: Supabase recommends not awaiting other calls inside this callback.
    setTimeout(() => loadProfile(session), 0);
  });
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAuth() {
  const auth = useSyncExternalStore(
    subscribe,
    () => state,
    () => SIGNED_OUT,
  );
  return {
    ...auth,
    configured: supabaseConfigured,
    user: auth.session?.user ?? null,
    /** First name from Google, else the email's local part. */
    name:
      auth.profile?.display_name ??
      auth.session?.user.email?.split("@")[0] ??
      null,
  };
}

export async function signInWithGoogle() {
  await getSupabase()?.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
}

export async function signOut() {
  await getSupabase()?.auth.signOut();
}

export async function updateHandle(handle: string) {
  const supabase = getSupabase();
  if (!supabase || !state.session) throw new Error("Sign in first");
  const clean = handle.trim().replace(/^@/, "").toLowerCase();
  const { error } = await supabase
    .from("profiles")
    .update({ handle: clean || null })
    .eq("id", state.session.user.id);
  if (error) {
    throw new Error(
      error.code === "23505"
        ? "That handle is taken"
        : error.code === "23514"
          ? "Use 2–24 lowercase letters, numbers or _"
          : error.message,
    );
  }
  await loadProfile(state.session);
}

/** Bearer token for our own API routes, so they can act as this user. */
export function accessToken() {
  return state.session?.access_token ?? null;
}

// --- "About me" persona: stays in this browser, sent with chat requests ----

const PERSONA_KEY = "houston-vibes:persona";
const personaListeners = new Set<() => void>();

function readPersona() {
  try {
    return localStorage.getItem(PERSONA_KEY) ?? "";
  } catch {
    return "";
  }
}

export function usePersona() {
  const persona = useSyncExternalStore(
    (l) => {
      personaListeners.add(l);
      return () => personaListeners.delete(l);
    },
    readPersona,
    () => "",
  );
  return {
    persona,
    setPersona(next: string) {
      try {
        localStorage.setItem(PERSONA_KEY, next.slice(0, 200));
      } catch {
        // Storage blocked — persona just won't persist.
      }
      personaListeners.forEach((l) => l());
    },
  };
}

export function getPersona() {
  return typeof window === "undefined" ? "" : readPersona();
}
