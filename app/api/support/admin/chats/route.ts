import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireStaff } from "@/lib/auth";

export async function GET() {
  const admin = await requireStaff();
  if (!admin) {
    return NextResponse.json({ error: "Доступ только для сотрудников сервера" }, { status: 403 });
  }

  const pool = getPool();
  const [rows] = await pool.query(`
    SELECT
      u.id AS user_id,
      u.username,
      u.email,
      u.avatar_url,
      u.minecraft_uuid,
      u.minecraft_username,
      (SELECT body FROM support_messages sm
        WHERE sm.user_id = u.id ORDER BY sm.created_at DESC LIMIT 1) AS last_message,
      (SELECT sender_role FROM support_messages sm
        WHERE sm.user_id = u.id ORDER BY sm.created_at DESC LIMIT 1) AS last_sender_role,
      (SELECT created_at FROM support_messages sm
        WHERE sm.user_id = u.id ORDER BY sm.created_at DESC LIMIT 1) AS last_at,
      (SELECT COUNT(*) FROM support_messages sm
        WHERE sm.user_id = u.id AND sm.sender_role = 'user' AND sm.read_by_admin = 0) AS unread
    FROM users u
    WHERE EXISTS (SELECT 1 FROM support_messages sm WHERE sm.user_id = u.id)
    ORDER BY last_at DESC
  `);

  return NextResponse.json({ chats: rows });
}
