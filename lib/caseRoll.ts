/**
 * Чистая (без БД) логика открытия кейса: взвешенный случайный выбор, отсев уже
 * полученных уникальных наград, проверка «реже → ниже шанс» и защита от повторного
 * открытия. Вынесено отдельно, чтобы покрыть тестами без базы данных.
 */
import { RARITY_RANK, RARITY_MAP, type Rarity } from "./rarity";

export type RollItem = {
  id: number;
  ownership_id?: number;
  rarity: Rarity;
  weight: number;
  is_unique?: boolean;
};

/**
 * Взвешенный случайный выбор среди предметов с положительным весом.
 * `rng` возвращает число из [0, 1) — по умолчанию Math.random (в тестах подменяется).
 * Возвращает null, если ни у одного предмета нет положительного веса.
 */
export function weightedPick<T extends { weight: number }>(
  items: readonly T[],
  rng: () => number = Math.random
): T | null {
  const pool = items.filter((i) => i.weight > 0);
  if (pool.length === 0) return null;

  const total = pool.reduce((sum, i) => sum + i.weight, 0);
  let roll = rng() * total;
  for (const item of pool) {
    roll -= item.weight;
    if (roll < 0) return item;
  }
  return pool[pool.length - 1];
}

/**
 * Отсеивает уникальные предметы, которые пользователь уже выбивал (их id в
 * `ownedUniqueIds`), чтобы «титул нельзя получить дважды». Если после отсева не
 * осталось ни одного предмета (все оставшиеся — уже полученные уникальные),
 * возвращает исходный список, чтобы кейс всё равно можно было открыть.
 */
export function eligibleItems<T extends { id: number; ownership_id?: number; is_unique?: boolean }>(
  items: readonly T[],
  ownedUniqueIds: ReadonlySet<number>
): T[] {
  const eligible = items.filter((i) => !(i.is_unique && ownedUniqueIds.has(i.ownership_id ?? i.id)));
  return eligible.length > 0 ? eligible : [...items];
}

/**
 * Проверяет правило «чем выше редкость, тем ниже шанс»: для присутствующих
 * редкостей максимальный вес предмета должен строго убывать по мере роста
 * редкости. Возвращает предупреждение (для админа) или null, если всё корректно.
 */
export function rarityChanceWarning(items: readonly RollItem[]): string | null {
  const maxWeightByRarity = new Map<Rarity, number>();
  for (const item of items) {
    if (item.weight <= 0) continue;
    const prev = maxWeightByRarity.get(item.rarity) ?? 0;
    if (item.weight > prev) maxWeightByRarity.set(item.rarity, item.weight);
  }

  const present = [...maxWeightByRarity.keys()].sort((a, b) => RARITY_RANK[a] - RARITY_RANK[b]);
  for (let i = 0; i < present.length - 1; i++) {
    const lower = present[i];
    const higher = present[i + 1];
    if (maxWeightByRarity.get(higher)! >= maxWeightByRarity.get(lower)!) {
      return `Редкость «${RARITY_MAP[higher].label}» имеет вес не ниже, чем «${RARITY_MAP[lower].label}» — у более редких предметов шанс должен быть ниже.`;
    }
  }
  return null;
}

/**
 * Проверяет, можно ли открыть конкретный экземпляр кейса из инвентаря.
 * Возвращает текст ошибки (для ответа API) или null, если открытие разрешено.
 */
export function caseOpenError(
  owned: { status: string; case_id: number | null } | undefined | null
): string | null {
  if (!owned) return "Кейс не найден в инвентаре";
  if (owned.status === "opened") return "Этот кейс уже открыт";
  if (!owned.case_id) return "Этот кейс больше недоступен";
  return null;
}
