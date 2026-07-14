/** POST /api/auth/change-password — verifies the current password, then sets a new one. */
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

const schema = z.object({
  currentPassword: z.string().min(1, "Введите текущий пароль"),
  newPassword: z.string().min(6, "Новый пароль минимум 6 символов"),
});

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { currentPassword, newPassword } = parsed.data;

  const pool = getPool();
  const [rows]: any = await pool.query("SELECT password_hash FROM users WHERE id = ? LIMIT 1", [userId]);
  const user = rows[0];
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Текущий пароль указан неверно" }, { status: 401 });
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, userId]);

  return NextResponse.json({ ok: true });
}
