"use client";

/** "Пожаловаться" button + reason form for flagging a forum topic or comment to staff. */
import { useState, FormEvent } from "react";

export default function ReportButton({
  target,
  isLoggedIn,
  onNeedLogin,
}: {
  target: { topicId: number } | { commentId: number };
  isLoggedIn: boolean;
  onNeedLogin: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 5) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/forum/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...("topicId" in target ? { topicId: target.topicId } : { commentId: target.commentId }),
          reason,
        }),
      });
      if (!res.ok) throw new Error();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-cyan-300">
        <FlagIcon className="h-3.5 w-3.5" />
        Жалоба отправлена
      </span>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => (isLoggedIn ? setOpen(true) : onNeedLogin())}
        className="flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-500/5 px-2.5 py-1 text-xs font-medium text-rose-300/90 transition-colors duration-200 hover:border-rose-400/70 hover:bg-rose-500/15 hover:text-rose-200"
      >
        <FlagIcon className="h-3.5 w-3.5" />
        Пожаловаться
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <input
        autoFocus
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Причина жалобы…"
        maxLength={300}
        className="w-48 border border-rose-400/30 bg-black/30 px-2 py-1 text-xs text-white outline-none focus:border-rose-400/60"
      />
      <button
        type="submit"
        disabled={status === "loading" || reason.trim().length < 5}
        className="rounded-full bg-rose-500/20 border border-rose-400/50 px-3 py-1 text-xs font-medium text-rose-200 hover:bg-rose-500/30 disabled:opacity-40"
      >
        Отправить
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-[var(--color-mist)]/60 hover:text-white"
      >
        Отмена
      </button>
      {status === "error" && <span className="text-xs text-rose-400">Ошибка отправки</span>}
    </form>
  );
}

function FlagIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M5 21V4" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M5 4h11.5l-2.5 4 2.5 4H5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
