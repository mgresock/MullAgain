"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, Input } from "@/components/ui/primitives";

interface ThreadSummary {
  id: string;
  listing: { title: string; slug: string } | null;
  buyer: { id: string; name: string | null; username: string | null };
  seller: { id: string; name: string | null; username: string | null };
  messages: { body: string }[];
}
interface Msg {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export default function MessagesPage() {
  return (
    <Suspense>
      <Messages />
    </Suspense>
  );
}

function Messages() {
  const params = useSearchParams();
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [active, setActive] = useState<string | null>(params.get("thread"));
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/threads")
      .then((r) => r.json())
      .then((j) => setThreads(j.data?.threads ?? []));
  }, []);

  useEffect(() => {
    if (!active) return;
    fetch(`/api/threads/${active}/messages`)
      .then((r) => r.json())
      .then((j) => setMessages(j.data?.messages ?? []));
  }, [active]);

  useEffect(() => {
    endRef.current?.scrollIntoView();
  }, [messages]);

  async function send() {
    if (!active || !draft.trim()) return;
    setError(null);
    const res = await fetch(`/api/threads/${active}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: draft }),
    });
    const j = await res.json();
    if (!res.ok) return setError(j.error ?? "Could not send.");
    setDraft("");
    const r = await fetch(`/api/threads/${active}/messages`);
    setMessages((await r.json()).data?.messages ?? []);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-ink">Messages</h1>
      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <Card className="divide-y divide-[var(--border)] overflow-hidden">
          {threads.length === 0 && <p className="p-4 text-sm text-muted">No conversations yet.</p>}
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`block w-full px-4 py-3 text-left text-sm hover:bg-fairway-50 ${
                active === t.id ? "bg-fairway-50" : ""
              }`}
            >
              <p className="truncate font-medium">{t.listing?.title ?? "Listing"}</p>
              <p className="truncate text-xs text-muted">{t.messages[0]?.body ?? ""}</p>
            </button>
          ))}
        </Card>

        <Card className="flex h-[28rem] flex-col">
          {!active ? (
            <div className="grid flex-1 place-items-center text-sm text-muted">
              Select a conversation.
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {messages.map((m) => (
                  <div key={m.id} className="rounded-lg bg-fairway-50 px-3 py-2 text-sm">
                    {m.body}
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              {error && <p className="px-4 text-xs text-red-600">{error}</p>}
              <div className="flex gap-2 border-t border-[var(--border)] p-3">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Type a message…"
                />
                <Button onClick={send}>Send</Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
