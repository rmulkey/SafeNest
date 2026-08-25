import { groq } from "next-sanity";
import { sanityClient } from "@/lib/sanity/client";

// ─── Constants ──────────────────────────────────────────────────────────────────

/** Age values in months for "best toys for [age]" pages */
export const AGE_MONTHS = [3, 6, 9, 12, 18, 24, 36] as const;

/** Age groups for "best [category] toys for [age group]" pages */
export const AGE_GROUPS = [
  { slug: "0-6-months", label: "0–6 Months", minMonths: 0, maxMonths: 6 },
  { slug: "6-12-months", label: "6–12 Months", minMonths: 6, maxMonths: 12 },
  { slug: "12-24-months", label: "12–24 Months", minMonths: 12, maxMonths: 24 },
  { slug: "24-36-months", label: "24–36 Months", minMonths: 24, maxMonths: 36 },
] as const;

export type AgeGroup = (typeof AGE_GROUPS)[number];

/**
 * Named age-range slugs used across the site's navigation, homepage age cards,
 * and sitemap (e.g. /best-toys/1-2-years). Each maps to a representative age in
 * months that the age page query uses to surface matching reviews.
 *
 * These MUST stay in sync with the links in Header/Navigation, the homepage
 * "Browse by Age" cards, and the static sitemap entries — they are public URLs.
 */
export const AGE_SLUG_TO_MONTHS: Record<string, number> = {
  "0-6-months": 3,
  "6-12-months": 9,
  "0-12-months": 9,
  "12-24-months": 18,
  "1-2-years": 18,
  "2-3-years": 30,
  "24-36-months": 30,
  "3-plus-years": 42,
  "3-4-years": 42,
};

/**
 * Resolve a best-toys age route param to an age in months.
 *
 * Accepts either a raw numeric value ("3", "18") or a named slug
 * ("1-2-years", "0-6-months"). Returns null when the param is neither a known
 * slug nor a positive integer, so the page can render notFound().
 */
