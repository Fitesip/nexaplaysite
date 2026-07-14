/** GET/POST /api/forum/topics — lists topics (filterable/sortable), or creates a new one. */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { requireForumPostAccess } from "@/lib/auth";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const categorySlug = searchParams.get("category");
  const tag = searchParams.get("tag");
  const search = searchParams.get("search")?.trim() ?? "";
  const sort = searchParams.get("sort") === "discussed" ? "discussed" : "new";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const pool = getPool();

  const where: string[] = [];
  const params: (string | number)[] = [];

  if (categorySlug) {
    where.push("c.slug = ?");
    params.push(categorySlug);
  }
  if (tag) {
    where.push(
      "t.id IN (SELECT tt.topic_id FROM forum_topic_tags tt JOIN forum_tags tg ON tg.id = tt.tag_id WHERE tg.name = ?)"
    );
    params.push(tag.toLowerCase());
  }
  if (search) {
    where.push("(t.title LIKE ? OR t.body LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const orderSql =
    sort === "discussed" ? "ORDER BY t.pinned DESC, comment_count DESC, t.created_at DESC" : "ORDER BY t.pinned DESC, t.created_at DESC";

  const [rows]: any = await pool.query(
    `SELECT t.id, t.title, t.body, t.pinned, t.created_at,
            u.id AS author_id, u.username AS author_name, u.created_at AS author_joined_at,
            u.avatar_url AS author_avatar_url, u.minecraft_uuid AS author_minecraft_uuid,
            u.minecraft_username AS author_minecraft_username,
            c.id AS category_id, c.slug AS category_slug, c.name AS category_name,
            (SELECT COUNT(*) FROM forum_comments fc WHERE fc.topic_id = t.id) AS comment_count
     FROM forum_topics t
     JOIN users u ON u.id = t.user_id
     JOIN forum_categories c ON c.id = t.category_id
     ${whereSql}
     ${orderSql}
     LIMIT ? OFFSET ?`,
    [...params, PAGE_SIZE, offset]
  );

  const [countRows]: any = await pool.query(
    `SELECT COUNT(*) AS total
     FROM forum_topics t
     JOIN forum_categories c ON c.id = t.category_id
     ${whereSql}`,
    params
  );

  const topicIds = rows.map((r: any) => r.id);
  let tagsByTopic: Record<number, { id: number; name: string }[]> = {};
  if (topicIds.length) {
    const [tagRows]: any = await pool.query(
      `SELECT tt.topic_id, tg.id, tg.name
       FROM forum_topic_tags tt
       JOIN forum_tags tg ON tg.id = tt.tag_id
       WHERE tt.topic_id IN (${topicIds.map(() => "?").join(",")})`,
      topicIds
    );
    tagsByTopic = tagRows.reduce((acc: any, r: any) => {
      (acc[r.topic_id] ??= []).push({ id: r.id, name: r.name });
      return acc;
    }, {});
  }

  const topics = rows.map((r: any) => ({
    id: r.id,
    title: r.title,
    excerpt: r.body.length > 220 ? `${r.body.slice(0, 220)}…` : r.body,
    pinned: !!r.pinned,
    created_at: r.created_at,
    comment_count: r.comment_count,
    author: {
      id: r.author_id,
      username: r.author_name,
      created_at: r.author_joined_at,
      avatar_url: r.author_avatar_url,
      minecraft_uuid: r.author_minecraft_uuid,
      minecraft_username: r.author_minecraft_username,
    },
    category: { id: r.category_id, slug: r.category_slug, name: r.category_name },
    tags: tagsByTopic[r.id] ?? [],
  }));

  return NextResponse.json({
    topics,
    page,
    pageSize: PAGE_SIZE,
    total: countRows[0]?.total ?? 0,
  });
}

const createSchema = z.object({
  category_id: z.number().int().positive(),
  title: z.string().trim().min(5, "Заголовок слишком короткий").max(150, "Заголовок слишком длинный"),
  body: z.string().trim().min(10, "Текст темы слишком короткий").max(8000, "Текст темы слишком длинный"),
  tags: z
    .array(z.string().trim().min(1).max(24))
    .max(5, "Не более 5 тегов")
    .optional()
    .default([]),
});

export async function POST(req: NextRequest) {
  const gate = await requireForumPostAccess();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const userId = gate.userId;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { category_id, title, body: topicBody, tags } = parsed.data;

  const pool = getPool();

  const [categoryRows]: any = await pool.query("SELECT id FROM forum_categories WHERE id = ?", [category_id]);
  if (!categoryRows[0]) {
    return NextResponse.json({ error: "Категория не найдена" }, { status: 400 });
  }

  const [result]: any = await pool.query(
    "INSERT INTO forum_topics (category_id, user_id, title, body) VALUES (?, ?, ?, ?)",
    [category_id, userId, title, topicBody]
  );
  const topicId = result.insertId;

  const cleanTags = Array.from(
    new Set(tags.map((t) => t.toLowerCase().replace(/\s+/g, " ").trim()).filter(Boolean))
  );

  for (const name of cleanTags) {
    await pool.query("INSERT INTO forum_tags (name) VALUES (?) ON DUPLICATE KEY UPDATE name = name", [name]);
    const [tagRows]: any = await pool.query("SELECT id FROM forum_tags WHERE name = ?", [name]);
    const tagId = tagRows[0]?.id;
    if (tagId) {
      await pool.query(
        "INSERT INTO forum_topic_tags (topic_id, tag_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE topic_id = topic_id",
        [topicId, tagId]
      );
    }
  }

  return NextResponse.json({ ok: true, id: topicId }, { status: 201 });
}
