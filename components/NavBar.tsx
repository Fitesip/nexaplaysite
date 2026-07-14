"use client";

import type { SectionId } from "./sections";
import { ServerStatusBadge } from "./ServerStatus";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { useAdminChats } from "@/lib/admin-chats-context";
import NotificationBell from "./NotificationBell";
import { GAME_MODE_MAP, withAlpha, type GameMode } from "./gameModes";
import { useSlidingPill } from "./nav/useSlidingPill";
import { useModeDropdown } from "./nav/useModeDropdown";
import ModeDropdownMenu from "./nav/ModeDropdownMenu";
import AdminNavButton from "./nav/AdminNavButton";
import CartNavButton from "./nav/CartNavButton";
import CabinetNavButton from "./nav/CabinetNavButton";

/** Plain nav links rendered after the catalog dropdown, in order. */
const NAV_AFTER_CATALOG: { id: SectionId; label: string }[] = [
  { id: "news", label: "Новости" },
  { id: "forum", label: "Форум" },
  { id: "tips", label: "Рекомендации" },
  { id: "faq", label: "FAQ" },
  { id: "contact", label: "Связь" },
];

/** All section ids that live inside the sliding-pill nav bar (as opposed to the icon buttons on the right). */
const PILL_SECTION_IDS: SectionId[] = ["catalog", "home", ...NAV_AFTER_CATALOG.map((n) => n.id)];

/**
 * Site header: logo + server-status badge, the center pill nav (with the
 * catalog section replaced by a game-mode dropdown), and the cart/admin/
 * cabinet icon buttons on the right.
 */
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
  const { totalCount } = useCart();
  const { user } = useAuth();
  const { unreadTotal: supportUnread } = useAdminChats();
  const role = user?.role ?? null;
  const isStaff = role === "helper" || role === "admin" || role === "main_admin";

  const isPillSection = PILL_SECTION_IDS.includes(active);
  // `mode` is passed as an extra dependency because the catalog button's label switches
  // between "Каталог" and the mode name, which changes its rendered width.
  const { navRef, registerButton, pill } = useSlidingPill(active, isPillSection, mode);
  const dropdown = useModeDropdown();

  const activeMeta = GAME_MODE_MAP[mode];

  const selectMode = (m: GameMode) => {
    onSelectMode(m);
    onChange("catalog");
    dropdown.close();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex flex-col gap-3 px-4 pt-4 sm:px-6">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        {/* Logo + status */}
        <div className="flex items-center gap-3 justify-self-start">
          <button
            onClick={() => onChange("home")}
            className="pixel-corner flex items-center gap-2 px-4 py-2.5 font-[var(--font-display)] text-sm tracking-wide transition-all duration-300 glass-panel text-[var(--color-mist)] hover:text-white"
            aria-label="NEXAPLAY — на главную"
          >
            <span className="relative h-8 w-8 overflow-hidden">
              <img src="/logo.png" alt="logo" className="h-8 w-8" />
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
        <nav
          ref={navRef}
          className="glass-panel pixel-corner relative flex items-center gap-1 px-2 py-2 justify-self-center shadow-[0_0_30px_rgba(80,20,140,0.25)]"
        >
          {/* sliding highlight behind whichever section is active; tinted with the
              current game mode's gradient while on the catalog section */}
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
            ref={registerButton("home")}
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
              registerButton("catalog")(el);
              dropdown.triggerRef.current = el;
            }}
            onClick={dropdown.toggle}
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
              className={`h-3 w-3 shrink-0 transition-transform duration-300 ${dropdown.open ? "rotate-180" : ""}`}
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {NAV_AFTER_CATALOG.map((item) => (
            <button
              key={item.id}
              ref={registerButton(item.id)}
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
            <AdminNavButton
              active={active === "admin"}
              role={role as "helper" | "admin" | "main_admin"}
              unreadCount={supportUnread}
              onClick={() => onChange("admin")}
            />
          )}

          {user && <NotificationBell />}

          <CartNavButton active={active === "cart"} itemCount={totalCount} onClick={() => onChange("cart")} />

          <CabinetNavButton active={active === "cabinet"} user={user} onClick={() => onChange("cabinet")} />
        </div>
      </div>

      <ModeDropdownMenu
        open={dropdown.open}
        anchor={dropdown.anchor}
        panelRef={dropdown.panelRef}
        activeMode={mode}
        isOnCatalog={active === "catalog"}
        onSelect={selectMode}
      />

      {/* status badge on small screens, under the main bar */}
      <div className="flex justify-center sm:hidden">
        <ServerStatusBadge />
      </div>
    </header>
  );
}
