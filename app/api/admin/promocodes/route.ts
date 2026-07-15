/** GET/POST /api/admin/promocodes — list every promo code, or create a new one. Admins only. */
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
  const [rows]: any = await pool.query(
    `SELECT id, code, discount_type, discount_value, max_uses, used_count, min_subtotal, expires_at, active, created_at
     FROM promocodes
     ORDER BY created_at DESC`
  );

  const codes = rows.map((r: any) => ({ ...r, active: Boolean(r.active) }));

  return NextResponse.json({ codes }, { headers: { "Cache-Control": "no-store" } });
}

const schema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, "Укажите промокод")
      .max(40, "Слишком длинный промокод")
      .regex(/^[A-Za-z0-9_-]+$/, "Только латиница, цифры, «-» и «_»"),
    discountType: z.enum(["percent", "fixed"], {
      errorMap: () => ({ message: "Укажите тип скидки" }),
    }),
    discountValue: z.number().int("Значение должно быть целым").positive("Значение должно быть больше нуля"),
    // null / undefined = неограниченное число использований
    maxUses: z.number().int().positive().nullable().optional(),
    minSubtotal: z.number().int().nonnegative().optional().default(0),
    // null / undefined = без срока действия; строка из <input type="date"> тоже принимается
    expiresAt: z.string().trim().min(1).nullable().optional(),
    active: z.boolean().optional().default(true),
  })
  .refine((d) => d.discountType !== "percent" || d.discountValue <= 100, {
    message: "Процентная скидка не может быть больше 100%",
    path: ["discountValue"],
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
  const { code, discountType, discountValue, maxUses, minSubtotal, expiresAt, active } = parsed.data;

  const pool = getPool();
  try {
    const [result]: any = await pool.query(
      `INSERT INTO promocodes (code, discount_type, discount_value, max_uses, min_subtotal, expires_at, active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        code.toUpperCase(),
        discountType,
        discountValue,
        maxUses ?? null,
        minSubtotal,
        expiresAt ? new Date(expiresAt) : null,
        active ? 1 : 0,
      ]
    );
    return NextResponse.json({ id: result.insertId }, { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "Промокод с таким названием уже существует" }, { status: 409 });
    }
    throw err;
  }
}
