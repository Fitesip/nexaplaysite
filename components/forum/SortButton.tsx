/** One clickable sort-order option (e.g. "Новые", "Популярные"). */
export default function SortButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 uppercase tracking-wide transition-colors duration-300 ${
        active ? "text-cyan-300" : "text-[var(--color-mist)]/70 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}
