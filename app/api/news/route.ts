/** GET /api/news — lists news posts, pinned first. */
import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET() {
  const pool = getPool();
  const [rows] = await pool.query(
    "SELECT id, title, excerpt, content, pinned, created_at FROM news ORDER BY pinned DESC, created_at DESC LIMIT 30"
  );

  return NextResponse.json({ news: rows });
}
