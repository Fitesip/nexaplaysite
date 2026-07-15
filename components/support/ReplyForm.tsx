"use client";

import { useState, FormEvent } from "react";
import MediaPicker, { PendingFileChips } from "./MediaPicker";

/**
 * Shared reply box: a text field plus optional media attachments (now allowed
 * on any follow-up message, not just when opening the ticket). Either the
 * text or at least one file is required, so a photo-only reply is fine.
 *
 * Collecting the input is all this component does — sending it (and any
 * optimistic-UI bookkeeping) is delegated to `onSend`, since the user thread
 * and the admin ticket segment each keep their message list differently.
 */
export default function ReplyForm({
  onSend,
  placeholder = "Ваш ответ…",
}: {
  onSend: (text: string, files: File[]) => Promise<void>;
  placeholder?: string;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [pickerError, setPickerError] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem("message") as HTMLInputElement;
    const text = input.value.trim();
    if (!text && files.length === 0) {
      setError("Напишите сообщение или прикрепите файл");
      return;
    }

    setSending(true);
    setError("");
    try {
      await onSend(text, files);
      input.value = "";
      setFiles([]);
      setPickerError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка отправки");
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <MediaPicker
          files={files}
          onChange={(next, err) => {
            setFiles(next);
            setPickerError(err);
          }}
          hideChips
        />
        <input
          name="message"
          autoComplete="off"
          placeholder={placeholder}
          className="min-w-0 flex-1 border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition-colors duration-300 focus:border-cyan-400/60"
        />
        <button
          disabled={sending}
          className="pixel-corner shrink-0 bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-2 font-[var(--font-display)] text-sm font-semibold text-white shadow-[var(--shadow-glow-cyan)] transition-transform duration-300 hover:scale-[1.03] disabled:opacity-60"
        >
          {sending ? "…" : "Отправить"}
        </button>
      </div>

      {pickerError && <p className="text-xs text-rose-400">{pickerError}</p>}
      {files.length > 0 && (
        <PendingFileChips files={files} onRemove={(idx) => setFiles((f) => f.filter((_, i) => i !== idx))} />
      )}

      {error && <p className="text-sm text-rose-400">{error}</p>}
    </form>
  );
}
