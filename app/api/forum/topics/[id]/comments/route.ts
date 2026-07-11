import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { requireForumPostAccess } from "@/lib/auth";
import { notify } from "@/lib/notify";

const schema = z.object({
  body: z.string().trim().min(1, "Комментарий не может быть пустым").max(4000, "Слишком длинный комментарий"),
  // id of the comment being replied to, if any (can be a root comment or another reply)
  reply_to_id: z.number().int().positive().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const topicId = Number(id);
  if (!Number.isInteger(topicId) || topicId <= 0) {
    return NextResponse.json({ error: "Некорректная тема" }, { status: 400 });
  }

  const gate = await requireForumPostAccess();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const userId = gate.userId;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { body: text, reply_to_id } = parsed.data;

  const pool = getPool();

  const [topicRows]: any = await pool.query(
    "SELECT id, user_id, title FROM forum_topics WHERE id = ?",
    [topicId]
  );
  if (!topicRows[0]) {
    return NextResponse.json({ error: "Тема не найдена" }, { status: 404 });
  }
  const topicAuthorId = topicRows[0].user_id as number;
  const topicTitle = topicRows[0].title as string;
  const excerpt = text.length > 90 ? `${text.slice(0, 90).trim()}…` : text;
  const notifyBody = `«${topicTitle}»: ${excerpt}`;

  // Nesting is flattened to a single visual level: replying to a reply still
  // attaches under that reply's root comment, but keeps the exact target
  // in reply_to_comment_id so the UI can show "в ответ <ник>".
  let parentId: number | null = null;
  let replyToCommentId: number | null = null;
  let replyTargetAuthorId: number | null = null;

  if (reply_to_id) {
    const [targetRows]: any = await pool.query(
      "SELECT id, parent_id, topic_id, user_id FROM forum_comments WHERE id = ?",
      [reply_to_id]
    );
    const target = targetRows[0];
    if (!target || target.topic_id !== topicId) {
      return NextResponse.json({ error: "Комментарий для ответа не найден" }, { status: 400 });
    }
    parentId = target.parent_id ?? target.id;
    replyToCommentId = target.id;
    replyTargetAuthorId = target.user_id;
  }

  const [result]: any = await pool.query(
    "INSERT INTO forum_comments (topic_id, user_id, parent_id, reply_to_comment_id, body) VALUES (?, ?, ?, ?, ?)",
    [topicId, userId, parentId, replyToCommentId, text]
  );

  // notify the topic owner about the new comment, and separately notify whoever
  // was directly replied to (skipping duplicates when they're the same person)
  await notify(pool, {
    userId: topicAuthorId,
    actorId: userId,
    type: "forum_reply",
    title: "Новый комментарий в вашей теме",
    body: notifyBody,
    link: `#forum/topic/${topicId}`,
  });
  if (replyTargetAuthorId && replyTargetAuthorId !== topicAuthorId) {
    await notify(pool, {
      userId: replyTargetAuthorId,
      actorId: userId,
      type: "forum_reply",
      title: "Вам ответили на форуме",
      body: notifyBody,
      link: `#forum/topic/${topicId}`,
    });
  }

  const [rows]: any = await pool.query(
    `SELECT cm.id, cm.parent_id, cm.reply_to_comment_id, cm.body, cm.created_at,
            u.id AS author_id, u.username AS author_name, u.created_at AS author_joined_at,
            u.avatar_url AS author_avatar_url, u.minecraft_uuid AS author_minecraft_uuid,
            u.minecraft_username AS author_minecraft_username,
            ru.username AS reply_to_username, ru.minecraft_username AS reply_to_minecraft_username
     FROM forum_comments cm
     JOIN users u ON u.id = cm.user_id
     LEFT JOIN forum_comments rc ON rc.id = cm.reply_to_comment_id
     LEFT JOIN users ru ON ru.id = rc.user_id
     WHERE cm.id = ?`,
    [result.insertId]
  );
  const r = rows[0];

  return NextResponse.json(
    {
      comment: {
        id: r.id,
        parent_id: r.parent_id,
        body: r.body,
        created_at: r.created_at,
        author: {
          id: r.author_id,
          username: r.author_name,
          created_at: r.author_joined_at,
          avatar_url: r.author_avatar_url,
          minecraft_uuid: r.author_minecraft_uuid,
          minecraft_username: r.author_minecraft_username,
        },
        reply_to_username: r.reply_to_minecraft_username || r.reply_to_username || null,
        reactions: {},
        replies: [],
      },
    },
    { status: 201 }
  );
}
