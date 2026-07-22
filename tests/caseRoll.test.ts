import { describe, it, expect } from "vitest";
import {
  weightedPick,
  eligibleItems,
  rarityChanceWarning,
  caseOpenError,
  type RollItem,
} from "@/lib/caseRoll";
import { DEFAULT_RARITY_WEIGHT } from "@/lib/rarity";
import { itemOwnershipKey } from "@/lib/itemType";

describe("weightedPick", () => {
  const items = [
    { id: 1, weight: 1 },
    { id: 2, weight: 1 },
    { id: 3, weight: 1 },
  ];

  it("returns null when no item has positive weight", () => {
    expect(weightedPick([{ id: 1, weight: 0 }, { id: 2, weight: -5 }])).toBeNull();
    expect(weightedPick([])).toBeNull();
  });

  it("only ever picks items with positive weight", () => {
    const pool = [
      { id: 1, weight: 0 },
      { id: 2, weight: 5 },
      { id: 3, weight: 0 },
    ];
    for (let r = 0; r < 1; r += 0.05) {
      expect(weightedPick(pool, () => r)!.id).toBe(2);
    }
  });

  it("lands on the correct item at cumulative-weight boundaries", () => {
    // total weight 3, one unit each: [0,1)->id1, [1,2)->id2, [2,3)->id3
    expect(weightedPick(items, () => 0)!.id).toBe(1);
    expect(weightedPick(items, () => 0.32)!.id).toBe(1); // 0.96
    expect(weightedPick(items, () => 0.34)!.id).toBe(2); // 1.02
    expect(weightedPick(items, () => 0.66)!.id).toBe(2); // 1.98
    expect(weightedPick(items, () => 0.67)!.id).toBe(3); // 2.01
    expect(weightedPick(items, () => 0.999)!.id).toBe(3);
  });

  it("respects weights over many random draws (rarer wins less often)", () => {
    const pool = [
      { id: 1, weight: DEFAULT_RARITY_WEIGHT.common }, // 50
      { id: 2, weight: DEFAULT_RARITY_WEIGHT.rare }, // 10
      { id: 3, weight: DEFAULT_RARITY_WEIGHT.mythic }, // 1
    ];
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    for (let i = 0; i < 30000; i++) counts[weightedPick(pool)!.id]++;
    expect(counts[1]).toBeGreaterThan(counts[2]);
    expect(counts[2]).toBeGreaterThan(counts[3]);
  });
});

describe("eligibleItems (unique-reward exclusion)", () => {
  const pool = [
    { id: 1, ownership_id: 1, is_unique: false },
    { id: 2, ownership_id: 2, is_unique: true },
    { id: 3, ownership_id: 3, is_unique: true },
  ];

  it("excludes unique items the user already owns", () => {
    const eligible = eligibleItems(pool, new Set([2]));
    expect(eligible.map((i) => i.id)).toEqual([1, 3]);
  });

  it("keeps non-unique items even if their id is in the owned set", () => {
    const eligible = eligibleItems(pool, new Set([1]));
    expect(eligible.map((i) => i.id)).toEqual([1, 2, 3]);
  });

  it("falls back to the full pool when every item is an already-owned unique", () => {
    const onlyUnique = [
      { id: 2, ownership_id: 2, is_unique: true },
      { id: 3, ownership_id: 3, is_unique: true },
    ];
    const eligible = eligibleItems(onlyUnique, new Set([2, 3]));
    expect(eligible.map((i) => i.id)).toEqual([2, 3]);
  });

  it("uses item identity instead of a replaceable case_items row id", () => {
    const ownershipId = itemOwnershipKey("title", "Герой");
    const recreatedPool = [
      { id: 99, ownership_id: ownershipId, is_unique: true },
      { id: 100, ownership_id: itemOwnershipKey("item", "Камень"), is_unique: false },
    ];
    expect(eligibleItems(recreatedPool, new Set([ownershipId])).map((item) => item.id)).toEqual([100]);
  });

  it("does not award the same unique twice within one batch", () => {
    // Mirror the bulk-open loop: after winning a unique, add its id to the owned set so the
    // next draw excludes it (`?? last` mirrors the route's degenerate-pool fallback).
    const batchPool: RollItem[] = [
      { id: 1, ownership_id: 1, rarity: "common", weight: 5 },
      { id: 2, ownership_id: 2, rarity: "legendary", weight: 5, is_unique: true },
    ];
    const owned = new Set<string | number>();
    const wins: number[] = [];
    for (let i = 0; i < 10; i++) {
      const candidates = eligibleItems(batchPool, owned);
      const won = weightedPick(candidates) ?? candidates[candidates.length - 1];
      if (won.is_unique) owned.add(won.ownership_id ?? won.id);
      wins.push(won.id);
    }
    expect(wins.filter((id) => id === 2).length).toBeLessThanOrEqual(1);
  });
});

describe("rarityChanceWarning", () => {
  it("returns null for a well-ordered default pool", () => {
    const items: RollItem[] = [
      { id: 1, rarity: "common", weight: DEFAULT_RARITY_WEIGHT.common },
      { id: 2, rarity: "rare", weight: DEFAULT_RARITY_WEIGHT.rare },
      { id: 3, rarity: "legendary", weight: DEFAULT_RARITY_WEIGHT.legendary },
    ];
    expect(rarityChanceWarning(items)).toBeNull();
  });

  it("warns when a rarer item weighs at least as much as a common one", () => {
    const items: RollItem[] = [
      { id: 1, rarity: "common", weight: 5 },
      { id: 2, rarity: "legendary", weight: 20 },
    ];
    expect(rarityChanceWarning(items)).toMatch(/шанс должен быть ниже/);
  });

  it("ignores zero-weight items", () => {
    const items: RollItem[] = [
      { id: 1, rarity: "common", weight: 50 },
      { id: 2, rarity: "legendary", weight: 0 },
    ];
    expect(rarityChanceWarning(items)).toBeNull();
  });
});

describe("caseOpenError (repeat-open protection)", () => {
  it("rejects a case that does not exist / isn't the user's", () => {
    expect(caseOpenError(undefined)).toMatch(/не найден/);
    expect(caseOpenError(null)).toMatch(/не найден/);
  });

  it("rejects an already-opened case", () => {
    expect(caseOpenError({ status: "opened", case_id: 5 })).toMatch(/уже открыт/);
  });

  it("rejects a case whose source item was removed", () => {
    expect(caseOpenError({ status: "unopened", case_id: null })).toMatch(/недоступен/);
  });

  it("allows opening a valid unopened case", () => {
    expect(caseOpenError({ status: "unopened", case_id: 5 })).toBeNull();
  });
});
