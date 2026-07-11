"use client";

import { useEffect, useRef } from "react";

type Pixel = {
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  hueBase: number;
  hueRange: number;
  huePhase: number;
  hueSpeed: number;
  phase: number;
  speed: number;
};

/**
 * Ambient background: soft drifting pixel-blocks that shimmer between
 * the brand's violet -> cyan range, echoing the logo's checkered "N".
 */
export default function PixelBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let raf = 0;
    let reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const COUNT = Math.min(90, Math.floor((width * height) / 22000));
    const pixels: Pixel[] = Array.from({ length: COUNT }, () => spawn());

    function spawn(): Pixel {
      // ~40% of pixels stay close to one hue (violet or cyan family) and just shimmer.
      // ~60% sweep slowly across the violet <-> cyan range so the field visibly changes color.
      const colorShifting = Math.random() < 0.6;
      const anchor = Math.random() < 0.5 ? 275 : 190;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        size: 6 + Math.random() * 22,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        hueBase: colorShifting ? 235 : anchor,
        hueRange: colorShifting ? 55 + Math.random() * 35 : 8,
        huePhase: Math.random() * Math.PI * 2,
        hueSpeed: colorShifting ? 0.0006 + Math.random() * 0.001 : 0.0015 + Math.random() * 0.001,
        phase: Math.random() * Math.PI * 2,
        speed: 0.002 + Math.random() * 0.004,
      };
    }

    function resize() {
      width = canvas!.width = window.innerWidth;
      height = canvas!.height = window.innerHeight;
    }
    window.addEventListener("resize", resize);

    function draw(t: number) {
      ctx!.clearRect(0, 0, width, height);
      ctx!.fillStyle = "#050308";
      ctx!.fillRect(0, 0, width, height);

      for (const p of pixels) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -30) p.x = width + 30;
        if (p.x > width + 30) p.x = -30;
        if (p.y < -30) p.y = height + 30;
        if (p.y > height + 30) p.y = -30;

        const shimmer = 0.35 + 0.25 * Math.sin(t * p.speed + p.phase);
        const hueDrift = p.hueBase + p.hueRange * Math.sin(t * p.hueSpeed + p.huePhase);
        ctx!.fillStyle = `hsla(${hueDrift}, 85%, 65%, ${shimmer})`;
        ctx!.shadowColor = `hsla(${hueDrift}, 90%, 60%, 0.8)`;
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
  }, []);

  return (
    <div className="fixed inset-0 -z-10">
      <canvas ref={canvasRef} className="h-full w-full" />
      {/* static grid overlay for the checkered logo motif */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(168,85,247,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.6) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
        }}
      />
      <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-void" />
    </div>
  );
}
