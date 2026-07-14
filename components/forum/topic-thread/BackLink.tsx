/** Simple "← Назад к форуму" link shown above the topic in every state (loading/error/loaded). */
export default function BackLink({ onBack }: { onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      className="font-[var(--font-mono)] text-xs text-[var(--color-mist)] transition-colors hover:text-white"
    >
      ← Назад к форуму
    </button>
  );
}
