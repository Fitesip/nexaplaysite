/** Staff-only shortcut to the role-appropriate management panel. */
export default function AdminNavButton({
  active,
  role,
  unreadCount,
  onClick,
}: {
  active: boolean;
  role: "rcon" | "helper" | "admin" | "main_admin";
  unreadCount: number;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} aria-label="Панель управления" className="relative flex items-center">
      <span
        className={`pixel-corner flex items-center gap-2 px-4 py-2.5 font-[var(--font-display)] text-sm tracking-wide transition-all duration-300 ${
          active
            ? "bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-[var(--shadow-glow-cyan)]"
            : "glass-panel text-[var(--color-mist)] hover:text-white"
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
          <path d="M12 3l7 3v5c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="hidden sm:inline">
          {role === "rcon" ? "RCON" : role === "helper" ? "Хелпер-панель" : "Админ-панель"}
        </span>
      </span>
      {unreadCount > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 px-1 font-[var(--font-mono)] text-[10px] font-bold text-white">
          {unreadCount}
        </span>
      )}
    </button>
  );
}
