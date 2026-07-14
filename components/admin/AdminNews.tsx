"use client";

/** Admin tab for managing news posts: create/edit/pin/delete. */
import { useEffect, useState, FormEvent } from "react";
import Field from "./Field";

type NewsItem = {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  pinned: number | boolean;
  created_at: string;
};

const emptyForm = { title: "", excerpt: "", content: "", pinned: false };

export default function AdminNews() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    const res = await fetch("/api/admin/news", { cache: "no-store" });
    const data = await res.json();
    setItems(data.news ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const startEdit = (item: NewsItem) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      excerpt: item.excerpt,
      content: item.content,
      pinned: !!item.pinned,
    });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim() || !form.excerpt.trim() || !form.content.trim()) {
      setError("Заполните заголовок, краткое описание и текст новости");
      return;
    }

    setSaving(true);
    const payload = {
      title: form.title.trim(),
      excerpt: form.excerpt.trim(),
      content: form.content.trim(),
      pinned: form.pinned,
    };

    try {
      const res = await fetch(editingId ? `/api/admin/news/${editingId}` : "/api/admin/news", {
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

  const togglePinned = async (item: NewsItem) => {
    setBusyId(item.id);
    try {
      await fetch(`/api/admin/news/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !item.pinned }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (item: NewsItem) => {
    if (!confirm(`Удалить новость «${item.title}» без возможности восстановления?`)) return;
    setBusyId(item.id);
    try {
      await fetch(`/api/admin/news/${item.id}`, { method: "DELETE" });
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
      <form onSubmit={submit} className="glass-panel pixel-corner h-fit p-6">
        <h3 className="font-[var(--font-display)] text-lg font-semibold text-white">
          {editingId ? "Редактировать новость" : "Новая новость"}
        </h3>

        <div className="mt-4 flex flex-col gap-3">
          <Field label="Заголовок">
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              maxLength={200}
              className="w-full border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
            />
          </Field>
          <Field label="Краткое описание">
            <textarea
              value={form.excerpt}
              onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
              maxLength={300}
              rows={2}
              placeholder="Показывается в свёрнутой карточке новости"
              className="w-full resize-none border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
            />
          </Field>
          <Field label="Текст новости">
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              rows={6}
              className="w-full resize-y border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
            />
          </Field>

          <label className="flex items-center gap-2 text-sm text-[var(--color-mist)]">
            <input
              type="checkbox"
              checked={form.pinned}
              onChange={(e) => setForm((f) => ({ ...f, pinned: e.target.checked }))}
              className="h-4 w-4"
            />
            Закрепить наверху ленты
          </label>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <div className="mt-1 flex gap-2">
            <button
              disabled={saving}
              className="pixel-corner flex-1 bg-gradient-to-r from-violet-600 to-cyan-500 py-2.5 font-[var(--font-display)] text-sm font-semibold text-white shadow-[var(--shadow-glow-cyan)] transition-transform duration-300 hover:scale-[1.02] disabled:opacity-60"
            >
              {saving ? "Сохраняем…" : editingId ? "Сохранить изменения" : "Опубликовать"}
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
          <p className="p-6 text-center text-sm text-[var(--color-mist)]">Загрузка новостей…</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-sm text-[var(--color-mist)]">Новостей пока нет.</p>
        ) : (
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-[var(--color-mist)]">
                <th className="px-4 py-3 font-medium">Новость</th>
                <th className="px-4 py-3 font-medium">Дата</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-white/5 last:border-b-0">
                  <td className="px-4 py-3">
                    <div className="font-[var(--font-display)] font-semibold text-white">{item.title}</div>
                    <div className="text-xs text-[var(--color-mist)]">{item.excerpt}</div>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-mist)]">
                    {new Date(item.created_at).toLocaleDateString("ru-RU")}
                  </td>
                  <td className="px-4 py-3">
                    {item.pinned ? (
                      <span className="border border-cyan-400/40 px-2 py-1 text-xs text-cyan-300">Закреплена</span>
                    ) : (
                      <span className="border border-white/15 px-2 py-1 text-xs text-[var(--color-mist)]">Обычная</span>
                    )}
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
                        onClick={() => togglePinned(item)}
                        disabled={busyId === item.id}
                        className="border border-white/15 px-2.5 py-1.5 text-xs text-[var(--color-mist)] transition-colors duration-300 hover:text-white disabled:opacity-50"
                      >
                        {item.pinned ? "Открепить" : "Закрепить"}
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
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
