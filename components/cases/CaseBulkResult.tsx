"use client";

/** Overlay that opens several cases at once (POST /api/cases/open-bulk) and plays a roulette reel
 *  for every drop. The winners are decided server-side; each reel just lands on its result. A
 *  "skip all" button snaps every reel straight to the drop. */
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RARITY_MAP, sortByRarity } from "@/lib/rarity";
import { ITEM_TYPE_MAP } from "@/lib/itemType";
import ItemIcon from "./ItemIcon";
import CaseReel from "./CaseReel";
import type { BulkOpenResult, CaseLootItem } from "./types";
import { useAuth } from "@/lib/auth-context";

export default function CaseBulkResult({
  caseId,
  caseName,
  count,
  onClose,
  onOpened,
}: {
  caseId: number;
  caseName: string;
  count: number;
  onClose: () => void;
  onOpened: () => void;
}) {
  const { user, setUser } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<"loading" | "spinning" | "error">("loading");
  const [error, setError] = useState("");
  const [results, setResults] = useState<BulkOpenResult[]>([]);
  const [pool, setPool] = useState<CaseLootItem[]>([]);
  const [skipAll, setSkipAll] = useState(false);
  const [settledCount, setSettledCount] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => setMounted(true), []);

  // Fire the bulk-open request exactly once. Without this guard a re-render (or React's
  // StrictMode double-mount) would POST twice — the second call finds no unopened cases
  // left and fails with "Нет доступных кейсов для открытия".
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const res = await fetch("/api/cases/open-bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseId, count }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setError(data?.error ?? "Не удалось открыть кейсы");
          setPhase("error");
          return;
        }
        setResults(data.results ?? []);
        setPool(data.items ?? []);
        if (user) {
          setUser({ ...user, game_currency: Number(data.balance ?? user.game_currency) });
        }
        setPhase("spinning");
        onOpened();
      } catch {
        setError("Не удалось открыть кейсы");
        setPhase("error");
      }
    })();
  }, [caseId, count, onOpened, user, setUser]);

  const allSettled = results.length > 0 && settledCount >= results.length;
  const summary = useMemo(() => sortByRarity(results), [results]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
      <div className="glass-panel pixel-corner relative my-auto flex max-h-[92vh] w-full max-w-2xl flex-col overflow-y-auto p-6 sm:p-8">
        <button
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute right-4 top-4 text-[var(--color-mist)] transition-colors hover:text-rose-300"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>

        <h3 className="font-[var(--font-display)] text-xl font-bold text-white">{caseName}</h3>

        {phase === "loading" && (
          <p className="mt-6 text-center text-sm text-[var(--color-mist)]">Открываем кейсы…</p>
        )}

        {phase === "error" && (
          <div className="mt-6 text-center">
            <p className="text-sm text-rose-400">{error}</p>
            <button
              onClick={onClose}
              className="pixel-corner mt-5 border border-white/15 px-6 py-2 text-sm text-[var(--color-mist)] transition-colors hover:text-white"
            >
              Закрыть
            </button>
          </div>
        )}

        {phase === "spinning" && (
          <>
            <p className="mt-2 text-sm text-[var(--color-mist)]">
              Открыто кейсов: <span className="text-white">{results.length}</span>
            </p>

            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {results.map((r, idx) => (
                <CaseReel
                  key={r.userCaseId}
                  pool={pool}
                  won={r}
                  skip={skipAll}
                  spinDelay={skipAll ? 0 : idx * 220}
                  onSettled={() => setSettledCount((n) => n + 1)}
                />
              ))}
            </div>

            {!allSettled && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => setSkipAll(true)}
                  className="border border-white/15 px-5 py-1.5 font-[var(--font-mono)] text-xs uppercase tracking-wide text-[var(--color-mist)] transition-colors hover:border-cyan-400/50 hover:text-white"
                >
                  Пропустить анимацию
                </button>
              </div>
            )}

            {allSettled && (
              <>
                <div className="mt-7 border-t border-white/10 pt-5">
                  <p className="mb-3 text-xs uppercase tracking-wide text-[var(--color-mist)]">
                    Ваши награды
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {summary.map((r, idx) => {
                      const meta = RARITY_MAP[r.rarity];
                      return (
                        <div
                          key={`${r.userCaseId}-${idx}`}
                          className="case-drop flex flex-col items-center gap-1.5 border p-3 text-center"
                          style={{
                            borderColor: `${meta.color}55`,
                            background: `linear-gradient(180deg, ${meta.color}1c, transparent)`,
                          }}
                        >
                          <ItemIcon imageUrl={r.imageUrl} itemType={r.itemType} rarity={r.rarity} size={44} />
                          <span className="line-clamp-2 text-xs font-medium text-white">{r.name}</span>
                          <span
                            className="font-[var(--font-mono)] text-[10px] uppercase tracking-wide"
                            style={{ color: meta.color }}
                          >
                            {meta.label}
                          </span>
                          <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-mist)]">
                            {ITEM_TYPE_MAP[r.itemType].label}
                          </span>
                          {r.compensated && (
                            <span className="font-[var(--font-mono)] text-[9px] text-amber-300">
                              Компенсация: {r.compensationAmount.toLocaleString("ru-RU")} монет
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={onClose}
                    className="pixel-corner bg-gradient-to-r from-violet-600 to-cyan-500 px-8 py-2.5 font-[var(--font-display)] text-sm font-semibold text-white shadow-[var(--shadow-glow-cyan)] transition-transform duration-300 hover:scale-[1.02]"
                  >
                    Забрать всё
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
