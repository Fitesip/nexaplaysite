"use client";

import { useState, useEffect } from "react";
import type { Referral } from "./types";

/**
 * Shows the player's personal referral link (?ref=<code>) and the list of
 * friends who signed up through it. The code itself comes from the server;
 * this component only displays it and offers a one-click copy button.
 */
export default function ReferralCard() {
  const [code, setCode] = useState<string | null>(null);
  const [invited, setInvited] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referrals", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setCode(d?.code ?? null);
        setInvited(d?.invited ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const link = code && typeof window !== "undefined" ? `${window.location.origin}/?ref=${code}#cabinet` : "";

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel pixel-corner mt-6 p-6">
      <h3 className="font-[var(--font-display)] text-base font-semibold text-white">Реферальная программа</h3>
      <p className="mt-1 text-sm text-[var(--color-mist)]">
        Приглашённый друг получает 25 ₽ на баланс, а вы — 5% от суммы каждой его покупки.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-[var(--color-mist)]">Загрузка…</p>
      ) : (
        <>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              readOnly
              value={link}
              className="min-w-0 flex-1 border border-white/10 bg-black/20 px-3 py-2 font-[var(--font-mono)] text-xs text-[var(--color-mist)] outline-none"
            />
            <button
              onClick={copy}
              className="pixel-corner shrink-0 bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-2 font-[var(--font-display)] text-xs font-semibold text-white transition-transform duration-300 hover:-translate-y-0.5"
            >
              {copied ? "Скопировано!" : "Скопировать"}
            </button>
          </div>

          <p className="mt-4 text-sm text-[var(--color-mist)]">
            Приглашено друзей: <span className="text-white">{invited.length}</span>
          </p>
          {invited.length > 0 && (
            <div className="mt-2 flex flex-col gap-1.5">
              {invited.map((f) => (
                <div key={f.id} className="flex items-center justify-between text-xs text-[var(--color-mist)]">
                  <span className="text-white">{f.username}</span>
                  <span className="font-[var(--font-mono)]">{new Date(f.created_at).toLocaleDateString("ru-RU")}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
