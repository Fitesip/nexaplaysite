"use client";

import { useState } from "react";
import AttachmentGrid from "@/components/support/AttachmentGrid";
import ReplyForm from "@/components/support/ReplyForm";
import type { Message, TicketDetail } from "@/components/support/types";

/**
 * One ticket's block within the merged per-user conversation: a small header
 * (subject, status, open time), its messages, and — only while open — a
 * "Закрыть тикет" button plus a reply box scoped to this ticket specifically
 * (media attachments included). Staff never get a separate chat window per
 * ticket; this is the whole point of keeping everything in one scrolling
 * list, just visually segmented.
 */
export default function TicketSegment({
  ticket,
  messages,
  onUpdateMessages,
  onClosed,
  hideReplyForm = false,
}: {
  ticket: TicketDetail;
  messages: Message[];
  onUpdateMessages: (updater: (all: Message[]) => Message[]) => void;
  onClosed: () => void;
  /** Skip the per-ticket reply box — used when the caller renders one shared
   *  reply form outside the scrolling message list instead (see ChatPanel). */
  hideReplyForm?: boolean;
}) {
  // closed tickets start collapsed — their messages (and any attached images/videos)
  // aren't even mounted until expanded, so a user's older resolved tickets don't
  // all pile their media into the DOM at once just to show one open conversation
  const [expanded, setExpanded] = useState(ticket.status === "open");
  const [closing, setClosing] = useState(false);

  /** Sends a staff reply (text and/or files); shows it immediately via a local object-URL preview. */
  const send = async (text: string, files: File[]) => {
    const optimisticId = -Date.now();
    const optimisticAttachments = files.map((f) => ({
      url: URL.createObjectURL(f),
      name: f.name,
      mime: f.type,
      size: f.size,
    }));
    onUpdateMessages((all) => [
      ...all,
      {
        id: optimisticId,
        ticket_id: ticket.id,
        sender_role: "admin",
        body: text,
        created_at: new Date().toISOString(),
        attachments: optimisticAttachments,
      },
    ]);

    try {
      const formData = new FormData();
      formData.append("message", text);
      for (const f of files) formData.append("files", f);

      const res = await fetch(`/api/support/tickets/${ticket.id}/messages`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Не удалось отправить");
      // the server also broadcasts this same message to staff over the socket (so other
      // admins watching this chat see it live) — that broadcast can arrive before this
      // fetch resolves, so guard against adding it twice under two different ids.
      onUpdateMessages((all) => {
        const withoutOptimistic = all.filter((x) => x.id !== optimisticId);
        return withoutOptimistic.some((x) => x.id === data.message.id)
          ? withoutOptimistic
          : [...withoutOptimistic, data.message];
      });
    } catch (err) {
      onUpdateMessages((all) => all.filter((x) => x.id !== optimisticId));
      throw err;
    }
  };

  const close = async () => {
    if (!confirm(`Закрыть тикет «${ticket.subject}»?`)) return;
    setClosing(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      });
      if (res.ok) onClosed();
    } finally {
      setClosing(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => ticket.status === "closed" && setExpanded((v) => !v)}
          disabled={ticket.status === "open"}
          className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:cursor-default"
        >
          <span className={`h-2 w-2 shrink-0 rounded-full ${ticket.status === "open" ? "bg-cyan-400" : "bg-white/20"}`} />
          <span className="truncate font-[var(--font-display)] text-sm font-semibold text-white">{ticket.subject}</span>
          <span className="shrink-0 font-[var(--font-mono)] text-[10px] text-[var(--color-mist)]/70">
            {new Date(ticket.created_at).toLocaleDateString("ru-RU")}
          </span>
          {ticket.status === "closed" && (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`h-3 w-3 shrink-0 text-[var(--color-mist)]/60 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        {ticket.status === "open" ? (
          <button
            onClick={close}
            disabled={closing}
            className="shrink-0 border border-white/15 px-3 py-1 font-[var(--font-mono)] text-[11px] uppercase tracking-wide text-[var(--color-mist)] transition-colors duration-300 hover:border-rose-400/50 hover:text-rose-300 disabled:opacity-50"
          >
            {closing ? "Закрываем…" : "Закрыть тикет"}
          </button>
        ) : (
          <span className="shrink-0 font-[var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-mist)]/60">
            Закрыт {ticket.closed_at && new Date(ticket.closed_at).toLocaleDateString("ru-RU")} · {messages.length}{" "}
            сообщ.
          </span>
        )}
      </div>

      {expanded && (
        <>
          <div className="mt-3 flex flex-col gap-3">
            {messages.map((m, i) => (
              <div
                key={m.id}
                className={`max-w-[75%] px-3 py-2 text-sm leading-relaxed ${
                  i < messages.length - 1 ? "cv-auto" : ""
                } ${
                  m.sender_role === "user"
                    ? "self-start border border-white/10 bg-white/5 text-[#eae7f5]"
                    : "ml-auto bg-gradient-to-r from-violet-600 to-cyan-500 text-white"
                }`}
              >
                {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
                <AttachmentGrid attachments={m.attachments} />
                <p className={`mt-1 text-[10px] ${m.sender_role === "user" ? "text-[var(--color-mist)]" : "text-white/70"}`}>
                  {new Date(m.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))}
          </div>

          {ticket.status === "open" && !hideReplyForm && (
            <ReplyForm onSend={send} placeholder="Ответить по этому тикету…" />
          )}
        </>
      )}
    </div>
  );
}
