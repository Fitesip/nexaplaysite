import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { getPool } from "./db";

const SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";
const COOKIE_NAME = "nexus_session";

export type SessionPayload = { userId: number };
export type Role = "user" | "helper" | "admin" | "main_admin";

/** Roles that get the "Поддержка" + RCON tabs in the admin panel. */
const STAFF_ROLES: Role[] = ["helper", "admin", "main_admin"];
/** Roles that get the full admin panel (users + catalog management). */
const ADMIN_ROLES: Role[] = ["admin", "main_admin"];

export function signSession(payload: SessionPayload) {
  return jwt.sign(payload, SECRET, { expiresIn: "30d" });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getCurrentUserId(): Promise<number | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifySession(token);
  return payload?.userId ?? null;
}

/**
 * Resolves the logged-in user's id + role. Hits the DB, so use sparingly (once per request is fine).
 * Banned users are treated as logged out everywhere in the app. A ban with an expiry
 * (`banned_until`) that has already passed is treated as not banned — the background
 * sweep in server.js clears the flag (and lifts the in-game ban) shortly after, but
 * we don't want the user to feel "banned" here in the meantime.
 */
export async function getCurrentUser(): Promise<{ id: number; role: Role; username: string } | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const pool = getPool();
  const [rows]: any = await pool.query(
    "SELECT id, username, role, banned, banned_until FROM users WHERE id = ?",
    [userId]
  );
  if (!rows[0]) return null;
  if (isBanActive(rows[0].banned, rows[0].banned_until)) return null;
  return { id: rows[0].id, role: rows[0].role as Role, username: rows[0].username };
}

/** True if a banned/forum_banned flag is currently in effect (no expiry, or expiry still in the future). */
export function isBanActive(flag: number | boolean, until: string | Date | null): boolean {
  if (!flag) return false;
  if (!until) return true;
  return new Date(until).getTime() > Date.now();
}

export type GateResult = { ok: true; userId: number } | { ok: false; status: number; error: string };

async function loadGateRow(userId: number) {
  const pool = getPool();
  const [rows]: any = await pool.query(
    `SELECT banned, banned_until, banned_reason, forum_banned, forum_banned_reason, forum_banned_until, minecraft_username
     FROM users WHERE id = ?`,
    [userId]
  );
  return rows[0] ?? null;
}

export function formatUntil(until: string | Date | null) {
  return until ? ` до ${new Date(until).toLocaleString("ru-RU")}` : " навсегда";
}

/** Gate for creating forum topics/comments: must be logged in, not banned, not forum-banned, and have a linked Minecraft account. */
export async function requireForumPostAccess(): Promise<GateResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, status: 401, error: "Требуется вход" };

  const row = await loadGateRow(userId);
  if (!row) return { ok: false, status: 401, error: "Требуется вход" };

  if (isBanActive(row.banned, row.banned_until)) {
    const reason = row.banned_reason ? `: ${row.banned_reason}` : "";
    return {
      ok: false,
      status: 403,
      error: `Ваш аккаунт заблокирован${formatUntil(row.banned_until)}${reason}`,
    };
  }
  if (isBanActive(row.forum_banned, row.forum_banned_until)) {
    const reason = row.forum_banned_reason ? `: ${row.forum_banned_reason}` : "";
    return {
      ok: false,
      status: 403,
      error: `Вы заблокированы на форуме${formatUntil(row.forum_banned_until)}${reason}`,
    };
  }
  if (!row.minecraft_username) {
    return {
      ok: false,
      status: 403,
      error: "Привяжите Minecraft-аккаунт в личном кабинете, чтобы писать на форуме",
    };
  }
  return { ok: true, userId };
}

/** Gate for checking out an order: must be logged in, not banned, and have a linked Minecraft account. */
export async function requirePurchaseAccess(): Promise<GateResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, status: 401, error: "Требуется вход" };

  const row = await loadGateRow(userId);
  if (!row) return { ok: false, status: 401, error: "Требуется вход" };

  if (isBanActive(row.banned, row.banned_until)) {
    const reason = row.banned_reason ? `: ${row.banned_reason}` : "";
    return {
      ok: false,
      status: 403,
      error: `Ваш аккаунт заблокирован${formatUntil(row.banned_until)}${reason}`,
    };
  }
  if (!row.minecraft_username) {
    return {
      ok: false,
      status: 403,
      error: "Привяжите Minecraft-аккаунт в личном кабинете, чтобы совершать покупки",
    };
  }
  return { ok: true, userId };
}

/** Returns the current user if they're staff (helper/admin/main_admin) — access to support & RCON. */
export async function requireStaff(): Promise<{ id: number; role: Role; username: string } | null> {
  const user = await getCurrentUser();
  if (!user || !STAFF_ROLES.includes(user.role)) return null;
  return user;
}

/** Returns the current user if they're admin or main_admin — access to the full admin panel. */
export async function requireAdmin(): Promise<{ id: number; role: Role; username: string } | null> {
  const user = await getCurrentUser();
  if (!user || !ADMIN_ROLES.includes(user.role)) return null;
  return user;
}

/** Returns the current user only if they're the main administrator. */
export async function requireMainAdmin(): Promise<{ id: number; role: Role; username: string } | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "main_admin") return null;
  return user;
}

const ROLE_RANK: Record<Role, number> = { user: 0, helper: 1, admin: 2, main_admin: 3 };

/** True if `actor` outranks `target` strictly (needed to act on another user's account). */
export function outranks(actor: Role, target: Role) {
  return ROLE_RANK[actor] > ROLE_RANK[target];
}

/**
 * Can `actor` set someone's role to `newRole`?
 * - Only main_admin can grant/revoke admin.
 * - Nobody can grant main_admin through the API (single main admin, set manually in DB).
 * - A regular admin may only toggle between user <-> helper.
 */
export function canAssignRole(actor: Role, newRole: Role) {
  if (newRole === "main_admin") return false;
  if (newRole === "admin") return actor === "main_admin";
  // user / helper
  return actor === "admin" || actor === "main_admin";
}
