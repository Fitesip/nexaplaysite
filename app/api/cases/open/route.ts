/** POST /api/cases/open — opens one owned (unopened) case instance for the current user.
 *  Performs a server-side weighted roll (rarity/chance are never trusted from the client),
 *  records the result, and returns both the won item and the case's full loot pool so the
 *  client can render the spinning-reel animation and land on the winner. */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

const schema = z.object({
  userCaseId: z.union([z.string(), z.number()]),
});

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }
  const userCaseId = Number(parsed.data.userCaseId);
  if (!Number.isInteger(userCaseId)) {
    return NextResponse.json({ error: "Некорректный кейс" }, { status: 400 });
  }

  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Lock the specific case instance so a double-click / concurrent request can't open it twice.
    const [caseRows]: any = await conn.query(
      `SELECT id, case_id, case_name, status FROM user_cases
       WHERE id = ? AND user_id = ? FOR UPDATE`,
      [userCaseId, userId]
    );
    const owned = caseRows[0];
    if (!owned) {
      await conn.rollback();
      return NextResponse.json({ error: "Кейс не найден в инвентаре" }, { status: 404 });
    }
    if (owned.status === "opened") {
      await conn.rollback();
      return NextResponse.json({ error: "Этот кейс уже открыт" }, { status: 409 });
    }
    if (!owned.case_id) {
      await conn.rollback();
      return NextResponse.json({ error: "Этот кейс больше недоступен" }, { status: 409 });
    }

    const [pool_]: any = await conn.query(
      `SELECT id, name, rarity, weight FROM case_items WHERE case_id = ? ORDER BY sort_order ASC, id ASC`,
      [owned.case_id]
    );
    const lootItems = pool_.filter((r: any) => r.weight > 0);
    if (lootItems.length === 0) {
      await conn.rollback();
      return NextResponse.json({ error: "Кейс пуст — обратитесь к администрации" }, { status: 409 });
    }

    // Weighted random roll: pick a point in [0, totalWeight) and walk the cumulative weights.
    const totalWeight = lootItems.reduce((sum: number, r: any) => sum + r.weight, 0);
    let roll = Math.random() * totalWeight;
    let won = lootItems[lootItems.length - 1];
    for (const item of lootItems) {
      roll -= item.weight;
      if (roll < 0) {
        won = item;
        break;
      }
    }

    await conn.query(
      `UPDATE user_cases
       SET status = 'opened', won_case_item_id = ?, won_item_name = ?, won_item_rarity = ?, opened_at = NOW()
       WHERE id = ?`,
      [won.id, won.name, won.rarity, userCaseId]
    );

    await conn.commit();

    // Return the full pool (with chances) so the client can build the reel, plus the winner.
    const items = pool_.map((r: any) => ({
      id: r.id,
      name: r.name,
      rarity: r.rarity,
      weight: r.weight,
      chance: totalWeight > 0 ? r.weight / totalWeight : 0,
    }));

    return NextResponse.json({
      ok: true,
      won: { id: won.id, name: won.name, rarity: won.rarity },
      items,
      caseName: owned.case_name,
    });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
