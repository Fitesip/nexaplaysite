/** Cart shortcut icon, with a badge showing the number of items inside. */
export default function CartNavButton({
  active,
  itemCount,
  onClick,
}: {
  active: boolean;
  itemCount: number;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} aria-label="Корзина" className="relative flex h-10 w-10 items-center justify-center">
      <span
        className={`pixel-corner absolute inset-0 flex items-center justify-center transition-all duration-300 ${
          active
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
      {itemCount > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 px-1 font-[var(--font-mono)] text-[10px] font-bold text-white">
          {itemCount}
        </span>
      )}
    </button>
  );
}
