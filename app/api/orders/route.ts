/**
 * POST /api/orders — validates the cart and creates a *pending* order, then
 * returns a YooKassa payment link (confirmation_url). Nothing is granted
 * here: stock, case drops, promo usage, referral rewards and RCON item
 * grants only happen once the payment is confirmed by the YooKassa webhook
 * (see `lib/orderFulfillment.ts`). GET lists the user's paid/cancelled orders.
 */
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { getCurrentUserId, requirePurchaseAccess } from "@/lib/auth";
import { fulfillOrder } from "@/lib/orderFulfillment";
import { sendToUser } from "@/lib/ws-hub";
import { createPayment, getYookassaConfig, isYookassaConfigured } from "@/lib/yookassa";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const pool = getPool();
  const [orders]: any = await pool.query(
    `SELECT id, subtotal, discount_amount, total, promo_code, status, created_at
     FROM orders WHERE user_id = ? AND status <> 'pending' ORDER BY created_at DESC`,
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
        id: z.union([z.string().regex(/^\d+$/), z.number().int().positive()]),
        qty: z.number().int().positive(),
      })
    )
    .min(1, "Корзина пуста")
    .refine(
      (orderItems) =>
        new Set(orderItems.map((item) => Number(item.id))).size === orderItems.length,
      "Корзина содержит повторяющиеся товары"
    ),
  promoCode: z.string().trim().min(1).optional(),
  requestId: z.string().uuid(),
});

type DatabaseError = Error & { code?: string };

function isDuplicateEntry(error: unknown): boolean {
  return error instanceof Error && (error as DatabaseError).code === "ER_DUP_ENTRY";
}

/**
 * Creates a YooKassa payment for an already-created pending order and
 * returns the checkout response. Each call is a fresh payment attempt (its
 * own Idempotence-Key), so a retried checkout never reuses a stale/expired
 * confirmation_url from an earlier attempt.
 */
