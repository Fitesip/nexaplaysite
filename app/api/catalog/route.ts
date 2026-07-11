import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

const VALID_MODES = new Set(["terryx", "bloodborne", "heaven", "games"]);

export async function GET(req: NextRequest) {
  const modeParam = req.nextUrl.searchParams.get("mode");
  const mode = modeParam && VALID_MODES.has(modeParam) ? modeParam : null;

  const pool = getPool();
  const [rows]: any = await pool.query(
    `SELECT id, name, category, game_mode AS gameMode, price_rub AS price, stock,
            one_time_purchase AS oneTimePurchase, description
     FROM catalog_items
     WHERE hidden = 0 ${mode ? "AND game_mode = ?" : ""}
     ORDER BY category ASC, id ASC`,
    mode ? [mode] : []
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
