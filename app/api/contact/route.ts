/** POST /api/contact — validates and stores a contact-form submission. */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/lib/db";

const schema = z.object({
  name: z.string().min(1, "Укажите имя"),
  email: z.string().email("Некорректный email"),
  topic: z.string().min(1, "Выберите тему"),
  message: z.string().min(10, "Сообщение слишком короткое"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { name, email, topic, message } = parsed.data;

  const pool = getPool();
  await pool.query(
    "INSERT INTO contact_messages (name, email, topic, message) VALUES (?, ?, ?, ?)",
    [name, email, topic, message]
  );

  return NextResponse.json({ ok: true }, { status: 201 });
}
