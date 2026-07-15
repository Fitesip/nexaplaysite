/** GET /api/cases/inventory — the logged-in user's owned cases: unopened ones (grouped by case)
 *  ready to open, and a history of already-opened cases with what dropped. */
import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const pool = getPool();

  // Unopened cases grouped by their source case, so the inventory shows "Кейс × N"
  // with a single "Открыть" button instead of one row per identical case.
  const [groups]: any = await pool.query(
    `SELECT case_id, case_name, game_mode,
            COUNT(*) AS count,
            MIN(id) AS next_id
     FROM user_cases
     WHERE user_id = ? AND status = 'unopened'
     GROUP BY case_id, case_name, game_mode
     ORDER BY case_name ASC`,
    [userId]
  );

  const [history]: any = await pool.query(
    `SELECT id, case_id, case_name, game_mode, won_item_name, won_item_rarity, opened_at
     FROM user_cases
     WHERE user_id = ? AND status = 'opened'
     ORDER BY opened_at DESC
     LIMIT 50`,
    [userId]
  );

  const unopened = groups.map((g: any) => ({
    caseId: g.case_id,
    caseName: g.case_name,
    gameMode: g.game_mode,
    count: Number(g.count),
    nextId: g.next_id, // the specific user_cases instance the client should open next
  }));

  return NextResponse.json(
    { unopened, history },
    { headers: { "Cache-Control": "no-store" } }
  );
}
