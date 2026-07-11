import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

const LIMIT = 30;

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ items: [], unread: 0 });
  }

  const pool = getPool();
  const [rows]: any = await pool.query(
    `SELECT id, type, title, body, link, read_at, created_at
     FROM notifications
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ${LIMIT}`,
    [userId]
  );
  const [countRows]: any = await pool.query(
    "SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND read_at IS NULL",
    [userId]
  );

  return NextResponse.json({
    items: rows.map((r: any) => ({ ...r, read: !!r.read_at })),
    unread: countRows[0]?.unread ?? 0,
  });
}

const patchSchema = z.union([
  z.object({ id: z.number().int().positive() }),
  z.object({ all: z.literal(true) }),
]);

export async function PATCH(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const pool = getPool();
  if ("all" in parsed.data) {
    await pool.query(
      "UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL",
      [userId]
    );
  } else {
    await pool.query(
      "UPDATE notifications SET read_at = NOW() WHERE id = ? AND user_id = ? AND read_at IS NULL",
      [parsed.data.id, userId]
    );
  }

  return NextResponse.json({ ok: true });
}
