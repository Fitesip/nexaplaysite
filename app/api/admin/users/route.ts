/** GET /api/admin/users — lists all accounts for the moderation table. Admins only. */
import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Доступ только для администраторов" }, { status: 403 });
  }

  const pool = getPool();
  const [rows]: any = await pool.query(
    `SELECT id, username, email, role, banned, banned_reason, banned_until,
            forum_banned, forum_banned_reason, forum_banned_until, minecraft_username, created_at
     FROM users
     ORDER BY created_at DESC`
  );

  // mysql2 returns TINYINT(1) columns as 0/1, not true booleans — coerce them so
  // client-side `{user.forum_banned && (...)}` can't render a stray "0" when false.
  const users = rows.map((r: any) => ({
    ...r,
    banned: !!r.banned,
    forum_banned: !!r.forum_banned,
  }));

  return NextResponse.json({ users }, { headers: { "Cache-Control": "no-store" } });
}
