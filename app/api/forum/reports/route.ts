import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

const schema = z
  .object({
    topicId: z.number().int().positive().optional(),
    commentId: z.number().int().positive().optional(),
    reason: z.string().trim().min(5, "Опишите причину жалобы подробнее").max(300, "Слишком длинное описание"),
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
  const { topicId, commentId, reason } = parsed.data;

  const pool = getPool();

  if (topicId) {
    const [rows]: any = await pool.query("SELECT id FROM forum_topics WHERE id = ?", [topicId]);
    if (!rows[0]) return NextResponse.json({ error: "Тема не найдена" }, { status: 404 });
  } else {
    const [rows]: any = await pool.query("SELECT id FROM forum_comments WHERE id = ?", [commentId]);
    if (!rows[0]) return NextResponse.json({ error: "Комментарий не найден" }, { status: 404 });
  }

  await pool.query(
    "INSERT INTO forum_reports (reporter_id, topic_id, comment_id, reason) VALUES (?, ?, ?, ?)",
    [userId, topicId ?? null, commentId ?? null, reason]
  );

  return NextResponse.json({ ok: true }, { status: 201 });
}
