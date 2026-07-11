"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { useSocket } from "@/lib/socket-context";

type Message = { id: number; sender_role: "user" | "admin"; body: string; created_at: string };

const LAST_SEEN_KEY = "nexus_support_last_seen_reply";

export default function SupportChat() {
  const { subscribe } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [collapsed, setCollapsed] = useState(true); // always starts collapsed
  const [hasNewReply, setHasNewReply] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const lastCountRef = useRef(0);

  // one-time history load — live messages also arrive over the socket after this,
  // plus a light periodic resync below as a safety net
  const loadHistory = () =>
    fetch("/api/support/messages", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const list: Message[] = data?.messages ?? [];
        setMessages((prev) => {
          // real (server-confirmed) messages always come from `list`, sorted as returned;
          // any still-unconfirmed optimistic bubbles (negative id) stay appended after them
          // until their own submit() call resolves and drops them
          const stillPending = prev.filter((m) => m.id < 0);
          return [...list, ...stillPending];
        });
        const lastAdmin = [...list].reverse().find((m) => m.sender_role === "admin");
        const lastSeen = Number(localStorage.getItem(LAST_SEEN_KEY) ?? 0);
        if (lastAdmin && lastAdmin.id > lastSeen) setHasNewReply(true);
      })
      .finally(() => setLoading(false));

  useEffect(() => {
    loadHistory();
    // safety net: if a socket push were ever silently missed (dead connection,
    // reconnect race), a light periodic resync means the chat catches up on its own
    // instead of requiring a page reload.
    const t = setInterval(loadHistory, 15_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () =>
      subscribe("support:admin_message", (payload: { message: Message }) => {
        setMessages((m) => (m.some((x) => x.id === payload.message.id) ? m : [...m, payload.message]));
        setHasNewReply(true);
      }),
    [subscribe]
  );

  useEffect(() => {
    if (messages.length !== lastCountRef.current) {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      lastCountRef.current = messages.length;
    }
  }, [messages]);

  const toggleOpen = () => {
    setCollapsed((c) => !c);
    if (collapsed) {
      // opening — mark the latest admin reply as seen
      const lastAdmin = [...messages].reverse().find((m) => m.sender_role === "admin");
      if (lastAdmin) localStorage.setItem(LAST_SEEN_KEY, String(lastAdmin.id));
      setHasNewReply(false);
    }
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem("message") as HTMLInputElement;
    const text = input.value.trim();
    if (!text) return;

    setSending(true);
    setError("");
    // optimistic bubble so it feels instant
    const optimistic: Message = {
      id: -Date.now(),
      sender_role: "user",
      body: text,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    input.value = "";

    try {
      const res = await fetch("/api/support/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Не удалось отправить");
      // drop the optimistic bubble and pull in the real (confirmed) message right away,
      // instead of leaving it there until the next periodic resync
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка отправки");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="glass-panel pixel-corner mt-6 overflow-hidden">
      <button
        onClick={toggleOpen}
        className="flex w-full items-center justify-between gap-3 p-6 text-left transition-colors duration-200 hover:bg-white/[0.03]"
      >
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" />
          </span>
          <h3 className="font-[var(--font-display)] text-base font-semibold text-white">Тех. поддержка</h3>
          {hasNewReply && (
            <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 px-2 py-0.5 font-[var(--font-mono)] text-[10px] font-bold uppercase tracking-wide text-white">
              Новый ответ
            </span>
          )}
        </div>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`h-4 w-4 shrink-0 text-[var(--color-mist)] transition-transform duration-300 ${collapsed ? "" : "rotate-180"}`}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {!collapsed && (
        <div className="section-enter px-6 pb-6">
          <p className="text-xs text-[var(--color-mist)]">
            Напишите нам, если что-то не работает или остались вопросы — администратор ответит здесь.
          </p>

          <div
            ref={listRef}
            className="mt-4 flex h-72 flex-col gap-3 overflow-y-auto border border-white/10 bg-black/20 p-4"
          >
            {loading ? (
              <p className="m-auto text-sm text-[var(--color-mist)]">Загрузка чата…</p>
            ) : messages.length === 0 ? (
              <p className="m-auto max-w-xs text-center text-sm text-[var(--color-mist)]">
                Сообщений пока нет — напишите первым, и мы ответим как можно скорее.
              </p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`section-enter max-w-[80%] px-3 py-2 text-sm leading-relaxed ${
                    m.sender_role === "admin"
                      ? "self-start border border-white/10 bg-white/5 text-[#eae7f5]"
                      : "self-end bg-gradient-to-r from-violet-600 to-cyan-500 text-white"
                  }`}
                >
                  <p>{m.body}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      m.sender_role === "admin" ? "text-[var(--color-mist)]" : "text-white/70"
                    }`}
                  >
                    {m.sender_role === "admin" ? "Администратор" : "Вы"} ·{" "}
                    {new Date(m.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              ))
            )}
          </div>

          {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}

          <form onSubmit={submit} className="mt-4 flex gap-2">
            <input
              name="message"
              required
              autoComplete="off"
              placeholder="Опишите проблему…"
              className="min-w-0 flex-1 border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition-colors duration-300 focus:border-cyan-400/60"
            />
            <button
              disabled={sending}
              className="pixel-corner shrink-0 bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-2 font-[var(--font-display)] text-sm font-semibold text-white shadow-[var(--shadow-glow-cyan)] transition-transform duration-300 hover:scale-[1.03] disabled:opacity-60"
            >
              Отправить
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
