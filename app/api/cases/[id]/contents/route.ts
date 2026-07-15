/** GET /api/cases/:id/contents — public loot pool of a case: each item's rarity + drop chance. */
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const caseId = Number(id);
  if (!Number.isInteger(caseId)) {
    return NextResponse.json({ error: "Некорректный кейс" }, { status: 400 });
  }

  const pool = getPool();
  const [caseRows]: any = await pool.query(
    `SELECT id, name, game_mode AS gameMode FROM catalog_items WHERE id = ? AND is_case = 1 LIMIT 1`,
    [caseId]
  );
  if (!caseRows[0]) {
    return NextResponse.json({ error: "Кейс не найден" }, { status: 404 });
  }

  const [rows]: any = await pool.query(
    `SELECT id, name, rarity, weight FROM case_items WHERE case_id = ? ORDER BY sort_order ASC, id ASC`,
    [caseId]
  );

  const totalWeight = rows.reduce((sum: number, r: any) => sum + Math.max(0, r.weight), 0);
  const items = rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    rarity: r.rarity,
    weight: r.weight,
    chance: totalWeight > 0 ? r.weight / totalWeight : 0,
  }));

  return NextResponse.json(
    { case: caseRows[0], items },
    { headers: { "Cache-Control": "no-store" } }
  );
}
