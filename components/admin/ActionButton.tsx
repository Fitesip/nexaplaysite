import type { ReactNode } from "react";

/** A small outlined button for row-level moderation actions (ban, promote, etc.), color-coded by severity. */
export default function ActionButton({
  onClick,
  busy,
  tone,
  children,
}: {
  onClick: () => void;
  busy: boolean;
  tone: "danger" | "warning" | "neutral";
  children: ReactNode;
}) {
  const toneClass =
    tone === "danger"
      ? "hover:border-rose-400/50 hover:text-rose-300"
      : tone === "warning"
        ? "hover:border-amber-400/50 hover:text-amber-300"
        : "hover:border-cyan-400/50 hover:text-white";
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`border border-white/15 px-3 py-1.5 text-xs text-[var(--color-mist)] transition-colors duration-300 disabled:opacity-50 ${toneClass}`}
    >
      {children}
    </button>
  );
}
