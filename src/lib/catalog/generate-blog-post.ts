/**
 * Automated bi-weekly blog post generator.
 *
 * Produces an editorial "Top N child-safe" roundup from products ALREADY in the
 * catalog (real, verified toyReview documents). Data-integrity-safe: it invents
 * no products, links, images, or facts — it reuses each review's real product
 * image, links back to the real review page, and states only real scores/ages.
 * Editorial framing/copy is authored, which the rule permits for a review site.
 *
 * Topic rotates by ISO week so consecutive runs cover different categories and
 * never collide on slug (the slug is week-stamped and a guard prevents
 * double-publishing within the same fortnight).
 *
 * ── WHY THIS FILE READS THE WAY IT DOES ──────────────────────────────────────
 * The first version of this generator emitted five fixed paragraphs plus one
 * sentence per product with only the brand and numbers swapped: "From ${brand},
 * it's one of our top-rated ${noun}s for this age — high marks for safety and
 * genuine developmental value." Six posts went out that way. The result was 19
 * paragraphs appearing verbatim across multiple published articles, seven
 * identical product blurbs per post, and a sentence-length variance
 * indistinguishable from machine output.
 *
 * It also claimed experience nobody had. "Every one is a toy we'd happily hand
 * our own kids", "a toy we'd trust without a second thought", "in our own kids'
 * hands" — written about products SafeNest has never physically handled, on a
 * site whose methodology page states plainly that it performs no testing. That
 * is the same failure as an invented ASIN: asserting something unverifiable.
 *
 * So each entry is now composed from that product's OWN data — its age span,
 * its real materials, its weakest safety factor, its recall state. Entries read
 * differently because the underlying facts differ, not because a synonym was
 * swapped. Naming the weakest factor is deliberate: a roundup where all seven
 * picks are uniformly wonderful is the tell that nobody looked. And it stays
 * honest, because every clause traces to a stored field.
 *
 * A template cannot reproduce the voice of the hand-written posts, and it should
 * not try. What it can do is be specific, be short, and not lie.
 */
import type { SanityClient } from "@sanity/client";

interface CatalogProduct {
  _id: string;
  productName: string;
  brand: string;
  slug: { current: string };
  safetyScore: number;
  developmentScore: number;
  ageRange: { minMonths: number; maxMonths: number };
  /** Sanity image asset ref, when the review has a main image. */
  imageRef?: string | null;
  imageAlt?: string | null;
  /** Real materials from the review, used to say something specific. */
  materials?: string[] | null;
  hasActiveRecall?: boolean | null;
  /** Safety sub-factors, used to name the weakest one honestly. */
  materialSafety?: number | null;
  chokingRisk?: number | null;
  recallHistory?: number | null;
  certificationPresence?: number | null;
}

interface TopicConfig {
  categoryRef: string;
  categoryLabel: string;
  /** Singular-ish label used in prose, e.g. "building toy". */
  categoryNoun: string;
  slugBase: string;
  /** Category-specific opening paragraph. See the note on TOPICS. */
  opener: string;
}

/**
 * Rotating topics — one per run, chosen by week parity + index.
 *
 * `opener` is per-topic rather than one shared template with the noun
 * substituted, because a substituted noun is exactly what made six posts read
 * as one post. Each is a plain statement about that category, no hook.
 */
const TOPICS: TopicConfig[] = [
  {
    categoryRef: "cat-building",
    categoryLabel: "Building Toys",
    categoryNoun: "building toy",
    slugBase: "top-child-safe-building-toys",
    opener:
      "Building sets are where the small-parts question gets awkward: the pieces that make a set worth owning are the pieces a younger sibling should not find on the floor. Age labels on these vary more than you would expect, so they are worth reading closely.",
  },
  {
    categoryRef: "cat-sensory",
    categoryLabel: "Sensory Toys",
    categoryNoun: "sensory toy",
    slugBase: "top-child-safe-sensory-toys",
    opener:
      "Sensory toys tend to be the first things a baby actually mouths, which puts materials and surface finish ahead of almost everything else. These are ordered by our safety score, and the materials each one reports are listed with it.",
  },
  {
    categoryRef: "cat-educational",
    categoryLabel: "Educational Toys",
    categoryNoun: "educational toy",
    slugBase: "top-child-safe-educational-toys",
    opener:
      "Most toys marketed as educational are counted, sorted or matched, which means lots of small components. That is useful for teaching and it is the reason the age guidance on this category runs high.",
  },
  {
    categoryRef: "cat-outdoor",
    categoryLabel: "Outdoor Toys",
    categoryNoun: "outdoor toy",
    slugBase: "top-child-safe-outdoor-toys",
    opener:
      "Outdoor toys get left in the weather, which is a durability question before it is a safety one — cracked plastic and rusted fixings are what turn up in recall notices for this category. Ordered by our safety score below.",
  },
];

