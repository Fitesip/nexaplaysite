/** POST /api/cases/open-bulk — opens several owned (unopened) instances of the same case at once.
 *  Rolls each one server-side (same weighted logic as single open) and returns every drop, so the
 *  client can show a "you got …" summary without the reel animation. Unique rewards already owned —
 *  including ones won earlier in this same batch — are excluded from subsequent rolls. */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { eligibleItems, weightedPick } from "@/lib/caseRoll";

const MAX_BULK = 8;

const schema = z.object({
  caseId: z.union([z.string(), z.number()]),
  count: z.number().int().positive().max(MAX_BULK),
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
  const caseId = Number(parsed.data.caseId);
  const count = parsed.data.count;
  if (!Number.isInteger(caseId)) {
    return NextResponse.json({ error: "Некорректный кейс" }, { status: 400 });
  }

  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Lock up to `count` unopened instances of this case for this user.
    const [caseRows]: any = await conn.query(
      `SELECT id, case_id, case_name FROM user_cases
       WHERE user_id = ? AND case_id = ? AND status = 'unopened'
       ORDER BY id ASC LIMIT ? FOR UPDATE`,
      [userId, caseId, count]
    );
    if (caseRows.length === 0) {
      await conn.rollback();
      return NextResponse.json({ error: "Нет доступных кейсов для открытия" }, { status: 409 });
    }

    const [pool_]: any = await conn.query(
      `SELECT ci.id, ci.item_price_id, ci.name, ci.rarity, ci.item_type, ci.is_unique,
              ci.image_url, ci.weight, ip.price_currency
       FROM case_items ci
       JOIN item_prices ip ON ip.id = ci.item_price_id
       WHERE ci.case_id = ?
       ORDER BY ci.sort_order ASC, ci.id ASC`,
      [caseId]
    );
    const lootItems: {
      id: number;
      ownership_id: number;
      name: string;
      rarity: string;
      item_type: string;
      image_url: string | null;
      weight: number;
      is_unique: boolean;
      price_currency: number;
    }[] = pool_
      .filter((r: any) => r.weight > 0)
      .map((r: any) => ({
        id: r.id,
        ownership_id: r.item_price_id,
        name: r.name,
        rarity: r.rarity,
        item_type: r.item_type,
        image_url: r.image_url,
        weight: r.weight,
        is_unique: Boolean(r.is_unique),
        price_currency: Number(r.price_currency),
      }));
    if (lootItems.length === 0) {
      await conn.rollback();
      return NextResponse.json({ error: "Кейс пуст — обратитесь к администрации" }, { status: 409 });
    }

    const [ownedRows]: any = await conn.query(
      `SELECT DISTINCT won_item_price_id AS id FROM user_cases
       WHERE user_id = ? AND status = 'opened' AND won_item_price_id IS NOT NULL`,
      [userId]
    );
    const ownedUniqueIds = new Set<number>(ownedRows.map((r: any) => Number(r.id)));

    const results: {
      userCaseId: number;
      id: number;
      name: string;
      rarity: string;
      itemType: string;
      imageUrl: string | null;
      compensated: boolean;
      compensationAmount: number;
    }[] = [];
    let totalCompensation = 0;

    for (const owned of caseRows) {
      const candidates = eligibleItems(lootItems, ownedUniqueIds);
      const won = weightedPick(candidates) ?? candidates[candidates.length - 1];
      const compensated = won.is_unique && ownedUniqueIds.has(won.ownership_id);
      const compensationAmount = compensated ? won.price_currency : 0;
      if (won.is_unique && !compensated) ownedUniqueIds.add(won.ownership_id);
      totalCompensation += compensationAmount;

      await conn.query(
        `UPDATE user_cases
         SET status = 'opened', won_case_item_id = ?, won_item_price_id = ?, won_item_name = ?,
             won_item_rarity = ?, won_item_type = ?, won_item_image = ?, compensation_amount = ?,
             compensated = ?, claimed = ?, claimed_at = CASE WHEN ? = 1 THEN NOW() ELSE NULL END,
             opened_at = NOW()
         WHERE id = ?`,
        [
          won.id,
          won.ownership_id,
          won.name,
          won.rarity,
          won.item_type,
          won.image_url,
          compensationAmount,
          compensated ? 1 : 0,
          compensated ? 1 : 0,
          compensated ? 1 : 0,
          owned.id,
        ]
      );

      results.push({
        userCaseId: owned.id,
        id: won.id,
        name: won.name,
        rarity: won.rarity,
        itemType: won.item_type,
        imageUrl: won.image_url,
        compensated,
        compensationAmount,
      });
    }

    if (totalCompensation > 0) {
      await conn.query(
        `UPDATE users SET game_currency = game_currency + ? WHERE id = ?`,
        [totalCompensation, userId]
      );
    }
    const [balanceRows]: any = await conn.query(
      `SELECT game_currency FROM users WHERE id = ?`,
      [userId]
    );
    await conn.commit();

    // Full droppable pool (weight > 0) so the client can build the reel strips.
    const totalWeight = lootItems.reduce((sum, i) => sum + i.weight, 0);
    const items = lootItems.map((i) => ({
      id: i.id,
      name: i.name,
      rarity: i.rarity,
      itemType: i.item_type,
      imageUrl: i.image_url,
      isUnique: i.is_unique,
      weight: i.weight,
      chance: totalWeight > 0 ? i.weight / totalWeight : 0,
    }));

    return NextResponse.json({
      ok: true,
      caseName: caseRows[0].case_name,
      opened: results.length,
      results,
      items,
      totalCompensation,
      balance: Number(balanceRows[0]?.game_currency ?? 0),
    });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
