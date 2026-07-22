export type GameMode = "terryx" | "bloodborne" | "heaven" | "games";

export type GameModeMeta = {
  id: GameMode;
  label: string;
  tagline: string;
  description: string;
  /** two-stop CSS gradient used for swatches, accents and buttons */
  gradient: string;
  /** solid accent color for text/borders */
  accent: string;
};

export const GAME_MODES: GameModeMeta[] = [
  {
    id: "terryx",
    label: "Terryx",
    tagline: "Классика. Почти.",
    description:
      "Основной режим сервера: классическое выживание с честным PvP, приватами территорий и системой привилегий.",
    gradient: "linear-gradient(135deg, #a855f7, #22d3ee)",
    accent: "#22d3ee",
  },
  {
    id: "bloodborne",
    label: "Bloodborne",
    tagline: "Анархия",
    description:
      "Анархия как она есть. Нет привелегий, минимум правил, нет границ.",
    gradient: "linear-gradient(135deg, #ef4444, #7f1d1d)",
    accent: "#ef4444",
  },
  {
    id: "heaven",
    label: "Heaven",
    tagline: "Рай? + Моды",
    description:
      "RolePlay который Вы вряд ли где-то видели. Почему рай? Ну сами решите, рай ли это.",
    gradient: "linear-gradient(135deg, #f8fafc, #84cc16)",
    accent: "#a3e635",
  },
  // {
  //   id: "games",
  //   label: "Games",
  //   tagline: "Мини-игры",
  //   description: "Подборка мини-игр: от классики до авторских режимов — заходи в лобби и выбирай, во что играть.",
  //   gradient: "linear-gradient(135deg, #facc15, #22d3ee)",
  //   accent: "#facc15",
  // },
];

export const GAME_MODE_MAP: Record<GameMode, GameModeMeta> = Object.fromEntries(
  GAME_MODES.map((m) => [m.id, m])
) as Record<GameMode, GameModeMeta>;

/**
 * Re-renders a `linear-gradient(...)` string (as used in GameModeMeta.gradient) with every
 * hex color swapped for an rgba() at the given alpha. Used where a mode's gradient is applied
 * as a highlight/overlay behind text — at full opacity some mode colors (e.g. Heaven's near-white)
 * wash out white text, so a translucent version keeps the highlight visible without hiding the label.
 */
export function withAlpha(gradient: string, alpha: number): string {
  return gradient.replace(/#([0-9a-fA-F]{3,6})/g, (hex) => {
    let h = hex.slice(1);
    if (h.length === 3) {
      h = h
        .split("")
        .map((c) => c + c)
        .join("");
    }
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  });
}

/** Pulls the two hex color stops out of a `linear-gradient(...)` string, e.g. for the scrollbar thumb. */
export function gradientStops(gradient: string): [string, string] {
  const hexes = gradient.match(/#[0-9a-fA-F]{3,6}/g) ?? [];
  return [hexes[0] ?? "#a855f7", hexes[1] ?? hexes[0] ?? "#22d3ee"];
}
