import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const schema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  excerpt: z.string().trim().min(1).max(300).optional(),
  content: z.string().trim().min(1).max(8000).optional(),
  pinned: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Доступ только для администраторов" }, { status: 403 });
  }

  const { id } = await params;
  const newsId = Number(id);
  if (!Number.isInteger(newsId)) {
    return NextResponse.json({ error: "Некорректная новость" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const fields = parsed.data;
  const sets: string[] = [];
  const values: unknown[] = [];

  if (fields.title !== undefined) {
    sets.push("title = ?");
    values.push(fields.title);
  }
  if (fields.excerpt !== undefined) {
    sets.push("excerpt = ?");
    values.push(fields.excerpt);
  }
  if (fields.content !== undefined) {
    sets.push("content = ?");
    values.push(fields.content);
  }
  if (fields.pinned !== undefined) {
    sets.push("pinned = ?");
    values.push(fields.pinned ? 1 : 0);
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: "Нечего обновлять" }, { status: 400 });
  }

  const pool = getPool();
  const [result]: any = await pool.query(`UPDATE news SET ${sets.join(", ")} WHERE id = ?`, [...values, newsId]);

  if (result.affectedRows === 0) {
    return NextResponse.json({ error: "Новость не найдена" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Доступ только для администраторов" }, { status: 403 });
  }

  const { id } = await params;
  const newsId = Number(id);
  if (!Number.isInteger(newsId)) {
    return NextResponse.json({ error: "Некорректная новость" }, { status: 400 });
  }

  const pool = getPool();
  const [result]: any = await pool.query("DELETE FROM news WHERE id = ?", [newsId]);

  if (result.affectedRows === 0) {
    return NextResponse.json({ error: "Новость не найдена" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
