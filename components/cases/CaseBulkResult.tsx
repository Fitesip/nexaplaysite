"use client";

/** Overlay that opens several cases at once (POST /api/cases/open-bulk) and shows every drop in a
 *  grid — no reel, since mass opening is the "skip the animation" path by design. */
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { RARITY_MAP, sortByRarity } from "@/lib/rarity";
import { ITEM_TYPE_MAP } from "@/lib/itemType";
import ItemIcon from "./ItemIcon";
import type { BulkOpenResult } from "./types";

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
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<"loading" | "done" | "error">("loading");
  const [error, setError] = useState("");
  const [results, setResults] = useState<BulkOpenResult[]>([]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/cases/open-bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseId, count }),
        });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) {
          setError(data?.error ?? "Не удалось открыть кейсы");
          setPhase("error");
          return;
        }
        setResults(data.results ?? []);
        setPhase("done");
        onOpened();
      } catch {
        if (!cancelled) {
          setError("Не удалось открыть кейсы");
          setPhase("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseId, count, onOpened]);

  const sorted = useMemo(() => sortByRarity(results), [results]);

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

        {phase === "done" && (
          <>
            <p className="mt-2 text-sm text-[var(--color-mist)]">
              Открыто кейсов: <span className="text-white">{results.length}</span>
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {sorted.map((r, idx) => {
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
                  </div>
                );
              })}
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
      </div>
    </div>,
    document.body
  );
}
