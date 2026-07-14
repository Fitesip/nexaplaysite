"use client";

/** Landing page: hero with IP-copy button and live server status, feature strip, and reviews. */
import { useState } from "react";
import type { SectionId } from "@/components/sections";
import Recommendations from "@/components/sections/Recommendations";
import { ServerStatusCard } from "@/components/ServerStatus";

const STATS = [
  { value: "67", label: "игроков онлайн за месяц" },
  { value: "4", label: "кастомных механики" },
  { value: "3", label: "сезона с релиза" },
];

export default function Home({ onNavigate }: { onNavigate: (id: SectionId) => void }) {
  const [copied, setCopied] = useState(false);
  const ip = "play.nexaplay.ru";

  const copyIp = async () => {
    try {
      await navigator.clipboard.writeText(ip);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="flex flex-col gap-24">
      {/* Hero */}
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="mb-4 font-[var(--font-mono)] text-xs uppercase tracking-[0.4em] text-cyan-300/80">
            Ванильное выживание × кастомный лор
          </p>
          <h1 className="font-[var(--font-display)] text-5xl font-bold leading-[1.05] sm:text-6xl">
            Мир, собранный
            <br />
            из <span className="grad-text">пикселей</span> и
            <br />
            историй игроков.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-[var(--color-mist)]">
            NEXAPLAY — сервер, где экономика держится на игроках, а не на донат-магазине.
            Кланы, торговые пути, подземелья с авторскими боссами и честный PvP-баланс.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              onClick={copyIp}
              className="pixel-corner group relative overflow-hidden bg-gradient-to-r from-violet-600 to-cyan-500 px-6 py-3 font-[var(--font-display)] text-sm font-semibold text-white shadow-[var(--shadow-glow-violet)] transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98]"
            >
              {copied ? "IP скопирован ✓" : `Копировать IP · ${ip}`}
            </button>
            <button
              onClick={() => onNavigate("catalog")}
              className="pixel-corner border border-white/15 px-6 py-3 font-[var(--font-display)] text-sm text-[var(--color-mist)] transition-all duration-300 hover:border-cyan-400/50 hover:text-white"
            >
              Смотреть каталог
            </button>
          </div>

          <div className="mt-12 flex gap-10">
            {STATS.map((s) => (
              <div key={s.label}>
                <div className="font-[var(--font-display)] text-2xl font-bold text-white">{s.value}</div>
                <div className="mt-1 max-w-[9rem] text-xs text-[var(--color-mist)]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Signature visual: server status card over an emblem visible only through pulsing tiles */}
        <div className="relative mx-auto flex w-full max-w-md flex-col gap-4">
          <div className="glass-panel pixel-corner relative aspect-4/3 w-full overflow-hidden">
            <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 gap-2 p-4">
              {Array.from({ length: 36 }).map((_, i) => {
                const col = i % 6;
                const row = Math.floor(i / 6);
                const posX = (col / 5) * 100;
                const posY = (row / 5) * 100;
                return (
                  <div
                    key={i}
                    className="rounded-[2px]"
                    style={{
                      backgroundImage: `linear-gradient(135deg, hsla(${270 - (i % 6) * 14}, 80%, 60%, 0.55), hsla(${190 + (i % 6) * 10}, 85%, 55%, 0.45)), url(/hero-emblem.jpg)`,
                      backgroundSize: "100% 100%, 600% 600%",
                      backgroundPosition: `0 0, ${posX}% ${posY}%`,
                      backgroundBlendMode: "overlay",
                      animation: `pulseTile ${3 + (i % 5)}s ease-in-out ${(i % 6) * 0.15}s infinite`,
                    }}
                  />
                );
              })}
            </div>
          </div>
          <ServerStatusCard />
          <style>{`
            @keyframes pulseTile {
              0%, 100% { opacity: 0.4; transform: scale(0.97); }
              50% { opacity: 1; transform: scale(1.03); }
            }
          `}</style>
        </div>
      </section>

      {/* Feature strip */}
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { title: "Живая экономика", text: "Цены двигают игроки: аукционы, торговые гильдии, ярмарки." },
          { title: "Авторские подземелья", text: "Боссы и лабиринты, которых нет в ванильной игре." },
          { title: "Честный PvP", text: "Регион-система и зоны безопасности без доната на силу." },
        ].map((f) => (
          <div key={f.title} className="glass-panel pixel-corner p-6 transition-transform duration-300 hover:-translate-y-1">
            <h3 className="font-[var(--font-display)] text-lg font-semibold text-white">{f.title}</h3>
            <p className="mt-2 text-sm text-[var(--color-mist)]">{f.text}</p>
          </div>
        ))}
      </section>

      <Recommendations />
    </div>
  );
}
