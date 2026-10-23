"use client";

import { useSyncExternalStore } from "react";

// Personal notes on any spot ("ask for the back room", "parking is behind the
// building"). Stored in this browser only, so no sign-in needed.

export type PrivateNote = { id: string; text: string; at: string };

const STORAGE_KEY = "houston-vibes:private-notes";
const EMPTY: Record<string, PrivateNote[]> = {};
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cached: Record<string, PrivateNote[]> = EMPTY;

function read() {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage blocked.
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cached = raw ? JSON.parse(raw) : EMPTY;
    } catch {
      cached = EMPTY;
    }
  }
  return cached;
}

function write(next: Record<string, PrivateNote[]>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    cached = next;
  }
  listeners.forEach((l) => l());
}

export function usePrivateNotes(spotId: string) {
  const all = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => EMPTY,
  );
  return {
    notes: all[spotId] ?? [],
    add(text: string) {
      const note = { id: Date.now().toString(36), text, at: new Date().toISOString() };
      const current = read();
      write({ ...current, [spotId]: [note, ...(current[spotId] ?? [])] });
    },
    remove(id: string) {
      const current = read();
      write({ ...current, [spotId]: (current[spotId] ?? []).filter((n) => n.id !== id) });
    },
  };
}
