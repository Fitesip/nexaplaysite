import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { sendToStaff } from "@/lib/ws-hub";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const pool = getPool();
  const [rows] = await pool.query(
    "SELECT id, sender_role, body, created_at FROM support_messages WHERE user_id = ? ORDER BY created_at ASC",
    [userId]
  );

  // mark admin replies as seen now that the user is viewing the thread
  await pool.query(
    "UPDATE support_messages SET read_by_user = 1 WHERE user_id = ? AND sender_role = 'admin' AND read_by_user = 0",
    [userId]
  );

  return NextResponse.json({ messages: rows });
}

const schema = z.object({
  message: z.string().trim().min(1, "Сообщение не может быть пустым").max(2000, "Слишком длинное сообщение"),
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

  const pool = getPool();
  const [result]: any = await pool.query(
    `INSERT INTO support_messages (user_id, sender_role, sender_id, body, read_by_admin, read_by_user)
     VALUES (?, 'user', ?, ?, 0, 1)`,
    [userId, userId, parsed.data.message]
  );

  const [rows]: any = await pool.query(
    "SELECT id, sender_role, body, created_at FROM support_messages WHERE id = ?",
    [result.insertId]
  );
  const [userRows]: any = await pool.query(
    "SELECT username, avatar_url, minecraft_uuid, minecraft_username FROM users WHERE id = ?",
    [userId]
  );

  sendToStaff({
    type: "support:user_message",
    userId,
    username: userRows[0]?.username ?? null,
    avatar_url: userRows[0]?.avatar_url ?? null,
    minecraft_uuid: userRows[0]?.minecraft_uuid ?? null,
    minecraft_username: userRows[0]?.minecraft_username ?? null,
    message: rows[0],
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
