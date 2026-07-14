"use client";

/** Admin tab for forum moderation: reviewing and resolving reported topics/comments. */
import { useEffect, useState } from "react";

type Report = {
  id: number;
  reason: string;
  status: "open";
  created_at: string;
  reporter_name: string;
  target: { type: "topic" | "comment"; id: number; topicId?: number; excerpt: string | null; deleted: boolean };
  target_author: { id: number; username: string } | null;
};

export default function AdminForum() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    const res = await fetch("/api/admin/forum/reports", { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? "Не удалось загрузить жалобы");
    } else {
      setReports(data.reports ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (id: number, action: "dismiss" | "delete_post") => {
    if (action === "delete_post" && !confirm("Удалить пост навсегда? Это действие необратимо.")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/forum/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) setReports((rs) => rs.filter((r) => r.id !== id));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <p className="text-sm text-[var(--color-mist)]">Загрузка…</p>;
  if (error) return <p className="text-sm text-rose-400">{error}</p>;

  return (
    <div>
      <h3 className="font-[var(--font-display)] text-lg font-semibold text-white">
        Жалобы на форуме <span className="text-[var(--color-mist)]/60">({reports.length})</span>
      </h3>

      {reports.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--color-mist)]">Открытых жалоб нет — всё чисто.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {reports.map((r) => (
            <div key={r.id} className="glass-panel pixel-corner p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="border border-white/10 px-2 py-0.5 font-[var(--font-mono)] text-[10px] uppercase tracking-wide text-cyan-300/90">
                  {r.target.type === "topic" ? "Тема" : "Комментарий"}
                </span>
                <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-mist)]/60">
                  {new Date(r.created_at).toLocaleString("ru-RU")}
                </span>
              </div>

              <p className="mt-2 text-sm text-white">
                Автор поста: <span className="text-cyan-300">{r.target_author?.username ?? "удалён"}</span>
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-[var(--color-mist)]">
                {r.target.excerpt ?? "Пост уже удалён"}
              </p>

              <p className="mt-3 text-sm text-[var(--color-mist)]">
                Жалоба от <span className="text-white">{r.reporter_name}</span>: «{r.reason}»
              </p>

              <div className="mt-4 flex gap-3">
                <button
                  disabled={busyId === r.id}
                  onClick={() => act(r.id, "delete_post")}
                  className="pixel-corner border border-rose-400/40 px-4 py-1.5 text-xs text-rose-300 transition-colors hover:bg-rose-400/10 disabled:opacity-40"
                >
                  Удалить пост
                </button>
                <button
                  disabled={busyId === r.id}
                  onClick={() => act(r.id, "dismiss")}
                  className="pixel-corner border border-white/10 px-4 py-1.5 text-xs text-[var(--color-mist)] transition-colors hover:border-cyan-400/40 hover:text-white disabled:opacity-40"
                >
                  Отклонить жалобу
                </button>
                <button
                  onClick={() =>
                    (window.location.hash = `#forum/topic/${r.target.type === "topic" ? r.target.id : r.target.topicId}`)
                  }
                  className="ml-auto font-[var(--font-mono)] text-xs text-cyan-300 hover:text-cyan-200"
                >
                  Открыть тему →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
