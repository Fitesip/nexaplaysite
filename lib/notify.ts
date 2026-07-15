import type { Pool } from "mysql2/promise";
import { sendToUser } from "./ws-hub";

export type NotificationType =
  | "forum_reply"
  | "forum_mention"
  | "forum_reaction"
  | "referral_joined"
  | "moderation"
  | "support_reply"
  | "support_ticket_closed";

/**
 * Inserts a notification for `userId` and immediately pushes it over WebSocket to any
 * of their connected tabs. Never notifies a user about their own action (call sites
 * should skip when actorId === userId, but we double-guard here too).
 */
export async function notify(
  pool: Pool,
  params: {
    userId: number;
    actorId?: number;
    type: NotificationType;
    title: string;
    body?: string;
    link?: string;
  }
) {
  if (params.actorId && params.actorId === params.userId) return;

  const [result]: any = await pool.query(
    "INSERT INTO notifications (user_id, type, title, body, link) VALUES (?, ?, ?, ?, ?)",
    [params.userId, params.type, params.title, params.body ?? null, params.link ?? null]
  );

  sendToUser(params.userId, {
    type: "notification",
    data: {
      id: result.insertId,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      link: params.link ?? null,
      read: false,
      created_at: new Date().toISOString(),
    },
  });
}
