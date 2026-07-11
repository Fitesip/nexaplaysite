import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET() {
  const pool = getPool();
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
