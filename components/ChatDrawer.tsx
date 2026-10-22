"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, MapPin, Send, Star, Users, X } from "lucide-react";
import { getPersona } from "@/lib/auth";
import { useCommunity } from "@/lib/community";
import { googleMapsUrl, type VibeNode } from "@/lib/nodes";
import { readable } from "@/lib/theme";
import CommunityPanel, { QuickPulses, WorkabilitySummary } from "./CommunityPanel";
import SaveMenu from "./SaveMenu";

type Message = {
  role: "user" | "model";
  text: string;
  sources?: { title: string; uri: string }[];
};

export default function ChatDrawer({
  node,
  onClose,
}: {
  node: VibeNode;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"chat" | "community">("chat");
  const scrollRef = useRef<HTMLDivElement>(null);
  const community = useCommunity();
  const here = community.here[node.id] ?? 0;
  const events = community.eventsToday[node.id] ?? [];

  // Scroll only the message list (scrollIntoView also scrolls the page).
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, loading, tab]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const next: Message[] = [...messages, { role: "user", text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/vibe-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeId: node.id,
          messages: next.map(({ role, text }) => ({ role, text })),
          persona: getPersona(),
        }),
      });
      const data = await res.json();
      setMessages([
        ...next,
        res.ok
          ? { role: "model", text: data.text, sources: data.sources }
          : { role: "model", text: `⚠️ ${data.error ?? "Something went wrong"}` },
      ]);
    } catch {
      setMessages([...next, { role: "model", text: "⚠️ Network error" }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="drawer-in fixed inset-y-0 right-0 z-20 flex w-full max-w-md flex-col border-l border-line bg-solid/95 shadow-2xl backdrop-blur-xl">
      <header className="flex items-start justify-between gap-3 border-b border-line p-5">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: node.color, boxShadow: `0 0 10px ${node.color}` }}
            />
            <h2 className="text-lg font-semibold text-fg">{node.name}</h2>
          </div>
          <a
            href={googleMapsUrl(node)}
            target="_blank"
            rel="noreferrer"
            title="Open in Google Maps"
            className="group mt-1 flex items-start gap-1 text-xs text-muted hover:text-accent"
          >
            <MapPin size={12} className="mt-0.5 shrink-0" />
            <span>
              {node.neighborhood} · <span className="group-hover:underline">{node.address}</span>
              <ExternalLink size={10} className="ml-1 inline align-baseline" />
            </span>
          </a>
          {node.vetted ? (
            <p className="mt-2 text-sm" style={{ color: readable(node.color) }}>
              {node.demographic}
            </p>
          ) : (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="rounded-full border border-dashed border-line-strong px-2 py-0.5">
                Not vetted yet · from Google Maps
              </span>
              {node.rating != null && (
                <span className="flex items-center gap-1">
                  <Star size={11} className="fill-current" /> {node.rating.toFixed(1)}
                  {node.ratingCount != null && ` (${node.ratingCount.toLocaleString()})`}
                </span>
              )}
            </p>
          )}
          {node.curatedBy && (
            <p className="mt-1 text-[11px] text-muted">Curated by {node.curatedBy}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {node.tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-line px-2 py-0.5 text-[11px] text-fg/80"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <SaveMenu node={node} />
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted hover:bg-fg/10 hover:text-fg"
            aria-label="Close chat"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {community.ready && (
        <div className="space-y-2 border-b border-line px-5 py-3">
          {events.map((e) => (
            <a
              key={e.id}
              href={e.url ?? undefined}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-lg border border-amber-400/50 bg-amber-400/10 px-2.5 py-1.5 text-xs text-fg"
            >
              <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
              <span className="flex-1">
                <b>Today {new Date(e.starts_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</b> · {e.title}
              </span>
            </a>
          ))}
          <WorkabilitySummary spotId={node.id} />
          {here > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <Users size={12} /> {here} {here === 1 ? "person" : "people"} working here now
            </p>
          )}
          <QuickPulses spotId={node.id} />
        </div>
      )}

      {community.ready && (
        <div className="grid grid-cols-2 gap-2 border-b border-line px-5 py-3">
          {(["chat", "community"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
                tab === t ? "border-invert bg-invert text-invert-fg" : "border-line text-fg hover:bg-fg/5"
              }`}
            >
              <span className="block font-semibold">
                {t === "chat" ? `💬 Ask ${node.name.split(" ")[0]}` : "✍️ Reviews & who's here"}
              </span>
              <span className={`block ${tab === t ? "opacity-80" : "text-muted"}`}>
                {t === "chat" ? "Do I fit the vibe right now?" : "Rate Wi-Fi, outlets, noise · say you're here"}
              </span>
            </button>
          ))}
        </div>
      )}

      {tab === "community" ? (
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5">
          <CommunityPanel node={node} />
        </div>
      ) : (
      <>
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-5">
        {messages.length === 0 && (
          <p className="text-sm text-muted">
            Ask {node.name} if you fit the vibe — e.g. &ldquo;I&rsquo;m a 27-year-old engineer
            with back-to-back calls. Should I work here right now?&rdquo;
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex"}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                m.role === "user" ? "bg-invert text-invert-fg" : "border border-line text-fg"
              }`}
              style={m.role === "model" ? { background: `${node.color}14` } : undefined}
            >
              {m.text}
              {m.sources && m.sources.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.sources.map((s) => (
                    <a
                      key={s.uri}
                      href={s.uri}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-accent underline-offset-2 hover:underline"
                    >
                      {s.title} ↗
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted">
            <Loader2 size={14} className="animate-spin" /> {node.name} is thinking…
          </div>
        )}
      </div>

      <form onSubmit={send} className="flex gap-2 border-t border-line p-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Talk to ${node.name}…`}
          className="flex-1 rounded-xl border border-line bg-fg/5 px-3.5 py-2.5 text-sm text-fg outline-none placeholder:text-muted focus:border-line-strong"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-xl bg-invert px-3.5 text-invert-fg disabled:opacity-40"
          aria-label="Send"
        >
          <Send size={16} />
        </button>
      </form>
      </>
      )}
    </aside>
  );
}
