/**
 * Robokassa payment helpers.
 *
 * Credentials are read from env (see `.env` docs in the PR). While the shop is
 * not configured, all values are empty stubs and `isRobokassaConfigured()`
 * returns false, so the API responds with a clear "not configured" error
 * instead of building broken payment links.
 *
 * Signature rules (configured MD5/SHA-256/SHA-512, hex, case-insensitive):
 *   payment link : MerchantLogin:OutSum:InvId:Password#1[:Shp_...]
 *   ResultURL    : OutSum:InvId:Password#2[:Shp_...]
 *   SuccessURL   : OutSum:InvId:Password#1[:Shp_...]
 * Custom Shp_* parameters, if any, are appended in alphabetical order.
 */
import { createHash, timingSafeEqual } from "crypto";

export type RobokassaConfig = {
  merchantLogin: string;
  password1: string;
  password2: string;
  hashAlgorithm: "md5" | "sha256" | "sha512";
  testMode: boolean;
  paymentUrl: string;
};

export function getRobokassaConfig(): RobokassaConfig {
  const testMode =
    process.env.ROBOKASSA_TEST_MODE === "1" ||
    process.env.ROBOKASSA_TEST_MODE === "true";
  const configuredAlgorithm = process.env.ROBOKASSA_HASH_ALGORITHM?.toLowerCase();
  const hashAlgorithm =
    configuredAlgorithm === "sha256" || configuredAlgorithm === "sha512"
      ? configuredAlgorithm
      : "md5";
  return {
    merchantLogin: process.env.ROBOKASSA_MERCHANT_LOGIN ?? "",
    password1: process.env.ROBOKASSA_PASSWORD_1 ?? "",
    password2: process.env.ROBOKASSA_PASSWORD_2 ?? "",
    hashAlgorithm,
    testMode,
    paymentUrl:
      process.env.ROBOKASSA_PAYMENT_URL ??
      "https://auth.robokassa.ru/Merchant/Payment/Index",
  };
}

export function isRobokassaConfigured(cfg: RobokassaConfig = getRobokassaConfig()): boolean {
  return Boolean(cfg.merchantLogin && cfg.password1 && cfg.password2);
}

function hash(cfg: RobokassaConfig, input: string): string {
  return createHash(cfg.hashAlgorithm).update(input, "utf8").digest("hex");
}

/** Robokassa expects the sum with a dot as the decimal separator. */
export function formatOutSum(rubles: number): string {
  return rubles.toFixed(2);
}

function shpSuffix(shp: Record<string, string>): string[] {
  return Object.keys(shp)
    .sort()
    .map((key) => `${key}=${shp[key]}`);
}

export function paymentSignature(
  cfg: RobokassaConfig,
  outSum: string,
  invId: number,
  shp: Record<string, string> = {}
): string {
  return hash(
    cfg,
    [cfg.merchantLogin, outSum, String(invId), cfg.password1, ...shpSuffix(shp)].join(":")
  );
}

export function resultSignature(
  cfg: RobokassaConfig,
  outSum: string,
  invId: number,
  shp: Record<string, string> = {}
): string {
  return hash(cfg, [outSum, String(invId), cfg.password2, ...shpSuffix(shp)].join(":"));
}

export function successSignature(
  cfg: RobokassaConfig,
  outSum: string,
  invId: number,
  shp: Record<string, string> = {}
): string {
  return hash(cfg, [outSum, String(invId), cfg.password1, ...shpSuffix(shp)].join(":"));
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a.toLowerCase());
  const right = Buffer.from(b.toLowerCase());
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyResultSignature(
  cfg: RobokassaConfig,
  outSum: string,
  invId: number,
  received: string,
  shp: Record<string, string> = {}
): boolean {
  return safeEqual(received, resultSignature(cfg, outSum, invId, shp));
}

export function verifySuccessSignature(
  cfg: RobokassaConfig,
  outSum: string,
  invId: number,
  received: string,
  shp: Record<string, string> = {}
): boolean {
  return safeEqual(received, successSignature(cfg, outSum, invId, shp));
}

export type PaymentLinkParams = {
  invId: number;
  outSum: number;
  description: string;
  email?: string;
  shp?: Record<string, string>;
};

export function buildPaymentUrl(cfg: RobokassaConfig, p: PaymentLinkParams): string {
  const outSum = formatOutSum(p.outSum);
  const shp = p.shp ?? {};
  const params = new URLSearchParams({
    MerchantLogin: cfg.merchantLogin,
    OutSum: outSum,
    InvId: String(p.invId),
    Description: p.description,
    SignatureValue: paymentSignature(cfg, outSum, p.invId, shp),
    Culture: "ru",
    Encoding: "utf-8",
  });
  for (const [key, value] of Object.entries(shp)) params.set(key, value);
  if (p.email) params.set("Email", p.email);
  if (cfg.testMode) params.set("IsTest", "1");
  return `${cfg.paymentUrl}?${params.toString()}`;
}
