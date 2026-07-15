export type CaseRewardCredits = {
  gameCurrency: number;
  rubleBalanceKopecks: number;
  autoClaimed: boolean;
};

export function caseRewardCredits(
  itemType: string,
  duplicateUnique: boolean,
  priceCurrency: number,
  rubleAmountKopecks: number
): CaseRewardCredits {
  const gameCurrency = duplicateUnique ? Math.max(0, priceCurrency) : 0;
  const rubles = itemType === "rubles" ? Math.max(0, rubleAmountKopecks) : 0;
  return {
    gameCurrency,
    rubleBalanceKopecks: rubles,
    autoClaimed: duplicateUnique || rubles > 0,
  };
}

export function sumCaseRewardCredits(
  rewards: CaseRewardCredits[]
): CaseRewardCredits {
  return rewards.reduce(
    (total, reward) => ({
      gameCurrency: total.gameCurrency + reward.gameCurrency,
      rubleBalanceKopecks:
        total.rubleBalanceKopecks + reward.rubleBalanceKopecks,
      autoClaimed: total.autoClaimed || reward.autoClaimed,
    }),
    { gameCurrency: 0, rubleBalanceKopecks: 0, autoClaimed: false }
  );
}
