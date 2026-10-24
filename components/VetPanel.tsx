"use client";

import { useState } from "react";
import { BadgeCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCity } from "@/lib/city";
import { saveVettedSpot, unvetSpot } from "@/lib/community";
import { DEFAULT_VETTED_COLOR, type VibeNode } from "@/lib/nodes";

const PALETTE = ["#a78bfa", "#22d3ee", "#f472b6", "#fbbf24", "#34d399", "#fb923c", "#60a5fa", "#e879f9", "#f87171", "#a3e635"];

/** Admin-only: vet a spot (give it a crowd profile) or edit/unvet it. */
export default function VetPanel({ node }: { node: VibeNode }) {
  const auth = useAuth();
  const city = useCity();
  const [open, setOpen] = useState(false);
  const [neighborhood, setNeighborhood] = useState(node.vetted ? node.neighborhood : "");
  const [demographic, setDemographic] = useState(node.vetted ? node.demographic : "");
  const [tags, setTags] = useState(node.tags.join(", "));
  const [crowd, setCrowd] = useState(node.crowd);
  const [color, setColor] = useState(
    // Stable default per place so re-renders don't reshuffle it.
    node.vetted ? node.color : PALETTE[[...node.placeId].reduce((h, c) => h + c.charCodeAt(0), 0) % PALETTE.length],
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  if (!auth.profile?.is_admin) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const cityId = node.city ?? city?.id;
    if (!cityId) return;
    setBusy(true);
    setMessage(null);
    try {
      await saveVettedSpot({
        place_id: node.placeId,
        city: cityId,
        name: node.name,
        address: node.address,
        lat: node.lat,
        lng: node.lng,
        kind: node.kind,
        neighborhood: neighborhood.trim() || null,
        demographic: demographic.trim().slice(0, 60) || null,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 4),
        crowd: crowd.trim().slice(0, 400) || null,
        color: color || DEFAULT_VETTED_COLOR,
      });
      setMessage({ ok: true, text: node.vetted ? "Updated." : "Vetted — it's now a glowing pin for everyone." });
      setOpen(false);
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Couldn't save" });
    } finally {
      setBusy(false);
    }
  }

  async function unvet() {
    if (!confirm(`Remove ${node.name} from vetted spots? Its notes and ratings stay.`)) return;
    setBusy(true);
    try {
      await unvetSpot(node.placeId);
      setMessage({ ok: true, text: "Removed from vetted spots." });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Couldn't remove" });
    } finally {
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-lg border border-line bg-fg/5 px-2.5 py-1.5 text-sm text-fg outline-none placeholder:text-muted focus:border-line-strong";

  return (
    <div className="rounded-xl border border-dashed border-accent/50 p-3 text-xs">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-semibold text-accent">
          <BadgeCheck size={14} /> Admin
        </span>
        <div className="flex gap-3">
          {node.vetted && (
            <button onClick={unvet} disabled={busy} className="text-muted hover:text-red-500">
              Unvet
            </button>
          )}
          <button onClick={() => setOpen((o) => !o)} className="font-medium text-accent hover:underline">
            {open ? "Close" : node.vetted ? "Edit profile" : "Vet this spot"}
          </button>
        </div>
      </div>

      {message && <p className={`mt-2 ${message.ok ? "text-emerald-500" : "text-red-500"}`}>{message.text}</p>}

      {open && (
        <form onSubmit={save} className="mt-3 space-y-2">
          <input value={demographic} onChange={(e) => setDemographic(e.target.value)} placeholder="Crowd tag, e.g. Late-20s Creatives & Night Owls" className={input} />
          <textarea value={crowd} onChange={(e) => setCrowd(e.target.value)} rows={2} placeholder="Who's there and what it's like (1–2 sentences)" className={input} />
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags, comma-separated: Creatives, Night owls, Loud" className={input} />
          <input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Neighborhood, e.g. Montrose" className={input} />
          <div className="flex flex-wrap items-center gap-1.5">
            {PALETTE.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                className={`h-5 w-5 rounded-full border-2 ${color === c ? "border-fg" : "border-transparent"}`}
                style={{ background: c }}
              />
            ))}
          </div>
          <button
            type="submit"
            disabled={busy || !demographic.trim()}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-invert py-1.5 font-medium text-invert-fg disabled:opacity-40"
          >
            {busy && <Loader2 size={13} className="animate-spin" />} {node.vetted ? "Save changes" : "Vet this spot"}
          </button>
        </form>
      )}
    </div>
  );
}
