/**
 * Centralised age formatting.
 *
 * Four separate implementations of this existed (guides page, ReviewCard,
 * SearchDialog, review detail page), and the guides one produced ungrammatical
 * output such as "1 years" and "0 months – 1 years". This is the single formatter
 * they should all use.
 *
 * Rules:
 *  - Singular/plural is always correct: "1 month", "6 months", "1 year", "2 years".
 *  - Ranges under a year stay in months; ranges spanning a year use whichever unit
 *    reads naturally on each side.
 *  - A range starting at 0 months reads "Birth" rather than "0 months".
 *  - Equal bounds collapse to a single value instead of "2–2 years".
 */

const EN_DASH = "\u2013";

/** Pluralise a unit correctly. `1 month`, `2 months`. */
export function pluralize(count: number, unit: "month" | "year"): string {
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

/** Format a single age in months into the most natural unit. */
export function formatAge(months: number): string {
  if (!Number.isFinite(months) || months < 0) return "Age not specified";
  const m = Math.round(months);
  if (m === 0) return "Birth";
  if (m < 12) return pluralize(m, "month");
  if (m % 12 === 0) return pluralize(m / 12, "year");
  // Non-whole years below two years read better in months (e.g. "18 months").
  if (m < 24) return pluralize(m, "month");
  return pluralize(Math.floor(m / 12), "year");
}

/**
 * Format an age range.
 *
 * Examples:
 *   (0, 12)  -> "Birth–12 months"
 *   (6, 12)  -> "6–12 months"
 *   (12, 24) -> "1–2 years"
 *   (6, 24)  -> "6 months–2 years"
 *   (24, 24) -> "2 years"
 *   (36, 96) -> "3–8 years"
 */
export function formatAgeRange(
  minMonths: number,
  maxMonths: number
): string {
  const validMin = Number.isFinite(minMonths) && minMonths >= 0;
  const validMax = Number.isFinite(maxMonths) && maxMonths >= 0;
  if (!validMin && !validMax) return "Age not specified";
  if (!validMax) return `${formatAge(minMonths)}+`;
  if (!validMin) return `Up to ${formatAge(maxMonths)}`;

  const lo = Math.round(minMonths);
  const hi = Math.round(maxMonths);

  if (hi < lo) return formatAge(lo);
  if (lo === hi) return formatAge(lo);

  // The unit is chosen for the range as a whole, not per bound. 12 months has to
  // read as "12 months" beside 6 ("6–12 months") but as "1 year" beside 24
  // ("1–2 years"), so deciding each side independently cannot work.
  const inMonths = (loVal: number, hiVal: number) =>
    loVal === 0
      ? `Birth${EN_DASH}${pluralize(hiVal, "month")}`
      : `${loVal}${EN_DASH}${pluralize(hiVal, "month")}`;

  // Birth-anchored ranges read more naturally in months up to two years:
  // "Birth–18 months" rather than "Birth–1 year".
  if (lo === 0 && hi <= 24) return inMonths(0, hi);

  // 1. Entirely under a year (12 included) — months on both sides.
  if (hi <= 12) return inMonths(lo, hi);

  // 2. Both bounds land on whole years — years on both sides.
  if (lo >= 12 && lo % 12 === 0 && hi % 12 === 0) {
    return `${lo / 12}${EN_DASH}${pluralize(hi / 12, "year")}`;
  }

  // 3. Still under two years — months read better than fractional years.
  if (lo > 0 && hi < 24) return inMonths(lo, hi);

  // 4. Both bounds are two years or more — years on both sides. Partial years
  //    floor, so 24–30 months collapses to "2 years" instead of "2 years–2 years".
  if (lo >= 24 && hi >= 24) {
    const loYears = Math.floor(lo / 12);
    const hiYears = Math.floor(hi / 12);
    if (loYears === hiYears) return pluralize(loYears, "year");
    return `${loYears}${EN_DASH}${pluralize(hiYears, "year")}`;
  }

  // 5. Genuinely mixed units — keep both, so nothing reads as "1 years".
  //    e.g. "6 months–2 years", "18 months–3 years".
  const loLabel = lo === 0 ? "Birth" : formatAge(lo);
  const hiLabel = formatAge(hi);
  if (loLabel === hiLabel) return loLabel;
  return `${loLabel}${EN_DASH}${hiLabel}`;
}

/** Manufacturer age guidance, explicitly attributed. */
export function manufacturerAgeGuidance(
  minMonths: number,
  maxMonths: number
): string {
  return `Manufacturer guidance: ${formatAgeRange(minMonths, maxMonths)}`;
}