async function pendingResponse(
  order: {
    id: number;
    subtotal: number;
    discount_amount: number;
    total: number;
    payment_token: string;
  },
  origin: string,
  email?: string
) {
  const total = Number(order.total);
  if (total <= 0) {
    // Free order (100% promo) — nothing to charge; it is fulfilled directly.
    return { free: true as const, order };
  }
  const cfg = getYookassaConfig();
  const returnUrl = `${origin}/api/payments/yookassa/return?orderId=${order.id}`;
  const payment = await createPayment(cfg, {
    orderId: order.id,
    outSum: total,
    description: `Оплата заказа №${order.id} на NexaPlay`,
    returnUrl,
    email,
    paymentToken: order.payment_token,
    idempotenceKey: randomUUID(),
  });
  const paymentUrl = payment.confirmation?.confirmation_url;
  if (!paymentUrl) {
    throw new Error(`YooKassa payment ${payment.id} has no confirmation_url`);
  }
  return { free: false as const, order, paymentUrl };
}

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
  const { items, promoCode, requestId } = parsed.data;

  if (!isYookassaConfigured()) {
    return NextResponse.json(
      { error: "Приём платежей временно недоступен: платёжный шлюз не настроен" },
      { status: 503 }
    );
  }

  // Prefer an explicit public URL over the request's Host header: behind a
  // reverse proxy that doesn't forward the original Host (a common default),
  // req.nextUrl.origin resolves to the app's internal bind address (e.g.
  // localhost:8000) instead of the public domain, and YooKassa's "Вернуться
  // в магазин" button would send buyers there instead of nexaplay.pro.
  const origin = process.env.SITE_URL ?? req.nextUrl.origin;
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Idempotency: the same checkout request returns the same pending order.
    const [existingOrders]: any = await conn.query(
      `SELECT id, subtotal, discount_amount, total, status, payment_token
       FROM orders
       WHERE user_id = ? AND checkout_request_id = ?
       LIMIT 1`,
      [userId, requestId]
    );
    if (existingOrders[0]) {
      await conn.commit();
      const existing = existingOrders[0];
      if (existing.status === "pending") {
        const resp = await pendingResponse(existing, origin);
        if (resp.free) {
          const fulfilled = await fulfillFree(existing.id);
          if (!fulfilled) {
            return NextResponse.json(
              { error: "Не удалось выдать бесплатный заказ через RCON. Попробуйте ещё раз." },
              { status: 502 }
            );
          }
          return NextResponse.json({ ok: true, orderId: existing.id, total: 0, paid: true });
        }
        return NextResponse.json({ ok: true, orderId: existing.id, total: existing.total, paymentUrl: resp.paymentUrl });
      }
      return NextResponse.json({ ok: true, orderId: existing.id, total: existing.total, paid: true });
    }

    const [buyerRows]: any = await conn.query(
      "SELECT minecraft_username FROM users WHERE id = ?",
      [userId]
    );
    const minecraftUsername = buyerRows[0]?.minecraft_username as string | null;
    if (!minecraftUsername) {
      await conn.rollback();
      return NextResponse.json(
        { error: "Привяжите Minecraft-аккаунт перед покупкой" },
        { status: 403 }
      );
    }

    const ids = items.map((i) => Number(i.id));
    const [catalogRows]: any = await conn.query(
      `SELECT id, name, category, game_mode, price_rub AS price, stock, hidden, one_time_purchase,
              is_case, grant_command
       FROM catalog_items WHERE id IN (${ids.map(() => "?").join(",")}) FOR UPDATE`,
      ids
    );
    const catalogById = new Map<number, any>(catalogRows.map((r: any) => [r.id, r]));

    const oneTimeIds = catalogRows.filter((r: any) => r.one_time_purchase).map((r: any) => r.id);
    let alreadyOwnedIds = new Set<number>();
    if (oneTimeIds.length > 0) {
      const [ownedRows]: any = await conn.query(
        `SELECT DISTINCT oi.catalog_item_id AS id
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE o.user_id = ? AND o.status IN ('pending', 'completed') AND oi.catalog_item_id IN (${oneTimeIds
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
      grant_command: string | null;
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
        grant_command: row.grant_command,
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

    const paymentToken = randomUUID();
    const [orderResult]: any = await conn.query(
      `INSERT INTO orders
         (user_id, subtotal, discount_amount, total, promo_code, status, checkout_request_id, payment_token)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [userId, subtotal, discountAmount, total, appliedCode, requestId, paymentToken]
    );
    const orderId = orderResult.insertId;

    for (const item of orderItems) {
      await conn.query(
        `INSERT INTO order_items
           (order_id, catalog_item_id, game_mode, name, category, price, qty, is_case_snapshot, grant_command_snapshot)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          item.catalog_item_id,
          item.game_mode,
          item.name,
          item.category,
          item.price,
          item.qty,
          item.is_case,
          item.grant_command,
        ]
      );
      if (item.catalog_item_id) {
        await conn.query(
          `UPDATE catalog_items SET stock = stock - ? WHERE id = ? AND stock IS NOT NULL`,
          [item.qty, item.catalog_item_id]
        );
      }
    }

    await conn.commit();

    if (total <= 0) {
      // Free order — fulfill immediately, no gateway round-trip.
      const fulfilled = await fulfillFree(orderId);
      if (!fulfilled) {
        return NextResponse.json(
          { error: "Не удалось выдать бесплатный заказ через RCON. Попробуйте ещё раз." },
          { status: 502 }
        );
      }
      return NextResponse.json({ ok: true, orderId, subtotal, discountAmount, total: 0, paid: true }, { status: 201 });
    }

    const resp = await pendingResponse(
      {
        id: orderId,
        subtotal,
        discount_amount: discountAmount,
        total,
        payment_token: paymentToken,
      },
      origin
    );
    return NextResponse.json(
      { ok: true, orderId, subtotal, discountAmount, total, paymentUrl: resp.free ? undefined : resp.paymentUrl },
      { status: 201 }
    );
  } catch (err) {
    await conn.rollback();
    if (isDuplicateEntry(err)) {
      const [existingOrders]: any = await pool.query(
        `SELECT id, subtotal, discount_amount, total, status, payment_token
         FROM orders
         WHERE user_id = ? AND checkout_request_id = ?
         LIMIT 1`,
        [userId, requestId]
      );
      if (existingOrders[0]) {
        const existing = existingOrders[0];
        if (existing.status === "pending" && Number(existing.total) > 0) {
          const resp = await pendingResponse(existing, origin);
          return NextResponse.json({
            ok: true,
            orderId: existing.id,
            total: existing.total,
            paymentUrl: resp.free ? undefined : resp.paymentUrl,
          });
        }
        return NextResponse.json({ ok: true, orderId: existing.id, total: existing.total, paid: true });
      }
    }
    throw err;
  } finally {
    conn.release();
  }
}

/** Fulfills a zero-total order right away (100% promo, no payment needed). */
async function fulfillFree(orderId: number): Promise<boolean> {
  const outcome = await fulfillOrder(orderId);
  if (outcome.status === "fulfilled" && outcome.referrerBalanceUpdate) {
    sendToUser(outcome.referrerBalanceUpdate.userId, {
      type: "balance_update",
      data: { balanceKopecks: outcome.referrerBalanceUpdate.balanceKopecks },
    });
  }
  return outcome.status === "fulfilled" || outcome.status === "already";
}
