"use client";

import { useEffect, useState } from "react";
import type { TicketSummary } from "./types";

/**
 * "История обращений" — the user's own list of past and current tickets.
 * The entry point of the support widget: pick an existing ticket to reopen
 * its thread, or start a new one.
 */
export default function TicketList({
  onOpenTicket,
  onNewTicket,
  refreshSignal,
}: {
  onOpenTicket: (id: number) => void;
  onNewTicket: () => void;
  refreshSignal: number;
}) {
  const [tickets, setTickets] = useState<TicketSummary[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/support/tickets", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setTickets(d.tickets ?? []))
      .catch(() => setError("Не удалось загрузить историю обращений"));
  }, [refreshSignal]);

  const openTicket = tickets?.find((t) => t.status === "open") ?? null;

  return (
    <div>
      <p className="text-xs text-[var(--color-mist)]">
        Опишите проблему в новом тикете — администратор ответит здесь же. Историю прошлых обращений всегда можно
        посмотреть ниже.
      </p>

      <button
        onClick={onNewTicket}
        disabled={!!openTicket}
        title={openTicket ? "Дождитесь закрытия текущего обращения, прежде чем создавать новое" : undefined}
        className="pixel-corner mt-4 w-full bg-gradient-to-r from-violet-600 to-cyan-500 py-2.5 font-[var(--font-display)] text-sm font-semibold text-white shadow-[var(--shadow-glow-cyan)] transition-transform duration-300 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
      >
        + Новый тикет
      </button>
      {openTicket && (
        <button
          onClick={() => onOpenTicket(openTicket.id)}
          className="mt-1.5 w-full text-center font-[var(--font-mono)] text-[11px] text-[var(--color-mist)] transition-colors hover:text-white"
        >
          У вас уже есть открытое обращение — перейти к нему →
        </button>
      )}

      <div className="mt-4 flex max-h-72 flex-col gap-2 overflow-y-auto">
        {error && <p className="text-sm text-rose-400">{error}</p>}

        {tickets === null && !error && <p className="text-sm text-[var(--color-mist)]">Загрузка…</p>}

        {tickets?.length === 0 && (
          <p className="text-sm text-[var(--color-mist)]">Обращений пока нет — создайте первый тикет выше.</p>
        )}

        {tickets?.map((t) => (
          <button
            key={t.id}
            onClick={() => onOpenTicket(t.id)}
            className="flex items-center gap-3 border border-white/10 bg-black/20 px-3.5 py-2.5 text-left transition-colors duration-200 hover:bg-white/5"
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${t.status === "open" ? "bg-cyan-400" : "bg-white/20"}`}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-white">{t.subject}</p>
              <p className="text-[11px] text-[var(--color-mist)]">
                {t.status === "open" ? "Открыт" : "Закрыт"} ·{" "}
                {new Date(t.created_at).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })}
              </p>
            </div>
            {t.unread > 0 && (
              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 px-1 font-[var(--font-mono)] text-[10px] font-bold text-white">
                {t.unread}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
