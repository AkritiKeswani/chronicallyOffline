"use client";

import { useEffect, useSyncExternalStore } from "react";

export type ThemePref = "system" | "light" | "dark";
export type Theme = "light" | "dark";

const STORAGE_KEY = "houston-vibes:theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";
const listeners = new Set<() => void>();

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

// CSS follows the OS by default; data-theme only exists for explicit picks.
function applyPref(pref: ThemePref) {
  if (pref === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = pref;
  listeners.forEach((l) => l());
}

function readTheme(): Theme {
  const forced = document.documentElement.dataset.theme;
  if (forced === "light" || forced === "dark") return forced;
  return matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = matchMedia(DARK_QUERY);
  media.addEventListener("change", listener);
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", listener);
  };
}

export function useTheme() {
  const pref = useSyncExternalStore(subscribe, readPref, () => "system" as ThemePref);
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light" as Theme);

  // Restore a saved explicit choice after hydration.
  useEffect(() => applyPref(readPref()), []);

  return {
    pref,
    theme,
    setPref(next: ThemePref) {
      try {
        if (next === "system") localStorage.removeItem(STORAGE_KEY);
        else localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Storage blocked — theme still applies for this page view.
      }
      applyPref(next);
    },
  };
}

/** Darkens a neon brand color in light mode / keeps it bright in dark mode. */
export function readable(color: string) {
  return `color-mix(in oklab, ${color} 60%, var(--fg))`;
}
