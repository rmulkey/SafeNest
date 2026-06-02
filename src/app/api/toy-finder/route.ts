import { NextRequest, NextResponse } from "next/server";
import { groq } from "next-sanity";
import { sanityClient } from "@/lib/sanity/client";

/**
 * POST /api/toy-finder
 *
 * Returns real toy review matches for the Toy Finder wizard.
 * Matching is based on VERIFIED data only:
 *   - age (months) against each review's ageRange
 *   - interests against the review's category slug
 * Results are sorted by safety score (highest first).
 *
 * Budget is accepted to capture user intent but is NOT used to filter, because
 * we do not store verified per-product prices. Live prices are shown on Amazon.
 */

interface FinderRequest {
  ageMonths?: number;
  categories?: string[]; // category slugs
  budget?: string; // "under-25" | "25-50" | "50-plus" | "any"
}

const matchQuery = groq`
  *[
    _type == "toyReview" &&
    ageRange.minMonths <= $ageMonths &&
    ageRange.maxMonths >= $ageMonths &&
    (count($cats) == 0 || category->slug.current in $cats)
  ] | order(safetyScore desc) [0...6] {
    _id,
    productName,
    slug,
    ageRange,
    safetyScore,
    developmentScore,
    hasActiveRecall,
    affiliateLinks,
    mainImage,
    category->{ title, "slug": slug.current }
  }
`;

// Fallback when no category match: best-rated toys for the age alone.
const ageOnlyQuery = groq`
  *[
    _type == "toyReview" &&
    ageRange.minMonths <= $ageMonths &&
    ageRange.maxMonths >= $ageMonths
  ] | order(safetyScore desc) [0...6] {
    _id,
    productName,
    slug,
    ageRange,
    safetyScore,
    developmentScore,
    hasActiveRecall,
    affiliateLinks,
    mainImage,
    category->{ title, "slug": slug.current }
  }
`;

export async function POST(request: NextRequest) {
  let body: FinderRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const ageMonths = Number(body.ageMonths);
  if (!Number.isFinite(ageMonths) || ageMonths < 0 || ageMonths > 144) {
    return NextResponse.json(
      { error: "A valid child age (in months) is required." },
      { status: 400 }
    );
  }

  const cats = Array.isArray(body.categories) ? body.categories.filter(Boolean) : [];

  try {
    let results = await sanityClient.fetch(matchQuery, { ageMonths, cats });
    let relaxed = false;

    // If the interest filter yielded nothing, fall back to age-only matches
    // so the user always gets a helpful, real recommendation.
    if ((!results || results.length === 0) && cats.length > 0) {
      results = await sanityClient.fetch(ageOnlyQuery, { ageMonths });
      relaxed = true;
    }

    return NextResponse.json({
      results: results ?? [],
      relaxed,
      echo: { ageMonths, categories: cats, budget: body.budget ?? "any" },
    });
  } catch (error) {
    console.error("[toy-finder] query failed:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "We couldn't load recommendations right now. Please try again." },
      { status: 500 }
    );
  }
}
