/** POST /api/auth/login — verifies credentials and issues the session cookie. */
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { signSession, setSessionCookie, isBanActive, formatUntil } from "@/lib/auth";

const schema = z.object({
  username: z.string().min(1, "Введите никнейм"),
  password: z.string().min(1, "Введите пароль"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { username, password } = parsed.data;

  const pool = getPool();
  const [rows]: any = await pool.query(
    "SELECT id, username, email, avatar_url, minecraft_username, minecraft_uuid, minecraft_linked_at, password_hash, role, game_currency, balance_kopecks, banned, banned_reason, banned_until, created_at FROM users WHERE username = ? LIMIT 1",
    [username]
  );

  const user = rows[0];
  if (!user) {
    return NextResponse.json({ error: "Неверный никнейм или пароль" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Неверный никнейм или пароль" }, { status: 401 });
  }

  if (isBanActive(user.banned, user.banned_until)) {
    const reason = user.banned_reason ? ` Причина: ${user.banned_reason}.` : "";
    return NextResponse.json(
      { error: `Аккаунт заблокирован${formatUntil(user.banned_until)}.${reason}` },
      { status: 403 }
    );
  }

  const token = signSession({ userId: user.id });
  await setSessionCookie(token);

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar_url: user.avatar_url,
      minecraft_username: user.minecraft_username,
      minecraft_uuid: user.minecraft_uuid,
      minecraft_linked_at: user.minecraft_linked_at,
      role: user.role,
      game_currency: Number(user.game_currency),
      balance_kopecks: Number(user.balance_kopecks),
      created_at: user.created_at,
    },
  });
}
