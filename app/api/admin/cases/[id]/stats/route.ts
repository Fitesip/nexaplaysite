/** GET /api/admin/cases/:id/stats — opening statistics for a case: how many times it was opened
 *  and the distribution of dropped items (to eyeball whether the odds play out fairly). Admins only. */
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Доступ только для администраторов" }, { status: 403 });
  }

  const { id } = await params;
  const caseId = Number(id);
  if (!Number.isInteger(caseId)) {
    return NextResponse.json({ error: "Некорректный кейс" }, { status: 400 });
  }

  const pool = getPool();

  const [openedRows]: any = await pool.query(
    `SELECT COUNT(*) AS opened FROM user_cases WHERE case_id = ? AND status = 'opened'`,
    [caseId]
  );
  const totalOpened = Number(openedRows[0]?.opened ?? 0);

  // Distribution keyed by the snapshotted name+rarity, so it stays correct even if the
  // admin later edits the pool (the source case_item may no longer exist).
  const [distRows]: any = await pool.query(
    `SELECT won_item_name AS name, won_item_rarity AS rarity, won_item_type AS itemType, COUNT(*) AS count
     FROM user_cases
     WHERE case_id = ? AND status = 'opened' AND won_item_name IS NOT NULL
     GROUP BY won_item_name, won_item_rarity, won_item_type
     ORDER BY count DESC`,
    [caseId]
  );

  // Configured (expected) odds from the current pool, to compare against the actual counts.
  const [poolRows]: any = await pool.query(
    `SELECT name, rarity, weight FROM case_items WHERE case_id = ?`,
    [caseId]
  );
  const totalWeight = poolRows.reduce((sum: number, r: any) => sum + Math.max(0, r.weight), 0);
  const expectedByName = new Map<string, number>(
    poolRows.map((r: any) => [r.name, totalWeight > 0 ? r.weight / totalWeight : 0])
  );

  const distribution = distRows.map((r: any) => ({
    name: r.name,
    rarity: r.rarity,
    itemType: r.itemType,
    count: Number(r.count),
    actual: totalOpened > 0 ? Number(r.count) / totalOpened : 0,
    expected: expectedByName.get(r.name) ?? null,
  }));

  return NextResponse.json(
    { totalOpened, distribution },
    { headers: { "Cache-Control": "no-store" } }
  );
}
