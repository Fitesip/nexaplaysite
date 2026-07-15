/** PATCH/DELETE /api/admin/catalog/:id — edit or remove a single shop item. Admins only. */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { normalizeGrantCommand, validateGrantCommand } from "@/lib/itemGrant";

const schema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  category: z.string().trim().min(1).max(50).optional(),
  gameMode: z.enum(["terryx", "bloodborne", "heaven", "games"]).optional(),
  price: z.number().int().nonnegative().optional(),
  description: z.string().trim().max(2000).optional(),
  stock: z.number().int().nonnegative().nullable().optional(),
  hidden: z.boolean().optional(),
  oneTimePurchase: z.boolean().optional(),
  isCase: z.boolean().optional(),
  grantCommand: z.string().trim().max(500).nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Доступ только для администраторов" }, { status: 403 });
  }

  const { id } = await params;
  const itemId = Number(id);
  if (!Number.isInteger(itemId)) {
    return NextResponse.json({ error: "Некорректный товар" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const fields = parsed.data;
  const pool = getPool();
  const [itemRows]: any = await pool.query(
    "SELECT is_case FROM catalog_items WHERE id = ? LIMIT 1",
    [itemId]
  );
  if (!itemRows[0]) {
    return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
  }
  const finalIsCase = fields.isCase ?? Boolean(itemRows[0].is_case);
  const sets: string[] = [];
  const values: unknown[] = [];

  if (fields.name !== undefined) {
    sets.push("name = ?");
    values.push(fields.name);
  }
  if (fields.category !== undefined) {
    sets.push("category = ?");
    values.push(fields.category);
  }
  if (fields.gameMode !== undefined) {
    sets.push("game_mode = ?");
    values.push(fields.gameMode);
  }
  if (fields.price !== undefined) {
    sets.push("price_rub = ?");
    values.push(fields.price);
  }
  if (fields.description !== undefined) {
    sets.push("description = ?");
    values.push(fields.description);
  }
  if (fields.stock !== undefined) {
    sets.push("stock = ?");
    values.push(fields.stock);
  }
  if (fields.hidden !== undefined) {
    sets.push("hidden = ?");
    values.push(fields.hidden ? 1 : 0);
  }
  if (fields.oneTimePurchase !== undefined) {
    sets.push("one_time_purchase = ?");
    values.push(fields.oneTimePurchase ? 1 : 0);
  }
  if (fields.isCase !== undefined) {
    sets.push("is_case = ?");
    values.push(fields.isCase ? 1 : 0);
  }
  if (fields.grantCommand !== undefined || fields.isCase === true) {
    const grantCommand = finalIsCase ? null : normalizeGrantCommand(fields.grantCommand);
    const grantCommandError = validateGrantCommand(grantCommand);
    if (grantCommandError) {
      return NextResponse.json({ error: grantCommandError }, { status: 400 });
    }
    sets.push("grant_command = ?");
    values.push(grantCommand);
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: "Нечего обновлять" }, { status: 400 });
  }

  const [result]: any = await pool.query(
    `UPDATE catalog_items SET ${sets.join(", ")} WHERE id = ?`,
    [...values, itemId]
  );

  if (result.affectedRows === 0) {
    return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Доступ только для администраторов" }, { status: 403 });
  }

  const { id } = await params;
  const itemId = Number(id);
  if (!Number.isInteger(itemId)) {
    return NextResponse.json({ error: "Некорректный товар" }, { status: 400 });
  }

  const pool = getPool();
  const [result]: any = await pool.query("DELETE FROM catalog_items WHERE id = ?", [itemId]);

  if (result.affectedRows === 0) {
    return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
