/**
 * Single source of truth for site-wide counts used in user-facing copy.
 *
 * WHY THIS EXISTS
 * The homepage advertised "50+ expert reviews" while the catalog actually held
 * 132 reviews. Hard-coded counts drift silently and become inaccurate claims, so
 * every surface that states a count now derives it from the catalog.
 *
 * Counts are intentionally rendered exactly (not "50+") so the number cannot be
 * quietly wrong in either direction.
 */
import { sanityClient } from "@/lib/sanity/client";
import { REVIEW_METHOD_LABEL } from "./evidence";

export const toyReviewCountQuery = /* groq */ `count(*[_type == "toyReview"])`;

/**
 * Reads the published review count from the catalog.
 *
 * Returns null when the count cannot be read, so callers can omit the claim
 * entirely rather than render a fabricated or zero figure.
 */
export async function getReviewCount(): Promise<number | null> {
  try {
    const count = await sanityClient.fetch<number>(toyReviewCountQuery);
    return typeof count === "number" && count > 0 ? count : null;
  } catch {
    return null;
  }
}

/**
 * Rounds down to a marketing-safe floor (e.g. 132 -> 130) for contexts where an
 * approximate figure reads better. Always understates, never overstates, so the
 * claim stays true as the catalog grows between deploys.
 */
export function reviewCountFloor(count: number): number {
  if (count < 10) return count;
  return Math.floor(count / 10) * 10;
}

/**
 * Canonical phrase for the review-count claim, e.g.
 * "132 parent-researched reviews".
 *
 * Deliberately avoids "expert" — see lib/content/evidence.ts for why.
 */
export function reviewCountLabel(count: number): string {
  return `${count} ${REVIEW_METHOD_LABEL} reviews`;
}
