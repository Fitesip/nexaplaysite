"use client";

import { useEffect, useState, FormEvent } from "react";
import UserMeta, { formatDateTime } from "./UserMeta";
import { displayName } from "@/lib/avatar";
import ReactionBar, { type ReactionMap } from "./ReactionBar";
import ReportButton from "./ReportButton";
import { useAuth } from "@/lib/auth-context";

type Author = {
  id: number;
  username: string;
  created_at: string;
  avatar_url: string | null;
  minecraft_uuid: string | null;
  minecraft_username: string | null;
};
type Comment = {
  id: number;
  body: string;
  created_at: string;
  author: Author;
  reply_to_username: string | null;
  reactions: ReactionMap;
  replies: Comment[];
};
type Topic = {
  id: number;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
  author: Author;
  category: { id: number; slug: string; name: string };
  tags: { id: number; name: string }[];
  reactions: ReactionMap;
};

/** Recursively replaces a comment's reactions map by id, leaving the rest of the tree untouched. */
function updateCommentReactions(comments: Comment[], commentId: number, next: ReactionMap): Comment[] {
  return comments.map((c) =>
    c.id === commentId
      ? { ...c, reactions: next }
      : { ...c, replies: updateCommentReactions(c.replies, commentId, next) }
  );
}

const VISIBLE_REPLIES = 2;

