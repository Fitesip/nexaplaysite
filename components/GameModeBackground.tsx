"use client";

import { useEffect, useRef } from "react";
import type { GameMode } from "./gameModes";

type Pixel = {
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  huePhase: number;
  hueSpeed: number;
  lightPhase: number;
  lightSpeed: number;
  phase: number;
  speed: number;
};

type ModeTheme = {
  bg: string;
  hueA: number;
  hueB: number;
  satRange: [number, number];
  lightRange: [number, number];
  /** multiplier for how fast pixels drift across the screen */
  moveSpeedMul: number;
  /** multiplier for how fast each pixel's hue/lightness shimmer pulses */
  pulseSpeedMul: number;
  gridColorA: string;
  gridColorB: string;
  gridOpacity: number;
};

/**
 * Terryx reuses the exact brand palette from the main-site background (it's the
 * flagship survival mode), the other three get their own hue/lightness ranges per
 * the requested theme: Bloodborne red->maroon, Heaven white->lime, Games yellow->cyan.
 */
const THEMES: Record<GameMode, ModeTheme> = {
  terryx: {
    bg: "#050308",
    hueA: 275,
    hueB: 190,
    satRange: [80, 90],
    lightRange: [55, 70],
    moveSpeedMul: 1,
    pulseSpeedMul: 1,
    gridColorA: "rgba(168,85,247,0.6)",
    gridColorB: "rgba(34,211,238,0.6)",
    gridOpacity: 0.06,
  },
  bloodborne: {
    bg: "#0a0202",
    hueA: 0,
    hueB: 355,
    satRange: [70, 95],
    lightRange: [22, 42],
    moveSpeedMul: 2.4,
    pulseSpeedMul: 1.6,
    gridColorA: "rgba(239,68,68,0.55)",
    gridColorB: "rgba(127,29,29,0.6)",
    gridOpacity: 0.09,
  },
  heaven: {
    bg: "#0c1006",
    hueA: 85,
    hueB: 95,
    satRange: [15, 55],
    lightRange: [55, 96],
    moveSpeedMul: 0.55,
    pulseSpeedMul: 0.55,
    gridColorA: "rgba(248,250,252,0.35)",
    gridColorB: "rgba(132,204,22,0.5)",
    gridOpacity: 0.05,
  },
  games: {
    bg: "#050a0d",
    hueA: 50,
    hueB: 190,
    satRange: [75, 95],
    lightRange: [55, 68],
    moveSpeedMul: 1.3,
    pulseSpeedMul: 1.3,
    gridColorA: "rgba(250,204,21,0.55)",
    gridColorB: "rgba(34,211,238,0.55)",
    gridOpacity: 0.07,
  },
};

export default function GameModeBackground({ mode }: { mode: GameMode }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const theme = THEMES[mode];

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

    function spawn(): Pixel {
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        size: 6 + Math.random() * 22,
        vx: (Math.random() - 0.5) * 0.15 * theme.moveSpeedMul,
        vy: (Math.random() - 0.5) * 0.15 * theme.moveSpeedMul,
        huePhase: Math.random() * Math.PI * 2,
        hueSpeed: (0.0006 + Math.random() * 0.001) * theme.pulseSpeedMul,
        lightPhase: Math.random() * Math.PI * 2,
        lightSpeed: (0.0008 + Math.random() * 0.0012) * theme.pulseSpeedMul,
        phase: Math.random() * Math.PI * 2,
        speed: (0.002 + Math.random() * 0.004) * theme.pulseSpeedMul,
      };
    }

    function resize() {
      width = canvas!.width = window.innerWidth;
      height = canvas!.height = window.innerHeight;
    }
    window.addEventListener("resize", resize);

    function draw(t: number) {
      ctx!.clearRect(0, 0, width, height);
      ctx!.fillStyle = theme.bg;
      ctx!.fillRect(0, 0, width, height);

      const [satMin, satMax] = theme.satRange;
      const [lightMin, lightMax] = theme.lightRange;

      for (const p of pixels) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -30) p.x = width + 30;
        if (p.x > width + 30) p.x = -30;
        if (p.y < -30) p.y = height + 30;
        if (p.y > height + 30) p.y = -30;

        const shimmer = 0.35 + 0.25 * Math.sin(t * p.speed + p.phase);
        const hueMix = 0.5 + 0.5 * Math.sin(t * p.hueSpeed + p.huePhase);
        const hue = theme.hueA + (theme.hueB - theme.hueA) * hueMix;
        const lightMix = 0.5 + 0.5 * Math.sin(t * p.lightSpeed + p.lightPhase);
        const light = lightMin + (lightMax - lightMin) * lightMix;
        const sat = satMin + (satMax - satMin) * hueMix;

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
    // theme is derived purely from `mode`, safe to depend on the primitive instead
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return (
    <div className="fixed inset-0 -z-10">
      <canvas ref={canvasRef} className="h-full w-full" />
      <div
        className="absolute inset-0"
        style={{
          opacity: theme.gridOpacity,
          backgroundImage: `linear-gradient(${theme.gridColorA} 1px, transparent 1px), linear-gradient(90deg, ${theme.gridColorB} 1px, transparent 1px)`,
          backgroundSize: "34px 34px",
        }}
      />
      <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-void" />
    </div>
  );
}
