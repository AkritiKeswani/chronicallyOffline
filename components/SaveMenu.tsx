"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck, Check, Plus } from "lucide-react";
import { useCollections } from "@/lib/collections";
import type { VibeNode } from "@/lib/nodes";
import { readable } from "@/lib/theme";

export default function SaveMenu({ node }: { node: VibeNode }) {
  const { collections, toggleCafe, createCollection } = useCollections();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📍");

  const savedCount = collections.filter((c) => c.cafeIds.includes(node.id)).length;
  const Icon = savedCount > 0 ? BookmarkCheck : Bookmark;

  function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createCollection(name.trim(), emoji.trim(), node.id);
    setName("");
    setEmoji("📍");
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition"
        style={
          savedCount > 0
            ? { borderColor: node.color, color: readable(node.color), background: `${node.color}1a` }
            : { borderColor: "var(--line-strong)", color: "var(--fg)" }
        }
      >
        <Icon size={14} /> {savedCount > 0 ? `Saved · ${savedCount}` : "Save"}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-xl border border-line bg-solid p-2 shadow-2xl">
          <p className="px-2 pb-1 pt-1 text-[11px] uppercase tracking-wider text-muted">
            Save to list
          </p>
          {collections.map((c) => {
            const checked = c.cafeIds.includes(node.id);
            return (
              <button
                key={c.id}
                onClick={() => toggleCafe(c.id, node.id)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-fg hover:bg-fg/5"
              >
                <span className="w-5 text-center">{c.emoji}</span>
                <span className="flex-1 truncate">{c.name}</span>
                <span className="text-[11px] text-muted">{c.cafeIds.length}</span>
                <span
                  className="flex h-4 w-4 items-center justify-center rounded border"
                  style={
                    checked
                      ? { background: node.color, borderColor: node.color, color: "#000" }
                      : { borderColor: "var(--line-strong)" }
                  }
                >
                  {checked && <Check size={12} strokeWidth={3} />}
                </span>
              </button>
            );
          })}

          <form onSubmit={create} className="mt-1 flex gap-1.5 border-t border-line px-1 pt-2">
            <input
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              maxLength={4}
              aria-label="List emoji"
              className="w-9 rounded-md border border-line bg-fg/5 text-center text-sm outline-none"
            />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New list…"
              className="min-w-0 flex-1 rounded-md border border-line bg-fg/5 px-2 py-1 text-sm text-fg outline-none placeholder:text-muted focus:border-line-strong"
            />
            <button
              type="submit"
              disabled={!name.trim()}
              aria-label="Create list"
              className="rounded-md bg-invert px-2 text-invert-fg disabled:opacity-40"
            >
              <Plus size={14} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
