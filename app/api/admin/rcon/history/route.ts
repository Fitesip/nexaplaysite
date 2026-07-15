/** GET /api/admin/rcon/history — returns the recent log of RCON commands run through the console. */
import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireRconAccess } from "@/lib/auth";

export async function GET() {
  const staff = await requireRconAccess();
  if (!staff) {
    return NextResponse.json({ error: "Доступ только для сотрудников сервера" }, { status: 403 });
  }

  const pool = getPool();
  const [rows] = await pool.query(
    "SELECT kind, body, created_at FROM rcon_logs WHERE user_id = ? ORDER BY id ASC LIMIT 200",
    [staff.id]
  );

  return NextResponse.json({ lines: rows }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE() {
  const staff = await requireRconAccess();
  if (!staff) {
    return NextResponse.json({ error: "Доступ только для сотрудников сервера" }, { status: 403 });
  }

  const pool = getPool();
  await pool.query("DELETE FROM rcon_logs WHERE user_id = ?", [staff.id]);

  return NextResponse.json({ ok: true });
}
