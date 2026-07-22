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
import Footer from "@/components/Footer";
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
import Privacy from "@/components/sections/Privacy";

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
  "privacy",
];

export default function Page() {
  const { clear } = useCart();
  const [active, setActive] = useState<SectionId>("home");
  const [mode, setMode] = useState<GameMode>("terryx");
  const [renderKey, setRenderKey] = useState(0);
  const [paymentNotice, setPaymentNotice] = useState<"success" | "fail" | "processing" | "invalid" | null>(null);

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
    if (payment === "success" || payment === "fail" || payment === "processing" || payment === "invalid") {
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
                  : paymentNotice === "processing"
                    ? "border-sky-400/40 bg-sky-400/10 text-sky-200"
                    : "border-rose-400/40 bg-rose-400/10 text-rose-200"
            }`}
          >
            {paymentNotice === "success"
              ? "Оплата подтверждена, заказ выдан."
              : paymentNotice === "fail"
                ? "Оплата отменена. Корзина сохранена — можно попробовать ещё раз."
                : paymentNotice === "processing"
                  ? "Платёж обрабатывается ЮKassa. Статус заказа обновится в кабинете в течение пары минут."
                  : "Не удалось найти заказ. Проверьте статус в кабинете."}
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
        {active === "privacy" && <Privacy/>}
      </div>

      <Footer onNavigate={goTo} />
    </main>
  );
}
