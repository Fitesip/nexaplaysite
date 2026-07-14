/**
 * Picks the correct Russian plural form for a count, e.g. pluralize(n, ["ответ", "ответа", "ответов"])
 * -> "1 ответ", "3 ответа", "5 ответов".
 */
export function pluralize(n: number, [one, few, many]: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return few;
  return many;
}

/** Shorthand for the "N ответ/ответа/ответов" wording used across the forum. */
export function pluralAnswers(n: number): string {
  return pluralize(n, ["ответ", "ответа", "ответов"]);
}
