/**
 * Seasonal content rotation.
 *
 * Seasonal posts (holiday gift guides, summer water-play roundups, back-to-school)
 * are only relevant for part of the year, but they should keep their URL and
 * search equity permanently. Rather than deleting or hiding them, each seasonal
 * post declares an annually recurring window as month/day pairs. While the window
 * is open the post is surfaced prominently; outside it the post simply sits in the
 * normal chronological archive.
 *
 * Windows recur every year, so a post authored once resurfaces automatically each
 * season with no manual intervention.
 */

/** A month/day string in `MM-DD` form, e.g. "07-04". */
export type MonthDay = string;

export interface SeasonalWindow {
  /** Inclusive start, `MM-DD`. */
  startMonthDay: MonthDay;
  /** Inclusive end, `MM-DD`. May be earlier than start to wrap the new year. */
  endMonthDay: MonthDay;
}

const MONTH_DAY_RE = /^(\d{2})-(\d{2})$/;

/**
 * Parse `MM-DD` into a comparable ordinal (month * 100 + day).
 * Returns null when the value is malformed or not a plausible calendar date, so
 * bad data degrades to "no season" rather than throwing in a render path.
 */
export function parseMonthDay(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const m = value.match(MONTH_DAY_RE);
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  if (month < 1 || month > 12) return null;
  // Use 31 as the upper bound rather than per-month lengths: windows are
  // inclusive ranges, so an over-long end date is harmless, and this keeps
  // Feb 29 valid in non-leap years.
  if (day < 1 || day > 31) return null;
  return month * 100 + day;
}

export function isValidWindow(window: unknown): window is SeasonalWindow {
  if (!window || typeof window !== "object") return false;
  const w = window as Partial<SeasonalWindow>;
  return (
    parseMonthDay(w.startMonthDay) !== null &&
    parseMonthDay(w.endMonthDay) !== null
  );
}

/**
 * Is `now` inside the annually recurring window?
 *
 * Handles windows that wrap the year end (e.g. start "11-15", end "01-05"),
 * which is the common case for winter-holiday content.
 */
export function isInSeason(
  window: unknown,
  now: Date = new Date()
): boolean {
  if (!isValidWindow(window)) return false;
  const start = parseMonthDay(window.startMonthDay)!;
  const end = parseMonthDay(window.endMonthDay)!;
  const today = (now.getMonth() + 1) * 100 + now.getDate();

  // Non-wrapping window: a single contiguous range within the year.
  if (start <= end) return today >= start && today <= end;
  // Wrapping window: either late in the year or early in the next.
  return today >= start || today <= end;
}

export interface SeasonalCandidate {
  seasonal?: unknown;
}

/** Filter a list down to the items whose seasonal window is currently open. */
export function selectInSeason<T extends SeasonalCandidate>(
  items: T[],
  now: Date = new Date()
): T[] {
  return items.filter((item) => isInSeason(item.seasonal, now));
}

/**
 * True when an item declares a seasonal window that is NOT currently open.
 * Useful for labelling archived seasonal content ("out of season") without
 * removing it from the archive.
 */
export function isOutOfSeason(
  item: SeasonalCandidate,
  now: Date = new Date()
): boolean {
  return isValidWindow(item.seasonal) && !isInSeason(item.seasonal, now);
}
