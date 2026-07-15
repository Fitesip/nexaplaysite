/** POST /api/cases/open — opens one owned (unopened) case instance for the current user.
 *  Performs a server-side weighted roll (rarity/chance are never trusted from the client),
 *  skips unique rewards the user already owns, records the result, and returns both the won
 *  item and the case's full loot pool so the client can render the spinning-reel animation. */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { caseOpenError, eligibleItems, weightedPick } from "@/lib/caseRoll";

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
    const openError = caseOpenError(owned);
    if (openError) {
      await conn.rollback();
      const status = openError.includes("не найден") ? 404 : 409;
      return NextResponse.json({ error: openError }, { status });
    }

    const [pool_]: any = await conn.query(
      `SELECT id, name, rarity, item_type, is_unique, image_url, weight
       FROM case_items WHERE case_id = ? ORDER BY sort_order ASC, id ASC`,
      [owned.case_id]
    );
    const lootItems: {
      id: number;
      name: string;
      rarity: string;
      item_type: string;
      image_url: string | null;
      weight: number;
      is_unique: boolean;
    }[] = pool_
      .filter((r: any) => r.weight > 0)
      .map((r: any) => ({
        id: r.id,
        name: r.name,
        rarity: r.rarity,
        item_type: r.item_type,
        image_url: r.image_url,
        weight: r.weight,
        is_unique: Boolean(r.is_unique),
      }));
    if (lootItems.length === 0) {
      await conn.rollback();
      return NextResponse.json({ error: "Кейс пуст — обратитесь к администрации" }, { status: 409 });
    }

    // Unique rewards the user has already won from this case are excluded from the roll.
    const [ownedRows]: any = await conn.query(
      `SELECT DISTINCT won_case_item_id AS id FROM user_cases
       WHERE user_id = ? AND status = 'opened' AND won_case_item_id IS NOT NULL`,
      [userId]
    );
    const ownedUniqueIds = new Set<number>(ownedRows.map((r: any) => Number(r.id)));

    const candidates = eligibleItems(lootItems, ownedUniqueIds);
    const won = weightedPick(candidates) ?? candidates[candidates.length - 1];

    await conn.query(
      `UPDATE user_cases
       SET status = 'opened', won_case_item_id = ?, won_item_name = ?, won_item_rarity = ?,
           won_item_type = ?, won_item_image = ?, opened_at = NOW()
       WHERE id = ?`,
      [won.id, won.name, won.rarity, won.item_type, won.image_url, userCaseId]
    );

    await conn.commit();

    // Return the full pool (with chances) so the client can build the reel, plus the winner.
    const totalWeight = lootItems.reduce((sum: number, r: any) => sum + r.weight, 0);
    const items = pool_.map((r: any) => ({
      id: r.id,
      name: r.name,
      rarity: r.rarity,
      itemType: r.item_type,
      imageUrl: r.image_url,
      isUnique: Boolean(r.is_unique),
      weight: r.weight,
      chance: totalWeight > 0 ? r.weight / totalWeight : 0,
    }));

    return NextResponse.json({
      ok: true,
      won: { id: won.id, name: won.name, rarity: won.rarity, itemType: won.item_type, imageUrl: won.image_url },
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
