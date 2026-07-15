"use client";

/**
 * A single compact CS:GO-style reel used by the bulk-open overlay. It scrolls a strip of
 * loot tiles, decelerates, and lands the centre marker on the server-chosen winner. The
 * winner is decided server-side — this is purely presentational. Set `skip` to snap it
 * straight to the result without waiting for the spin.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { RARITY_MAP, type Rarity } from "@/lib/rarity";
import { type ItemType } from "@/lib/itemType";
import ItemIcon from "./ItemIcon";
import type { CaseLootItem } from "./types";

const TILE_WIDTH = 88;
const TILE_GAP = 8;
const STRIDE = TILE_WIDTH + TILE_GAP;
const REEL_LENGTH = 48;
const WINNER_INDEX = 40;

export type ReelWinner = {
  id: number;
  name: string;
  rarity: Rarity;
  itemType: ItemType;
  imageUrl: string | null;
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function CaseReel({
  pool,
  won,
  skip,
  spinDelay = 0,
  onSettled,
}: {
  pool: CaseLootItem[];
  won: ReelWinner;
  skip: boolean;
  spinDelay?: number;
  onSettled: () => void;
}) {
  const [offset, setOffset] = useState(0);
  const [done, setDone] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const settledRef = useRef(false);

  // Build the strip once: random tiles everywhere, the real winner locked at WINNER_INDEX.
  const reel = useMemo<CaseLootItem[]>(() => {
    const strip: CaseLootItem[] = Array.from({ length: REEL_LENGTH }, () => pickRandom(pool));
    strip[WINNER_INDEX] =
      pool.find((p) => p.id === won.id) ?? {
        id: won.id,
        name: won.name,
        rarity: won.rarity,
        itemType: won.itemType,
        imageUrl: won.imageUrl,
        isUnique: false,
        weight: 0,
        chance: 0,
      };
    return strip;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const settle = () => {
    if (settledRef.current) return;
    settledRef.current = true;
    setDone(true);
    onSettled();
  };

  useEffect(() => {
    const measure = () => setViewportWidth(viewportRef.current?.clientWidth ?? 0);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Stagger the spin start so the reels don't all move in perfect lockstep.
  useEffect(() => {
    const t = setTimeout(() => setSpinning(true), spinDelay);
    return () => clearTimeout(t);
  }, [spinDelay]);

  // Once measured + spinning, animate to the landing offset on the next frame.
  useEffect(() => {
    if (!spinning || viewportWidth === 0 || settledRef.current) return;
    const jitter = (Math.random() - 0.5) * (TILE_WIDTH * 0.5);
    const target = WINNER_INDEX * STRIDE + TILE_WIDTH / 2 - viewportWidth / 2 + jitter;
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setOffset(target));
    });
    return () => cancelAnimationFrame(raf);
  }, [spinning, viewportWidth]);

  // Skip: snap straight to the winner (transition is disabled once `done`).
  useEffect(() => {
    if (!skip || settledRef.current) return;
    if (viewportWidth > 0) {
      setOffset(WINNER_INDEX * STRIDE + TILE_WIDTH / 2 - viewportWidth / 2);
    }
    settle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip, viewportWidth]);

  return (
    <div
      ref={viewportRef}
      className="relative overflow-hidden border-y border-white/10 py-3"
      style={{ maskImage: "linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)" }}
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
          transition: spinning && !done ? "transform 4.6s cubic-bezier(0.12, 0.6, 0.04, 1)" : "none",
        }}
        onTransitionEnd={settle}
      >
        {reel.map((item, idx) => {
          const meta = RARITY_MAP[item.rarity];
          const isWinner = done && idx === WINNER_INDEX;
          return (
            <div
              key={idx}
              className={`relative flex shrink-0 flex-col items-center justify-between overflow-hidden border p-2 transition-opacity ${
                isWinner ? "case-winner-tile opacity-100" : done ? "opacity-40" : "opacity-100"
              }`}
              style={{
                width: `${TILE_WIDTH}px`,
                height: "88px",
                borderColor: `${meta.color}66`,
                background: `linear-gradient(180deg, ${meta.color}22, transparent)`,
                boxShadow: isWinner ? `0 0 22px ${meta.color}aa` : undefined,
              }}
            >
              <ItemIcon imageUrl={item.imageUrl} itemType={item.itemType} rarity={item.rarity} size={30} />
              <span className="line-clamp-2 text-center text-[10px] font-medium leading-tight text-white">
                {item.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
