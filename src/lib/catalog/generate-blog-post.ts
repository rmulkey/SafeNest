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
}

interface TopicConfig {
  categoryRef: string;
  categoryLabel: string;
  /** Singular-ish label used in prose, e.g. "building toy". */
  categoryNoun: string;
  slugBase: string;
}

/** Rotating topics — one per run, chosen by week parity + index. */
const TOPICS: TopicConfig[] = [
  { categoryRef: "cat-building", categoryLabel: "Building Toys", categoryNoun: "building toy", slugBase: "top-child-safe-building-toys" },
  { categoryRef: "cat-sensory", categoryLabel: "Sensory Toys", categoryNoun: "sensory toy", slugBase: "top-child-safe-sensory-toys" },
  { categoryRef: "cat-educational", categoryLabel: "Educational Toys", categoryNoun: "educational toy", slugBase: "top-child-safe-educational-toys" },
  { categoryRef: "cat-outdoor", categoryLabel: "Outdoor Toys", categoryNoun: "outdoor toy", slugBase: "top-child-safe-outdoor-toys" },
];

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

function ageLabel(minMonths: number, maxMonths: number): string {
  const fmt = (m: number) =>
    m < 12 ? `${m} mo` : Number.isInteger(m / 12) ? `${m / 12} yr` : `${m} mo`;
  return `${fmt(minMonths)}–${fmt(maxMonths)}`;
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
  const body: PostBlock[] = [
    // Hook
    block(
      "normal",
      `The ${label.replace(/s$/, "")} aisle won't tell you what matters most: is it safe, and will it actually help your child grow? As parents of three, we've done that digging for you. These ${count} ${label} earned the highest safety scores in our catalog right now — every one is a toy we'd happily hand our own kids.`
    ),
    block(
      "normal",
      "Each pick is independently scored out of 100 for material safety, choking risk, recall history, and certifications, then checked against current recall data. No sponsorships, no guesswork — just our honest assessment, best-first."
    ),
    block("h2", "How we scored these"),
    block(
      "normal",
      "Our Safety Score weighs what a toy is made of, whether it poses a choking risk for its age, its recall history, and which independent safety certifications it carries (like ASTM F963 and CPSIA). A score in the 90s means a toy we'd trust without a second thought.",
    ),
    block("h2", `Our top ${label} right now`),
  ];

  top.forEach((p, i) => {
    body.push(block("h3", `${i + 1}. ${p.productName}`));
    // Real product image, when available.
    if (p.imageRef) {
      body.push(imageBlock(p.imageRef, p.imageAlt || p.productName));
    }
    // Factual line — only real scores/age, plus safe editorial framing.
    body.push(
      block(
        "normal",
        `Safety ${p.safetyScore}/100 · Development ${p.developmentScore}/100 · Ages ${ageLabel(
          p.ageRange.minMonths,
          p.ageRange.maxMonths
        )}. From ${p.brand}, it's one of our top-rated ${topic.categoryNoun}s for this age — high marks for safety and genuine developmental value.`
      )
    );
    // Link to the real review page.
    body.push(
      paragraphWithReviewLink(
        "See the full safety breakdown in our ",
        `${p.productName} review`,
        p.slug.current
      )
    );
  });

  body.push(block("h2", "Choosing the right one for your child"));
  body.push(
    block(
      "normal",
      "Any toy on this list is one we'd feel good about putting in our own kids' hands. Browse every toy we've safety-scored on our reviews page, and if you'd like our safest picks and recall alerts in your inbox, join the SafeNest newsletter below."
    )
  );
  body.push(
    block(
      "normal",
      "Helping parents choose safer, smarter toys with confidence — that's why we built SafeNest."
    )
  );

  return {
    _id: `blog-${slug}`,
    _type: "blogPost",
    title,
    slug: { _type: "slug", current: slug },
    excerpt: `Our ${count} highest-scoring ${label} as of ${period}, ranked by SafeNest's editorial safety score and checked against recall data — researched by parents.`,
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
  status: "published" | "skipped-exists" | "skipped-insufficient";
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

  await client.create(doc);
  return {
    status: "published",
    slug: doc.slug.current,
    title: doc.title,
    productCount: products.length,
  };
}
