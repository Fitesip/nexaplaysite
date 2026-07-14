import { pluralAnswers } from "@/lib/pluralize";
import type { ReactionMap } from "../ReactionBar";
import type { Comment } from "./types";

/** How many replies show before a comment collapses the rest behind "Показать ещё". */
export const VISIBLE_REPLIES = 2;

/** Roles allowed to pin/unpin a topic. */
export const STAFF_ROLES = new Set(["helper", "admin", "main_admin"]);

/** Recursively replaces a comment's reactions map by id, leaving the rest of the tree untouched. */
export function updateCommentReactions(comments: Comment[], commentId: number, next: ReactionMap): Comment[] {
  return comments.map((c) =>
    c.id === commentId
      ? { ...c, reactions: next }
      : { ...c, replies: updateCommentReactions(c.replies, commentId, next) }
  );
}

/** Total number of comments including nested replies, for the "Комментарии (N)" heading. */
export function countAll(comments: Comment[]) {
  return comments.reduce((sum, c) => sum + 1 + c.replies.length, 0);
}

/** Russian plural form for "N ответ/ответа/ответов". */
export const pluralReplies = pluralAnswers;
