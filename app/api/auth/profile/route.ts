/** PATCH /api/auth/profile — changes the logged-in user's username, after checking it's free. */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

const schema = z.object({
  username: z
    .string()
    .min(3, "Никнейм должен быть не короче 3 символов")
    .max(24, "Никнейм слишком длинный")
    .regex(/^[a-zA-Z0-9_]+$/, "Только латиница, цифры и подчёркивание"),
});

export async function PATCH(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { username } = parsed.data;

  const pool = getPool();
  const [existing]: any = await pool.query("SELECT id FROM users WHERE username = ? AND id != ? LIMIT 1", [
    username,
    userId,
  ]);
  if (existing[0]) {
    return NextResponse.json({ error: "Этот никнейм уже занят" }, { status: 409 });
  }

  await pool.query("UPDATE users SET username = ? WHERE id = ?", [username, userId]);

  const [rows]: any = await pool.query(
    "SELECT id, username, email, avatar_url, minecraft_username, minecraft_uuid, minecraft_linked_at, role, created_at FROM users WHERE id = ?",
    [userId]
  );

  return NextResponse.json({ user: rows[0] });
}
