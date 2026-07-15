"use client";

/** Form for starting a new forum topic: title, category, tags, and body, with a live preview. */
import { useEffect, useState, FormEvent, KeyboardEvent } from "react";
import { useAuth } from "@/lib/auth-context";

type Category = { id: number; slug: string; name: string; description: string | null };
type PopularTag = { id: number; name: string; topic_count: number };

export default function NewTopicForm({
  onCreated,
  onCancel,
}: {
  onCreated: (topicId: number) => void;
  onCancel: () => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [popularTags, setPopularTags] = useState<PopularTag[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetch("/api/forum/categories")
      .then((r) => r.json())
      .then((d) => {
        setCategories(d.categories ?? []);
        if (d.categories?.[0]) setCategoryId(d.categories[0].id);
      })
      .catch(() => setError("Не удалось загрузить категории"));
  }, []);

  // Suggest the top-5 most-used tags within the selected category.
  useEffect(() => {
    if (!categoryId) {
      setPopularTags([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/forum/tags?category=${categoryId}&limit=5`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setPopularTags(d.tags ?? []);
      })
      .catch(() => {
        if (!cancelled) setPopularTags([]);
      });
    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  const addTag = (raw: string) => {
    const value = raw.trim().toLowerCase().replace(/^#/, "");
    if (!value) return;
    if (tags.includes(value)) return;
    if (tags.length >= 5) return;
    setTags((t) => [...t, value]);
    setTagInput("");
  };

  const onTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === "Backspace" && !tagInput && tags.length) {
      setTags((t) => t.slice(0, -1));
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!categoryId) {
      setError("Выберите категорию");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/forum/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_id: categoryId, title, body, tags }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Не удалось создать тему");
        return;
      }
      onCreated(data.id);
    } catch {
      setError("Не удалось создать тему");
    } finally {
      setSubmitting(false);
    }
  };

  if (user?.forum_banned || (user && !user.minecraft_username)) {
    return (
      <div className="mx-auto max-w-2xl">
        <button
          onClick={onCancel}
          className="mb-6 font-[var(--font-mono)] text-xs text-[var(--color-mist)] transition-colors hover:text-white"
        >
          ← Назад к форуму
        </button>
        <div className="glass-panel pixel-corner border-rose-400/20 p-6 text-center sm:p-8">
          <p className="text-sm text-[var(--color-mist)]">
            {user?.forum_banned
              ? `Вы заблокированы на форуме${
                  user.forum_banned_until ? ` до ${new Date(user.forum_banned_until).toLocaleString("ru-RU")}` : ""
                }.`
              : "Привяжите Minecraft-аккаунт в личном кабинете, чтобы создавать темы."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={onCancel}
        className="mb-6 font-[var(--font-mono)] text-xs text-[var(--color-mist)] transition-colors hover:text-white"
      >
        ← Назад к форуму
      </button>

      <div className="glass-panel pixel-corner p-6 sm:p-8">
        <h2 className="font-[var(--font-display)] text-2xl font-bold text-white">Новая тема</h2>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-5">
          <div>
            <label className="mb-2 block font-[var(--font-mono)] text-xs uppercase tracking-wide text-[var(--color-mist)]/70">
              Категория
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setCategoryId(c.id)}
                  className={`pixel-corner px-3.5 py-2 font-[var(--font-display)] text-sm transition-all duration-300 ${
                    categoryId === c.id
                      ? "bg-gradient-to-r from-violet-600 to-cyan-500 text-white"
                      : "border border-white/10 text-[var(--color-mist)] hover:text-white"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block font-[var(--font-mono)] text-xs uppercase tracking-wide text-[var(--color-mist)]/70">
              Заголовок
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={150}
              placeholder="Коротко опишите суть темы"
              className="w-full border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-cyan-400/50"
            />
          </div>

          <div>
            <label className="mb-2 block font-[var(--font-mono)] text-xs uppercase tracking-wide text-[var(--color-mist)]/70">
              Текст темы
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={8000}
              rows={7}
              placeholder="Опишите вопрос или тему подробнее…"
              className="w-full resize-y border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-cyan-400/50"
            />
          </div>

          <div>
            <label className="mb-2 block font-[var(--font-mono)] text-xs uppercase tracking-wide text-[var(--color-mist)]/70">
              Теги (до 5, Enter чтобы добавить)
            </label>
            <div className="flex flex-wrap items-center gap-2 border border-white/10 bg-black/20 px-3 py-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="flex items-center gap-1 bg-white/5 px-2 py-1 font-[var(--font-mono)] text-xs text-cyan-300"
                >
                  #{t}
                  <button type="button" onClick={() => setTags((ts) => ts.filter((x) => x !== t))} className="text-[var(--color-mist)] hover:text-rose-300">
                    ✕
                  </button>
                </span>
              ))}
              {tags.length < 5 && (
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={onTagKeyDown}
                  onBlur={() => addTag(tagInput)}
                  placeholder="тег…"
                  className="min-w-[100px] flex-1 bg-transparent py-1 text-sm text-white outline-none"
                />
              )}
            </div>

            {tags.length < 5 &&
              (() => {
                const q = tagInput.trim().toLowerCase().replace(/^#/, "");
                const suggestions = popularTags.filter(
                  (t) => !tags.includes(t.name) && (!q || t.name.includes(q))
                );
                if (suggestions.length === 0) return null;
                return (
                  <div className="mt-2">
                    <p className="mb-1.5 font-[var(--font-mono)] text-[11px] text-[var(--color-mist)]/60">
                      Популярные теги в этой категории:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((t) => (
                        <button
                          type="button"
                          key={t.id}
                          onClick={() => addTag(t.name)}
                          className="pixel-corner flex items-center gap-1.5 border border-white/10 px-2.5 py-1 font-[var(--font-mono)] text-xs text-[var(--color-mist)] transition-colors hover:border-cyan-400/50 hover:text-white"
                        >
                          <span className="text-cyan-300">#{t.name}</span>
                          <span className="text-[10px] text-[var(--color-mist)]/60">{t.topic_count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
          </div>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !title.trim() || !body.trim()}
            className="pixel-corner mt-1 bg-gradient-to-r from-violet-600 to-cyan-500 px-6 py-3 font-[var(--font-display)] text-sm font-semibold text-white shadow-[var(--shadow-glow-cyan)] transition-transform duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Публикация…" : "Опубликовать тему"}
          </button>
        </form>
      </div>
    </div>
  );
}
