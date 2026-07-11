"use client";

import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/lib/cart-context";

type Item = {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number | null; // null = неограниченное количество
  oneTimePurchase: boolean; // можно купить только один раз на аккаунт
  purchased: boolean; // уже куплен этим пользователем (актуально только для oneTimePurchase)
  description: string;
};

export default function Catalog() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("Все");
  const { items: cartItems, addItem } = useCart();
  const [addedId, setAddedId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/catalog", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => ["Все", ...Array.from(new Set(items.map((i) => i.category)))], [items]);

  const filtered = useMemo(
    () => (filter === "Все" ? items : items.filter((i) => i.category === filter)),
    [filter, items]
  );

  const qtyInCart = (id: number) => cartItems.find((c) => c.id === String(id))?.qty ?? 0;

  const handleAdd = (item: Item) => {
    if (item.oneTimePurchase && (item.purchased || qtyInCart(item.id) > 0)) return;
    addItem({
      id: String(item.id),
      name: item.name,
      category: item.category,
      price: item.price,
      oneTimePurchase: item.oneTimePurchase,
    });
    setAddedId(item.id);
    setTimeout(() => setAddedId((cur) => (cur === item.id ? null : cur)), 1500);
  };

  return (
    <div>
      <h2 className="font-[var(--font-display)] text-4xl font-bold">
        Каталог <span className="grad-text">сервера</span>
      </h2>
      <p className="mt-3 max-w-2xl text-[var(--color-mist)]">
        Привилегии влияют только на удобство и косметику — никакого преимущества в PvP или экономике.
      </p>

      {loading ? (
        <p className="mt-10 text-center text-[var(--color-mist)]">Загрузка каталога…</p>
      ) : items.length === 0 ? (
        <div className="glass-panel pixel-corner mt-8 p-10 text-center text-[var(--color-mist)]">
          Каталог пока пуст.
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`pixel-corner px-4 py-2 text-sm font-medium transition-all duration-300 ${
                  filter === c
                    ? "bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-[var(--shadow-glow-cyan)]"
                    : "border border-white/10 text-[var(--color-mist)] hover:border-cyan-400/40 hover:text-white"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item, idx) => {
              const alreadyOwned = item.oneTimePurchase && item.purchased;
              const alreadyInCart = item.oneTimePurchase && qtyInCart(item.id) > 0;
              const outOfStock = (item.stock !== null && item.stock <= qtyInCart(item.id)) || alreadyOwned || alreadyInCart;
              return (
                <div
                  key={item.id}
                  className="section-enter glass-panel pixel-corner group flex flex-col justify-between p-5 transition-transform duration-300 hover:-translate-y-1"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-[var(--font-mono)] text-[11px] uppercase tracking-wide text-cyan-300/80">
                        {item.category}
                      </span>
                      <span className="font-[var(--font-display)] font-semibold text-white">{item.price} ₽</span>
                    </div>
                    <h3 className="mt-3 font-[var(--font-display)] text-lg font-semibold text-white">{item.name}</h3>
                    {item.description && (
                      <p className="mt-2 text-sm text-[var(--color-mist)]">{item.description}</p>
                    )}
                    {item.stock !== null && (
                      <p className="mt-2 text-xs text-[var(--color-mist)]/80">
                        {item.stock > 0 ? `В наличии: ${item.stock} шт.` : "Нет в наличии"}
                      </p>
                    )}
                    {item.oneTimePurchase && (
                      <p className="mt-2 text-xs text-cyan-300/80">
                        {alreadyOwned ? "Уже куплено" : "Можно купить только один раз"}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleAdd(item)}
                    disabled={outOfStock}
                    className="mt-5 border border-white/15 py-2 text-sm text-[var(--color-mist)] transition-colors duration-300 group-hover:border-cyan-400/50 group-hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:group-hover:border-white/15 disabled:group-hover:text-[var(--color-mist)]"
                  >
                    {alreadyOwned
                      ? "Уже куплено"
                      : outOfStock
                        ? "Нет в наличии"
                        : addedId === item.id
                          ? "Добавлено в корзину ✓"
                          : "В корзину"}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
