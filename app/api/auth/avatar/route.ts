import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { getPool } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "avatars");
const MAX_SIZE = 3 * 1024 * 1024; // 3MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** Removes a previously uploaded avatar file, ignoring "already gone" errors. */
async function deleteIfLocalUpload(avatarUrl: string | null) {
  if (!avatarUrl || !avatarUrl.startsWith("/uploads/avatars/")) return;
  try {
    await unlink(path.join(process.cwd(), "public", avatarUrl));
  } catch {
    /* file already missing — fine */
  }
}

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

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Поддерживаются только PNG, JPEG, WEBP и GIF" }, { status: 415 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Файл слишком большой (максимум 3 МБ)" }, { status: 413 });
  }

  const pool = getPool();
  const [rows]: any = await pool.query("SELECT avatar_url FROM users WHERE id = ? LIMIT 1", [userId]);
  const previousAvatar = rows[0]?.avatar_url ?? null;

  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${userId}-${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);

  const avatarUrl = `/uploads/avatars/${filename}`;
  await pool.query("UPDATE users SET avatar_url = ? WHERE id = ?", [avatarUrl, userId]);
  await deleteIfLocalUpload(previousAvatar);

  return NextResponse.json({ avatarUrl });
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
  await deleteIfLocalUpload(previousAvatar);

  return NextResponse.json({ ok: true });
}
