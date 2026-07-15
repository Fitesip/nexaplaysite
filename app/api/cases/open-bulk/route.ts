/** POST /api/cases/open-bulk — opens several owned (unopened) instances of the same case at once.
 *  Rolls each one server-side (same weighted logic as single open) and returns every drop, so the
 *  client can show a "you got …" summary without the reel animation. Unique rewards already owned —
 *  including ones won earlier in this same batch — are excluded from subsequent rolls. */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { eligibleItems, weightedPick } from "@/lib/caseRoll";
import { itemOwnershipKey } from "@/lib/itemType";
import { sendToUser } from "@/lib/ws-hub";
import {
  caseRewardCredits,
  sumCaseRewardCredits,
  type CaseRewardCredits,
} from "@/lib/caseReward";

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
      `SELECT id, name, rarity, item_type, is_unique, image_url, price_currency,
              grant_command, ruble_amount_kopecks, weight
       FROM case_items
       WHERE case_id = ?
       ORDER BY sort_order ASC, id ASC`,
      [caseId]
    );
    const lootItems: {
      id: number;
      ownership_id: string;
      name: string;
      rarity: string;
      item_type: string;
      image_url: string | null;
      weight: number;
      is_unique: boolean;
      price_currency: number;
      grant_command: string | null;
      ruble_amount_kopecks: number;
    }[] = pool_
      .filter((r: any) => r.weight > 0)
      .map((r: any) => ({
        id: r.id,
        ownership_id: itemOwnershipKey(r.item_type, r.name),
        name: r.name,
        rarity: r.rarity,
        item_type: r.item_type,
        image_url: r.image_url,
        weight: r.weight,
        is_unique: Boolean(r.is_unique),
        price_currency: Number(r.price_currency),
        grant_command: r.grant_command,
        ruble_amount_kopecks: Number(r.ruble_amount_kopecks),
      }));
    if (lootItems.length === 0) {
      await conn.rollback();
      return NextResponse.json({ error: "Кейс пуст — обратитесь к администрации" }, { status: 409 });
    }

    const [ownedRows]: any = await conn.query(
      `SELECT DISTINCT won_item_name, won_item_type FROM user_cases
       WHERE user_id = ? AND status = 'opened' AND won_item_name IS NOT NULL`,
      [userId]
    );
    const ownedUniqueIds = new Set<string>(
      ownedRows.map((r: any) => itemOwnershipKey(r.won_item_type ?? "item", r.won_item_name))
    );

    const results: {
      userCaseId: number;
      id: number;
      name: string;
      rarity: string;
      itemType: string;
      imageUrl: string | null;
      compensated: boolean;
      compensationAmount: number;
      rubleAmountKopecks: number;
    }[] = [];
    const rewardCredits: CaseRewardCredits[] = [];

    for (const owned of caseRows) {
      const candidates = eligibleItems(lootItems, ownedUniqueIds);
      const won = weightedPick(candidates) ?? candidates[candidates.length - 1];
      const compensated = won.is_unique && ownedUniqueIds.has(won.ownership_id);
      const credits = caseRewardCredits(
        won.item_type,
        compensated,
        won.price_currency,
        won.ruble_amount_kopecks
      );
      const compensationAmount = credits.gameCurrency;
      const rubleAmountKopecks = credits.rubleBalanceKopecks;
      const autoClaimed = credits.autoClaimed;
      if (won.is_unique && !compensated) ownedUniqueIds.add(won.ownership_id);
      rewardCredits.push(credits);

      await conn.query(
        `UPDATE user_cases
         SET status = 'opened', won_case_item_id = ?, won_item_name = ?, won_item_rarity = ?,
             won_item_type = ?, won_item_image = ?, won_grant_command = ?,
             won_ruble_amount_kopecks = ?, compensation_amount = ?,
             compensated = ?, claimed = ?, claimed_at = CASE WHEN ? = 1 THEN NOW() ELSE NULL END,
             opened_at = NOW()
         WHERE id = ?`,
        [
          won.id,
          won.name,
          won.rarity,
          won.item_type,
          won.image_url,
          won.grant_command,
          rubleAmountKopecks,
          compensationAmount,
          compensated ? 1 : 0,
          autoClaimed ? 1 : 0,
          autoClaimed ? 1 : 0,
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
        rubleAmountKopecks,
      });
    }

    const totals = sumCaseRewardCredits(rewardCredits);
    const totalCompensation = totals.gameCurrency;
    const totalRubleAmountKopecks = totals.rubleBalanceKopecks;
    if (totalCompensation > 0 || totalRubleAmountKopecks > 0) {
      await conn.query(
        `UPDATE users
         SET game_currency = game_currency + ?, balance_kopecks = balance_kopecks + ?
         WHERE id = ?`,
        [totalCompensation, totalRubleAmountKopecks, userId]
      );
    }
    const [balanceRows]: any = await conn.query(
      `SELECT game_currency, balance_kopecks FROM users WHERE id = ?`,
      [userId]
    );
    await conn.commit();
    if (totalRubleAmountKopecks > 0) {
      sendToUser(userId, {
        type: "balance_update",
        data: { balanceKopecks: Number(balanceRows[0]?.balance_kopecks ?? 0) },
      });
    }

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
      rubleAmountKopecks: i.ruble_amount_kopecks,
    }));

    return NextResponse.json({
      ok: true,
      caseName: caseRows[0].case_name,
      opened: results.length,
      results,
      items,
      totalCompensation,
      balance: Number(balanceRows[0]?.game_currency ?? 0),
      totalRubleAmountKopecks,
      rubleBalanceKopecks: Number(balanceRows[0]?.balance_kopecks ?? 0),
    });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
