/**
 * Shared shapes for a forum topic and its comment tree, as returned by
 * GET /api/forum/topics/:id.
 */
import type { ReactionMap } from "../ReactionBar";

export type Author = {
  id: number;
  username: string;
  created_at: string;
  avatar_url: string | null;
  minecraft_uuid: string | null;
  minecraft_username: string | null;
};

/** A comment, plus its direct replies (one level deep — replies don't nest further). */
export type Comment = {
  id: number;
  body: string;
  created_at: string;
  author: Author;
  reply_to_username: string | null;
  reactions: ReactionMap;
  replies: Comment[];
};

export type Topic = {
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

/** Minimal shape of the logged-in user needed by this section (id + username only). */
export type ThreadUser = { id: number; username: string } | null;
