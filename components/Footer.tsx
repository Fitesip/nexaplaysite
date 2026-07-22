"use client";

/**
 * Site footer: brand + socials, quick nav, legal links, and a server-IP
 * copy widget with live status — replaces the old single-row footer with a
 * fuller multi-column layout (closer to what donate-shop sites like
 * phoenix-pe.su use), while staying on the same pixel/glass visual language
 * as the rest of the site (pixel-corner, glass-panel, grad-text).
 */
import { useState } from "react";
import type { SectionId } from "./sections";
import { ServerStatusBadge } from "./ServerStatus";

const SITE_IP = "play.nexaplay.ru";

const NAV_LINKS: { id: SectionId; label: string }[] = [
  { id: "catalog", label: "Каталог" },
  { id: "news", label: "Новости" },
  { id: "forum", label: "Форум" },
  { id: "tips", label: "Рекомендации" },
  { id: "faq", label: "FAQ" },
];

export default function Footer({ onNavigate }: { onNavigate: (id: SectionId) => void }) {
  const [copied, setCopied] = useState(false);

  const copyIp = async () => {
    try {
      await navigator.clipboard.writeText(SITE_IP);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <footer className="relative z-10 mt-auto">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />

      <div className="border-t border-white/5 bg-[#050308] p-4">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <button
              onClick={() => onNavigate("home")}
              className="flex items-center gap-2"
              aria-label="NEXAPLAY — на главную"
            >
              <img src="/logo.png" alt="" className="h-8 w-8" />
              <span className="font-[var(--font-display)] text-lg font-bold tracking-wide text-white">
                NEXA<span className="grad-text">PLAY</span>
              </span>
            </button>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[var(--color-mist)]">
              Сервер, где экономика держится на игроках: кланы, торговые пути и честный
              PvP-баланс — без давления доната.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <SocialLink href="https://t.me/" label="Telegram">
                <path d="M21.5 3.5 2.5 11.1c-1.1.44-1.1 1.06-.2 1.34l4.9 1.53 1.9 5.94c.24.66.42.92.86.92.34 0 .5-.16.7-.36l1.86-1.8 4.02 2.96c.74.4 1.28.2 1.46-.68l2.64-12.5c.28-1.1-.42-1.6-1.44-1.14Z" />
              </SocialLink>
              <SocialLink href="https://discord.com/" label="Discord">
                <path d="M19.54 5.34A16.4 16.4 0 0 0 15.44 4a11.2 11.2 0 0 0-.52 1.06 15.3 15.3 0 0 0-4.55 0A11.2 11.2 0 0 0 9.84 4a16.7 16.7 0 0 0-4.1 1.35C3.15 9.18 2.45 12.9 2.8 16.57a16.5 16.5 0 0 0 5.03 2.54c.4-.55.77-1.13 1.08-1.73a10.7 10.7 0 0 1-1.7-.82l.42-.33c3.27 1.52 6.83 1.52 10.06 0l.43.33c-.55.32-1.12.6-1.7.82.31.6.67 1.18 1.08 1.73a16.4 16.4 0 0 0 5.03-2.54c.42-4.25-.72-7.93-2.99-11.23ZM9.47 14.34c-.98 0-1.79-.91-1.79-2.02 0-1.12.79-2.03 1.79-2.03s1.8.92 1.78 2.03c0 1.11-.79 2.02-1.78 2.02Zm6.26 0c-.98 0-1.79-.91-1.79-2.02 0-1.12.79-2.03 1.79-2.03s1.8.92 1.78 2.03c0 1.11-.78 2.02-1.78 2.02Z" />
              </SocialLink>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-[var(--font-display)] text-xs font-semibold uppercase tracking-[0.25em] text-white/70">
              Навигация
            </h3>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm">
              {NAV_LINKS.map((l) => (
                <li key={l.id}>
                  <button
                    onClick={() => onNavigate(l.id)}
                    className="text-[var(--color-mist)] transition-colors hover:text-white"
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal / contact */}
          <div>
            <h3 className="font-[var(--font-display)] text-xs font-semibold uppercase tracking-[0.25em] text-white/70">
              Информация
            </h3>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm">
              <li>
                <a href="/oferta.docx" className="text-[var(--color-mist)] transition-colors hover:text-white">
                  Оферта
                </a>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("privacy")}
                  className="text-left text-[var(--color-mist)] transition-colors hover:text-white"
                >
                  Политика конфиденциальности
                </button>
              </li>
              <li>
                <a
                  href="mailto:lokasad124@gmail.com"
                  className="text-[var(--color-mist)] transition-colors hover:text-white"
                >
                  lokasad124@gmail.com
                </a>
              </li>
            </ul>
          </div>

          {/* Server IP + status */}
          <div>
            <h3 className="font-[var(--font-display)] text-xs font-semibold uppercase tracking-[0.25em] text-white/70">
              Сервер
            </h3>
            <button
              onClick={copyIp}
              className="pixel-corner-sm group mt-4 flex w-full items-center justify-between gap-2 border border-white/10 bg-white/[0.03] px-3 py-2.5 font-[var(--font-mono)] text-xs text-[var(--color-mist)] transition-colors hover:border-cyan-400/40 hover:text-white"
            >
              <span>{copied ? "IP скопирован" : SITE_IP}</span>
              <span className={copied ? "text-emerald-300" : "text-white/40 group-hover:text-cyan-300"}>
                {copied ? "✓" : "⧉"}
              </span>
            </button>
          </div>
        </div>

        <div className="border-t border-white/5 pt-2 mt-4">
          <div className="mx-auto flex max-w-6xl flex-col-reverse items-center justify-between gap-3 px-6 py-5 text-center text-xs text-[var(--color-mist)]/60 sm:flex-row sm:text-left">
            <p>
              © {new Date().getFullYear()} NEXAPLAY · Ермолаев Никита Андреевич · ИНН 212411652294
            </p>
            <p>Сервер NEXAPLAY никак не связан с Mojang AB</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="pixel-corner flex h-10 w-10 items-center justify-center border border-white/10 text-[var(--color-mist)] transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-400/50 hover:text-white hover:shadow-[var(--shadow-glow-cyan)]"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        {children}
      </svg>
    </a>
  );
}
