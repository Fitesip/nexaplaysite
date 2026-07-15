"use client";

/** Admin tab for managing promo codes: create, toggle active, delete. Admins only. */
import { useEffect, useState, FormEvent } from "react";
import Field from "./Field";

type PromoCode = {
  id: number;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  min_subtotal: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
};

const emptyForm = {
  code: "",
  discountType: "percent" as "percent" | "fixed",
  discountValue: "10",
  maxUses: "",
  minSubtotal: "0",
  expiresAt: "",
  active: true,
};

export default function AdminPromocodes() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    const res = await fetch("/api/admin/promocodes", { cache: "no-store" });
    const data = await res.json();
    setCodes(data.codes ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const discountValue = Number(form.discountValue);
    if (!form.code.trim()) {
      setError("Введите промокод");
      return;
    }
    if (!Number.isInteger(discountValue) || discountValue <= 0) {
      setError("Размер скидки должен быть целым числом больше нуля");
      return;
    }
    if (form.discountType === "percent" && discountValue > 100) {
      setError("Процентная скидка не может быть больше 100%");
      return;
    }

    setSaving(true);
    const payload = {
      code: form.code.trim(),
      discountType: form.discountType,
      discountValue,
      maxUses: form.maxUses.trim() ? Number(form.maxUses) : null,
      minSubtotal: form.minSubtotal.trim() ? Number(form.minSubtotal) : 0,
      expiresAt: form.expiresAt.trim() ? form.expiresAt : null,
      active: form.active,
    };

    try {
      const res = await fetch("/api/admin/promocodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ошибка сохранения");
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: PromoCode) => {
    setBusyId(item.id);
    try {
      await fetch(`/api/admin/promocodes/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !item.active }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (item: PromoCode) => {
    if (!confirm(`Удалить промокод «${item.code}» без возможности восстановления?`)) return;
    setBusyId(item.id);
    try {
      await fetch(`/api/admin/promocodes/${item.id}`, { method: "DELETE" });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const fmtDiscount = (c: PromoCode) =>
    c.discount_type === "percent" ? `${c.discount_value}%` : `${c.discount_value} ₽`;

  const isExpired = (c: PromoCode) => c.expires_at !== null && new Date(c.expires_at).getTime() < Date.now();
  const isUsedUp = (c: PromoCode) => c.max_uses !== null && c.used_count >= c.max_uses;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <form onSubmit={submit} className="glass-panel pixel-corner h-fit p-6">
        <h3 className="font-[var(--font-display)] text-lg font-semibold text-white">Новый промокод</h3>

        <div className="mt-4 flex flex-col gap-3">
          <Field label="Промокод">
            <input
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              maxLength={40}
              placeholder="НАПРИМЕР, SUMMER25"
              className="w-full border border-white/10 bg-black/30 px-3 py-2 text-sm uppercase text-white outline-none focus:border-cyan-400/60"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Тип скидки">
              <select
                value={form.discountType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, discountType: e.target.value as "percent" | "fixed" }))
                }
                className="w-full border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
              >
                <option value="percent">Процент (%)</option>
                <option value="fixed">Фикс. сумма (₽)</option>
              </select>
            </Field>
            <Field label={form.discountType === "percent" ? "Скидка, %" : "Скидка, ₽"}>
              <input
                type="number"
                min={1}
                value={form.discountValue}
                onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
                className="w-full border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Лимит использований">
              <input
                type="number"
                min={1}
                value={form.maxUses}
                onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
                placeholder="без лимита"
                className="w-full border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
              />
            </Field>
            <Field label="Мин. сумма заказа, ₽">
              <input
                type="number"
                min={0}
                value={form.minSubtotal}
                onChange={(e) => setForm((f) => ({ ...f, minSubtotal: e.target.value }))}
                className="w-full border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
              />
            </Field>
          </div>

          <Field label="Действует до (необязательно)">
            <input
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
              className="w-full border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
            />
          </Field>

          <label className="flex items-center gap-2 text-sm text-[var(--color-mist)]">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              className="h-4 w-4"
            />
            Активен сразу после создания
          </label>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <button
            disabled={saving}
            className="pixel-corner mt-1 bg-gradient-to-r from-violet-600 to-cyan-500 py-2.5 font-[var(--font-display)] text-sm font-semibold text-white shadow-[var(--shadow-glow-cyan)] transition-transform duration-300 hover:scale-[1.02] disabled:opacity-60"
          >
            {saving ? "Создаём…" : "Создать промокод"}
          </button>
        </div>
      </form>

      <div className="glass-panel pixel-corner overflow-x-auto">
        {loading ? (
          <p className="p-6 text-center text-sm text-[var(--color-mist)]">Загрузка промокодов…</p>
        ) : codes.length === 0 ? (
          <p className="p-6 text-center text-sm text-[var(--color-mist)]">Промокодов пока нет.</p>
        ) : (
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-[var(--color-mist)]">
                <th className="px-4 py-3 font-medium">Промокод</th>
                <th className="px-4 py-3 font-medium">Скидка</th>
                <th className="px-4 py-3 font-medium">Использовано</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.id} className="border-b border-white/5 last:border-b-0">
                  <td className="px-4 py-3">
                    <div className="font-[var(--font-display)] font-semibold text-white">{c.code}</div>
                    <div className="text-xs text-[var(--color-mist)]">
                      {c.min_subtotal > 0 ? `от ${c.min_subtotal} ₽` : "без мин. суммы"}
                      {c.expires_at ? ` · до ${new Date(c.expires_at).toLocaleDateString("ru-RU")}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white">{fmtDiscount(c)}</td>
                  <td className="px-4 py-3 text-[var(--color-mist)]">
                    {c.used_count}
                    {c.max_uses !== null ? ` / ${c.max_uses}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    {!c.active ? (
                      <span className="border border-white/15 px-2 py-1 text-xs text-[var(--color-mist)]">
                        Выключен
                      </span>
                    ) : isExpired(c) ? (
                      <span className="border border-amber-400/40 px-2 py-1 text-xs text-amber-300">Истёк</span>
                    ) : isUsedUp(c) ? (
                      <span className="border border-amber-400/40 px-2 py-1 text-xs text-amber-300">
                        Лимит исчерпан
                      </span>
                    ) : (
                      <span className="border border-emerald-400/40 px-2 py-1 text-xs text-emerald-300">
                        Активен
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => toggleActive(c)}
                        disabled={busyId === c.id}
                        className="border border-white/15 px-2.5 py-1.5 text-xs text-[var(--color-mist)] transition-colors duration-300 hover:text-white disabled:opacity-50"
                      >
                        {c.active ? "Выключить" : "Включить"}
                      </button>
                      <button
                        onClick={() => remove(c)}
                        disabled={busyId === c.id}
                        className="border border-white/15 px-2.5 py-1.5 text-xs text-[var(--color-mist)] transition-colors duration-300 hover:border-rose-400/50 hover:text-rose-300 disabled:opacity-50"
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
