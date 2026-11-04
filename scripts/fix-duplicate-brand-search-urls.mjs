/**
 * Repair Amazon search URLs that name the brand twice.
 *
 * Two brand fields carry a parenthesised parent company — "Oball (Kids II)" and
 * "B. toys (Battat)" — while the product name carries only the consumer-facing
 * brand ("Oball Classic Ball"). The generator tested whether the name contained
 * the whole brand string, found it did not, and prepended the lot, so the stored
 * link searched Amazon for "Oball (Kids II) Oball Classic Ball".
 *
 * The link still resolves, which is why no audit caught it: audit-affiliate-links
 * checks for hard 404s and these are valid searches. They are just worse
 * searches, and on the product leading the sensory guide.
 *
 * The generator is fixed in build-verified-queue.mjs and seed-product-queue.mjs;
 * this repairs the two records already written. Only search URLs are touched —
 * a /dp/ link is left exactly as it is — and the link object's tag, partnerId
 * and key are preserved so attribution cannot be lost.
 *
 * Usage:
 *   node scripts/fix-duplicate-brand-search-urls.mjs --dry-run
 *   SANITY_API_TOKEN="..." node scripts/fix-duplicate-brand-search-urls.mjs
 */
import { createClient } from "@sanity/client";

const DRY_RUN = process.argv.includes("--dry-run");
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

/** Same rule as build-verified-queue.mjs. */
function searchQuery(brand, name) {
  const bare = brand.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
  const q = name.toLowerCase().includes(bare.toLowerCase()) ? name : `${bare} ${name}`;
  return q.replace(/\s+/g, " ").trim();
}

const rows = await client.fetch(
  `*[_type == "toyReview" && defined(affiliateLinks)]{
     _id, "slug": slug.current, productName, brand, affiliateLinks }`
);

const fixes = [];
for (const r of rows) {
  const links = r.affiliateLinks || [];
  let changed = false;
  const next = links.map((l) => {
    if (!l.url || !l.url.includes("/s?k=")) return l;
    const current = decodeURIComponent(new URL(l.url).searchParams.get("k") || "");
    const wanted = searchQuery(r.brand, r.productName);
    if (current === wanted) return l;
    changed = true;
    return { ...l, url: `https://www.amazon.com/s?k=${encodeURIComponent(wanted)}` };
  });
  if (changed) {
    fixes.push({ ...r, next, before: links, });
  }
}

console.log(`${rows.length} products with affiliate links; ${fixes.length} need repair.\n`);
for (const f of fixes) {
  console.log(`  ${f.slug}`);
  console.log(`    brand=${f.brand!==undefined?JSON.stringify(f.brand):"?"} name=${JSON.stringify(f.productName)}`);
  f.before.forEach((l, i) => {
    if (l.url !== f.next[i].url) {
      console.log(`    before k = ${decodeURIComponent(new URL(l.url).searchParams.get("k"))}`);
      console.log(`    after  k = ${decodeURIComponent(new URL(f.next[i].url).searchParams.get("k"))}`);
      console.log(`    tag preserved: ${l.tag === f.next[i].tag ? "yes" : "NO"}`);
    }
  });
}

if (!fixes.length) {
  console.log("nothing to do.");
  process.exit(0);
}
if (DRY_RUN) {
  console.log("\nDRY RUN — nothing written.");
  process.exit(0);
}

let tx = client.transaction();
for (const f of fixes) tx = tx.patch(f._id, { set: { affiliateLinks: f.next } });
await tx.commit();
console.log(`\nrepaired ${fixes.length} product(s).`);
