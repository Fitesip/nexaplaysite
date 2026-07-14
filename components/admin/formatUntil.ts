/** Formats a ban's expiry timestamp for display, e.g. "до 12.07.2026, 14:30" or "навсегда". */
export function formatUntil(until: string | null) {
  return until ? `до ${new Date(until).toLocaleString("ru-RU")}` : "навсегда";
}
