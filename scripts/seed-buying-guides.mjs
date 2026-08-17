/**
 * Seed several new Buying Guides for SafeNest.
 *
 * Data integrity: each guide's referenced products are selected AT RUNTIME from
 * the live catalog via GROQ (real toyReview docs, ranked by safety score), so
 * every reference is a real, published review — never fabricated. Editorial
 * body/excerpt copy is authored (allowed for a review site). A guide is only
 * created if at least 3 real matching reviews exist (schema minimum).
 *
 * The /guides/[slug] page reads the `reviews[]->` field (that's what renders),
 * so we store references under `reviews` (matching the existing guide) and also
 * mirror them to `reviewReferences` for the Studio schema.
 *
 * Run: SANITY_API_TOKEN="..." node scripts/seed-buying-guides.mjs
 */
import { createClient } from "@sanity/client";

const client = createClient({
  projectId: "ofvgjgsi",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

let k = 0;
const key = (p = "k") => `${p}${++k}`;
const para = (text) => ({ _type: "block", _key: key("p"), style: "normal", markDefs: [], children: [{ _type: "span", _key: key("s"), text, marks: [] }] });
const h2 = (text) => ({ _type: "block", _key: key("h"), style: "h2", markDefs: [], children: [{ _type: "span", _key: key("s"), text, marks: [] }] });

/**
 * Guide specs. `category` is a cat-* ref (or null for cross-category). `min`/`max`
 * are the age window in months used both for targetAgeRange and product selection.
 */
const GUIDES = [
  {
    _id: "guide-best-sensory-toys-babies",
    title: "Best Sensory Toys for Babies (0–12 Months)",
    slug: "best-sensory-toys-babies",
    category: "cat-sensory",
    min: 0, max: 12,
    excerpt:
      "Parent-researched, engaging sensory toys for newborns and infants — rattles, teethers, and high-contrast textures, each safety-scored by SafeNest Toys.",
    intro:
      "In the first year, play is sensory: babies learn by grasping, mouthing, listening, and looking. The best infant toys are simple, safe to chew, and free of small parts — and they earn their keep by engaging more than one sense at a time. Every pick below is safety-scored and recall-checked, and chosen for babies from newborn through their first birthday.",
  },
  {
    _id: "guide-best-educational-toys-2-3",
    title: "Best Educational Toys for 2–3 Year Olds",
    slug: "best-educational-toys-2-3-years",
    category: "cat-educational",
    min: 24, max: 42,
    excerpt:
      "Safety-scored educational toys for 2- and 3-year-olds — shape sorters, puzzles, and early-STEM picks that teach without feeling like homework.",
    intro:
      "Two- and three-year-olds are busy building language, problem-solving, and fine-motor skills. The best educational toys at this age turn those milestones into play — sorting, matching, counting, and pretending. These picks are chosen for genuine developmental value and are safety-scored and recall-checked.",
  },
  {
    _id: "guide-best-outdoor-water-toys-toddlers",
    title: "Best Outdoor & Water Toys for Toddlers",
    slug: "best-outdoor-water-toys-toddlers",
    category: "cat-outdoor",
    min: 12, max: 72,
    excerpt:
      "Safety-scored outdoor and water toys for toddlers — water tables, ride-ons, sandbox trucks, and pool play that hold up to real backyard use.",
    intro:
      "Outdoor play builds gross-motor strength, balance, and confidence — and toddlers will happily spend hours at it. The toys below are chosen for durable, weather-friendly materials and stable, age-appropriate designs. Every pick is safety-scored and recall-checked. A reminder that bears repeating: water play, even a shallow water table, always needs eyes-on adult supervision.",
  },
  {
    _id: "guide-best-building-toys-preschoolers",
    title: "Best Building & Construction Toys for Preschoolers",
    slug: "best-building-toys-preschoolers",
    category: "cat-building",
    min: 36, max: 96,
    excerpt:
      "The best open-ended building and construction toys for preschoolers — blocks, magnetic tiles, and sets that grow STEM and creativity, all safety-scored.",
    intro:
      "Few toys deliver more open-ended play per dollar than a great building set. For preschoolers, construction toys build spatial reasoning, planning, fine-motor control, and endless imaginative scenarios. These picks range from classic wooden blocks to magnetic tiles, each safety-scored and recall-checked.",
  },
  {
    _id: "guide-best-toys-6-12-months",
    title: "Best Toys for 6–12 Month Olds",
    slug: "best-toys-6-12-months",
    category: null,
    min: 6, max: 12,
    excerpt:
      "Safety-scored toys for 6–12 month olds — the sit-up, crawl, and cruise stage — chosen to match fast-developing motor and sensory skills.",
    intro:
      "Between six and twelve months, babies are sitting, crawling, and pulling up — and they want toys that move and respond. The best picks for this stage reward cause-and-effect, encourage crawling and reaching, and are safe to mouth. These toys are drawn from across our catalog, each safety-scored and recall-checked.",
  },
];

const SELECT = `{ _id, productName, "slug": slug.current, safetyScore, developmentScore }`;

async function pickReviews(g) {
  const params = { min: g.min, max: g.max };
  const filter = g.category
    ? `_type=="toyReview" && category._ref==$cat && ageRange.minMonths <= $max && ageRange.maxMonths >= $min`
    : `_type=="toyReview" && ageRange.minMonths <= $max && ageRange.maxMonths >= $min`;
  if (g.category) params.cat = g.category;
  return client.fetch(
    `*[${filter}] | order(safetyScore desc)[0...6] ${SELECT}`,
    params
  );
}

async function main() {
  let created = 0;
  for (const g of GUIDES) {
    const reviews = await pickReviews(g);
    if (!reviews || reviews.length < 3) {
      console.log(`⚠ skip "${g.title}" — only ${reviews?.length ?? 0} matching reviews (need 3)`);
      continue;
    }
    const refs = reviews.map((r) => ({ _type: "reference", _key: key("ref"), _ref: r._id }));
    const top = reviews.slice(0, 3).map((r) => r.productName);
    const body = [
      para(g.intro),
      h2("How we chose these"),
      para(
        "Every toy here is scored out of 100 on four safety factors — material safety, choking risk, recall history, and certifications — plus a separate developmental score, then ranked safety-first. We accept no sponsorships; picks are chosen purely on merit."
      ),
      h2("Our top picks"),
      para(
        `Leading this guide: ${top.join(", ")}. Tap any product below for its full safety breakdown, materials, and age guidance.`
      ),
    ];
    const doc = {
      _id: g._id,
      _type: "buyingGuide",
      title: g.title,
      slug: { _type: "slug", current: g.slug },
      targetAgeRange: { minMonths: g.min, maxMonths: g.max },
      reviews: refs,
      reviewReferences: refs,
      excerpt: g.excerpt,
      body,
      publishedAt: new Date().toISOString(),
      ...(g.category ? { category: { _type: "reference", _ref: g.category } } : {}),
    };
    await client.createOrReplace(doc);
    created++;
    console.log(`✓ ${g.title} → /guides/${g.slug}  (${reviews.length} real products)`);
  }
  console.log(`\n✅ ${created} buying guides created/updated.`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
