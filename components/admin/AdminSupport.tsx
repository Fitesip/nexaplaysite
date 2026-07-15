"use client";

import { useState } from "react";
import { useAdminChats } from "@/lib/admin-chats-context";
import Avatar from "@/components/Avatar";
import { displayName } from "@/lib/avatar";
import ChatPanel from "./ChatPanel";

/**
 * Support inbox for staff: a list of open chats on the left (with unread
 * badges), and the selected conversation on the right. See ChatPanel for the
 * conversation view itself.
 */
export default function AdminSupport() {
  const { chats, loading, refresh: loadChats } = useAdminChats();
  const [activeUserId, setActiveUserId] = useState<number | null>(null);
  const totalOpenTickets = chats.reduce((sum, c) => sum + c.open_tickets, 0);

  if (loading) {
    return <div className="text-center text-[var(--color-mist)]">Загрузка панели поддержки…</div>;
  }

  return (
    <div>
      <p className="text-sm text-[var(--color-mist)]">
        {chats.length === 0
          ? "Пока никто не обращался в поддержку."
          : `Пользователей с обращениями: ${chats.length} · открытых тикетов: ${totalOpenTickets}`}
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="glass-panel pixel-corner flex max-h-[32rem] flex-col overflow-y-auto">
          {chats.length === 0 && <p className="p-6 text-center text-sm text-[var(--color-mist)]">Список пуст</p>}
          {chats.map((chat) => (
            <button
              key={chat.user_id}
              onClick={() => setActiveUserId(chat.user_id)}
              className={`flex items-center gap-3 border-b border-white/5 px-4 py-3 text-left transition-colors duration-300 last:border-b-0 ${
                activeUserId === chat.user_id ? "bg-white/10" : "hover:bg-white/5"
              }`}
            >
              <Avatar user={chat} size={36} className="font-[var(--font-display)] text-sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-[var(--font-display)] text-sm font-semibold text-white">
                    {displayName(chat)}
                  </span>
                  {chat.unread > 0 && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 px-1 font-[var(--font-mono)] text-[10px] font-bold text-white">
                      {chat.unread}
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-[var(--color-mist)]">
                  {chat.last_sender_role === "admin" ? "Вы: " : ""}
                  {chat.last_message}
                </p>
                {chat.open_tickets > 0 && (
                  <p className="mt-0.5 font-[var(--font-mono)] text-[10px] text-cyan-300/80">
                    Открытых тикетов: {chat.open_tickets}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>

        {activeUserId ? (
          <ChatPanel userId={activeUserId} onMessagesRead={loadChats} />
        ) : (
          <div className="glass-panel pixel-corner flex min-h-[20rem] items-center justify-center p-8 text-center text-sm text-[var(--color-mist)]">
            Выберите чат слева, чтобы посмотреть переписку.
          </div>
        )}
      </div>
    </div>
  );
}
