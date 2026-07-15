/** POST /api/cases/open-bulk — opens several owned (unopened) instances of the same case at once.
 *  Rolls each one server-side (same weighted logic as single open) and returns every drop, so the
 *  client can show a "you got …" summary without the reel animation. Unique rewards already owned —
 *  including ones won earlier in this same batch — are excluded from subsequent rolls. */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { eligibleItems, weightedPick } from "@/lib/caseRoll";

const MAX_BULK = 50;

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
      `SELECT id, name, rarity, item_type, is_unique, image_url, weight
       FROM case_items WHERE case_id = ? ORDER BY sort_order ASC, id ASC`,
      [caseId]
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

    const [ownedRows]: any = await conn.query(
      `SELECT DISTINCT won_case_item_id AS id FROM user_cases
       WHERE user_id = ? AND status = 'opened' AND won_case_item_id IS NOT NULL`,
      [userId]
    );
    const ownedUniqueIds = new Set<number>(ownedRows.map((r: any) => Number(r.id)));

    const results: {
      userCaseId: number;
      name: string;
      rarity: string;
      itemType: string;
      imageUrl: string | null;
    }[] = [];

    for (const owned of caseRows) {
      const candidates = eligibleItems(lootItems, ownedUniqueIds);
      const won = weightedPick(candidates) ?? candidates[candidates.length - 1];
      if (won.is_unique) ownedUniqueIds.add(won.id);

      await conn.query(
        `UPDATE user_cases
         SET status = 'opened', won_case_item_id = ?, won_item_name = ?, won_item_rarity = ?,
             won_item_type = ?, won_item_image = ?, opened_at = NOW()
         WHERE id = ?`,
        [won.id, won.name, won.rarity, won.item_type, won.image_url, owned.id]
      );

      results.push({
        userCaseId: owned.id,
        name: won.name,
        rarity: won.rarity,
        itemType: won.item_type,
        imageUrl: won.image_url,
      });
    }

    await conn.commit();

    return NextResponse.json({ ok: true, caseName: caseRows[0].case_name, opened: results.length, results });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
