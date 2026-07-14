"use client";

import { useEffect, useState } from "react";
import UserMeta, { formatDateTime } from "./UserMeta";
import ReactionBar from "./ReactionBar";
import ReportButton from "./ReportButton";
import BackLink from "./topic-thread/BackLink";
import PinToggle from "./topic-thread/PinToggle";
import CommentBlock from "./topic-thread/CommentBlock";
import NewCommentForm from "./topic-thread/NewCommentForm";
import { countAll, updateCommentReactions } from "./topic-thread/helpers";
import type { Comment, Topic, ThreadUser } from "./topic-thread/types";

/**
 * A single forum topic: header (title, author, tags, reactions) plus the full
 * comment tree below it. The heavier building blocks live under
 * ./topic-thread/* — this file just fetches the data and wires them together.
 */
export default function TopicThread({
  topicId,
  currentUser,
  onBack,
  onNeedLogin,
}: {
  topicId: number;
  currentUser: ThreadUser;
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
          <PinToggle
            topicId={topic.id}
            pinned={topic.pinned}
            onToggled={(p) => setTopic((t) => (t ? { ...t, pinned: p } : t))}
          />
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
