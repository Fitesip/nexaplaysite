"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { useSocket } from "@/lib/socket-context";
import Avatar from "@/components/Avatar";
import { displayName } from "@/lib/avatar";

type Message = { id: number; sender_role: "user" | "admin"; body: string; created_at: string };

/**
 * The right-hand conversation view in the support panel: message history for
 * one user, live updates over the socket, and a reply box. Polls every 15s as
 * a safety net in case a socket push is missed.
 */
export default function ChatPanel({ userId, onMessagesRead }: { userId: number; onMessagesRead: () => void }) {
  const { subscribe } = useSocket();
  const [user, setUser] = useState<{
    username: string;
    email: string;
    avatar_url: string | null;
    minecraft_uuid: string | null;
    minecraft_username: string | null;
  } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const lastCountRef = useRef(0);

  const load = async () => {
    const res = await fetch(`/api/support/admin/chats/${userId}/messages`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setUser(data.user);
    setMessages(data.messages ?? []);
    setLoading(false);
    onMessagesRead();
  };

  useEffect(() => {
    setLoading(true);
    lastCountRef.current = 0;
    load();
    // safety net: same reasoning as the user-facing widget — a dead/missed socket
    // push shouldn't mean staff wait for a manual reload to see new messages.
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // live messages for the open thread — from the user directly, or mirrored from
  // another staff member replying on a different tab
  useEffect(
    () =>
      subscribe("support:user_message", (payload: { userId: number; message: Message }) => {
        if (payload.userId !== userId) return;
        setMessages((m) => (m.some((x) => x.id === payload.message.id) ? m : [...m, payload.message]));
        onMessagesRead();
      }),
    [subscribe, userId, onMessagesRead]
  );

  useEffect(() => {
    if (messages.length !== lastCountRef.current) {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      lastCountRef.current = messages.length;
    }
  }, [messages]);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem("message") as HTMLInputElement;
    const text = input.value.trim();
    if (!text) return;

    setSending(true);
    setError("");
    // show the reply immediately; reconciled with the real row once `load()` refetches
    const optimistic: Message = {
      id: -Date.now(),
      sender_role: "admin",
      body: text,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    input.value = "";

    try {
      const res = await fetch(`/api/support/admin/chats/${userId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Не удалось отправить");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка отправки");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="glass-panel pixel-corner flex flex-col">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-3">
        {user && <Avatar user={user} size={28} className="font-[var(--font-display)] text-xs" />}
        <div>
          <span className="font-[var(--font-display)] text-sm font-semibold text-white">
            {user ? displayName(user) : "…"}
          </span>
          <span className="ml-2 text-xs text-[var(--color-mist)]">{user?.email}</span>
        </div>
      </div>

      <div ref={listRef} className="flex h-96 flex-col gap-3 overflow-y-auto p-5">
        {loading ? (
          <p className="m-auto text-sm text-[var(--color-mist)]">Загрузка переписки…</p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`section-enter max-w-[75%] px-3 py-2 text-sm leading-relaxed ${
                m.sender_role === "user"
                  ? "self-start border border-white/10 bg-white/5 text-[#eae7f5]"
                  : "self-end bg-gradient-to-r from-violet-600 to-cyan-500 text-white"
              }`}
            >
              <p>{m.body}</p>
              <p
                className={`mt-1 text-[10px] ${
                  m.sender_role === "user" ? "text-[var(--color-mist)]" : "text-white/70"
                }`}
              >
                {new Date(m.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          ))
        )}
      </div>

      {error && <p className="px-5 text-sm text-rose-400">{error}</p>}

      <form onSubmit={submit} className="flex gap-2 border-t border-white/10 p-4">
        <input
          name="message"
          required
          autoComplete="off"
          placeholder="Ответить пользователю…"
          className="min-w-0 flex-1 border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition-colors duration-300 focus:border-cyan-400/60"
        />
        <button
          disabled={sending}
          className="pixel-corner shrink-0 bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-2 font-[var(--font-display)] text-sm font-semibold text-white shadow-[var(--shadow-glow-cyan)] transition-transform duration-300 hover:scale-[1.03] disabled:opacity-60"
        >
          Ответить
        </button>
      </form>
    </div>
  );
}
