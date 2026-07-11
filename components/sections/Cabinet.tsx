"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import Captcha from "@/components/Captcha";
import SupportChat from "@/components/SupportChat";
import { useAuth, type CurrentUser } from "@/lib/auth-context";
import { avatarSrc } from "@/lib/avatar";

type Mode = "login" | "register";
type User = CurrentUser;

const ROLE_LABEL: Record<User["role"], string> = {
  user: "Странник",
  helper: "Хелпер",
  admin: "Администратор",
  main_admin: "Главный администратор",
};

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

function Profile({
  user,
  onLogout,
  onUserUpdate,
}: {
  user: User;
  onLogout: () => void;
  onUserUpdate: (patch: Partial<User>) => void;
}) {
  const logout = onLogout;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(user.username);
  const [nameStatus, setNameStatus] = useState<"idle" | "loading" | "error">("idle");
  const [nameError, setNameError] = useState("");

  const photoSrc = avatarSrc(user, 160);

  const handleAvatarPick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setAvatarError("");
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await fetch("/api/auth/avatar", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Не удалось загрузить фото");
      onUserUpdate({ avatar_url: data.avatarUrl });
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Не удалось загрузить фото");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarRemove = async () => {
    setAvatarUploading(true);
    setAvatarError("");
    try {
      const res = await fetch("/api/auth/avatar", { method: "DELETE" });
      if (!res.ok) throw new Error("Не удалось удалить фото");
      onUserUpdate({ avatar_url: null });
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setAvatarUploading(false);
    }
  };

  const saveUsername = async () => {
    if (nameDraft.trim() === user.username) {
      setEditingName(false);
      return;
    }
    setNameStatus("loading");
    setNameError("");
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: nameDraft.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Не удалось сохранить никнейм");
      onUserUpdate({ username: data.user.username });
      setNameStatus("idle");
      setEditingName(false);
    } catch (err) {
      setNameStatus("error");
      setNameError(err instanceof Error ? err.message : "Ошибка");
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <div className="glass-panel pixel-corner p-8 text-center">
        <div className="relative mx-auto h-20 w-20">
          <button
            type="button"
            onClick={handleAvatarPick}
            disabled={avatarUploading}
            className="group relative flex h-20 w-20 items-center justify-center overflow-hidden bg-gradient-to-br from-violet-600 to-cyan-500 font-[var(--font-display)] text-3xl font-bold text-white transition-opacity disabled:opacity-70"
            title="Изменить аватар"
          >
            {photoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoSrc} alt={user.username} className="h-full w-full object-cover" />
            ) : (
              user.username.slice(0, 1).toUpperCase()
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              {avatarUploading ? (
                <span className="font-[var(--font-mono)] text-[10px] text-white">…</span>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" className="h-6 w-6">
                  <path
                    d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="13" r="3.2" />
                </svg>
              )}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        {user.avatar_url && (
          <button
            onClick={handleAvatarRemove}
            disabled={avatarUploading}
            className="mt-2 font-[var(--font-mono)] text-[11px] text-[var(--color-mist)] transition-colors hover:text-rose-300 disabled:opacity-50"
          >
            Удалить фото
          </button>
        )}
        {avatarError && <p className="mt-2 text-xs text-rose-400">{avatarError}</p>}

        <div className="mt-4">
          {editingName ? (
            <div className="mx-auto flex max-w-[16rem] items-center gap-2">
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                autoFocus
                maxLength={24}
                className="min-w-0 flex-1 border border-white/10 bg-black/30 px-2 py-1 text-center font-[var(--font-display)] text-lg font-bold text-white outline-none focus:border-cyan-400/60"
              />
              <button
                onClick={saveUsername}
                disabled={nameStatus === "loading"}
                aria-label="Сохранить"
                className="flex h-7 w-7 shrink-0 items-center justify-center text-cyan-300 transition-colors hover:text-white disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                onClick={() => {
                  setEditingName(false);
                  setNameDraft(user.username);
                  setNameError("");
                }}
                aria-label="Отмена"
                className="flex h-7 w-7 shrink-0 items-center justify-center text-[var(--color-mist)] transition-colors hover:text-rose-300"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="group mx-auto flex items-center gap-2 font-[var(--font-display)] text-2xl font-bold text-white"
            >
              {user.username}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-4 w-4 text-[var(--color-mist)] opacity-0 transition-opacity group-hover:opacity-100"
              >
                <path
                  d="M4 20h3l10-10-3-3L4 17v3z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
          {nameError && <p className="mt-1 text-xs text-rose-400">{nameError}</p>}
        </div>

        <p className="mt-1 text-sm text-[var(--color-mist)]">{user.email}</p>
        <p className="mt-1 text-xs text-[var(--color-mist)]/70">
          На сервере с {new Date(user.created_at).toLocaleDateString("ru-RU")}
        </p>

        <div className="mt-6 grid grid-cols-3 gap-3 text-left">
          <StatCard label="Донат-баланс" value="0 ₽" />
          <StatCard label="Заявок в поддержку" value="0" />
          <StatCard label="Статус" value={ROLE_LABEL[user.role]} />
        </div>

        <button
          onClick={logout}
          className="mt-8 border border-white/15 px-6 py-2 text-sm text-[var(--color-mist)] transition-colors duration-300 hover:border-rose-400/50 hover:text-rose-300"
        >
          Выйти из аккаунта
        </button>
      </div>

      <MinecraftLinkCard user={user} onUserUpdate={onUserUpdate} />
      <ReferralCard />
      <OrderHistory />
      <SupportChat />
      <ChangePasswordForm />
    </div>
  );
}

