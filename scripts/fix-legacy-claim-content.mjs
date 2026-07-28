/**
 * Correct dangerous legacy claims in STORED review content.
 *
 * Most absolute phrasing is qualified safely at render time by
 * src/lib/content/qualify-claims.ts. Two classes cannot be fixed that way
 * without producing awkward or misleading prose, so they are corrected in the
 * source content instead:
 *
 *  1. Ambiguous testing claims ("All items tested for specific age stage")
 *     read as though SafeNest performed the testing. Only the manufacturer can
 *     be the subject, and the sentence has to be rebuilt, not pattern-replaced.
 *
 *  2. Precise or threshold prices ("$80+/kit") have no recorded source or
 *     price-check timestamp, so the figure cannot be published at all.
 *
 * Every replacement below is a hand-written sentence. Nothing is generated from
 * a template, no new facts are introduced, and the original value is printed so
 * the change is auditable. Run with --dry-run first.
 *
 * Usage:
 *   SANITY_API_TOKEN="..." node scripts/fix-legacy-claim-content.mjs --dry-run
 *   SANITY_API_TOKEN="..." node scripts/fix-legacy-claim-content.mjs
 */
import { createClient } from "@sanity/client";

const dryRun = process.argv.includes("--dry-run");

const client = createClient({
  projectId: "ofvgjgsi",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

/**
 * Exact-match edits. `find` must match the stored value exactly so a rerun after
 * the fix is a no-op and we never partially rewrite unexpected content.
 */
const EDITS = [
  {
    slug: "lovevery-play-kits-0-12",
    field: "chokingHazardAssessment",
    find: "All items tested for specific age stage. No small parts in 0-6m kits. Supervised play items clearly labeled.",
    replace:
      "The manufacturer states that the kit components are designed and tested for their specified developmental stages. SafeNest has not independently verified or physically tested the products. No small parts are described in the published information for the 0-6 month kits. The manufacturer labels items intended for supervised play.",
    reason:
      "'All items tested' reads as though SafeNest performed the testing; the subject is now explicitly the manufacturer.",
  },
  // Threshold prices across the catalog. None has a recorded source or
  // price-check timestamp, so the figure cannot be published; the qualitative
  // positioning is retained because it is defensible without a number.
  {
    slug: "grimms-large-rainbow-stacker",
    field: "cons",
    findInArray: "Premium price ($70+)",
    replace: "Generally positioned as a premium-priced product",
    reason: "No recorded price source or price-check timestamp.",
  },
  {
    slug: "kiwico-panda-crate",
    field: "cons",
    findInArray: "Subscription model ($36+/month)",
    replace: "Sold as a recurring subscription rather than a one-off purchase",
    reason:
      "Subscription model is a factual product structure; the monthly figure has no recorded source.",
  },
  {
    slug: "piccalio-pikler-triangle",
    field: "cons",
    findInArray: "Expensive ($150+)",
    replace: "Generally positioned at the higher end of the price range",
    reason: "No recorded price source or price-check timestamp.",
  },
  {
    slug: "tegu-sunset-24-piece",
    field: "cons",
    findInArray: "Very expensive ($80+)",
    replace: "Generally positioned at the higher end of the price range",
    reason: "No recorded price source or price-check timestamp.",
  },
  {
    slug: "lovevery-play-kits-0-12",
    field: "cons",
    findInArray: "Premium pricing ($80+/kit)",
    replace: "Generally positioned as a premium-priced subscription",
    reason:
      "No recorded price source or price-check timestamp exists, so a threshold price cannot be published.",
  },
];

async function main() {
  console.log(dryRun ? "DRY RUN — no writes\n" : "Applying content corrections\n");
  let changed = 0;
  let skipped = 0;

  for (const edit of EDITS) {
    const doc = await client.fetch(
      `*[_type=="toyReview" && slug.current==$slug][0]{_id, ${edit.field}}`,
      { slug: edit.slug }
    );
    if (!doc) {
      console.error(`✗ ${edit.slug}: review not found — skipping`);
      skipped++;
      continue;
    }

    const current = doc[edit.field];

    // Array field (e.g. cons): replace one entry, leave the rest untouched.
    if (edit.findInArray) {
      if (!Array.isArray(current)) {
        console.error(`✗ ${edit.slug}.${edit.field}: not an array — skipping`);
        skipped++;
        continue;
      }
      const idx = current.indexOf(edit.findInArray);
      if (idx === -1) {
        console.log(`• ${edit.slug}.${edit.field}: already corrected`);
        skipped++;
        continue;
      }
      const next = [...current];
      next[idx] = edit.replace;
      console.log(`✓ ${edit.slug}.${edit.field}[${idx}]`);
      console.log(`    was: ${edit.findInArray}`);
      console.log(`    now: ${edit.replace}`);
      console.log(`    why: ${edit.reason}`);
      if (!dryRun) {
        await client.patch(doc._id).set({ [edit.field]: next }).commit();
      }
      changed++;
      continue;
    }

    // Scalar field: require an exact match before overwriting.
    if (current !== edit.find) {
      if (current === edit.replace) {
        console.log(`• ${edit.slug}.${edit.field}: already corrected`);
      } else {
        console.error(
          `✗ ${edit.slug}.${edit.field}: stored value does not match the expected original — skipping to avoid clobbering.\n    stored: ${String(current).slice(0, 120)}`
        );
      }
      skipped++;
      continue;
    }

    console.log(`✓ ${edit.slug}.${edit.field}`);
    console.log(`    was: ${edit.find}`);
    console.log(`    now: ${edit.replace}`);
    console.log(`    why: ${edit.reason}`);
    if (!dryRun) {
      await client.patch(doc._id).set({ [edit.field]: edit.replace }).commit();
    }
    changed++;
  }

  console.log(`\n${changed} corrected, ${skipped} skipped${dryRun ? " (dry run)" : ""}.`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
