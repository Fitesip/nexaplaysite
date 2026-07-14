/** GET/POST /api/admin/news — list every news post, or create a new one. Admins only. */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Доступ только для администраторов" }, { status: 403 });
  }

  const pool = getPool();
  const [rows] = await pool.query(
    "SELECT id, title, excerpt, content, pinned, created_at FROM news ORDER BY pinned DESC, created_at DESC"
  );

  return NextResponse.json({ news: rows }, { headers: { "Cache-Control": "no-store" } });
}

const schema = z.object({
  title: z.string().trim().min(1, "Укажите заголовок").max(200, "Заголовок слишком длинный"),
  excerpt: z.string().trim().min(1, "Укажите краткое описание").max(300, "Краткое описание слишком длинное"),
  content: z.string().trim().min(1, "Укажите текст новости").max(8000, "Текст слишком длинный"),
  pinned: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Доступ только для администраторов" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { title, excerpt, content, pinned } = parsed.data;

  const pool = getPool();
  const [result]: any = await pool.query(
    "INSERT INTO news (title, excerpt, content, pinned) VALUES (?, ?, ?, ?)",
    [title, excerpt, content, pinned ? 1 : 0]
  );

  return NextResponse.json({ id: result.insertId }, { status: 201 });
}
