/** One clickable category filter chip (e.g. "Все", "Обсуждения", "Баги"). */
export default function CategoryPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`pixel-corner px-4 py-2 font-[var(--font-display)] text-sm tracking-wide transition-all duration-300 ${
        active
          ? "bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-[var(--shadow-glow-cyan)]"
          : "glass-panel text-[var(--color-mist)] hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}
