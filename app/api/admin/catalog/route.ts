/** GET/POST /api/admin/catalog — list every shop item (incl. hidden), or create a new one. Admins only. */
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
    `SELECT id, name, category, game_mode, price_rub AS price, stock, hidden, one_time_purchase, description, created_at
     FROM catalog_items
     ORDER BY created_at DESC`
  );

  // mysql2 returns TINYINT(1) columns as 0/1 numbers, not booleans — normalize them
  // here so the admin UI (and its zod-validated PATCH/POST payloads) always deal
  // with real booleans instead of accidentally round-tripping a 0/1 number.
  const items = rows.map((r: any) => ({
    ...r,
    hidden: Boolean(r.hidden),
    one_time_purchase: Boolean(r.one_time_purchase),
  }));

  return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
}

const schema = z.object({
  name: z.string().trim().min(1, "Укажите название").max(120),
  category: z.string().trim().min(1, "Укажите категорию").max(50),
  gameMode: z.enum(["terryx", "bloodborne", "heaven", "games"], {
    errorMap: () => ({ message: "Укажите режим игры" }),
  }),
  price: z.number().int("Цена должна быть целым числом").nonnegative("Цена не может быть отрицательной"),
  description: z.string().trim().max(2000).optional().default(""),
  // null / undefined = неограниченное количество
  stock: z.number().int().nonnegative().nullable().optional(),
  hidden: z.boolean().optional().default(false),
  // true = каждый пользователь может купить этот товар только один раз (независимо от stock)
  oneTimePurchase: z.boolean().optional().default(false),
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
  const { name, category, gameMode, price, description, stock, hidden, oneTimePurchase } = parsed.data;

  const pool = getPool();
  const [result]: any = await pool.query(
    `INSERT INTO catalog_items (name, category, game_mode, price_rub, stock, hidden, one_time_purchase, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, category, gameMode, price, stock ?? null, hidden ? 1 : 0, oneTimePurchase ? 1 : 0, description]
  );

  return NextResponse.json({ id: result.insertId }, { status: 201 });
}
