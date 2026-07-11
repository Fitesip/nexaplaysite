"use client";

import { useEffect, useRef, useState } from "react";
import PixelBackground from "./PixelBackground";
import AdminBackground from "./AdminBackground";
import GameModeBackground from "./GameModeBackground";
import type { GameMode } from "./gameModes";

export type BgKey = "default" | "admin" | `catalog:${GameMode}`;

function renderBackground(key: BgKey) {
  if (key === "admin") return <AdminBackground />;
  if (key.startsWith("catalog:")) {
    return <GameModeBackground mode={key.slice("catalog:".length) as GameMode} />;
  }
  return <PixelBackground />;
}

const FADE_MS = 900;

type Layer = { id: number; key: BgKey; revealed: boolean };

/**
 * Keeps the outgoing background mounted (fading it to opacity 0) while the incoming one
 * fades in on top, then unmounts the old one once the crossfade finishes — so switching
 * sections, opening the admin panel, or changing game mode inside the catalog never hard-cuts.
 */
export default function BackgroundStage({ bgKey }: { bgKey: BgKey }) {
  const [layers, setLayers] = useState<Layer[]>(() => [{ id: 0, key: bgKey, revealed: true }]);
  const nextId = useRef(1);
  const currentKey = useRef(bgKey);

  useEffect(() => {
    if (currentKey.current === bgKey) return;
    currentKey.current = bgKey;
    const id = nextId.current++;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    setLayers((prev) => [...prev, { id, key: bgKey, revealed: reduced }]);

    // Double rAF so the freshly-mounted layer actually paints at opacity 0 first —
    // flipping to `revealed` in the very next tick can land in the same paint and
    // skip the transition entirely.
    let raf1 = 0;
    let raf2 = 0;
    if (!reduced) {
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, revealed: true } : l)));
        });
      });
    }

    const cleanupTimer = setTimeout(
      () => {
        setLayers((prev) => prev.filter((l) => l.id === id));
      },
      reduced ? 0 : FADE_MS + 50
    );

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(cleanupTimer);
    };
  }, [bgKey]);

  return (
    <>
      {layers.map((layer, idx) => {
        const isTop = idx === layers.length - 1;
        const opacity = isTop ? (layer.revealed ? 1 : 0) : 0;
        return (
          <div
            key={layer.id}
            className="fixed inset-0 -z-10 transition-opacity ease-in-out"
            style={{ opacity, transitionDuration: `${FADE_MS}ms` }}
          >
            {renderBackground(layer.key)}
          </div>
        );
      })}
    </>
  );
}
