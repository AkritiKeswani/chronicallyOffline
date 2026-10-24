"use client";

import { useState } from "react";
import { BadgeCheck, LogIn, LogOut, Pencil } from "lucide-react";
import { signInWithGoogle, signOut, useAuth, usePersona } from "@/lib/auth";
import { CITIES, FIELDS } from "@/lib/cities";
import ProfileSetup from "./ProfileSetup";

export default function AccountMenu() {
  const auth = useAuth();
  const { persona, setPersona } = usePersona();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);

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

  const p = auth.profile;
  const initial = (p?.handle ?? auth.name ?? "?").charAt(0).toUpperCase();

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
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="flex items-center gap-1 text-sm font-semibold text-fg">
                {p?.handle ? `@${p.handle}` : auth.name}
                {p?.is_admin && <BadgeCheck size={14} className="text-accent" aria-label="Admin" />}
              </p>
              <p className="mt-0.5 text-muted">
                {[p?.city && `${CITIES[p.city].emoji} ${CITIES[p.city].name}`, p?.field && FIELDS[p.field].label]
                  .filter(Boolean)
                  .join(" · ") || "Profile not set up"}
              </p>
              {p?.interests?.length ? <p className="mt-1 text-subtle">{p.interests.join(", ")}</p> : null}
            </div>
            <button
              onClick={() => {
                setEditing(true);
                setOpen(false);
              }}
              className="flex items-center gap-1 text-accent hover:underline"
            >
              <Pencil size={11} /> Edit
            </button>
          </div>

          <label className="block space-y-1">
            <span className="text-muted">About me — only the AI sees this, so answers fit you</span>
            <textarea
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              rows={2}
              placeholder="e.g. 27, building a startup, need outlets, like being around other devs"
              className="w-full rounded-lg border border-line bg-fg/5 px-2 py-1.5 text-sm text-fg outline-none placeholder:text-muted focus:border-line-strong"
            />
          </label>

          <button onClick={signOut} className="flex items-center gap-1 text-muted hover:text-fg">
            <LogOut size={13} /> Sign out
          </button>
        </div>
      )}

      {editing && <ProfileSetup onClose={() => setEditing(false)} />}
    </div>
  );
}
