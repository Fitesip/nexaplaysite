"use client";

/** Admin modal for editing a case's loot pool: add/remove items, set each one's rarity, drop type,
 *  weight, uniqueness and icon. The drop chance (weight / total weight) is shown live so admins can
 *  balance a case without doing the maths by hand, and a warning appears when a rarer item isn't
 *  less likely than a common one. Saving replaces the whole pool via PUT /api/admin/cases/:id. */
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  DEFAULT_RARITY_WEIGHT,
  RARITIES,
  RARITY_MAP,
  sortByRarity,
  type Rarity,
} from "@/lib/rarity";
import { ITEM_TYPES, ITEM_TYPE_MAP, isAlwaysUniqueItemType, type ItemType } from "@/lib/itemType";
import { rarityChanceWarning } from "@/lib/caseRoll";
import ItemIcon from "@/components/cases/ItemIcon";

type Row = {
  name: string;
  rarity: Rarity;
  itemType: ItemType;
  isUnique: boolean;
  imageUrl: string | null;
  price: string;
  weight: string;
};

type LoadedItem = {
  name: string;
  rarity: Rarity;
  itemType?: ItemType;
  isUnique?: boolean;
  imageUrl?: string | null;
  price?: number;
  weight: number;
};

const emptyRow = (): Row => ({
  name: "",
  rarity: "common",
  itemType: "item",
  isUnique: false,
  imageUrl: null,
  price: "0",
  weight: String(DEFAULT_RARITY_WEIGHT.common),
});

