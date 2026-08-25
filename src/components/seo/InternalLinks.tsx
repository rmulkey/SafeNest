/**
 * InternalLinks - Displays 3–6 related content links based on shared category and age range.
 *
 * Fetches related toy reviews, buying guides, and age-based guides from Sanity CMS,
 * filtering by matching category or overlapping age range.
 *
 * Requirements: 4.3
 */

import Link from "next/link";
import { sanityClient } from "@/lib/sanity/client";
import {
  relatedGuidesQuery,
  relatedReviewsQuery,
  relatedReviewsCountQuery,
  fallbackRelatedReviewsQuery,
  toyReviewCountQuery,
} from "@/lib/sanity/queries";

interface RelatedItem {
  _id: string;
  _type: "toyReview" | "buyingGuide";
  title: string;
  slug: { current: string };
}

/** A guide candidate, with the fields pickGuides needs to rank it. */
interface GuideCandidate extends RelatedItem {
  categoryId?: string | null;
  targetAgeRange?: { minMonths?: number; maxMonths?: number } | null;
}

/** Total links rendered in the block. */
const MAX_LINKS = 6;

/**
 * Slots held for buying guides before reviews are allowed to fill the rest.
 *
 * Guides are the only pages on this site with organic search visibility, and
 * there are 12 of them against 138 reviews. Without a reserved share they lose
 * every slice on volume, which is how 8 of the 12 ended up with a single inbound
 * internal link each. Two of six keeps the block useful to a reader — a guide is
 * a reasonable next click from a review — without turning it into a guide index.
 */
const GUIDE_SLOTS = 2;

interface InternalLinksProps {
  /** The current document's Sanity _id (to exclude from results) */
  currentDocId: string;
  /** The category reference ID for matching related content */
  categoryId?: string | null;
  /** Age range for matching related content */
  ageRange?: { minMonths: number; maxMonths: number } | null;
}

// `ageBasedGuide` used to be handled here. No document of that type exists — the
// /best-toys/[age] pages are generated from code, not from the CMS — so the
// branch was unreachable and is gone.
function getHref(item: RelatedItem): string {
  const slug = item.slug.current;
  return item._type === "buyingGuide" ? `/guides/${slug}` : `/reviews/${slug}`;
}

function getTypeLabel(type: RelatedItem["_type"]): string {
  return type === "buyingGuide" ? "Guide" : "Review";
}

/**
 * Deterministic non-negative hash, so a page's picks never churn between builds.
 *
 * FNV-1a plus an avalanche finaliser rather than the obvious `hash * 31 + char`.
 * That simpler form is not good enough here: for inputs sharing a prefix — which
 * every `${pageId}:${guideId}` pair does — it leaves the difference confined to
 * the low bits, so `a:g1 < a:g2 < a:g3` held for every page and the tiebreak
 * ranked identically everywhere. Diffusing the last byte across the whole word
 * is the point, not speed.
 */
function stableHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

/**
 * A stable, evenly spread starting offset into a set of `total` reviews.
 *
 * Derived from the requesting document's id so each page gets a different slice
 * of the catalog, and the same slice on every render. Both review queries used a
 * fixed ordering before this — `_createdAt desc` for the matched set and
 * `safetyScore desc` for the fallback — and both therefore returned the same
 * handful of reviews to every page that called them.
 */
function windowOffset(currentDocId: string, total: number, salt: string): number {
  if (total <= MAX_LINKS) return 0;
  // Keep a full window of MAX_LINKS available at the end of the range.
  return stableHash(`${salt}:${currentDocId}`) % (total - MAX_LINKS);
}

/**
 * Choose which guides sit next to this page.
 *
 * The first slot goes to the best fit:
 *   1. Category match. A building-toys review should surface the building guide.
 *   2. Narrowest age range. "Best toys for 6–12 months" (a 6-month span) is a
 *      better neighbour for an infant toy than "best wooden toys" (0–96 months),
 *      which overlaps every age on the site.
 *   3. A deterministic tiebreak, so equally good guides do not order identically
 *      on every page.
 *
 * Remaining slots rotate purely on the tiebreak. Ranking every slot by fit looks
 * more principled and measurably is not: scored that way, the three broadest
 * guides lost every slot on every page and stayed on one inbound link each —
 * including best-wooden-nontoxic-toys, which ranks for "non toxic wood toys".
 * Sorting by fit throughout just moves the starvation from the narrow guides to
 * the broad ones. One slot for relevance and one for rotation gives every
 * matching guide a share.
 */
