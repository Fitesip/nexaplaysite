"use client";

import { useState, useEffect } from "react";
import { GAME_MODE_MAP } from "@/components/gameModes";
import type { Order } from "./types";

/**
 * Accordion list of the player's past orders. Each row expands to show the
 * individual items purchased, the subtotal, any promo-code discount, and the
 * final total — mirroring what they saw at checkout.
 */
export default function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/orders", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setOrders(d?.orders ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="glass-panel pixel-corner mt-6 p-6">
      <h3 className="font-[var(--font-display)] text-base font-semibold text-white">История заказов</h3>

      {loading ? (
        <p className="mt-4 text-sm text-[var(--color-mist)]">Загрузка…</p>
      ) : orders.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--color-mist)]">У вас пока нет заказов.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {orders.map((order) => {
            const open = openId === order.id;
            return (
              <div key={order.id} className="border border-white/10">
                <button
                  onClick={() => setOpenId(open ? null : order.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors duration-300 hover:bg-white/5"
                >
                  <div>
                    <span className="font-[var(--font-mono)] text-sm text-white">Заказ №{order.id}</span>
                    <span className="ml-3 text-xs text-[var(--color-mist)]">
                      {new Date(order.created_at).toLocaleString("ru-RU", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-[var(--font-display)] text-sm font-semibold text-white">
                      {order.total} ₽
                    </span>
                    <span
                      className={`font-[var(--font-mono)] text-xl text-cyan-300 transition-transform duration-300 ${
                        open ? "rotate-45" : ""
                      }`}
                    >
                      +
                    </span>
                  </div>
                </button>

                {/* grid-rows trick animates height between 0 and auto without a fixed height */}
                <div
                  className="grid transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <div className="flex flex-col gap-2 border-t border-white/10 px-4 py-3">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm text-[var(--color-mist)]">
                          <span className="flex items-center gap-1.5">
                            <span
                              className="h-2 w-2 shrink-0 pixel-corner-sm"
                              style={{ background: GAME_MODE_MAP[item.game_mode]?.gradient }}
                            />
                            {item.name} × {item.qty}
                          </span>
                          <span className="text-white">{item.price * item.qty} ₽</span>
                        </div>
                      ))}
                      <div className="mt-1 flex justify-between border-t border-white/10 pt-2 text-sm text-[var(--color-mist)]">
                        <span>Сумма</span>
                        <span>{order.subtotal} ₽</span>
                      </div>
                      {order.discount_amount > 0 && (
                        <div className="flex justify-between text-sm text-cyan-300">
                          <span>Скидка{order.promo_code ? ` (${order.promo_code})` : ""}</span>
                          <span>−{order.discount_amount} ₽</span>
                        </div>
                      )}
                      <div className="flex justify-between font-[var(--font-display)] text-sm font-semibold text-white">
                        <span>Итого</span>
                        <span>{order.total} ₽</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
