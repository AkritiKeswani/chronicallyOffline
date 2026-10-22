"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Send, X } from "lucide-react";
import type { VibeNode } from "@/lib/nodes";

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
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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
    <aside className="drawer-in fixed inset-y-0 right-0 z-20 flex w-full max-w-md flex-col border-l border-white/10 bg-[#0b0d14]/95 backdrop-blur-xl">
      <header className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: node.color, boxShadow: `0 0 10px ${node.color}` }}
            />
            <h2 className="text-lg font-semibold text-white">{node.name}</h2>
          </div>
          <p className="mt-1 flex items-center gap-1 text-xs text-zinc-400">
            <MapPin size={12} /> {node.neighborhood}
          </p>
          <p className="mt-2 text-sm" style={{ color: node.color }}>
            {node.demographic}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {node.tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-zinc-300"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
          aria-label="Close chat"
        >
          <X size={18} />
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-500">
            Ask {node.name} if you fit the vibe — e.g. &ldquo;I&rsquo;m a 27-year-old engineer
            with back-to-back calls. Should I work here right now?&rdquo;
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex"}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                m.role === "user" ? "bg-white text-black" : "border border-white/10 text-zinc-100"
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
                      className="text-[11px] text-sky-300 underline-offset-2 hover:underline"
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
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Loader2 size={14} className="animate-spin" /> {node.name} is thinking…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="flex gap-2 border-t border-white/10 p-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Talk to ${node.name}…`}
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-white/30"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-xl bg-white px-3.5 text-black disabled:opacity-40"
          aria-label="Send"
        >
          <Send size={16} />
        </button>
      </form>
    </aside>
  );
}
