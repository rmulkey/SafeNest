/**
 * Pure, framework-free search filtering for the global toy-review search.
 *
 * Kept separate from the route handler so the matching logic can be unit-tested
 * in isolation and reused on both server and client without pulling in Next.js
 * or Sanity dependencies.
 */

export interface SanityImageRef {
  asset?: { _ref?: string };
  alt?: string;
}

export interface SearchableReview {
  _id: string;
  productName: string;
  slug: { current: string };
  category: string | null;
  safetyScore: number | null;
  ageRange?: { minMonths: number; maxMonths: number } | null;
  mainImage?: SanityImageRef | null;
}

/** Maximum number of results returned to the client. */
export const SEARCH_RESULT_LIMIT = 8;

/**
 * Case-insensitively filter reviews by product name and category.
 *
 * - An empty/whitespace-only query returns no results (the UI shows its initial
 *   suggestions instead of the full catalog).
 * - Matching is a substring match against `productName` and `category`.
 * - Results preserve the input order (callers pass them pre-sorted by score)
 *   and are capped at `limit` (default {@link SEARCH_RESULT_LIMIT}).
 */
export function filterReviews(
  reviews: readonly SearchableReview[],
  query: string,
  limit: number = SEARCH_RESULT_LIMIT
): SearchableReview[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return [];

  const matches: SearchableReview[] = [];
  for (const review of reviews) {
    const name = (review.productName ?? "").toLowerCase();
    const category = (review.category ?? "").toLowerCase();
    if (name.includes(needle) || category.includes(needle)) {
      matches.push(review);
      if (matches.length >= limit) break;
    }
  }
  return matches;
}
