"use client";

/** Simple math captcha ("3 + 5 = ?") shown on the registration form to deter bot signups. */
import { useEffect, useState } from "react";

export default function Captcha({
  answerName = "captchaAnswer",
  tokenName = "captchaToken",
  resetSignal,
}: {
  answerName?: string;
  tokenName?: string;
  /** bump this value (e.g. a counter) to force a fresh challenge, such as after a failed submit */
  resetSignal?: number;
}) {
  const [svg, setSvg] = useState("");
  const [token, setToken] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/captcha", { cache: "no-store" });
      const data = await res.json();
      setSvg(data.svg);
      setToken(data.token);
      setAnswer("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-[var(--color-mist)]">Подтвердите, что вы не бот</label>
      <div className="flex items-center gap-3">
        <div className="pixel-corner relative flex h-[60px] w-[180px] shrink-0 items-center justify-center overflow-hidden border border-white/10 bg-black/30">
          {loading ? (
            <span className="text-xs text-[var(--color-mist)]">Загрузка…</span>
          ) : (
            <div className="h-full w-full [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
          )}
        </div>
        <button
          type="button"
          onClick={load}
          aria-label="Обновить капчу"
          className="pixel-corner flex h-[60px] w-11 shrink-0 items-center justify-center border border-white/10 text-[var(--color-mist)] transition-all duration-300 hover:border-cyan-400/50 hover:text-white hover:rotate-180"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path
              d="M20 11a8 8 0 1 0-2.3 6.3M20 11V5m0 6h-6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          name={answerName}
          required
          placeholder="Код с картинки"
          autoComplete="off"
          className="min-w-0 flex-1 border border-white/10 bg-black/30 px-3 py-2 text-sm uppercase tracking-widest text-white outline-none transition-colors duration-300 focus:border-cyan-400/60"
        />
      </div>
      <input type="hidden" name={tokenName} value={token} />
    </div>
  );
}
