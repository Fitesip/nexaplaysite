/**
 * GET /api/support/admin/chats/:userId/messages — staff's merged view of one
 * user's support history: every ticket they've ever opened, plus every
 * message across all of them (each with its attachments). The client groups
 * messages by `ticket_id` and renders a divider between ticket segments —
 * see components/admin/ChatPanel.tsx. Replies are posted through
 * /api/support/tickets/:id/messages instead of this route.
 */
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireStaff } from "@/lib/auth";

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

  const [tickets]: any = await pool.query(
    "SELECT id, subject, status, created_at, closed_at FROM support_tickets WHERE user_id = ? ORDER BY created_at ASC",
    [targetId]
  );

  const [messages]: any = await pool.query(
    "SELECT id, ticket_id, sender_role, body, created_at FROM support_messages WHERE user_id = ? ORDER BY created_at ASC",
    [targetId]
  );

  const [attachmentRows]: any = messages.length
    ? await pool.query(
        `SELECT message_id, file_url AS url, file_name AS name, mime_type AS mime, size_bytes AS size
         FROM support_attachments WHERE message_id IN (?)`,
        [messages.map((m: any) => m.id)]
      )
    : [[]];

  const attachmentsByMessage = new Map<number, any[]>();
  for (const a of attachmentRows) {
    const list = attachmentsByMessage.get(a.message_id) ?? [];
    list.push({ url: a.url, name: a.name, mime: a.mime, size: a.size });
    attachmentsByMessage.set(a.message_id, list);
  }
  const messagesWithAttachments = messages.map((m: any) => ({
    ...m,
    attachments: attachmentsByMessage.get(m.id) ?? [],
  }));

  await pool.query(
    "UPDATE support_messages SET read_by_admin = 1 WHERE user_id = ? AND sender_role = 'user' AND read_by_admin = 0",
    [targetId]
  );

  return NextResponse.json({ user: userRows[0], tickets, messages: messagesWithAttachments });
}
