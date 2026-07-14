/** GET /api/forum/topics/:id — full topic + comment tree. PATCH pins/unpins it (staff only). */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { getCurrentUserId, requireStaff } from "@/lib/auth";

/** Aggregates reactions for a topic + all its comments into { [targetId]: { emoji: {count, mine} } }. */
async function loadReactions(pool: ReturnType<typeof getPool>, topicId: number, userId: number | null) {
  const [rows]: any = await pool.query(
    `SELECT topic_id, comment_id, emoji, user_id
     FROM forum_reactions
     WHERE topic_id = ?
        OR comment_id IN (SELECT id FROM forum_comments WHERE topic_id = ?)`,
    [topicId, topicId]
  );

  const byTarget: Record<string, Record<string, { count: number; mine: boolean }>> = {};
  for (const r of rows) {
    const key = r.topic_id ? `t${r.topic_id}` : `c${r.comment_id}`;
    byTarget[key] ??= {};
    byTarget[key][r.emoji] ??= { count: 0, mine: false };
    byTarget[key][r.emoji].count += 1;
    if (userId && r.user_id === userId) byTarget[key][r.emoji].mine = true;
  }
  return byTarget;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const topicId = Number(id);
  if (!Number.isInteger(topicId) || topicId <= 0) {
    return NextResponse.json({ error: "Некорректная тема" }, { status: 400 });
  }

  const pool = getPool();
  const userId = await getCurrentUserId();

  const [topicRows]: any = await pool.query(
    `SELECT t.id, t.title, t.body, t.pinned, t.created_at,
            u.id AS author_id, u.username AS author_name, u.created_at AS author_joined_at,
            u.avatar_url AS author_avatar_url, u.minecraft_uuid AS author_minecraft_uuid,
            u.minecraft_username AS author_minecraft_username,
            c.id AS category_id, c.slug AS category_slug, c.name AS category_name
     FROM forum_topics t
     JOIN users u ON u.id = t.user_id
     JOIN forum_categories c ON c.id = t.category_id
     WHERE t.id = ?`,
    [topicId]
  );
  const topicRow = topicRows[0];
  if (!topicRow) {
    return NextResponse.json({ error: "Тема не найдена" }, { status: 404 });
  }

  const [tagRows]: any = await pool.query(
    `SELECT tg.id, tg.name FROM forum_topic_tags tt JOIN forum_tags tg ON tg.id = tt.tag_id WHERE tt.topic_id = ?`,
    [topicId]
  );

  const [commentRows]: any = await pool.query(
    `SELECT cm.id, cm.parent_id, cm.reply_to_comment_id, cm.body, cm.created_at,
            u.id AS author_id, u.username AS author_name, u.created_at AS author_joined_at,
            u.avatar_url AS author_avatar_url, u.minecraft_uuid AS author_minecraft_uuid,
            u.minecraft_username AS author_minecraft_username,
            ru.username AS reply_to_username, ru.minecraft_username AS reply_to_minecraft_username
     FROM forum_comments cm
     JOIN users u ON u.id = cm.user_id
     LEFT JOIN forum_comments rc ON rc.id = cm.reply_to_comment_id
     LEFT JOIN users ru ON ru.id = rc.user_id
     WHERE cm.topic_id = ?
     ORDER BY cm.created_at ASC`,
    [topicId]
  );

  const reactions = await loadReactions(pool, topicId, userId);

  const byId: Record<number, any> = {};
  const roots: any[] = [];
  for (const r of commentRows) {
    const comment = {
      id: r.id,
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
      reactions: reactions[`c${r.id}`] ?? {},
      replies: [] as any[],
    };
    byId[r.id] = comment;
    if (r.parent_id) {
      byId[r.parent_id]?.replies.push(comment);
    } else {
      roots.push(comment);
    }
  }

  return NextResponse.json({
    topic: {
      id: topicRow.id,
      title: topicRow.title,
      body: topicRow.body,
      pinned: !!topicRow.pinned,
      created_at: topicRow.created_at,
      author: {
        id: topicRow.author_id,
        username: topicRow.author_name,
        created_at: topicRow.author_joined_at,
        avatar_url: topicRow.author_avatar_url,
        minecraft_uuid: topicRow.author_minecraft_uuid,
        minecraft_username: topicRow.author_minecraft_username,
      },
      category: { id: topicRow.category_id, slug: topicRow.category_slug, name: topicRow.category_name },
      tags: tagRows,
      reactions: reactions[`t${topicRow.id}`] ?? {},
    },
    comments: roots,
  });
}

const pinSchema = z.object({ pinned: z.boolean() });

/** Staff-only: pin/unpin a topic so it sorts to the top of the list. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  if (!staff) {
    return NextResponse.json({ error: "Доступ только для сотрудников сервера" }, { status: 403 });
  }

  const { id } = await params;
  const topicId = Number(id);
  if (!Number.isInteger(topicId) || topicId <= 0) {
    return NextResponse.json({ error: "Некорректная тема" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = pinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const pool = getPool();
  const [result]: any = await pool.query("UPDATE forum_topics SET pinned = ? WHERE id = ?", [
    parsed.data.pinned ? 1 : 0,
    topicId,
  ]);
  if (result.affectedRows === 0) {
    return NextResponse.json({ error: "Тема не найдена" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, pinned: parsed.data.pinned });
}
