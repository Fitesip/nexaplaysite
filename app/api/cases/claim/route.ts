/** POST /api/cases/claim — marks an opened case reward as claimed ("забрать/активировать").
 *  Accepts a single { userCaseId } or { all: true } to claim every pending reward at once. */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { executeGrantCommand } from "@/lib/itemGrant";

const schema = z.object({
  userCaseId: z.union([z.string(), z.number()]).optional(),
  all: z.boolean().optional(),
});

type ClaimResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

async function claimOne(
  pool: ReturnType<typeof getPool>,
  userId: number,
  userCaseId: number
): Promise<ClaimResult> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows]: any = await conn.query(
      `SELECT uc.id, uc.won_grant_command, u.minecraft_username
       FROM user_cases uc
       JOIN users u ON u.id = uc.user_id
       WHERE uc.id = ? AND uc.user_id = ? AND uc.status = 'opened' AND uc.claimed = 0
       FOR UPDATE`,
      [userCaseId, userId]
    );
    const reward = rows[0];
    if (!reward) {
      await conn.rollback();
      return { ok: false, status: 404, error: "Награда не найдена или уже получена" };
    }

    if (reward.won_grant_command) {
      if (!reward.minecraft_username) {
        await conn.rollback();
        return {
          ok: false,
          status: 403,
          error: "Привяжите Minecraft-аккаунт, чтобы получить награду",
        };
      }
      const granted = await executeGrantCommand(
        reward.won_grant_command,
        reward.minecraft_username
      );
      if (!granted) {
        await conn.rollback();
        return {
          ok: false,
          status: 502,
          error: "Не удалось подключиться к RCON. Награда осталась в инвентаре.",
        };
      }
    }

    await conn.query(
      `UPDATE user_cases SET claimed = 1, claimed_at = NOW()
       WHERE id = ? AND user_id = ? AND claimed = 0`,
      [userCaseId, userId]
    );
    await conn.commit();
    return { ok: true };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

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
    const [rows]: any = await pool.query(
      `SELECT id FROM user_cases
       WHERE user_id = ? AND status = 'opened' AND claimed = 0
       ORDER BY id ASC`,
      [userId]
    );
    let claimed = 0;
    for (const row of rows) {
      const result = await claimOne(pool, userId, Number(row.id));
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error, claimed },
          { status: result.status }
        );
      }
      claimed++;
    }
    return NextResponse.json({ ok: true, claimed });
  }

  const userCaseId = Number(parsed.data.userCaseId);
  if (!Number.isInteger(userCaseId)) {
    return NextResponse.json({ error: "Некорректная награда" }, { status: 400 });
  }

  const result = await claimOne(pool, userId, userCaseId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, claimed: 1 });
}
