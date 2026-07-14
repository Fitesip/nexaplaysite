/** GET /api/admin/forum/reports — lists pending forum reports for staff to review. */
import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireStaff } from "@/lib/auth";

export async function GET() {
  const staff = await requireStaff();
  if (!staff) {
    return NextResponse.json({ error: "Доступ только для сотрудников" }, { status: 403 });
  }

  const pool = getPool();
  const [rows]: any = await pool.query(
    `SELECT r.id, r.reason, r.status, r.created_at,
            reporter.username AS reporter_name,
            r.topic_id,
            t.title AS topic_title,
            r.comment_id,
            cm.body AS comment_body,
            cm.topic_id AS comment_topic_id,
            author.id AS target_author_id,
            author.username AS target_author_name
     FROM forum_reports r
     JOIN users reporter ON reporter.id = r.reporter_id
     LEFT JOIN forum_topics t ON t.id = r.topic_id
     LEFT JOIN forum_comments cm ON cm.id = r.comment_id
     LEFT JOIN users author ON author.id = COALESCE(t.user_id, cm.user_id)
     WHERE r.status = 'open'
     ORDER BY r.created_at ASC`
  );

  return NextResponse.json({
    reports: rows.map((r: any) => ({
      id: r.id,
      reason: r.reason,
      status: r.status,
      created_at: r.created_at,
      reporter_name: r.reporter_name,
      target: r.topic_id
        ? { type: "topic" as const, id: r.topic_id, excerpt: r.topic_title, deleted: !r.topic_title }
        : {
            type: "comment" as const,
            id: r.comment_id,
            topicId: r.comment_topic_id,
            excerpt: r.comment_body,
            deleted: !r.comment_body,
          },
      target_author: r.target_author_id
        ? { id: r.target_author_id, username: r.target_author_name }
        : null,
    })),
  });
}
