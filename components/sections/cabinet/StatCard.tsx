/** A single small tile on the profile card, e.g. "Донат-баланс: 0 ₽". */
export default function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-black/20 p-3">
      <div className="font-[var(--font-display)] text-sm font-semibold text-white">{value}</div>
      <div className="mt-1 text-[11px] text-[var(--color-mist)]">{label}</div>
    </div>
  );
}
