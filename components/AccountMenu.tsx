"use client";

import { useState } from "react";
import { LogIn, LogOut } from "lucide-react";
import { signInWithGoogle, signOut, updateHandle, useAuth, usePersona } from "@/lib/auth";

export default function AccountMenu() {
  const auth = useAuth();
  const { persona, setPersona } = usePersona();
  const [open, setOpen] = useState(false);
  const [handle, setHandle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!auth.configured || !auth.ready) return null;

  if (!auth.user) {
    return (
      <div className="relative">
        <button
          onClick={signInWithGoogle}
          className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs text-fg shadow-sm backdrop-blur hover:bg-solid"
        >
          <LogIn size={14} /> Sign in
        </button>
        {auth.error && (
          <p className="absolute right-0 top-full z-30 mt-2 w-64 rounded-lg border border-red-500/40 bg-solid p-2 text-[11px] text-red-500 shadow-lg">
            {auth.error}
          </p>
        )}
      </div>
    );
  }

  const initial = (auth.name ?? "?").charAt(0).toUpperCase();
  const handleValue = handle ?? auth.profile?.handle ?? "";

  async function save() {
    setError(null);
    setSaved(false);
    try {
      if (handleValue !== (auth.profile?.handle ?? "")) await updateHandle(handleValue);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save");
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-invert text-xs font-semibold text-invert-fg shadow-sm"
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-72 space-y-3 rounded-xl border border-line bg-solid p-3 text-xs shadow-2xl">
          <p className="text-fg">
            Signed in as <b>{auth.name}</b>
          </p>

          <label className="block space-y-1">
            <span className="text-muted">Handle — how others see you on check-ins and spots (optional)</span>
            <div className="flex items-center rounded-lg border border-line bg-fg/5 px-2">
              <span className="text-muted">@</span>
              <input
                value={handleValue}
                onChange={(e) => setHandle(e.target.value.toLowerCase())}
                placeholder="yourname"
                className="w-full bg-transparent px-1 py-1.5 text-sm text-fg outline-none"
              />
            </div>
          </label>

          <label className="block space-y-1">
            <span className="text-muted">About me — only the AI sees this, so spots can tailor answers to you</span>
            <textarea
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              rows={2}
              placeholder="e.g. 26, building a Next.js app, need outlets, like being around other devs"
              className="w-full rounded-lg border border-line bg-fg/5 px-2 py-1.5 text-sm text-fg outline-none placeholder:text-muted focus:border-line-strong"
            />
          </label>

          {error && <p className="text-red-500">{error}</p>}
          {saved && !error && <p className="text-emerald-500">Saved</p>}

          <div className="flex items-center justify-between">
            <button onClick={save} className="rounded-lg bg-invert px-3 py-1.5 font-medium text-invert-fg">
              Save
            </button>
            <button onClick={signOut} className="flex items-center gap-1 text-muted hover:text-fg">
              <LogOut size={13} /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
