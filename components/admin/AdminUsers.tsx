"use client";

/** Admin tab for user moderation: search, ban/unban (site + forum-only), and role changes. */
import { useEffect, useState } from "react";
import { formatUntil } from "./formatUntil";
import ActionButton from "./ActionButton";

type Role = "user" | "helper" | "admin" | "main_admin";
type AdminUser = {
  id: number;
  username: string;
  email: string;
  role: Role;
  banned: boolean;
  banned_reason: string | null;
  banned_until: string | null;
  forum_banned: boolean;
  forum_banned_reason: string | null;
  forum_banned_until: string | null;
  minecraft_username: string | null;
  created_at: string;
};

type BanKind = "site" | "forum";

const ROLE_LABEL: Record<Role, string> = {
  user: "Странник",
  helper: "Хелпер",
  admin: "Администратор",
  main_admin: "Главный админ",
};

const ROLE_BADGE: Record<Role, string> = {
  user: "border-white/15 text-[var(--color-mist)]",
  helper: "border-cyan-400/40 text-cyan-300",
  admin: "border-violet-400/40 text-violet-300",
  main_admin: "border-amber-400/50 text-amber-300",
};

const DURATIONS: { label: string; hours: number | null }[] = [
  { label: "Навсегда", hours: null },
  { label: "1 час", hours: 1 },
  { label: "1 день", hours: 24 },
  { label: "3 дня", hours: 24 * 3 },
  { label: "7 дней", hours: 24 * 7 },
  { label: "30 дней", hours: 24 * 30 },
];

