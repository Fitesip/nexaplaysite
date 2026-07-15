/** GET /api/forum/tags — lists forum tags with their topic counts.
 *  With ?category=<id> it returns only the most-used tags within that category
 *  (top `limit`, default 5) — used to suggest popular tags when creating a topic. */
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET(req: NextRequest) {
  const pool = getPool();
  const { searchParams } = new URL(req.url);
  const categoryRaw = searchParams.get("category");
  const categoryId = categoryRaw !== null ? Number(categoryRaw) : null;

  if (categoryId !== null) {
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return NextResponse.json({ error: "Некорректная категория" }, { status: 400 });
    }
    const limitRaw = Number(searchParams.get("limit") ?? 5);
    const limit = Number.isInteger(limitRaw) ? Math.min(Math.max(limitRaw, 1), 20) : 5;

    const [rows] = await pool.query(
      `SELECT t.id, t.name, COUNT(*) AS topic_count
       FROM forum_tags t
       JOIN forum_topic_tags tt ON tt.tag_id = t.id
       JOIN forum_topics tp ON tp.id = tt.topic_id
       WHERE tp.category_id = ?
       GROUP BY t.id, t.name
       ORDER BY topic_count DESC, t.name ASC
       LIMIT ?`,
      [categoryId, limit]
    );
    return NextResponse.json({ tags: rows });
  }

  const [rows] = await pool.query(
    `SELECT t.id, t.name, COUNT(tt.topic_id) AS topic_count
     FROM forum_tags t
     JOIN forum_topic_tags tt ON tt.tag_id = t.id
     GROUP BY t.id, t.name
     ORDER BY topic_count DESC, t.name ASC
     LIMIT 40`
  );

  return NextResponse.json({ tags: rows });
}
