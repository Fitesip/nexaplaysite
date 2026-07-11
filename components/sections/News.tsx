"use client";

import { useEffect, useState } from "react";

type NewsItem = {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  pinned: number | boolean;
  created_at: string;
};

export default function News() {
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then((d) => setItems(d.news ?? []))
      .catch(() => setError("Не удалось загрузить новости"));
  }, []);

  return (
    <div>
      <h2 className="font-[var(--font-display)] text-4xl font-bold">
        Новости <span className="grad-text">сервера</span>
      </h2>
      <p className="mt-3 max-w-2xl text-[var(--color-mist)]">
        Обновления, вайпы, технические работы и другие события — всё в одном месте.
      </p>

      {error && <p className="mt-8 text-sm text-rose-400">{error}</p>}

      {items === null && !error && (
        <p className="mt-8 text-sm text-[var(--color-mist)]">Загрузка…</p>
      )}

      {items && items.length === 0 && (
        <p className="mt-8 text-sm text-[var(--color-mist)]">Пока новостей нет — загляните позже.</p>
      )}

      <div className="mt-8 flex flex-col gap-3">
        {items?.map((item, idx) => {
          const isOpen = open === item.id;
          return (
            <div
              key={item.id}
              className="section-enter glass-panel pixel-corner overflow-hidden"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <button
                onClick={() => setOpen(isOpen ? null : item.id)}
                className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {!!item.pinned && (
                      <span className="bg-gradient-to-r from-violet-600 to-cyan-500 px-2 py-0.5 font-[var(--font-mono)] text-[10px] uppercase tracking-wide text-white">
                        Закреплено
                      </span>
                    )}
                    <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-mist)]/70">
                      {new Date(item.created_at).toLocaleDateString("ru-RU", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <h3 className="mt-2 font-[var(--font-display)] text-lg font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--color-mist)]">{item.excerpt}</p>
                </div>
                <span
                  className={`shrink-0 font-[var(--font-mono)] text-xl text-cyan-300 transition-transform duration-500 ${
                    isOpen ? "rotate-45" : ""
                  }`}
                >
                  +
                </span>
              </button>
              <div
                className="grid transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <p className="px-5 pb-5 text-sm leading-relaxed text-[var(--color-mist)]">{item.content}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
