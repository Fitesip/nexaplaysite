"use client";

import { displayName } from "@/lib/avatar";
import type { ReactionMap } from "../ReactionBar";
import CommentBody from "./CommentBody";
import NewCommentForm from "./NewCommentForm";
import { VISIBLE_REPLIES, pluralReplies } from "./helpers";
import type { Comment, ThreadUser } from "./types";

/**
 * One top-level comment: its own body, an inline reply form when active, and
 * its replies (capped at VISIBLE_REPLIES until "Показать ещё" is clicked).
 */
export default function CommentBlock({
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
  currentUser: ThreadUser;
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
            <button onClick={onNeedLogin} className="font-[var(--font-mono)] text-xs text-cyan-300 hover:text-cyan-200">
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
