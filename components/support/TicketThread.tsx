"use client";

import { useEffect, useRef, useState } from "react";
import { useSocket } from "@/lib/socket-context";
import { useStickToBottom } from "@/lib/use-stick-to-bottom";
import AttachmentGrid from "./AttachmentGrid";
import ReplyForm from "./ReplyForm";
import type { Message, TicketDetail } from "./types";

/**
 * One ticket's conversation: the original question at the top (with any
 * attached media right under its text), followed by the reply thread. Media
 * can be attached to any follow-up reply too, not just the opening message.
 * Closed tickets show a notice instead of a reply box.
 */
export default function TicketThread({ ticketId, onBack }: { ticketId: number; onBack: () => void }) {
  const { subscribe } = useSocket();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [error, setError] = useState("");
  const [closing, setClosing] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const load = () =>
    fetch(`/api/support/tickets/${ticketId}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setTicket(d.ticket);
        setMessages(d.messages ?? []);
      })
      .catch(() => setError("Не удалось загрузить тикет"));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  useEffect(
    () =>
      subscribe("support:admin_message", (payload: { ticketId: number; message: Message }) => {
        if (payload.ticketId !== ticketId) return;
        setMessages((m) => (m && !m.some((x) => x.id === payload.message.id) ? [...m, payload.message] : m));
      }),
    [subscribe, ticketId]
  );

  useEffect(
    () =>
      subscribe("support:ticket_closed", (payload: { ticketId: number }) => {
        if (payload.ticketId !== ticketId) return;
        setTicket((t) => (t ? { ...t, status: "closed", closed_at: new Date().toISOString() } : t));
      }),
    [subscribe, ticketId]
  );

  useStickToBottom(listRef, contentRef, messages, ticketId);

  /** Sends a reply (text and/or files); shows it immediately via a local object-URL preview. */
  const send = async (text: string, files: File[]) => {
    const optimisticId = -Date.now();
    const optimisticAttachments = files.map((f) => ({
      url: URL.createObjectURL(f),
      name: f.name,
      mime: f.type,
      size: f.size,
    }));
    setMessages((m) =>
      m
        ? [
            ...m,
            {
              id: optimisticId,
              ticket_id: ticketId,
              sender_role: "user",
              body: text,
              created_at: new Date().toISOString(),
              attachments: optimisticAttachments,
            },
          ]
        : m
    );

    try {
      const formData = new FormData();
      formData.append("message", text);
      for (const f of files) formData.append("files", f);

      const res = await fetch(`/api/support/tickets/${ticketId}/messages`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Не удалось отправить");
      setMessages((m) => (m ? [...m.filter((x) => x.id !== optimisticId), data.message] : m));
    } catch (err) {
      setMessages((m) => (m ? m.filter((x) => x.id !== optimisticId) : m));
      throw err;
    }
  };

  /** Lets the ticket's owner close it themselves, same as staff can. */
  const close = async () => {
    if (!ticket || !confirm(`Закрыть тикет «${ticket.subject}»?`)) return;
    setClosing(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      });
      if (res.ok) {
        setTicket((t) => (t ? { ...t, status: "closed", closed_at: new Date().toISOString() } : t));
      }
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="flex flex-col">
      <button
        onClick={onBack}
        className="w-fit font-[var(--font-mono)] text-xs text-[var(--color-mist)] transition-colors hover:text-white"
      >
        ← Назад к обращениям
      </button>

      {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}

      {ticket && (
        <div className="mt-2 flex items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${ticket.status === "open" ? "bg-cyan-400" : "bg-white/20"}`} />
          <h3 className="min-w-0 flex-1 truncate font-[var(--font-display)] text-sm font-semibold text-white">
            {ticket.subject}
          </h3>
          {ticket.status === "open" && (
            <button
              onClick={close}
              disabled={closing}
              className="shrink-0 border border-white/15 px-3 py-1 font-[var(--font-mono)] text-[11px] uppercase tracking-wide text-[var(--color-mist)] transition-colors duration-300 hover:border-rose-400/50 hover:text-rose-300 disabled:opacity-50"
            >
              {closing ? "Закрываем…" : "Закрыть тикет"}
            </button>
          )}
        </div>
      )}

      <div ref={listRef} className="mt-3 flex h-72 flex-col overflow-y-auto border border-white/10 bg-black/20 p-4">
        {messages === null && !error ? (
          <p className="m-auto text-sm text-[var(--color-mist)]">Загрузка…</p>
        ) : (
          <div ref={contentRef} className="flex flex-col gap-3">
            {messages?.map((m, i) => (
              <div
                key={m.id}
                className={`max-w-[85%] px-3 py-2 text-sm leading-relaxed ${
                  i < (messages?.length ?? 0) - 1 ? "cv-auto" : ""
                } ${
                  m.sender_role === "admin"
                    ? "self-start border border-white/10 bg-white/5 text-[#eae7f5]"
                    : "self-end bg-gradient-to-r from-violet-600 to-cyan-500 text-white"
                }`}
              >
                {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
                <AttachmentGrid attachments={m.attachments} />
                <p className={`mt-1 text-[10px] ${m.sender_role === "admin" ? "text-[var(--color-mist)]" : "text-white/70"}`}>
                  {m.sender_role === "admin" ? "Администратор" : "Вы"} ·{" "}
                  {new Date(m.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {ticket?.status === "closed" ? (
        <p className="mt-4 border border-white/10 bg-white/5 px-4 py-3 text-center text-sm text-[var(--color-mist)]">
          Тикет закрыт. Если проблема повторилась — создайте новое обращение.
        </p>
      ) : (
        <ReplyForm onSend={send} placeholder="Ваш ответ…" />
      )}
    </div>
  );
}
