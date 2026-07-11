"use client";

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";

export type CartItem = {
  id: string;
  name: string;
  category: string;
  price: number; // in rubles
  qty: number;
  oneTimePurchase?: boolean; // can only ever be bought once per account, qty is locked to 1
};

type CartContextValue = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
  removeItem: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  totalCount: number;
  subtotal: number;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "nexaplay_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // load persisted cart once on mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* corrupt or unavailable storage, start empty */
    } finally {
      setHydrated(true);
    }
  }, []);

  // persist on every change (after initial load, to avoid wiping storage with the empty initial state)
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage unavailable, cart just won't persist across reloads */
    }
  }, [items, hydrated]);

  const addItem: CartContextValue["addItem"] = (item, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        // one-time items are capped at qty 1 — already in the cart, nothing to add
        if (existing.oneTimePurchase) return prev;
        return prev.map((i) => (i.id === item.id ? { ...i, qty: i.qty + qty } : i));
      }
      return [...prev, { ...item, qty: item.oneTimePurchase ? 1 : qty }];
    });
  };

  const removeItem: CartContextValue["removeItem"] = (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const setQty: CartContextValue["setQty"] = (id, qty) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => i.id !== id)
        : prev.map((i) => (i.id === id ? { ...i, qty: i.oneTimePurchase ? 1 : qty } : i))
    );
  };

  const clear = () => setItems([]);

  const totalCount = useMemo(() => items.reduce((sum, i) => sum + i.qty, 0), [items]);
  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.qty * i.price, 0), [items]);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, setQty, clear, totalCount, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
