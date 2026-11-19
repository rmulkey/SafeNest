import {
  getReviewsByCategoryAndAgeGroup,
  getReviewsByAgeWindow,
  type ToyReviewSummary,
} from "./programmatic-pages";

/**
 * Curated, high-commercial-intent gift guides ("Best First Birthday Gifts",
 * "Baby Shower Gifts", etc.). These are evergreen, seasonal-friendly landing
 * pages designed to rank for gift-intent searches and capture affiliate clicks
 * before Q4 / holiday surges.
 *
 * IMPORTANT (data integrity): guides surface REAL, already-reviewed products
 * from Sanity, ranked by safety score. We never invent products or links — a
 * guide simply re-presents existing verified reviews for a gifting occasion.
 */

export interface GiftGuide {
  /** URL slug under /gift-guides/{slug} */
  slug: string;
  /** Page H1 / title */
  title: string;
  /** Short SEO meta description */
  description: string;
  /** Intro paragraph shown on the page */
  intro: string;
  /** Age window (months) used to select appropriate products */
  minMonths: number;
  maxMonths: number;
  /** Emoji/visual accent */
  emoji: string;
}

export const GIFT_GUIDES: GiftGuide[] = [
  {
    slug: "first-birthday-gifts",
    title: "Best First Birthday Gifts",
    description:
      "Safe, developmental first birthday gift ideas for 1-year-olds — safety-scored and recall-checked by SafeNest Toys.",
    intro:
      "A one-year-old is usually a brand-new walker, which changes what a good gift looks like: things to push, stack and empty out, rather than things to sit and watch. Everything here is safety-scored and checked against recall data, and the age ranges below are the manufacturers' own.",
    minMonths: 9,
    maxMonths: 18,
    emoji: "🎂",
  },
  {
    slug: "baby-shower-gifts",
    title: "Best Baby Shower Gifts",
    description:
      "Thoughtful, safe baby shower gift ideas for newborns and infants — safety-scored and developmentally reviewed by SafeNest Toys.",
    intro:
      "Buying for a newborn is mostly about materials and mouthing, because that is what a baby will do with anything you hand them. These picks score high on material information and none of them reported small parts. Check the age label on the box regardless — the manufacturer's guidance beats ours.",
    minMonths: 0,
    maxMonths: 9,
    emoji: "🍼",
  },
  {
    slug: "stocking-stuffers-toddlers",
    title: "Best Stocking Stuffers for Toddlers",
    description:
      "Small, safe, affordable stocking stuffer ideas for toddlers — safety-scored by SafeNest Toys.",
    intro:
      "Stocking stuffers pull in the wrong direction for a toddler: small enough for a stocking is often small enough to be a choking risk. These are picks that are compact without being made of tiny parts. Ages below are the manufacturers' — check them, especially if there's a younger sibling in the house.",
    minMonths: 12,
    maxMonths: 36,
    emoji: "🧦",
  },
  {
    slug: "gifts-for-2-year-olds",
    title: "Best Gifts for 2-Year-Olds",
    description:
      "Safe, developmental gift ideas for 2-year-olds — safety-scored and recall-checked by SafeNest Toys.",
    intro:
      "Two is the age where a toy either gets played with daily or ignored entirely, and it is hard to predict which from the box. These are picks whose age range genuinely covers two rather than starting there, safety-scored and checked against recall data.",
    minMonths: 24,
    maxMonths: 36,
    emoji: "🎁",
  },
  /*
   * Ages three and up. The first four guides stopped at 36 months while the
   * catalogue did not: 114 reviews carry a label reaching into 36–60 months and
   * 70 reach beyond five years, and none of them had a gift guide to appear in.
   *
   * The windows are deliberately wide and non-adjacent-by-a-month. Narrower
   * bands were tried first — 36–48, 48–60 and 60–72 — and the 48–60 and 60–72
   * guides came out sharing half their picks, because the catalogue thins out
   * above four and the same wide-labelled toys fill both. Three guides at
   * 36–48, 48–72 and 72–96 share at most a quarter.
   */
  {
    slug: "gifts-for-3-year-olds",
    title: "Best Gifts for 3-Year-Olds",
    description:
      "Safe, developmental gift ideas for 3-year-olds — safety-scored and recall-checked by SafeNest Toys.",
    intro:
      "Three is when a child has the grip and the patience to finish what they started, so hammering, threading and sorting toys stop being frustrating and start being the point. These picks lead with toys whose manufacturer age label is aimed at three rather than merely including it, safety-scored and checked against recall data.",
    minMonths: 36,
    maxMonths: 48,
    emoji: "🧩",
  },
  {
    slug: "gifts-for-4-to-6-year-olds",
    title: "Best Gifts for 4- to 6-Year-Olds",
    description:
      "Safe, developmental gift ideas for 4-, 5- and 6-year-olds — safety-scored and recall-checked by SafeNest Toys.",
    intro:
      "Four to six is a long stretch to buy for, and the same child who wants a sand table in the garden wants a hundred-piece building set indoors. These picks all carry a manufacturer age label spanning most of those years, so the toy should still get used a birthday or two later. Safety-scored and checked against recall data.",
    minMonths: 48,
    maxMonths: 72,
    emoji: "🧱",
  },
  {
    slug: "gifts-for-school-age-kids",
    title: "Best Gifts for School-Age Kids",
    description:
      "Safe, developmental gift ideas for 6- to 8-year-olds — safety-scored and recall-checked by SafeNest Toys.",
    intro:
      "By six, most of the toy aisle is aimed at someone younger, and what still holds up tends to be open-ended: blocks, tiles, and sets with no single right answer. Fewer of our reviews reach these ages than the toddler bands, so this list is shorter on options. Every pick carries a manufacturer age label that extends this far, and all are safety-scored and checked against recall data.",
    minMonths: 72,
    maxMonths: 96,
    emoji: "🎒",
  },
];

