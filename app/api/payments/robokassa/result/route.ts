/**
 * Robokassa ResultURL (server-to-server notification).
 * Configure this endpoint in Robokassa as POST (GET is also accepted).
 * Robokassa retries until it receives plain text `OK<InvId>`.
 */
import { NextRequest } from "next/server";
import { getPool } from "@/lib/db";
import { fulfillOrder } from "@/lib/orderFulfillment";
import { getRobokassaConfig, isRobokassaConfigured, verifyResultSignature } from "@/lib/robokassa";
import { sendToUser } from "@/lib/ws-hub";

async function readParams(req: NextRequest): Promise<URLSearchParams> {
  if (req.method === "POST") {
    const form = await req.formData();
    const params = new URLSearchParams();
    for (const [key, value] of form.entries()) params.set(key, String(value));
    return params;
  }
  return req.nextUrl.searchParams;
}

function getValue(params: URLSearchParams, key: string): string {
  return params.get(key) ?? params.get(key.toLowerCase()) ?? "";
}

function shpParams(params: URLSearchParams): Record<string, string> {
  return Object.fromEntries([...params.entries()].filter(([key]) => key.toLowerCase().startsWith("shp_")));
}

async function handle(req: NextRequest): Promise<Response> {
  const cfg = getRobokassaConfig();
  if (!isRobokassaConfigured(cfg)) return new Response("Robokassa is not configured", { status: 503 });

  const params = await readParams(req);
  const outSum = getValue(params, "OutSum");
  const invId = Number(getValue(params, "InvId"));
  const signature = getValue(params, "SignatureValue");
  if (!outSum || !Number.isInteger(invId) || invId <= 0 || !signature) {
    return new Response("Invalid callback parameters", { status: 400 });
  }
  if (!verifyResultSignature(cfg, outSum, invId, signature, shpParams(params))) {
    return new Response("Invalid signature", { status: 403 });
  }

  const pool = getPool();
  const [rows]: any = await pool.query(
    "SELECT total, payment_token FROM orders WHERE id = ? LIMIT 1",
    [invId]
  );
  if (!rows[0]) return new Response("Order not found", { status: 404 });
  if (Number(rows[0].total) !== Number(outSum)) {
    return new Response("Invalid amount", { status: 400 });
  }
  const paymentToken =
    params.get("Shp_paymentToken") ?? params.get("shp_paymenttoken") ?? "";
  if (!paymentToken || paymentToken !== rows[0].payment_token) {
    return new Response("Invalid payment token", { status: 403 });
  }

  const outcome = await fulfillOrder(invId);
  if (outcome.status === "not_found") return new Response("Order not found", { status: 404 });
  if (outcome.status === "rcon_failed") {
    // Non-2xx makes Robokassa retry the ResultURL notification later.
    return new Response("RCON is unavailable, retry later", { status: 503 });
  }
  if (outcome.status === "stock_failed") {
    return new Response("Reserved item is unavailable, retry later", { status: 503 });
  }
  if (outcome.status === "fulfilled" && outcome.referrerBalanceUpdate) {
    sendToUser(outcome.referrerBalanceUpdate.userId, {
      type: "balance_update",
      data: { balanceKopecks: outcome.referrerBalanceUpdate.balanceKopecks },
    });
  }
  return new Response(`OK${invId}`, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
