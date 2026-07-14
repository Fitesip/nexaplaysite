/**
 * Shared types and constants used across the "Личный кабинет" (account) section.
 * Kept in one place so every cabinet sub-component imports the same shape instead
 * of redefining it locally.
 */
import type { CurrentUser } from "@/lib/auth-context";
import type { GameMode } from "@/components/gameModes";

/** Which form is showing in the logged-out view: sign in or create an account. */
export type AuthMode = "login" | "register";

/** Alias kept for readability in this section's components. */
export type User = CurrentUser;

/** Human-readable label for each account role, shown on the profile card. */
export const ROLE_LABEL: Record<User["role"], string> = {
  user: "Странник",
  helper: "Хелпер",
  admin: "Администратор",
  main_admin: "Главный администратор",
};

/** A friend who registered using the current user's referral link. */
export type Referral = { id: number; username: string; created_at: string };

/** Current state of a Minecraft account link: either already linked, or a pending code was sent in-game. */
export type MinecraftLinkStatus =
  | { linked: { username: string; uuid: string; linkedAt: string } | null; pending: null }
  | { linked: null; pending: { nickname: string; expiresAt: string } };

/** A single line item within a past order. */
export type OrderItem = { name: string; category: string; game_mode: GameMode; price: number; qty: number };

/** A completed (or cancelled) purchase, shown in the order-history accordion. */
export type Order = {
  id: number;
  subtotal: number;
  discount_amount: number;
  total: number;
  promo_code: string | null;
  status: "completed" | "cancelled";
  created_at: string;
  items: OrderItem[];
};
