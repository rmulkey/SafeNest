/**
 * Seed the "Top 7 Toys for a Safe & Playful Fourth of July" blog post.
 *
 * Data integrity: every product, image (existing Sanity asset ref), score, age
 * range, and review link below is REAL — pulled from the live catalog. Editorial
 * copy is authored (allowed for a review site). No fabricated products or links.
 *
 * Run: SANITY_API_TOKEN="..." node scripts/seed-july4th-article.mjs
 */
import { createClient } from "@sanity/client";

const client = createClient({
  projectId: "ofvgjgsi",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

const ID = "blog-july-4th-top-7-outdoor-toys-2026";
const SLUG = "top-7-toys-safe-fourth-of-july";

// Real picks, ordered best-first by safety score (all verified live in catalog).
const PICKS = [
  { name: "Green Toys Dump Truck", slug: "green-toys-dump-truck", safety: 94, dev: 76, age: "1–6 years", img: "image-5c123bfb9d2ce86883b34321914125d4653515af-800x800-heif", alt: "Green Toys blue and orange recycled plastic dump truck with working tailgate", why: "Made from 100% recycled milk jugs with no BPA or external coatings, this rugged truck is built for sandboxes, dirt piles, and backyard cleanup after the cookout. No metal axles means nothing to rust when it gets left out in the sprinkler." },
  { name: "Green Toys Rescue Boat & Helicopter", slug: "green-toys-rescue-boat-and-helicopter", safety: 94, dev: 79, age: "1–6 years", img: "image-11c9a900752e86b152b5c9ce86cbc2c40bd0c055-800x800-webp", alt: "Green Toys recycled plastic rescue boat and helicopter set", why: "A floating, recycled-plastic rescue duo that turns the kiddie pool into an adventure. Oversized figures and one-piece construction mean no small parts, and everything rinses clean when the day is done." },
  { name: "Little Tikes First Slide", slug: "little-tikes-first-slide", safety: 86, dev: 79, age: "18 months–6 years", img: "image-915bc5be2b6563b3e57e8ff784ccd2ec793cbd9f-800x800-heif", alt: "Little Tikes My First Slide in red and blue for toddlers", why: "A low, wide-based slide that's just right for first backyard thrills. It folds flat for storage and moves indoors when the fireworks send everyone inside — steady and stable for new climbers." },
  { name: "Melissa & Doug Sunny Patch Spark Shark Fish Hunt Pool Game", slug: "melissa-and-doug-sunny-patch-spark-shark-fish-hunt-pool-game", safety: 86, dev: 83, age: "3–6 years", img: "image-09d0613e5b21041d7262a36ccd2284392c59898b-800x800-webp", alt: "Melissa and Doug Spark Shark Fish Hunt pool game", why: "Two nets, six sinker fish, and endless pool-party races. It keeps older toddlers and preschoolers busy and moving in the shallow end — always with an adult watching the water, of course." },
  { name: "Radio Flyer Scoot 2 Scooter", slug: "radio-flyer-scoot-2-scooter", safety: 85, dev: 79, age: "1–4 years", img: "image-2a5a960ea36397efa7ccd5585b9b31588ad40ee8-800x800-webp", alt: "Radio Flyer Scoot 2 Scooter red ride-on for toddlers", why: "A four-wheeled, tip-resistant ride-on that lets the littlest paraders join the driveway fun. The low seat and stable base build balance and confidence for toddlers not quite ready for pedals." },
  { name: "Step2 Waterpark Wonders Two-Tier Water Table", slug: "step2-waterpark-wonders-two-tier-water-table", safety: 83, dev: 85, age: "18 months–6 years", img: "image-ef9196ac1b1637c7dce7c77f524bc587442869e9-800x800-webp", alt: "Step2 Waterpark Wonders two-tier water table with umbrella", why: "Shaded, two-tier water play that keeps toddlers cool and contained on a hot Fourth. The umbrella is a genuinely useful touch, and a hose hookup turns it into a gentle sprinkler." },
  { name: "Little Tikes 3-in-1 Splash 'n Grow Water Table", slug: "little-tikes-3-in-1-splash-n-grow-water-table", safety: 83, dev: 85, age: "18 months–6 years", img: "image-b7d0d0a871f622f9f3945ce006020b5e5fd07869-800x800-webp", alt: "Little Tikes 3-in-1 Splash n Grow water table", why: "Adjustable legs mean this water table grows with your child, and the spinning gears, funnels, and ball drop give multiple kids something to do at once — perfect for a backyard full of cousins." },
];

let k = 0;
const key = (p = "k") => `${p}${++k}`;
function para(text) {
  return { _type: "block", _key: key("p"), style: "normal", markDefs: [], children: [{ _type: "span", _key: key("s"), text, marks: [] }] };
}
function heading(style, text) {
  return { _type: "block", _key: key("h"), style, markDefs: [], children: [{ _type: "span", _key: key("s"), text, marks: [] }] };
}
function image(ref, alt) {
  return { _type: "image", _key: key("img"), alt, asset: { _type: "reference", _ref: ref } };
}
function paraWithReviewLink(lead, linkText, slug) {
  const linkKey = key("link");
  return {
    _type: "block", _key: key("p"), style: "normal",
    markDefs: [{ _type: "link", _key: linkKey, href: `/reviews/${slug}` }],
    children: [
      { _type: "span", _key: key("s"), text: lead, marks: [] },
      { _type: "span", _key: key("s"), text: linkText, marks: [linkKey] },
      { _type: "span", _key: key("s"), text: ".", marks: [] },
    ],
  };
}

const body = [];
body.push(para("The Fourth of July is the unofficial kickoff of backyard season — cookouts, kiddie pools, sprinklers, and driveway parades. It's also a day when little ones need things to do that keep them cool, busy, and safely away from grills and fireworks. These seven outdoor and water toys are all independently safety-scored, recall-checked, and genuinely fun in the summer heat."));
body.push(para("We've ordered them best-first by safety score. Every pick is a real toy we've reviewed, and each links to its full safety breakdown so you can dig into the details before you buy."));

body.push(heading("h2", "How we scored these"));
body.push(para("Our Safety Score weighs four things: what a toy is made of, whether it poses a choking risk for its age, its recall history, and which independent safety certifications (like ASTM F963 and CPSIA) it carries. For outdoor and water toys we pay special attention to materials, drainage, and stability — and we'll always remind you that water play means eyes-on adult supervision, every single time."));

PICKS.forEach((p, i) => {
  body.push(heading("h3", `${i + 1}. ${p.name}`));
  body.push(image(p.img, p.alt));
  body.push(para(`Safety ${p.safety}/100 · Development ${p.dev}/100 · Ages ${p.age}. ${p.why}`));
  body.push(paraWithReviewLink("Read the full safety breakdown in our ", `${p.name} review`, p.slug));
});

body.push(heading("h2", "A quick Fourth of July safety checklist"));
body.push(para("Water first: never leave a child unattended near a water table, kiddie pool, or bucket — drowning can happen in seconds and in just a couple of inches of water. Empty and flip water toys when play is done."));
body.push(para("Sun and heat: plastic slides and ride-ons get hot in direct sun, so check surfaces before little ones climb on, and keep water play in the shade when you can. And keep toys well clear of grills, fire pits, sparklers, and fireworks — the safest distance is inside, with the whole family, when the real fireworks begin."));
body.push(para("Want our safest seasonal picks and recall alerts in your inbox? Join the SafeNest newsletter below — and have a happy, safe Fourth from our family to yours."));

const doc = {
  _id: ID,
  _type: "blogPost",
  title: "Top 7 Toys for a Safe & Playful Fourth of July",
  slug: { _type: "slug", current: SLUG },
  excerpt:
    "Cookouts, kiddie pools, and driveway parades — here are seven outdoor and water toys to keep little ones cool, busy, and safe this Fourth of July. Every pick is independently safety-scored, recall-checked, and parent-tested.",
  author: "Rodrigo & Vanessa Mulkey",
  publishedAt: new Date().toISOString(),
  body,
};

async function main() {
  await client.createOrReplace(doc);
  console.log(`✓ Seeded article → /blog/${SLUG} ("${doc.title}")`);
  console.log(`  ${PICKS.length} products, ${body.length} blocks (incl. ${PICKS.length} images + ${PICKS.length} review links)`);
}
main().catch((e) => { console.error(e.message); process.exit(1); });
