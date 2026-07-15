import { describe, expect, it } from "vitest";
import { caseRewardCredits, sumCaseRewardCredits } from "@/lib/caseReward";

describe("case reward credits", () => {
  it("credits rubles to the ruble balance without game currency", () => {
    expect(caseRewardCredits("rubles", false, 900, 2_500)).toEqual({
      gameCurrency: 0,
      rubleBalanceKopecks: 2_500,
      autoClaimed: true,
    });
  });

  it("keeps duplicate compensation in game currency", () => {
    expect(caseRewardCredits("privilege", true, 900, 2_500)).toEqual({
      gameCurrency: 900,
      rubleBalanceKopecks: 0,
      autoClaimed: true,
    });
  });

  it("sums single rewards for a bulk opening", () => {
    const total = sumCaseRewardCredits([
      caseRewardCredits("rubles", false, 0, 1_500),
      caseRewardCredits("rubles", false, 0, 2_500),
      caseRewardCredits("pet", true, 750, 0),
    ]);

    expect(total.gameCurrency).toBe(750);
    expect(total.rubleBalanceKopecks).toBe(4_000);
  });
});
