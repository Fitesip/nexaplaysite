"use client";

/**
 * Floating support widget for logged-in users. Entry point into the ticket
 * system: opens on a "История обращений" list (components/support/TicketList),
 * from which the user can start a new ticket (NewTicketForm) or reopen an
 * existing one's conversation (TicketThread).
 */
import { useEffect, useState } from "react";
import { useSocket } from "@/lib/socket-context";
import TicketList from "@/components/support/TicketList";
import NewTicketForm from "@/components/support/NewTicketForm";
import TicketThread from "@/components/support/TicketThread";

type View = { type: "list" } | { type: "new" } | { type: "thread"; id: number };

export default function SupportChat() {
  const { subscribe } = useSocket();
  const [view, setView] = useState<View>({ type: "list" });
  const [hasNewReply, setHasNewReply] = useState(false);
  const [refreshSignal, setRefreshSignal] = useState(0);

  // light periodic check for any ticket with an unread admin reply, so the
  // "Новый ответ" badge can show up even before the widget is ever opened
  useEffect(() => {
    const check = () =>
      fetch("/api/support/tickets", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.tickets?.some((t: { unread: number }) => t.unread > 0)) setHasNewReply(true);
        });
    check();
    const t = setInterval(check, 20_000);
    return () => clearInterval(t);
  }, []);

  // an admin reply on any ticket lights up the badge immediately
  useEffect(() => subscribe("support:admin_message", () => setHasNewReply(true)), [subscribe]);

  return (
    <div className="glass-panel pixel-corner mt-6 overflow-hidden">
      <div className="flex w-full items-center gap-3 p-6 pb-0 text-left">
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
      </div>

      <div className="section-enter px-6 pb-6">
        {view.type === "list" && (
          <TicketList
            refreshSignal={refreshSignal}
            onOpenTicket={(id) => {
              setHasNewReply(false);
              setView({ type: "thread", id });
            }}
            onNewTicket={() => setView({ type: "new" })}
          />
        )}
        {view.type === "new" && (
          <NewTicketForm
            onCancel={() => setView({ type: "list" })}
            onCreated={(id) => {
              setRefreshSignal((s) => s + 1);
              setView({ type: "thread", id });
            }}
          />
        )}
        {view.type === "thread" && (
          <TicketThread
            ticketId={view.id}
            onBack={() => {
              setRefreshSignal((s) => s + 1);
              setView({ type: "list" });
            }}
          />
        )}
      </div>
    </div>
  );
}
