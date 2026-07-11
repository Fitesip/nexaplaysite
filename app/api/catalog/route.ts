import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

export async function GET() {
  const pool = getPool();
  const [rows]: any = await pool.query(
    `SELECT id, name, category, price_rub AS price, stock, one_time_purchase AS oneTimePurchase, description
     FROM catalog_items
     WHERE hidden = 0
     ORDER BY category ASC, id ASC`
  );

  // For one-time items, tell the logged-in user which ones they've already bought
  // so the storefront can grey them out instead of letting the order fail at checkout.
  const userId = await getCurrentUserId();
  const oneTimeIds = rows.filter((r: any) => r.oneTimePurchase).map((r: any) => r.id);

  let purchasedIds = new Set<number>();
  if (userId && oneTimeIds.length > 0) {
    const [purchasedRows]: any = await pool.query(
      `SELECT DISTINCT oi.catalog_item_id AS id
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.user_id = ? AND o.status = 'completed' AND oi.catalog_item_id IN (${oneTimeIds
         .map(() => "?")
         .join(",")})`,
      [userId, ...oneTimeIds]
    );
    purchasedIds = new Set(purchasedRows.map((r: any) => r.id));
  }

  const items = rows.map((r: any) => ({
    ...r,
    oneTimePurchase: Boolean(r.oneTimePurchase),
    purchased: purchasedIds.has(r.id),
  }));

  return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
}
