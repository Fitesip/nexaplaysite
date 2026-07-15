"use client";

import { useEffect, useState } from "react";
import PixelField, { type PixelThemeName } from "./PixelField";
import AdminBackground from "./AdminBackground";
import type { GameMode } from "./gameModes";

export type BgKey = "default" | "admin" | `catalog:${GameMode}`;

const FADE_MS = 900;

function pixelThemeFor(key: BgKey): PixelThemeName {
  if (key.startsWith("catalog:")) return key.slice("catalog:".length) as GameMode;
  return "default";
}

/**
 * A single persistent `PixelField` renders the whole time; switching sections or catalog
 * game modes just changes its theme, which morphs organically (pixels keep their positions).
 * The admin panel has a wholly different visual language, so it fades in as an overlay on top
 * of the pixel field rather than sharing it.
 */
export default function BackgroundStage({ bgKey }: { bgKey: BgKey }) {
  const isAdmin = bgKey === "admin";
  // Keep the last non-admin theme while admin is shown, so leaving admin morphs back into it.
  const [pixelTheme, setPixelTheme] = useState<PixelThemeName>(() =>
    pixelThemeFor(isAdmin ? "default" : bgKey)
  );

  useEffect(() => {
    if (bgKey !== "admin") setPixelTheme(pixelThemeFor(bgKey));
  }, [bgKey]);

  return (
    <>
      <PixelField theme={pixelTheme} />
      <div
        className="fixed inset-0 -z-10 transition-opacity ease-in-out"
        style={{ opacity: isAdmin ? 1 : 0, transitionDuration: `${FADE_MS}ms`, pointerEvents: "none" }}
      >
        <AdminBackground />
      </div>
    </>
  );
}
