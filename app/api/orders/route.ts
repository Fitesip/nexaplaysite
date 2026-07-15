/** POST /api/orders — creates an order from the cart (checkout); GET lists the user's past orders. */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { getCurrentUserId, requirePurchaseAccess } from "@/lib/auth";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const pool = getPool();
  const [orders]: any = await pool.query(
    `SELECT id, subtotal, discount_amount, total, promo_code, status, created_at
     FROM orders WHERE user_id = ? ORDER BY created_at DESC`,
    [userId]
  );

  if (orders.length === 0) {
    return NextResponse.json({ orders: [] });
  }

  const ids = orders.map((o: any) => o.id);
  const [items]: any = await pool.query(
    `SELECT order_id, name, category, game_mode, price, qty FROM order_items WHERE order_id IN (${ids
      .map(() => "?")
      .join(",")})`,
    ids
  );

  const itemsByOrder = new Map<number, any[]>();
  for (const item of items) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push({ name: item.name, category: item.category, game_mode: item.game_mode, price: item.price, qty: item.qty });
    itemsByOrder.set(item.order_id, list);
  }

  const result = orders.map((o: any) => ({ ...o, items: itemsByOrder.get(o.id) ?? [] }));

  return NextResponse.json({ orders: result }, { headers: { "Cache-Control": "no-store" } });
}

const schema = z.object({
  items: z
    .array(
      z.object({
        id: z.union([z.string(), z.number()]),
        qty: z.number().int().positive(),
      })
    )
    .min(1, "Корзина пуста"),
  promoCode: z.string().trim().min(1).optional(),
});

export async function POST(req: NextRequest) {
  const gate = await requirePurchaseAccess();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const userId = gate.userId;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { items, promoCode } = parsed.data;

  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const ids = items.map((i) => Number(i.id));
    const [catalogRows]: any = await conn.query(
      `SELECT id, name, category, game_mode, price_rub AS price, stock, hidden, one_time_purchase, is_case
       FROM catalog_items WHERE id IN (${ids.map(() => "?").join(",")}) FOR UPDATE`,
      ids
    );
    const catalogById = new Map<number, any>(catalogRows.map((r: any) => [r.id, r]));

    // Which of the requested items are one-time-purchase — check those against this
    // user's completed order history so the same account can't buy them twice.
    const oneTimeIds = catalogRows.filter((r: any) => r.one_time_purchase).map((r: any) => r.id);
    let alreadyOwnedIds = new Set<number>();
    if (oneTimeIds.length > 0) {
      const [ownedRows]: any = await conn.query(
        `SELECT DISTINCT oi.catalog_item_id AS id
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE o.user_id = ? AND o.status = 'completed' AND oi.catalog_item_id IN (${oneTimeIds
           .map(() => "?")
           .join(",")})`,
        [userId, ...oneTimeIds]
      );
      alreadyOwnedIds = new Set(ownedRows.map((r: any) => r.id));
    }

    const orderItems: {
      catalog_item_id: number;
      name: string;
      category: string;
      game_mode: string;
      price: number;
      qty: number;
      is_case: boolean;
    }[] = [];
    let subtotal = 0;

    for (const item of items) {
      const row = catalogById.get(Number(item.id));
      if (!row || row.hidden) {
        await conn.rollback();
        return NextResponse.json({ error: "Один из товаров больше не доступен в каталоге" }, { status: 409 });
      }
      if (row.one_time_purchase && alreadyOwnedIds.has(row.id)) {
        await conn.rollback();
        return NextResponse.json(
          { error: `Товар «${row.name}» можно купить только один раз, и он уже куплен` },
          { status: 409 }
        );
      }
      if (row.one_time_purchase && item.qty > 1) {
        await conn.rollback();
        return NextResponse.json(
          { error: `Товар «${row.name}» можно купить только в количестве 1 шт.` },
          { status: 409 }
        );
      }
      if (row.stock !== null && row.stock < item.qty) {
        await conn.rollback();
        return NextResponse.json(
          { error: `Недостаточно товара «${row.name}» на складе (осталось ${row.stock})` },
          { status: 409 }
        );
      }
      orderItems.push({
        catalog_item_id: row.id,
        name: row.name,
        category: row.category,
        game_mode: row.game_mode,
        price: row.price,
        qty: item.qty,
        is_case: Boolean(row.is_case),
      });
      subtotal += row.price * item.qty;
    }

    let discountAmount = 0;
    let appliedCode: string | null = null;

    if (promoCode) {
      const code = promoCode.trim().toUpperCase();
      const [promoRows]: any = await conn.query(
        `SELECT id, code, discount_type, discount_value, max_uses, used_count, min_subtotal, expires_at, active
         FROM promocodes WHERE code = ? LIMIT 1 FOR UPDATE`,
        [code]
      );
      const promo = promoRows[0];
      if (
        promo &&
        promo.active &&
        (!promo.expires_at || new Date(promo.expires_at).getTime() >= Date.now()) &&
        (promo.max_uses === null || promo.used_count < promo.max_uses) &&
        subtotal >= promo.min_subtotal
      ) {
        discountAmount =
          promo.discount_type === "percent"
            ? Math.round((subtotal * promo.discount_value) / 100)
            : Math.min(promo.discount_value, subtotal);
        appliedCode = promo.code;
        await conn.query("UPDATE promocodes SET used_count = used_count + 1 WHERE id = ?", [promo.id]);
      } else {
        await conn.rollback();
        return NextResponse.json({ error: "Промокод больше не действителен, обновите корзину" }, { status: 409 });
      }
    }

    const total = Math.max(0, subtotal - discountAmount);

    const [orderResult]: any = await conn.query(
      `INSERT INTO orders (user_id, subtotal, discount_amount, total, promo_code)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, subtotal, discountAmount, total, appliedCode]
    );
    const orderId = orderResult.insertId;

    for (const item of orderItems) {
      await conn.query(
        `INSERT INTO order_items (order_id, catalog_item_id, game_mode, name, category, price, qty)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [orderId, item.catalog_item_id, item.game_mode, item.name, item.category, item.price, item.qty]
      );
      // decrement stock only for items that track it
      await conn.query(
        `UPDATE catalog_items SET stock = stock - ? WHERE id = ? AND stock IS NOT NULL`,
        [item.qty, item.catalog_item_id]
      );
      // Кейсы падают в инвентарь пользователя: одна строка на каждый купленный экземпляр,
      // чтобы каждый кейс открывался отдельно (со своей анимацией и выпавшим предметом).
      if (item.is_case) {
        for (let n = 0; n < item.qty; n++) {
          await conn.query(
            `INSERT INTO user_cases (user_id, case_id, case_name, game_mode)
             VALUES (?, ?, ?, ?)`,
            [userId, item.catalog_item_id, item.name, item.game_mode]
          );
        }
      }
    }

    await conn.commit();

    return NextResponse.json({ ok: true, orderId, subtotal, discountAmount, total }, { status: 201 });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
