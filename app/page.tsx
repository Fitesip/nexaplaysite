"use client";

/**
 * The entire site is one page: this component owns which section is active
 * and which game mode is selected, restores that from the URL hash on load,
 * and swaps in the matching background + section component.
 */
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-context";
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
  const { clear } = useCart();
  const [active, setActive] = useState<SectionId>("home");
  const [mode, setMode] = useState<GameMode>("terryx");
  const [renderKey, setRenderKey] = useState(0);
  const [paymentNotice, setPaymentNotice] = useState<"success" | "fail" | "invalid" | null>(null);

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (payment === "success" || payment === "fail" || payment === "invalid") {
      setPaymentNotice(payment);
      if (payment === "success") clear();
      window.history.replaceState(null, "", window.location.hash || "#home");
    }
  }, [clear]);

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
        {paymentNotice && (
          <div
            className={`pixel-corner mb-6 border px-4 py-3 text-sm ${
              paymentNotice === "success"
                ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                : paymentNotice === "fail"
                  ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
                  : "border-rose-400/40 bg-rose-400/10 text-rose-200"
            }`}
          >
            {paymentNotice === "success"
              ? "Оплата принята. Заказ появится в истории после подтверждения платёжной системой."
              : paymentNotice === "fail"
                ? "Оплата отменена. Корзина сохранена — можно попробовать ещё раз."
                : "Не удалось подтвердить подпись возврата Robokassa. Проверьте статус заказа в кабинете."}
            <button
              onClick={() => setPaymentNotice(null)}
              className="float-right ml-4 text-current opacity-70 hover:opacity-100"
              aria-label="Закрыть уведомление"
            >
              ×
            </button>
          </div>
        )}
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

      <footer className="relative z-10 mt-auto border-t border-white/5  pt-4">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row pb-4 px-6">
          <div className="text-center text-[var(--color-mist)] sm:text-left">
            <p className="text-sm">
              © {new Date().getFullYear()} NEXAPLAY — пиксельный мир без границ.
            </p>
            <p className="mt-1 text-xs">
              Ермолаев Никита Андреевич · ИНН 212411652294
            </p>
            <p className="mt-1 text-xs">
              По всем вопросам · lokasad124@gmail.com
            </p>
            <p className="mt-1 text-xs">
              <a href="/oferta.docx">Оферта</a>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SocialLink href="https://t.me/" label="Telegram">
              <path d="M21.5 3.5 2.5 11.1c-1.1.44-1.1 1.06-.2 1.34l4.9 1.53 1.9 5.94c.24.66.42.92.86.92.34 0 .5-.16.7-.36l1.86-1.8 4.02 2.96c.74.4 1.28.2 1.46-.68l2.64-12.5c.28-1.1-.42-1.6-1.44-1.14Z" />
            </SocialLink>
            <SocialLink href="https://discord.com/" label="Discord">
              <path d="M19.54 5.34A16.4 16.4 0 0 0 15.44 4a11.2 11.2 0 0 0-.52 1.06 15.3 15.3 0 0 0-4.55 0A11.2 11.2 0 0 0 9.84 4a16.7 16.7 0 0 0-4.1 1.35C3.15 9.18 2.45 12.9 2.8 16.57a16.5 16.5 0 0 0 5.03 2.54c.4-.55.77-1.13 1.08-1.73a10.7 10.7 0 0 1-1.7-.82l.42-.33c3.27 1.52 6.83 1.52 10.06 0l.43.33c-.55.32-1.12.6-1.7.82.31.6.67 1.18 1.08 1.73a16.4 16.4 0 0 0 5.03-2.54c.42-4.25-.72-7.93-2.99-11.23ZM9.47 14.34c-.98 0-1.79-.91-1.79-2.02 0-1.12.79-2.03 1.79-2.03s1.8.92 1.78 2.03c0 1.11-.79 2.02-1.78 2.02Zm6.26 0c-.98 0-1.79-.91-1.79-2.02 0-1.12.79-2.03 1.79-2.03s1.8.92 1.78 2.03c0 1.11-.78 2.02-1.78 2.02Z" />
            </SocialLink>

          </div>
        </div>
        <div className="mx-auto flex flex-col items-center justify-center gap-4 flex-col bg-[#030106] py-2 px-6 text-[#121015]">
          <p className="text-sm">
            Сервер NEXAPLAY никак не связан с Mojang AB
          </p>
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
