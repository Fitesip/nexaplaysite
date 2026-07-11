import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { sendRconCommand } from "@/lib/rcon";
import { ampersandToSectionSign } from "@/lib/minecraft-colors";
import { appendRconLog } from "@/lib/rcon-log";

const schema = z.object({ command: z.string().trim().min(1).max(500) });

export async function GET() {
  const staff = await requireStaff();
  if (!staff) {
    return NextResponse.json({ error: "Доступ только для сотрудников сервера" }, { status: 403 });
  }

  return NextResponse.json({
    configured: Boolean(process.env.RCON_HOST && process.env.RCON_PASSWORD),
  });
}

export async function POST(req: NextRequest) {
  const staff = await requireStaff();
  if (!staff) {
    return NextResponse.json({ error: "Доступ только для сотрудников сервера" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  if (!process.env.RCON_HOST || !process.env.RCON_PASSWORD) {
    return NextResponse.json(
      {
        error:
          "RCON не настроен на сервере сайта. Добавьте RCON_HOST, RCON_PORT и RCON_PASSWORD в .env, а также включите enable-rcon=true и укажите rcon.password в server.properties Minecraft-сервера.",
      },
      { status: 503 }
    );
  }

  const command = ampersandToSectionSign(parsed.data.command);
  await appendRconLog(staff.id, "input", command);

  const output = await sendRconCommand(command);
  if (output === null) {
    const error =
      "Не удалось подключиться к серверу по RCON. Проверьте, что сервер запущен, RCON включён (enable-rcon=true) и адрес/порт/пароль в .env верны.";
    await appendRconLog(staff.id, "error", error);
    return NextResponse.json({ error }, { status: 502 });
  }

  const responseText = output.trim() || "(сервер вернул пустой ответ — команда выполнена)";
  await appendRconLog(staff.id, "output", responseText);

  return NextResponse.json({ output: responseText });
}
