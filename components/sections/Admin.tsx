"use client";

import { useState } from "react";
import AdminSupport from "@/components/admin/AdminSupport";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminCatalog from "@/components/admin/AdminCatalog";
import AdminNews from "@/components/admin/AdminNews";
import AdminRcon from "@/components/admin/AdminRcon";
import AdminForum from "@/components/admin/AdminForum";
import { useAuth } from "@/lib/auth-context";

type Tab = "support" | "users" | "catalog" | "news" | "rcon" | "moderation";

const TAB_LABEL: Record<Tab, string> = {
  support: "Поддержка",
  users: "Пользователи",
  catalog: "Каталог",
  news: "Новости",
  rcon: "RCON",
  moderation: "Модерация",
};

export default function Admin() {
  const { user: me, loading } = useAuth();
  const [tab, setTab] = useState<Tab | null>(null);

  if (loading) {
    return <div className="text-center text-[var(--color-mist)]">Загрузка панели…</div>;
  }

  const isStaff = me && ["helper", "admin", "main_admin"].includes(me.role);
  const isAdmin = me && ["admin", "main_admin"].includes(me.role);
  const isHelper = me?.role === "helper";

  if (!me || !isStaff) {
    return (
      <div className="glass-panel pixel-corner mx-auto max-w-md p-8 text-center">
        <h2 className="font-[var(--font-display)] text-xl font-bold text-white">Доступ ограничен</h2>
        <p className="mt-2 text-sm text-[var(--color-mist)]">
          Этот раздел доступен только сотрудникам сервера.
        </p>
      </div>
    );
  }

  const availableTabs: Tab[] = isAdmin
    ? ["support", "moderation", "users", "catalog", "news", "rcon"]
    : ["support", "moderation", "rcon"];
  const activeTab = tab && availableTabs.includes(tab) ? tab : availableTabs[0];

  return (
    <div>
      <h2 className="font-[var(--font-display)] text-3xl font-bold sm:text-4xl">
        {isHelper ? (
          <>
            Хелпер-<span className="grad-text">панель</span>
          </>
        ) : (
          <>
            Админ-<span className="grad-text">панель</span>
          </>
        )}
      </h2>

      <div className="mt-6 flex flex-wrap gap-2">
        {availableTabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pixel-corner px-4 py-2 text-sm font-medium transition-all duration-300 ${
              activeTab === t
                ? "bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-[var(--shadow-glow-cyan)]"
                : "border border-white/10 text-[var(--color-mist)] hover:border-cyan-400/40 hover:text-white"
            }`}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {activeTab === "support" && <AdminSupport />}
        {activeTab === "moderation" && <AdminForum />}
        {activeTab === "users" && isAdmin && <AdminUsers myRole={me.role} myId={me.id} />}
        {activeTab === "catalog" && isAdmin && <AdminCatalog />}
        {activeTab === "news" && isAdmin && <AdminNews />}
        {activeTab === "rcon" && <AdminRcon />}
      </div>
    </div>
  );
}
