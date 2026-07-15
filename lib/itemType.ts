/**
 * Тип выпадающего из кейса предмета (предмет, привилегия, валюта и т.д.).
 * Используется и на сервере (валидация/снимок в user_cases), и на клиенте
 * (иконка/подпись типа в барабане, инвентаре и админ-редакторе).
 */
export const ITEM_TYPES = [
  "item",
  "privilege",
  "currency",
  "cosmetic",
  "pet",
  "title",
  "other",
] as const;

export type ItemType = (typeof ITEM_TYPES)[number];

const ALWAYS_UNIQUE_ITEM_TYPES = new Set<ItemType>(["privilege", "cosmetic", "pet", "title"]);

export type ItemTypeMeta = {
  id: ItemType;
  label: string;
  /** короткий эмодзи-значок как запасной вариант, когда у предмета нет своей иконки */
  icon: string;
};

export const ITEM_TYPE_MAP: Record<ItemType, ItemTypeMeta> = {
  item: { id: "item", label: "Предмет", icon: "📦" },
  privilege: { id: "privilege", label: "Привилегия", icon: "⭐" },
  currency: { id: "currency", label: "Валюта", icon: "🪙" },
  cosmetic: { id: "cosmetic", label: "Косметика", icon: "✨" },
  pet: { id: "pet", label: "Питомец", icon: "🐾" },
  title: { id: "title", label: "Титул", icon: "🏷️" },
  other: { id: "other", label: "Другое", icon: "🎁" },
};

export function isItemType(value: unknown): value is ItemType {
  return typeof value === "string" && (ITEM_TYPES as readonly string[]).includes(value);
}

export function isAlwaysUniqueItemType(itemType: ItemType): boolean {
  return ALWAYS_UNIQUE_ITEM_TYPES.has(itemType);
}

export function itemOwnershipKey(itemType: string, name: string): string {
  return JSON.stringify([
    itemType.trim().toLocaleLowerCase("ru-RU"),
    name.normalize("NFKC").trim().toLocaleLowerCase("ru-RU"),
  ]);
}
