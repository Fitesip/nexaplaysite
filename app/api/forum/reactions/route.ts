import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { notify } from "@/lib/notify";

/** Small fixed emoji set — keeps aggregation simple and the UI predictable. */
export const ALLOWED_EMOJI = ["👍", "❤️", "😂", "😮", "😢"] as const;

const schema = z
  .object({
    topicId: z.number().int().positive().optional(),
    commentId: z.number().int().positive().optional(),
    emoji: z.enum(ALLOWED_EMOJI),
  })
  .refine((d) => (d.topicId ? !d.commentId : !!d.commentId), {
    message: "Укажите либо topicId, либо commentId",
  });

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { topicId, commentId, emoji } = parsed.data;

  const pool = getPool();

  // toggle: remove if it already exists, otherwise add it
  const [existing]: any = await pool.query(
    topicId
      ? "SELECT id FROM forum_reactions WHERE user_id = ? AND topic_id = ? AND emoji = ?"
      : "SELECT id FROM forum_reactions WHERE user_id = ? AND comment_id = ? AND emoji = ?",
    [userId, topicId ?? commentId, emoji]
  );

  if (existing[0]) {
    await pool.query("DELETE FROM forum_reactions WHERE id = ?", [existing[0].id]);
  } else {
    if (topicId) {
      const [topicRows]: any = await pool.query("SELECT id, user_id FROM forum_topics WHERE id = ?", [topicId]);
      if (!topicRows[0]) return NextResponse.json({ error: "Тема не найдена" }, { status: 404 });
      await pool.query(
        "INSERT INTO forum_reactions (user_id, topic_id, emoji) VALUES (?, ?, ?)",
        [userId, topicId, emoji]
      );
      await notify(pool, {
        userId: topicRows[0].user_id,
        actorId: userId,
        type: "forum_reaction",
        title: "Кто-то отреагировал на вашу тему",
        body: emoji,
        link: `#forum/topic/${topicId}`,
      });
    } else {
      const [commentRows]: any = await pool.query(
        "SELECT id, user_id, topic_id FROM forum_comments WHERE id = ?",
        [commentId]
      );
      if (!commentRows[0]) return NextResponse.json({ error: "Комментарий не найден" }, { status: 404 });
      await pool.query(
        "INSERT INTO forum_reactions (user_id, comment_id, emoji) VALUES (?, ?, ?)",
        [userId, commentId, emoji]
      );
      await notify(pool, {
        userId: commentRows[0].user_id,
        actorId: userId,
        type: "forum_reaction",
        title: "Кто-то отреагировал на ваш комментарий",
        body: emoji,
        link: `#forum/topic/${commentRows[0].topic_id}`,
      });
    }
  }

  return NextResponse.json({ ok: true, active: !existing[0] });
}
