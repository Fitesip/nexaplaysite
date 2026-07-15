export const REFERRAL_SIGNUP_BONUS_KOPECKS = 2_500;
export const REFERRER_PURCHASE_REWARD_PERCENT = 5;

export function referralPurchaseRewardKopecks(totalRubles: number): number {
  if (!Number.isFinite(totalRubles) || totalRubles <= 0) return 0;
  return Math.round((totalRubles * 100 * REFERRER_PURCHASE_REWARD_PERCENT) / 100);
}

export function formatRubleBalance(balanceKopecks: number): string {
  const rubles = balanceKopecks / 100;
  return `${rubles.toLocaleString("ru-RU", {
    minimumFractionDigits: Number.isInteger(rubles) ? 0 : 2,
    maximumFractionDigits: 2,
  })} ₽`;
}
