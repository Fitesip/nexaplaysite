"use client";

import UserMeta, { formatDateTime } from "../UserMeta";
import ReactionBar, { type ReactionMap } from "../ReactionBar";
import ReportButton from "../ReportButton";
import type { Comment, ThreadUser } from "./types";

/**
 * Renders one comment's content: author line, "in reply to" note, body text,
 * reply/report actions, and its reaction bar. Used for both top-level comments
 * and their (one level deep) replies — `compact` shrinks the text a touch.
 */
export default function CommentBody({
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
  currentUser: ThreadUser;
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
      <p
        className={`ml-9 mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-mist)] ${
          compact ? "text-[13px]" : ""
        }`}
      >
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
