"use client";

/**
 * The entire site is one page: this component owns which section is active
 * and which game mode is selected, restores that from the URL hash on load,
 * and swaps in the matching background + section component.
 */
import { useEffect, useState } from "react";
import BackgroundStage, { type BgKey } from "@/components/BackgroundStage";
import NavBar from "@/components/NavBar";
import type { SectionId } from "@/components/sections";
import type { GameMode } from "@/components/gameModes";
import Home from "@/components/sections/Home";
import Catalog from "@/components/sections/Catalog";
import News from "@/components/sections/News";
import Forum from "@/components/sections/Forum";
import GameTips from "@/components/sections/GameTips";
import FAQ from "@/components/sections/FAQ";
import Cabinet from "@/components/sections/Cabinet";
import Cart from "@/components/sections/Cart";
import Admin from "@/components/sections/Admin";

const VALID_SECTIONS: SectionId[] = [
  "home",
  "catalog",
  "news",
  "forum",
  "tips",
  "faq",
  "cabinet",
  "cart",
  "admin",
];

export default function Page() {
  const [active, setActive] = useState<SectionId>("home");
  const [mode, setMode] = useState<GameMode>("terryx");
  const [renderKey, setRenderKey] = useState(0);

  // restore the section from the URL hash on load, so a refresh stays put
  useEffect(() => {
    const fromHash = window.location.hash.replace("#", "").split("/")[0] as SectionId;
    if (VALID_SECTIONS.includes(fromHash)) {
      setActive(fromHash);
    }
    const onHashChange = () => {
      const id = window.location.hash.replace("#", "").split("/")[0] as SectionId;
      if (VALID_SECTIONS.includes(id)) setActive(id);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // re-trigger the enter animation every time the section changes
  useEffect(() => {
    setRenderKey((k) => k + 1);
  }, [active]);

  const goTo = (id: SectionId) => {
    if (id === active) return;
    setActive(id);
    window.history.replaceState(null, "", `#${id}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const bgKey: BgKey = active === "admin" ? "admin" : active === "catalog" ? `catalog:${mode}` : "default";

  return (
    <main className="relative flex min-h-screen flex-col">
      <BackgroundStage bgKey={bgKey} />
      <NavBar active={active} onChange={goTo} mode={mode} onSelectMode={setMode} />

      <div key={renderKey} className="section-enter mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-32 sm:px-6">
        {active === "home" && <Home onNavigate={goTo} />}
        {active === "catalog" && <Catalog mode={mode} />}
        {active === "news" && <News />}
        {active === "forum" && <Forum onNavigate={goTo} />}
        {active === "tips" && <GameTips />}
        {active === "faq" && <FAQ />}
        {active === "cabinet" && <Cabinet />}
        {active === "cart" && <Cart onNavigate={goTo} />}
        {active === "admin" && <Admin />}
      </div>

      <footer className="relative z-10 mt-auto border-t border-white/5 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-[var(--color-mist)]">
            © {new Date().getFullYear()} NEXAPLAY — пиксельный мир без границ.
          </p>
          <div className="flex items-center gap-3">
            <SocialLink href="https://t.me/" label="Telegram">
              <path d="M21.5 3.5 2.5 11.1c-1.1.44-1.1 1.06-.2 1.34l4.9 1.53 1.9 5.94c.24.66.42.92.86.92.34 0 .5-.16.7-.36l1.86-1.8 4.02 2.96c.74.4 1.28.2 1.46-.68l2.64-12.5c.28-1.1-.42-1.6-1.44-1.14Z" />
            </SocialLink>
            <SocialLink href="https://vk.com/" label="VK">
              <path d="M13.4 17.2c-5.5 0-8.6-3.77-8.73-10.04h2.75c.09 4.6 2.1 6.55 3.7 6.95V7.16h2.6v3.97c1.57-.17 3.22-1.98 3.78-3.97h2.6c-.43 2.45-2.24 4.26-3.53 5 1.29.6 3.35 2.18 4.13 5.04h-2.87c-.6-1.9-2.12-3.37-4.11-3.57v3.57Z" />
            </SocialLink>
          </div>
        </div>
      </footer>
    </main>
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
