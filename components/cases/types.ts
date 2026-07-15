import type { GameMode } from "@/components/gameModes";
import type { Rarity } from "@/lib/rarity";

/** One possible drop inside a case, with its computed chance (weight / total weight). */
export type CaseLootItem = {
  id: number;
  name: string;
  rarity: Rarity;
  weight: number;
  chance: number;
};

/** A stack of identical unopened cases in the player's inventory. */
export type InventoryCase = {
  caseId: number;
  caseName: string;
  gameMode: GameMode;
  count: number;
  /** the specific user_cases row id to open next */
  nextId: number;
};

/** A past case opening, shown in the inventory history. */
export type CaseHistoryEntry = {
  id: number;
  case_id: number | null;
  case_name: string;
  game_mode: GameMode;
  won_item_name: string | null;
  won_item_rarity: Rarity | null;
  opened_at: string;
};