export function pickGuides(
  candidates: GuideCandidate[],
  opts: { currentDocId: string; categoryId?: string | null },
  limit: number
): GuideCandidate[] {
  if (candidates.length === 0 || limit <= 0) return [];

  const scored = candidates.map((guide) => {
    const min = guide.targetAgeRange?.minMonths ?? 0;
    const max = guide.targetAgeRange?.maxMonths ?? 120;
    return {
      guide,
      // 0 sorts ahead of 1.
      categoryRank:
        opts.categoryId && guide.categoryId === opts.categoryId ? 0 : 1,
      span: Math.max(0, max - min),
      tiebreak: stableHash(`${opts.currentDocId}:${guide._id}`),
    };
  });

  const bestFit = [...scored].sort(
    (a, z) =>
      a.categoryRank - z.categoryRank ||
      a.span - z.span ||
      a.tiebreak - z.tiebreak
  )[0];

  const rotated = scored
    .filter((s) => s.guide._id !== bestFit.guide._id)
    .sort((a, z) => a.tiebreak - z.tiebreak);

  return [bestFit, ...rotated].slice(0, limit).map((s) => s.guide);
}

export async function InternalLinks({
  currentDocId,
  categoryId,
  ageRange,
}: InternalLinksProps) {
  const params = {
    currentDocId,
    categoryId: categoryId ?? "",
    minMonths: ageRange?.minMonths ?? 0,
    maxMonths: ageRange?.maxMonths ?? 120,
  };

  // Guides first, in their own query, so reviews cannot take every slot. The
  // matched-review count comes along in the same wave because the review window
  // needs it to know how far it can rotate.
  const [guideCandidates, matchedReviewCount] = await Promise.all([
    sanityClient.fetch<GuideCandidate[]>(relatedGuidesQuery, params),
    sanityClient.fetch<number>(relatedReviewsCountQuery, params),
  ]);

  const reviews = await sanityClient.fetch<RelatedItem[]>(relatedReviewsQuery, {
    ...params,
    reviewOffset: windowOffset(
      currentDocId,
      matchedReviewCount ?? 0,
      "matched"
    ),
  });

  const combined: RelatedItem[] = pickGuides(
    guideCandidates ?? [],
    { currentDocId, categoryId },
    GUIDE_SLOTS
  );
  const seen = new Set(combined.map((i) => i._id));

  for (const item of reviews ?? []) {
    if (combined.length >= MAX_LINKS) break;
    if (seen.has(item._id)) continue;
    seen.add(item._id);
    combined.push(item);
  }

  // If the category/age match is thin, top up from the wider catalog so the page
  // still offers real internal links (better crawl depth + UX).
  if (combined.length < MAX_LINKS) {
    const reviewCount = await sanityClient.fetch<number>(toyReviewCountQuery);
    const fallback = await sanityClient.fetch<RelatedItem[]>(
      fallbackRelatedReviewsQuery,
      {
        currentDocId,
        fallbackOffset: windowOffset(
          currentDocId,
          reviewCount ?? 0,
          "fallback"
        ),
      }
    );
    for (const item of fallback ?? []) {
      if (combined.length >= MAX_LINKS) break;
      if (seen.has(item._id)) continue;
      seen.add(item._id);
      combined.push(item);
    }
  }

  // Render only when there are at least 2 links to show (avoids a lone link).
  if (combined.length < 2) {
    return null;
  }

  const links = combined.slice(0, MAX_LINKS);

  return (
    <aside aria-label="Related content" className="mt-12 border-t pt-8">
      <h2 className="text-lg font-semibold mb-4">Related Content</h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {links.map((item) => (
          <li key={item._id}>
            <Link
              href={getHref(item)}
              className="block rounded-lg border border-border p-3 hover:border-primary-400 hover:shadow-sm transition-all"
            >
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {getTypeLabel(item._type)}
              </span>
              <p className="mt-1 text-sm font-medium">{item.title}</p>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
