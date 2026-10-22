"use client";

import { Trash2, X } from "lucide-react";
import { useCollections } from "@/lib/collections";
import { NODES, type VibeNode } from "@/lib/nodes";

const DEFAULT_IDS = new Set(["want-to-try", "favorites", "work-spots"]);

export default function CollectionsPanel({
  activeId,
  onFilter,
  onSelect,
  onClose,
}: {
  activeId: string | null;
  onFilter: (collectionId: string | null) => void;
  onSelect: (node: VibeNode) => void;
  onClose: () => void;
}) {
  const { collections, toggleCafe, deleteCollection } = useCollections();

  return (
    <aside className="absolute left-4 top-24 z-10 flex max-h-[calc(100dvh-7rem)] w-72 flex-col rounded-2xl border border-line bg-surface shadow-lg backdrop-blur-xl sm:left-6">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold">Your lists</h2>
        <button onClick={onClose} aria-label="Close lists" className="text-muted hover:text-fg">
          <X size={16} />
        </button>
      </header>

      <div className="space-y-1 overflow-y-auto p-2">
        {collections.map((c) => {
          const active = c.id === activeId;
          const cafes = NODES.filter((n) => c.cafeIds.includes(n.id));
          return (
            <div
              key={c.id}
              className={`rounded-xl p-2 ${active ? "bg-fg/10 ring-1 ring-line-strong" : ""}`}
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onFilter(active ? null : c.id)}
                  className="flex flex-1 items-center gap-2 text-left text-sm"
                  title={active ? "Show all cafes" : "Show only this list on the map"}
                >
                  <span>{c.emoji}</span>
                  <span className="flex-1 truncate font-medium">{c.name}</span>
                  <span className="text-[11px] text-muted">{cafes.length}</span>
                </button>
                {!DEFAULT_IDS.has(c.id) && (
                  <button
                    onClick={() => {
                      if (active) onFilter(null);
                      deleteCollection(c.id);
                    }}
                    aria-label={`Delete ${c.name}`}
                    className="text-subtle hover:text-red-500"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              {cafes.length > 0 && (
                <ul className="mt-1.5 space-y-0.5 pl-6">
                  {cafes.map((n) => (
                    <li key={n.id} className="group flex items-center gap-2 text-xs">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: n.color, boxShadow: `0 0 6px ${n.color}` }}
                      />
                      <button
                        onClick={() => onSelect(n)}
                        className="flex-1 truncate text-left text-fg/80 hover:text-fg"
                      >
                        {n.name}
                      </button>
                      <button
                        onClick={() => toggleCafe(c.id, n.id)}
                        aria-label={`Remove ${n.name} from ${c.name}`}
                        className="text-subtle opacity-0 hover:text-fg group-hover:opacity-100"
                      >
                        <X size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
        <p className="px-2 pb-1 pt-2 text-[11px] text-muted">
          Open a cafe and tap Save to add it. Make new lists from the Save menu.
        </p>
      </div>
    </aside>
  );
}
