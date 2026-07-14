/** GET/POST /api/support/admin/chats/:userId/messages — staff view of one user's support conversation. */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { sendToUser, sendToStaff } from "@/lib/ws-hub";
import { notify } from "@/lib/notify";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const admin = await requireStaff();
  if (!admin) {
    return NextResponse.json({ error: "Доступ только для сотрудников сервера" }, { status: 403 });
  }

  const { userId } = await params;
  const targetId = Number(userId);
  if (!Number.isInteger(targetId)) {
    return NextResponse.json({ error: "Некорректный пользователь" }, { status: 400 });
  }

  const pool = getPool();

  const [userRows]: any = await pool.query(
    "SELECT id, username, email, avatar_url, minecraft_uuid, minecraft_username FROM users WHERE id = ?",
    [targetId]
  );
  if (!userRows[0]) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  const [messages] = await pool.query(
    "SELECT id, sender_role, body, created_at FROM support_messages WHERE user_id = ? ORDER BY created_at ASC",
    [targetId]
  );

  await pool.query(
    "UPDATE support_messages SET read_by_admin = 1 WHERE user_id = ? AND sender_role = 'user' AND read_by_admin = 0",
    [targetId]
  );

  return NextResponse.json({ user: userRows[0], messages });
}

const schema = z.object({
  message: z.string().trim().min(1, "Сообщение не может быть пустым").max(2000, "Слишком длинное сообщение"),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const admin = await requireStaff();
  if (!admin) {
    return NextResponse.json({ error: "Доступ только для сотрудников сервера" }, { status: 403 });
  }

  const { userId } = await params;
  const targetId = Number(userId);
  if (!Number.isInteger(targetId)) {
    return NextResponse.json({ error: "Некорректный пользователь" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const pool = getPool();
  const [result]: any = await pool.query(
    `INSERT INTO support_messages (user_id, sender_role, sender_id, body, read_by_admin, read_by_user)
     VALUES (?, 'admin', ?, ?, 1, 0)`,
    [targetId, admin.id, parsed.data.message]
  );

  const [rows]: any = await pool.query(
    "SELECT id, sender_role, body, created_at FROM support_messages WHERE id = ?",
    [result.insertId]
  );

  sendToUser(targetId, { type: "support:admin_message", message: rows[0] });
  sendToStaff({ type: "support:user_message", userId: targetId, message: rows[0] });

  const excerpt = parsed.data.message.length > 90 ? `${parsed.data.message.slice(0, 90).trim()}…` : parsed.data.message;
  await notify(pool, {
    userId: targetId,
    actorId: admin.id,
    type: "support_reply",
    title: "Ответ от поддержки",
    body: excerpt,
    link: "#cabinet",
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
