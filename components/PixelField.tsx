"use client";

import { useEffect, useRef } from "react";
import type { GameMode } from "./gameModes";

export type PixelThemeName = "default" | GameMode;

/**
 * A theme is expressed purely as numbers so every characteristic can be smoothly
 * interpolated at runtime. `bg` is an rgb triple, grid colors are rgba quads.
 */
type Theme = {
  bg: [number, number, number];
  /** starting hue of the per-pixel range */
  hueA: number;
  /** signed width of the hue range (hue = hueA + hueSpan * mix); kept as one linear
   *  value so morphing never distorts the range the way interpolating two angles would */
  hueSpan: number;
  satMin: number;
  satMax: number;
  lightMin: number;
  lightMax: number;
  /** multiplier for how fast pixels drift across the screen */
  moveSpeedMul: number;
  /** multiplier for how fast each pixel's hue/lightness shimmer pulses */
  pulseSpeedMul: number;
  gridA: [number, number, number, number];
  gridB: [number, number, number, number];
  gridOpacity: number;
};

/**
 * Terryx / default reuse the brand violet->cyan palette; the other three get their
 * own hue/lightness ranges: Bloodborne red->maroon, Heaven white->lime, Games yellow->cyan.
 */
const THEMES: Record<PixelThemeName, Theme> = {
  default: {
    bg: [5, 3, 8],
    hueA: 275,
    hueSpan: -85,
    satMin: 80,
    satMax: 90,
    lightMin: 55,
    lightMax: 70,
    moveSpeedMul: 1,
    pulseSpeedMul: 1,
    gridA: [168, 85, 247, 0.6],
    gridB: [34, 211, 238, 0.6],
    gridOpacity: 0.06,
  },
  terryx: {
    bg: [5, 3, 8],
    hueA: 275,
    hueSpan: -85,
    satMin: 80,
    satMax: 90,
    lightMin: 55,
    lightMax: 70,
    moveSpeedMul: 1,
    pulseSpeedMul: 1,
    gridA: [168, 85, 247, 0.6],
    gridB: [34, 211, 238, 0.6],
    gridOpacity: 0.06,
  },
  bloodborne: {
    bg: [10, 2, 2],
    hueA: 0,
    hueSpan: 355,
    satMin: 70,
    satMax: 95,
    lightMin: 22,
    lightMax: 42,
    moveSpeedMul: 2.4,
    pulseSpeedMul: 1.6,
    gridA: [239, 68, 68, 0.55],
    gridB: [127, 29, 29, 0.6],
    gridOpacity: 0.09,
  },
  heaven: {
    bg: [12, 16, 6],
    hueA: 85,
    hueSpan: 10,
    satMin: 15,
    satMax: 55,
    lightMin: 55,
    lightMax: 96,
    moveSpeedMul: 0.55,
    pulseSpeedMul: 0.55,
    gridA: [248, 250, 252, 0.35],
    gridB: [132, 204, 22, 0.5],
    gridOpacity: 0.05,
  },
  games: {
    bg: [5, 10, 13],
    hueA: 50,
    hueSpan: 140,
    satMin: 75,
    satMax: 95,
    lightMin: 55,
    lightMax: 68,
    moveSpeedMul: 1.3,
    pulseSpeedMul: 1.3,
    gridA: [250, 204, 21, 0.55],
    gridB: [34, 211, 238, 0.55],
    gridOpacity: 0.07,
  },
};

type Pixel = {
  x: number;
  y: number;
  size: number;
  vxBase: number;
  vyBase: number;
  huePhase: number;
  hueSpeedBase: number;
  lightPhase: number;
  lightSpeedBase: number;
  phase: number;
  speedBase: number;
};

/** Per-frame easing factor for morphing the current theme toward the target. */
const EASE = 0.045;

function cloneTheme(t: Theme): Theme {
  return {
    bg: [...t.bg] as [number, number, number],
    hueA: t.hueA,
    hueSpan: t.hueSpan,
    satMin: t.satMin,
    satMax: t.satMax,
    lightMin: t.lightMin,
    lightMax: t.lightMax,
    moveSpeedMul: t.moveSpeedMul,
    pulseSpeedMul: t.pulseSpeedMul,
    gridA: [...t.gridA] as [number, number, number, number],
    gridB: [...t.gridB] as [number, number, number, number],
    gridOpacity: t.gridOpacity,
  };
}

function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}

/** Shortest-path angular interpolation so hue never sweeps the long way round the wheel. */
function lerpAngle(a: number, b: number, k: number): number {
  const d = ((b - a + 540) % 360) - 180;
  return a + d * k;
}

/**
 * The single, persistent background: one canvas of drifting pixel-blocks that stays
 * mounted for the whole app. Changing `theme` never remounts anything — the pixels keep
 * their positions and the current theme's characteristics (colors, drift/pulse speed,
 * backdrop, grid) are eased toward the new theme, so switching catalog modes morphs
 * organically instead of hard-cutting.
 */
