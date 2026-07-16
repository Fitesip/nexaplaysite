import { describe, expect, it } from "vitest";
import {
  buildPaymentUrl,
  formatOutSum,
  paymentSignature,
  resultSignature,
  successSignature,
  verifyResultSignature,
} from "../lib/robokassa";

const cfg = {
  merchantLogin: "test",
  password1: "pass1",
  password2: "pass2",
  hashAlgorithm: "md5" as const,
  testMode: true,
  paymentUrl: "https://auth.robokassa.ru/Merchant/Payment/Index",
};

describe("Robokassa signatures", () => {
  it("uses fixed two-decimal OutSum formatting", () => {
    expect(formatOutSum(123)).toBe("123.00");
    expect(formatOutSum(123.45)).toBe("123.45");
  });

  it("creates documented payment/result/success MD5 signatures", () => {
    expect(paymentSignature(cfg, "123.45", 42)).toBe(
      "ba21b42b8a4e53c4b0be637805401bc8"
    );
    expect(resultSignature(cfg, "123.45", 42)).toBe(
      "644a5148ffa028f05139be01d30f25a9"
    );
    expect(successSignature(cfg, "123.45", 42)).toBe(
      "3b1b036455e559295dcaffdec155c3d8"
    );
  });

  it("includes sorted Shp parameters in signatures and payment URLs", () => {
    const shp = { Shp_paymentToken: "abc" };
    expect(paymentSignature(cfg, "123.45", 42, shp)).toBe(
      "af60856546dbac42b147b149557c9c66"
    );
    expect(resultSignature(cfg, "123.45", 42, shp)).toBe(
      "73c81a24d2e88a8ba88be2337b031d2c"
    );

    const url = new URL(
      buildPaymentUrl(cfg, {
        invId: 42,
        outSum: 123.45,
        description: "Order 42",
        shp,
      })
    );
    expect(url.searchParams.get("SignatureValue")).toBe(
      "af60856546dbac42b147b149557c9c66"
    );
    expect(url.searchParams.get("Shp_paymentToken")).toBe("abc");
    expect(url.searchParams.get("IsTest")).toBe("1");
  });

  it("compares result signatures case-insensitively", () => {
    expect(
      verifyResultSignature(
        cfg,
        "123.45",
        42,
        "73C81A24D2E88A8BA88BE2337B031D2C",
        { Shp_paymentToken: "abc" }
      )
    ).toBe(true);
  });
});
