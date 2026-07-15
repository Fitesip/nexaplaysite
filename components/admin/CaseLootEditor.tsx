"use client";

/** Admin modal for editing a case's loot pool: add/remove items, set each one's rarity and
 *  weight. The drop chance (weight / total weight) is shown live so admins can balance a case
 *  without doing the maths by hand. Saving replaces the whole pool via PUT /api/admin/cases/:id. */
import { useEffect, useMemo, useState } from "react";
import { RARITIES, RARITY_MAP, type Rarity } from "@/lib/rarity";

type Row = { name: string; rarity: Rarity; weight: string };

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
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/admin/cases/${caseId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const items = (d.items ?? []) as { name: string; rarity: Rarity; weight: number }[];
        setRows(
          items.length > 0
            ? items.map((i) => ({ name: i.name, rarity: i.rarity, weight: String(i.weight) }))
            : [{ name: "", rarity: "common", weight: "1" }]
        );
      })
      .finally(() => setLoading(false));
  }, [caseId]);

  const totalWeight = useMemo(
    () => rows.reduce((sum, r) => sum + (Number(r.weight) > 0 ? Number(r.weight) : 0), 0),
    [rows]
  );

  const update = (idx: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const addRow = () => setRows((prev) => [...prev, { name: "", rarity: "common", weight: "1" }]);
  const removeRow = (idx: number) => setRows((prev) => prev.filter((_, i) => i !== idx));

  const save = async () => {
    setError("");
    const items = rows
      .map((r) => ({ name: r.name.trim(), rarity: r.rarity, weight: Number(r.weight) }))
      .filter((r) => r.name.length > 0);

    for (const it of items) {
      if (!Number.isInteger(it.weight) || it.weight <= 0) {
        setError(`Некорректный вес у предмета «${it.name || "без названия"}» (нужно целое > 0)`);
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
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="glass-panel pixel-corner relative flex max-h-[88vh] w-full max-w-2xl flex-col p-6">
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
          «{caseName}» · шанс считается как вес предмета / сумма весов
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
                      className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 border border-white/10 p-2"
                      style={{ borderLeft: `2px solid ${meta.color}` }}
                    >
                      <input
                        value={row.name}
                        onChange={(e) => update(idx, { name: e.target.value })}
                        placeholder="Название предмета"
                        className="min-w-0 border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white outline-none focus:border-cyan-400/60"
                      />
                      <select
                        value={row.rarity}
                        onChange={(e) => update(idx, { rarity: e.target.value as Rarity })}
                        className="border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white outline-none focus:border-cyan-400/60"
                      >
                        {RARITIES.map((r) => (
                          <option key={r} value={r} className="bg-[#0a0a12]">
                            {RARITY_MAP[r].label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={row.weight}
                        onChange={(e) => update(idx, { weight: e.target.value })}
                        title="Вес (шанс)"
                        className="w-20 border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white outline-none focus:border-cyan-400/60"
                      />
                      <span className="w-14 text-right font-[var(--font-mono)] text-xs" style={{ color: meta.color }}>
                        {chance.toFixed(chance < 0.01 && chance > 0 ? 2 : 1)}%
                      </span>
                      <button
                        onClick={() => removeRow(idx)}
                        aria-label="Удалить предмет"
                        className="flex h-7 w-7 items-center justify-center text-[var(--color-mist)] transition-colors hover:text-rose-300"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                        </svg>
                      </button>
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
            </div>

            {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}

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
    </div>
  );
}
