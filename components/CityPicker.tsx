"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { updateProfile, useAuth } from "@/lib/auth";
import { CITIES, CITY_IDS, type City, type CityId } from "@/lib/cities";
import { setCurrentCity } from "@/lib/city";

function choose(id: CityId, signedIn: boolean) {
  setCurrentCity(id);
  // Best effort: remember it on the profile too, so it follows you to new devices.
  if (signedIn) updateProfile({ city: id }).catch(() => {});
}

/** Full-screen "pick your city" on first visit. */
export default function CityPicker() {
  const auth = useAuth();

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-bg px-4 py-10 text-fg">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">chronicallyOffline</h1>
        <p className="mt-2 max-w-lg text-sm text-muted">
          See what people in their 20s and 30s are actually up to in your city — the spots, the vibe right now, and
          what to do today. Pick a city to start.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {CITY_IDS.map((id) => {
            const c = CITIES[id];
            return (
              <button
                key={id}
                onClick={() => choose(id, Boolean(auth.user))}
                className="group rounded-2xl border border-line bg-surface p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md"
              >
                <span className="text-2xl">{c.emoji}</span>
                <span className="mt-2 block text-base font-semibold">{c.name}</span>
                {id === "htx" && <span className="text-[11px] text-accent">Where it started</span>}
              </button>
            );
          })}
        </div>
        <p className="mt-6 text-[11px] text-subtle">You can switch cities any time.</p>
      </div>
    </div>
  );
}

/** Compact city switcher for the header. */
export function CitySwitcher({ city }: { city: City }) {
  const auth = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-full items-center gap-1.5 rounded-2xl border border-line bg-surface px-3 py-2 text-xs font-medium shadow-sm backdrop-blur"
      >
        <span>{city.emoji}</span> {city.short}
        <ChevronDown size={12} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-48 rounded-xl border border-line bg-solid p-1 shadow-2xl">
          {CITY_IDS.map((id) => (
            <button
              key={id}
              onClick={() => {
                choose(id, Boolean(auth.user));
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-fg/5 ${
                id === city.id ? "font-semibold text-fg" : "text-fg/80"
              }`}
            >
              <span>{CITIES[id].emoji}</span> {CITIES[id].name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