/**
 * Topic lookup by category ref, so a repair script can rebuild an already
 * published post's body with the same config the cron used to create it.
 */
export const TOPICS_BY_REF: Record<string, TopicConfig> = Object.fromEntries(
  TOPICS.map((t) => [t.categoryRef, t])
);

/** Minimum real products required to publish a roundup. */
export const MIN_PRODUCTS_FOR_POST = 3;

/** Maximum products featured in a roundup ("Top N"). */
export const MAX_PICKS = 7;

/** ISO-week number (1–53) for deterministic topic rotation + slug stamping. */
export function isoWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

/**
 * Pick the topic for a given date by rotating through TOPICS.
 *
 * Rotation is keyed to the FORTNIGHT index, not the raw week number. The cron
 * only runs on even ISO weeks, so indexing by `week % TOPICS.length` could only
 * ever land on even indices (Building and Educational) — Sensory and Outdoor
 * would never be published, and the two live topics would repeat forever with
 * identical titles. Dividing by two first makes every topic reachable.
 */
export function pickTopic(date: Date): TopicConfig {
  const { week } = isoWeek(date);
  return TOPICS[Math.floor(week / 2) % TOPICS.length];
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Spoken age span, e.g. "18 months to 5 years".
 *
 * Replaces the old abbreviated `ageLabel` ("18 mo–5 yr"), which was fine inside
 * the stat line it used to sit in but reads as data rather than prose now that
 * the age appears mid-sentence.
 */
function spokenAge(minMonths: number, maxMonths: number): string {
  const one = (m: number) => {
    if (m < 12) return `${m} months`;
    const y = m / 12;
    if (Number.isInteger(y)) return y === 1 ? "1 year" : `${y} years`;
    return `${m} months`;
  };
  return `${one(minMonths)} to ${one(maxMonths)}`;
}

/** Human list: "wood", "wood and metal", "wood, metal and fabric". */
function joinList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

const FACTOR_LABELS: Record<string, string> = {
  materialSafety: "material information",
  chokingRisk: "choking-risk research",
  recallHistory: "recall history",
  certificationPresence: "certification claims",
};

/**
 * The weakest of a product's four safety factors, when the data is present and
 * the gap is meaningful.
 *
 * Naming it is the point. A list where all seven picks are uniformly excellent
 * is the tell that nobody actually looked at them, and it is also less useful
 * than saying which part of the assessment is thinnest. Returns null when the
 * factors are absent or too close together for the weakest to mean anything.
 */
function weakestFactor(p: CatalogProduct): { label: string; score: number } | null {
  const entries = (
    ["materialSafety", "chokingRisk", "recallHistory", "certificationPresence"] as const
  )
    .map((k) => ({ key: k, score: p[k] }))
    .filter((e): e is { key: typeof e.key; score: number } => typeof e.score === "number");

  if (entries.length < 4) return null;

  entries.sort((a, b) => a.score - b.score);
  const lowest = entries[0];
  const highest = entries[entries.length - 1];
  // A flat profile has no meaningful "weakest". The threshold is deliberately
  // wide: at 8 points nearly every product qualified, so the sentence appeared
  // in most entries and stopped carrying information.
  if (highest.score - lowest.score < 12) return null;

  return { label: FACTOR_LABELS[lowest.key], score: lowest.score };
}

/**
 * One paragraph describing a product, composed from its own stored fields.
 *
 * Every clause traces to real data: age range, materials array, the four safety
 * sub-scores, the recall flag. Two entries read differently because their facts
 * differ — which is the only kind of variety a generator can honestly produce.
 *
 * Sentence shape also rotates by position. Facts alone were not enough: seven
 * entries all opening "${brand} label this one for ${age}" still scanned as one
 * sentence run seven times, which is the thing this rewrite exists to stop.
 * `i` is the product's index in the list, so the rotation is deterministic and
 * the same post always regenerates identically.
 */
function describeProduct(p: CatalogProduct, i: number): string {
  const parts: string[] = [];

  const age = spokenAge(p.ageRange.minMonths, p.ageRange.maxMonths);
  // Materials keep their stored casing. Lower-casing them turned "ABS plastic"
  // into "abs plastic" and "Honduran hardwood" into "honduran hardwood".
  const materials = (p.materials ?? []).filter(Boolean).slice(0, 3);
  const mats = joinList(materials);

  // Opening: age plus materials, in one of three shapes.
  if (materials.length > 0) {
    const openers = [
      `Labelled ${age} by ${p.brand}, and reported as ${mats}.`,
      `${p.brand} put this at ${age}. Reported materials are ${mats}.`,
      `Reported as ${mats}, with a manufacturer age range of ${age}.`,
    ];
    parts.push(openers[i % openers.length]);
  } else {
    const openers = [
      `Labelled ${age} by ${p.brand}. No materials are listed in the information we could find.`,
      `${p.brand} put this at ${age}; the listing does not say what it is made of.`,
    ];
    parts.push(openers[i % openers.length]);
  }

  // Scores: two shapes, so consecutive entries differ.
  const scoreForms = [
    `Safety ${p.safetyScore}, development ${p.developmentScore}.`,
    `It scores ${p.safetyScore} on safety and ${p.developmentScore} on development.`,
  ];
  parts.push(scoreForms[i % scoreForms.length]);

  // Weakest factor, when one stands out. Two shapes; no trailing advice clause,
  // which read as filler once it had appeared four times in one article.
  const weak = weakestFactor(p);
  if (weak) {
    const weakForms = [
      `The ${weak.label} factor is the one pulling it down, at ${weak.score}.`,
      `Weakest of the four factors is ${weak.label}, ${weak.score}.`,
    ];
    parts.push(weakForms[i % weakForms.length]);
  }

  if (p.hasActiveRecall) {
    parts.push(
      `It also has an active recall against it — read the CPSC notice on the review page before buying.`
    );
  }

  return parts.join(" ");
}

// ─── Portable Text block builders ───────────────────────────────────────────

interface MarkDef {
  _type: "link";
  _key: string;
  href: string;
}
interface BlockChild {
  _type: "span";
  _key: string;
  text: string;
  marks: string[];
}
export interface TextBlock {
  _type: "block";
  _key: string;
  style: string;
  children: BlockChild[];
  markDefs: MarkDef[];
}
export interface ImageBlock {
  _type: "image";
  _key: string;
  alt: string;
  asset: { _type: "reference"; _ref: string };
}
export type PostBlock = TextBlock | ImageBlock;

let keyCounter = 0;
const nextKey = (p = "k") => `${p}${++keyCounter}`;

function block(style: string, text: string): TextBlock {
  return {
    _type: "block",
    _key: nextKey("b"),
    style,
    children: [{ _type: "span", _key: nextKey("s"), text, marks: [] }],
    markDefs: [],
  };
}

function imageBlock(ref: string, alt: string): ImageBlock {
  return {
    _type: "image",
    _key: nextKey("img"),
    alt,
    asset: { _type: "reference", _ref: ref },
  };
}

/** Paragraph whose trailing phrase links to the product's review page. */
function paragraphWithReviewLink(lead: string, linkText: string, slug: string): TextBlock {
  const linkKey = nextKey("link");
  return {
    _type: "block",
    _key: nextKey("b"),
    style: "normal",
    markDefs: [{ _type: "link", _key: linkKey, href: `/reviews/${slug}` }],
    children: [
      { _type: "span", _key: nextKey("s"), text: lead, marks: [] },
      { _type: "span", _key: nextKey("s"), text: linkText, marks: [linkKey] },
      { _type: "span", _key: nextKey("s"), text: ".", marks: [] },
    ],
  };
}

/**
 * Builds the blog post document body from real products. Returns null if there
 * aren't enough real products to make an honest roundup.
 */
export function buildRoundupPost(
  topic: TopicConfig,
  products: CatalogProduct[],
  date: Date
): {
  _id: string;
  _type: "blogPost";
  title: string;
  slug: { _type: "slug"; current: string };
  excerpt: string;
  body: PostBlock[];
  category: { _type: "reference"; _ref: string };
  relatedReviews: Array<{ _type: "reference"; _ref: string; _key: string }>;
  publishedAt: string;
} | null {
  if (products.length < MIN_PRODUCTS_FOR_POST) return null;

  const top = [...products]
    .sort((a, b) => b.safetyScore - a.safetyScore)
    .slice(0, MAX_PICKS);

  const { year, week } = isoWeek(date);
  const count = top.length;
  const label = topic.categoryLabel.toLowerCase();
  // Include the month so recurring roundups of the same category don't publish
  // under an identical title (which cannibalizes its own predecessor in search).
  const period = `${MONTHS[date.getMonth()]} ${year}`;
  const title = `Top ${count} Child-Safe ${topic.categoryLabel} (${period})`;
  const slug = `${topic.slugBase}-${year}-w${week}`;

  keyCounter = 0;

  const scoreRange =
    count > 1
      ? `${top[count - 1].safetyScore} to ${top[0].safetyScore}`
      : `${top[0].safetyScore}`;

  const body: PostBlock[] = [
    // Category-specific opening. No hook, no first-hand claim.
    block("normal", topic.opener),
    block(
      "normal",
      `These are the ${count} ${label} with the highest safety scores in our catalog as of ${period} — ${scoreRange} out of 100. That score is our own reading of published product information, not a test result, and it rewards manufacturers who document things properly, so a lower-ranked toy is not necessarily a worse one. The age on the box is the manufacturer's and beats ours. Each entry links to the full breakdown.`
    ),
  ];

  top.forEach((p, i) => {
    body.push(block("h3", `${i + 1}. ${p.productName}`));
    // Real product image, when available.
    if (p.imageRef) {
      body.push(imageBlock(p.imageRef, p.imageAlt || p.productName));
    }
    // Composed from this product's own fields — see describeProduct.
    body.push(block("normal", describeProduct(p, i)));
    // Link to the real review page. Two lead-ins alternate: one repeated
    // seven-word phrase per entry was itself a pattern worth breaking.
    body.push(
      paragraphWithReviewLink(
        i % 2 === 0 ? "Full breakdown: " : "What we could and couldn't confirm: ",
        `${p.productName} review`,
        p.slug.current
      )
    );
  });

  /*
   * No fixed closing paragraph.
   *
   * The first draft of this rewrite ended every post with the same "Reading this
   * list" section — which reproduced, at smaller scale, exactly the fault it was
   * meant to remove: one identical paragraph across six articles. The caveat it
   * carried (score is editorial, ranking rewards complete documentation, follow
   * the manufacturer's age label) is already in the second paragraph above, and
   * saying it once is enough.
   */

  return {
    _id: `blog-${slug}`,
    _type: "blogPost",
    title,
    slug: { _type: "slug", current: slug },
    excerpt: `The ${count} ${label} scoring highest in our catalog as of ${period}, with the age range and reported materials for each.`,
    body,
    category: { _type: "reference", _ref: topic.categoryRef },
    relatedReviews: top.map((p, i) => ({
      _type: "reference" as const,
      _ref: p._id,
      _key: `rel${i}`,
    })),
    publishedAt: date.toISOString(),
  };
}

export interface GenerateOutcome {
  status:
    | "published"
    | "skipped-exists"
    | "skipped-insufficient"
    | "skipped-unchanged";
  slug?: string;
  title?: string;
  productCount: number;
}

/**
 * Generates and publishes the roundup for the current week.
 * Idempotent: re-running in the same fortnight won't duplicate the post.
 */
export async function generateBiweeklyPost(
  client: SanityClient,
  now: Date = new Date()
): Promise<GenerateOutcome> {
  const topic = pickTopic(now);

  const products = await client.fetch<CatalogProduct[]>(
    `*[_type == "toyReview" && category._ref == $cat && !(_id in path("drafts.**"))]{
      _id, productName, brand, slug, safetyScore, developmentScore, ageRange,
      materials, hasActiveRecall,
      materialSafety, chokingRisk, recallHistory, certificationPresence,
      "imageRef": mainImage.asset._ref, "imageAlt": mainImage.alt
    } | order(safetyScore desc)`,
    { cat: topic.categoryRef }
  );

  const doc = buildRoundupPost(topic, products, now);
  if (!doc) {
    return { status: "skipped-insufficient", productCount: products.length };
  }

  // Guard against double-publishing the same week's post.
  const existing = await client.fetch<string | null>(
    `*[_type == "blogPost" && _id == $id][0]._id`,
    { id: doc._id }
  );
  if (existing) {
    return {
      status: "skipped-exists",
      slug: doc.slug.current,
      title: doc.title,
      productCount: products.length,
    };
  }

  /*
   * Do not republish a topic whose picks have not changed.
   *
   * The week-stamped slug made every run unique, so the only guard was against
   * publishing twice in the same fortnight. Topic rotation returns to each
   * category every fourth run, and the catalog's top seven rarely move in eight
   * weeks — so Building Toys shipped three times with the same seven products in
   * the same order, and Educational Toys twice. Distinct URLs, effectively one
   * article: duplicate content by cron.
   *
   * Comparing the intended pick list against the newest existing post for this
   * topic means a repeat run only publishes when the ranking has actually moved.
   */
  const previousPicks = await client.fetch<string[] | null>(
    `*[_type == "blogPost" && category._ref == $cat] | order(publishedAt desc)[0].relatedReviews[]._ref`,
    { cat: topic.categoryRef }
  );
  const nextPicks = doc.relatedReviews.map((r) => r._ref);
  if (
    previousPicks &&
    previousPicks.length === nextPicks.length &&
    previousPicks.every((ref, i) => ref === nextPicks[i])
  ) {
    return {
      status: "skipped-unchanged",
      slug: doc.slug.current,
      title: doc.title,
      productCount: products.length,
    };
  }

  await client.create(doc);
  return {
    status: "published",
    slug: doc.slug.current,
    title: doc.title,
    productCount: products.length,
  };
}
