/** POST/DELETE /api/auth/avatar — uploads (or removes) the user's profile picture. */
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { saveUploadedFile, deleteUploadedFile } from "@/lib/uploads";

const MAX_SIZE = 3 * 1024 * 1024; // 3MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("avatar");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Файл не найден" }, { status: 400 });
  }

  let saved;
  try {
    saved = await saveUploadedFile(file, "avatars", ALLOWED_TYPES, MAX_SIZE);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Не удалось сохранить файл" }, { status: 415 });
  }

  const pool = getPool();
  const [rows]: any = await pool.query("SELECT avatar_url FROM users WHERE id = ? LIMIT 1", [userId]);
  const previousAvatar = rows[0]?.avatar_url ?? null;

  await pool.query("UPDATE users SET avatar_url = ? WHERE id = ?", [saved.url, userId]);
  await deleteUploadedFile(previousAvatar);

  return NextResponse.json({ avatarUrl: saved.url });
}

export async function DELETE() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const pool = getPool();
  const [rows]: any = await pool.query("SELECT avatar_url FROM users WHERE id = ? LIMIT 1", [userId]);
  const previousAvatar = rows[0]?.avatar_url ?? null;

  await pool.query("UPDATE users SET avatar_url = NULL WHERE id = ?", [userId]);
  await deleteUploadedFile(previousAvatar);

  return NextResponse.json({ ok: true });
}
