/**
 * Build a verified queue batch from a candidate list of REAL products.
 *
 * DATA INTEGRITY (mandatory):
 *  - Each candidate names a real, currently-sold toy and points at its real
 *    Target.com product page (targetUrl).
 *  - The page's own product record is read (scripts/lib/target-product.mjs) and
 *    the candidate is rejected unless:
 *      · the listing's title and brand match the product being reviewed, so a
 *        wrong URL cannot attach another product's photo to the review;
 *      · the listing states a suggested age, and the candidate's minimum age
 *        equals it (and its maximum too, when the listing gives one);
 *      · a small-parts warning on the listing is not contradicted by a minimum
 *        age under 3 years.
 *  - The photo is Target's canonical primary image for that record, and it must
 *    return real image bytes (HTTP 200, content-type image/*, >2KB).
 *  - Affiliate links are Amazon SEARCH urls (no tag; BuyButton appends it), so
 *    there are no invented /dp/{ASIN} links.
 *
 * Anything that fails is reported and dropped — never fabricated or patched.
 *
 * Scores/materials/pros/cons/assessment are authored editorially (allowed for a
 * review site) in the candidate file and copied through unchanged.
 *
 * The candidate's `evidence` block travels two ways. factorEvidence and
 * certificationEvidence go into the queue payload, because the published review
 * needs them: a review recording no evidence status inherits the legacy
 * "manufacturer-reported" default, which would credit the manufacturer for facts
 * transcribed from a retailer listing. The full block, including source URLs and
 * the raw listing facts, also goes to a provenance sidecar for auditing.
 *
 * Usage:
 *   node scripts/build-verified-queue.mjs scripts/new-products.json scripts/verified-queue.json
 *   -> also writes scripts/verified-queue.provenance.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import {
  UA,
  canonicalTargetUrl,
  fetchTargetProduct,
  titleMatches,
} from "./lib/target-product.mjs";

const [, , inFile, outFile] = process.argv;
if (!inFile || !outFile) {
  console.error(
    "Usage: node scripts/build-verified-queue.mjs <candidates.json> <out.json>"
  );
  process.exit(1);
}

const MIN_IMAGE_BYTES = 2000;
const SMALL_PARTS_AGE_MONTHS = 36;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Verify an image URL returns real image bytes. */
async function verifyImage(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    },
  });
  const ct = res.headers.get("content-type") || "";
  const bytes = (await res.arrayBuffer()).byteLength;
  const ok = res.ok && ct.startsWith("image/") && bytes > MIN_IMAGE_BYTES;
  return { ok, status: res.status, ct, bytes };
}

function searchUrl(brand, name) {
  const q = name.toLowerCase().includes(brand.toLowerCase())
    ? name
    : `${brand} ${name}`;
  return `https://www.amazon.com/s?k=${encodeURIComponent(q.trim())}`;
}

/** Reasons the candidate disagrees with its own listing; empty when it agrees. */
function listingConflicts(c, facts) {
  const problems = [];

  const match = titleMatches(c.productName, c.brand, facts);
  if (!match.ok) {
    problems.push(
      `listing does not describe this product (brand ${match.brandOk ? "ok" : "MISMATCH"}, ` +
        `${Math.round(match.share * 100)}% of name words found, missing: ${match.missing.join(", ") || "-"}) ` +
        `— listing title: "${facts.title}"`
    );
  }

  if (!facts.age) {
    problems.push(`listing states no parseable suggested age ("${facts.suggestedAge ?? ""}")`);
  } else {
    if (c.ageMinMonths !== facts.age.minMonths) {
      problems.push(
        `ageMinMonths ${c.ageMinMonths} disagrees with listing "${facts.suggestedAge}" (${facts.age.minMonths})`
      );
    }
    if (facts.age.maxMonths != null && c.ageMaxMonths !== facts.age.maxMonths) {
      problems.push(
        `ageMaxMonths ${c.ageMaxMonths} disagrees with listing "${facts.suggestedAge}" (${facts.age.maxMonths})`
      );
    }
  }

  const smallParts = facts.choking.some((w) => /small.?parts/i.test(`${w.code} ${w.message}`));
  if (smallParts && c.ageMinMonths < SMALL_PARTS_AGE_MONTHS) {
    problems.push(
      `listing carries a small-parts warning but ageMinMonths is ${c.ageMinMonths}`
    );
  }

  if (!facts.imageName) problems.push("listing has no primary image");
  return problems;
}

const candidates = JSON.parse(readFileSync(inFile, "utf-8"));
const verified = [];
const provenance = [];
const failures = [];

console.log(`Verifying ${candidates.length} candidate products...\n`);

for (const c of candidates) {
  try {
    const facts = await fetchTargetProduct(c.targetUrl);
    const conflicts = listingConflicts(c, facts);
    if (conflicts.length) throw new Error(conflicts.join("; "));

    const imageUrl = `https://target.scene7.com/is/image/Target/${facts.imageName}?wid=800&hei=800&qlt=80`;
    const v = await verifyImage(imageUrl);
    if (!v.ok) {
      throw new Error(`image failed (HTTP ${v.status}, ${v.ct}, ${v.bytes}B)`);
    }

    const { targetUrl, evidence, ...rest } = c;
    verified.push({
      ...rest,
      affiliateUrl: searchUrl(c.brand, c.productName),
      imageUrl,
      imageAlt: c.imageAlt || c.productName,
      // Provenance travels with the product rather than only into the sidecar.
      // These facts were transcribed from a Target listing, and a review that
      // records no evidence status inherits the "manufacturer-reported" default
      // — which would credit the manufacturer for a claim the retailer made.
      ...(evidence?.factorEvidence
        ? { factorEvidence: evidence.factorEvidence }
        : {}),
      ...(evidence?.certificationEvidence?.length
        ? { certificationEvidence: evidence.certificationEvidence }
        : {}),
    });
    provenance.push({
      productName: c.productName,
      targetUrl: canonicalTargetUrl(targetUrl),
      tcin: facts.tcin,
      listingTitle: facts.title,
      listingBrand: facts.brand,
      suggestedAge: facts.suggestedAge,
      material: facts.material,
      chokingWarnings: facts.choking,
      imageBytes: v.bytes,
      checkedAt: new Date().toISOString(),
      evidence: evidence ?? null,
    });
    console.log(`✓ ${c.productName}  (${v.bytes}B)`);
    console.log(`    listing: "${facts.title.slice(0, 90)}" · age ${facts.suggestedAge}`);
  } catch (e) {
    failures.push({ productName: c.productName, error: e.message });
    console.log(`✗ ${c.productName}  — ${e.message}`);
  }
  await sleep(800 + Math.random() * 700);
}

writeFileSync(outFile, JSON.stringify(verified, null, 2));
const provFile = outFile.replace(/\.json$/, "") + ".provenance.json";
writeFileSync(provFile, JSON.stringify(provenance, null, 2));
console.log(`\n${verified.length}/${candidates.length} verified → ${outFile}`);
console.log(`provenance → ${provFile}`);
if (failures.length) {
  console.log(`\nFailed (${failures.length}):`);
  failures.forEach((f) => console.log(`  - ${f.productName}: ${f.error}`));
}
