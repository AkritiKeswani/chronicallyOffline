"use client";

import { useSyncExternalStore } from "react";
import { findCommunitySpot } from "@/lib/community";
import { NODES, type VibeNode } from "@/lib/nodes";

export type Collection = {
  id: string;
  name: string;
  emoji: string;
  cafeIds: string[];
};

const STORAGE_KEY = "houston-vibes:collections";

const DEFAULT_COLLECTIONS: Collection[] = [
  { id: "want-to-try", name: "Want to try", emoji: "⭐", cafeIds: [] },
  { id: "favorites", name: "Favorites", emoji: "❤️", cafeIds: [] },
  { id: "work-spots", name: "Work spots", emoji: "💻", cafeIds: [] },
];

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cached: Collection[] = DEFAULT_COLLECTIONS;

function read(): Collection[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage blocked (private mode etc.) — fall back to defaults.
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cached = raw ? (JSON.parse(raw) as Collection[]) : DEFAULT_COLLECTIONS;
    } catch {
      cached = DEFAULT_COLLECTIONS;
    }
  }
  return cached;
}

function write(next: Collection[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    cached = next;
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === STORAGE_KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCollections() {
  const collections = useSyncExternalStore(subscribe, read, () => DEFAULT_COLLECTIONS);

  return {
    collections,
    toggleCafe(collectionId: string, cafeId: string) {
      write(
        read().map((c) =>
          c.id !== collectionId
            ? c
            : {
                ...c,
                cafeIds: c.cafeIds.includes(cafeId)
                  ? c.cafeIds.filter((id) => id !== cafeId)
                  : [...c.cafeIds, cafeId],
              },
        ),
      );
    },
    createCollection(name: string, emoji: string, cafeId?: string) {
      const collection: Collection = {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        emoji: emoji || "📍",
        cafeIds: cafeId ? [cafeId] : [],
      };
      write([...read(), collection]);
      return collection;
    },
    deleteCollection(collectionId: string) {
      write(read().filter((c) => c.id !== collectionId));
    },
  };
}

// Unvetted Google spots aren't in NODES, so keep a snapshot of any that get
// saved to a list so the list can still show them later.
const PLACES_KEY = "houston-vibes:saved-places";

function readPlaces(): Record<string, VibeNode> {
  try {
    return JSON.parse(localStorage.getItem(PLACES_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function rememberPlace(node: VibeNode) {
  if (node.vetted) return;
  try {
    localStorage.setItem(PLACES_KEY, JSON.stringify({ ...readPlaces(), [node.id]: node }));
  } catch {
    // Storage blocked — the list will just not be able to show this spot later.
  }
}

/** Resolve a saved id to a spot: vetted from NODES, unvetted from the snapshot. */
export function resolveSpot(id: string): VibeNode | undefined {
  return NODES.find((n) => n.id === id) ?? findCommunitySpot(id) ?? readPlaces()[id];
}

export function emojisForCafe(collections: Collection[], cafeId: string) {
  return collections.filter((c) => c.cafeIds.includes(cafeId)).map((c) => c.emoji);
}
