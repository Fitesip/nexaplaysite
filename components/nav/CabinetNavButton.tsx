import Avatar from "@/components/Avatar";
import type { CurrentUser } from "@/lib/auth-context";
import { formatRubleBalance } from "@/lib/rubleBalance";

/** Cabinet shortcut: a generic person icon when logged out, the user's avatar once logged in. */
export default function CabinetNavButton({
  active,
  user,
  onClick,
}: {
  active: boolean;
  user: CurrentUser | null;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`pixel-corner flex items-center gap-2 px-4 py-2.5 font-[var(--font-display)] text-sm tracking-wide transition-all duration-300 ${
        active
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
      <span className="hidden sm:inline">{user ? user.username : "Кабинет"}</span>
      {user && (
        <span className="font-[var(--font-mono)] text-[11px] text-cyan-300">
          {formatRubleBalance(user.balance_kopecks)}
        </span>
      )}
    </button>
  );
}
