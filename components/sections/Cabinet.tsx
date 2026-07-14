"use client";

import { useAuth } from "@/lib/auth-context";
import Profile from "./cabinet/Profile";
import AuthPanel from "./cabinet/AuthPanel";

/**
 * "Личный кабинет" (account) section. This file only decides which of three
 * states to render — loading / logged-in / logged-out — and delegates the
 * actual UI to the components under ./cabinet/*. See that folder for the
 * profile card, auth form, and all the individual account sub-cards.
 */
export default function Cabinet() {
  const { user, loading: checking, setUser } = useAuth();

  if (checking) {
    return <div className="text-center text-[var(--color-mist)]">Загрузка кабинета…</div>;
  }

  if (user) {
    return (
      <Profile
        user={user}
        onLogout={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          setUser(null);
        }}
        onUserUpdate={(patch) => setUser({ ...user, ...patch })}
      />
    );
  }

  return <AuthPanel onAuthed={(u) => setUser(u)} />;
}
