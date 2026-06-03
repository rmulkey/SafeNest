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
      "Safe, developmental first birthday gift ideas for 1-year-olds — independently safety-scored and parent-tested by SafeNest Toys.",
    intro:
      "Turning one is a big milestone, and the best gifts at this age support a new walker's curiosity and motor skills. Every toy below has been independently safety-scored and checked for recalls — so you can give something both delightful and genuinely safe.",
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
      "Looking for a baby shower gift that stands out and is genuinely safe for a newborn? These infant-appropriate picks score high on material safety and have no small-parts choking risk, making them worry-free presents for new parents.",
    minMonths: 0,
    maxMonths: 9,
    emoji: "🍼",
  },
  {
    slug: "stocking-stuffers-toddlers",
    title: "Best Stocking Stuffers for Toddlers",
    description:
      "Small, safe, affordable stocking stuffer ideas for toddlers — independently safety-scored by SafeNest Toys.",
    intro:
      "The best stocking stuffers are small, engaging, and safe for little hands. These toddler-friendly picks are independently safety-scored and recall-checked, so every stocking surprise is one you can feel good about.",
    minMonths: 12,
    maxMonths: 36,
    emoji: "🧦",
  },
  {
    slug: "gifts-for-2-year-olds",
    title: "Best Gifts for 2-Year-Olds",
    description:
      "Safe, developmental gift ideas for 2-year-olds — independently safety-scored and parent-tested by SafeNest Toys.",
    intro:
      "Two-year-olds are busy explorers building language, imagination, and coordination. These gifts are chosen to match that stage and are independently safety-scored and recall-checked for peace of mind.",
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
