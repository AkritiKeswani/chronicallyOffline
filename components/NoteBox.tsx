"use client";

import { useState } from "react";
import { Globe, Lock, X } from "lucide-react";
import { signInWithGoogle, useAuth } from "@/lib/auth";
import { submitCheckin, useSpotFeed } from "@/lib/community";
import type { VibeNode } from "@/lib/nodes";
import { usePrivateNotes } from "@/lib/private-notes";

export default function NoteBox({ node }: { node: VibeNode }) {
  const auth = useAuth();
  const { notes, add, remove } = usePrivateNotes(node.id);
  const feed = useSpotFeed(node.id, auth.user?.id ?? null);
  const publicNotes = (feed?.checkins ?? []).filter((c) => c.note).slice(0, 2);
  const [text, setText] = useState("");
  const [visibility, setVisibility] = useState<"me" | "everyone">("me");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const needsSignIn = visibility === "everyone" && auth.configured && !auth.user;

  async function post(e: React.FormEvent) {
    e.preventDefault();
    const note = text.trim();
    if (!note) return;
    setMessage(null);

    if (visibility === "me") {
      add(note);
      setText("");
      setMessage({ ok: true, text: "Saved — only you can see this." });
      return;
    }
    if (needsSignIn) return signInWithGoogle();

    setBusy(true);
    try {
      await submitCheckin(node.id, { wifi: null, outlets: null, noise: null, parking: null, note });
      setText("");
      setMessage({ ok: true, text: `Posted — everyone sees it, and ${node.name}'s chat will too.` });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Couldn't post" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <form onSubmit={post} className="space-y-1.5">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 280))}
          rows={2}
          placeholder={`Leave a note about ${node.name}… e.g. "outlets by the back wall"`}
          className="w-full rounded-lg border border-line bg-fg/5 px-2.5 py-1.5 text-sm text-fg outline-none placeholder:text-muted focus:border-line-strong"
        />
        <div className="flex items-center gap-1.5">
          {(
            [
              ["me", Lock, "Just me"],
              ["everyone", Globe, "Everyone"],
            ] as const
          ).map(([value, Icon, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setVisibility(value)}
              className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] ${
                visibility === value ? "border-invert bg-invert text-invert-fg" : "border-line text-muted hover:text-fg"
              }`}
            >
              <Icon size={11} /> {label}
            </button>
          ))}
          <button
            type="submit"
            disabled={!text.trim() || busy || (visibility === "everyone" && !auth.configured)}
            className="ml-auto rounded-md bg-invert px-3 py-1 text-[11px] font-medium text-invert-fg disabled:opacity-40"
          >
            {needsSignIn ? "Sign in to post" : visibility === "me" ? "Save note" : "Post note"}
          </button>
        </div>
      </form>

      {message && (
        <p className={`text-[11px] ${message.ok ? "text-emerald-500" : "text-red-500"}`}>{message.text}</p>
      )}

      {publicNotes.length > 0 && (
        <ul className="space-y-1">
          {publicNotes.map((c) => (
            <li key={c.id} className="flex items-start gap-1.5 rounded-md border border-line px-2 py-1 text-xs text-fg">
              <Globe size={10} className="mt-0.5 shrink-0 text-muted" />
              <span className="flex-1">
                &ldquo;{c.note}&rdquo;{" "}
                <span className="text-muted">
                  — {c.profiles?.handle ? `@${c.profiles.handle}` : (c.profiles?.display_name ?? "someone")}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {notes.length > 0 && (
        <ul className="space-y-1">
          {notes.map((n) => (
            <li key={n.id} className="group flex items-start gap-1.5 rounded-md bg-fg/5 px-2 py-1 text-xs text-fg">
              <Lock size={10} className="mt-0.5 shrink-0 text-muted" />
              <span className="flex-1">{n.text}</span>
              <button
                onClick={() => remove(n.id)}
                aria-label="Delete note"
                className="text-subtle opacity-0 hover:text-fg group-hover:opacity-100"
              >
                <X size={11} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
