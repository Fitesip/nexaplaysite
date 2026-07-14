"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { STAFF_ROLES } from "./helpers";

/**
 * Staff-only "Закрепить/Открепить" button for a topic. Renders nothing for
 * regular users — only helpers/admins/main_admin ever see it.
 */
export default function PinToggle({
  topicId,
  pinned,
  onToggled,
}: {
  topicId: number;
  pinned: boolean;
  onToggled: (pinned: boolean) => void;
}) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  if (!user || !STAFF_ROLES.has(user.role)) return null;

  const toggle = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/forum/topics/${topicId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !pinned }),
      });
      if (res.ok) onToggled(!pinned);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`shrink-0 border px-3 py-1.5 font-[var(--font-mono)] text-[11px] uppercase tracking-wide transition-colors duration-300 disabled:opacity-50 ${
        pinned
          ? "border-cyan-400/40 text-cyan-300 hover:border-rose-400/40 hover:text-rose-300"
          : "border-white/10 text-[var(--color-mist)] hover:border-cyan-400/40 hover:text-white"
      }`}
    >
      {pinned ? "Открепить" : "Закрепить"}
    </button>
  );
}
