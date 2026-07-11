import { getPool } from "./db";

const MAX_ENTRIES_PER_USER = 200;

export type RconLogKind = "input" | "output" | "error";

/** Appends one console line for a user and trims their history down to the most recent entries. */
export async function appendRconLog(userId: number, kind: RconLogKind, body: string) {
  const pool = getPool();
  await pool.query("INSERT INTO rcon_logs (user_id, kind, body) VALUES (?, ?, ?)", [userId, kind, body]);
  await pool.query(
    `DELETE FROM rcon_logs WHERE user_id = ? AND id NOT IN (
       SELECT id FROM (SELECT id FROM rcon_logs WHERE user_id = ? ORDER BY id DESC LIMIT ?) AS keep
     )`,
    [userId, userId, MAX_ENTRIES_PER_USER]
  );
}
