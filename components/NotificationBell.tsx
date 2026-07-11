"use client";

import { useEffect, useRef, useState } from "react";
import { useNotifications } from "@/lib/notifications-context";

/** Navigates the app to a notification's link, which is always a `#`-hash target. */
function goToLink(link: string | null) {
  if (!link) return;
  window.location.hash = link.replace(/^#/, "");
}

export default function NotificationBell() {
  const { items, unread, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Уведомления"
        className="relative flex h-10 w-10 items-center justify-center"
      >
        <span
          className={`pixel-corner absolute inset-0 flex items-center justify-center transition-all duration-300 ${
            open ? "bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-[var(--shadow-glow-cyan)]" : "glass-panel text-[var(--color-mist)] hover:text-white"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5">
            <path
              d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M10 19a2 2 0 0 0 4 0" strokeLinecap="round" />
          </svg>
        </span>
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 px-1 font-[var(--font-mono)] text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="glass-panel pixel-corner absolute right-0 top-12 z-50 flex max-h-[70vh] w-80 flex-col overflow-hidden shadow-[0_0_30px_rgba(80,20,140,0.35)]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <span className="font-[var(--font-display)] text-sm font-semibold text-white">Уведомления</span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="font-[var(--font-mono)] text-[11px] text-cyan-300 hover:text-cyan-200"
              >
                Прочитать всё
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {items.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-[var(--color-mist)]">Пока пусто</p>
            )}
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  markRead(n.id);
                  setOpen(false);
                  goToLink(n.link);
                }}
                className={`flex w-full flex-col gap-0.5 border-b border-white/5 px-4 py-3 text-left transition-colors hover:bg-white/5 ${
                  n.read ? "opacity-60" : ""
                }`}
              >
                <span className="flex items-center gap-2 font-[var(--font-display)] text-xs font-semibold text-white">
                  {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />}
                  {n.title}
                </span>
                {n.body && <span className="text-xs text-[var(--color-mist)]">{n.body}</span>}
                <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-mist)]/60">
                  {new Date(n.created_at).toLocaleString("ru-RU", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
