/**
 * /api/auth/minecraft — links a Minecraft account to the site profile.
 * GET returns the current link state; POST validates the nickname against
 * Mojang and whispers a one-time code to the player in-game via RCON; PUT
 * verifies the code the player typed back in; DELETE unlinks/cancels.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { resolveMinecraftProfile } from "@/lib/mojang";
import { sendPrivateMessage } from "@/lib/rcon";

const LINK_TTL_MS = 10 * 60 * 1000; // 10 minutes to read the in-game message and enter the code

const nicknameSchema = z.object({
  nickname: z
    .string()
    .trim()
    .min(3, "Никнейм минимум 3 символа")
    .max(16, "Никнейм максимум 16 символов")
    .regex(/^[a-zA-Z0-9_]+$/, "Только латиница, цифры и подчёркивание"),
});

const codeSchema = z.object({
  code: z.string().trim().min(1, "Введите код"),
});

function generateCode() {
  // 6 digits — easy to read and type in the in-game chat, no letter-case ambiguity
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** GET — current link status + any pending verification request (never exposes the code itself). */
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const pool = getPool();
  const [userRows]: any = await pool.query(
    "SELECT minecraft_username, minecraft_uuid, minecraft_linked_at FROM users WHERE id = ? LIMIT 1",
    [userId]
  );
  const [pendingRows]: any = await pool.query(
    "SELECT nickname, expires_at FROM minecraft_link_requests WHERE user_id = ? LIMIT 1",
    [userId]
  );

  const pending = pendingRows[0];
  const stillValid = pending && new Date(pending.expires_at).getTime() > Date.now();

  return NextResponse.json({
    linked: userRows[0]
      ? {
          username: userRows[0].minecraft_username,
          uuid: userRows[0].minecraft_uuid,
          linkedAt: userRows[0].minecraft_linked_at,
        }
      : null,
    pending: stillValid ? { nickname: pending.nickname, expiresAt: pending.expires_at } : null,
  });
}

/**
 * POST — start (or resend) a link request: validate the nickname against Mojang, then
 * whisper a one-time code to that exact player in-game via RCON. The player proves they
 * control the nickname by reading it in their chat and typing it back into the site.
 */
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = nicknameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const profile = await resolveMinecraftProfile(parsed.data.nickname);
  if (!profile) {
    return NextResponse.json(
      { error: "Такой ник не найден на серверах Mojang — проверьте написание" },
      { status: 404 }
    );
  }

  const pool = getPool();
  const [ownedByOther]: any = await pool.query(
    "SELECT id FROM users WHERE minecraft_uuid = ? AND id != ? LIMIT 1",
    [profile.uuid, userId]
  );
  if (ownedByOther[0]) {
    return NextResponse.json({ error: "Этот Minecraft-аккаунт уже привязан к другому профилю" }, { status: 409 });
  }

  const code = generateCode();

  const sendResult = await sendPrivateMessage(
    profile.name,
    `[NexaPlay] Код подтверждения: ${code}. Введите его в личном кабинете на сайте.`
  );
  if (!sendResult.configured) {
    return NextResponse.json(
      {
        error:
          "Привязка аккаунта требует RCON. Настройте RCON_HOST, RCON_PORT и RCON_PASSWORD в .env (и enable-rcon=true в server.properties), чтобы сайт мог отправлять код игроку в игре.",
      },
      { status: 503 }
    );
  }
  if (!sendResult.delivered) {
    return NextResponse.json(
      { error: `Не удалось отправить код — похоже, «${profile.name}» сейчас не в сети. Зайдите на сервер и повторите.` },
      { status: 409 }
    );
  }

  const expiresAt = new Date(Date.now() + LINK_TTL_MS);
  await pool.query(
    `INSERT INTO minecraft_link_requests (user_id, nickname, uuid, code, expires_at)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE nickname = VALUES(nickname), uuid = VALUES(uuid), code = VALUES(code), expires_at = VALUES(expires_at)`,
    [userId, profile.name, profile.uuid, code, expiresAt]
  );

  return NextResponse.json({ nickname: profile.name, expiresAt });
}

/** PUT — verify the code the player read in-game and typed into the site. */
export async function PUT(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = codeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const pool = getPool();
  const [rows]: any = await pool.query(
    "SELECT nickname, uuid, code, expires_at FROM minecraft_link_requests WHERE user_id = ? LIMIT 1",
    [userId]
  );
  const request = rows[0];
  if (!request) {
    return NextResponse.json({ error: "Нет активной заявки на привязку — начните заново" }, { status: 404 });
  }
  if (new Date(request.expires_at).getTime() < Date.now()) {
    await pool.query("DELETE FROM minecraft_link_requests WHERE user_id = ?", [userId]);
    return NextResponse.json({ error: "Время на подтверждение истекло — начните заново" }, { status: 410 });
  }
  if (parsed.data.code.trim() !== request.code) {
    return NextResponse.json({ error: "Неверный код" }, { status: 401 });
  }

  await pool.query(
    "UPDATE users SET minecraft_username = ?, minecraft_uuid = ?, minecraft_linked_at = NOW() WHERE id = ?",
    [request.nickname, request.uuid, userId]
  );
  await pool.query("DELETE FROM minecraft_link_requests WHERE user_id = ?", [userId]);

  return NextResponse.json({ linked: { username: request.nickname, uuid: request.uuid } });
}

/** DELETE — unlink the connected Minecraft account (or cancel a pending request). */
export async function DELETE() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const pool = getPool();
  await pool.query("DELETE FROM minecraft_link_requests WHERE user_id = ?", [userId]);
  await pool.query(
    "UPDATE users SET minecraft_username = NULL, minecraft_uuid = NULL, minecraft_linked_at = NULL WHERE id = ?",
    [userId]
  );

  return NextResponse.json({ ok: true });
}
