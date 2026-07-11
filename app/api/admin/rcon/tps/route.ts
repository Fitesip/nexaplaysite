import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { fetchTps } from "@/lib/tps";

export async function GET() {
  const staff = await requireStaff();
  if (!staff) {
    return NextResponse.json({ error: "Доступ только для сотрудников сервера" }, { status: 403 });
  }

  if (!process.env.RCON_HOST || !process.env.RCON_PASSWORD) {
    return NextResponse.json({ error: "RCON не настроен" }, { status: 503 });
  }

  const result = await fetchTps();
  if (!result) {
    return NextResponse.json(
      { error: "Не удалось получить TPS ни одной из известных команд (spark, ClearLag, CMI, стандартная tps)" },
      { status: 502 }
    );
  }

  return NextResponse.json(result);
}
