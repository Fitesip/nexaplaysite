"use client";

/** Forum landing view: category/tag filters, sort order, and the list of topics. */
import { useEffect, useState } from "react";
import UserMeta, { formatDateTime } from "./UserMeta";
import CategoryPill from "./CategoryPill";
import SortButton from "./SortButton";
import { pluralAnswers } from "@/lib/pluralize";

type Category = { id: number; slug: string; name: string; description: string | null; topic_count: number };
type Tag = { id: number; name: string; topic_count: number };
type Topic = {
  id: number;
  title: string;
  excerpt: string;
  pinned: boolean;
  created_at: string;
  comment_count: number;
  author: {
    id: number;
    username: string;
    created_at: string;
    avatar_url: string | null;
    minecraft_uuid: string | null;
    minecraft_username: string | null;
  };
  category: { id: number; slug: string; name: string };
  tags: { id: number; name: string }[];
};

export default function TopicList({
  onOpenTopic,
  onNewTopic,
}: {
  onOpenTopic: (id: number) => void;
  onNewTopic: () => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sort, setSort] = useState<"new" | "discussed">("new");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [topics, setTopics] = useState<Topic[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/forum/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => {});
    fetch("/api/forum/tags")
      .then((r) => r.json())
      .then((d) => setTags(d.tags ?? []))
      .catch(() => {});
  }, []);

  // debounce free-text search so we don't fire a request on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [activeCategory, activeTag, sort, search]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (activeCategory) params.set("category", activeCategory);
    if (activeTag) params.set("tag", activeTag);
    if (search) params.set("search", search);
    params.set("sort", sort);
    params.set("page", String(page));

    setTopics(null);
    fetch(`/api/forum/topics?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setTopics(d.topics ?? []);
        setTotal(d.total ?? 0);
      })
      .catch(() => setError("Не удалось загрузить темы"));
  }, [activeCategory, activeTag, sort, page, search]);

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-[var(--font-display)] text-4xl font-bold">
            Форум <span className="grad-text">сообщества</span>
          </h2>
          <p className="mt-3 max-w-2xl text-[var(--color-mist)]">
            Обсуждайте механики, задавайте технические вопросы и предлагайте идеи — всё в одном месте.
          </p>
        </div>
        <button
          onClick={onNewTopic}
          className="pixel-corner shrink-0 bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-2.5 font-[var(--font-display)] text-sm font-semibold text-white shadow-[var(--shadow-glow-cyan)] transition-transform duration-300 hover:-translate-y-0.5"
        >
          + Новая тема
        </button>
      </div>

      {/* Search */}
      <div className="relative mt-6 max-w-md">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-mist)]/60"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Поиск по темам…"
          className="w-full border border-white/10 bg-black/20 py-2.5 pl-9 pr-9 text-sm text-white outline-none transition-colors focus:border-cyan-400/50"
        />
        {searchInput && (
          <button
            onClick={() => setSearchInput("")}
            aria-label="Очистить поиск"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-mist)]/60 transition-colors hover:text-white"
          >
            ✕
          </button>
        )}
      </div>

      {/* Category tabs */}
      <div className="mt-4 flex flex-wrap gap-2">
        <CategoryPill
          label="Все темы"
          active={activeCategory === null}
          onClick={() => setActiveCategory(null)}
        />
        {categories.map((c) => (
          <CategoryPill
            key={c.id}
            label={`${c.name} (${c.topic_count})`}
            active={activeCategory === c.slug}
            onClick={() => setActiveCategory(c.slug)}
          />
        ))}
      </div>

      {/* Tag filter + sort */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {activeTag && (
            <button
              onClick={() => setActiveTag(null)}
              className="font-[var(--font-mono)] text-xs text-cyan-300 hover:text-cyan-200"
            >
              # {activeTag} ✕
            </button>
          )}
          {!activeTag &&
            tags.slice(0, 10).map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTag(t.name)}
                className="font-[var(--font-mono)] text-xs text-[var(--color-mist)]/80 transition-colors hover:text-cyan-300"
              >
                #{t.name}
              </button>
            ))}
        </div>

        <div className="flex items-center gap-1 font-[var(--font-mono)] text-xs">
          <SortButton label="Новые" active={sort === "new"} onClick={() => setSort("new")} />
          <SortButton label="Обсуждаемые" active={sort === "discussed"} onClick={() => setSort("discussed")} />
        </div>
      </div>

      {error && <p className="mt-8 text-sm text-rose-400">{error}</p>}

      {topics === null && !error && <p className="mt-8 text-sm text-[var(--color-mist)]">Загрузка…</p>}

      {topics && topics.length === 0 && (
        <p className="mt-8 text-sm text-[var(--color-mist)]">
          {search ? `Ничего не найдено по запросу «${search}».` : "Тем пока нет — станьте первым, кто напишет."}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {topics?.map((topic, idx) => (
          <button
            key={topic.id}
            onClick={() => onOpenTopic(topic.id)}
            className="section-enter glass-panel pixel-corner flex flex-col gap-3 p-5 text-left transition-colors duration-300 hover:border-cyan-400/40 sm:flex-row sm:items-center sm:justify-between"
            style={{ animationDelay: `${idx * 40}ms` }}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {topic.pinned && (
                  <span className="bg-gradient-to-r from-violet-600 to-cyan-500 px-2 py-0.5 font-[var(--font-mono)] text-[10px] uppercase tracking-wide text-white">
                    Закреплено
                  </span>
                )}
                <span className="border border-white/10 px-2 py-0.5 font-[var(--font-mono)] text-[10px] uppercase tracking-wide text-cyan-300/90">
                  {topic.category.name}
                </span>
                {topic.tags.map((t) => (
                  <span key={t.id} className="font-[var(--font-mono)] text-[11px] text-[var(--color-mist)]/70">
                    #{t.name}
                  </span>
                ))}
              </div>
              <h3 className="mt-2 truncate font-[var(--font-display)] text-lg font-semibold text-white">
                {topic.title}
              </h3>
              <p className="mt-1 line-clamp-2 text-sm text-[var(--color-mist)]">{topic.excerpt}</p>
              <div className="mt-3 flex flex-col gap-1.5">
                <UserMeta
                  username={topic.author.username}
                  joinedAt={topic.author.created_at}
                  avatarUrl={topic.author.avatar_url}
                  minecraftUuid={topic.author.minecraft_uuid}
                  minecraftUsername={topic.author.minecraft_username}
                  size="sm"
                />
                <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-mist)]/60">
                  {formatDateTime(topic.created_at)}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 self-start sm:flex-col sm:items-end sm:self-center">
              <span className="font-[var(--font-display)] text-xl font-bold text-white">{topic.comment_count}</span>
              <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-mist)]/70">
                {pluralAnswers(topic.comment_count)}
              </span>
            </div>
          </button>
        ))}
      </div>

      {topics && totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3 font-[var(--font-mono)] text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 text-[var(--color-mist)] transition-colors hover:text-white disabled:opacity-30"
          >
            ← Назад
          </button>
          <span className="text-[var(--color-mist)]/70">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1.5 text-[var(--color-mist)] transition-colors hover:text-white disabled:opacity-30"
          >
            Вперёд →
          </button>
        </div>
      )}
    </div>
  );
}
