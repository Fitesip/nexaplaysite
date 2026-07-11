import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { requireAdmin, canAssignRole, outranks, type Role } from "@/lib/auth";

const schema = z.object({
  role: z.enum(["user", "helper", "admin", "main_admin"]).optional(),
  banned: z.boolean().optional(),
  banned_reason: z.string().trim().max(255).optional(),
  // hours until the site ban auto-lifts; omit/null = permanent
  banned_duration_hours: z.number().positive().max(24 * 365).nullable().optional(),
  forum_banned: z.boolean().optional(),
  forum_banned_reason: z.string().trim().max(255).optional(),
  forum_banned_duration_hours: z.number().positive().max(24 * 365).nullable().optional(),
});

function hoursFromNow(hours: number | null | undefined): Date | null {
  if (!hours) return null;
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Доступ только для администраторов" }, { status: 403 });
  }

  const { id } = await params;
  const targetId = Number(id);
  if (!Number.isInteger(targetId)) {
    return NextResponse.json({ error: "Некорректный пользователь" }, { status: 400 });
  }
  if (targetId === admin.id) {
    return NextResponse.json({ error: "Нельзя изменять роль или блокировку самого себя" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { role, banned, banned_reason, banned_duration_hours, forum_banned, forum_banned_reason, forum_banned_duration_hours } =
    parsed.data;
  if (role === undefined && banned === undefined && forum_banned === undefined) {
    return NextResponse.json({ error: "Нечего обновлять" }, { status: 400 });
  }

  const pool = getPool();
  const [rows]: any = await pool.query("SELECT id, role FROM users WHERE id = ?", [targetId]);
  const target = rows[0];
  if (!target) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }
  const targetRole = target.role as Role;

  // Nobody outranked by (or equal to) the target may act on them —
  // protects main_admin always, and admins from acting on other admins.
  if (!outranks(admin.role, targetRole)) {
    return NextResponse.json({ error: "Недостаточно прав для действия над этим пользователем" }, { status: 403 });
  }

  const sets: string[] = [];
  const values: unknown[] = [];

  if (role !== undefined) {
    if (!canAssignRole(admin.role, role)) {
      return NextResponse.json(
        { error: "Только главный администратор может назначать роль администратора" },
        { status: 403 }
      );
    }
    sets.push("role = ?");
    values.push(role);
  }

  if (banned !== undefined) {
    sets.push("banned = ?", "banned_reason = ?", "banned_until = ?");
    values.push(banned ? 1 : 0, banned ? banned_reason ?? null : null, banned ? hoursFromNow(banned_duration_hours) : null);
  }

  if (forum_banned !== undefined) {
    sets.push("forum_banned = ?", "forum_banned_reason = ?", "forum_banned_until = ?");
    values.push(
      forum_banned ? 1 : 0,
      forum_banned ? forum_banned_reason ?? null : null,
      forum_banned ? hoursFromNow(forum_banned_duration_hours) : null
    );
  }

  await pool.query(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, [...values, targetId]);

  const [updated]: any = await pool.query(
    `SELECT id, username, email, role, banned, banned_reason, banned_until,
            forum_banned, forum_banned_reason, forum_banned_until, minecraft_username, created_at
     FROM users WHERE id = ?`,
    [targetId]
  );

  return NextResponse.json({ user: updated[0] });
}
