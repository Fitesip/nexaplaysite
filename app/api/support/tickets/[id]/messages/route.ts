/**
 * POST /api/support/tickets/:id/messages — posts a follow-up reply to an open
 * ticket: text, media attachments, or both (at least one is required). Works
 * for both sides — the ticket's own owner, or any staff member replying as
 * support — the sender role is derived from who's asking, not passed in by
 * the client. Closed tickets can't be replied to; the user is expected to
 * open a new ticket instead.
 */
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getCurrentUserId, requireStaff } from "@/lib/auth";
import { saveUploadedFile } from "@/lib/uploads";
import { sendToUser, sendToStaff } from "@/lib/ws-hub";
import { notify } from "@/lib/notify";
import {
  SUPPORT_MAX_PHOTOS,
  SUPPORT_MAX_VIDEOS,
  SUPPORT_MEDIA_TYPES,
  maxSizeFor,
  splitByKind,
} from "@/lib/support-media";

const MESSAGE_MAX = 2000;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;
  const ticketId = Number(id);
  if (!Number.isInteger(ticketId)) {
    return NextResponse.json({ error: "Некорректный тикет" }, { status: 400 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const messageText = String(form.get("message") ?? "").trim();
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);

  if (!messageText && files.length === 0) {
    return NextResponse.json({ error: "Сообщение не может быть пустым" }, { status: 400 });
  }
  if (messageText.length > MESSAGE_MAX) {
    return NextResponse.json({ error: "Слишком длинное сообщение" }, { status: 400 });
  }
  const { photos, videos } = splitByKind(files);
  if (photos.length > SUPPORT_MAX_PHOTOS) {
    return NextResponse.json({ error: `Можно приложить не более ${SUPPORT_MAX_PHOTOS} фото` }, { status: 400 });
  }
  if (videos.length > SUPPORT_MAX_VIDEOS) {
    return NextResponse.json({ error: `Можно приложить не более ${SUPPORT_MAX_VIDEOS} видео` }, { status: 400 });
  }
  for (const file of files) {
    if (!SUPPORT_MEDIA_TYPES[file.type]) {
      return NextResponse.json({ error: `Недопустимый тип файла: ${file.name}` }, { status: 415 });
    }
    const limit = maxSizeFor(file.type);
    if (file.size > limit) {
      return NextResponse.json(
        { error: `Файл слишком большой: ${file.name} (максимум ${Math.floor(limit / 1024 / 1024)} МБ)` },
        { status: 413 }
      );
    }
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
    return NextResponse.json(
      { error: "Тикет закрыт — создайте новый, если проблема повторилась" },
      { status: 409 }
    );
  }

  const senderRole = isOwner ? "user" : "admin";
  const [result]: any = await pool.query(
    `INSERT INTO support_messages (user_id, ticket_id, sender_role, sender_id, body, read_by_admin, read_by_user)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [ticket.user_id, ticketId, senderRole, userId, messageText, isOwner ? 0 : 1, isOwner ? 1 : 0]
  );
  const messageId = result.insertId;

  const attachments = [];
  for (const file of files) {
    const saved = await saveUploadedFile(file, `support/${ticketId}`, SUPPORT_MEDIA_TYPES, maxSizeFor(file.type));
    await pool.query(
      "INSERT INTO support_attachments (message_id, file_url, file_name, mime_type, size_bytes) VALUES (?, ?, ?, ?, ?)",
      [messageId, saved.url, saved.name, saved.mime, saved.size]
    );
    attachments.push({ url: saved.url, name: saved.name, mime: saved.mime, size: saved.size });
  }

  const message = {
    id: messageId,
    ticket_id: ticketId,
    sender_role: senderRole,
    body: messageText,
    created_at: new Date().toISOString(),
    attachments,
  };

  if (isOwner) {
    sendToStaff({ type: "support:user_message", userId: ticket.user_id, message });
  } else {
    sendToUser(ticket.user_id, { type: "support:admin_message", ticketId, message });
    sendToStaff({ type: "support:user_message", userId: ticket.user_id, message });

    const excerptSource = messageText || (attachments.length ? "📎 Вложение" : "");
    const excerpt = excerptSource.length > 90 ? `${excerptSource.slice(0, 90).trim()}…` : excerptSource;
    await notify(pool, {
      userId: ticket.user_id,
      actorId: userId,
      type: "support_reply",
      title: "Ответ от поддержки",
      body: excerpt,
      link: "#cabinet",
    });
  }

  return NextResponse.json({ ok: true, message }, { status: 201 });
}
