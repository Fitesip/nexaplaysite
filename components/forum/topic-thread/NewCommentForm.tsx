"use client";

import { useState, FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";

/**
 * Textarea + submit button for posting a new top-level comment, or (when
 * `replyToId` is given) a reply to an existing one. Also handles the two
 * "you can't post" states: forum-banned, or no Minecraft account linked yet.
 */
export default function NewCommentForm({
  topicId,
  replyToId,
  replyToUsername,
  onPosted,
  onCancel,
  compact,
}: {
  topicId: number;
  replyToId?: number;
  replyToUsername?: string;
  onPosted: () => void;
  onCancel?: () => void;
  compact?: boolean;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  if (user && user.forum_banned) {
    return (
      <p className="border border-rose-400/30 bg-rose-400/5 px-4 py-3 text-sm text-rose-300">
        Вы заблокированы на форуме
        {user.forum_banned_until ? ` до ${new Date(user.forum_banned_until).toLocaleString("ru-RU")}` : ""}.
      </p>
    );
  }
  if (user && !user.minecraft_username) {
    return (
      <p className="border border-white/10 bg-white/5 px-4 py-3 text-sm text-[var(--color-mist)]">
        Привяжите Minecraft-аккаунт в личном кабинете, чтобы писать на форуме.
      </p>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/forum/topics/${topicId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text, reply_to_id: replyToId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Не удалось отправить комментарий");
        return;
      }
      setText("");
      onPosted();
    } catch {
      setError("Не удалось отправить комментарий");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={compact ? 2 : 3}
        maxLength={4000}
        autoFocus={!!replyToId}
        placeholder={replyToUsername ? `Ответ пользователю ${replyToUsername}…` : "Ваш комментарий…"}
        className="w-full resize-y border border-white/10 bg-black/20 px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-cyan-400/50"
      />
      {error && <p className="text-xs text-rose-400">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting || !text.trim()}
          className="pixel-corner bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-2 font-[var(--font-display)] text-xs font-semibold text-white transition-transform duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Отправка…" : "Отправить"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="font-[var(--font-mono)] text-xs text-[var(--color-mist)]/70 hover:text-white"
          >
            Отмена
          </button>
        )}
      </div>
    </form>
  );
}
