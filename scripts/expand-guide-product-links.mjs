#!/usr/bin/env node
/**
 * Link every age-appropriate sensory review into the sensory buying guide.
 *
 * WHY THIS GUIDE
 * Search Console, 83 days, first-party: sensory-toy queries are 274 of 405
 * query-page impressions, 68% of everything this site is shown for. One page
 * takes 271 of those 274 — /guides/best-sensory-toys-babies — and it ranks
 * between 41 and 80. Never better than 41.
 *
 *   newborn sensory toys        51 impressions   position 41.1
 *   sensory toys for babies     38               position 51.1
 *   sensory toys for infants    25               position 54.4
 *   baby sensory toys           24               position 49.7
 *
 * The page is 495 words with 4 <h2>s and links 6 products. There are 35 reviews
 * in the sensory category. It uses 6 of them.
 *
 * WHY THIS IS NOT "ADD NEW PRODUCTS"
 * The obvious reading of "add products for strong keywords" is to source new
 * ones. That would be the wrong move here and it carries data-integrity risk:
 * every new product needs a verified real image, a resolving link and a real
 * listing. There are already 29 verified, published sensory reviews this guide
 * does not mention. Using them costs nothing and risks nothing.
 *
 * SECOND EFFECT, WHICH MAY MATTER MORE
 * The guide is indexed and crawled — it has impressions. Most of the reviews it
 * omits are not: 143 of 221 URLs have never been fetched. Linking them from an
 * indexed page creates real crawl paths, which is the same problem Request
 * Indexing addresses one URL at a time.
 *
 * SELECTION RULE
 * Sensory category, and ageRange.minMonths <= 12, because the guide is titled
 * 0-12 months. That excludes the playfoam (36m+) and the VTech drum set (24m+)
 * on age rather than on taste. Ordered by safetyScore descending, matching how
 * the site orders elsewhere. Nothing is invented: these are references to
 * existing documents.
 *
 * Usage:
 *   set -a; . ./.env.local; set +a
 *   node scripts/expand-sensory-guide.mjs              # dry run
 *   node scripts/expand-sensory-guide.mjs --apply
 */

import { createClient } from "@sanity/client";

const APPLY = process.argv.includes("--apply");
/**
 * Guide slugs to process. Category and age range are read from each guide, so
 * the rule is the guide's own configuration rather than anything hardcoded here.
 *
 * The four with a `category` reference were all linking exactly 6 products:
 *   best-sensory-toys-babies          6 of 33
 *   best-educational-toys-2-3-years   6 of 47
 *   best-building-toys-preschoolers   6 of 28
 *   best-outdoor-water-toys-toddlers  6 of 24
 *
 * The other eight guides carry no category reference, so this rule cannot select
 * for them; they are listed by --audit and left alone.
 */
const GUIDE_SLUGS = (process.env.GUIDE_SLUGS ||
  "best-sensory-toys-babies,best-educational-toys-2-3-years,best-building-toys-preschoolers,best-outdoor-water-toys-toddlers")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN;
if (APPLY && !token) {
  console.error(
    "SANITY_API_WRITE_TOKEN is not set, so --apply cannot write.\n" +
      "Run without --apply to see the dry run."
  );
  process.exit(2);
}

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token,
});

let grandTotalAdded = 0;

for (const slug of GUIDE_SLUGS) {
  const guide = await client.fetch(
    `*[_type=="buyingGuide" && slug.current==$slug][0]{
       _id, title, targetAgeRange,
       "catSlug": category->slug.current,
       "currentReviews": reviews[]{_ref},
       "blocks": count(body)
     }`,
    { slug }
  );

  console.log("=".repeat(76));
  if (!guide) {
    console.log(`SKIP  no buyingGuide with slug "${slug}"`);
    continue;
  }
  if (!guide.catSlug) {
    console.log(`SKIP  ${slug} — no category reference, so this rule cannot select for it`);
    continue;
  }

  const min = guide.targetAgeRange?.minMonths ?? 0;
  const max = guide.targetAgeRange?.maxMonths ?? 999;

  // Age *overlap*, not just a floor: a toy belongs in a guide when its usable
  // range intersects the guide's range at all.
  const candidates = await client.fetch(
    `*[_type=="toyReview"
        && category->slug.current==$cat
        && ageRange.minMonths <= $max
        && ageRange.maxMonths >= $min
        && hasActiveRecall != true
      ]{ _id, productName, "slug":slug.current, safetyScore, ageRange }
      | order(safetyScore desc, productName asc)`,
    { cat: guide.catSlug, min, max }
  );

  const currentIds = new Set((guide.currentReviews ?? []).map((r) => r._ref));
  const added = candidates.filter((c) => !currentIds.has(c._id));

  console.log(`${guide.title}`);
  console.log(`  slug        /guides/${slug}`);
  console.log(`  category    ${guide.catSlug}   guide age ${min}-${max} months`);
  console.log(`  body        ${guide.blocks} blocks`);
  console.log(`  linked      ${currentIds.size} now -> ${candidates.length} after   (+${added.length})`);

  if (added.length === 0) {
    console.log(`  nothing to add`);
    continue;
  }
  console.log(`  adding:`);
  for (const c of added) {
    const age = `${c.ageRange?.minMonths ?? "?"}-${c.ageRange?.maxMonths ?? "?"}m`;
    console.log(`    ${String(c.safetyScore).padStart(3)} ${age.padStart(8)}  ${c.slug}`);
  }

  // Excluded, and why, so the age rule is auditable rather than implicit.
  const excluded = await client.fetch(
    `*[_type=="toyReview" && category->slug.current==$cat
        && !(ageRange.minMonths <= $max && ageRange.maxMonths >= $min)
      ]{ "slug":slug.current, ageRange }`,
    { cat: guide.catSlug, min, max }
  );
  if (excluded.length) {
    console.log(`  excluded on age (${excluded.length}):`);
    for (const e of excluded.slice(0, 8)) {
      console.log(`    ${e.slug} (${e.ageRange?.minMonths}-${e.ageRange?.maxMonths}m)`);
    }
    if (excluded.length > 8) console.log(`    ... ${excluded.length - 8} more`);
  }

  grandTotalAdded += added.length;

  if (!APPLY) continue;

  // buyingGuideBySlugQuery coalesces reviews then reviewReferences, so `reviews`
  // is authoritative. Both are written so the two can never disagree.
  const refs = candidates.map((c, i) => ({
    _type: "reference",
    _ref: c._id,
    _key: `rev${String(i).padStart(2, "0")}`,
  }));
  await client.patch(guide._id).set({ reviews: refs, reviewReferences: refs }).commit();
  console.log(`  PATCHED ${guide._id}: ${currentIds.size} -> ${refs.length}`);
}

console.log("=".repeat(76));
console.log(`${APPLY ? "added" : "would add"} ${grandTotalAdded} product links across ${GUIDE_SLUGS.length} guide(s)`);
if (!APPLY) console.log(`dry run — nothing written. Re-run with --apply.`);
