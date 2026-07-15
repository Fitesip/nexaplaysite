/**
 * /api/support/tickets/:id — one ticket's full thread.
 * GET is available to the ticket's owner or any staff member; PATCH (closing
 * it) is staff-only, matching that only admins/helpers resolve tickets.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { getCurrentUserId, requireStaff } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { sendToUser, sendToStaff } from "@/lib/ws-hub";

/** GET — the ticket plus every message in it (each with its attachments, if any). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;
  const ticketId = Number(id);
  if (!Number.isInteger(ticketId)) {
    return NextResponse.json({ error: "Некорректный тикет" }, { status: 400 });
  }

  const pool = getPool();
  const [ticketRows]: any = await pool.query(
    "SELECT id, user_id, subject, status, created_at, closed_at FROM support_tickets WHERE id = ? LIMIT 1",
    [ticketId]
  );
  const ticket = ticketRows[0];
  if (!ticket) {
    return NextResponse.json({ error: "Тикет не найден" }, { status: 404 });
  }

  const isOwner = ticket.user_id === userId;
  const staff = await requireStaff();
  if (!isOwner && !staff) {
    return NextResponse.json({ error: "Нет доступа к этому тикету" }, { status: 403 });
  }

  const [messages]: any = await pool.query(
    "SELECT id, sender_role, body, created_at FROM support_messages WHERE ticket_id = ? ORDER BY created_at ASC",
    [ticketId]
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

  // only the owner viewing their own ticket marks admin replies as read — staff
  // viewing it is handled separately via the merged admin chat endpoint
  if (isOwner) {
    await pool.query(
      "UPDATE support_messages SET read_by_user = 1 WHERE ticket_id = ? AND sender_role = 'admin' AND read_by_user = 0",
      [ticketId]
    );
  }

  return NextResponse.json({ ticket, messages: messagesWithAttachments });
}

const patchSchema = z.object({ status: z.literal("closed") });

/** PATCH — closes a ticket. Either the ticket's own owner or any staff member can do this;
 *  there's no "reopen" — the user just opens a new one if needed. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;
  const ticketId = Number(id);
  if (!Number.isInteger(ticketId)) {
    return NextResponse.json({ error: "Некорректный тикет" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const pool = getPool();
  const [rows]: any = await pool.query("SELECT user_id, status FROM support_tickets WHERE id = ? LIMIT 1", [ticketId]);
  const ticket = rows[0];
  if (!ticket) {
    return NextResponse.json({ error: "Тикет не найден" }, { status: 404 });
  }

  const isOwner = ticket.user_id === userId;
  const staff = isOwner ? null : await requireStaff();
  if (!isOwner && !staff) {
    return NextResponse.json({ error: "Нет доступа к этому тикету" }, { status: 403 });
  }
  if (ticket.status === "closed") {
    return NextResponse.json({ error: "Тикет уже закрыт" }, { status: 409 });
  }

  await pool.query("UPDATE support_tickets SET status = 'closed', closed_at = NOW(), closed_by = ? WHERE id = ?", [
    userId,
    ticketId,
  ]);

  sendToUser(ticket.user_id, { type: "support:ticket_closed", ticketId });
  sendToStaff({ type: "support:ticket_closed", ticketId, userId: ticket.user_id });

  // only notify the user when staff closed it on their behalf — closing your own
  // ticket doesn't need a notification about your own action
  if (!isOwner) {
    await notify(pool, {
      userId: ticket.user_id,
      actorId: userId,
      type: "support_ticket_closed",
      title: "Тикет закрыт",
      body: "Ваше обращение в поддержку было закрыто. Если проблема не решена — создайте новый тикет.",
      link: "#cabinet",
    });
  }

  return NextResponse.json({ ok: true });
}
