/**
 * Order fulfillment — everything that mutates state once an order is actually
 * paid: case drops into the inventory, referral reward and RCON item grants.
 * Stock and promo usage are reserved at checkout and released by
 * `releasePendingOrder` when the payment is cancelled. The actual fulfillment
 * runs from the YooKassa webhook (once the payment status is confirmed
 * server-side via the API), so nothing is granted before the money arrives.
 *
 * The whole fulfillment is one transaction and idempotent: only `pending` (or
 * a cancelled order later confirmed as paid) can be fulfilled. If an RCON
 * grant fails the transaction is rolled back, so the callback can be retried.
 */
import type { PoolConnection } from "mysql2/promise";
import { getPool } from "@/lib/db";
import { referralPurchaseRewardKopecks } from "@/lib/rubleBalance";
import { executeGrantCommand } from "@/lib/itemGrant";

export type FulfillOutcome =
  | { status: "fulfilled"; referrerBalanceUpdate: { userId: number; balanceKopecks: number } | null }
  | { status: "already" }
  | { status: "not_found" }
  | { status: "stock_failed" }
  | { status: "rcon_failed" };

type OrderRow = {
  id: number;
  user_id: number;
  total: number;
  promo_code: string | null;
  status: string;
};

type FulfillItem = {
  catalog_item_id: number | null;
  name: string;
  game_mode: string;
  qty: number;
  is_case_snapshot: number;
  grant_command_snapshot: string | null;
};

export async function fulfillOrder(orderId: number): Promise<FulfillOutcome> {
  const pool = getPool();
  const conn: PoolConnection = await pool.getConnection();
  let referrerBalanceUpdate: { userId: number; balanceKopecks: number } | null = null;
  try {
    await conn.beginTransaction();

    const [orderRows]: any = await conn.query(
      `SELECT id, user_id, total, promo_code, status FROM orders WHERE id = ? FOR UPDATE`,
      [orderId]
    );
    const order = orderRows[0] as OrderRow | undefined;
    if (!order) {
      await conn.rollback();
      return { status: "not_found" };
    }
    if (order.status === "completed") {
      // Idempotent repeat callback — already fulfilled.
      await conn.rollback();
      return { status: "already" };
    }
    if (order.status !== "pending" && order.status !== "cancelled") {
      await conn.rollback();
      return { status: "not_found" };
    }
    const restoreReservations = order.status === "cancelled";

    const [buyerRows]: any = await conn.query(
      "SELECT referred_by, minecraft_username FROM users WHERE id = ?",
      [order.user_id]
    );
    const referredBy = buyerRows[0]?.referred_by ? Number(buyerRows[0].referred_by) : null;
    const referrerId = referredBy && referredBy !== order.user_id ? referredBy : null;
    const minecraftUsername = (buyerRows[0]?.minecraft_username as string | null) ?? null;

    const [itemRows]: any = await conn.query(
      `SELECT oi.catalog_item_id, oi.name, oi.game_mode, oi.qty,
              oi.is_case_snapshot, oi.grant_command_snapshot
       FROM order_items oi
       WHERE oi.order_id = ?`,
      [orderId]
    );
    const items = itemRows as FulfillItem[];

    // A signed payment callback may arrive after the browser has already hit
    // FailURL. In that case FailURL released stock/promo reservations, so a
    // cancelled-but-paid order reserves them again before fulfillment.
    if (restoreReservations) {
      for (const item of items) {
        if (item.catalog_item_id === null) continue;
        const [catalogRows]: any = await conn.query(
          "SELECT stock FROM catalog_items WHERE id = ? FOR UPDATE",
          [item.catalog_item_id]
        );
        if (!catalogRows[0]) {
          await conn.rollback();
          return { status: "stock_failed" };
        }
        const stock = catalogRows[0].stock;
        if (stock !== null && Number(stock) < item.qty) {
          await conn.rollback();
          return { status: "stock_failed" };
        }
        await conn.query(
          "UPDATE catalog_items SET stock = stock - ? WHERE id = ? AND stock IS NOT NULL",
          [item.qty, item.catalog_item_id]
        );
      }
      if (order.promo_code) {
        await conn.query(
          "UPDATE promocodes SET used_count = used_count + 1 WHERE code = ?",
          [order.promo_code]
        );
      }
    }

    for (const item of items) {
      if (item.is_case_snapshot && item.catalog_item_id !== null) {
        for (let n = 0; n < item.qty; n++) {
          await conn.query(
            `INSERT INTO user_cases (user_id, case_id, case_name, game_mode)
             VALUES (?, ?, ?, ?)`,
            [order.user_id, item.catalog_item_id, item.name, item.game_mode]
          );
        }
      }
    }

    if (referrerId) {
      const rewardKopecks = referralPurchaseRewardKopecks(order.total);
      if (rewardKopecks > 0) {
        const [rewardResult]: any = await conn.query(
          `UPDATE users SET balance_kopecks = balance_kopecks + ? WHERE id = ?`,
          [rewardKopecks, referrerId]
        );
        if (rewardResult.affectedRows > 0) {
          const [balanceRows]: any = await conn.query(
            "SELECT balance_kopecks FROM users WHERE id = ?",
            [referrerId]
          );
          referrerBalanceUpdate = {
            userId: referrerId,
            balanceKopecks: Number(balanceRows[0].balance_kopecks),
          };
        }
      }
    }

    // Direct catalog items with a saved RCON command are granted immediately.
    // Case rewards are granted later, when the user claims them.
    for (const item of items) {
      if (item.is_case_snapshot || !item.grant_command_snapshot || !minecraftUsername) continue;
      const granted = await executeGrantCommand(
        item.grant_command_snapshot,
        minecraftUsername,
        item.qty
      );
      if (!granted) {
        await conn.rollback();
        return { status: "rcon_failed" };
      }
    }

    await conn.query(
      `UPDATE orders SET status = 'completed', paid_at = NOW() WHERE id = ?`,
      [orderId]
    );

    await conn.commit();
    return { status: "fulfilled", referrerBalanceUpdate };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Releases stock/promo reservations for an order whose payment was cancelled
 * (buyer backed out, card declined, YooKassa `payment.canceled` webhook).
 * Bound to the order via `paymentToken` so this can't be triggered for the
 * wrong order. If a delayed webhook later confirms the same order as paid,
 * `fulfillOrder` re-reserves stock/promo before granting anything.
 */
export async function releasePendingOrder(orderId: number, paymentToken: string): Promise<void> {
  const pool = getPool();
  const conn: PoolConnection = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [orderRows]: any = await conn.query(
      `SELECT promo_code, status
       FROM orders
       WHERE id = ? AND payment_token = ?
       FOR UPDATE`,
      [orderId, paymentToken]
    );
    if (orderRows[0]?.status === "pending") {
      const [items]: any = await conn.query(
        `SELECT catalog_item_id, qty FROM order_items WHERE order_id = ?`,
        [orderId]
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
      await conn.query(`UPDATE orders SET status = 'cancelled' WHERE id = ?`, [orderId]);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