export function resolveAgeParam(param: string): number | null {
  if (param in AGE_SLUG_TO_MONTHS) {
    return AGE_SLUG_TO_MONTHS[param];
  }
  const n = Number(param);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * The single URL form we want indexed for each age in months.
 *
 * `/best-toys/[age]` accepts both raw month counts and several named slugs, and
 * more than one of those can resolve to the same age — so `/best-toys/18`,
 * `/best-toys/12-24-months` and `/best-toys/1-2-years` all render the identical
 * list of toys. Left self-canonicalising, that reads to a search engine as
 * three competing duplicates. Each age therefore declares one preferred slug
 * (the one used by the nav, the homepage age cards and the sitemap) and the
 * other spellings canonicalise to it.
 *
 * Every numeric age maps into the named band that contains it, including the
 * four (6, 12, 24, 36) that have no named slug of their own. Those four opened
 * a band rather than sitting inside one, so they used to be self-canonical —
 * which left `/best-toys/6` competing with `/best-toys/6-12-months` over an
 * almost identical list of toys, on a URL the sitemap deliberately omits. A
 * boundary age belongs to the band it opens.
 */
export const CANONICAL_AGE_SLUG_BY_MONTHS: Record<number, string> = {
  3: "0-6-months",
  6: "6-12-months",
  9: "6-12-months",
  12: "1-2-years",
  18: "1-2-years",
  24: "2-3-years",
  30: "2-3-years",
  36: "3-plus-years",
  42: "3-plus-years",
};

/**
 * The age slugs we want indexed, ascending. Exactly the `/best-toys/[age]` URLs
 * the sitemap lists — the hub, the nav and the homepage age cards all link this
 * set so that internal links, <link rel="canonical"> and the sitemap agree.
 */
export const CANONICAL_AGE_SLUGS: string[] = [
  ...new Set(Object.values(CANONICAL_AGE_SLUG_BY_MONTHS)),
];

/**
 * Resolve a best-toys age route param to the slug that should be canonical.
 *
 * Returns the param unchanged when it is already canonical, when the age has no
 * preferred named slug, or when it does not resolve to a valid age at all (the
 * page renders notFound() in that case, so the value is never used).
 */
export function canonicalAgeSlug(param: string): string {
  const months = resolveAgeParam(param);
  if (months === null) {
    return param;
  }
  return CANONICAL_AGE_SLUG_BY_MONTHS[months] ?? param;
}

/**
 * Human-readable label for a best-toys age route param. Named slugs use their
 * range label (e.g. "1–2 years"); numeric values fall back to formatAgeLabel.
 */
export function formatAgeParamLabel(param: string): string {
  const slugLabels: Record<string, string> = {
    "0-6-months": "0–6 months",
    "6-12-months": "6–12 months",
    "0-12-months": "0–12 months",
    "12-24-months": "12–24 months",
    "1-2-years": "1–2 years",
    "2-3-years": "2–3 years",
    "24-36-months": "24–36 months",
    "3-plus-years": "3+ years",
    "3-4-years": "3–4 years",
  };
  if (param in slugLabels) {
    return slugLabels[param];
  }
  return formatAgeLabel(Number(param));
}

/** Minimum number of matching reviews required to generate a page */
export const MIN_REVIEWS_FOR_PAGE = 3;

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface ProgrammaticPageConfig {
  type: "age" | "category-age" | "toy-type";
  slug: string;
  title: string;
  description: string;
  params: Record<string, string | number>;
}

export interface ToyReviewSummary {
  _id: string;
  productName: string;
  slug: { current: string };
  ageRange: { minMonths: number; maxMonths: number };
  category: { _id: string; title: string; slug: { current: string } } | null;
  safetyScore: number;
  developmentScore: number;
  materials: string[];
  hasActiveRecall: boolean;
  affiliateLinks?: { partnerId: string; url: string; tag: string }[];
  mainImage?: { asset: { _ref: string }; alt?: string };
}

export interface CategorySummary {
  _id: string;
  title: string;
  slug: { current: string };
}

// ─── GROQ Queries ───────────────────────────────────────────────────────────────

const reviewsByAgeQuery = groq`
  *[_type == "toyReview" && ageRange.minMonths <= $age && ageRange.maxMonths >= $age] | order(safetyScore desc) {
    _id,
    productName,
    slug,
    ageRange,
    category->{_id, title, slug},
    safetyScore,
    developmentScore,
    materials,
    hasActiveRecall,
    affiliateLinks,
    mainImage
  }
`;

const reviewsByCategoryAndAgeGroupQuery = groq`
  *[_type == "toyReview" && category._ref == $categoryId && ageRange.minMonths <= $maxMonths && ageRange.maxMonths >= $minMonths] | order(safetyScore desc) {
    _id,
    productName,
    slug,
    ageRange,
    category->{_id, title, slug},
    safetyScore,
    developmentScore,
    materials,
    hasActiveRecall,
    affiliateLinks,
    mainImage
  }
`;

const reviewsByToyTypeQuery = groq`
  *[_type == "toyReview" && $toyType in materials] | order(safetyScore desc) {
    _id,
    productName,
    slug,
    ageRange,
    category->{_id, title, slug},
    safetyScore,
    developmentScore,
    materials,
    hasActiveRecall,
    affiliateLinks,
    mainImage
  }
`;

const allCategoriesQuery = groq`
  *[_type == "category"] {
    _id,
    title,
    slug
  }
`;

const allToyTypesQuery = groq`
  array::unique(*[_type == "toyReview"].materials[])
`;

// ─── Data Fetching ──────────────────────────────────────────────────────────────

/**
 * Fetch reviews matching a specific age in months.
 * Returns reviews where the age falls within the toy's age range.
 */
export async function getReviewsByAge(
  age: number
): Promise<ToyReviewSummary[]> {
  return sanityClient.fetch<ToyReviewSummary[]>(reviewsByAgeQuery, { age });
}

/**
 * Fetch reviews matching a category and age group.
 */
export async function getReviewsByCategoryAndAgeGroup(
  categoryId: string,
  minMonths: number,
  maxMonths: number
): Promise<ToyReviewSummary[]> {
  return sanityClient.fetch<ToyReviewSummary[]>(
    reviewsByCategoryAndAgeGroupQuery,
    { categoryId, minMonths, maxMonths }
  );
}

/**
 * Fetch reviews matching a specific toy type (material).
 */
export async function getReviewsByToyType(
  toyType: string
): Promise<ToyReviewSummary[]> {
  return sanityClient.fetch<ToyReviewSummary[]>(reviewsByToyTypeQuery, {
    toyType,
  });
}

// ─── Page Generation Logic ──────────────────────────────────────────────────────

/**
 * Determine which age-based pages should be generated.
 * Only returns ages that have >= MIN_REVIEWS_FOR_PAGE matching reviews.
 */
export async function getValidAgePages(): Promise<number[]> {
  const validAges: number[] = [];

  for (const age of AGE_MONTHS) {
    const reviews = await getReviewsByAge(age);
    if (reviews.length >= MIN_REVIEWS_FOR_PAGE) {
      validAges.push(age);
    }
  }

  return validAges;
}

/**
 * Get all categories from Sanity CMS.
 */
export async function getAllCategories(): Promise<CategorySummary[]> {
  return sanityClient.fetch(allCategoriesQuery);
}

/**
 * Get all unique toy types (materials) from reviews.
 */
export async function getAllToyTypes(): Promise<string[]> {
  const types = await sanityClient.fetch<string[]>(allToyTypesQuery);
  return types ?? [];
}

/**
 * Check if a page should be generated based on review count.
 * Returns true only if there are >= MIN_REVIEWS_FOR_PAGE reviews.
 */
export function hasEnoughReviews(reviews: ToyReviewSummary[]): boolean {
  return reviews.length >= MIN_REVIEWS_FOR_PAGE;
}

/**
 * Format age in months to a human-readable label.
 */
export function formatAgeLabel(months: number): string {
  if (months < 12) {
    return `${months} months`;
  }
  const years = months / 12;
  if (Number.isInteger(years)) {
    return years === 1 ? "1 year" : `${years} years`;
  }
  return `${months} months`;
}

// ─── Category + Age Group Page Generation ───────────────────────────────────────

/**
 * Find the age group matching a given slug.
 */
export function getAgeGroupBySlug(slug: string): AgeGroup | undefined {
  return AGE_GROUPS.find((g) => g.slug === slug);
}

/**
 * Generate valid static params for "best [category] toys for [age group]" pages.
 * Only includes combinations with >= MIN_REVIEWS_FOR_PAGE matching reviews.
 */
export async function getValidCategoryAgeParams(): Promise<
  Array<{ category: string; ageGroup: string }>
> {
  const categories = await getAllCategories();
  const params: Array<{ category: string; ageGroup: string }> = [];

  for (const category of categories) {
    for (const ageGroup of AGE_GROUPS) {
      const reviews = await getReviewsByCategoryAndAgeGroup(
        category._id,
        ageGroup.minMonths,
        ageGroup.maxMonths
      );
      if (hasEnoughReviews(reviews)) {
        params.push({
          category: category.slug.current,
          ageGroup: ageGroup.slug,
        });
      }
    }
  }

  return params;
}

/**
 * Get a category by its slug.
 */
export async function getCategoryBySlug(
  slug: string
): Promise<CategorySummary | null> {
  const query = groq`*[_type == "category" && slug.current == $slug][0] {
    _id,
    title,
    slug
  }`;
  return sanityClient.fetch<CategorySummary | null>(query, { slug });
}

// ─── Toy Type (Safe) Page Generation ────────────────────────────────────────────

/**
 * Slugify a toy type name for use in URLs.
 * Lowercases, replaces spaces with hyphens, removes non-alphanumeric chars.
 */
export function slugifyToyType(toyType: string): string {
  return toyType
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/**
 * The age groups that have a live /best-toys/category/[category]/[ageGroup] page
 * for a given category.
 *
 * Those 14 pages had no inbound link from anywhere either: a reader on
 * /categories/sensory-toys had no route to the age-filtered version of the same
 * category, and the age-filtered page had no route back. They were reachable only
 * via the sitemap.
 *
 * The overlap test deliberately mirrors reviewsByCategoryAndAgeGroupQuery
 * (minMonths <= $maxMonths && maxMonths >= $minMonths). If the two ever drift the
 * page would either 404 from a link we published or hide a page that exists.
 */
export async function getLinkableAgeGroupsForCategory(
  categoryId: string
): Promise<AgeGroup[]> {
  const ranges = await sanityClient.fetch<
    Array<{ minMonths: number; maxMonths: number } | null>
  >(groq`*[_type == "toyReview" && category._ref == $categoryId].ageRange`, {
    categoryId,
  });

  return AGE_GROUPS.filter((group) => {
    const matching = (ranges ?? []).filter(
      (r) =>
        r &&
        r.minMonths <= group.maxMonths &&
        r.maxMonths >= group.minMonths
    ).length;
    return matching >= MIN_REVIEWS_FOR_PAGE;
  });
}

/**
 * The materials that actually have a live /safe-toys/[toyType] page.
 *
 * WHY THIS EXISTS SEPARATELY FROM getValidToyTypeParams
 * That function answers the same question but issues one query per material —
 * 140 of them — which is fine once at build time and far too expensive inside a
 * page render. This does it in a single fetch, so a review page can decide which
 * of its materials are safe to link.
 *
 * The distinction matters: the catalog reports 140 distinct materials but only 20
 * clear MIN_REVIEWS_FOR_PAGE, so 120 of them have no page. Linking a material
 * without checking would manufacture 120 broken internal links — the exact
 * failure the internal-link audit exists to catch.
 *
 * Returns raw material strings (not slugs), because callers hold the raw value
 * and need to match on it before slugifying.
 */
export async function getLinkableToyTypes(): Promise<Set<string>> {
  const lists = await sanityClient.fetch<(string[] | null)[]>(
    groq`*[_type == "toyReview"].materials`
  );

  const counts = new Map<string, number>();
  for (const list of lists ?? []) {
    // Dedupe within a single review, so a repeated entry cannot inflate a count
    // to the threshold on its own.
    for (const material of new Set((list ?? []).filter(Boolean))) {
      counts.set(material, (counts.get(material) ?? 0) + 1);
    }
  }

  const linkable = new Set<string>();
  for (const [material, n] of counts) {
    if (n >= MIN_REVIEWS_FOR_PAGE) linkable.add(material);
  }
  return linkable;
}

/**
 * Generate valid static params for "safe [toy type] toys" pages.
 * Only includes toy types with >= MIN_REVIEWS_FOR_PAGE matching reviews.
 */
export async function getValidToyTypeParams(): Promise<
  Array<{ toyType: string }>
> {
  const toyTypes = await getAllToyTypes();
  const params: Array<{ toyType: string }> = [];

  for (const toyType of toyTypes) {
    const reviews = await getReviewsByToyType(toyType);
    if (hasEnoughReviews(reviews)) {
      params.push({ toyType: slugifyToyType(toyType) });
    }
  }

  return params;
}

/**
 * Find the original toy type name from a slug.
 * Compares slugified versions of all toy types against the given slug.
 */
export async function getToyTypeFromSlug(
  slug: string
): Promise<string | null> {
  const toyTypes = await getAllToyTypes();
  return toyTypes.find((t) => slugifyToyType(t) === slug) ?? null;
}
