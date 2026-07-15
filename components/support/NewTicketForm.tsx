"use client";

import { useState, FormEvent } from "react";
import MediaPicker from "./MediaPicker";

/**
 * "Новый тикет" form: a short freeform subject, the full description, and
 * optionally several media files (screenshots/clips). Submits as
 * multipart/form-data straight to POST /api/support/tickets.
 */
export default function NewTicketForm({
  onCreated,
  onCancel,
}: {
  onCreated: (ticketId: number) => void;
  onCancel: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [pickerError, setPickerError] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const subject = (form.elements.namedItem("subject") as HTMLInputElement).value.trim();
    const body = (form.elements.namedItem("body") as HTMLTextAreaElement).value.trim();
    if (!subject || !body) return;

    setSubmitting(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("subject", subject);
      formData.append("body", body);
      for (const f of files) formData.append("files", f);

      const res = await fetch("/api/support/tickets", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Не удалось создать тикет");
      onCreated(data.ticket.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <button
        type="button"
        onClick={onCancel}
        className="w-fit font-[var(--font-mono)] text-xs text-[var(--color-mist)] transition-colors hover:text-white"
      >
        ← Назад к обращениям
      </button>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-[var(--color-mist)]">Тема обращения</label>
        <input
          name="subject"
          required
          maxLength={200}
          placeholder="Например: не выдалась привилегия"
          className="border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition-colors duration-300 focus:border-cyan-400/60"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-[var(--color-mist)]">Опишите проблему подробно</label>
        <textarea
          name="body"
          required
          rows={4}
          maxLength={4000}
          placeholder="Что произошло, когда, ваш ник в игре…"
          className="w-full resize-y border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition-colors duration-300 focus:border-cyan-400/60"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-[var(--color-mist)]">Медиафайлы (необязательно)</label>
        <MediaPicker
          files={files}
          onChange={(next, err) => {
            setFiles(next);
            setPickerError(err);
          }}
        />
        {pickerError && <p className="text-xs text-rose-400">{pickerError}</p>}
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <button
        disabled={submitting}
        className="pixel-corner mt-1 bg-gradient-to-r from-violet-600 to-cyan-500 py-2.5 font-[var(--font-display)] text-sm font-semibold text-white shadow-[var(--shadow-glow-cyan)] transition-transform duration-300 hover:scale-[1.02] disabled:opacity-60"
      >
        {submitting ? "Отправляем…" : "Создать тикет"}
      </button>
    </form>
  );
}
