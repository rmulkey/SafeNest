/**
 * Rewrite the 0–12 month sensory buying guide.
 *
 * WHY THIS EXISTS
 * best-sensory-toys-babies is the site's most-seen, worst-ranking page: 440
 * impressions at average position 51.9. It had 5 body blocks, three of which were
 * headings or the generated picks line, against 16–21 for the developed guides.
 *
 * It also contradicted its own title. The product list was ordered by safety
 * score alone, so a guide called "0–12 Months" opened with two toys labelled from
 * 10 months and 15 of its 33 picks started at 6 months or later. A parent of a
 * newborn read the title, read the first three names, and none of them applied.
 * The order here groups by the stage the label actually allows, then by safety
 * within the stage, and adds the five newborn-capable toys published in the
 * 2026-09 batch — which is what makes the first-six-months sections possible at
 * all, since the catalogue previously had no tummy time mat, no high-contrast
 * mirror and no activity gym.
 *
 * TWO FIELD NAMES
 * buyingGuideBySlugQuery reads coalesce(reviews, reviewReferences), so `reviews`
 * wins whenever it exists and this document has both. Writing only the
 * schema-declared `reviewReferences` would have changed nothing on the page. Both
 * are written, identically, so the document cannot drift further.
 *
 * NOT SET: lastReviewedAt. buyingGuide has no such field and the guide template
 * renders no staleness notice, so there is nothing to populate honestly.
 * publishedAt is also left alone — this is an edit, not a first publication, and
 * the sitemap already tracks _updatedAt.
 *
 * Usage:
 *   node scripts/rewrite-sensory-guide.mjs --dry-run
 *   SANITY_API_TOKEN="..." node scripts/rewrite-sensory-guide.mjs
 */
import { createClient } from "@sanity/client";

const DRY_RUN = process.argv.includes("--dry-run");
const SLUG = "best-sensory-toys-babies";

if (!DRY_RUN && !process.env.SANITY_API_TOKEN) {
  console.error("SANITY_API_TOKEN is required for a write run.");
  process.exit(1);
}

