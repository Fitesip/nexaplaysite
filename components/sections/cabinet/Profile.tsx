"use client";

import { useState, useRef } from "react";
import SupportChat from "@/components/SupportChat";
import { avatarSrc } from "@/lib/avatar";
import StatCard from "./StatCard";
import MinecraftLinkCard from "./MinecraftLinkCard";
import ReferralCard from "./ReferralCard";
import Inventory from "./Inventory";
import OrderHistory from "./OrderHistory";
import ChangePasswordForm from "./ChangePasswordForm";
import { ROLE_LABEL, type User } from "./types";
import { formatRubleBalance } from "@/lib/rubleBalance";

type ProfileTab = "profile" | "minecraft" | "cases" | "orders" | "support" | "referral" | "password";

/** Side-nav sections, in display order. Referral sits right before password by request. */
const PROFILE_TABS: { id: ProfileTab; label: string }[] = [
  { id: "profile", label: "Профиль" },
  { id: "minecraft", label: "Minecraft" },
  { id: "cases", label: "Инвентарь" },
  { id: "orders", label: "История заказов" },
  { id: "support", label: "Поддержка" },
  { id: "referral", label: "Реферальная программа" },
  { id: "password", label: "Смена пароля" },
];

/**
 * The main "logged in" view of the cabinet: avatar (click to upload a new one),
 * an inline-editable username, basic stats, a logout button, and the stack of
 * sub-cards (Minecraft link, referrals, order history, support chat, password).
 */
export default function Profile({
  user,
  onLogout,
  onUserUpdate,
}: {
  user: User;
  onLogout: () => void;
  onUserUpdate: (patch: Partial<User>) => void;
}) {
  const logout = onLogout;
  const [tab, setTab] = useState<ProfileTab>("profile");
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
    <div className="mx-auto flex max-w-5xl flex-col gap-6 md:flex-row md:items-start">
      <nav className="md:w-56 md:shrink-0">
        <div className="glass-panel pixel-corner flex gap-1 overflow-x-auto p-2 md:flex-col md:overflow-visible">
          {PROFILE_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`shrink-0 whitespace-nowrap px-4 py-2.5 text-left font-[var(--font-display)] text-sm transition-colors md:w-full ${
                tab === t.id
                  ? "bg-gradient-to-r from-violet-600 to-cyan-500 text-white"
                  : "text-[var(--color-mist)] hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2">
                {t.label}
                {t.id === "minecraft" && !user.minecraft_username && (
                  <span className="flex h-5 w-5 items-center justify-center border border-rose-400/40 font-[var(--font-display)] text-[10px] font-bold text-rose-300">
                    !
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </nav>

      <div className="min-w-0 flex-1">
        {tab === "profile" && (
        <div className="glass-panel pixel-corner p-8 text-center">
        {/* avatar: click to upload, hover reveals the pencil icon */}
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

        {/* username: click to reveal an inline edit field */}
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
                <path d="M4 20h3l10-10-3-3L4 17v3z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          {nameError && <p className="mt-1 text-xs text-rose-400">{nameError}</p>}
        </div>

        <p className="mt-1 text-sm text-[var(--color-mist)]">{user.email}</p>
        <p className="mt-1 text-xs text-[var(--color-mist)]/70">
          На сервере с {new Date(user.created_at).toLocaleDateString("ru-RU")}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3 text-left sm:grid-cols-3">
          <StatCard label="Баланс" value={formatRubleBalance(user.balance_kopecks)} />
          <StatCard label="Minecraft" value={user.minecraft_username ?? "Не привязан"} />
          <StatCard label="Статус" value={ROLE_LABEL[user.role]} />
        </div>

        <button
          onClick={logout}
          className="mt-8 border border-white/15 px-6 py-2 text-sm text-[var(--color-mist)] transition-colors duration-300 hover:border-rose-400/50 hover:text-rose-300"
        >
          Выйти из аккаунта
        </button>
        </div>
        )}

        {tab === "minecraft" && <MinecraftLinkCard user={user} onUserUpdate={onUserUpdate} />}
        {tab === "cases" && <Inventory />}
        {tab === "orders" && <OrderHistory />}
        {tab === "support" && <SupportChat />}
        {tab === "referral" && <ReferralCard />}
        {tab === "password" && <ChangePasswordForm />}
      </div>
    </div>
  );
}
