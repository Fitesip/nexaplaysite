"use client";

import { useEffect, useRef, useState } from "react";

type Review = {
  name: string;
  role: string;
  rating: number;
  quote: string;
};

const REVIEWS: Review[] = [
  {
    name: "Astra_Wolf",
    role: "На сервере 8 месяцев",
    rating: 5,
    quote:
      "Впервые вижу экономику, где цены реально держат игроки, а не админы. Торговая гильдия — отдельный кайф.",
  },
  {
    name: "grimson_dev",
    role: "Лидер клана «Печать»",
    rating: 5,
    quote:
      "Авторские подземелья — не просто перекрашенные ванильные структуры. Боссы заставляют реально думать над тактикой.",
  },
  {
    name: "lunaris",
    role: "Строитель, автор спавна",
    rating: 4,
    quote:
      "WorldEdit в привилегии — то, чего не хватало на других серверах. Стройка перестала быть мучением.",
  },
  {
    name: "Ferox_PvP",
    role: "Топ-3 арены",
    rating: 5,
    quote:
      "Регион-система реально честная: зачарки достаются трудом, а не деньгами. Баланс держится на скилле.",
  },
  {
    name: "mimimoss",
    role: "Новичок, 3 недели",
    rating: 5,
    quote:
      "Комьюнити подсказало всё за первый час. Ни разу не почувствовала себя потерянной, как на других серверах.",
  },
];

export default function Recommendations() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const dotsRef = useRef<Record<number, HTMLButtonElement | null>>({});
  const [pill, setPill] = useState({ left: 0, width: 0 });

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % REVIEWS.length), 5000);
    return () => clearInterval(t);
  }, [paused]);

  useEffect(() => {
    const el = dotsRef.current[index];
    if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth });
  }, [index]);

  const review = REVIEWS[index];

  const goTo = (i: number) => setIndex((i + REVIEWS.length) % REVIEWS.length);

  return (
    <section
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-[var(--font-display)] text-3xl font-bold sm:text-4xl">
            Рекомендуют <span className="grad-text">игроки</span>
          </h2>
          <p className="mt-2 max-w-xl text-sm text-[var(--color-mist)]">
            Отзывы тех, кто уже строит, торгует и сражается в NEXAPLAY.
          </p>
        </div>
        <div className="hidden gap-2 sm:flex">
          <ArrowButton onClick={() => goTo(index - 1)} dir="left" />
          <ArrowButton onClick={() => goTo(index + 1)} dir="right" />
        </div>
      </div>

      <div className="relative mt-8 min-h-[220px] overflow-hidden">
        <div key={index} className="section-enter glass-panel pixel-corner p-8 sm:p-10">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-gradient-to-br from-violet-600 to-cyan-500 font-[var(--font-display)] text-lg font-bold text-white">
              {review.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-[var(--font-display)] font-semibold text-white">{review.name}</span>
                <span className="text-xs text-[var(--color-mist)]">· {review.role}</span>
              </div>
              <Stars rating={review.rating} />
            </div>
          </div>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--color-mist)]">
            «{review.quote}»
          </p>
        </div>
      </div>

      {/* dot indicator with sliding highlight, mirroring the nav glider */}
      <div className="relative mt-6 flex items-center gap-2">
        <div
          className="absolute h-2 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ left: pill.left, width: pill.width }}
        />
        {REVIEWS.map((r, i) => (
          <button
            key={r.name}
            ref={(el) => {
              dotsRef.current[i] = el;
            }}
            onClick={() => goTo(i)}
            aria-label={`Отзыв ${i + 1}`}
            className={`h-2 rounded-full transition-all duration-500 ${
              i === index ? "w-6 bg-transparent" : "w-2 bg-white/15 hover:bg-white/30"
            }`}
          />
        ))}
      </div>
    </section>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="mt-1 flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className={`h-3.5 w-3.5 ${i < rating ? "text-cyan-300" : "text-white/15"}`}
          fill="currentColor"
        >
          <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.2 1 5.9L10 14.9l-5.2 2.9 1-5.9-4.3-4.2 5.9-.8L10 1.5z" />
        </svg>
      ))}
    </div>
  );
}

function ArrowButton({ onClick, dir }: { onClick: () => void; dir: "left" | "right" }) {
  return (
    <button
      onClick={onClick}
      aria-label={dir === "left" ? "Предыдущий отзыв" : "Следующий отзыв"}
      className="pixel-corner flex h-9 w-9 items-center justify-center border border-white/10 text-[var(--color-mist)] transition-all duration-300 hover:border-cyan-400/50 hover:text-white"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
        <path d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
