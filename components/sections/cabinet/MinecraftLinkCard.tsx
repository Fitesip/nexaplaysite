"use client";

import { useState, useEffect } from "react";
import type { MinecraftLinkStatus, User } from "./types";

/**
 * Lets the player link their Minecraft nickname to their site account.
 *
 * Flow: the player types their nickname -> the server whispers a one-time code
 * to them in-game via RCON (`/api/auth/minecraft` POST) -> the player copies
 * that code back into the field below -> the server verifies it (PUT) and
 * stores the link. This proves ownership of the nickname without needing the
 * player to be online at the exact moment they click a button on the site.
 */
export default function MinecraftLinkCard({
  user,
  onUserUpdate,
}: {
  user: User;
  onUserUpdate: (patch: Partial<User>) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<{ nickname: string; expiresAt: string } | null>(null);
  const [nicknameInput, setNicknameInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [now, setNow] = useState(Date.now());

  const linked = !!user.minecraft_username;

  // on mount, check whether there's already a pending (not-yet-confirmed) link request
  useEffect(() => {
    fetch("/api/auth/minecraft", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: MinecraftLinkStatus | null) => {
        if (d?.pending) setPending(d.pending);
      })
      .finally(() => setLoading(false));
  }, []);

  // tick every second while a pending request is shown, so the countdown updates
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [pending]);

  const secondsLeft = pending ? Math.max(0, Math.floor((new Date(pending.expiresAt).getTime() - now) / 1000)) : 0;

  /** Asks the server to (re)send a fresh in-game code for the given nickname. */
  const requestCode = async (nickname: string) => {
    const res = await fetch("/api/auth/minecraft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Не удалось отправить код");
    setPending({ nickname: data.nickname, expiresAt: data.expiresAt });
    setCodeInput("");
  };

  const startLink = async () => {
    setError("");
    setStarting(true);
    try {
      await requestCode(nicknameInput.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setStarting(false);
    }
  };

  const resend = async () => {
    if (!pending) return;
    setError("");
    setResending(true);
    try {
      await requestCode(pending.nickname);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setResending(false);
    }
  };

  /** Submits the code the player read in-game; on success, the account is linked. */
  const verify = async () => {
    setError("");
    setVerifying(true);
    try {
      const res = await fetch("/api/auth/minecraft", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Не удалось подтвердить");
      onUserUpdate({
        minecraft_username: data.linked.username,
        minecraft_uuid: data.linked.uuid,
        minecraft_linked_at: new Date().toISOString(),
      });
      setPending(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setVerifying(false);
    }
  };

  const cancelPending = () => {
    setPending(null);
    setError("");
    fetch("/api/auth/minecraft", { method: "DELETE" }).catch(() => {});
  };

  const unlink = async () => {
    setError("");
    try {
      const res = await fetch("/api/auth/minecraft", { method: "DELETE" });
      if (!res.ok) throw new Error("Не удалось отвязать аккаунт");
      onUserUpdate({ minecraft_username: null, minecraft_uuid: null, minecraft_linked_at: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  };

  return (
    <div className="glass-panel pixel-corner mt-6 p-6">
      <h3 className="font-[var(--font-display)] text-base font-semibold text-white">Minecraft-аккаунт</h3>

      {loading ? (
        <p className="mt-3 text-sm text-[var(--color-mist)]">Загрузка…</p>
      ) : linked ? (
        // already linked: show the skin head + an "unlink" escape hatch
        <div className="mt-4 flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://mc-heads.net/avatar/${user.minecraft_uuid}/44`}
            alt={user.minecraft_username ?? ""}
            className="h-11 w-11 shrink-0 object-cover"
          />
          <div className="min-w-0 flex-1 text-left">
            <p className="font-[var(--font-display)] text-sm font-semibold text-white">{user.minecraft_username}</p>
            <p className="text-xs text-[var(--color-mist)]">
              Привязан {user.minecraft_linked_at && new Date(user.minecraft_linked_at).toLocaleDateString("ru-RU")}
            </p>
          </div>
          <button
            onClick={unlink}
            className="shrink-0 border border-white/15 px-3 py-1.5 text-xs text-[var(--color-mist)] transition-colors duration-300 hover:border-rose-400/50 hover:text-rose-300"
          >
            Отвязать
          </button>
        </div>
      ) : pending ? (
        // code was sent, waiting for the player to type it back in
        <div className="mt-4">
          <p className="text-sm text-[var(--color-mist)]">
            Мы отправили код игроку <span className="text-white">{pending.nickname}</span> личным сообщением в
            игре — откройте чат на сервере и введите полученный код ниже.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-значный код"
              inputMode="numeric"
              autoFocus
              className="min-w-0 flex-1 border border-white/10 bg-black/30 px-3 py-2 text-center font-[var(--font-mono)] text-lg tracking-[0.3em] text-white outline-none transition-colors duration-300 focus:border-cyan-400/60"
            />
            <button
              onClick={verify}
              disabled={verifying || secondsLeft === 0 || codeInput.length < 6}
              className="pixel-corner shrink-0 bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-2 font-[var(--font-display)] text-sm font-semibold text-white shadow-[var(--shadow-glow-cyan)] transition-transform duration-300 hover:scale-[1.02] disabled:opacity-60"
            >
              {verifying ? "Проверяем…" : "Подтвердить"}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="font-[var(--font-mono)] text-xs text-[var(--color-mist)]">
              Код действует ещё: {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
            </span>
            <button
              onClick={resend}
              disabled={resending}
              className="font-[var(--font-mono)] text-xs text-cyan-300 transition-colors hover:text-white disabled:opacity-50"
            >
              {resending ? "Отправляем…" : "Отправить код заново"}
            </button>
          </div>

          {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}

          <button
            onClick={cancelPending}
            className="mt-4 border border-white/15 px-4 py-2 text-sm text-[var(--color-mist)] transition-colors duration-300 hover:border-rose-400/50 hover:text-rose-300"
          >
            Отмена
          </button>
        </div>
      ) : (
        // nothing linked yet: nickname entry
        <div className="mt-4">
          <p className="text-sm text-[var(--color-mist)]">
            Привяжите игровой ник, чтобы мы точно знали, кто вы на сервере — заказы, история и роль будут
            привязаны к аккаунту напрямую. Зайдите на сервер под этим ником, чтобы получить код.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              placeholder="Ваш ник в Minecraft"
              maxLength={16}
              className="min-w-0 flex-1 border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition-colors duration-300 focus:border-cyan-400/60"
            />
            <button
              onClick={startLink}
              disabled={starting || !nicknameInput.trim()}
              className="pixel-corner shrink-0 bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-2 font-[var(--font-display)] text-sm font-semibold text-white shadow-[var(--shadow-glow-cyan)] transition-transform duration-300 hover:scale-[1.02] disabled:opacity-60"
            >
              {starting ? "Отправляем код…" : "Привязать"}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