export function getGiftGuideBySlug(slug: string): GiftGuide | undefined {
  return GIFT_GUIDES.find((g) => g.slug === slug);
}

/** How many products a guide lists. */
export const GIFT_GUIDE_SIZE = 12;

/**
 * At most this many picks from any one brand.
 *
 * Age-fit ranking groups toys that share an age label, and a single
 * manufacturer can own most of a band — Melissa & Doug alone accounts for ten of
 * the twelve best-fitting toys in the 48–72 month window. A guide reading as one
 * brand's catalogue is a worse guide, so the list takes a brand's next-best pick
 * only after other brands have had a turn.
 */
export const MAX_PICKS_PER_BRAND = 3;

/**
 * How well a toy's labelled age range matches a guide window, from 0 to 1.
 *
 * This is the intersection over the union of the two ranges, so it penalises
 * both directions of mismatch: a toy that covers only a sliver of the window,
 * and a toy whose label sprawls far beyond it. Exposed because the
 * audit-gift-guide-overlap guard recomputes selection and must agree with this
 * module rather than reimplement it.
 */
export function ageWindowFit(
  guide: Pick<GiftGuide, "minMonths" | "maxMonths">,
  ageRange: { minMonths: number; maxMonths: number }
): number {
  const overlap =
    Math.min(guide.maxMonths, ageRange.maxMonths) -
    Math.max(guide.minMonths, ageRange.minMonths);
  if (overlap <= 0) return 0;
  const union =
    Math.max(guide.maxMonths, ageRange.maxMonths) -
    Math.min(guide.minMonths, ageRange.minMonths);
  return union > 0 ? overlap / union : 0;
}

/** Fit grouped into fifths, so near-identical fits rank by safety score. */
function fitTier(fit: number): number {
  return Math.floor(fit * 5);
}

/**
 * Fetch the products that belong in a gift guide: real reviews whose labelled
 * age range overlaps the guide window, best age fit first and safety score
 * within that, capped per brand, top 12.
 *
 * WHY FIT AND NOT SAFETY SCORE ALONE
 * Selecting purely on "overlaps the window, ranked by safety score" made the
 * guides near-copies of each other. The highest-scoring toys in the catalogue
 * carry very wide labels — 12–72 and 12–96 months — so the same handful of
 * products topped every guide from one year old upwards: the 12–36 month and
 * 24–36 month guides shared eleven of twelve picks, and 9–18 month shared ten
 * with 12–36. Three pages, one list, which is precisely the thin duplicate
 * content that limits this site's indexing.
 *
 * Ranking by age fit first makes the window actually decide the list. A guide
 * for three-year-olds now leads with toys a manufacturer aimed at
 * three-year-olds, rather than with a toy labelled one-to-six whose score
 * happens to be high. Worst-case overlap between any two guides falls from 92%
 * to 50%, and most pairs share nothing at all. Safety score still orders every
 * group of comparably-fitting toys, so the ranking a reader sees within a tier
 * is unchanged.
 *
 * The remaining 50% is stocking-stuffers-toddlers (12–36) against
 * gifts-for-2-year-olds (24–36): one window nests inside the other and the
 * catalogue holds too few toys labelled exactly 24–36 months to fill a guide, so
 * both reach into the same 12–36 month pool. Guarded by
 * scripts/audit-gift-guide-overlap.mjs.
 */
export async function getGiftGuideProducts(
  guide: GiftGuide
): Promise<ToyReviewSummary[]> {
  const inWindow = await getReviewsByAgeWindow(
    guide.minMonths,
    guide.maxMonths
  );

  const ranked = inWindow
    .map((review) => ({ review, fit: ageWindowFit(guide, review.ageRange) }))
    .sort(
      (a, b) =>
        fitTier(b.fit) - fitTier(a.fit) ||
        b.review.safetyScore - a.review.safetyScore ||
        a.review.slug.current.localeCompare(b.review.slug.current)
    )
    .map((r) => r.review);

  const picks: ToyReviewSummary[] = [];
  const perBrand = new Map<string, number>();
  for (const review of ranked) {
    if (picks.length >= GIFT_GUIDE_SIZE) break;
    // A review with no brand recorded is never pooled with another, so a gap in
    // the data cannot crowd real brands out of the list.
    const key = review.brand ?? review._id;
    const used = perBrand.get(key) ?? 0;
    if (used >= MAX_PICKS_PER_BRAND) continue;
    perBrand.set(key, used + 1);
    picks.push(review);
  }

  // Backfill when the cap leaves the guide short, so a brand-heavy band still
  // produces a full list rather than a stub page.
  if (picks.length < GIFT_GUIDE_SIZE) {
    const chosen = new Set(picks.map((p) => p._id));
    for (const review of ranked) {
      if (picks.length >= GIFT_GUIDE_SIZE) break;
      if (!chosen.has(review._id)) picks.push(review);
    }
  }

  return picks;
}

// Re-export for callers that want category-scoped variants later.
export { getReviewsByCategoryAndAgeGroup };
