/**
 * YooKassa (ЮKassa) payment helpers.
 *
 * Env vars:
 *   YOOKASSA_SHOP_ID     — required
 *   YOOKASSA_SECRET_KEY  — required
 *   YOOKASSA_API_URL     — optional, defaults to https://api.yookassa.ru/v3
 *   SITE_URL             — optional, e.g. https://nexaplay.pro (see below)
 * While the shop is not configured, `isYookassaConfigured()` returns false
 * and the API responds with a clear "not configured" error instead of
 * calling out.
 *
 * The buyer's return_url (built in `app/api/orders/route.ts`) is anchored to
 * `SITE_URL` when set — otherwise it falls back to the request's Host
 * header, which is wrong behind most reverse-proxy setups (resolves to the
 * app's internal address instead of the public domain).
 *
 * Unlike Robokassa, YooKassa has no client-buildable payment link — every
 * payment is created server-to-server via POST /v3/payments, which returns a
 * `confirmation.confirmation_url` the buyer is redirected to. There is also
 * no shared-secret signature on webhook notifications, so the POSTed body is
 * never trusted directly: on every notification we re-fetch the payment by
 * id from the API (GET /v3/payments/{id}) using our own Basic-Auth
 * credentials and act only on that authoritative response.
 *
 * Docs: https://yookassa.ru/developers/api
 */

export type YookassaConfig = {
  shopId: string;
  secretKey: string;
  apiUrl: string;
};

export function getYookassaConfig(): YookassaConfig {
  return {
    shopId: process.env.YOOKASSA_SHOP_ID ?? "",
    secretKey: process.env.YOOKASSA_SECRET_KEY ?? "",
    apiUrl: process.env.YOOKASSA_API_URL ?? "https://api.yookassa.ru/v3",
  };
}

export function isYookassaConfigured(cfg: YookassaConfig = getYookassaConfig()): boolean {
  return Boolean(cfg.shopId && cfg.secretKey);
}

function authHeader(cfg: YookassaConfig): string {
  return "Basic " + Buffer.from(`${cfg.shopId}:${cfg.secretKey}`).toString("base64");
}

/** YooKassa expects the amount with a dot as the decimal separator, 2 decimals. */
export function formatAmount(rubles: number): string {
  return rubles.toFixed(2);
}

export type YookassaPayment = {
  id: string;
  status: "pending" | "waiting_for_capture" | "succeeded" | "canceled";
  paid: boolean;
  amount: { value: string; currency: string };
  metadata?: Record<string, string>;
  confirmation?: { type: string; confirmation_url?: string };
};

export type CreatePaymentParams = {
  orderId: number;
  outSum: number;
  description: string;
  returnUrl: string;
  email?: string;
  /** Our own order-binding token, stored in payment metadata (not used as the API idempotence key). */
  paymentToken: string;
  /** Idempotence-Key for this specific attempt — a fresh value creates a fresh payment/charge. */
  idempotenceKey: string;
};

async function yookassaFetch(cfg: YookassaConfig, path: string, init: RequestInit): Promise<YookassaPayment> {
  const res = await fetch(`${cfg.apiUrl}${path}`, {
    ...init,
    headers: { Authorization: authHeader(cfg), ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`YooKassa API error ${res.status}: ${text}`);
  }
  return res.json();
}

/**
 * Creates a YooKassa payment and returns it, including the confirmation
 * redirect URL the buyer should be sent to. Auto-captures on success (no
 * separate two-phase capture step) since donate-shop purchases are digital
 * goods granted immediately upon payment.
 */
export async function createPayment(cfg: YookassaConfig, p: CreatePaymentParams): Promise<YookassaPayment> {
  const amount = { value: formatAmount(p.outSum), currency: "RUB" };
  return yookassaFetch(cfg, "/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotence-Key": p.idempotenceKey },
    body: JSON.stringify({
      amount,
      capture: true,
      description: p.description,
      confirmation: { type: "redirect", return_url: p.returnUrl },
      metadata: { orderId: String(p.orderId), paymentToken: p.paymentToken },
      // Receipt data for 54-FZ fiscalization. If the shop already generates
      // receipts on its own (some YooKassa setups do), this block can be
      // dropped — leaving it in is harmless when receipts are required and
      // an email is available, and is simply omitted otherwise.
      ...(p.email
        ? {
            receipt: {
              customer: { email: p.email },
              items: [
                {
                  description: p.description.slice(0, 128),
                  quantity: "1.00",
                  amount,
                  vat_code: 1,
                  payment_subject: "service",
                  payment_mode: "full_payment",
                },
              ],
            },
          }
        : {}),
    }),
  });
}

/** Authoritative status check — always call this before granting anything from a webhook. */
export async function getPayment(cfg: YookassaConfig, paymentId: string): Promise<YookassaPayment> {
  return yookassaFetch(cfg, `/payments/${encodeURIComponent(paymentId)}`, { method: "GET" });
}
