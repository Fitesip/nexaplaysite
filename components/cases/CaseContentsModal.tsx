"use client";

/** Read-only preview of a case's loot pool (name + rarity + drop chance), opened from the
 *  catalog card so a shopper can see what's inside before buying. */
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { RARITY_MAP, sortByRarity } from "@/lib/rarity";
import { ITEM_TYPE_MAP } from "@/lib/itemType";
import ItemIcon from "./ItemIcon";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

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

  const sorted = useMemo(() => (items ? sortByRarity(items) : []), [items]);

  if (!mounted) return null;

  return createPortal(
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
                  <span className="flex min-w-0 items-center gap-2.5">
                    <ItemIcon imageUrl={item.imageUrl} itemType={item.itemType} rarity={item.rarity} size={34} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm text-white">{item.name}</span>
                        {item.isUnique && (
                          <span className="shrink-0 border border-amber-400/50 px-1 font-[var(--font-mono)] text-[9px] uppercase tracking-wide text-amber-300">
                            уник
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5">
                        <span
                          className="font-[var(--font-mono)] text-[10px] uppercase tracking-wide"
                          style={{ color: meta.color }}
                        >
                          {meta.label}
                        </span>
                        {item.itemType && (
                          <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-mist)]">
                            · {ITEM_TYPE_MAP[item.itemType].label}
                          </span>
                        )}
                      </span>
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
    </div>,
    document.body
  );
}
