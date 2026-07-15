/** PATCH/DELETE /api/admin/promocodes/:id — edit (e.g. toggle active) or remove a promo code. Admins only. */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const schema = z.object({
  discountType: z.enum(["percent", "fixed"]).optional(),
  discountValue: z.number().int().positive().optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  minSubtotal: z.number().int().nonnegative().optional(),
  expiresAt: z.string().trim().min(1).nullable().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Доступ только для администраторов" }, { status: 403 });
  }

  const { id } = await params;
  const codeId = Number(id);
  if (!Number.isInteger(codeId)) {
    return NextResponse.json({ error: "Некорректный промокод" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const fields = parsed.data;
  const sets: string[] = [];
  const values: unknown[] = [];

  if (fields.discountType !== undefined) {
    sets.push("discount_type = ?");
    values.push(fields.discountType);
  }
  if (fields.discountValue !== undefined) {
    sets.push("discount_value = ?");
    values.push(fields.discountValue);
  }
  if (fields.maxUses !== undefined) {
    sets.push("max_uses = ?");
    values.push(fields.maxUses);
  }
  if (fields.minSubtotal !== undefined) {
    sets.push("min_subtotal = ?");
    values.push(fields.minSubtotal);
  }
  if (fields.expiresAt !== undefined) {
    sets.push("expires_at = ?");
    values.push(fields.expiresAt ? new Date(fields.expiresAt) : null);
  }
  if (fields.active !== undefined) {
    sets.push("active = ?");
    values.push(fields.active ? 1 : 0);
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: "Нечего обновлять" }, { status: 400 });
  }

  const pool = getPool();
  const [result]: any = await pool.query(
    `UPDATE promocodes SET ${sets.join(", ")} WHERE id = ?`,
    [...values, codeId]
  );

  if (result.affectedRows === 0) {
    return NextResponse.json({ error: "Промокод не найден" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Доступ только для администраторов" }, { status: 403 });
  }

  const { id } = await params;
  const codeId = Number(id);
  if (!Number.isInteger(codeId)) {
    return NextResponse.json({ error: "Некорректный промокод" }, { status: 400 });
  }

  const pool = getPool();
  const [result]: any = await pool.query("DELETE FROM promocodes WHERE id = ?", [codeId]);

  if (result.affectedRows === 0) {
    return NextResponse.json({ error: "Промокод не найден" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