export default function CaseLootEditor({
  caseId,
  caseName,
  onClose,
}: {
  caseId: number;
  caseName: string;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    fetch(`/api/admin/cases/${caseId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const items = (d.items ?? []) as LoadedItem[];
        setRows(
          items.length > 0
            ? sortByRarity(items).map((i) => ({
                name: i.name,
                rarity: i.rarity,
                itemType: i.itemType ?? "item",
                isUnique: isAlwaysUniqueItemType(i.itemType ?? "item") || Boolean(i.isUnique),
                imageUrl: i.imageUrl ?? null,
                price: String(i.price ?? 0),
                weight: String(i.weight),
              }))
            : [emptyRow()]
        );
      })
      .finally(() => setLoading(false));
  }, [caseId]);

  const totalWeight = useMemo(
    () => rows.reduce((sum, r) => sum + (Number(r.weight) > 0 ? Number(r.weight) : 0), 0),
    [rows]
  );

  // Live "rarer must be less likely" advisory, mirroring the server-side check.
  const liveWarning = useMemo(
    () =>
      rarityChanceWarning(
        rows
          .filter((r) => r.name.trim() && Number(r.weight) > 0)
          .map((r) => ({ id: 0, rarity: r.rarity, weight: Number(r.weight) }))
      ),
    [rows]
  );

  const update = (idx: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  // Changing a row's rarity pre-fills the suggested default weight for that rarity so
  // rarer items get a lower drop chance by default (admins can still tweak it).
  const changeRarity = (idx: number, rarity: Rarity) =>
    update(idx, { rarity, weight: String(DEFAULT_RARITY_WEIGHT[rarity]) });
  const changeItemType = (idx: number, itemType: ItemType) =>
    update(idx, { itemType, isUnique: isAlwaysUniqueItemType(itemType) });
  const removeRow = (idx: number) => setRows((prev) => prev.filter((_, i) => i !== idx));

  const uploadIcon = async (idx: number, file: File) => {
    setError("");
    setUploadingIdx(idx);
    try {
      const fd = new FormData();
      fd.append("icon", file);
      const res = await fetch("/api/admin/cases/upload-icon", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Не удалось загрузить иконку");
      update(idx, { imageUrl: data.url });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки иконки");
    } finally {
      setUploadingIdx(null);
    }
  };

  const save = async () => {
    setError("");
    const items = rows
      .map((r) => ({
        name: r.name.trim(),
        rarity: r.rarity,
        itemType: r.itemType,
        isUnique: isAlwaysUniqueItemType(r.itemType) || r.isUnique,
        imageUrl: r.imageUrl,
        price: Number(r.price),
        weight: Number(r.weight),
      }))
      .filter((r) => r.name.length > 0);

    for (const it of items) {
      if (!Number.isInteger(it.weight) || it.weight <= 0) {
        setError(`Некорректный вес у предмета «${it.name || "без названия"}» (нужно целое > 0)`);
        return;
      }
      if (!Number.isInteger(it.price) || it.price < 0) {
        setError(`Некорректная стоимость у предмета «${it.name || "без названия"}» (нужно целое ≥ 0)`);
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/cases/${caseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Не удалось сохранить содержимое");
      if (data.warning) {
        // Saved, but surface the balance warning instead of closing so the admin sees it.
        setError(`Сохранено. ⚠ ${data.warning}`);
      } else {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="glass-panel pixel-corner relative flex max-h-[88vh] w-full max-w-3xl flex-col p-6">
        <button
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute right-4 top-4 text-[var(--color-mist)] transition-colors hover:text-rose-300"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>

        <h3 className="font-[var(--font-display)] text-lg font-bold text-white">Содержимое кейса</h3>
        <p className="mt-1 text-xs text-[var(--color-mist)]">
          «{caseName}» · шанс = вес предмета / сумма весов
        </p>

        {loading ? (
          <p className="mt-6 text-sm text-[var(--color-mist)]">Загрузка…</p>
        ) : (
          <>
            <div className="mt-5 flex-1 overflow-y-auto pr-1">
              <div className="flex flex-col gap-2">
                {rows.map((row, idx) => {
                  const w = Number(row.weight) > 0 ? Number(row.weight) : 0;
                  const chance = totalWeight > 0 ? (w / totalWeight) * 100 : 0;
                  const meta = RARITY_MAP[row.rarity];
                  return (
                    <div
                      key={idx}
                      className="flex flex-col gap-2 border border-white/10 p-2.5"
                      style={{ borderLeft: `2px solid ${meta.color}` }}
                    >
                      <div className="flex items-end gap-2">
                        <label className="flex cursor-pointer flex-col gap-1" title="Загрузить иконку">
                          <span className="text-[10px] uppercase tracking-wide text-[var(--color-mist)]">Иконка</span>
                          <ItemIcon imageUrl={row.imageUrl} itemType={row.itemType} rarity={row.rarity} size={40} />
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) uploadIcon(idx, f);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        <label className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="text-[10px] uppercase tracking-wide text-[var(--color-mist)]">Название</span>
                          <input
                            value={row.name}
                            onChange={(e) => update(idx, { name: e.target.value })}
                            placeholder="Название предмета"
                            className="min-w-0 border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white outline-none focus:border-cyan-400/60"
                          />
                        </label>
                        <button
                          onClick={() => removeRow(idx)}
                          aria-label="Удалить предмет"
                          className="flex h-7 w-7 shrink-0 items-center justify-center text-[var(--color-mist)] transition-colors hover:text-rose-300"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-end gap-2">
                        <label className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase tracking-wide text-[var(--color-mist)]">Редкость</span>
                          <select
                            value={row.rarity}
                            onChange={(e) => changeRarity(idx, e.target.value as Rarity)}
                            className="border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white outline-none focus:border-cyan-400/60"
                          >
                            {RARITIES.map((r) => (
                              <option key={r} value={r} className="bg-[#0a0a12]">
                                {RARITY_MAP[r].label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase tracking-wide text-[var(--color-mist)]">Тип</span>
                          <select
                            value={row.itemType}
                            onChange={(e) => changeItemType(idx, e.target.value as ItemType)}
                            className="border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white outline-none focus:border-cyan-400/60"
                          >
                            {ITEM_TYPES.map((t) => (
                              <option key={t} value={t} className="bg-[#0a0a12]">
                                {ITEM_TYPE_MAP[t].label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase tracking-wide text-[var(--color-mist)]">Вес</span>
                          <input
                            type="number"
                            min={1}
                            value={row.weight}
                            onChange={(e) => update(idx, { weight: e.target.value })}
                            className="w-20 border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white outline-none focus:border-cyan-400/60"
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase tracking-wide text-[var(--color-mist)]">
                            Цена, монеты
                          </span>
                          <input
                            type="number"
                            min={0}
                            value={row.price}
                            onChange={(e) => update(idx, { price: e.target.value })}
                            className="w-24 border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white outline-none focus:border-cyan-400/60"
                          />
                        </label>
                        <span className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase tracking-wide text-[var(--color-mist)]">Шанс</span>
                          <span
                            className="w-14 py-1.5 text-right font-[var(--font-mono)] text-xs"
                            style={{ color: meta.color }}
                          >
                            {chance.toFixed(chance < 0.01 && chance > 0 ? 2 : 1)}%
                          </span>
                        </span>
                        {isAlwaysUniqueItemType(row.itemType) ? (
                          <span className="ml-auto font-[var(--font-mono)] text-xs text-cyan-300">
                            уникальный
                          </span>
                        ) : (
                          <label className="ml-auto flex cursor-pointer items-center gap-1.5 font-[var(--font-mono)] text-xs text-[var(--color-mist)]">
                            <input
                              type="checkbox"
                              checked={row.isUnique}
                              onChange={(e) => update(idx, { isUnique: e.target.checked })}
                              className="accent-cyan-500"
                            />
                            уникальный
                          </label>
                        )}
                        {uploadingIdx === idx && (
                          <span className="font-[var(--font-mono)] text-[10px] text-cyan-300">загрузка…</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={addRow}
                className="mt-3 border border-white/15 px-4 py-2 text-sm text-[var(--color-mist)] transition-colors duration-300 hover:border-cyan-400/50 hover:text-white"
              >
                + Добавить предмет
              </button>

              {liveWarning && (
                <p className="mt-3 border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  ⚠ {liveWarning}
                </p>
              )}
            </div>

            {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
              <span className="font-[var(--font-mono)] text-xs text-[var(--color-mist)]">
                Всего предметов: {rows.filter((r) => r.name.trim()).length} · сумма весов: {totalWeight}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="border border-white/15 px-4 py-2 text-sm text-[var(--color-mist)] transition-colors hover:text-white"
                >
                  Отмена
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="pixel-corner bg-gradient-to-r from-violet-600 to-cyan-500 px-6 py-2 font-[var(--font-display)] text-sm font-semibold text-white shadow-[var(--shadow-glow-cyan)] transition-transform duration-300 hover:scale-[1.02] disabled:opacity-60"
                >
                  {saving ? "Сохраняем…" : "Сохранить"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
