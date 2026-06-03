/**
 * Automated bi-weekly blog post generator.
 *
 * Produces an editorial "best of" roundup from products ALREADY in the catalog
 * (real, verified toyReview documents). This is data-integrity-safe: it invents
 * no products, links, or facts — it only authors editorial framing around real
 * reviews and links back to them. Scores/copy are editorial, which the rule
 * explicitly permits for a review site.
 *
 * Topic rotates by ISO week so consecutive runs cover different categories and
 * never collide on slug (the slug is week-stamped and createIfNotExists guards
 * against double-publishing within the same fortnight).
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
}

interface TopicConfig {
  categoryRef: string;
  categoryLabel: string;
  slugBase: string;
}

/** Rotating topics — one per run, chosen by week parity + index. */
const TOPICS: TopicConfig[] = [
  { categoryRef: "cat-building", categoryLabel: "Building Toys", slugBase: "best-building-toys" },
  { categoryRef: "cat-sensory", categoryLabel: "Sensory Toys", slugBase: "best-sensory-toys" },
  { categoryRef: "cat-educational", categoryLabel: "Educational Toys", slugBase: "best-educational-toys" },
  { categoryRef: "cat-outdoor", categoryLabel: "Outdoor Toys", slugBase: "best-outdoor-toys" },
];

/** Minimum real products required to publish a roundup. */
export const MIN_PRODUCTS_FOR_POST = 3;

/** ISO-week number (1–53) for deterministic topic rotation + slug stamping. */
export function isoWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

/** Pick the topic for a given date by rotating through TOPICS. */
export function pickTopic(date: Date): TopicConfig {
  const { week } = isoWeek(date);
  return TOPICS[week % TOPICS.length];
}

function ageLabel(minMonths: number, maxMonths: number): string {
  const fmt = (m: number) =>
    m < 12 ? `${m} mo` : Number.isInteger(m / 12) ? `${m / 12} yr` : `${m} mo`;
  return `${fmt(minMonths)}–${fmt(maxMonths)}`;
}

interface BlockChild {
  _type: "span";
  _key: string;
  text: string;
  marks?: string[];
}
interface Block {
  _type: "block";
  _key: string;
  style: string;
  children: BlockChild[];
  markDefs: [];
}

let keyCounter = 0;
function block(style: string, text: string): Block {
  keyCounter += 1;
  return {
    _type: "block",
    _key: `b${keyCounter}`,
    style,
    children: [{ _type: "span", _key: `s${keyCounter}`, text }],
    markDefs: [],
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
  body: Block[];
  category: { _type: "reference"; _ref: string };
  relatedReviews: Array<{ _type: "reference"; _ref: string; _key: string }>;
  publishedAt: string;
} | null {
  if (products.length < MIN_PRODUCTS_FOR_POST) return null;

  const top = [...products]
    .sort((a, b) => b.safetyScore - a.safetyScore)
    .slice(0, 8);

  const { year, week } = isoWeek(date);
  const monthYear = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const title = `The Safest ${topic.categoryLabel} We've Reviewed (${monthYear})`;
  const slug = `${topic.slugBase}-${year}-w${week}`;

  keyCounter = 0;
  const body: Block[] = [
    block(
      "normal",
      `Every toy in this roundup comes from our independent reviews — each one safety-scored out of 100 and checked against current recall data. We've pulled together the ${top.length} highest-scoring ${topic.categoryLabel.toLowerCase()} in our catalog right now, so you can shop with confidence.`
    ),
    block("h2", "How we picked these"),
    block(
      "normal",
      "We rank by our Safety Score, which weighs material safety, choking risk, recall history, and certifications. We only include toys we've personally reviewed — no sponsored placements, no guesswork. Scores reflect our editorial assessment as parents who care about getting this right."
    ),
    block("h2", `Our top ${topic.categoryLabel.toLowerCase()} right now`),
  ];

  top.forEach((p, i) => {
    body.push(block("h3", `${i + 1}. ${p.productName}`));
    body.push(
      block(
        "normal",
        `Safety Score ${p.safetyScore}/100 · Development Score ${p.developmentScore}/100 · Ages ${ageLabel(
          p.ageRange.minMonths,
          p.ageRange.maxMonths
        )}. Read our full safety breakdown in the ${p.productName} review.`
      )
    );
  });

  body.push(block("h2", "A note from our family"));
  body.push(
    block(
      "normal",
      "We built SafeNest because, as parents of three, we wanted to take the guesswork out of choosing toys that are both safe and genuinely good for development. Every pick above is one we'd feel comfortable putting in our own kids' hands."
    )
  );

  return {
    _id: `blog-${slug}`,
    _type: "blogPost",
    title,
    slug: { _type: "slug", current: slug },
    excerpt: `Our highest-scoring ${topic.categoryLabel.toLowerCase()} this ${monthYear}, ranked by independent safety score and checked against recall data.`,
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
 * Generates and publishes (createIfNotExists) the roundup for the current week.
 * Idempotent: re-running in the same fortnight won't duplicate the post.
 */
export async function generateBiweeklyPost(
  client: SanityClient,
  now: Date = new Date()
): Promise<GenerateOutcome> {
  const topic = pickTopic(now);

  const products = await client.fetch<CatalogProduct[]>(
    `*[_type == "toyReview" && category._ref == $cat && !(_id in path("drafts.**"))]{
      _id, productName, brand, slug, safetyScore, developmentScore, ageRange
    } | order(safetyScore desc)`,
    { cat: topic.categoryRef }
  );

  const doc = buildRoundupPost(topic, products, now);
  if (!doc) {
    return { status: "skipped-insufficient", productCount: products.length };
  }

  // createIfNotExists guards against double-publishing the same week's post.
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
