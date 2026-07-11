"use client";

import { useEffect, useRef, useState } from "react";
import type { SectionId } from "./sections";
import { ServerStatusBadge } from "./ServerStatus";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { useAdminChats } from "@/lib/admin-chats-context";
import NotificationBell from "./NotificationBell";
import Avatar from "./Avatar";

const NAV: { id: SectionId; label: string }[] = [
  { id: "home", label: "Главная" },
  { id: "catalog", label: "Каталог" },
  { id: "news", label: "Новости" },
  { id: "forum", label: "Форум" },
  { id: "faq", label: "FAQ" },
  { id: "contact", label: "Связь" },
];

export default function NavBar({
  active,
  onChange,
}: {
  active: SectionId;
  onChange: (id: SectionId) => void;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [pill, setPill] = useState({ left: 0, width: 0, visible: false });
  const { totalCount } = useCart();
  const { user } = useAuth();
  const { unreadTotal: supportUnread } = useAdminChats();
  const role = user?.role ?? null;
  const isStaff = role === "helper" || role === "admin" || role === "main_admin";

  const activeInPill = NAV.some((n) => n.id === active);

  useEffect(() => {
    if (!activeInPill) {
      setPill((p) => ({ ...p, visible: false }));
      return;
    }
    const el = refs.current[active];
    if (el) {
      setPill({ left: el.offsetLeft, width: el.offsetWidth, visible: true });
    }
  }, [active, activeInPill]);

  useEffect(() => {
    const onResize = () => {
      if (!activeInPill) return;
      const el = refs.current[active];
      if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth, visible: true });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [active, activeInPill]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex flex-col gap-3 px-4 pt-4 sm:px-6">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        {/* Logo + status */}
        <div className="flex items-center gap-3 justify-self-start">
          <button
            onClick={() => onChange("home")}
            className={`pixel-corner flex items-center gap-2 px-4 py-2.5 font-[var(--font-display)] text-sm tracking-wide transition-all duration-300 glass-panel text-[var(--color-mist)] hover:text-white`}
            aria-label="NEXAPLAY — на главную"
          >
            <span className="relative h-8 w-8 overflow-hidden">
              <img src={"/logo.png"} alt="logo" className="h-8 w-8" />
            </span>
            <span className="font-[var(--font-display)] text-lg font-bold tracking-wide text-white">
              NEXA<span className="grad-text">PLAY</span>
            </span>
          </button>
          <span className="hidden sm:block">
            <ServerStatusBadge />
          </span>
        </div>

        {/* Centered nav */}
        <nav className="glass-panel pixel-corner relative flex items-center gap-1 px-2 py-2 justify-self-center shadow-[0_0_30px_rgba(80,20,140,0.25)]">
          <div
            className="nav-pill pixel-corner absolute top-2 bottom-2 rounded-none bg-gradient-to-r from-violet-600/70 to-cyan-500/70"
            style={{ left: pill.left, width: pill.width, opacity: pill.visible ? 1 : 0 }}
          />
          {NAV.map((item) => (
            <button
              key={item.id}
              ref={(el) => {
                refs.current[item.id] = el;
              }}
              onClick={() => onChange(item.id)}
              className={`relative z-10 whitespace-nowrap px-4 py-2 font-[var(--font-display)] text-sm tracking-wide transition-colors duration-300 ${
                active === item.id ? "text-white" : "text-[var(--color-mist)] hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Cart + Admin + Cabinet */}
        <div className="flex items-center gap-2 justify-self-end">
          {isStaff && (
            <button
              onClick={() => onChange("admin")}
              aria-label="Панель управления"
              className="relative flex items-center"
            >
              <span
                className={`pixel-corner flex items-center gap-2 px-4 py-2.5 font-[var(--font-display)] text-sm tracking-wide transition-all duration-300 ${
                  active === "admin"
                    ? "bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-[var(--shadow-glow-cyan)]"
                    : "glass-panel text-[var(--color-mist)] hover:text-white"
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                  <path
                    d="M12 3l7 3v5c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="hidden sm:inline">{role === "helper" ? "Хелпер-панель" : "Админ-панель"}</span>
              </span>
              {supportUnread > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 px-1 font-[var(--font-mono)] text-[10px] font-bold text-white">
                  {supportUnread}
                </span>
              )}
            </button>
          )}

          {user && <NotificationBell />}

          <button
            onClick={() => onChange("cart")}
            aria-label="Корзина"
            className="relative flex h-10 w-10 items-center justify-center"
          >
            <span
              className={`pixel-corner absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                active === "cart"
                  ? "bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-[var(--shadow-glow-cyan)]"
                  : "glass-panel text-[var(--color-mist)] hover:text-white"
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5">
                <circle cx="9" cy="20" r="1.4" />
                <circle cx="17" cy="20" r="1.4" />
                <path d="M3 4h2l2.2 11.1a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L20.5 8H6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            {totalCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 px-1 font-[var(--font-mono)] text-[10px] font-bold text-white">
                {totalCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onChange("cabinet")}
            className={`pixel-corner flex items-center gap-2 px-4 py-2.5 font-[var(--font-display)] text-sm tracking-wide transition-all duration-300 ${
              active === "cabinet"
                ? "bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-[var(--shadow-glow-cyan)]"
                : "glass-panel text-[var(--color-mist)] hover:text-white"
            }`}
          >
            {user ? (
              <Avatar user={user} size={16} className="text-[9px]" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                <circle cx="12" cy="8" r="3.4" />
                <path d="M4.5 20c1.4-3.6 4.4-5.5 7.5-5.5s6.1 1.9 7.5 5.5" strokeLinecap="round" />
              </svg>
            )}
            <span className="hidden sm:inline">Кабинет</span>
          </button>
        </div>
      </div>

      {/* status badge on small screens, under the main bar */}
      <div className="flex justify-center sm:hidden">
        <ServerStatusBadge />
      </div>
    </header>
  );
}
