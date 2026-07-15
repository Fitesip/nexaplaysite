"use client";

/** Admin modal showing a case's opening statistics: total opens and the distribution of dropped
 *  items (actual % vs. configured %), so admins can sanity-check that the odds play out fairly.
 *  Reads GET /api/admin/cases/:id/stats. */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { RARITY_MAP, type Rarity } from "@/lib/rarity";
import { ITEM_TYPE_MAP, type ItemType } from "@/lib/itemType";

type DistRow = {
  name: string;
  rarity: Rarity;
  itemType: ItemType | null;
  count: number;
  actual: number;
  expected: number | null;
};

export default function CaseStatsModal({
  caseId,
  caseName,
  onClose,
}: {
  caseId: number;
  caseName: string;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [totalOpened, setTotalOpened] = useState(0);
  const [distribution, setDistribution] = useState<DistRow[]>([]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    fetch(`/api/admin/cases/${caseId}/stats`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setTotalOpened(d.totalOpened ?? 0);
        setDistribution(d.distribution ?? []);
      })
      .finally(() => setLoading(false));
  }, [caseId]);

  if (!mounted) return null;

  const pct = (v: number) => `${(v * 100).toFixed(v < 0.01 && v > 0 ? 2 : 1)}%`;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
      <div className="glass-panel pixel-corner relative my-auto flex max-h-[88vh] w-full max-w-2xl flex-col overflow-y-auto p-6">
        <button
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute right-4 top-4 text-[var(--color-mist)] transition-colors hover:text-rose-300"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>

        <h3 className="font-[var(--font-display)] text-lg font-bold text-white">Статистика открытий</h3>
        <p className="mt-1 text-xs text-[var(--color-mist)]">«{caseName}»</p>

        {loading ? (
          <p className="mt-6 text-sm text-[var(--color-mist)]">Загрузка…</p>
        ) : (
          <>
            <p className="mt-4 text-sm text-white">
              Всего открытий: <span className="font-[var(--font-mono)] text-cyan-300">{totalOpened}</span>
            </p>

            {distribution.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--color-mist)]">Этот кейс ещё не открывали.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 font-[var(--font-mono)] text-[11px] uppercase tracking-wide text-[var(--color-mist)]">
                      <th className="py-2 pr-2">Предмет</th>
                      <th className="px-2 py-2 text-right">Выпало</th>
                      <th className="px-2 py-2 text-right">Факт %</th>
                      <th className="py-2 pl-2 text-right">Ожид. %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {distribution.map((d, i) => {
                      const meta = RARITY_MAP[d.rarity];
                      return (
                        <tr key={`${d.name}-${i}`} className="border-b border-white/5">
                          <td className="py-2 pr-2">
                            <span className="flex items-center gap-2">
                              <span className="h-2 w-2 shrink-0" style={{ background: meta.color }} />
                              <span className="text-white">{d.name}</span>
                              {d.itemType && (
                                <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-mist)]">
                                  {ITEM_TYPE_MAP[d.itemType].label}
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-right font-[var(--font-mono)] text-white">{d.count}</td>
                          <td className="px-2 py-2 text-right font-[var(--font-mono)]" style={{ color: meta.color }}>
                            {pct(d.actual)}
                          </td>
                          <td className="py-2 pl-2 text-right font-[var(--font-mono)] text-[var(--color-mist)]">
                            {d.expected === null ? "—" : pct(d.expected)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
