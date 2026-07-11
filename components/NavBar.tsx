"use client";

import { useEffect, useRef, useState } from "react";
import type { SectionId } from "./sections";
import { ServerStatusBadge } from "./ServerStatus";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { useAdminChats } from "@/lib/admin-chats-context";
import NotificationBell from "./NotificationBell";
import Avatar from "./Avatar";
import { GAME_MODES, GAME_MODE_MAP, withAlpha, type GameMode } from "./gameModes";

const NAV_AFTER_CATALOG: { id: SectionId; label: string }[] = [
  { id: "news", label: "Новости" },
  { id: "forum", label: "Форум" },
  { id: "tips", label: "Рекомендации" },
  { id: "faq", label: "FAQ" },
  { id: "contact", label: "Связь" },
];

export default function NavBar({
  active,
  onChange,
  mode,
  onSelectMode,
}: {
  active: SectionId;
  onChange: (id: SectionId) => void;
  mode: GameMode;
  onSelectMode: (mode: GameMode) => void;
}) {
  const navRef = useRef<HTMLElement | null>(null);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [pill, setPill] = useState({ left: 0, width: 0, visible: false });
  const { totalCount } = useCart();
  const { user } = useAuth();
  const { unreadTotal: supportUnread } = useAdminChats();
  const role = user?.role ?? null;
  const isStaff = role === "helper" || role === "admin" || role === "main_admin";

  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const catalogBtnRef = useRef<HTMLButtonElement | null>(null);
  const menuPanelRef = useRef<HTMLDivElement | null>(null);
  const [menuAnchor, setMenuAnchor] = useState({ top: 0, left: 0 });

  // measure a nav button's position relative to the nav bar itself, via getBoundingClientRect
  // rather than offsetLeft/offsetWidth — robust regardless of how elements are nested/positioned.
  const measure = (id: string) => {
    const nav = navRef.current;
    const el = refs.current[id];
    if (!nav || !el) return null;
    const navRect = nav.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    return { left: elRect.left - navRect.left, width: elRect.width };
  };

  useEffect(() => {
    if (!modeMenuOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (catalogBtnRef.current?.contains(target)) return;
      if (menuPanelRef.current?.contains(target)) return;
      setModeMenuOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModeMenuOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [modeMenuOpen]);

  // The dropdown is rendered outside <nav> (which clips its contents via the pixel-corner
  // clip-path), so it's positioned in fixed/viewport coordinates instead of relative to nav.
  useEffect(() => {
    if (!modeMenuOpen) return;
    const update = () => {
      const el = catalogBtnRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setMenuAnchor({ top: rect.bottom + 8, left: rect.left + rect.width / 2 });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [modeMenuOpen]);

  const pillIds: SectionId[] = ["catalog", "home", ...NAV_AFTER_CATALOG.map((n) => n.id)];
  const activeInPill = pillIds.includes(active);

  useEffect(() => {
    if (!activeInPill) {
      setPill((p) => ({ ...p, visible: false }));
      return;
    }
    const rect = measure(active);
    if (rect) setPill({ ...rect, visible: true });
    // `mode` isn't used directly here, but when `active === "catalog"` the button's
    // label switches between "Каталог" and the mode name (e.g. "Bloodborne"), which
    // changes its rendered width — so the pill needs to re-measure on mode changes too.
  }, [active, activeInPill, mode]);

  useEffect(() => {
    const onResize = () => {
      if (!activeInPill) return;
      const rect = measure(active);
      if (rect) setPill({ ...rect, visible: true });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [active, activeInPill]);

  const activeMeta = GAME_MODE_MAP[mode];

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
        <nav ref={navRef} className="glass-panel pixel-corner relative flex items-center gap-1 px-2 py-2 justify-self-center shadow-[0_0_30px_rgba(80,20,140,0.25)]">
          <div
            className="nav-pill pixel-corner absolute top-2 bottom-2 rounded-none"
            style={{
              left: pill.left,
              width: pill.width,
              opacity: pill.visible ? 1 : 0,
              background:
                active === "catalog"
                  ? withAlpha(activeMeta.gradient, 0.45)
                  : "linear-gradient(to right, rgba(124, 58, 237, 0.7), rgba(6, 182, 212, 0.7))",
            }}
          />

          <button
            ref={(el) => {
              refs.current.home = el;
            }}
            onClick={() => onChange("home")}
            className={`relative z-10 whitespace-nowrap px-4 py-2 font-[var(--font-display)] text-sm tracking-wide transition-colors duration-300 ${
              active === "home" ? "text-white" : "text-[var(--color-mist)] hover:text-white"
            }`}
          >
            Главная
          </button>

          {/* Catalog -> game-mode dropdown trigger (the menu itself is rendered outside
              <nav> below, since nav's pixel-corner clip-path would otherwise clip it) */}
          <button
            ref={(el) => {
              refs.current.catalog = el;
              catalogBtnRef.current = el;
            }}
            onClick={() => setModeMenuOpen((v) => !v)}
            className={`relative z-10 flex items-center gap-1.5 whitespace-nowrap px-4 py-2 font-[var(--font-display)] text-sm tracking-wide transition-colors duration-300 ${
              active === "catalog" ? "text-white" : "text-[var(--color-mist)] hover:text-white"
            }`}
          >
            {active === "catalog" ? activeMeta.label : "Каталог"}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`h-3 w-3 shrink-0 transition-transform duration-300 ${modeMenuOpen ? "rotate-180" : ""}`}
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {NAV_AFTER_CATALOG.map((item) => (
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

      {/* Game-mode dropdown menu — deliberately a standalone fixed block, not nested inside
          <nav>, because nav's pixel-corner clip-path would otherwise clip it and make it
          invisible even while "open". */}
      <div
        ref={menuPanelRef}
        className={`glass-panel pixel-corner fixed z-[60] w-64 overflow-hidden border border-white/10 py-2 shadow-2xl transition-all duration-200 ${
          modeMenuOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"
        }`}
        style={{ top: menuAnchor.top, left: menuAnchor.left, transform: "translateX(-50%)" }}
      >
        {GAME_MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => {
              onSelectMode(m.id);
              onChange("catalog");
              setModeMenuOpen(false);
            }}
            className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-200 hover:bg-white/5 ${
              mode === m.id && active === "catalog" ? "bg-white/5" : ""
            }`}
          >
            <span className="h-6 w-6 shrink-0 pixel-corner-sm" style={{ background: m.gradient }} />
            <span className="min-w-0">
              <span className="block font-[var(--font-display)] text-sm font-semibold text-white">{m.label}</span>
              <span className="block truncate text-xs text-[var(--color-mist)]">{m.tagline}</span>
            </span>
          </button>
        ))}
      </div>

      {/* status badge on small screens, under the main bar */}
      <div className="flex justify-center sm:hidden">
        <ServerStatusBadge />
      </div>
    </header>
  );
}
