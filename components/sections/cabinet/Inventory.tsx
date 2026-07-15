"use client";

/**
 * "Инвентарь" card in the account: shows the cases the player bought but hasn't opened
 * yet (stacked by type, with an "Открыть" button that launches the roulette), plus a
 * history of already-opened cases and what dropped from each.
 */
import { useCallback, useEffect, useState } from "react";
import { GAME_MODE_MAP } from "@/components/gameModes";
import { RARITY_MAP } from "@/lib/rarity";
import CaseRoulette from "@/components/cases/CaseRoulette";
import type { CaseHistoryEntry, InventoryCase } from "@/components/cases/types";

export default function Inventory() {
  const [unopened, setUnopened] = useState<InventoryCase[]>([]);
  const [history, setHistory] = useState<CaseHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<{ userCaseId: number; caseName: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/cases/inventory", { cache: "no-store" });
      if (!res.ok) {
        setUnopened([]);
        setHistory([]);
        return;
      }
      const data = await res.json();
      setUnopened(data.unopened ?? []);
      setHistory(data.history ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalCases = unopened.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="glass-panel pixel-corner mt-6 p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-[var(--font-display)] text-base font-semibold text-white">Инвентарь · Кейсы</h3>
        {totalCases > 0 && (
          <span className="font-[var(--font-mono)] text-xs text-[var(--color-mist)]">
            Не открыто: {totalCases}
          </span>
        )}
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-[var(--color-mist)]">Загрузка…</p>
      ) : (
        <>
          {unopened.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--color-mist)]">
              У вас нет кейсов. Загляните в каталог — кейсы падают в инвентарь после покупки.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {unopened.map((c) => {
                const meta = GAME_MODE_MAP[c.gameMode];
                return (
                  <div
                    key={`${c.caseId}-${c.gameMode}`}
                    className="flex items-center justify-between gap-3 border border-white/10 p-4"
                    style={{ borderLeft: `2px solid ${meta?.accent ?? "#22d3ee"}` }}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="pixel-corner-sm h-2.5 w-2.5 shrink-0" style={{ background: meta?.gradient }} />
                        <span className="truncate font-[var(--font-display)] text-sm font-semibold text-white">
                          {c.caseName}
                        </span>
                      </div>
                      <span className="mt-1 block font-[var(--font-mono)] text-xs text-[var(--color-mist)]">
                        × {c.count}
                      </span>
                    </div>
                    <button
                      onClick={() => setOpening({ userCaseId: c.nextId, caseName: c.caseName })}
                      className="pixel-corner shrink-0 bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-glow-cyan)] transition-transform duration-300 hover:scale-[1.03]"
                    >
                      Открыть
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {history.length > 0 && (
            <div className="mt-6 border-t border-white/10 pt-5">
              <p className="mb-3 text-xs uppercase tracking-wide text-[var(--color-mist)]">История открытий</p>
              <div className="flex flex-col gap-1.5">
                {history.map((h) => {
                  const meta = h.won_item_rarity ? RARITY_MAP[h.won_item_rarity] : null;
                  return (
                    <div
                      key={h.id}
                      className="flex items-center justify-between gap-2 border border-white/5 px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate text-[var(--color-mist)]">
                        {h.case_name} →{" "}
                        <span className="text-white" style={{ color: meta?.color }}>
                          {h.won_item_name ?? "—"}
                        </span>
                      </span>
                      <span className="shrink-0 font-[var(--font-mono)] text-[11px] text-[var(--color-mist)]/70">
                        {h.opened_at
                          ? new Date(h.opened_at).toLocaleDateString("ru-RU", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })
                          : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {opening && (
        <CaseRoulette
          userCaseId={opening.userCaseId}
          caseName={opening.caseName}
          onClose={() => {
            setOpening(null);
            load();
          }}
          onOpened={() => {
            // refresh in the background so counts/history update behind the overlay
            load();
          }}
        />
      )}
    </div>
  );
}
