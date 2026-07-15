"use client";

import { useEffect, useRef, useState } from "react";
import { useSocket } from "@/lib/socket-context";
import { useStickToBottom } from "@/lib/use-stick-to-bottom";
import Avatar from "@/components/Avatar";
import { displayName } from "@/lib/avatar";
import TicketSegment from "./TicketSegment";
import ReplyForm from "@/components/support/ReplyForm";
import type { Message, TicketDetail } from "@/components/support/types";

/**
 * The right-hand panel in the support inbox: every ticket a user has ever
 * opened, rendered as one continuous scroll with a divider between tickets
 * (see TicketSegment) — staff never get a separate chat window per ticket,
 * just this single merged history. Polls every 15s as a safety net in case a
 * socket push is missed.
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
  const [tickets, setTickets] = useState<TicketDetail[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const listRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    const res = await fetch(`/api/support/admin/chats/${userId}/messages`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setUser(data.user);
    setTickets(data.tickets ?? []);
    setMessages(data.messages ?? []);
    setLoading(false);
    onMessagesRead();
  };

  useEffect(() => {
    setLoading(true);
    load();
    // safety net: same reasoning as the user-facing widget — a dead/missed socket
    // push shouldn't mean staff wait for a manual reload to see new messages.
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // live messages for this user — from them directly, or mirrored from another
  // staff member replying on a different tab; a brand-new ticket needs its
  // header pulled in too, since it won't be in `tickets` yet
  useEffect(
    () =>
      subscribe(
        "support:user_message",
        (payload: { userId: number; ticket?: TicketDetail; message: Message }) => {
          if (payload.userId !== userId) return;
          if (payload.ticket) {
            setTickets((t) => (t.some((x) => x.id === payload.ticket!.id) ? t : [...t, payload.ticket!]));
          }
          setMessages((m) => (m.some((x) => x.id === payload.message.id) ? m : [...m, payload.message]));
          onMessagesRead();
        }
      ),
    [subscribe, userId, onMessagesRead]
  );

  useEffect(
    () =>
      subscribe("support:ticket_closed", (payload: { ticketId: number; userId: number }) => {
        if (payload.userId !== userId) return;
        setTickets((t) =>
          t.map((x) => (x.id === payload.ticketId ? { ...x, status: "closed", closed_at: new Date().toISOString() } : x))
        );
      }),
    [subscribe, userId]
  );

  useStickToBottom(listRef, contentRef, messages, userId);

  const openTicket = tickets.find((t) => t.status === "open") ?? null;

  /**
   * Sends a staff reply to the currently open ticket. Lives here — rather than inside
   * TicketSegment — so the reply box itself can sit *outside* the auto-scrolling message
   * list (see the render below): keeping it inside made the input visibly jolt on every
   * new message, since appending content pushes it down within the scroll area a frame
   * before the "stick to bottom" scroll catches up and pulls it back into place.
   */
  const sendReply = async (text: string, files: File[]) => {
    if (!openTicket) return;
    const ticketId = openTicket.id;
    const optimisticId = -Date.now();
    const optimisticAttachments = files.map((f) => ({
      url: URL.createObjectURL(f),
      name: f.name,
      mime: f.type,
      size: f.size,
    }));
    setMessages((all) => [
      ...all,
      {
        id: optimisticId,
        ticket_id: ticketId,
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

      const res = await fetch(`/api/support/tickets/${ticketId}/messages`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Не удалось отправить");
      // the server also broadcasts this same message to staff over the socket (so other
      // admins watching this chat see it live) — that broadcast can arrive before this
      // fetch resolves, so guard against adding it twice under two different ids.
      setMessages((all) => {
        const withoutOptimistic = all.filter((x) => x.id !== optimisticId);
        return withoutOptimistic.some((x) => x.id === data.message.id)
          ? withoutOptimistic
          : [...withoutOptimistic, data.message];
      });
    } catch (err) {
      setMessages((all) => all.filter((x) => x.id !== optimisticId));
      throw err;
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

      <div ref={listRef} className="flex max-h-[34rem] flex-col overflow-y-auto p-5">
        {loading ? (
          <p className="m-auto text-sm text-[var(--color-mist)]">Загрузка переписки…</p>
        ) : tickets.length === 0 ? (
          <p className="m-auto text-sm text-[var(--color-mist)]">У пользователя пока нет обращений.</p>
        ) : (
          <div ref={contentRef} className="flex flex-col gap-6">
            {tickets.map((ticket, idx) => (
              <div key={ticket.id} className={idx > 0 ? "border-t border-white/10 pt-6" : ""}>
                <TicketSegment
                  ticket={ticket}
                  messages={messages.filter((m) => m.ticket_id === ticket.id)}
                  onUpdateMessages={(updater) => setMessages(updater)}
                  onClosed={() =>
                    setTickets((t) =>
                      t.map((x) => (x.id === ticket.id ? { ...x, status: "closed", closed_at: new Date().toISOString() } : x))
                    )
                  }
                  hideReplyForm
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {openTicket && (
        <div className="border-t border-white/10 p-5 pt-4">
          <ReplyForm onSend={sendReply} placeholder="Ответить по этому тикету…" />
        </div>
      )}
    </div>
  );
}
