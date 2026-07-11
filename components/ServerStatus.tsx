"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/lib/socket-context";

type ServerStatus =
  | { online: true; players: { online: number; max: number }; motd: string; version: string; latencyMs: number }
  | { online: false };

/**
 * One REST call for the first paint, then live updates pushed over the shared
 * WebSocket connection (the server checks once and broadcasts to everyone —
 * see server.js — instead of every tab polling the endpoint on its own).
 */
function useServerStatus() {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const { subscribe } = useSocket();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/server-status", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: ServerStatus) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatus({ online: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => subscribe("server:status", (data: ServerStatus) => setStatus(data)), [subscribe]);

  return status;
}

/** Small pill for navbars / headers: a pulsing dot + short label. */
export function ServerStatusBadge() {
  const status = useServerStatus();
  const loading = status === null;
  const online = status?.online === true;

  return (
    <div
      className="glass-panel pixel-corner flex items-center gap-2 px-4 py-2.5"
      title={online ? "Сервер онлайн" : loading ? "Проверяем статус…" : "Сервер офлайн"}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={`absolute inline-flex h-full w-full rounded-full ${
            loading ? "bg-yellow-400/60" : online ? "animate-ping bg-cyan-400/70" : "bg-rose-500/70"
          }`}
        />
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${
            loading ? "bg-yellow-400" : online ? "bg-cyan-400" : "bg-rose-500"
          }`}
        />
      </span>
      <span className="font-[var(--font-mono)] text-xs text-[var(--color-mist)]">
        {loading ? "…" : online ? `${status.players.online}/${status.players.max} онлайн` : "офлайн"}
      </span>
    </div>
  );
}

/** Full card for the home page hero: status, player count, version, latency. */
export function ServerStatusCard() {
  const status = useServerStatus();
  const loading = status === null;
  const online = status?.online === true;

  return (
    <div className="glass-panel pixel-corner p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`absolute inline-flex h-full w-full rounded-full ${
                loading ? "bg-yellow-400/60" : online ? "animate-ping bg-cyan-400/70" : "bg-rose-500/70"
              }`}
            />
            <span
              className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                loading ? "bg-yellow-400" : online ? "bg-cyan-400" : "bg-rose-500"
              }`}
            />
          </span>
          <span className="font-[var(--font-display)] text-sm font-semibold text-white">
            {loading ? "Проверяем статус…" : online ? "Сервер онлайн" : "Сервер офлайн"}
          </span>
        </div>
        {online && (
          <span className="font-[var(--font-mono)] text-xs text-[var(--color-mist)]">{status.latencyMs} ms</span>
        )}
      </div>

      {online && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="border border-white/10 bg-black/20 p-3">
            <div className="font-[var(--font-display)] text-xl font-bold text-white">
              {status.players.online}
              <span className="text-sm font-normal text-[var(--color-mist)]"> / {status.players.max}</span>
            </div>
            <div className="mt-1 text-[11px] text-[var(--color-mist)]">игроков сейчас</div>
          </div>
          <div className="border border-white/10 bg-black/20 p-3">
            <div className="truncate font-[var(--font-display)] text-sm font-semibold text-white">
              {status.version}
            </div>
            <div className="mt-1 text-[11px] text-[var(--color-mist)]">версия</div>
          </div>
        </div>
      )}

      {!online && !loading && (
        <p className="mt-3 text-sm text-[var(--color-mist)]">
          Не удалось подключиться к серверу. Возможно, идут технические работы — загляните в «Новости».
        </p>
      )}
    </div>
  );
}
