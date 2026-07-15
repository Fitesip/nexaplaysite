/**
 * /api/support/tickets — the logged-in user's own support tickets.
 * GET returns their history (open + closed); POST opens a new one with a
 * subject, a full description, and optional media attachments.
 */
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { saveUploadedFile } from "@/lib/uploads";
import { sendToStaff } from "@/lib/ws-hub";
import {
  SUPPORT_MAX_PHOTOS,
  SUPPORT_MAX_VIDEOS,
  SUPPORT_MEDIA_TYPES,
  maxSizeFor,
  splitByKind,
} from "@/lib/support-media";

const SUBJECT_MAX = 200;
const BODY_MAX = 4000;

/** GET — the user's ticket history, newest first, with a quick unread/message-count summary. */
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT
       t.id, t.subject, t.status, t.created_at, t.closed_at,
       (SELECT COUNT(*) FROM support_messages sm WHERE sm.ticket_id = t.id) AS message_count,
       (SELECT COUNT(*) FROM support_messages sm
          WHERE sm.ticket_id = t.id AND sm.sender_role = 'admin' AND sm.read_by_user = 0) AS unread
     FROM support_tickets t
     WHERE t.user_id = ?
     ORDER BY t.created_at DESC`,
    [userId]
  );

  return NextResponse.json({ tickets: rows });
}

/** POST — opens a new ticket: subject + full text become the ticket and its first message, plus any attached files. */
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const subject = String(form.get("subject") ?? "").trim();
  const bodyText = String(form.get("body") ?? "").trim();
  if (!subject) {
    return NextResponse.json({ error: "Укажите тему обращения" }, { status: 400 });
  }
  if (subject.length > SUBJECT_MAX) {
    return NextResponse.json({ error: `Тема слишком длинная (максимум ${SUBJECT_MAX} символов)` }, { status: 400 });
  }
  if (!bodyText) {
    return NextResponse.json({ error: "Опишите вашу проблему" }, { status: 400 });
  }
  if (bodyText.length > BODY_MAX) {
    return NextResponse.json({ error: `Слишком длинное описание (максимум ${BODY_MAX} символов)` }, { status: 400 });
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  const { photos, videos } = splitByKind(files);
  if (photos.length > SUPPORT_MAX_PHOTOS) {
    return NextResponse.json({ error: `Можно приложить не более ${SUPPORT_MAX_PHOTOS} фото` }, { status: 400 });
  }
  if (videos.length > SUPPORT_MAX_VIDEOS) {
    return NextResponse.json({ error: `Можно приложить не более ${SUPPORT_MAX_VIDEOS} видео` }, { status: 400 });
  }

  // validate every attachment up front, before writing anything to disk or the DB
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

  const [openRows]: any = await pool.query(
    "SELECT id FROM support_tickets WHERE user_id = ? AND status = 'open' LIMIT 1",
    [userId]
  );
  if (openRows.length > 0) {
    return NextResponse.json(
      { error: "У вас уже есть открытое обращение — дождитесь его закрытия перед созданием нового" },
      { status: 409 }
    );
  }

  const [ticketResult]: any = await pool.query(
    "INSERT INTO support_tickets (user_id, subject, status) VALUES (?, ?, 'open')",
    [userId, subject]
  );
  const ticketId = ticketResult.insertId;

  const [messageResult]: any = await pool.query(
    `INSERT INTO support_messages (user_id, ticket_id, sender_role, sender_id, body, read_by_admin, read_by_user)
     VALUES (?, ?, 'user', ?, ?, 0, 1)`,
    [userId, ticketId, userId, bodyText]
  );
  const messageId = messageResult.insertId;

  const attachments = [];
  for (const file of files) {
    const saved = await saveUploadedFile(file, `support/${ticketId}`, SUPPORT_MEDIA_TYPES, maxSizeFor(file.type));
    await pool.query(
      "INSERT INTO support_attachments (message_id, file_url, file_name, mime_type, size_bytes) VALUES (?, ?, ?, ?, ?)",
      [messageId, saved.url, saved.name, saved.mime, saved.size]
    );
    attachments.push({ url: saved.url, name: saved.name, mime: saved.mime, size: saved.size });
  }

  const [ticketRows]: any = await pool.query(
    "SELECT id, subject, status, created_at, closed_at FROM support_tickets WHERE id = ?",
    [ticketId]
  );
  const [userRows]: any = await pool.query(
    "SELECT username, avatar_url, minecraft_uuid, minecraft_username FROM users WHERE id = ?",
    [userId]
  );

  const message = { id: messageId, ticket_id: ticketId, sender_role: "user", body: bodyText, created_at: new Date().toISOString(), attachments };

  // lets the staff support inbox pick up the new ticket live, same event the
  // admin chat list already listens for — just now carrying a `ticket` too
  sendToStaff({
    type: "support:user_message",
    userId,
    username: userRows[0]?.username ?? null,
    avatar_url: userRows[0]?.avatar_url ?? null,
    minecraft_uuid: userRows[0]?.minecraft_uuid ?? null,
    minecraft_username: userRows[0]?.minecraft_username ?? null,
    ticket: ticketRows[0],
    isNewTicket: true,
    message,
  });

  return NextResponse.json({ ticket: ticketRows[0], message }, { status: 201 });
}
