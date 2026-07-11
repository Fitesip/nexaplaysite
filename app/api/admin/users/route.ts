import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Доступ только для администраторов" }, { status: 403 });
  }

  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, username, email, role, banned, banned_reason, banned_until,
            forum_banned, forum_banned_reason, forum_banned_until, minecraft_username, created_at
     FROM users
     ORDER BY created_at DESC`
  );

  return NextResponse.json({ users: rows }, { headers: { "Cache-Control": "no-store" } });
}
