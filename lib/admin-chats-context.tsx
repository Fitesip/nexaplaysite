"use client";

/**
 * React context for the staff support inbox: the list of open chats with
 * unread counts, kept live via the shared socket connection and exposed to
 * both the admin nav badge and the AdminSupport panel.
 */
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "./auth-context";
import { useSocket } from "./socket-context";

export type ChatSummary = {
  user_id: number;
  username: string;
  email: string;
  avatar_url: string | null;
  minecraft_uuid: string | null;
  minecraft_username: string | null;
  last_message: string | null;
  last_sender_role: "user" | "admin" | null;
  last_at: string | null;
  unread: number;
  open_tickets: number;
};

type AdminChatsContextValue = {
  chats: ChatSummary[];
  unreadTotal: number;
  loading: boolean;
  refresh: () => Promise<void>;
};

const AdminChatsContext = createContext<AdminChatsContextValue | null>(null);

const STAFF_ROLES = ["helper", "admin", "main_admin"];

export function AdminChatsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { subscribe } = useSocket();
  const isStaff = !!user && STAFF_ROLES.includes(user.role);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isStaff) return;
    try {
      const res = await fetch("/api/support/admin/chats", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setChats(data.chats ?? []);
    } finally {
      setLoading(false);
    }
  }, [isStaff]);

  useEffect(() => {
    if (!isStaff) {
      setChats([]);
      setLoading(false);
      return;
    }
    refresh();
  }, [isStaff, refresh]);

  // any new message on any thread (from a user, or from a staff member on another tab)
  // updates that one row in place — instant, no round trip. Falls back to a full
  // refresh only for a thread we don't have yet (e.g. a brand-new user's first ticket).
  useEffect(() => {
    if (!isStaff) return;
    return subscribe(
      "support:user_message",
      (payload: {
        userId: number;
        username?: string | null;
        avatar_url?: string | null;
        minecraft_uuid?: string | null;
        minecraft_username?: string | null;
        isNewTicket?: boolean;
        message: { id: number; sender_role: "user" | "admin"; body: string; created_at: string };
      }) => {
        setChats((prev) => {
          const idx = prev.findIndex((c) => c.user_id === payload.userId);
          if (idx === -1) {
            refresh();
            return prev;
          }
          const updated: ChatSummary = {
            ...prev[idx],
            username: payload.username ?? prev[idx].username,
            avatar_url: payload.avatar_url ?? prev[idx].avatar_url,
            minecraft_uuid: payload.minecraft_uuid ?? prev[idx].minecraft_uuid,
            minecraft_username: payload.minecraft_username ?? prev[idx].minecraft_username,
            last_message: payload.message.body,
            last_sender_role: payload.message.sender_role,
            last_at: payload.message.created_at,
            unread: payload.message.sender_role === "user" ? prev[idx].unread + 1 : prev[idx].unread,
            open_tickets: prev[idx].open_tickets + (payload.isNewTicket ? 1 : 0),
          };
          const rest = prev.filter((_, i) => i !== idx);
          return [updated, ...rest];
        });
      }
    );
  }, [isStaff, subscribe, refresh]);

  // a ticket being closed changes that user's open-ticket count — bump the row in place
  useEffect(() => {
    if (!isStaff) return;
    return subscribe("support:ticket_closed", (payload: { userId: number }) => {
      setChats((prev) =>
        prev.map((c) => (c.user_id === payload.userId ? { ...c, open_tickets: Math.max(0, c.open_tickets - 1) } : c))
      );
    });
  }, [isStaff, subscribe]);

  // safety net: if a socket were ever silently dead for a while, don't leave the list
  // stale forever — a light periodic resync catches up regardless.
  useEffect(() => {
    if (!isStaff) return;
    const t = setInterval(refresh, 20_000);
    return () => clearInterval(t);
  }, [isStaff, refresh]);

  const unreadTotal = chats.reduce((sum, c) => sum + c.unread, 0);

  return (
    <AdminChatsContext.Provider value={{ chats, unreadTotal, loading, refresh }}>
      {children}
    </AdminChatsContext.Provider>
  );
}

export function useAdminChats() {
  const ctx = useContext(AdminChatsContext);
  if (!ctx) throw new Error("useAdminChats must be used within AdminChatsProvider");
  return ctx;
}
