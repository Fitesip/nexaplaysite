/** POST /api/cases/claim — marks an opened case reward as claimed ("забрать/активировать").
 *  Accepts a single { userCaseId } or { all: true } to claim every pending reward at once. */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

const schema = z.object({
  userCaseId: z.union([z.string(), z.number()]).optional(),
  all: z.boolean().optional(),
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

  const pool = getPool();

  if (parsed.data.all) {
    const [result]: any = await pool.query(
      `UPDATE user_cases SET claimed = 1, claimed_at = NOW()
       WHERE user_id = ? AND status = 'opened' AND claimed = 0`,
      [userId]
    );
    return NextResponse.json({ ok: true, claimed: result.affectedRows });
  }

  const userCaseId = Number(parsed.data.userCaseId);
  if (!Number.isInteger(userCaseId)) {
    return NextResponse.json({ error: "Некорректная награда" }, { status: 400 });
  }

  const [result]: any = await pool.query(
    `UPDATE user_cases SET claimed = 1, claimed_at = NOW()
     WHERE id = ? AND user_id = ? AND status = 'opened' AND claimed = 0`,
    [userCaseId, userId]
  );
  if (result.affectedRows === 0) {
    return NextResponse.json({ error: "Награда не найдена или уже получена" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, claimed: 1 });
}
