/**
 * Shared rarity definitions for case (loot box) items. Used both on the server
 * (validating admin input, weighted rolls) and on the client (colouring the
 * roulette reel and inventory). Order matters: it goes from most common to
 * rarest, which the UI uses for sorting/legends.
 */
export const RARITIES = ["common", "uncommon", "rare", "epic", "legendary", "mythic"] as const;

export type Rarity = (typeof RARITIES)[number];

export type RarityMeta = {
  id: Rarity;
  label: string;
  /** solid accent colour (borders, text) */
  color: string;
  /** two-stop gradient used for tiles/glow */
  gradient: string;
};

export const RARITY_MAP: Record<Rarity, RarityMeta> = {
  common: {
    id: "common",
    label: "Обычный",
    color: "#9ca3af",
    gradient: "linear-gradient(135deg, #6b7280, #9ca3af)",
  },
  uncommon: {
    id: "uncommon",
    label: "Необычный",
    color: "#22c55e",
    gradient: "linear-gradient(135deg, #15803d, #22c55e)",
  },
  rare: {
    id: "rare",
    label: "Редкий",
    color: "#3b82f6",
    gradient: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
  },
  epic: {
    id: "epic",
    label: "Эпический",
    color: "#a855f7",
    gradient: "linear-gradient(135deg, #7e22ce, #a855f7)",
  },
  legendary: {
    id: "legendary",
    label: "Легендарный",
    color: "#f59e0b",
    gradient: "linear-gradient(135deg, #b45309, #f59e0b)",
  },
  mythic: {
    id: "mythic",
    label: "Мифический",
    color: "#ef4444",
    gradient: "linear-gradient(135deg, #b91c1c, #ef4444)",
  },
};

export function isRarity(value: unknown): value is Rarity {
  return typeof value === "string" && (RARITIES as readonly string[]).includes(value);
}
