"use client";

/**
 * "Инвентарь" card in the account: unopened cases (stacked, with single "Открыть" roulette or
 * mass open), rewards that dropped but haven't been claimed yet (with "Забрать/Активировать"),
 * and a searchable, filterable, paginated history of past openings.
 */
import { useCallback, useEffect, useState } from "react";
import { GAME_MODE_MAP } from "@/components/gameModes";
import { RARITIES, RARITY_MAP } from "@/lib/rarity";
import { ITEM_TYPE_MAP } from "@/lib/itemType";
import CaseRoulette from "@/components/cases/CaseRoulette";
import CaseBulkResult from "@/components/cases/CaseBulkResult";
import ItemIcon from "@/components/cases/ItemIcon";
import type { CaseHistoryEntry, CaseReward, InventoryCase } from "@/components/cases/types";

const HISTORY_PAGE_SIZE = 10;
const REWARDS_PAGE_SIZE = 6;
const MAX_BULK = 8;

export default function Inventory() {
  const [unopened, setUnopened] = useState<InventoryCase[]>([]);
  const [rewards, setRewards] = useState<CaseReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<{ userCaseId: number; caseName: string } | null>(null);
  const [bulk, setBulk] = useState<{ caseId: number; caseName: string; count: number } | null>(null);
  const [claiming, setClaiming] = useState<number | "all" | null>(null);
  const [bulkCounts, setBulkCounts] = useState<Record<string, number>>({});
  const [rewardsPage, setRewardsPage] = useState(1);

  // history + filters
  const [history, setHistory] = useState<CaseHistoryEntry[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [search, setSearch] = useState("");
  const [rarityFilter, setRarityFilter] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/cases/inventory", { cache: "no-store" });
      if (!res.ok) {
        setUnopened([]);
        setRewards([]);
        return;
      }
      const data = await res.json();
      setUnopened(data.unopened ?? []);
      setRewards(data.rewards ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({ page: String(historyPage) });
      if (search.trim()) params.set("search", search.trim());
      if (rarityFilter) params.set("rarity", rarityFilter);
      const res = await fetch(`/api/cases/history?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) {
        setHistory([]);
        setHistoryTotal(0);
        return;
      }
      const data = await res.json();
      setHistory(data.items ?? []);
      setHistoryTotal(data.total ?? 0);
      if (data.page && data.page !== historyPage) setHistoryPage(data.page);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPage, search, rarityFilter]);

  useEffect(() => {
    load();
  }, [load]);

  // Debounce history reloads so typing in search doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(loadHistory, 250);
    return () => clearTimeout(t);
  }, [loadHistory]);

  const refreshAll = useCallback(() => {
    load();
    loadHistory();
  }, [load, loadHistory]);

  const claim = async (target: number | "all") => {
    setClaiming(target);
    try {
      await fetch("/api/cases/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(target === "all" ? { all: true } : { userCaseId: target }),
      });
      refreshAll();
    } finally {
      setClaiming(null);
    }
  };

  const totalCases = unopened.reduce((sum, c) => sum + c.count, 0);
  const totalPages = Math.max(1, Math.ceil(historyTotal / HISTORY_PAGE_SIZE));
  const hasFilters = search.trim() !== "" || rarityFilter !== "";

  const rewardsPages = Math.max(1, Math.ceil(rewards.length / REWARDS_PAGE_SIZE));
  // Keep the current page in range as rewards get claimed.
  useEffect(() => {
    setRewardsPage((p) => Math.min(p, Math.max(1, Math.ceil(rewards.length / REWARDS_PAGE_SIZE))));
  }, [rewards.length]);
  const pagedRewards = rewards.slice(
    (rewardsPage - 1) * REWARDS_PAGE_SIZE,
    rewardsPage * REWARDS_PAGE_SIZE
  );

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
                const key = `${c.caseId}-${c.gameMode}`;
                const maxBulk = Math.min(c.count, MAX_BULK);
                const bulkCount = Math.min(maxBulk, Math.max(2, bulkCounts[key] ?? maxBulk));
                return (
                  <div
                    key={key}
                    className="flex flex-col gap-3 border border-white/10 p-4"
                    style={{ borderLeft: `2px solid ${meta?.accent ?? "#22d3ee"}` }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="pixel-corner-sm h-2.5 w-2.5 shrink-0"
                            style={{ background: meta?.gradient }}
                          />
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

                    {c.count > 1 && (
                      <div className="flex items-center gap-2 border-t border-white/5 pt-3">
                        <input
                          type="number"
                          min={2}
                          max={maxBulk}
                          value={bulkCount}
                          onChange={(e) =>
                            setBulkCounts((prev) => ({
                              ...prev,
                              [key]: Math.min(maxBulk, Math.max(2, Number(e.target.value) || 2)),
                            }))
                          }
                          className="w-16 border border-white/15 bg-black/30 px-2 py-1.5 text-sm text-white outline-none focus:border-cyan-400/50"
                        />
                        <button
                          onClick={() =>
                            setBulk({ caseId: c.caseId, caseName: c.caseName, count: bulkCount })
                          }
                          className="pixel-corner flex-1 border border-cyan-400/40 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition-colors hover:bg-cyan-400/10"
                        >
                          Открыть сразу
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {rewards.length > 0 && (
            <div className="mt-6 border-t border-white/10 pt-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide text-[var(--color-mist)]">
                  Награды к получению <span className="text-[var(--color-mist)]/60">({rewards.length})</span>
                </p>
                <button
                  onClick={() => claim("all")}
                  disabled={claiming !== null}
                  className="font-[var(--font-mono)] text-xs text-cyan-300 underline underline-offset-2 transition-colors hover:text-white disabled:opacity-50"
                >
                  Забрать всё
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {pagedRewards.map((r) => {
                  const meta = r.won_item_rarity ? RARITY_MAP[r.won_item_rarity] : null;
                  return (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-2 border p-3"
                      style={{
                        borderColor: meta ? `${meta.color}44` : "rgba(255,255,255,0.08)",
                        background: meta ? `linear-gradient(90deg, ${meta.color}14, transparent)` : undefined,
                      }}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        {r.won_item_rarity && (
                          <ItemIcon
                            imageUrl={r.won_item_image}
                            itemType={r.won_item_type ?? undefined}
                            rarity={r.won_item_rarity}
                            size={38}
                          />
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-sm text-white">
                            {r.won_item_name ?? "—"}
                          </span>
                          <span className="block font-[var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-mist)]">
                            {meta?.label}
                            {r.won_item_type ? ` · ${ITEM_TYPE_MAP[r.won_item_type].label}` : ""}
                          </span>
                        </span>
                      </span>
                      <button
                        onClick={() => claim(r.id)}
                        disabled={claiming !== null}
                        className="pixel-corner shrink-0 border border-cyan-400/40 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition-colors hover:bg-cyan-400/10 disabled:opacity-50"
                      >
                        Забрать
                      </button>
                    </div>
                  );
                })}
              </div>

              {rewardsPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-3">
                  <button
                    onClick={() => setRewardsPage((p) => Math.max(1, p - 1))}
                    disabled={rewardsPage <= 1}
                    className="border border-white/15 px-3 py-1.5 font-[var(--font-mono)] text-xs text-[var(--color-mist)] transition-colors hover:text-white disabled:opacity-40"
                  >
                    ← Назад
                  </button>
                  <span className="font-[var(--font-mono)] text-xs text-[var(--color-mist)]">
                    {rewardsPage} / {rewardsPages}
                  </span>
                  <button
                    onClick={() => setRewardsPage((p) => Math.min(rewardsPages, p + 1))}
                    disabled={rewardsPage >= rewardsPages}
                    className="border border-white/15 px-3 py-1.5 font-[var(--font-mono)] text-xs text-[var(--color-mist)] transition-colors hover:text-white disabled:opacity-40"
                  >
                    Вперёд →
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 border-t border-white/10 pt-5">
            <p className="mb-3 text-xs uppercase tracking-wide text-[var(--color-mist)]">История открытий</p>

            <div className="mb-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setHistoryPage(1);
                }}
                placeholder="Поиск по кейсу или предмету…"
                className="flex-1 border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-[var(--color-mist)]/50 focus:border-cyan-400/50"
              />
              <select
                value={rarityFilter}
                onChange={(e) => {
                  setRarityFilter(e.target.value);
                  setHistoryPage(1);
                }}
                className="border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
              >
                <option value="">Все редкости</option>
                {RARITIES.map((r) => (
                  <option key={r} value={r}>
                    {RARITY_MAP[r].label}
                  </option>
                ))}
              </select>
            </div>

            {historyLoading ? (
              <p className="text-sm text-[var(--color-mist)]">Загрузка…</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-[var(--color-mist)]">
                {hasFilters ? "Ничего не найдено по фильтрам." : "Пока нет открытых кейсов."}
              </p>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  {history.map((h) => {
                    const meta = h.won_item_rarity ? RARITY_MAP[h.won_item_rarity] : null;
                    return (
                      <div
                        key={h.id}
                        className="flex items-center justify-between gap-2 border border-white/5 px-3 py-2 text-sm"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          {h.won_item_rarity && (
                            <ItemIcon
                              imageUrl={h.won_item_image}
                              itemType={h.won_item_type ?? undefined}
                              rarity={h.won_item_rarity}
                              size={26}
                            />
                          )}
                          <span className="min-w-0 truncate text-[var(--color-mist)]">
                            {h.case_name} →{" "}
                            <span className="text-white" style={{ color: meta?.color }}>
                              {h.won_item_name ?? "—"}
                            </span>
                            {h.compensated && (
                              <span className="ml-2 text-amber-300">
                                (компенсация {Number(h.compensation_amount).toLocaleString("ru-RU")} монет)
                              </span>
                            )}
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

                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-center gap-3">
                    <button
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      disabled={historyPage <= 1}
                      className="border border-white/15 px-3 py-1.5 font-[var(--font-mono)] text-xs text-[var(--color-mist)] transition-colors hover:text-white disabled:opacity-40"
                    >
                      ← Назад
                    </button>
                    <span className="font-[var(--font-mono)] text-xs text-[var(--color-mist)]">
                      {historyPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))}
                      disabled={historyPage >= totalPages}
                      className="border border-white/15 px-3 py-1.5 font-[var(--font-mono)] text-xs text-[var(--color-mist)] transition-colors hover:text-white disabled:opacity-40"
                    >
                      Вперёд →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {opening && (
        <CaseRoulette
          userCaseId={opening.userCaseId}
          caseName={opening.caseName}
          onClose={() => {
            setOpening(null);
            refreshAll();
          }}
          onOpened={refreshAll}
        />
      )}

      {bulk && (
        <CaseBulkResult
          caseId={bulk.caseId}
          caseName={bulk.caseName}
          count={bulk.count}
          onClose={() => {
            setBulk(null);
            refreshAll();
          }}
          onOpened={refreshAll}
        />
      )}
    </div>
  );
}
