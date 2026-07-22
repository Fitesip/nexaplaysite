/**
 * YooKassa HTTP notification (webhook).
 * Configure this URL in the YooKassa merchant dashboard as the notification
 * endpoint for the `payment.succeeded` and `payment.canceled` events.
 *
 * YooKassa notifications carry no shared-secret signature, so the POSTed
 * body is never trusted for the payment status — we re-fetch the payment by
 * id from the API (authenticated with our own shopId/secretKey) and act only
 * on that response. YooKassa retries the notification until it gets a 2xx,
 * so any transient failure here should return a non-2xx to trigger a retry.
 */
import { NextRequest } from "next/server";
import { getPool } from "@/lib/db";
import { fulfillOrder, releasePendingOrder } from "@/lib/orderFulfillment";
import { getYookassaConfig, getPayment, isYookassaConfigured } from "@/lib/yookassa";
import { sendToUser } from "@/lib/ws-hub";

export async function POST(req: NextRequest) {
  const cfg = getYookassaConfig();
  if (!isYookassaConfigured(cfg)) {
    return new Response("YooKassa is not configured", { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const paymentId = body?.object?.id;
  if (!paymentId || typeof paymentId !== "string") {
    return new Response("Invalid notification", { status: 400 });
  }

  let payment;
  try {
    payment = await getPayment(cfg, paymentId);
  } catch {
    // Transient API/network error — ask YooKassa to retry later.
    return new Response("Failed to verify payment", { status: 502 });
  }

  const orderId = Number(payment.metadata?.orderId);
  const paymentToken = payment.metadata?.paymentToken ?? "";
  if (!Number.isInteger(orderId) || orderId <= 0 || !paymentToken) {
    return new Response("Missing order metadata", { status: 400 });
  }

  const pool = getPool();
  const [rows]: any = await pool.query(
    "SELECT total, payment_token FROM orders WHERE id = ? LIMIT 1",
    [orderId]
  );
  if (!rows[0]) return new Response("Order not found", { status: 404 });
  if (paymentToken !== rows[0].payment_token) {
    return new Response("Invalid payment token", { status: 403 });
  }
  if (formatMatches(rows[0].total, payment.amount.value) === false) {
    return new Response("Invalid amount", { status: 400 });
  }

  if (payment.status === "canceled") {
    await releasePendingOrder(orderId, paymentToken);
    return new Response("OK", { status: 200 });
  }

  if (payment.status !== "succeeded" || !payment.paid) {
    // Not a final state yet (e.g. still pending) — nothing to do.
    return new Response("OK", { status: 200 });
  }

  const outcome = await fulfillOrder(orderId);
  if (outcome.status === "not_found") return new Response("Order not found", { status: 404 });
  if (outcome.status === "rcon_failed" || outcome.status === "stock_failed") {
    // Non-2xx makes YooKassa retry the notification later.
    return new Response("Retry later", { status: 503 });
  }
  if (outcome.status === "fulfilled" && outcome.referrerBalanceUpdate) {
    sendToUser(outcome.referrerBalanceUpdate.userId, {
      type: "balance_update",
      data: { balanceKopecks: outcome.referrerBalanceUpdate.balanceKopecks },
    });
  }
  return new Response("OK", { status: 200 });
}

function formatMatches(orderTotal: number, paymentAmountValue: string): boolean {
  return Number(orderTotal).toFixed(2) === paymentAmountValue;
}