export default function TopicThread({
  topicId,
  currentUser,
  onBack,
  onNeedLogin,
}: {
  topicId: number;
  currentUser: { id: number; username: string } | null;
  onBack: () => void;
  onNeedLogin: () => void;
}) {
  const [topic, setTopic] = useState<Topic | null>(null);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [replyingTo, setReplyingTo] = useState<number | null>(null);

  const load = () => {
    fetch(`/api/forum/topics/${topicId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
          return;
        }
        setTopic(d.topic);
        setComments(d.comments ?? []);
      })
      .catch(() => setError("Не удалось загрузить тему"));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId]);

  if (error) {
    return (
      <div>
        <BackLink onBack={onBack} />
        <p className="mt-6 text-sm text-rose-400">{error}</p>
      </div>
    );
  }

  if (!topic || comments === null) {
    return (
      <div>
        <BackLink onBack={onBack} />
        <p className="mt-6 text-sm text-[var(--color-mist)]">Загрузка…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink onBack={onBack} />

      <div className="glass-panel pixel-corner mt-6 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {topic.pinned && (
              <span className="bg-gradient-to-r from-violet-600 to-cyan-500 px-2 py-0.5 font-[var(--font-mono)] text-[10px] uppercase tracking-wide text-white">
                Закреплено
              </span>
            )}
            <span className="border border-white/10 px-2 py-0.5 font-[var(--font-mono)] text-[10px] uppercase tracking-wide text-cyan-300/90">
              {topic.category.name}
            </span>
            {topic.tags.map((t) => (
              <span key={t.id} className="font-[var(--font-mono)] text-[11px] text-[var(--color-mist)]/70">
                #{t.name}
              </span>
            ))}
          </div>
          <PinToggle topicId={topic.id} pinned={topic.pinned} onToggled={(p) => setTopic((t) => (t ? { ...t, pinned: p } : t))} />
        </div>

        <h1 className="mt-3 font-[var(--font-display)] text-2xl font-bold text-white sm:text-3xl">{topic.title}</h1>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <UserMeta
            username={topic.author.username}
            joinedAt={topic.author.created_at}
            avatarUrl={topic.author.avatar_url}
            minecraftUuid={topic.author.minecraft_uuid}
            minecraftUsername={topic.author.minecraft_username}
          />
          <span className="font-[var(--font-mono)] text-xs text-[var(--color-mist)]/60">
            {formatDateTime(topic.created_at)}
          </span>
        </div>

        <p className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-mist)]">{topic.body}</p>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <ReactionBar
            reactions={topic.reactions}
            target={{ topicId: topic.id }}
            isLoggedIn={!!currentUser}
            onNeedLogin={onNeedLogin}
            onChanged={(next) => setTopic((t) => (t ? { ...t, reactions: next } : t))}
          />
          <ReportButton target={{ topicId: topic.id }} isLoggedIn={!!currentUser} onNeedLogin={onNeedLogin} />
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-[var(--font-display)] text-lg font-semibold text-white">
          Комментарии <span className="text-[var(--color-mist)]/60">({countAll(comments)})</span>
        </h2>

        <div className="mt-4">
          {currentUser ? (
            <NewCommentForm topicId={topicId} onPosted={load} />
          ) : (
            <button
              onClick={onNeedLogin}
              className="pixel-corner border border-white/10 px-5 py-2.5 font-[var(--font-display)] text-sm text-[var(--color-mist)] transition-colors hover:border-cyan-400/40 hover:text-white"
            >
              Войдите, чтобы оставить комментарий
            </button>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-4">
          {comments.length === 0 && (
            <p className="text-sm text-[var(--color-mist)]">Пока никто не ответил — будьте первым.</p>
          )}

          {comments.map((c) => (
            <CommentBlock
              key={c.id}
              comment={c}
              isExpanded={expanded.has(c.id)}
              onToggleExpand={() =>
                setExpanded((s) => {
                  const next = new Set(s);
                  next.has(c.id) ? next.delete(c.id) : next.add(c.id);
                  return next;
                })
              }
              replyingTo={replyingTo}
              onSetReplyingTo={setReplyingTo}
              currentUser={currentUser}
              onNeedLogin={onNeedLogin}
              topicId={topicId}
              onPosted={load}
              onReactionChange={(commentId, next) =>
                setComments((cs) => (cs ? updateCommentReactions(cs, commentId, next) : cs))
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function BackLink({ onBack }: { onBack: () => void }) {
  return (
    <button onClick={onBack} className="font-[var(--font-mono)] text-xs text-[var(--color-mist)] transition-colors hover:text-white">
      ← Назад к форуму
    </button>
  );
}

const STAFF_ROLES = new Set(["helper", "admin", "main_admin"]);

function PinToggle({
  topicId,
  pinned,
  onToggled,
}: {
  topicId: number;
  pinned: boolean;
  onToggled: (pinned: boolean) => void;
}) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  if (!user || !STAFF_ROLES.has(user.role)) return null;

  const toggle = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/forum/topics/${topicId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !pinned }),
      });
      if (res.ok) onToggled(!pinned);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`shrink-0 border px-3 py-1.5 font-[var(--font-mono)] text-[11px] uppercase tracking-wide transition-colors duration-300 disabled:opacity-50 ${
        pinned
          ? "border-cyan-400/40 text-cyan-300 hover:border-rose-400/40 hover:text-rose-300"
          : "border-white/10 text-[var(--color-mist)] hover:border-cyan-400/40 hover:text-white"
      }`}
    >
      {pinned ? "Открепить" : "Закрепить"}
    </button>
  );
}

function countAll(comments: Comment[]) {
  return comments.reduce((sum, c) => sum + 1 + c.replies.length, 0);
}

function CommentBlock({
  comment,
  isExpanded,
  onToggleExpand,
  replyingTo,
  onSetReplyingTo,
  currentUser,
  onNeedLogin,
  topicId,
  onPosted,
  onReactionChange,
}: {
  comment: Comment;
  isExpanded: boolean;
  onToggleExpand: () => void;
  replyingTo: number | null;
  onSetReplyingTo: (id: number | null) => void;
  currentUser: { id: number; username: string } | null;
  onNeedLogin: () => void;
  topicId: number;
  onPosted: () => void;
  onReactionChange: (commentId: number, next: ReactionMap) => void;
}) {
  const visibleReplies = isExpanded ? comment.replies : comment.replies.slice(0, VISIBLE_REPLIES);
  const hiddenCount = comment.replies.length - visibleReplies.length;

  return (
    <div className="glass-panel pixel-corner p-4 sm:p-5">
      <CommentBody
        comment={comment}
        onReply={() => onSetReplyingTo(replyingTo === comment.id ? null : comment.id)}
        isReplyOpen={replyingTo === comment.id}
        currentUser={currentUser}
        onNeedLogin={onNeedLogin}
        onReactionChange={onReactionChange}
      />

      {replyingTo === comment.id && (
        <div className="ml-11 mt-3">
          {currentUser ? (
            <NewCommentForm
              topicId={topicId}
              replyToId={comment.id}
              replyToUsername={displayName(comment.author)}
              onPosted={() => {
                onPosted();
                onSetReplyingTo(null);
              }}
              onCancel={() => onSetReplyingTo(null)}
              compact
            />
          ) : (
            <button
              onClick={onNeedLogin}
              className="font-[var(--font-mono)] text-xs text-cyan-300 hover:text-cyan-200"
            >
              Войдите, чтобы ответить →
            </button>
          )}
        </div>
      )}

      {comment.replies.length > 0 && (
        <div className="mt-3 ml-11 flex flex-col gap-3 border-l-2 border-cyan-400/25 pl-4">
          {visibleReplies.map((reply) => (
            <div key={reply.id}>
              <CommentBody
                comment={reply}
                onReply={() => onSetReplyingTo(replyingTo === reply.id ? null : reply.id)}
                isReplyOpen={replyingTo === reply.id}
                compact
                currentUser={currentUser}
                onNeedLogin={onNeedLogin}
                onReactionChange={onReactionChange}
              />
              {replyingTo === reply.id && (
                <div className="ml-10 mt-3">
                  {currentUser ? (
                    <NewCommentForm
                      topicId={topicId}
                      replyToId={reply.id}
                      replyToUsername={displayName(reply.author)}
                      onPosted={() => {
                        onPosted();
                        onSetReplyingTo(null);
                      }}
                      onCancel={() => onSetReplyingTo(null)}
                      compact
                    />
                  ) : (
                    <button
                      onClick={onNeedLogin}
                      className="font-[var(--font-mono)] text-xs text-cyan-300 hover:text-cyan-200"
                    >
                      Войдите, чтобы ответить →
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {hiddenCount > 0 && (
            <button
              onClick={onToggleExpand}
              className="w-fit font-[var(--font-mono)] text-xs text-cyan-300 transition-colors hover:text-cyan-200"
            >
              Показать ещё {hiddenCount} {pluralReplies(hiddenCount)}
            </button>
          )}
          {isExpanded && comment.replies.length > VISIBLE_REPLIES && (
            <button
              onClick={onToggleExpand}
              className="w-fit font-[var(--font-mono)] text-xs text-[var(--color-mist)]/70 transition-colors hover:text-white"
            >
              Свернуть
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CommentBody({
  comment,
  onReply,
  isReplyOpen,
  compact,
  currentUser,
  onNeedLogin,
  onReactionChange,
}: {
  comment: Comment;
  onReply: () => void;
  isReplyOpen: boolean;
  compact?: boolean;
  currentUser: { id: number; username: string } | null;
  onNeedLogin: () => void;
  onReactionChange: (commentId: number, next: ReactionMap) => void;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <UserMeta
          username={comment.author.username}
          joinedAt={comment.author.created_at}
          avatarUrl={comment.author.avatar_url}
          minecraftUuid={comment.author.minecraft_uuid}
          minecraftUsername={comment.author.minecraft_username}
          size="sm"
        />
        <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-mist)]/60">
          {formatDateTime(comment.created_at)}
        </span>
      </div>
      {comment.reply_to_username && (
        <p className="ml-9 mt-1.5 font-[var(--font-mono)] text-[11px] text-cyan-300/80">
          в ответ <span className="text-cyan-300">{comment.reply_to_username}</span>
        </p>
      )}
      <p className={`ml-9 mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-mist)] ${compact ? "text-[13px]" : ""}`}>
        {comment.body}
      </p>
      <div className="ml-9 mt-2 flex items-center gap-4">
        <button
          onClick={onReply}
          className={`font-[var(--font-mono)] text-[11px] uppercase tracking-wide transition-colors ${
            isReplyOpen ? "text-cyan-300" : "text-[var(--color-mist)]/60 hover:text-cyan-300"
          }`}
        >
          Ответить
        </button>
        <ReportButton target={{ commentId: comment.id }} isLoggedIn={!!currentUser} onNeedLogin={onNeedLogin} />
      </div>
      <ReactionBar
        reactions={comment.reactions}
        target={{ commentId: comment.id }}
        isLoggedIn={!!currentUser}
        onNeedLogin={onNeedLogin}
        onChanged={(next) => onReactionChange(comment.id, next)}
        compact
      />
    </div>
  );
}

function NewCommentForm({
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
        Вы заблокированы на форуме{user.forum_banned_until ? ` до ${new Date(user.forum_banned_until).toLocaleString("ru-RU")}` : ""}.
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

function pluralReplies(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "ответ";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "ответа";
  return "ответов";
}
