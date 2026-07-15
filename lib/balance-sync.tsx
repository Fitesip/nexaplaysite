"use client";

import { useEffect, type ReactNode } from "react";
import { useAuth } from "./auth-context";
import { useSocket } from "./socket-context";

export default function BalanceSync({ children }: { children: ReactNode }) {
  const { setUser } = useAuth();
  const { subscribe } = useSocket();

  useEffect(
    () =>
      subscribe("balance_update", (data: { balanceKopecks: number }) => {
        setUser((current) =>
          current ? { ...current, balance_kopecks: Number(data.balanceKopecks) } : current
        );
      }),
    [setUser, subscribe]
  );

  return children;
}
