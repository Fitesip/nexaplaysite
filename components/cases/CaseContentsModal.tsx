"use client";

/** Read-only preview of a case's loot pool (name + rarity + drop chance), opened from the
 *  catalog card so a shopper can see what's inside before buying. */
import { useEffect, useMemo, useState } from "react";
import { RARITY_MAP } from "@/lib/rarity";
import type { CaseLootItem } from "./types";

export default function CaseContentsModal({
  caseId,
  caseName,
  onClose,
}: {
  caseId: number;
  caseName: string;
  onClose: () => void;
}) {
  const [items, setItems] = useState<CaseLootItem[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/cases/${caseId}/contents`, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Не удалось загрузить содержимое");
        return d;
      })
      .then((d) => setItems(d.items ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"));
  }, [caseId]);

  const sorted = useMemo(() => (items ? [...items].sort((a, b) => b.chance - a.chance) : []), [items]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="glass-panel pixel-corner relative w-full max-w-lg p-6">
        <button
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute right-4 top-4 text-[var(--color-mist)] transition-colors hover:text-rose-300"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>

        <h3 className="font-[var(--font-display)] text-lg font-bold text-white">{caseName}</h3>
        <p className="mt-1 text-xs text-[var(--color-mist)]">Возможные предметы и шанс выпадения</p>

        {error ? (
          <p className="mt-6 text-sm text-rose-400">{error}</p>
        ) : items === null ? (
          <p className="mt-6 text-sm text-[var(--color-mist)]">Загрузка…</p>
        ) : sorted.length === 0 ? (
          <p className="mt-6 text-sm text-[var(--color-mist)]">Содержимое кейса пока не настроено.</p>
        ) : (
          <div className="mt-5 flex max-h-[60vh] flex-col gap-1.5 overflow-y-auto">
            {sorted.map((item) => {
              const meta = RARITY_MAP[item.rarity];
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between border border-white/5 px-3 py-2"
                  style={{ background: `linear-gradient(90deg, ${meta.color}14, transparent)` }}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0" style={{ background: meta.color }} />
                    <span className="truncate text-sm text-white">{item.name}</span>
                    <span
                      className="shrink-0 font-[var(--font-mono)] text-[10px] uppercase tracking-wide"
                      style={{ color: meta.color }}
                    >
                      {meta.label}
                    </span>
                  </span>
                  <span className="ml-3 shrink-0 font-[var(--font-mono)] text-xs" style={{ color: meta.color }}>
                    {(item.chance * 100).toFixed(item.chance < 0.01 ? 2 : 1)}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