export default function PixelField({ theme }: { theme: PixelThemeName }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef<Theme>(THEMES[theme]);

  useEffect(() => {
    targetRef.current = THEMES[theme];
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let raf = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const COUNT = Math.min(90, Math.floor((width * height) / 22000));
    const pixels: Pixel[] = Array.from({ length: COUNT }, spawn);
    // Current, interpolated theme — starts exactly at the initial target (no intro fade).
    const cur = cloneTheme(targetRef.current);

    function spawn(): Pixel {
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        size: 6 + Math.random() * 22,
        vxBase: (Math.random() - 0.5) * 0.15,
        vyBase: (Math.random() - 0.5) * 0.15,
        huePhase: Math.random() * Math.PI * 2,
        hueSpeedBase: 0.0006 + Math.random() * 0.001,
        lightPhase: Math.random() * Math.PI * 2,
        lightSpeedBase: 0.0008 + Math.random() * 0.0012,
        phase: Math.random() * Math.PI * 2,
        speedBase: 0.002 + Math.random() * 0.004,
      };
    }

    function resize() {
      width = canvas!.width = window.innerWidth;
      height = canvas!.height = window.innerHeight;
    }
    window.addEventListener("resize", resize);

    function easeTowardTarget() {
      const tg = targetRef.current;
      cur.hueA = lerpAngle(cur.hueA, tg.hueA, EASE);
      cur.hueSpan = lerp(cur.hueSpan, tg.hueSpan, EASE);
      cur.satMin = lerp(cur.satMin, tg.satMin, EASE);
      cur.satMax = lerp(cur.satMax, tg.satMax, EASE);
      cur.lightMin = lerp(cur.lightMin, tg.lightMin, EASE);
      cur.lightMax = lerp(cur.lightMax, tg.lightMax, EASE);
      cur.moveSpeedMul = lerp(cur.moveSpeedMul, tg.moveSpeedMul, EASE);
      cur.pulseSpeedMul = lerp(cur.pulseSpeedMul, tg.pulseSpeedMul, EASE);
      cur.gridOpacity = lerp(cur.gridOpacity, tg.gridOpacity, EASE);
      for (let i = 0; i < 3; i++) cur.bg[i] = lerp(cur.bg[i], tg.bg[i], EASE);
      for (let i = 0; i < 4; i++) cur.gridA[i] = lerp(cur.gridA[i], tg.gridA[i], EASE);
      for (let i = 0; i < 4; i++) cur.gridB[i] = lerp(cur.gridB[i], tg.gridB[i], EASE);
    }

    function applyGrid() {
      const g = gridRef.current;
      if (!g) return;
      const [ar, ag, ab, aa] = cur.gridA;
      const [br, bg, bb, ba] = cur.gridB;
      g.style.opacity = String(cur.gridOpacity);
      g.style.backgroundImage =
        `linear-gradient(rgba(${ar | 0},${ag | 0},${ab | 0},${aa.toFixed(3)}) 1px, transparent 1px), ` +
        `linear-gradient(90deg, rgba(${br | 0},${bg | 0},${bb | 0},${ba.toFixed(3)}) 1px, transparent 1px)`;
    }

    function draw(t: number) {
      easeTowardTarget();
      applyGrid();

      ctx!.clearRect(0, 0, width, height);
      ctx!.fillStyle = `rgb(${cur.bg[0] | 0}, ${cur.bg[1] | 0}, ${cur.bg[2] | 0})`;
      ctx!.fillRect(0, 0, width, height);

      for (const p of pixels) {
        p.x += p.vxBase * cur.moveSpeedMul;
        p.y += p.vyBase * cur.moveSpeedMul;
        if (p.x < -30) p.x = width + 30;
        if (p.x > width + 30) p.x = -30;
        if (p.y < -30) p.y = height + 30;
        if (p.y > height + 30) p.y = -30;

        const shimmer = 0.35 + 0.25 * Math.sin(t * p.speedBase * cur.pulseSpeedMul + p.phase);
        const hueMix = 0.5 + 0.5 * Math.sin(t * p.hueSpeedBase * cur.pulseSpeedMul + p.huePhase);
        const hue = cur.hueA + cur.hueSpan * hueMix;
        const lightMix = 0.5 + 0.5 * Math.sin(t * p.lightSpeedBase * cur.pulseSpeedMul + p.lightPhase);
        const light = cur.lightMin + (cur.lightMax - cur.lightMin) * lightMix;
        const sat = cur.satMin + (cur.satMax - cur.satMin) * hueMix;

        ctx!.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, ${shimmer})`;
        ctx!.shadowColor = `hsla(${hue}, ${sat}%, ${Math.min(light + 10, 90)}%, 0.8)`;
        ctx!.shadowBlur = p.size * 0.8;
        ctx!.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx!.shadowBlur = 0;
      if (!reduced) raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    if (reduced) draw(0);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
    // Runs once: the field must persist across theme changes; new themes arrive via targetRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 -z-10">
      <canvas ref={canvasRef} className="h-full w-full" />
      {/* checkered grid overlay; its colors/opacity are updated imperatively as the theme morphs */}
      <div
        ref={gridRef}
        className="absolute inset-0"
        style={{ backgroundSize: "34px 34px" }}
      />
      <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-void" />
    </div>
  );
}
