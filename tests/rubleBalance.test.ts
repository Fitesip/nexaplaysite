import { describe, expect, it } from "vitest";
import {
  formatRubleBalance,
  referralPurchaseRewardKopecks,
  REFERRAL_SIGNUP_BONUS_KOPECKS,
} from "@/lib/rubleBalance";

describe("ruble balance", () => {
  it("grants a 25 ruble signup bonus", () => {
    expect(REFERRAL_SIGNUP_BONUS_KOPECKS).toBe(2_500);
  });

  it("calculates five percent of the paid order total in kopecks", () => {
    expect(referralPurchaseRewardKopecks(199)).toBe(995);
    expect(referralPurchaseRewardKopecks(449)).toBe(2_245);
    expect(referralPurchaseRewardKopecks(0)).toBe(0);
  });

  it("formats whole rubles and kopecks", () => {
    expect(formatRubleBalance(2_500)).toBe("25 ₽");
    expect(formatRubleBalance(995)).toBe("9,95 ₽");
  });
});
