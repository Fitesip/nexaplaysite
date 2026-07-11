import type { CSSProperties, ReactNode } from "react";

export type MinecraftSegment = {
  text: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  obfuscated?: boolean;
};

const COLOR_MAP: Record<string, string> = {
  "0": "#000000",
  "1": "#0000AA",
  "2": "#00AA00",
  "3": "#00AAAA",
  "4": "#AA0000",
  "5": "#AA00AA",
  "6": "#FFAA00",
  "7": "#AAAAAA",
  "8": "#555555",
  "9": "#5555FF",
  a: "#55FF55",
  b: "#55FFFF",
  c: "#FF5555",
  d: "#FF55FF",
  e: "#FFFF55",
  f: "#FFFFFF",
};

const FORMAT_CODES = new Set(["k", "l", "m", "n", "o"]);
const ALL_CODES = new Set([...Object.keys(COLOR_MAP), ...FORMAT_CODES, "r"]);

/** Reference table for a color-code cheat sheet / picker UI. */
export const COLOR_CODE_ENTRIES: { code: string; hex: string; label: string }[] = [
  { code: "0", hex: "#000000", label: "Чёрный" },
  { code: "1", hex: "#0000AA", label: "Тёмно-синий" },
  { code: "2", hex: "#00AA00", label: "Тёмно-зелёный" },
  { code: "3", hex: "#00AAAA", label: "Бирюзовый" },
  { code: "4", hex: "#AA0000", label: "Тёмно-красный" },
  { code: "5", hex: "#AA00AA", label: "Фиолетовый" },
  { code: "6", hex: "#FFAA00", label: "Золотой" },
  { code: "7", hex: "#AAAAAA", label: "Серый" },
  { code: "8", hex: "#555555", label: "Тёмно-серый" },
  { code: "9", hex: "#5555FF", label: "Синий" },
  { code: "a", hex: "#55FF55", label: "Зелёный" },
  { code: "b", hex: "#55FFFF", label: "Голубой" },
  { code: "c", hex: "#FF5555", label: "Красный" },
  { code: "d", hex: "#FF55FF", label: "Розовый" },
  { code: "e", hex: "#FFFF55", label: "Жёлтый" },
  { code: "f", hex: "#FFFFFF", label: "Белый" },
];

/** Reference table for the formatting (non-color) codes. */
export const FORMAT_CODE_ENTRIES: { code: string; label: string }[] = [
  { code: "l", label: "Жирный" },
  { code: "o", label: "Курсив" },
  { code: "n", label: "Подчёркнутый" },
  { code: "m", label: "Зачёркнутый" },
  { code: "k", label: "Случайный (шифр)" },
  { code: "r", label: "Сброс" },
];

/**
 * Converts the typed "&" shorthand into the real "§" section-sign code before a command
 * is sent to the server — "&" is only left as-is when it isn't followed by a valid
 * color/format character, so ordinary ampersands in text are never touched.
 */
export function ampersandToSectionSign(input: string): string {
  return input.replace(/&([0-9a-fk-orA-FK-OR])/g, (_match, code: string) => `§${code.toLowerCase()}`);
}

/**
 * Parses Minecraft-style formatting codes (both the vanilla "§" section-sign codes
 * and the common "&" shorthand used when typing/copying commands) into styled segments.
 * A color code resets any active bold/italic/underline/strikethrough/obfuscated —
 * matching vanilla Minecraft's actual behaviour — while format codes stack.
 */
export function parseMinecraftText(input: string): MinecraftSegment[] {
  const segments: MinecraftSegment[] = [];
  let current: MinecraftSegment = { text: "" };
  let i = 0;

  while (i < input.length) {
    const ch = input[i];
    if ((ch === "§" || ch === "&") && i + 1 < input.length) {
      const code = input[i + 1].toLowerCase();
      if (ALL_CODES.has(code)) {
        if (current.text) segments.push(current);
        if (code === "r") {
          current = { text: "" };
        } else if (code in COLOR_MAP) {
          current = { text: "", color: COLOR_MAP[code] };
        } else {
          current = { ...current, text: "" };
          if (code === "l") current.bold = true;
          if (code === "m") current.strikethrough = true;
          if (code === "n") current.underline = true;
          if (code === "o") current.italic = true;
          if (code === "k") current.obfuscated = true;
        }
        i += 2;
        continue;
      }
    }
    current.text += ch;
    i += 1;
  }

  if (current.text) segments.push(current);
  return segments;
}

/** Renders a string containing §/& color codes as styled spans. */
export function MinecraftText({ text }: { text: string }): ReactNode {
  const segments = parseMinecraftText(text);
  return (
    <>
      {segments.map((seg, idx) => {
        const decorations = [seg.underline && "underline", seg.strikethrough && "line-through"]
          .filter(Boolean)
          .join(" ");
        const style: CSSProperties = {
          color: seg.color,
          fontWeight: seg.bold ? 700 : undefined,
          fontStyle: seg.italic ? "italic" : undefined,
          textDecoration: decorations || undefined,
        };
        return (
          <span key={idx} style={style} className={seg.obfuscated ? "mc-obfuscated" : undefined}>
            {seg.text}
          </span>
        );
      })}
    </>
  );
}
