/** GET /api/cases/history — paginated history of the user's opened+claimed cases, with optional
 *  search (by case or won-item name) and rarity filter. */
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { isRarity } from "@/lib/rarity";

const PAGE_SIZE = 10;

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = (searchParams.get("search") ?? "").trim();
  const rarityParam = searchParams.get("rarity") ?? "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const where: string[] = ["user_id = ?", "status = 'opened'", "claimed = 1"];
  const values: unknown[] = [userId];

  if (search) {
    where.push("(case_name LIKE ? OR won_item_name LIKE ?)");
    values.push(`%${search}%`, `%${search}%`);
  }
  if (isRarity(rarityParam)) {
    where.push("won_item_rarity = ?");
    values.push(rarityParam);
  }

  const whereSql = where.join(" AND ");
  const pool = getPool();

  const [countRows]: any = await pool.query(
    `SELECT COUNT(*) AS total FROM user_cases WHERE ${whereSql}`,
    values
  );
  const total = Number(countRows[0]?.total ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const offset = (safePage - 1) * PAGE_SIZE;

  const [rows]: any = await pool.query(
    `SELECT id, case_id, case_name, game_mode, won_item_name, won_item_rarity,
            won_item_type, won_item_image, compensated, compensation_amount, opened_at
     FROM user_cases
     WHERE ${whereSql}
     ORDER BY opened_at DESC
     LIMIT ? OFFSET ?`,
    [...values, PAGE_SIZE, offset]
  );

  return NextResponse.json(
    { items: rows, total, page: safePage, pageCount, pageSize: PAGE_SIZE },
    { headers: { "Cache-Control": "no-store" } }
  );
}
