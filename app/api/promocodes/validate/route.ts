import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/lib/db";

const schema = z.object({
  code: z.string().min(1, "Введите промокод"),
  subtotal: z.number().nonnegative(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ valid: false, error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { code, subtotal } = parsed.data;

  const pool = getPool();
  const [rows]: any = await pool.query(
    "SELECT id, code, discount_type, discount_value, max_uses, used_count, min_subtotal, expires_at, active FROM promocodes WHERE code = ? LIMIT 1",
    [code.trim().toUpperCase()]
  );
  const promo = rows[0];

  if (!promo || !promo.active) {
    return NextResponse.json({ valid: false, error: "Промокод не найден" }, { status: 404 });
  }
  if (promo.expires_at && new Date(promo.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ valid: false, error: "Срок действия промокода истёк" }, { status: 410 });
  }
  if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
    return NextResponse.json({ valid: false, error: "Промокод больше не действует — лимит исчерпан" }, { status: 410 });
  }
  if (subtotal < promo.min_subtotal) {
    return NextResponse.json(
      { valid: false, error: `Минимальная сумма заказа для этого промокода — ${promo.min_subtotal} ₽` },
      { status: 400 }
    );
  }

  const discountAmount =
    promo.discount_type === "percent"
      ? Math.round((subtotal * promo.discount_value) / 100)
      : Math.min(promo.discount_value, subtotal);

  return NextResponse.json({
    valid: true,
    code: promo.code,
    type: promo.discount_type,
    value: promo.discount_value,
    discountAmount,
  });
}
