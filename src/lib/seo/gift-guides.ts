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
      "A first birthday sits in the middle of this window rather than at its start, and the toy aisle splits those months awkwardly: the labels below begin anywhere from three months and run to two years. The manufacturer's own labelling is the guidance to buy from — ours orders the list, it does not replace the box.",
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
      "Buying for a newborn is mostly about materials and mouthing, because that is what a baby will do with anything you hand them. Every pick here is labelled by its manufacturer for part or all of the first nine months, and most run to a year or beyond. Check the box regardless: the manufacturer's guidance beats ours.",
    minMonths: 0,
    maxMonths: 9,
    emoji: "🍼",
  },
  {
    slug: "stocking-stuffers-toddlers",
    title: "Best Stocking Stuffers for Toddlers",
    description:
      "Toddler stocking stuffer ideas, safety-scored by SafeNest Toys and matched to manufacturer age labelling. We hold no size data — check dimensions on the listing.",
    intro:
      "Stocking stuffers pull in the wrong direction for a toddler: small enough for a stocking is often small enough to be a choking risk. We hold no dimensions for any toy in the catalogue, so this list cannot tell you which of these fits a stocking — it picks the toys whose age label matches twelve to thirty-six months most closely. Check sizes on the listing, and the ages below are the manufacturers' own, worth a look if there's a younger sibling in the house.",
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
      "Two is the age where a toy either gets played with daily or ignored entirely, and it is hard to predict which from the box. Every pick carries a manufacturer age label overlapping twenty-four to thirty-six months, and the ones aimed squarely at that span come first.",
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
      "Three is when a child has the grip and the patience to finish what they started, so hammering, threading and sorting toys stop being frustrating and start being the point. Every pick's manufacturer age label reaches into the year between three and four, though most span wider than that — the range printed on each review is the one to go by.",
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
      "Four to six is a long stretch to buy for, and the same child who wants a sand table in the garden wants a hundred-piece building set indoors. These picks all carry a manufacturer age label spanning most of those years, so the toy should still get used a birthday or two later.",
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
      "By six, most of the toy aisle is aimed at someone younger, and what still holds up tends to be open-ended: blocks, tiles, and sets with no single right answer. Fewer of our reviews reach these ages than the toddler bands, so this list is shorter on options. Every pick carries a manufacturer age label that extends this far.",
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
 * What every guide guarantees about its list, printed once by the guide page.
 *
 * Lives here, and only here, because the four original intros each carried their
 * own version of it and two of them drifted into describing the toys rather than
 * the rule — a numbered list that opens on a 90 while a 93 sits at position
 * seven needs the ordering said out loud, not restated per guide in wording that
 * can rot. Per-guide intros now cover the age and nothing a reader could check
 * against the list and find false.
 */
export const GIFT_GUIDE_SELECTION_NOTE =
  "Every pick has a SafeNest editorial safety assessment and has been checked against publicly available recall information. The order follows how closely each toy's manufacturer age label matches this guide's age range, and then the safety score — so the highest score is not always first.";

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
 * What a label reaching past the window costs, relative to one that starts
 * before the window or stops short of it.
 *
 * A plain intersection over union treats every month of mismatch alike, and for
 * a gift guide that is the wrong call. A toy labelled 12–36 months is a good
 * first-birthday present that happens to stay useful for another year; a toy
 * labelled 3–18 months is one the child has largely outgrown. Scoring both
 * directions equally preferred the second, because eighteen months below the
 * window cost the same as eighteen above it, and the 9–18 month guide filled
 * with infant rattles and teethers while its own intro described push-along and
 * stacking toys. Three of its twelve picks were also on the 0–9 month guide.
 *
 * Half weight says an overshoot is not a mismatch but is not free either: a
 * label spanning 1–12 years tells a buyer very little about suitability. At 1
 * this reduces to intersection over union. At 0 the upper guides collapse into
 * one another — above three years the catalogue is mostly wide labels (36–96,
 * 36–144) and nothing then separates a three-year guide from a six-year one,
 * measured at 92% shared picks. Half keeps both ends apart; see the pair matrix
 * in scripts/audit-gift-guide-overlap.mjs.
 */
export const OVERSHOOT_WEIGHT = 0.5;

/**
 * How well a toy's labelled age range matches a guide window, from 0 to 1.
 *
 * Penalises three things: window months the label misses, label months below the
 * window, and — at OVERSHOOT_WEIGHT — label months above it. Exposed because the
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
  const uncovered = guide.maxMonths - guide.minMonths - overlap;
  const early = Math.max(0, guide.minMonths - ageRange.minMonths);
  const late = Math.max(0, ageRange.maxMonths - guide.maxMonths);
  // overlap > 0, so the denominator is always positive.
  return overlap / (overlap + uncovered + early + OVERSHOOT_WEIGHT * late);
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
 * for three-year-olds leads with toys labelled around three rather than with a
 * toy labelled one-to-six whose score happens to be high. Worst-case overlap
 * between any two guides falls from 92% to 25%, and seventeen of the twenty-one
 * pairs share nothing at all. Safety score still orders every group of
 * comparably-fitting toys.
 *
 * Fit is deliberately asymmetric — see OVERSHOOT_WEIGHT. A symmetric measure
 * filled each guide from the younger end of its own window, which is how the
 * 9–18 month guide came to lead with teethers.
 *
 * The remaining 25% is two pairs sharing three picks each: 24–36 against 36–48
 * over labels ending at 48 months, and 48–72 against 72–96 over labels running
 * 36–96. Both are the same catalogue limit rather than a ranking problem — no
 * toy is labelled exactly 36–48 months and only one is labelled from 48, so a
 * guide above three has to reach down into labels the guide below it also uses.
 * Guarded by scripts/audit-gift-guide-overlap.mjs.
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
