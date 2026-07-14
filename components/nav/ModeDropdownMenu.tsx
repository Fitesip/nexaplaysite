import type { RefObject } from "react";
import { GAME_MODES, type GameMode } from "@/components/gameModes";

/**
 * The dropdown list of game modes (Terryx / Bloodborne / Heaven / Games).
 * Rendered as a standalone fixed-position block — see useModeDropdown's doc
 * comment for why it can't live inside `<nav>`.
 */
export default function ModeDropdownMenu({
  open,
  anchor,
  panelRef,
  activeMode,
  isOnCatalog,
  onSelect,
}: {
  open: boolean;
  anchor: { top: number; left: number };
  panelRef: RefObject<HTMLDivElement | null>;
  activeMode: GameMode;
  isOnCatalog: boolean;
  onSelect: (mode: GameMode) => void;
}) {
  return (
    <div
      ref={panelRef}
      className={`glass-panel pixel-corner fixed z-[60] w-64 overflow-hidden border border-white/10 py-2 shadow-2xl transition-all duration-200 ${
        open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"
      }`}
      style={{ top: anchor.top, left: anchor.left, transform: "translateX(-50%)" }}
    >
      {GAME_MODES.map((m) => (
        <button
          key={m.id}
          onClick={() => onSelect(m.id)}
          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-200 hover:bg-white/5 ${
            activeMode === m.id && isOnCatalog ? "bg-white/5" : ""
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
  );
}
