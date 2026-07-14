/** GET /api/auth/me — returns the currently logged-in user (from the session cookie), or null. */
import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getCurrentUserId, isBanActive } from "@/lib/auth";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const pool = getPool();
  const [rows]: any = await pool.query(
    `SELECT id, username, email, avatar_url, minecraft_username, minecraft_uuid, minecraft_linked_at,
            role, banned, banned_until, forum_banned, forum_banned_reason, forum_banned_until, created_at
     FROM users WHERE id = ?`,
    [userId]
  );

  const row = rows[0];
  if (!row || isBanActive(row.banned, row.banned_until)) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const { banned, banned_until, forum_banned, forum_banned_until, ...rest } = row;
  return NextResponse.json({
    user: {
      ...rest,
      forum_banned: isBanActive(forum_banned, forum_banned_until),
      forum_banned_until: row.forum_banned_until,
    },
  });
}
