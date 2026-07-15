"use client";

import { useEffect, useRef, useState } from "react";
import {
  SUPPORT_MAX_PHOTOS,
  SUPPORT_MAX_PHOTO_SIZE,
  SUPPORT_MAX_VIDEOS,
  SUPPORT_MAX_VIDEO_SIZE,
  SUPPORT_PHOTO_ACCEPT,
  SUPPORT_VIDEO_ACCEPT,
  isVideoMime,
} from "@/lib/support-media";

/**
 * Reusable "attach media" control. A single paperclip button opens a small
 * popover with two custom-styled options — photo or video — each of which
 * silently drives its own hidden, correctly-typed <input type="file"> (photos
 * and videos need different accept lists and size limits, so they can't share
 * one native input). Picked files show up as removable chips below.
 *
 * Enforces the shared per-kind count/size limits client-side for fast
 * feedback — the server re-validates regardless.
 */
export default function MediaPicker({
  files,
  onChange,
  hideChips = false,
}: {
  files: File[];
  onChange: (files: File[], error: string) => void;
  /** Skip rendering the selected-file chips here — used when the caller renders
   *  them itself (via `PendingFileChips`) in a different spot in the layout. */
  hideChips?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  const add = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const incoming = Array.from(list);
    const next = [...files, ...incoming];

    const nextPhotoCount = next.filter((f) => !isVideoMime(f.type)).length;
    const nextVideoCount = next.filter((f) => isVideoMime(f.type)).length;
    if (nextPhotoCount > SUPPORT_MAX_PHOTOS) {
      onChange(files, `Можно приложить не более ${SUPPORT_MAX_PHOTOS} фото`);
      return;
    }
    if (nextVideoCount > SUPPORT_MAX_VIDEOS) {
      onChange(files, `Можно приложить не более ${SUPPORT_MAX_VIDEOS} видео`);
      return;
    }
    for (const f of incoming) {
      const limit = isVideoMime(f.type) ? SUPPORT_MAX_VIDEO_SIZE : SUPPORT_MAX_PHOTO_SIZE;
      if (f.size > limit) {
        onChange(files, `Файл слишком большой: ${f.name} (максимум ${Math.floor(limit / 1024 / 1024)} МБ)`);
        return;
      }
    }
    onChange(next, "");
    setOpen(false);
  };

  const remove = (idx: number) => onChange(files.filter((_, i) => i !== idx), "");

  return (
    <div className="flex flex-col gap-2">
      <div ref={wrapRef} className="relative w-fit">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Прикрепить файл"
          aria-expanded={open}
          className={`pixel-corner-sm flex h-9 w-9 items-center justify-center border transition-colors duration-200 ${
            open
              ? "border-cyan-400/50 bg-white/5 text-cyan-300"
              : "border-white/10 text-[var(--color-mist)] hover:border-white/25 hover:text-white"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5">
            <path
              d="M17.5 8.4 9.7 16.2a3.2 3.2 0 0 1-4.5-4.5l7.8-7.8a2.2 2.2 0 0 1 3.1 3.1l-7.4 7.4a1.1 1.1 0 0 1-1.6-1.6l6.9-6.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {open && (
          <div className="glass-panel pixel-corner absolute bottom-full left-0 z-20 mb-2 flex w-44 flex-col gap-0.5 p-1.5">
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="flex items-center gap-2.5 px-2.5 py-2 text-left text-xs text-[var(--color-mist)] transition-colors duration-200 hover:bg-white/5 hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0">
                <rect x="3" y="5" width="18" height="14" rx="1.5" />
                <circle cx="9" cy="10.5" r="1.6" />
                <path d="m4 16.5 4.5-4 3.5 3 4-4.5L21 15" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Фото
              <span className="ml-auto font-[var(--font-mono)] text-[10px] text-[var(--color-mist)]/60">
                до {SUPPORT_MAX_PHOTOS}
              </span>
            </button>
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className="flex items-center gap-2.5 px-2.5 py-2 text-left text-xs text-[var(--color-mist)] transition-colors duration-200 hover:bg-white/5 hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0">
                <rect x="3" y="6" width="12" height="12" rx="1.5" />
                <path d="m15 10 6-3.5v11L15 14" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Видео
              <span className="ml-auto font-[var(--font-mono)] text-[10px] text-[var(--color-mist)]/60">
                до {SUPPORT_MAX_VIDEOS}
              </span>
            </button>
          </div>
        )}

        {/* hidden, correctly-typed inputs — clicked programmatically from the buttons above */}
        <input
          ref={photoInputRef}
          type="file"
          accept={SUPPORT_PHOTO_ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            add(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept={SUPPORT_VIDEO_ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            add(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {!hideChips && files.length > 0 && <PendingFileChips files={files} onRemove={remove} />}
    </div>
  );
}

/**
 * The removable "selected file" chip row, split out of `MediaPicker` so callers
 * that need the attach button inline with other controls (e.g. next to the
 * message input) can still render the chip list on its own line elsewhere.
 */
export function PendingFileChips({ files, onRemove }: { files: File[]; onRemove: (idx: number) => void }) {
  if (files.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {files.map((f, i) => (
        <span
          key={i}
          className="flex items-center gap-1.5 border border-white/10 bg-black/20 px-2 py-1 text-[11px] text-[var(--color-mist)]"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-3 w-3 shrink-0 text-cyan-300/80"
          >
            {isVideoMime(f.type) ? (
              <>
                <rect x="3" y="6" width="12" height="12" rx="1.5" />
                <path d="m15 10 6-3.5v11L15 14" strokeLinecap="round" strokeLinejoin="round" />
              </>
            ) : (
              <>
                <rect x="3" y="5" width="18" height="14" rx="1.5" />
                <circle cx="9" cy="10.5" r="1.6" />
                <path d="m4 16.5 4.5-4 3.5 3 4-4.5L21 15" strokeLinecap="round" strokeLinejoin="round" />
              </>
            )}
          </svg>
          <span className="max-w-[8rem] truncate">{f.name}</span>
          <button type="button" onClick={() => onRemove(i)} className="text-[var(--color-mist)] hover:text-rose-300">
            ✕
          </button>
        </span>
      ))}
    </div>
  );
}