export default function AdminUsers({ myRole, myId }: { myRole: Role; myId: number }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const [banTargetId, setBanTargetId] = useState<number | null>(null);
  const [banKind, setBanKind] = useState<BanKind>("site");
  const [banReason, setBanReason] = useState("");
  const [banHours, setBanHours] = useState<number | null>(null);

  const load = async () => {
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const assignableRoles: Role[] = myRole === "main_admin" ? ["user", "helper", "admin"] : ["user", "helper"];

  const rank = (r: Role) => ({ user: 0, helper: 1, admin: 2, main_admin: 3 }[r]);
  const canAct = (target: AdminUser) => target.id !== myId && rank(myRole) > rank(target.role);

  const patch = async (id: number, payload: Record<string, unknown>) => {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ошибка");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusyId(null);
    }
  };

  const changeRole = (id: number, role: Role) => patch(id, { role });
  const unban = (id: number) => patch(id, { banned: false });
  const unForumBan = (id: number) => patch(id, { forum_banned: false });

  const openBan = (id: number, kind: BanKind) => {
    setBanTargetId(id);
    setBanKind(kind);
    setBanReason("");
    setBanHours(null);
  };

  const submitBan = async () => {
    if (banTargetId === null) return;
    if (banKind === "site") {
      await patch(banTargetId, {
        banned: true,
        banned_reason: banReason.trim() || undefined,
        banned_duration_hours: banHours,
      });
    } else {
      await patch(banTargetId, {
        forum_banned: true,
        forum_banned_reason: banReason.trim() || undefined,
        forum_banned_duration_hours: banHours,
      });
    }
    setBanTargetId(null);
    setBanReason("");
    setBanHours(null);
  };

  if (loading) {
    return <p className="text-center text-[var(--color-mist)]">Загрузка пользователей…</p>;
  }

  return (
    <div>
      {error && <p className="mb-4 text-sm text-amber-300">{error}</p>}

      <div className="glass-panel pixel-corner overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-[var(--color-mist)]">
              <th className="px-4 py-3 font-medium">Пользователь</th>
              <th className="px-4 py-3 font-medium">Роль</th>
              <th className="px-4 py-3 font-medium">Статус</th>
              <th className="px-4 py-3 font-medium">Регистрация</th>
              <th className="px-4 py-3 font-medium">Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const editable = canAct(u);
              return (
                <tr key={u.id} className="border-b border-white/5 last:border-b-0 align-top">
                  <td className="px-4 py-3">
                    <div className="font-[var(--font-display)] font-semibold text-white">{u.username}</div>
                    <div className="text-xs text-[var(--color-mist)]">{u.email}</div>
                    <div className="mt-0.5 font-[var(--font-mono)] text-[11px] text-[var(--color-mist)]/60">
                      {u.minecraft_username ? `MC: ${u.minecraft_username}` : "MC не привязан"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {editable && assignableRoles.includes(u.role as Role) ? (
                      <select
                        value={u.role}
                        disabled={busyId === u.id}
                        onChange={(e) => changeRole(u.id, e.target.value as Role)}
                        className="border border-white/10 bg-black/30 px-2 py-1 text-xs text-white outline-none focus:border-cyan-400/60"
                      >
                        {assignableRoles.map((r) => (
                          <option key={r} value={r} className="bg-[#0a0714]">
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={`border px-2 py-1 text-xs ${ROLE_BADGE[u.role]}`}>{ROLE_LABEL[u.role]}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1.5">
                      {u.banned ? (
                        <span className="w-fit border border-rose-400/40 px-2 py-1 text-xs text-rose-300">
                          Блок на сайте ({formatUntil(u.banned_until)}){u.banned_reason ? `: ${u.banned_reason}` : ""}
                        </span>
                      ) : (
                        <span className="w-fit border border-emerald-400/40 px-2 py-1 text-xs text-emerald-300">Активен</span>
                      )}
                      {!!u.forum_banned && (
                        <span className="w-fit border border-amber-400/40 px-2 py-1 text-xs text-amber-300">
                          Блок на форуме ({formatUntil(u.forum_banned_until)}){u.forum_banned_reason ? `: ${u.forum_banned_reason}` : ""}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-mist)]">
                    {new Date(u.created_at).toLocaleDateString("ru-RU")}
                  </td>
                  <td className="px-4 py-3">
                    {!editable ? (
                      <span className="text-xs text-[var(--color-mist)]/60">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {u.banned ? (
                          <ActionButton onClick={() => unban(u.id)} busy={busyId === u.id} tone="neutral">
                            Разблокировать
                          </ActionButton>
                        ) : (
                          <ActionButton onClick={() => openBan(u.id, "site")} busy={busyId === u.id} tone="danger">
                            Заблокировать
                          </ActionButton>
                        )}
                        {u.forum_banned ? (
                          <ActionButton onClick={() => unForumBan(u.id)} busy={busyId === u.id} tone="neutral">
                            Снять форум-бан
                          </ActionButton>
                        ) : (
                          <ActionButton onClick={() => openBan(u.id, "forum")} busy={busyId === u.id} tone="warning">
                            Бан на форуме
                          </ActionButton>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {myRole !== "main_admin" && (
        <p className="mt-4 text-xs text-[var(--color-mist)]/70">
          Назначать роль администратора может только главный администратор.
        </p>
      )}

      {banTargetId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="glass-panel pixel-corner w-full max-w-sm p-6">
            <h3 className="font-[var(--font-display)] text-lg font-semibold text-white">
              {banKind === "site" ? "Заблокировать на сайте" : "Заблокировать на форуме"}
            </h3>
            <p className="mt-1 text-xs text-[var(--color-mist)]">
              {banKind === "site"
                ? "Полная блокировка: аккаунт разлогинивается, вход запрещён."
                : "Игрок сохраняет доступ к сайту и серверу, но не может создавать темы и комментарии на форуме."}
            </p>

            <label className="mt-4 block text-xs uppercase tracking-wide text-[var(--color-mist)]/70">Срок</label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DURATIONS.map((d) => (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => setBanHours(d.hours)}
                  className={`px-2.5 py-1.5 text-xs transition-colors duration-300 ${
                    banHours === d.hours
                      ? "bg-gradient-to-r from-violet-600 to-cyan-500 text-white"
                      : "border border-white/10 text-[var(--color-mist)] hover:text-white"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <label className="mt-4 block text-xs uppercase tracking-wide text-[var(--color-mist)]/70">
              Причина (необязательно)
            </label>
            <input
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Например: нарушение правил чата"
              className="mt-2 w-full border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition-colors duration-300 focus:border-cyan-400/60"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setBanTargetId(null)}
                className="border border-white/15 px-4 py-2 text-sm text-[var(--color-mist)] transition-colors duration-300 hover:text-white"
              >
                Отмена
              </button>
              <button
                onClick={submitBan}
                className="pixel-corner bg-gradient-to-r from-rose-600 to-rose-500 px-4 py-2 text-sm font-semibold text-white transition-transform duration-300 hover:scale-[1.02]"
              >
                Заблокировать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
