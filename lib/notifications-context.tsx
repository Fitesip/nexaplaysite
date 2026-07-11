"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "./auth-context";
import { useSocket } from "./socket-context";

export type NotificationItem = {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
};

type NotificationsContextValue = {
  items: NotificationItem[];
  unread: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: number) => void;
  markAllRead: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { subscribe } = useSocket();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items ?? []);
      setUnread(data.unread ?? 0);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // one-time history load per login — live updates after that come over the socket
  useEffect(() => {
    if (!user) {
      setItems([]);
      setUnread(0);
      setLoading(false);
      return;
    }
    refresh();
  }, [user, refresh]);

  useEffect(() => {
    if (!user) return;
    return subscribe("notification", (n: NotificationItem) => {
      setItems((prev) => [n, ...prev].slice(0, 30));
      setUnread((u) => u + 1);
    });
  }, [user, subscribe]);

  const markRead = (id: number) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
    fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  };

  const markAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
  };

  return (
    <NotificationsContext.Provider value={{ items, unread, loading, refresh, markRead, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
