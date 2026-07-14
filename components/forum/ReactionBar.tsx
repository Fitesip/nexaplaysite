"use client";

/** Emoji reaction row (👍 ❤️ 😂 😮 😢) for a forum topic or comment, with per-emoji counts. */
import { useState } from "react";

export const ALLOWED_EMOJI = ["👍", "❤️", "😂", "😮", "😢"] as const;

export type ReactionMap = Record<string, { count: number; mine: boolean }>;

export default function ReactionBar({
  reactions,
  target,
  isLoggedIn,
  onNeedLogin,
  onChanged,
  compact,
}: {
  reactions: ReactionMap;
  target: { topicId: number } | { commentId: number };
  isLoggedIn: boolean;
  onNeedLogin: () => void;
  /** Called with the updated reaction map after a successful toggle, for optimistic local state. */
  onChanged: (next: ReactionMap) => void;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  const toggle = async (emoji: string) => {
    if (!isLoggedIn) {
      onNeedLogin();
      return;
    }
    if (busy) return;
    setBusy(emoji);

    // optimistic update
    const current = reactions[emoji] ?? { count: 0, mine: false };
    const next: ReactionMap = {
      ...reactions,
      [emoji]: current.mine
        ? { count: Math.max(0, current.count - 1), mine: false }
        : { count: current.count + 1, mine: true },
    };
    onChanged(next);

    try {
      const res = await fetch("/api/forum/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...("topicId" in target ? { topicId: target.topicId } : { commentId: target.commentId }),
          emoji,
        }),
      });
      if (!res.ok) onChanged(reactions); // revert on failure
    } catch {
      onChanged(reactions);
    } finally {
      setBusy(null);
    }
  };

  // Always render the full palette inline, in normal document flow — no absolutely-positioned
  // popover, so the row can never get clipped by an ancestor's `clip-path` (pixel-corner look).
  return (
    <div className={`mt-2 flex flex-wrap items-center gap-1.5 ${compact ? "ml-9" : ""}`}>
      {ALLOWED_EMOJI.map((emoji) => {
        const v = reactions[emoji];
        const count = v?.count ?? 0;
        const mine = v?.mine ?? false;
        return (
          <button
            key={emoji}
            onClick={() => toggle(emoji)}
            disabled={!!busy}
            className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
              mine
                ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-200"
                : count > 0
                  ? "border-white/10 text-[var(--color-mist)] hover:border-cyan-400/40"
                  : "border-white/5 text-[var(--color-mist)]/35 hover:border-cyan-400/30 hover:text-[var(--color-mist)]"
            }`}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="font-[var(--font-mono)]">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
