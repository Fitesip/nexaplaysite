"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useAuth } from "./auth-context";

type Handler = (payload: any) => void;

type SocketContextValue = {
  connected: boolean;
  /** Subscribes to messages of a given `type`; returns an unsubscribe function. */
  subscribe: (type: string, handler: Handler) => () => void;
};

const SocketContext = createContext<SocketContextValue | null>(null);

const MAX_BACKOFF_MS = 10_000;

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, Set<Handler>>>(new Map());
  const attemptRef = useRef(0);

  useEffect(() => {
    // The server only reads the session cookie once, at the moment a socket connects,
    // and remembers that userId/role for the connection's whole lifetime. Wait for the
    // initial /api/auth/me check so the very first connection already carries the right
    // identity, and reconnect below whenever `user` changes (login/logout) — otherwise a
    // user who logs in mid-session would keep talking over a socket the server still
    // thinks is anonymous, and staff who log in wouldn't get support pushes either.
    if (loading) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const connect = () => {
      if (cancelled) return;
      const proto = window.location.protocol === "https:" ? "wss" : "ws";
      const url = `${proto}://${window.location.host}/ws`;
      console.log("[ws] connecting to", url);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        // eslint-disable-next-line no-console
        console.log("[ws] connected");
        attemptRef.current = 0;
        setConnected(true);
      };
      ws.onclose = (event) => {
        // eslint-disable-next-line no-console
        console.log("[ws] closed", { code: event.code, reason: event.reason, wasClean: event.wasClean });
        setConnected(false);
        if (cancelled) return;
        const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attemptRef.current);
        attemptRef.current += 1;
        timer = setTimeout(connect, delay);
      };
      ws.onerror = (event) => {
        // eslint-disable-next-line no-console
        console.log("[ws] error", event);
        ws.close();
      };
      ws.onmessage = (event) => {
        let msg: any;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }
        const handlers = handlersRef.current.get(msg?.type);
        if (!handlers) return;
        // messages carry either a `data` payload or fields alongside `type` directly —
        // handlers get whichever is present so they don't need to know which shape.
        const payload = "data" in msg ? msg.data : msg;
        handlers.forEach((h) => h(payload));
      };
    };

    connect();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      wsRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user?.id]);

  const subscribe = useCallback((type: string, handler: Handler) => {
    if (!handlersRef.current.has(type)) handlersRef.current.set(type, new Set());
    handlersRef.current.get(type)!.add(handler);
    return () => {
      handlersRef.current.get(type)?.delete(handler);
    };
  }, []);

  return <SocketContext.Provider value={{ connected, subscribe }}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used within SocketProvider");
  return ctx;
}
