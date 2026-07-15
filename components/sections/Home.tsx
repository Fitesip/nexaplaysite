"use client";

/** Landing page: hero with IP-copy button and live server status, feature strip, and reviews. */
import { useEffect, useState } from "react";
import type { SectionId } from "@/components/sections";
import Recommendations from "@/components/sections/Recommendations";
import { ServerStatusCard } from "@/components/ServerStatus";

type NewsItem = {
  id: number;
  title: string;
  excerpt: string;
  pinned: number | boolean;
  created_at: string;
};

const STATS = [
  { value: "67", label: "игроков онлайн за месяц" },
  { value: "4", label: "кастомных механики" },
  { value: "3", label: "сезона с релиза" },
];

type Step = { title: string; text: string; action: SectionId | "copy" | null };

const RULES_HIGHLIGHT = [
  "Чит-клиенты, x-ray и дюп предметов — бан без предупреждения.",
  "Уважайте других игроков: без оскорблений и травли в чате.",
  "Гриферство и кража за пределами PvP-зон запрещены.",
];

const HOW_TO_JOIN: Step[] = [
  {
    title: "Запустите Minecraft",
    text: "Java Edition, актуальная версия — плагины и защита от читов подхватятся автоматически.",
    action: null,
  },
  {
    title: "Скопируйте IP",
    text: "Добавьте сервер в список миров по адресу play.nexaplay.ru и подключайтесь.",
    action: "copy",
  },
  {
    title: "Заведите аккаунт на сайте",
    text: "В личном кабинете привязывается ник, хранится история заказов и donate-статус.",
    action: "cabinet",
  },
  {
    title: "Прочитайте подсказки",
    text: "Пара минут перед первым спавном — и вы не потеряетесь в наших механиках.",
    action: "tips",
  },
];

export default function Home({ onNavigate }: { onNavigate: (id: SectionId) => void }) {
  const [copied, setCopied] = useState(false);
  const [news, setNews] = useState<NewsItem[] | null>(null);
  const ip = "play.nexaplay.ru";

  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then((d) => setNews((d.news ?? []).slice(0, 3)))
      .catch(() => setNews([]));
  }, []);

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

      {/* How to join */}
      <section>
        <h2 className="font-[var(--font-display)] text-3xl font-bold">
          Как начать <span className="grad-text">играть</span>
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_TO_JOIN.map((step, i) => {
            const clickable = step.action !== null;
            const Wrapper = clickable ? "button" : "div";
            let handleClick: (() => void) | undefined;
            if (step.action === "copy") handleClick = copyIp;
            else if (step.action) {
              const target = step.action;
              handleClick = () => onNavigate(target);
            }
            return (
              <Wrapper
                key={step.title}
                onClick={handleClick}
                className={`section-enter glass-panel pixel-corner p-5 text-left transition-transform duration-300 ${
                  clickable ? "cursor-pointer hover:-translate-y-1" : ""
                }`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex h-9 w-9 items-center justify-center bg-gradient-to-br from-violet-600 to-cyan-500 font-[var(--font-display)] text-sm font-bold text-white">
                  {i + 1}
                </div>
                <h3 className="mt-4 font-[var(--font-display)] text-base font-semibold text-white">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-sm text-[var(--color-mist)]">{step.text}</p>
                {step.action === "copy" && (
                  <span className="mt-3 inline-block font-[var(--font-mono)] text-xs text-cyan-300">
                    {copied ? "Скопировано ✓" : "Нажмите, чтобы скопировать →"}
                  </span>
                )}
              </Wrapper>
            );
          })}
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

      {/* Rules highlight */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-[var(--font-display)] text-3xl font-bold">
            Главные <span className="grad-text">правила</span>
          </h2>
          <button
            onClick={() => onNavigate("faq")}
            className="font-[var(--font-mono)] text-xs uppercase tracking-wide text-cyan-300/80 transition-colors duration-300 hover:text-white"
          >
            Все правила →
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {RULES_HIGHLIGHT.map((rule, i) => (
            <div
              key={i}
              className="section-enter glass-panel pixel-corner p-5"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className="flex h-8 w-8 items-center justify-center border border-rose-400/40 font-[var(--font-display)] text-sm font-bold text-rose-300">
                !
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-mist)]">{rule}</p>
            </div>
          ))}
        </div>
      </section>

      {news && news.length > 0 && (
        <section>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-[var(--font-display)] text-3xl font-bold">
              Свежие <span className="grad-text">новости</span>
            </h2>
            <button
              onClick={() => onNavigate("news")}
              className="font-[var(--font-mono)] text-xs uppercase tracking-wide text-cyan-300/80 transition-colors duration-300 hover:text-white"
            >
              Все новости →
            </button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {news.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => onNavigate("news")}
                className="section-enter glass-panel pixel-corner group p-5 text-left transition-transform duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <div className="flex items-center gap-2">
                  {!!item.pinned && (
                    <span className="bg-gradient-to-r from-violet-600 to-cyan-500 px-2 py-0.5 font-[var(--font-mono)] text-[10px] uppercase tracking-wide text-white">
                      Закреплено
                    </span>
                  )}
                  <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-mist)]/70">
                    {new Date(item.created_at).toLocaleDateString("ru-RU", { day: "2-digit", month: "long" })}
                  </span>
                </div>
                <h3 className="mt-2 font-[var(--font-display)] text-base font-semibold text-white transition-colors duration-300 group-hover:text-cyan-300">
                  {item.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm text-[var(--color-mist)]">{item.excerpt}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      <Recommendations />
    </div>
  );
}
