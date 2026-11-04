/**
 * Set lastReviewedAt on reviews whose assessment was actually re-checked, using
 * the timestamp recorded when it was checked.
 *
 * WHY THIS IS NARROW
 * lastReviewedAt means "when this assessment was last re-checked", and the review
 * template shows it to readers — a blank value is what makes the page say the
 * details may be out of date. Setting it on the whole catalogue to clear that
 * notice would assert 138 reviews that nobody performed. That is the same class
 * of problem as an invented ASIN: a verifiable-sounding fact with nothing behind
 * it, and worse here because the claim is about safety diligence.
 *
 * So this reads a provenance sidecar produced by build-verified-queue.mjs and
 * sets lastReviewedAt only for the products in it, to that file's own checkedAt —
 * the moment each listing was actually read and its facts confirmed. Reviews
 * absent from the file are left alone and keep telling readers the truth.
 *
 * reviewedBy is deliberately not set. The schema asks for a named person
 * accountable for the assessment and says to leave it blank rather than invent a
 * credentialed reviewer. There is no such person for this batch.
 *
 * Usage:
 *   node scripts/set-last-reviewed-from-provenance.mjs scripts/verified-queue.provenance.json --dry-run
 *   SANITY_API_TOKEN="..." node scripts/set-last-reviewed-from-provenance.mjs scripts/verified-queue.provenance.json
 */
import { readFileSync } from "node:fs";
import { createClient } from "@sanity/client";

const DRY_RUN = process.argv.includes("--dry-run");
const inFile = process.argv.slice(2).find((a) => !a.startsWith("--"));

if (!inFile) {
  console.error("Usage: node scripts/set-last-reviewed-from-provenance.mjs <provenance.json> [--dry-run]");
  process.exit(1);
}
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

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/['\u2019]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

const provenance = JSON.parse(readFileSync(inFile, "utf-8"));
const wanted = provenance.map((p) => ({
  slug: slugify(p.productName),
  checkedAt: p.checkedAt,
  productName: p.productName,
}));

const rows = await client.fetch(
  `*[_type == "toyReview" && slug.current in $slugs]{ _id, "slug": slug.current, lastReviewedAt }`,
  { slugs: wanted.map((w) => w.slug) }
);
const bySlug = new Map(rows.map((r) => [r.slug, r]));

const missing = wanted.filter((w) => !bySlug.has(w.slug));
if (missing.length) {
  console.error(`REFUSING — ${missing.length} product(s) in the sidecar have no published review:`);
  missing.forEach((m) => console.error(`  - ${m.productName} (expected slug ${m.slug})`));
  process.exit(1);
}

// Every timestamp must be real and in the past; a future date would be nonsense.
const now = Date.now();
const bad = wanted.filter((w) => {
  const t = Date.parse(w.checkedAt);
  return !Number.isFinite(t) || t > now;
});
if (bad.length) {
  console.error(`REFUSING — ${bad.length} checkedAt value(s) are missing or in the future.`);
  bad.forEach((b) => console.error(`  - ${b.productName}: ${b.checkedAt}`));
  process.exit(1);
}

const catalogueTotal = await client.fetch(`count(*[_type == "toyReview"])`);
console.log(
  `${wanted.length} of ${catalogueTotal} reviews were re-checked and will be stamped.\n` +
    `The other ${catalogueTotal - wanted.length} are left blank on purpose — nobody re-checked them.\n`
);

for (const w of wanted) {
  const row = bySlug.get(w.slug);
  const was = row.lastReviewedAt ?? "(blank)";
  console.log(`  ${w.slug.slice(0, 52).padEnd(52)} ${was} -> ${w.checkedAt}`);
}

if (DRY_RUN) {
  console.log("\nDRY RUN — nothing written.");
  process.exit(0);
}

let tx = client.transaction();
for (const w of wanted) {
  tx = tx.patch(bySlug.get(w.slug)._id, { set: { lastReviewedAt: w.checkedAt } });
}
await tx.commit();
console.log(`\nstamped ${wanted.length} review(s).`);
