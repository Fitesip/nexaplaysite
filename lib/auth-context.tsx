"use client";

/**
 * React context that tracks the currently logged-in user across the whole app.
 * On mount it calls GET /api/auth/me once to restore the session from the
 * httpOnly cookie, then exposes `user` + `setUser` so any component can read
 * or update it (e.g. after login, logout, or editing the profile).
 */
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";

export type Role = "user" | "rcon" | "helper" | "admin" | "main_admin";
export type CurrentUser = {
  id: number;
  username: string;
  email: string;
  avatar_url: string | null;
  minecraft_username: string | null;
  minecraft_uuid: string | null;
  minecraft_linked_at: string | null;
  role: Role;
  game_currency: number;
  forum_banned: boolean;
  forum_banned_until: string | null;
  created_at: string;
};

type AuthContextValue = {
  user: CurrentUser | null;
  loading: boolean;
  /** Re-fetches /api/auth/me — call after login/register/logout, not on every navigation. */
  refresh: () => Promise<void>;
  /** Set the user directly (e.g. straight from a login/register response) without a round trip. */
  setUser: (user: CurrentUser | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = res.ok ? await res.json() : null;
      setUser(data?.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // fetched once for the whole app — NOT re-run on section navigation
  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, setUser }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
