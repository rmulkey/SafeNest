import {
  getReviewsByCategoryAndAgeGroup,
  getReviewsByAge,
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
];

export function getGiftGuideBySlug(slug: string): GiftGuide | undefined {
  return GIFT_GUIDES.find((g) => g.slug === slug);
}

/**
 * Fetch the products that belong in a gift guide: real reviews whose age range
 * overlaps the guide window, ranked by safety score, top 12. Uses a midpoint
 * age query and filters to the window so we get appropriate, in-range items.
 */
export async function getGiftGuideProducts(
  guide: GiftGuide
): Promise<ToyReviewSummary[]> {
  const midpoint = Math.round((guide.minMonths + guide.maxMonths) / 2);
  const byAge = await getReviewsByAge(midpoint);

  const inWindow = byAge.filter(
    (r) =>
      r.ageRange.minMonths <= guide.maxMonths &&
      r.ageRange.maxMonths >= guide.minMonths
  );

  return inWindow
    .sort((a, b) => b.safetyScore - a.safetyScore)
    .slice(0, 12);
}

// Re-export for callers that want category-scoped variants later.
export { getReviewsByCategoryAndAgeGroup };
