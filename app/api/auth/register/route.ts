/** POST /api/auth/register — validates the captcha, creates the account, and starts a session. */
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { signSession, setSessionCookie } from "@/lib/auth";
import { verifyCaptchaToken } from "@/lib/captcha";
import { notify } from "@/lib/notify";

const schema = z.object({
  username: z
    .string()
    .min(3, "Никнейм должен быть не короче 3 символов")
    .max(24, "Никнейм слишком длинный")
    .regex(/^[a-zA-Z0-9_]+$/, "Только латиница, цифры и подчёркивание"),
  email: z.string().email("Некорректный email"),
  password: z.string().min(6, "Пароль минимум 6 символов"),
  captchaAnswer: z.string().min(1, "Введите код с картинки"),
  captchaToken: z.string().min(1, "Капча устарела, обновите страницу"),
  // referral code of whoever invited this user, if they came via a referral link
  ref: z.string().trim().max(12).optional(),
});

/** Generates a unique 8-char referral code, retrying on the rare collision. */
async function generateReferralCode(pool: ReturnType<typeof getPool>) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = crypto.randomBytes(6).toString("hex").slice(0, 8).toUpperCase();
    const [rows]: any = await pool.query("SELECT id FROM users WHERE referral_code = ?", [code]);
    if (!rows[0]) return code;
  }
  return crypto.randomBytes(8).toString("hex").toUpperCase();
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    console.log(parsed.error.issues);
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { username, email, password, captchaAnswer, captchaToken, ref } = parsed.data;

  if (!verifyCaptchaToken(captchaToken, captchaAnswer)) {
    console.log(captchaToken, captchaAnswer);
    return NextResponse.json({ error: "Неверный код капчи" }, { status: 400 });
  }

  const pool = getPool();
  const [existing] = await pool.query(
    "SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1",
    [username, email]
  );
  if (Array.isArray(existing) && existing.length > 0) {
    return NextResponse.json({ error: "Такой ник или email уже зарегистрирован" }, { status: 409 });
  }

  // resolve the referrer (if a valid ref code was passed) before creating the account,
  // so a bad/unknown code just silently doesn't attach a referrer instead of failing registration
  let referrerId: number | null = null;
  if (ref) {
    const [referrerRows]: any = await pool.query(
      "SELECT id, username FROM users WHERE referral_code = ?",
      [ref.toUpperCase()]
    );
    referrerId = referrerRows[0]?.id ?? null;
  }

  const hash = await bcrypt.hash(password, 10);
  const referralCode = await generateReferralCode(pool);
  const [result]: any = await pool.query(
    "INSERT INTO users (username, email, password_hash, referral_code, referred_by) VALUES (?, ?, ?, ?, ?)",
    [username, email, hash, referralCode, referrerId]
  );

  const userId = result.insertId as number;
  const token = signSession({ userId });
  await setSessionCookie(token);

  if (referrerId) {
    await notify(pool, {
      userId: referrerId,
      type: "referral_joined",
      title: "У вас новый реферал",
      body: `Игрок ${username} зарегистрировался по вашей ссылке.`,
      link: "#cabinet",
    });
  }

  const [rows]: any = await pool.query(
    "SELECT id, username, email, avatar_url, minecraft_username, minecraft_uuid, minecraft_linked_at, role, created_at FROM users WHERE id = ?",
    [userId]
  );

  return NextResponse.json({ user: rows[0] }, { status: 201 });
}
