/** GET/PUT /api/admin/cases/:id — read or replace the loot pool (items + rarity + type + weight +
 *  uniqueness + icon) of a case. Admins only. */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { RARITIES } from "@/lib/rarity";
import { ITEM_TYPES, isAlwaysUniqueItemType } from "@/lib/itemType";
import { rarityChanceWarning } from "@/lib/caseRoll";
import { normalizeGrantCommand, validateGrantCommand } from "@/lib/itemGrant";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Доступ только для администраторов" }, { status: 403 });
  }

  const { id } = await params;
  const caseId = Number(id);
  if (!Number.isInteger(caseId)) {
    return NextResponse.json({ error: "Некорректный кейс" }, { status: 400 });
  }

  const pool = getPool();
  const [rows]: any = await pool.query(
    `SELECT id, name, rarity, item_type, is_unique, image_url, price_currency, grant_command,
            ruble_amount_kopecks, weight, sort_order
     FROM case_items
     WHERE case_id = ?
     ORDER BY sort_order ASC, id ASC`,
    [caseId]
  );
  const totalWeight = rows.reduce((sum: number, r: any) => sum + Math.max(0, r.weight), 0);
  const items = rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    rarity: r.rarity,
    itemType: r.item_type,
    isUnique: Boolean(r.is_unique),
    imageUrl: r.image_url,
    price: Number(r.price_currency),
    grantCommand: r.grant_command,
    rubleAmountKopecks: Number(r.ruble_amount_kopecks),
    weight: r.weight,
    chance: totalWeight > 0 ? r.weight / totalWeight : 0,
  }));

  return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
}

const schema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Укажите название предмета").max(120),
        rarity: z.enum(RARITIES),
        itemType: z.enum(ITEM_TYPES).default("item"),
        isUnique: z.boolean().default(false),
        imageUrl: z.string().trim().max(255).nullable().optional(),
        price: z.number().int("Стоимость должна быть целым числом").nonnegative("Стоимость не может быть отрицательной"),
        grantCommand: z.string().trim().max(500).nullable().optional(),
        rubleAmountKopecks: z.number().int().nonnegative().default(0),
        weight: z.number().int("Вес должен быть целым").positive("Вес должен быть больше 0"),
      }).superRefine((item, ctx) => {
        const grantCommand = item.itemType === "rubles" ? null : normalizeGrantCommand(item.grantCommand);
        const grantCommandError = validateGrantCommand(grantCommand);
        if (grantCommandError) {
          ctx.addIssue({ code: "custom", path: ["grantCommand"], message: grantCommandError });
        }
        if (item.itemType === "rubles" && item.rubleAmountKopecks <= 0) {
          ctx.addIssue({
            code: "custom",
            path: ["rubleAmountKopecks"],
            message: "Сумма рублёвой награды должна быть больше 0",
          });
        }
      })
    )
    .max(100),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Доступ только для администраторов" }, { status: 403 });
  }

  const { id } = await params;
  const caseId = Number(id);
  if (!Number.isInteger(caseId)) {
    return NextResponse.json({ error: "Некорректный кейс" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const items = parsed.data.items.map((item) => ({
    ...item,
    isUnique:
      item.itemType !== "rubles" &&
      (isAlwaysUniqueItemType(item.itemType) || item.isUnique),
    grantCommand: item.itemType === "rubles" ? null : normalizeGrantCommand(item.grantCommand),
    rubleAmountKopecks: item.itemType === "rubles" ? item.rubleAmountKopecks : 0,
  }));

  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [caseRows]: any = await conn.query(
      `SELECT id FROM catalog_items WHERE id = ? AND is_case = 1 LIMIT 1 FOR UPDATE`,
      [caseId]
    );
    if (!caseRows[0]) {
      await conn.rollback();
      return NextResponse.json({ error: "Товар не является кейсом" }, { status: 400 });
    }

    // Replace the whole pool: simplest correct semantics for the editor, and existing
    // opened cases keep their snapshotted winner (won_item_name/rarity) regardless.
    await conn.query(`DELETE FROM case_items WHERE case_id = ?`, [caseId]);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await conn.query(
        `INSERT INTO case_items
           (case_id, name, rarity, item_type, is_unique, image_url, price_currency,
            grant_command, ruble_amount_kopecks, weight, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          caseId,
          it.name,
          it.rarity,
          it.itemType,
          it.isUnique ? 1 : 0,
          it.imageUrl ?? null,
          it.price,
          it.grantCommand,
          it.rubleAmountKopecks,
          it.weight,
          i,
        ]
      );
    }

    await conn.commit();

    // Non-blocking advisory: warn if a rarer tier isn't strictly less likely than a common one.
    const warning = rarityChanceWarning(items.map((it) => ({ id: 0, rarity: it.rarity, weight: it.weight })));
    return NextResponse.json({ ok: true, warning });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
