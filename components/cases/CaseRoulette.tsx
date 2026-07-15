"use client";

/**
 * The case-opening overlay: a CS:GO-style horizontal reel that scrolls a long strip
 * of loot tiles, decelerates, and lands the centre marker exactly on the item the
 * server rolled. The winner is decided server-side (POST /api/cases/open) — the reel
 * is purely presentational, built so the pre-chosen winner sits under the marker.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { RARITY_MAP, type Rarity } from "@/lib/rarity";
import type { CaseLootItem } from "./types";

type OpenResult = {
  won: { id: number; name: string; rarity: Rarity };
  items: CaseLootItem[];
  caseName: string;
};

// Tile geometry (px). Kept in JS so the landing offset can be computed exactly.
const TILE_WIDTH = 132;
const TILE_GAP = 12;
const STRIDE = TILE_WIDTH + TILE_GAP;
const REEL_LENGTH = 60; // total tiles on the strip
const WINNER_INDEX = 52; // where the winning tile is placed near the end of the strip

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function CaseRoulette({
  userCaseId,
  caseName,
  onClose,
  onOpened,
}: {
  userCaseId: number;
  caseName: string;
  onClose: () => void;
  onOpened: () => void;
}) {
  const [phase, setPhase] = useState<"loading" | "spinning" | "done" | "error">("loading");
  const [error, setError] = useState("");
  const [result, setResult] = useState<OpenResult | null>(null);
  const [reel, setReel] = useState<CaseLootItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  // Fire the open request once, build the reel around the winner, then trigger the spin.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const res = await fetch("/api/cases/open", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userCaseId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Не удалось открыть кейс");

        const pool: CaseLootItem[] = data.items;
        const won = data.won as OpenResult["won"];

        // Build the strip: random tiles everywhere, the real winner locked at WINNER_INDEX.
        const strip: CaseLootItem[] = Array.from({ length: REEL_LENGTH }, () => pickRandom(pool));
        strip[WINNER_INDEX] = pool.find((p) => p.id === won.id) ?? {
          id: won.id,
          name: won.name,
          rarity: won.rarity,
          weight: 0,
          chance: 0,
        };

        setResult({ won, items: pool, caseName: data.caseName ?? caseName });
        setReel(strip);
        setPhase("spinning");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка");
        setPhase("error");
      }
    })();
  }, [userCaseId, caseName]);

  // Measure the viewport so we can centre the winning tile under the marker.
  useEffect(() => {
    const measure = () => setViewportWidth(viewportRef.current?.clientWidth ?? 0);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [phase]);

  // Once measured + spinning, animate to the landing offset on the next frame so the
  // CSS transition actually runs (state must change after the initial 0-offset paint).
  useEffect(() => {
    if (phase !== "spinning" || reel.length === 0 || viewportWidth === 0) return;
    // Land the winning tile's centre on the viewport centre, with a small random jitter
    // inside the tile so it doesn't always stop dead-centre.
    const jitter = (Math.random() - 0.5) * (TILE_WIDTH * 0.5);
    const target = WINNER_INDEX * STRIDE + TILE_WIDTH / 2 - viewportWidth / 2 + jitter;
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setOffset(target));
    });
    return () => cancelAnimationFrame(raf);
  }, [phase, reel, viewportWidth]);

  const wonMeta = result ? RARITY_MAP[result.won.rarity] : null;

  const sortedPool = useMemo(() => {
    if (!result) return [];
    return [...result.items].sort((a, b) => b.chance - a.chance);
  }, [result]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="glass-panel pixel-corner relative w-full max-w-3xl p-6 sm:p-8">
        <button
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute right-4 top-4 text-[var(--color-mist)] transition-colors hover:text-rose-300"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>

        <h3 className="font-[var(--font-display)] text-xl font-bold text-white">
          {result?.caseName ?? caseName}
        </h3>

        {phase === "loading" && (
          <p className="mt-6 text-center text-sm text-[var(--color-mist)]">Открываем кейс…</p>
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

        {(phase === "spinning" || phase === "done") && (
          <>
            {/* the reel */}
            <div
              ref={viewportRef}
              className="relative mt-6 overflow-hidden border-y border-white/10 py-4"
              style={{ maskImage: "linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)" }}
            >
              {/* centre marker */}
              <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 -translate-x-1/2">
                <div className="h-full w-0.5 bg-gradient-to-b from-transparent via-cyan-300 to-transparent" />
              </div>
              <div
                className="flex"
                style={{
                  gap: `${TILE_GAP}px`,
                  transform: `translateX(-${offset}px)`,
                  transition: phase === "spinning" ? "transform 5.6s cubic-bezier(0.12, 0.6, 0.04, 1)" : "none",
                }}
                onTransitionEnd={() => {
                  setPhase("done");
                  onOpened();
                }}
              >
                {reel.map((item, idx) => {
                  const meta = RARITY_MAP[item.rarity];
                  const isWinner = phase === "done" && idx === WINNER_INDEX;
                  return (
                    <div
                      key={idx}
                      className={`relative flex shrink-0 flex-col justify-between overflow-hidden border p-3 transition-opacity ${
                        isWinner ? "opacity-100" : phase === "done" ? "opacity-40" : "opacity-100"
                      }`}
                      style={{
                        width: `${TILE_WIDTH}px`,
                        height: "120px",
                        borderColor: `${meta.color}66`,
                        background: `linear-gradient(180deg, ${meta.color}22, transparent)`,
                        boxShadow: isWinner ? `0 0 24px ${meta.color}aa` : undefined,
                      }}
                    >
                      <span className="h-1.5 w-full" style={{ background: meta.gradient }} />
                      <span className="mt-2 line-clamp-3 text-center text-xs font-medium text-white">
                        {item.name}
                      </span>
                      <span
                        className="mt-1 text-center font-[var(--font-mono)] text-[10px] uppercase tracking-wide"
                        style={{ color: meta.color }}
                      >
                        {meta.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* result */}
            {phase === "done" && result && wonMeta && (
              <div className="section-enter mt-6 text-center">
                <p className="text-xs uppercase tracking-wide text-[var(--color-mist)]">Вам выпало</p>
                <p
                  className="mt-1 font-[var(--font-display)] text-2xl font-bold"
                  style={{ color: wonMeta.color }}
                >
                  {result.won.name}
                </p>
                <span
                  className="mt-2 inline-block border px-3 py-1 font-[var(--font-mono)] text-xs uppercase tracking-wide"
                  style={{ borderColor: `${wonMeta.color}66`, color: wonMeta.color }}
                >
                  {wonMeta.label}
                </span>
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={onClose}
                    className="pixel-corner bg-gradient-to-r from-violet-600 to-cyan-500 px-8 py-2.5 font-[var(--font-display)] text-sm font-semibold text-white shadow-[var(--shadow-glow-cyan)] transition-transform duration-300 hover:scale-[1.02]"
                  >
                    Забрать
                  </button>
                </div>
              </div>
            )}

            {phase === "spinning" && (
              <p className="mt-6 text-center text-sm text-[var(--color-mist)]">Крутим барабан…</p>
            )}

            {/* full loot pool with chances (shown once opened) */}
            {phase === "done" && sortedPool.length > 0 && (
              <div className="mt-8 border-t border-white/10 pt-5">
                <p className="mb-3 text-xs uppercase tracking-wide text-[var(--color-mist)]">
                  Содержимое кейса
                </p>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {sortedPool.map((item) => {
                    const meta = RARITY_MAP[item.rarity];
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between border border-white/5 px-3 py-1.5 text-sm"
                      >
                        <span className="flex items-center gap-2 truncate text-[var(--color-mist)]">
                          <span className="h-2 w-2 shrink-0" style={{ background: meta.color }} />
                          <span className="truncate text-white">{item.name}</span>
                        </span>
                        <span className="ml-2 shrink-0 font-[var(--font-mono)] text-xs" style={{ color: meta.color }}>
                          {(item.chance * 100).toFixed(item.chance < 0.01 ? 2 : 1)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
