#!/usr/bin/env node
/**
 * Build the ASIN lookup worksheet that verify-asins.mjs consumes.
 *
 * WHY THIS EXISTS
 * Most of the catalog points at Amazon SEARCH urls rather than product pages.
 * That is the safe fallback required by the project's data-integrity rule: a
 * search URL always resolves, an invented /dp/{ASIN} does not. Upgrading to a
 * direct product link is a funnel win, but the ASIN has to be looked up by a
 * human — it cannot be derived, guessed, or inferred from the product name.
 *
 * This script does the mechanical half of that job: it finds every review still
 * on a search URL, and writes a worksheet with the product name, brand, and a
 * clickable search URL, leaving only the "asin" field blank. Fill in the ASINs
 * you can confirm, delete the rows you cannot, then run:
 *
 *   node scripts/verify-asins.mjs scripts/asin-candidates.json --dry-run
 *
 * verify-asins.mjs independently re-checks every ASIN against the live product
 * page before it writes anything, so a transcription slip is caught rather than
 * published.
 *
 * Usage:
 *   node scripts/make-asin-worksheet.mjs [outfile]
 */
import { writeFileSync } from "node:fs";

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "ofvgjgsi";
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const TOKEN = process.env.SANITY_API_TOKEN;
const OUT = process.argv[2] || "scripts/asin-candidates.json";

if (!TOKEN) {
  console.error("Usage: SANITY_API_TOKEN=... node scripts/make-asin-worksheet.mjs [outfile]");
  process.exit(1);
}

async function q(groq) {
  const url = new URL(`https://${PROJECT_ID}.api.sanity.io/v2024-01-01/data/query/${DATASET}`);
  url.searchParams.set("query", groq);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const json = await res.json();
  if (json.error) throw new Error(JSON.stringify(json.error));
  return json.result;
}

const reviews = await q(`*[_type=="toyReview" && defined(slug.current)]{
  "slug": slug.current,
  productName,
  brand,
  "safetyScore": coalesce(safetyScore, overallScore, assessment.overallScore),
  affiliateLinks
} | order(safetyScore desc)`);

const rows = [];
const stats = { total: 0, direct: 0, search: 0, other: 0, noLink: 0 };

for (const r of reviews) {
  stats.total++;
  const links = r.affiliateLinks ?? [];
  const link = links.find((l) => l?.partnerId === "amazon" || /amazon\./.test(l?.url ?? ""));
  if (!link) {
    stats.noLink++;
    continue;
  }
  if (/\/dp\/[A-Z0-9]{10}/i.test(link.url)) {
    stats.direct++;
    continue;
  }
  if (!/\/s\?k=/.test(link.url)) {
    stats.other++;
    continue;
  }
  stats.search++;
  rows.push({
    slug: r.slug,
    asin: "",
    _productName: r.productName ?? "",
    _brand: r.brand ?? "",
    _safetyScore: r.safetyScore ?? null,
    _lookUpHere: link.url,
  });
}

writeFileSync(OUT, JSON.stringify(rows, null, 2) + "\n");

console.log(`reviews            ${stats.total}`);
console.log(`  direct /dp/ link ${stats.direct}`);
console.log(`  search URL       ${stats.search}   <- needs an ASIN`);
console.log(`  other link shape ${stats.other}`);
console.log(`  no amazon link   ${stats.noLink}`);
console.log(`\nwrote ${rows.length} row(s) to ${OUT}, sorted by safety score (highest first).`);
console.log(`Fill in "asin" for the ones you can confirm; delete the rest. Extra _fields are ignored.`);
