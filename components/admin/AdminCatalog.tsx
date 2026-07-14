"use client";

/** Admin tab for managing shop items: create/edit/hide/delete, per game mode, one-time-purchase toggle. */
import { Fragment, useEffect, useMemo, useState, FormEvent } from "react";
import { GAME_MODES, type GameMode } from "@/components/gameModes";
import Field from "./Field";

type Item = {
  id: number;
  name: string;
  category: string;
  game_mode: GameMode;
  price: number;
  stock: number | null;
  hidden: boolean;
  one_time_purchase: boolean;
  description: string;
  created_at: string;
};

const emptyForm = {
  name: "",
  category: "",
  gameMode: GAME_MODES[0].id as GameMode,
  price: "",
  description: "",
  limited: false,
  stock: "",
  oneTimePurchase: false,
};

export default function AdminCatalog() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busyId, setBusyId] = useState<number | null>(null);

  // The API returns items in insertion order, mixing every mode together — group them by
  // game mode (in the site's canonical mode order) so the table reads mode by mode instead
  // of being scattered, with items inside each mode sorted by category then name.
  const groupedItems = useMemo(() => {
    const byMode = new Map<GameMode, Item[]>();
    for (const item of items) {
      if (!byMode.has(item.game_mode)) byMode.set(item.game_mode, []);
      byMode.get(item.game_mode)!.push(item);
    }
    for (const group of byMode.values()) {
      group.sort(
        (a, b) => a.category.localeCompare(b.category, "ru") || a.name.localeCompare(b.name, "ru")
      );
    }
    return GAME_MODES.map((m) => ({ mode: m, items: byMode.get(m.id) ?? [] })).filter(
      (g) => g.items.length > 0
    );
  }, [items]);

  const load = async () => {
    const res = await fetch("/api/admin/catalog", { cache: "no-store" });
    const data = await res.json();
    setItems(data.items ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const startEdit = (item: Item) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      category: item.category,
      gameMode: item.game_mode,
      price: String(item.price),
      description: item.description ?? "",
      limited: item.stock !== null,
      stock: item.stock !== null ? String(item.stock) : "",
      oneTimePurchase: item.one_time_purchase,
    });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const price = Number(form.price);
    if (!form.name.trim() || !form.category.trim() || !Number.isFinite(price) || price < 0) {
      setError("Заполните название, категорию и корректную цену");
      return;
    }
    if (form.limited && (form.stock.trim() === "" || Number(form.stock) < 0)) {
      setError("Укажите корректное количество товара");
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      gameMode: form.gameMode,
      price,
      description: form.description.trim(),
      stock: form.limited ? Number(form.stock) : null,
      oneTimePurchase: form.oneTimePurchase,
    };

    try {
      const res = await fetch(editingId ? `/api/admin/catalog/${editingId}` : "/api/admin/catalog", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ошибка сохранения");
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const toggleHidden = async (item: Item) => {
    setBusyId(item.id);
    try {
      await fetch(`/api/admin/catalog/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden: !item.hidden }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (item: Item) => {
    if (!confirm(`Удалить товар «${item.name}» без возможности восстановления?`)) return;
    setBusyId(item.id);
    try {
      await fetch(`/api/admin/catalog/${item.id}`, { method: "DELETE" });
      if (editingId === item.id) {
        setEditingId(null);
        setForm(emptyForm);
      }
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <form onSubmit={submit} className="glass-panel pixel-corner h-fit self-start p-6 lg:sticky lg:top-28">
        <h3 className="font-[var(--font-display)] text-lg font-semibold text-white">
          {editingId ? "Редактировать товар" : "Новый товар"}
        </h3>

        <div className="mt-4 flex flex-col gap-3">
          <Field label="Название">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
            />
          </Field>
          <Field label="Категория">
            <input
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="Привилегии, Косметика, Наборы…"
              className="w-full border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
            />
          </Field>
          <Field label="Режим">
            <select
              value={form.gameMode}
              onChange={(e) => setForm((f) => ({ ...f, gameMode: e.target.value as GameMode }))}
              className="w-full border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
            >
              {GAME_MODES.map((m) => (
                <option key={m.id} value={m.id} className="bg-[#0a0a12]">
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Цена, ₽">
            <input
              type="number"
              min={0}
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              className="w-full border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
            />
          </Field>
          <Field label="Описание">
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full resize-none border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
            />
          </Field>

          <label className="flex items-center gap-2 text-sm text-[var(--color-mist)]">
            <input
              type="checkbox"
              checked={form.limited}
              onChange={(e) => setForm((f) => ({ ...f, limited: e.target.checked }))}
              className="h-4 w-4"
            />
            Ограниченное количество
          </label>

          {form.limited && (
            <Field label="Количество на складе">
              <input
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                className="w-full border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
              />
            </Field>
          )}

          <label className="flex items-center gap-2 text-sm text-[var(--color-mist)]">
            <input
              type="checkbox"
              checked={form.oneTimePurchase}
              onChange={(e) => setForm((f) => ({ ...f, oneTimePurchase: e.target.checked }))}
              className="h-4 w-4"
            />
            Одноразовый товар (один аккаунт — одна покупка)
          </label>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <div className="mt-1 flex gap-2">
            <button
              disabled={saving}
              className="pixel-corner flex-1 bg-gradient-to-r from-violet-600 to-cyan-500 py-2.5 font-[var(--font-display)] text-sm font-semibold text-white shadow-[var(--shadow-glow-cyan)] transition-transform duration-300 hover:scale-[1.02] disabled:opacity-60"
            >
              {saving ? "Сохраняем…" : editingId ? "Сохранить изменения" : "Добавить товар"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={startCreate}
                className="border border-white/15 px-4 py-2.5 text-sm text-[var(--color-mist)] transition-colors duration-300 hover:text-white"
              >
                Отмена
              </button>
            )}
          </div>
        </div>
      </form>

      <div className="glass-panel pixel-corner overflow-x-auto">
        {loading ? (
          <p className="p-6 text-center text-sm text-[var(--color-mist)]">Загрузка каталога…</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-sm text-[var(--color-mist)]">Товаров пока нет.</p>
        ) : (
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-[var(--color-mist)]">
                <th className="px-4 py-3 font-medium">Товар</th>
                <th className="px-4 py-3 font-medium">Цена</th>
                <th className="px-4 py-3 font-medium">Кол-во</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {groupedItems.map(({ mode, items: modeItems }) => (
                <Fragment key={mode.id}>
                  <tr className="border-b border-white/10 bg-white/[0.03]">
                    <td colSpan={5} className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 shrink-0 pixel-corner-sm" style={{ background: mode.gradient }} />
                        <span
                          className="font-[var(--font-display)] text-xs font-semibold uppercase tracking-wide"
                          style={{ color: mode.accent }}
                        >
                          {mode.label}
                        </span>
                      </div>
                    </td>
                  </tr>
                  {modeItems.map((item) => (
                    <tr key={item.id} className="border-b border-white/5 last:border-b-0">
                      <td className="px-4 py-3">
                        <div className="font-[var(--font-display)] font-semibold text-white">{item.name}</div>
                        <div className="text-xs text-[var(--color-mist)]">{item.category}</div>
                      </td>
                      <td className="px-4 py-3 text-white">{item.price} ₽</td>
                      <td className="px-4 py-3 text-[var(--color-mist)]">
                        {item.stock === null ? "∞" : item.stock}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {item.hidden ? (
                            <span className="border border-white/15 px-2 py-1 text-xs text-[var(--color-mist)]">Скрыт</span>
                          ) : (
                            <span className="border border-emerald-400/40 px-2 py-1 text-xs text-emerald-300">Виден</span>
                          )}
                          {item.one_time_purchase && (
                            <span className="border border-cyan-400/40 px-2 py-1 text-xs text-cyan-300">1 на аккаунт</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => startEdit(item)}
                            className="border border-white/15 px-2.5 py-1.5 text-xs text-[var(--color-mist)] transition-colors duration-300 hover:border-cyan-400/50 hover:text-white"
                          >
                            Изменить
                          </button>
                          <button
                            onClick={() => toggleHidden(item)}
                            disabled={busyId === item.id}
                            className="border border-white/15 px-2.5 py-1.5 text-xs text-[var(--color-mist)] transition-colors duration-300 hover:text-white disabled:opacity-50"
                          >
                            {item.hidden ? "Показать" : "Скрыть"}
                          </button>
                          <button
                            onClick={() => remove(item)}
                            disabled={busyId === item.id}
                            className="border border-white/15 px-2.5 py-1.5 text-xs text-[var(--color-mist)] transition-colors duration-300 hover:border-rose-400/50 hover:text-rose-300 disabled:opacity-50"
                          >
                            Удалить
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
