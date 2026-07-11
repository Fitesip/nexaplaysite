import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/lib/db";

const schema = z.object({ code: z.string().min(1) });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Некорректный запрос" }, { status: 400 });
  }
  const code = parsed.data.code.trim().toUpperCase();

  const pool = getPool();

  // atomic guard: only increments while still under the usage cap (or uncapped)
  const [result]: any = await pool.query(
    `UPDATE promocodes
     SET used_count = used_count + 1
     WHERE code = ? AND active = 1 AND (max_uses IS NULL OR used_count < max_uses)
       AND (expires_at IS NULL OR expires_at > NOW())`,
    [code]
  );

  if (result.affectedRows === 0) {
    return NextResponse.json({ ok: false, error: "Промокод недействителен" }, { status: 410 });
  }

  return NextResponse.json({ ok: true });
}
