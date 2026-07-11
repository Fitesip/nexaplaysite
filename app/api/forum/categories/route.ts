import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT c.id, c.slug, c.name, c.description,
            COUNT(t.id) AS topic_count
     FROM forum_categories c
     LEFT JOIN forum_topics t ON t.category_id = c.id
     GROUP BY c.id, c.slug, c.name, c.description, c.sort_order
     ORDER BY c.sort_order ASC, c.id ASC`
  );

  return NextResponse.json({ categories: rows });
}
