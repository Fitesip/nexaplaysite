/** GET /api/referrals — returns the user's referral code and the list of friends who signed up with it. */
import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const pool = getPool();
  const [meRows]: any = await pool.query("SELECT referral_code FROM users WHERE id = ?", [userId]);
  const [invited]: any = await pool.query(
    "SELECT id, username, created_at FROM users WHERE referred_by = ? ORDER BY created_at DESC",
    [userId]
  );

  return NextResponse.json({
    code: meRows[0]?.referral_code ?? null,
    invitedCount: invited.length,
    invited,
  });
}
