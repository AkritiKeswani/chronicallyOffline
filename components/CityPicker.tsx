"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown } from "lucide-react";
import { signInWithGoogle, updateProfile, useAuth } from "@/lib/auth";
import { CITIES, CITY_IDS, type City, type CityId } from "@/lib/cities";
import { setCurrentCity } from "@/lib/city";
import { useVettedSpots } from "@/lib/community";

function choose(id: CityId, signedIn: boolean) {
  setCurrentCity(id);
  // Best effort: remember it on the profile too, so it follows you to new devices.
  if (signedIn) updateProfile({ city: id }).catch(() => {});
}

/** Small dropdown in the shadcn "Select" style. */
function CitySelect({ value, onChange }: { value: CityId; onChange: (id: CityId) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-11 w-56 items-center justify-between rounded-md border border-neutral-200 bg-white px-4 text-sm text-neutral-950 shadow-sm transition hover:border-neutral-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
      >
        {CITIES[value].name}
        <ChevronDown size={16} className={`text-neutral-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 top-full z-20 mt-1.5 w-56 overflow-hidden rounded-md border border-neutral-200 bg-white p-1 shadow-lg"
        >
          {CITY_IDS.map((id) => (
            <li key={id}>
              <button
                type="button"
                role="option"
                aria-selected={id === value}
                onClick={() => {
                  onChange(id);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm text-neutral-800 hover:bg-sky-50"
              >
                {CITIES[id].name}
                {id === value && <Check size={14} className="text-sky-500" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Landing page: pick a city. */
export default function CityPicker() {
  const auth = useAuth();
  const [city, setCity] = useState<CityId>("htx");
  const vetted = useVettedSpots(city);
  const c = CITIES[city];

  // Caption lines in the reference's style: real vetted spots when we have
  // them, otherwise the city's neighborhoods.
  const captions =
    vetted.length > 0
      ? vetted.slice(0, 5).map((s) => [s.name, s.neighborhood].filter(Boolean).join("  /  "))
      : c.neighborhoods;

  return (
    <div className="min-h-dvh w-full bg-white text-neutral-950">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 sm:px-10">
        <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-neutral-500">
          chronicallyOffline
        </span>
        {auth.configured && !auth.user && (
          <button
            onClick={signInWithGoogle}
            className="font-mono text-[11px] uppercase tracking-[0.25em] text-neutral-500 transition hover:text-neutral-950"
          >
            Sign in
          </button>
        )}
      </header>

      <main className="mx-auto grid max-w-6xl gap-16 px-6 pb-20 pt-10 sm:px-10 sm:pt-20 lg:grid-cols-[1.3fr_1fr] lg:items-end">
        <section>
          <h1 className="font-serif text-6xl leading-[0.95] tracking-tight sm:text-8xl">
            chronically
            <br />
            <span className="text-sky-500">offline</span>
          </h1>
          <p className="mt-6 max-w-md font-mono text-[13px] leading-relaxed text-neutral-500">
            Where people in their 20s and 30s actually go — curated spots, honest ratings, and what&rsquo;s on
            today.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <CitySelect value={city} onChange={setCity} />
            <button
              onClick={() => choose(city, Boolean(auth.user))}
              className="group flex h-11 items-center gap-2 rounded-md bg-neutral-950 px-5 text-sm font-medium text-white transition hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              Explore {c.name}
              <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
            </button>
          </div>
        </section>

        <aside aria-label={`${c.name} highlights`} className="space-y-4 border-l border-neutral-200 pl-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-sky-500">
            {vetted.length > 0 ? `Curated in ${c.name}` : `Around ${c.name}`}
          </p>
          <ul className="space-y-3">
            {captions.map((line) => (
              <li
                key={line}
                className="flex items-center gap-4 font-mono text-[12px] uppercase tracking-[0.2em] text-neutral-700"
              >
                <span className="h-px w-8 bg-neutral-300" />
                {line}
              </li>
            ))}
          </ul>
        </aside>
      </main>
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
        {city.name}
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
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm hover:bg-fg/5 ${
                id === city.id ? "font-semibold text-fg" : "text-fg/80"
              }`}
            >
              {CITIES[id].name}
              {id === city.id && <Check size={13} className="text-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
