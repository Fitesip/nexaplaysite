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
  /** fixed spot (0..1) inside the theme's hue range; gives spatial color variety
   *  without the pixel racing through the whole palette over time */
  hueOffset: number;
  /** the pixel's hue at the start of the current theme transition; it crossfades from here
   *  toward its new fixed hue along the shortest arc, so switching never sweeps the wheel */
  hueFrom: number;
  huePhase: number;
  hueSpeedBase: number;
  lightPhase: number;
  lightSpeedBase: number;
  phase: number;
  speedBase: number;
};

/**
 * Time constant (ms) for morphing the current theme's scalar characteristics (backdrop,
 * saturation, lightness, speeds, grid) toward the target. Applied against a clamped
 * delta-time so the morph is a gentle ~3s and framerate-independent.
 */
const EASE_TAU = 1300;

/** Duration (ms) of the per-pixel hue crossfade when the theme changes. */
const HUE_TRANS_MS = 1400;

/** Smoothstep for a gentle ease-in-out of the hue crossfade. */
function smooth(x: number): number {
  return x * x * (3 - 2 * x);
}

/** How many degrees a pixel's hue drifts around its fixed offset — small, just for life. */
const HUE_SHIMMER_DEG = 7;

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
    // Current, interpolated theme — starts exactly at the initial target (no intro fade).
    const cur = cloneTheme(targetRef.current);
    // Hue transition state: the field crossfades each pixel from its current hue toward the
    // target theme's fixed per-pixel hue. `toA`/`toSpan` track the theme we're heading to.
    let toA = targetRef.current.hueA;
    let toSpan = targetRef.current.hueSpan;
    let hueProg = 1;
    const pixels: Pixel[] = Array.from({ length: COUNT }, spawn);

    function spawn(): Pixel {
      const hueOffset = Math.random();
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        size: 6 + Math.random() * 22,
        vxBase: (Math.random() - 0.5) * 0.15,
        vyBase: (Math.random() - 0.5) * 0.15,
        hueOffset,
        hueFrom: toA + toSpan * hueOffset,
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

    function easeTowardTarget(k: number) {
      const tg = targetRef.current;
      cur.satMin = lerp(cur.satMin, tg.satMin, k);
      cur.satMax = lerp(cur.satMax, tg.satMax, k);
      cur.lightMin = lerp(cur.lightMin, tg.lightMin, k);
      cur.lightMax = lerp(cur.lightMax, tg.lightMax, k);
      cur.moveSpeedMul = lerp(cur.moveSpeedMul, tg.moveSpeedMul, k);
      cur.pulseSpeedMul = lerp(cur.pulseSpeedMul, tg.pulseSpeedMul, k);
      cur.gridOpacity = lerp(cur.gridOpacity, tg.gridOpacity, k);
      for (let i = 0; i < 3; i++) cur.bg[i] = lerp(cur.bg[i], tg.bg[i], k);
      for (let i = 0; i < 4; i++) cur.gridA[i] = lerp(cur.gridA[i], tg.gridA[i], k);
      for (let i = 0; i < 4; i++) cur.gridB[i] = lerp(cur.gridB[i], tg.gridB[i], k);
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

    // Own accumulated clock (ms). Delta is clamped so a throttled/backgrounded tab can't inject
    // a huge time jump on return — that burst is what made colors race after switching tabs.
    let clock = 0;
    let lastNow = performance.now();

    function draw(now: number) {
      const dt = Math.min(50, Math.max(0, now - lastNow));
      lastNow = now;
      clock += dt;
      easeTowardTarget(1 - Math.exp(-dt / EASE_TAU));

      // On a theme change, freeze each pixel's currently-shown hue as its crossfade start,
      // then head to the new theme. Doing it per pixel (not by lerping hueA/hueSpan) means the
      // hue only travels the shortest arc to its new fixed spot instead of sweeping the wheel.
      const tg = targetRef.current;
      if (tg.hueA !== toA || tg.hueSpan !== toSpan) {
        const e = smooth(hueProg);
        for (const p of pixels) p.hueFrom = lerpAngle(p.hueFrom, toA + toSpan * p.hueOffset, e);
        toA = tg.hueA;
        toSpan = tg.hueSpan;
        hueProg = 0;
      }
      if (hueProg < 1) hueProg = Math.min(1, hueProg + dt / HUE_TRANS_MS);
      const hueEase = smooth(hueProg);

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

        const shimmer = 0.35 + 0.25 * Math.sin(clock * p.speedBase * cur.pulseSpeedMul + p.phase);
        // Pixel sits at its fixed offset in the range and only drifts a few degrees, so it
        // never sweeps the whole palette (that read as "frantic" cycling on wide-range themes).
        const hueShimmer =
          HUE_SHIMMER_DEG * Math.sin(clock * p.hueSpeedBase * cur.pulseSpeedMul + p.huePhase);
        const hueTarget = toA + toSpan * p.hueOffset;
        const hue = lerpAngle(p.hueFrom, hueTarget, hueEase) + hueShimmer;
        const lightMix = 0.5 + 0.5 * Math.sin(clock * p.lightSpeedBase * cur.pulseSpeedMul + p.lightPhase);
        const light = cur.lightMin + (cur.lightMax - cur.lightMin) * lightMix;
        const sat = cur.satMin + (cur.satMax - cur.satMin) * p.hueOffset;

        // Glow via radial gradients instead of canvas `shadowBlur`: shadowBlur redraws a
        // blurred copy every frame, which is GPU/driver-heavy and can degrade the canvas over
        // time on real hardware (flicker/colour artifacts a reload resets). Gradients are cheap
        // and stable. A soft halo fading to transparent, then the pixel as a rounded block with
        // a centre-out gradient.
        const cx = p.x + p.size / 2;
        const cy = p.y + p.size / 2;

        const halo = p.size * 1.7;
        const hg = ctx!.createRadialGradient(cx, cy, p.size * 0.25, cx, cy, halo);
        hg.addColorStop(0, `hsla(${hue}, ${sat}%, ${Math.min(light + 8, 92)}%, ${shimmer * 0.3})`);
        hg.addColorStop(1, `hsla(${hue}, ${sat}%, ${light}%, 0)`);
        ctx!.fillStyle = hg;
        ctx!.fillRect(cx - halo, cy - halo, halo * 2, halo * 2);

        const r = p.size * 0.8;
        const g = ctx!.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, `hsla(${hue}, ${sat}%, ${Math.min(light + 6, 94)}%, ${shimmer})`);
        g.addColorStop(1, `hsla(${hue}, ${sat}%, ${light}%, ${shimmer * 0.25})`);
        ctx!.fillStyle = g;
        ctx!.beginPath();
        ctx!.roundRect(p.x, p.y, p.size, p.size, p.size * 0.32);
        ctx!.fill();
      }
      if (!reduced) raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    if (reduced) draw(lastNow);

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