const client = createClient({
  projectId: "ofvgjgsi",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

const EXCERPT =
  "Sensory toys for newborns through the first birthday, grouped by what a baby " +
  "can actually do — plus the five-month rule for hanging toys that matters more " +
  "than any pick here.";

/** [style, listItem|null, text] */
const BLOCKS = [
  ["normal", null, "A baby's first year of play is almost entirely sensory. Long before stacking or pretending, a baby works with what they have: grasping, mouthing, listening, looking, and getting a hand to something they can see. The toys worth owning are the ones that give those actions something to do."],
  ["normal", null, "Newborn to twelve months is a wider span than it sounds. What holds a four-month-old lying on their front is not what an eleven-month-old wants, and a surprising number of toys sold as baby toys are labelled from ten months up. So the picks here are grouped by stage rather than ranked in one list, and every one is safety-scored and recall-checked."],

  ["h2", null, "What changes across the first year"],
  ["normal", "bullet", "Newborn to around three months. Vision is still developing, and high-contrast black-and-white patterns are easier to fix on than pastels. Most play is being carried, talked to, and put on their front for short spells. A mirror or a patterned mat gives tummy time a reason to lift the head."],
  ["normal", "bullet", "Around three to six months. Batting arrives, then reaching, then a deliberate grab. An overhead arch earns its place here by putting something within swiping distance. Rattles start to make sense once a baby can hold one and work out that the noise was their doing."],
  ["normal", "bullet", "Around six to nine months. Everything goes in the mouth. A baby can now pass an object from hand to hand and bang two of them together, so teethers, textured balls and anything that rewards a shake do well."],
  ["normal", "bullet", "Around nine to twelve months. Finger and thumb start working as a pincer, and containers become absorbing: in, out, and in again. Shape sorters and posting toys begin to land, and this is where most toys labelled from ten months up belong."],

  ["h2", null, "Hanging toys come down at five months"],
  ["normal", null, "This is the rule worth reading twice. For crib gyms, arches and hanging crib toys, the CPSC's long-standing instruction is to take them out when a baby begins pushing up on hands and knees, or at five months, whichever comes first. The reason is specific rather than precautionary: from around five months a baby can pull themselves up to a hanging toy, become entangled, or fall forward over it. CPSC has recalled crib toys for carrying no such warning."],
  ["normal", "bullet", "Activity gyms and play arches are for supervised floor time. Not the crib, and not sleep."],
  ["normal", "bullet", "Clip-on and stroller toys want short attachments. A loop, ribbon or cord long enough to go around a neck does not belong anywhere a baby is left alone."],
  ["normal", "bullet", "The sleep space stays bare — no toys, no padding. CPSC is also explicit that inclined products such as rockers, gliders, soothers and swings should never be used for sleep, however settled a baby looks in one."],

  ["h2", null, "What \u201cno small parts\u201d means on a label"],
  ["normal", null, "Federal rules ban small parts in toys intended for children under three. A part counts as small if it fits entirely inside a cylinder 1.25 inches wide and 2.25 inches deep, uncompressed and in any orientation, which approximates a young child's fully expanded throat. That standard is what sits behind the choking-hazard warnings printed on packaging. It is also why an age label is a safety statement and not a comment on how quick your baby is."],
  ["normal", "bullet", "On fabric toys the parts to watch are the sewn-on ones: eyes, noses, tags, bells, ribbon ends. Give them a firm pull when the toy arrives, then again every few weeks."],
  ["normal", "bullet", "Retire anything with a split seam, a loose squeaker or a cracked plastic ring. A toy that has come apart is no longer the toy that was labelled."],

  ["h2", null, "Cleaning, without wrecking the toy"],
  ["normal", "bullet", "Fabric toys with a rattle or squeaker sewn inside are usually surface-wash only, because soaking traps water where it cannot dry. Read the sewn-in label; two soft toys that look identical often differ here."],
  ["normal", "bullet", "Teethers and anything routinely mouthed need washing far more often than the rest of the basket. Follow the manufacturer's directions, and never mix cleaning products."],
  ["normal", "bullet", "Baby mirrors should be shatter-resistant panels, not glass. Check for cracks or a lifting edge before each session."],

  ["h2", null, "How we score these"],
  ["normal", null, "Every toy is scored out of 100 on four safety factors — material safety, choking risk, recall history, and certifications — plus a separate developmental score, then ranked safety-first. These scores are editorial research, not laboratory findings. Where a certification appears, we record where we read it: a manufacturer's own documentation and a retailer's product listing are not equally reliable, and a claim we only found in retailer copy is labelled that way and scored lower for it. We take no sponsorships; placement is earned, never paid. Age ranges reflect safety labelling."],

  ["h2", null, "Our picks"],
  ["normal", null, "Leading this guide: Oball Classic Ball, Manhattan Toy Skwish, Manhattan Toy Winkel Rattle. Tap any product below for its full safety breakdown, materials, and age guidance."],
];

/**
 * Product order: grouped by the minimum age the label allows, then safety score
 * descending inside each group. The 10-month toys keep their place — they are the
 * highest-scoring toys on the page and right for the final stage — they just stop
 * being the first thing a newborn's parent is shown.
 *
 * Listed by slug, not document id. 14 of these 38 documents have ids that predate
 * the slug convention (oball-classic-ball is review-oball-rattle,
 * sophie-la-girafe-teether is review-sophie-la-girafe, and so on), so deriving an
 * id as "review-" + slug silently produced 15 dangling references. Slugs are
 * resolved against the dataset below and the write is refused if any is unknown.
 */
const ORDER_SLUGS = [
  // ── From birth ────────────────────────────────────────────────────────────
  "oball-classic-ball",
  "manhattan-toy-skwish-rattle",
  "manhattan-toy-winkel-rattle",
  "sophie-la-girafe-teether",
  "skip-hop-farmstand-avocado-stroller-toy",
  "bright-starts-everything-nice-rattle-and-teether-set",
  "lamaze-freddie-the-firefly",
  "sassy-newborn-gift-set",
  "skip-hop-bandana-buddies",
  "skip-hop-activity-gym",
  "lamaze-mortimer-the-moose",
  "tiny-love-magical-tales-black-and-white-gymini",
  "manhattan-toy-wimmer-discovery-mirror",
  "manhattan-toy-wimmer-seek-and-explore-tummy-time-mat",
  "fisher-price-3-in-1-kick-and-sway-activity-gym",
  // ── From three months ─────────────────────────────────────────────────────
  "fat-brain-toys-pipsquigz-loops",
  "baby-banana-infant-teething-toothbrush",
  "bright-starts-oball-bundle-rattle",
  "bright-starts-oball-shaker-toy",
  "bright-starts-giggle-and-rattle-gift-set",
  "disney-baby-winnie-the-pooh-jingle-and-shake-rattle",
  "baby-einstein-take-along-tunes",
  "nuby-icybite-teething-keys",
  // ── From six months ──────────────────────────────────────────────────────
  "melissa-and-doug-multi-sensory-pineapple-soft-stacker-infant-toy",
  "edushape-sensory-ball-set",
  "manhattan-toy-whirzle",
  "munchkin-bath-bobbers",
  "skip-hop-explore-and-more-roll-around-hedgehog",
  "skip-hop-farmstand-beetbox-crawl-ball",
  "skip-hop-farmstand-corn-spinner",
  "fisher-price-giant-rock-a-stack",
  "fisher-price-sensory-rock-a-stack",
  "infantino-textured-ball-set",
  "sassy-stacks-of-circles-ring-stacker",
  "sassy-teethe-and-twirl-sensation-station",
  // ── From nine months ─────────────────────────────────────────────────────
  "skip-hop-zoo-stack-and-pour-buckets",
  // ── From ten months ──────────────────────────────────────────────────────
  "fat-brain-dimpl",
  "fat-brain-toys-innybin",
];

function buildBody() {
  return BLOCKS.map(([style, listItem, text], i) => {
    const block = {
      _key: `sg${String(i).padStart(2, "0")}`,
      _type: "block",
      style,
      markDefs: [],
      children: [
        { _key: `sgs${String(i).padStart(2, "0")}`, _type: "span", marks: [], text },
      ],
    };
    if (listItem) block.listItem = listItem;
    return block;
  });
}

function buildRefs(idsInOrder) {
  return idsInOrder.map((id, i) => ({
    _key: `rev${String(i).padStart(2, "0")}`,
    _type: "reference",
    _ref: id,
  }));
}

// ── Guard: never point a guide at a review that does not exist ───────────────
const existing = await client.fetch(
  `*[_type == "toyReview" && slug.current in $slugs]{ _id, "slug": slug.current,
     safetyScore, "min": ageRange.minMonths, "max": ageRange.maxMonths }`,
  { slugs: ORDER_SLUGS }
);
const found = new Map(existing.map((r) => [r.slug, r]));
const missing = ORDER_SLUGS.filter((s) => !found.has(s));
const ORDER = ORDER_SLUGS.filter((s) => found.has(s)).map((s) => found.get(s)._id);

// A duplicate id would silently shorten the list and double-list a product.
const dupes = ORDER.filter((id, i) => ORDER.indexOf(id) !== i);

const guide = await client.fetch(
  `*[_type == "buyingGuide" && slug.current == $slug][0]{
     _id, title, excerpt, "blocks": count(body),
     "reviewsCount": count(reviews), "refsCount": count(reviewReferences) }`,
  { slug: SLUG }
);

if (!guide) {
  console.error(`No buyingGuide with slug "${SLUG}".`);
  process.exit(1);
}

console.log(`${guide.title}  (${guide._id})`);
console.log(`  body blocks      ${guide.blocks} -> ${BLOCKS.length}`);
console.log(`  reviews          ${guide.reviewsCount} -> ${ORDER_SLUGS.length}`);
console.log(`  reviewReferences ${guide.refsCount} -> ${ORDER_SLUGS.length}`);
console.log(`  excerpt          ${guide.excerpt?.length ?? 0} -> ${EXCERPT.length} chars`);

if (missing.length) {
  console.error(`\nREFUSING TO WRITE — ${missing.length} referenced review(s) do not exist:`);
  missing.forEach((m) => console.error(`  - ${m}`));
  process.exit(1);
}
if (dupes.length) {
  console.error(`\nREFUSING TO WRITE — duplicate reference(s): ${[...new Set(dupes)].join(", ")}`);
  process.exit(1);
}
console.log(`\nall ${ORDER.length} referenced reviews resolve, no duplicates.`);

// Report the resulting order so the grouping is auditable, not assumed.
console.log("\nresulting order:");
let prevMin = -1;
ORDER_SLUGS.forEach((slug, i) => {
  const r = found.get(slug);
  if (r.min !== prevMin) {
    console.log(`  ── from ${r.min} months ──`);
    prevMin = r.min;
  }
  console.log(`  ${String(i + 1).padStart(2)}. ${slug.slice(0, 50).padEnd(50)} saf=${r.safetyScore} ${r.min}-${r.max}m`);
});

// Monotonic non-decreasing minimum age is the whole point of the reorder.
const mins = ORDER_SLUGS.map((s) => found.get(s).min);
const outOfOrder = mins.some((m, i) => i > 0 && m < mins[i - 1]);
if (outOfOrder) {
  console.error("\nREFUSING TO WRITE — minimum age is not non-decreasing across the list.");
  process.exit(1);
}
console.log("\nminimum age is non-decreasing across the list.");

const leads = ORDER_SLUGS.slice(0, 3).map((s) => found.get(s));
console.log(
  `leading three start at: ${leads.map((r) => `${r.min}m`).join(", ")} ` +
    `(scores ${leads.map((r) => r.safetyScore).join(", ")})`
);
if (leads.some((r) => r.min > 0)) {
  console.error("REFUSING TO WRITE — a guide titled 0–12 months must lead with toys usable from birth.");
  process.exit(1);
}

if (DRY_RUN) {
  console.log("\nDRY RUN — nothing written.");
  process.exit(0);
}

const refs = buildRefs(ORDER);
await client
  .patch(guide._id)
  .set({ body: buildBody(), excerpt: EXCERPT, reviews: refs, reviewReferences: refs })
  .commit();

console.log("\nwritten.");
