import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { notify } from "@/lib/notify";

const schema = z.object({
  action: z.enum(["dismiss", "resolve", "delete_post"]),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  if (!staff) {
    return NextResponse.json({ error: "Доступ только для сотрудников" }, { status: 403 });
  }

  const { id } = await params;
  const reportId = Number(id);
  if (!Number.isInteger(reportId) || reportId <= 0) {
    return NextResponse.json({ error: "Некорректная жалоба" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректное действие" }, { status: 400 });
  }

  const pool = getPool();
  const [rows]: any = await pool.query(
    "SELECT id, reporter_id, topic_id, comment_id, status FROM forum_reports WHERE id = ?",
    [reportId]
  );
  const report = rows[0];
  if (!report) {
    return NextResponse.json({ error: "Жалоба не найдена" }, { status: 404 });
  }
  if (report.status !== "open") {
    return NextResponse.json({ error: "Жалоба уже обработана" }, { status: 409 });
  }

  if (parsed.data.action === "delete_post") {
    if (report.topic_id) {
      const [topicRows]: any = await pool.query("SELECT user_id, title FROM forum_topics WHERE id = ?", [
        report.topic_id,
      ]);
      await pool.query("DELETE FROM forum_topics WHERE id = ?", [report.topic_id]);
      // deleting the topic cascades and removes this (and any other) report row tied to it
      if (topicRows[0]) {
        await notify(pool, {
          userId: topicRows[0].user_id,
          type: "moderation",
          title: "Ваша тема была удалена модератором",
          body: topicRows[0].title,
        });
      }
      await notify(pool, {
        userId: report.reporter_id,
        type: "moderation",
        title: "Ваша жалоба принята",
        body: "Пост удалён модератором.",
      });
      return NextResponse.json({ ok: true });
    }
    const [commentRows]: any = await pool.query(
      "SELECT user_id, topic_id FROM forum_comments WHERE id = ?",
      [report.comment_id]
    );
    await pool.query("DELETE FROM forum_comments WHERE id = ?", [report.comment_id]);
    if (commentRows[0]) {
      await notify(pool, {
        userId: commentRows[0].user_id,
        type: "moderation",
        title: "Ваш комментарий был удалён модератором",
        link: `#forum/topic/${commentRows[0].topic_id}`,
      });
    }
    await notify(pool, {
      userId: report.reporter_id,
      type: "moderation",
      title: "Ваша жалоба принята",
      body: "Пост удалён модератором.",
    });
    return NextResponse.json({ ok: true });
  }

  await pool.query(
    "UPDATE forum_reports SET status = ?, resolved_by = ?, resolved_at = NOW() WHERE id = ?",
    [parsed.data.action === "dismiss" ? "dismissed" : "resolved", staff.id, reportId]
  );
  if (parsed.data.action === "dismiss") {
    await notify(pool, {
      userId: report.reporter_id,
      type: "moderation",
      title: "Ваша жалоба отклонена",
      body: "Модератор не нашёл нарушений в этом посте.",
    });
  }
  return NextResponse.json({ ok: true });
}
