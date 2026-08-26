/**
 * Shared `?page=` handling for the paginated listing routes.
 *
 * THE PROBLEM THIS FIXES
 * `/recalls`, `/categories/[slug]` and `/blog` each parsed the param themselves,
 * and every copy clamped only the floor:
 *
 *   Math.max(1, Number(params.page) || 1)          // recalls, blog
 *   Math.max(1, parseInt(page || "1", 10) || 1)    // categories
 *
 * With no ceiling, any page number renders. Measured on production:
 *
 *   /recalls?page=10      200, empty state
 *   /recalls?page=99      200, empty state
 *   /recalls?page=99999   200, empty state
 *   /categories/outdoor-toys?page=50  200, empty state
 *
 * Two consequences, and on this site the second is the serious one:
 *
 * 1. Every one of those is a soft 404 — Google's term for a page that reports
 *    success while telling the user there is nothing there.
 * 2. It is unbounded crawl space. `?page=` accepts any integer, so there is no
 *    end to the URLs a crawler can enqueue.
 *
 * Search Console reports 143 of 221 real URLs never crawled, so crawl budget is
 * the binding constraint on this site's growth. Budget spent proving that
 * `?page=4217` is empty is taken directly from pages that have content.
 *
 * The out-of-range check is free: all three routes already fetch `totalCount` in
 * the same `Promise.all` as the item slice, so nothing extra is queried.
 *
 * Also fixes drift the three copies had accumulated: `Number()` versus
 * `parseInt()`, and `Math.max(1, Math.ceil(...))` on one route against a bare
 * `Math.ceil(...)` on the other two — which mattered, because a bare ceil gives
 * `totalPages === 0` for an empty collection and a naive out-of-range test would
 * then 404 `?page=1` and hide the empty state.
 */

/**
 * Parse `?page=` into a 1-based integer.
 *
 * Anything not a finite integer of at least 1 becomes 1, which preserves the
 * existing forgiving behaviour for `?page=0`, `?page=-1` and `?page=abc`. Those
 * render page 1 and canonicalise to the unparameterised URL, so they cost a
 * crawl but cannot rank or mislead.
 *
 * Non-integers are truncated rather than passed through: `Number("2.7")` is 2.7,
 * which produced a fractional GROQ slice offset.
 */
export function parsePageParam(raw: string | undefined | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 1;
  const truncated = Math.trunc(n);
  return truncated < 1 ? 1 : truncated;
}

/** Zero-based slice bounds for a page, for GROQ's `[$start...$end]`. */
export function pageBounds(
  page: number,
  perPage: number
): { start: number; end: number } {
  const start = (page - 1) * perPage;
  return { start, end: start + perPage };
}

/**
 * Number of pages, floored at 1.
 *
 * An empty collection still has a page 1 — the one that renders the empty state.
 * Returning 0 there is what would make an out-of-range check 404 a legitimately
 * empty listing.
 */
export function countPages(totalCount: number, perPage: number): number {
  if (!Number.isFinite(totalCount) || totalCount <= 0) return 1;
  return Math.max(1, Math.ceil(totalCount / perPage));
}

/**
 * Whether this page is past the end and should 404.
 *
 * Page 1 is never out of range, so an empty listing keeps its empty state
 * instead of turning into a 404.
 */
export function isPageOutOfRange(
  page: number,
  totalCount: number,
  perPage: number
): boolean {
  if (page <= 1) return false;
  return page > countPages(totalCount, perPage);
}

/**
 * Build a listing URL for a page number.
 *
 * `page=1` is omitted, so page 1 is only ever addressed as the bare path. The two
 * spellings served byte-identical HTML — verified on production, same visible
 * text hash — and `?page=1` already canonicalised to the bare path, so it could
 * not rank. It could still be discovered and crawled, because the "Previous" link
 * on page 2 pointed at it. Omitting the param keeps that duplicate out of the
 * internal link graph entirely.
 *
 * Other params (such as the recall search `q`) are preserved, since dropping them
 * would silently reset a filtered listing when the reader paged through it.
 */
export function buildPageHref(
  basePath: string,
  page: number,
  extraParams: Record<string, string | undefined> = {}
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(extraParams)) {
    if (value !== undefined && value !== "") search.set(key, value);
  }
  if (page > 1) search.set("page", String(page));
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
