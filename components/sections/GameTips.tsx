"use client";

/** "Рекомендации" section — placeholder page, not yet built out. */
export default function GameTips() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center text-center">
      <h2 className="font-[var(--font-display)] text-4xl font-bold">
        Рекомендации <span className="grad-text">по игре</span>
      </h2>
      <p className="mt-3 max-w-md text-[var(--color-mist)]">
        Раздел в разработке — скоро здесь появятся гайды, советы новичкам и разбор механик по каждому режиму.
      </p>

      <div className="glass-panel pixel-corner mt-10 flex w-full flex-col items-center gap-2 p-14">
        <span className="font-[var(--font-display)] text-8xl font-black leading-none text-white/90 grad-text">
          67
        </span>
        <span className="font-[var(--font-mono)] text-xs uppercase tracking-[0.3em] text-[var(--color-mist)]/60">
          placeholder
        </span>
      </div>
    </div>
  );
}
