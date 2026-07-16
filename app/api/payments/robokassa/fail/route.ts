/** Robokassa FailURL — browser return when the user cancels/does not pay. */
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

async function readParams(req: NextRequest): Promise<URLSearchParams> {
  if (req.method === "POST") {
    const form = await req.formData();
    const params = new URLSearchParams();
    for (const [key, value] of form.entries()) params.set(key, String(value));
    return params;
  }
  return req.nextUrl.searchParams;
}

async function handle(req: NextRequest) {
  const params = await readParams(req);
  const invId = Number(params.get("InvId") ?? params.get("invid") ?? "");
  const paymentToken =
    params.get("Shp_paymentToken") ?? params.get("shp_paymenttoken") ?? "";
  const validInvId = Number.isInteger(invId) && invId > 0;

  // FailURL is not signed by Robokassa. The random Shp token binds the browser
  // return to this specific order before stock/promo reservations are released.
  if (validInvId && paymentToken) {
    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [orderRows]: any = await conn.query(
        `SELECT promo_code, status
         FROM orders
         WHERE id = ? AND payment_token = ?
         FOR UPDATE`,
        [invId, paymentToken]
      );
      if (orderRows[0]?.status === "pending") {
        const [items]: any = await conn.query(
          `SELECT catalog_item_id, qty FROM order_items WHERE order_id = ?`,
          [invId]
        );
        for (const item of items) {
          if (item.catalog_item_id !== null) {
            await conn.query(
              `UPDATE catalog_items SET stock = stock + ? WHERE id = ? AND stock IS NOT NULL`,
              [item.qty, item.catalog_item_id]
            );
          }
        }
        if (orderRows[0].promo_code) {
          await conn.query(
            `UPDATE promocodes SET used_count = GREATEST(used_count - 1, 0) WHERE code = ?`,
            [orderRows[0].promo_code]
          );
        }
        await conn.query(
          `UPDATE orders SET status = 'cancelled' WHERE id = ?`,
          [invId]
        );
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  const url = new URL("/", req.url);
  url.searchParams.set("payment", "fail");
  if (validInvId) url.searchParams.set("order", String(invId));
  url.hash = "cart";
  return NextResponse.redirect(url, 303);
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
