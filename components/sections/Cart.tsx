"use client";

/**
 * The shopping cart page: line items (grouped/priced via lib/cart-context),
 * a promo-code field that validates against the server, and a mock checkout
 * that clears the cart and redeems the promo code (no real payment gateway).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { GAME_MODES } from "@/components/gameModes";
import type { SectionId } from "@/components/sections";

type PromoState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "applied"; code: string; type: "percent" | "fixed"; value: number; discountAmount: number }
  | { status: "error"; message: string };

export default function Cart({ onNavigate }: { onNavigate: (id: SectionId) => void }) {
  const { items, removeItem, setQty, clear, subtotal } = useCart();
  const { user } = useAuth();
  const needsMcLink = !!user && !user.minecraft_username;
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<PromoState>({ status: "idle" });
  const [checkoutDone, setCheckoutDone] = useState<{ total: number } | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const skipNextRevalidate = useRef(false);
  const checkoutRequestIdRef = useRef<string | null>(null);

  const discount = promo.status === "applied" ? promo.discountAmount : 0;
  const total = Math.max(0, subtotal - discount);

  useEffect(() => {
    checkoutRequestIdRef.current = null;
  }, [items, promo]);

  // Group cart lines by game mode so items from different modes are visually
  // separated instead of being shown as one undifferentiated list.
  const groupedByMode = useMemo(
    () =>
      GAME_MODES.map((m) => ({ meta: m, items: items.filter((i) => i.mode === m.id) })).filter(
        (g) => g.items.length > 0
      ),
    [items]
  );
  const itemAnimationIndex = useMemo(
    () =>
      new Map(
        groupedByMode
          .flatMap((group) => group.items)
          .map((item, index) => [item.id, index])
      ),
    [groupedByMode]
  );

  const validateAgainstServer = async (code: string, currentSubtotal: number) => {
    const res = await fetch("/api/promocodes/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, subtotal: currentSubtotal }),
    });
    const data = await res.json();
    return { ok: res.ok && data.valid, data };
  };

  const applyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromo({ status: "loading" });
    try {
      const { ok, data } = await validateAgainstServer(promoInput.trim(), subtotal);
      if (!ok) {
        setPromo({ status: "error", message: data.error ?? "Промокод недействителен" });
        return;
      }
      skipNextRevalidate.current = true;
      setPromo({ status: "applied", code: data.code, type: data.type, value: data.value, discountAmount: data.discountAmount });
    } catch {
      setPromo({ status: "error", message: "Не удалось проверить промокод" });
    }
  };

  const removePromo = () => {
    setPromo({ status: "idle" });
    setPromoInput("");
  };

  // Скидка пересчитывается на сервере каждый раз, когда меняется сумма корзины
  // (добавили товар, поменяли количество), — так промокод больше не "залипает"
  // на старой сумме.
  useEffect(() => {
    if (promo.status !== "applied") return;
    if (skipNextRevalidate.current) {
      skipNextRevalidate.current = false;
      return;
    }
    const code = promo.code;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const { ok, data } = await validateAgainstServer(code, subtotal);
        if (cancelled) return;
        if (!ok) {
          setPromo({ status: "error", message: data.error ?? "Промокод больше не действителен" });
          return;
        }
        setPromo({ status: "applied", code: data.code, type: data.type, value: data.value, discountAmount: data.discountAmount });
      } catch {
        if (!cancelled) setPromo({ status: "error", message: "Не удалось пересчитать промокод" });
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  const checkout = async () => {
    setCheckingOut(true);
    setCheckoutError("");
    const requestId = checkoutRequestIdRef.current ?? crypto.randomUUID();
    checkoutRequestIdRef.current = requestId;
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ id: i.catalogId, qty: i.qty })),
          promoCode: promo.status === "applied" ? promo.code : undefined,
          requestId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Не удалось оформить заказ");
      clear();
      setPromo({ status: "idle" });
      setPromoInput("");
      setCheckoutDone({ total: data.total });
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Ошибка оформления заказа");
    } finally {
      setCheckingOut(false);
    }
  };

  if (checkoutDone) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <div className="glass-panel pixel-corner p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-cyan-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="h-8 w-8">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="mt-5 font-[var(--font-display)] text-2xl font-bold text-white">Заказ оформлен</h2>
          <p className="mt-2 text-sm text-[var(--color-mist)]">
            Спасибо за покупку на {checkoutDone.total} ₽! Привилегии и предметы будут выданы на сервере в течение
            нескольких минут. Историю заказов можно посмотреть в личном кабинете.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => onNavigate("catalog")}
              className="pixel-corner border border-white/15 px-6 py-2.5 text-sm text-[var(--color-mist)] transition-all duration-300 hover:border-cyan-400/50 hover:text-white"
            >
              Вернуться в каталог
            </button>
            <button
              onClick={() => onNavigate("cabinet")}
              className="pixel-corner bg-gradient-to-r from-violet-600 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-glow-cyan)] transition-transform duration-300 hover:scale-[1.02]"
            >
              История заказов
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-[var(--font-display)] text-4xl font-bold">
        Ваша <span className="grad-text">корзина</span>
      </h2>
      <p className="mt-3 max-w-2xl text-[var(--color-mist)]">
        Проверьте выбранные привилегии и наборы, примените промокод и оформите заказ.
      </p>

      {items.length === 0 ? (
        <div className="glass-panel pixel-corner mt-8 p-10 text-center">
          <p className="text-[var(--color-mist)]">Корзина пуста.</p>
          <button
            onClick={() => onNavigate("catalog")}
            className="pixel-corner mt-5 border border-white/15 px-6 py-2.5 text-sm text-[var(--color-mist)] transition-all duration-300 hover:border-cyan-400/50 hover:text-white"
          >
            Перейти в каталог
          </button>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          {/* items list, grouped by game mode */}
          <div className="flex flex-col gap-6">
            {groupedByMode.map((group) => (
              <div key={group.meta.id}>
                <div className="mb-2.5 flex items-center gap-2">
                  <span className="h-3 w-3 shrink-0 pixel-corner-sm" style={{ background: group.meta.gradient }} />
                  <span className="font-[var(--font-display)] text-sm font-semibold text-white">{group.meta.label}</span>
                  <span className="text-xs text-[var(--color-mist)]">· {group.meta.tagline}</span>
                </div>
                <div className="flex flex-col gap-3">
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      className="section-enter glass-panel pixel-corner flex items-center gap-4 border-l-2 p-4"
                      style={{
                        borderLeftColor: group.meta.accent,
                        animationDelay: `${(itemAnimationIndex.get(item.id) ?? 0) * 60}ms`,
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-[var(--font-mono)] text-[11px] uppercase tracking-wide text-cyan-300/80">
                          {item.category}
                        </span>
                        <h3 className="truncate font-[var(--font-display)] text-base font-semibold text-white">
                          {item.name}
                        </h3>
                        <p className="mt-1 text-sm text-[var(--color-mist)]">{item.price} ₽ / шт.</p>
                      </div>

                      <div className="flex items-center gap-2 border border-white/10">
                        <button
                          onClick={() => setQty(item.id, item.qty - 1)}
                          className="flex h-8 w-8 items-center justify-center text-[var(--color-mist)] transition-colors hover:text-white"
                          aria-label="Уменьшить количество"
                        >
                          −
                        </button>
                        <span className="w-6 text-center font-[var(--font-mono)] text-sm text-white">{item.qty}</span>
                        <button
                          onClick={() => setQty(item.id, item.qty + 1)}
                          disabled={item.oneTimePurchase}
                          aria-label="Увеличить количество"
                          title={item.oneTimePurchase ? "Этот товар можно купить только в количестве 1 шт." : undefined}
                          className="flex h-8 w-8 items-center justify-center text-[var(--color-mist)] transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-[var(--color-mist)]"
                        >
                          +
                        </button>
                      </div>

                      <div className="w-20 shrink-0 text-right font-[var(--font-display)] font-semibold text-white">
                        {item.price * item.qty} ₽
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        aria-label="Удалить из корзины"
                        className="shrink-0 text-[var(--color-mist)] transition-colors hover:text-rose-400"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* summary */}
          <div className="glass-panel pixel-corner h-fit p-6">
            <h3 className="font-[var(--font-display)] text-lg font-semibold text-white">Промокод</h3>
            <div className="mt-3 flex gap-2">
              <input
                value={promoInput}
                onChange={(e) => {
                  setPromoInput(e.target.value);
                  if (promo.status !== "idle") setPromo({ status: "idle" });
                }}
                disabled={promo.status === "applied"}
                placeholder="Введите код"
                className="min-w-0 flex-1 border border-white/10 bg-black/30 px-3 py-2 text-sm uppercase text-white outline-none transition-colors duration-300 focus:border-cyan-400/60 disabled:opacity-60"
              />
              {promo.status === "applied" ? (
                <button
                  onClick={removePromo}
                  className="pixel-corner border border-white/15 px-4 py-2 text-sm text-[var(--color-mist)] transition-all duration-300 hover:border-rose-400/50 hover:text-rose-300"
                >
                  Убрать
                </button>
              ) : (
                <button
                  onClick={applyPromo}
                  disabled={promo.status === "loading" || !promoInput.trim()}
                  className="pixel-corner border border-white/15 px-4 py-2 text-sm text-[var(--color-mist)] transition-all duration-300 hover:border-cyan-400/50 hover:text-white disabled:opacity-50"
                >
                  {promo.status === "loading" ? "…" : "Применить"}
                </button>
              )}
            </div>
            {promo.status === "applied" && (
              <p className="mt-2 text-sm text-cyan-300">
                Промокод «{promo.code}» применён: −{promo.discountAmount} ₽
              </p>
            )}
            {promo.status === "error" && <p className="mt-2 text-sm text-rose-400">{promo.message}</p>}

            <div className="mt-6 flex flex-col gap-2 border-t border-white/10 pt-5 text-sm">
              <div className="flex justify-between text-[var(--color-mist)]">
                <span>Сумма</span>
                <span>{subtotal} ₽</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-cyan-300">
                  <span>Скидка</span>
                  <span>−{discount} ₽</span>
                </div>
              )}
              <div className="mt-2 flex justify-between font-[var(--font-display)] text-lg font-bold text-white">
                <span>Итого</span>
                <span>{total} ₽</span>
              </div>
            </div>

            {checkoutError && <p className="mt-4 text-sm text-rose-400">{checkoutError}</p>}

            {needsMcLink && (
              <div className="mt-4 border border-amber-400/30 bg-amber-400/5 p-3 text-sm text-amber-200">
                Привяжите Minecraft-аккаунт в{" "}
                <button onClick={() => onNavigate("cabinet")} className="underline underline-offset-2 hover:text-amber-100">
                  личном кабинете
                </button>
                , чтобы оформить заказ.
              </div>
            )}

            <button
              onClick={checkout}
              disabled={checkingOut || needsMcLink}
              className="pixel-corner mt-6 w-full bg-gradient-to-r from-violet-600 to-cyan-500 py-3 font-[var(--font-display)] text-sm font-semibold text-white shadow-[var(--shadow-glow-violet)] transition-transform duration-300 hover:scale-[1.02] disabled:opacity-60"
            >
              {checkingOut ? "Оформляем…" : "Оформить заказ"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
