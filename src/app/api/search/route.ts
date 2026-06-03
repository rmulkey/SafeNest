import { NextRequest, NextResponse } from "next/server";
import { cacheLife } from "next/cache";
import { sanityClient } from "@/lib/sanity/client";
import { searchableToyReviewsQuery } from "@/lib/sanity/queries";
import {
  filterReviews,
  SEARCH_RESULT_LIMIT,
  type SearchableReview,
} from "@/lib/search/filter";

/**
 * GET /api/search?q=<term>
 *
 * Global client-side search over the toy review catalog. Fetches a lightweight
 * projection of ALL reviews (cached) and filters them case-insensitively by
 * product name + category, returning the top results as JSON.
 *
 * Resilient by design: any failure returns `{ results: [] }` with a 200 so the
 * search UI degrades gracefully instead of surfacing an error to the user.
 */

/**
 * Fetches the searchable review catalog. Wrapped in `use cache` (extracted to a
 * helper, since `use cache` cannot live directly in a Route Handler body) so the
 * full catalog is fetched once and reused across search requests.
 */
async function getSearchableReviews(): Promise<SearchableReview[]> {
  "use cache";
  cacheLife("hours");

  const reviews = await sanityClient.fetch<SearchableReview[]>(
    searchableToyReviewsQuery
  );
  return reviews ?? [];
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";

  try {
    const reviews = await getSearchableReviews();
    const results = filterReviews(reviews, query, SEARCH_RESULT_LIMIT);
    return NextResponse.json({ results });
  } catch (error) {
    console.error(
      "[search] query failed:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json({ results: [] });
  }
}