type MinecraftLinkStatus =
  | { linked: { username: string; uuid: string; linkedAt: string } | null; pending: null }
  | { linked: null; pending: { nickname: string; expiresAt: string } };

function MinecraftLinkCard({
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
        <div className="mt-4 flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://mc-heads.net/avatar/${user.minecraft_uuid}/44`}
            alt={user.minecraft_username ?? ""}
            className="h-11 w-11 shrink-0 object-cover"
          />
          <div className="min-w-0 flex-1 text-left">
            <p className="font-[var(--font-display)] text-sm font-semibold text-white">
              {user.minecraft_username}
            </p>
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
        <div className="mt-4">
          <p className="text-sm text-[var(--color-mist)]">
            Мы отправили код игроку <span className="text-white">{pending.nickname}</span> личным сообщением
            в игре — откройте чат на сервере и введите полученный код ниже.
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



type Referral = { id: number; username: string; created_at: string };

function ReferralCard() {
  const [code, setCode] = useState<string | null>(null);
  const [invited, setInvited] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referrals", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setCode(d?.code ?? null);
        setInvited(d?.invited ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const link = code && typeof window !== "undefined" ? `${window.location.origin}/?ref=${code}#cabinet` : "";

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel pixel-corner mt-6 p-6">
      <h3 className="font-[var(--font-display)] text-base font-semibold text-white">Реферальная программа</h3>
      <p className="mt-1 text-sm text-[var(--color-mist)]">
        Приглашайте друзей на сервер — за каждого зарегистрированного по вашей ссылке вы получите уведомление,
        а сами приглашённые появятся в списке ниже.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-[var(--color-mist)]">Загрузка…</p>
      ) : (
        <>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              readOnly
              value={link}
              className="min-w-0 flex-1 border border-white/10 bg-black/20 px-3 py-2 font-[var(--font-mono)] text-xs text-[var(--color-mist)] outline-none"
            />
            <button
              onClick={copy}
              className="pixel-corner shrink-0 bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-2 font-[var(--font-display)] text-xs font-semibold text-white transition-transform duration-300 hover:-translate-y-0.5"
            >
              {copied ? "Скопировано!" : "Скопировать"}
            </button>
          </div>

          <p className="mt-4 text-sm text-[var(--color-mist)]">
            Приглашено друзей: <span className="text-white">{invited.length}</span>
          </p>
          {invited.length > 0 && (
            <div className="mt-2 flex flex-col gap-1.5">
              {invited.map((f) => (
                <div key={f.id} className="flex items-center justify-between text-xs text-[var(--color-mist)]">
                  <span className="text-white">{f.username}</span>
                  <span className="font-[var(--font-mono)]">{new Date(f.created_at).toLocaleDateString("ru-RU")}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

type OrderItem = { name: string; category: string; price: number; qty: number };
type Order = {
  id: number;
  subtotal: number;
  discount_amount: number;
  total: number;
  promo_code: string | null;
  status: "completed" | "cancelled";
  created_at: string;
  items: OrderItem[];
};

function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/orders", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setOrders(d?.orders ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="glass-panel pixel-corner mt-6 p-6">
      <h3 className="font-[var(--font-display)] text-base font-semibold text-white">История заказов</h3>

      {loading ? (
        <p className="mt-4 text-sm text-[var(--color-mist)]">Загрузка…</p>
      ) : orders.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--color-mist)]">У вас пока нет заказов.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {orders.map((order) => {
            const open = openId === order.id;
            return (
              <div key={order.id} className="border border-white/10">
                <button
                  onClick={() => setOpenId(open ? null : order.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors duration-300 hover:bg-white/5"
                >
                  <div>
                    <span className="font-[var(--font-mono)] text-sm text-white">Заказ №{order.id}</span>
                    <span className="ml-3 text-xs text-[var(--color-mist)]">
                      {new Date(order.created_at).toLocaleString("ru-RU", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-[var(--font-display)] text-sm font-semibold text-white">
                      {order.total} ₽
                    </span>
                    <span
                      className={`font-[var(--font-mono)] text-xl text-cyan-300 transition-transform duration-300 ${
                        open ? "rotate-45" : ""
                      }`}
                    >
                      +
                    </span>
                  </div>
                </button>

                <div
                  className="grid transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <div className="flex flex-col gap-2 border-t border-white/10 px-4 py-3">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm text-[var(--color-mist)]">
                          <span>
                            {item.name} × {item.qty}
                          </span>
                          <span className="text-white">{item.price * item.qty} ₽</span>
                        </div>
                      ))}
                      <div className="mt-1 flex justify-between border-t border-white/10 pt-2 text-sm text-[var(--color-mist)]">
                        <span>Сумма</span>
                        <span>{order.subtotal} ₽</span>
                      </div>
                      {order.discount_amount > 0 && (
                        <div className="flex justify-between text-sm text-cyan-300">
                          <span>Скидка{order.promo_code ? ` (${order.promo_code})` : ""}</span>
                          <span>−{order.discount_amount} ₽</span>
                        </div>
                      )}
                      <div className="flex justify-between font-[var(--font-display)] text-sm font-semibold text-white">
                        <span>Итого</span>
                        <span>{order.total} ₽</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChangePasswordForm() {
  const [openForm, setOpenForm] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("loading");
    setError("");
    const form = e.currentTarget;
    const currentPassword = (form.elements.namedItem("currentPassword") as HTMLInputElement).value;
    const newPassword = (form.elements.namedItem("newPassword") as HTMLInputElement).value;
    const confirmPassword = (form.elements.namedItem("confirmPassword") as HTMLInputElement).value;

    if (newPassword !== confirmPassword) {
      setStatus("error");
      setError("Новые пароли не совпадают");
      return;
    }

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ошибка");
      setStatus("success");
      form.reset();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  };

  return (
    <div className="glass-panel pixel-corner mt-6 p-6">
      <button
        onClick={() => setOpenForm((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="font-[var(--font-display)] text-base font-semibold text-white">Сменить пароль</span>
        <span
          className={`font-[var(--font-mono)] text-xl text-cyan-300 transition-transform duration-500 ${
            openForm ? "rotate-45" : ""
          }`}
        >
          +
        </span>
      </button>

      <div
        className="grid transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ gridTemplateRows: openForm ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <form onSubmit={submit} className="mt-5 flex flex-col gap-4 text-left">
            <LabeledInput label="Текущий пароль" name="currentPassword" type="password" required minLength={6} />
            <LabeledInput label="Новый пароль" name="newPassword" type="password" required minLength={6} />
            <LabeledInput label="Повторите новый пароль" name="confirmPassword" type="password" required minLength={6} />

            {error && <p className="text-sm text-rose-400">{error}</p>}
            {status === "success" && <p className="text-sm text-cyan-300">Пароль успешно изменён!</p>}

            <button
              disabled={status === "loading"}
              className="pixel-corner mt-1 bg-gradient-to-r from-violet-600 to-cyan-500 py-2.5 font-[var(--font-display)] text-sm font-semibold text-white shadow-[var(--shadow-glow-cyan)] transition-transform duration-300 hover:scale-[1.02] disabled:opacity-60"
            >
              {status === "loading" ? "Сохраняем…" : "Сохранить новый пароль"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-black/20 p-3">
      <div className="font-[var(--font-display)] text-sm font-semibold text-white">{value}</div>
      <div className="mt-1 text-[11px] text-[var(--color-mist)]">{label}</div>
    </div>
  );
}

function AuthPanel({ onAuthed }: { onAuthed: (u: User) => void }) {
  const [mode, setMode] = useState<Mode>(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).has("ref")
      ? "register"
      : "login"
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaKey, setCaptchaKey] = useState(0);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = e.currentTarget;
    const payload: Record<string, string> = {
      username: (form.elements.namedItem("username") as HTMLInputElement).value,
      password: (form.elements.namedItem("password") as HTMLInputElement).value,
    };
    if (mode === "register") {
      payload.email = (form.elements.namedItem("email") as HTMLInputElement).value;
      payload.captchaAnswer = (form.elements.namedItem("captchaAnswer") as HTMLInputElement).value;
      payload.captchaToken = (form.elements.namedItem("captchaToken") as HTMLInputElement).value;
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref) payload.ref = ref;
    }

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ошибка");
      onAuthed(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
      if (mode === "register") setCaptchaKey((k) => k + 1);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="glass-panel pixel-corner relative overflow-hidden p-8">
        {/* toggle switch */}
        <div className="relative mx-auto mb-8 flex w-full max-w-xs border border-white/10">
          <div
            className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-violet-600 to-cyan-500 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: mode === "login" ? "translateX(0%)" : "translateX(100%)" }}
          />
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
            className={`relative z-10 flex-1 py-2 text-sm font-medium transition-colors duration-300 ${
              mode === "login" ? "text-white" : "text-[var(--color-mist)]"
            }`}
          >
            Вход
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError("");
            }}
            className={`relative z-10 flex-1 py-2 text-sm font-medium transition-colors duration-300 ${
              mode === "register" ? "text-white" : "text-[var(--color-mist)]"
            }`}
          >
            Регистрация
          </button>
        </div>

        {/* animated form swap */}
        <div className="relative">
          <div
            key={mode}
            className="section-enter flex flex-col gap-4"
          >
            <h3 className="text-center font-[var(--font-display)] text-xl font-bold text-white">
              {mode === "login" ? "С возвращением" : "Создать аккаунт"}
            </h3>

            <form onSubmit={submit} className="flex flex-col gap-4">
              <LabeledInput label="Никнейм" name="username" required minLength={3} />
              {mode === "register" && (
                <LabeledInput label="Email" name="email" type="email" required />
              )}
              <LabeledInput label="Пароль" name="password" type="password" required minLength={6} />
              {mode === "register" && <Captcha resetSignal={captchaKey} />}

              {error && <p className="text-sm text-rose-400">{error}</p>}

              <button
                disabled={loading}
                className="pixel-corner mt-2 bg-gradient-to-r from-violet-600 to-cyan-500 py-3 font-[var(--font-display)] text-sm font-semibold text-white shadow-[var(--shadow-glow-cyan)] transition-transform duration-300 hover:scale-[1.02] disabled:opacity-60"
              >
                {loading ? "Подождите…" : mode === "login" ? "Войти" : "Зарегистрироваться"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function LabeledInput({
  label,
  name,
  type = "text",
  required,
  minLength,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-[var(--color-mist)]">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        minLength={minLength}
        className="border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition-colors duration-300 focus:border-cyan-400/60"
      />
    </div>
  );
}
