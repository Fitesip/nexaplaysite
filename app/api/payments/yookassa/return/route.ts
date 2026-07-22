/**
 * YooKassa return_url — the browser lands here after the buyer finishes (or
 * abandons) the checkout on YooKassa's side. Unlike Robokassa's SuccessURL,
 * this carries no signature to verify, and the webhook that actually
 * confirms/fulfills the order may not have arrived yet. So this route never
 * claims "success" on its own — it reports the order's current DB status,
 * which is "processing" until the webhook lands.
 */
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET(req: NextRequest) {
  const orderId = Number(req.nextUrl.searchParams.get("orderId"));
  const url = new URL("/", req.url);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    url.searchParams.set("payment", "invalid");
    url.hash = "cabinet";
    return NextResponse.redirect(url, 303);
  }

  const pool = getPool();
  const [rows]: any = await pool.query("SELECT status FROM orders WHERE id = ? LIMIT 1", [orderId]);
  const status = rows[0]?.status as string | undefined;

  url.searchParams.set("order", String(orderId));
  if (status === "completed") {
    url.searchParams.set("payment", "success");
    url.hash = "cabinet";
  } else if (status === "cancelled") {
    url.searchParams.set("payment", "fail");
    url.hash = "cart";
  } else if (status === "pending") {
    // Buyer returned before the webhook confirmed the payment server-side.
    url.searchParams.set("payment", "processing");
    url.hash = "cabinet";
  } else {
    url.searchParams.set("payment", "invalid");
    url.hash = "cabinet";
  }
  return NextResponse.redirect(url, 303);
}
