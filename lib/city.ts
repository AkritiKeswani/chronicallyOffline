"use client";

import { useSyncExternalStore } from "react";
import { CITIES, isCityId, type City, type CityId } from "@/lib/cities";

// The city you're browsing. Remembered in this browser; signed-in users also
// save it to their profile (see lib/auth.ts), which wins on a new device.

const STORAGE_KEY = "chronically-offline:city";
const listeners = new Set<() => void>();
let memory: CityId | null = null;

function read(): CityId | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return isCityId(v) ? v : memory;
  } catch {
    return memory;
  }
}

export function setCurrentCity(city: CityId) {
  memory = city;
  try {
    localStorage.setItem(STORAGE_KEY, city);
  } catch {
    // Storage blocked — remembered for this page view only.
  }
  listeners.forEach((l) => l());
}

/** Back to the landing page. */
export function clearCurrentCity() {
  memory = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked.
  }
  listeners.forEach((l) => l());
}

/** For non-React code (writes tag contributions with the city). */
export function currentCity(): City | null {
  const id = typeof window === "undefined" ? null : read();
  return id ? CITIES[id] : null;
}

export function useCity(): City | null {
  const id = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => null,
  );
  return id ? CITIES[id] : null;
}
