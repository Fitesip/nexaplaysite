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

/** Numeric rank of each rarity (common = 0 … mythic = 5). Handy for sorting. */
export const RARITY_RANK: Record<Rarity, number> = RARITIES.reduce(
  (acc, r, i) => ({ ...acc, [r]: i }),
  {} as Record<Rarity, number>
);

/**
 * Suggested default weight per rarity — the rarer the item, the lower the weight
 * (and therefore the drop chance). Used by the admin loot editor to pre-fill a
 * sensible weight when a row's rarity changes, so "rarer = lower chance" holds
 * out of the box. Admins can still override any weight.
 */
export const DEFAULT_RARITY_WEIGHT: Record<Rarity, number> = {
  common: 50,
  uncommon: 25,
  rare: 10,
  epic: 5,
  legendary: 2,
  mythic: 1,
};

/**
 * Sort loot items by rarity, rarest first (mythic → common), breaking ties by the
 * higher drop chance (or weight) first. Returns a new array.
 */
export function sortByRarity<T extends { rarity: Rarity; chance?: number; weight?: number }>(
  items: readonly T[]
): T[] {
  return [...items].sort((a, b) => {
    const byRarity = RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity];
    if (byRarity !== 0) return byRarity;
    return (b.chance ?? b.weight ?? 0) - (a.chance ?? a.weight ?? 0);
  });
}
