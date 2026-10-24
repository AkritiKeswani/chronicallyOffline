"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { updateProfile, useAuth } from "@/lib/auth";
import { CITIES, CITY_IDS, FIELDS, INTERESTS, type CityId, type FieldId } from "@/lib/cities";
import { setCurrentCity, useCity } from "@/lib/city";

/**
 * Sign-up profile: handle (required), city, field, interests. Shown
 * automatically after first sign-in, and from the account menu to edit.
 */
export default function ProfileSetup({ onClose }: { onClose?: () => void }) {
  const auth = useAuth();
  const browsing = useCity();
  const p = auth.profile;
  const [handle, setHandle] = useState(p?.handle ?? "");
  const [city, setCity] = useState<CityId>(p?.city ?? browsing?.id ?? "htx");
  const [field, setField] = useState<FieldId | null>(p?.field ?? null);
  const [interests, setInterests] = useState<string[]>(p?.interests ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const firstTime = !p?.handle || !p?.field;
  const valid = /^@?[a-zA-Z0-9_]{2,24}$/.test(handle.trim()) && field !== null;

  function toggle(interest: string) {
    setInterests((list) => (list.includes(interest) ? list.filter((i) => i !== interest) : [...list, interest]));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile({ handle, city, field, interests });
      setCurrentCity(city);
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  const chip = (on: boolean) =>
    `rounded-full border px-3 py-1 text-xs transition ${
      on ? "border-invert bg-invert text-invert-fg" : "border-line text-fg/80 hover:bg-fg/5"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={save}
        className="max-h-[90dvh] w-full max-w-lg space-y-5 overflow-y-auto rounded-2xl border border-line bg-solid p-6 text-fg shadow-2xl"
      >
        <div>
          <h2 className="text-lg font-semibold">{firstTime ? `Welcome${auth.name ? `, ${auth.name}` : ""} 👋` : "Your profile"}</h2>
          <p className="mt-1 text-xs text-muted">
            {firstTime
              ? "Set up your profile so we can show you what's happening for people like you."
              : "Update how you show up and what you're into."}
          </p>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium">Handle — shown on your notes, ratings and the leaderboard</span>
          <div className="flex items-center rounded-lg border border-line bg-fg/5 px-2.5 focus-within:border-line-strong">
            <span className="text-muted">@</span>
            <input
              value={handle.replace(/^@/, "")}
              onChange={(e) => setHandle(e.target.value.toLowerCase())}
              placeholder="yourname"
              className="w-full bg-transparent px-1 py-2 text-sm outline-none"
              autoFocus
            />
          </div>
          <span className="text-[11px] text-subtle">2–24 letters, numbers or _</span>
        </label>

        <div className="space-y-1.5">
          <span className="text-xs font-medium">Your city</span>
          <div className="flex flex-wrap gap-1.5">
            {CITY_IDS.map((id) => (
              <button type="button" key={id} onClick={() => setCity(id)} className={chip(city === id)}>
                {CITIES[id].emoji} {CITIES[id].name}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-medium">What do you work in?</span>
          <div className="flex flex-wrap gap-1.5">
            {(Object.entries(FIELDS) as [FieldId, (typeof FIELDS)[FieldId]][]).map(([id, f]) => (
              <button
                type="button"
                key={id}
                disabled={!f.available}
                onClick={() => setField(id)}
                className={`${chip(field === id)} disabled:cursor-not-allowed disabled:opacity-40`}
              >
                {f.emoji} {f.label}
                {!f.available && " · soon"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-medium">What are you into? (pick a few)</span>
          <div className="flex flex-wrap gap-1.5">
            {INTERESTS.map((i) => (
              <button type="button" key={i} onClick={() => toggle(i)} className={chip(interests.includes(i))}>
                {i}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex items-center justify-between gap-3">
          {!firstTime && onClose ? (
            <button type="button" onClick={onClose} className="text-xs text-muted hover:text-fg">
              Cancel
            </button>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={!valid || saving}
            className="flex items-center gap-1.5 rounded-lg bg-invert px-4 py-2 text-sm font-medium text-invert-fg disabled:opacity-40"
          >
            {saving && <Loader2 size={14} className="animate-spin" />} {firstTime ? "Let's go" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
