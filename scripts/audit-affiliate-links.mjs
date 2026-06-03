/**
 * Audit affiliate link types across all toyReview products.
 *
 * Classifies each product's Amazon link as:
 *   - direct  : /dp/{ASIN} or /gp/product/{ASIN}  (best for conversion)
 *   - search  : /s?k=...  (valid fallback, lower conversion)
 *   - none    : no affiliate link
 *   - other   : an Amazon URL that is neither product nor search
 *
 * Read-only: fetches from the Sanity public dataset, writes a summary to stdout
 * and the list of search-URL fallbacks to scripts/search-fallbacks.json.
 */
import fs from "node:fs";

const PROJECT_ID = "ofvgjgsi";
const DATASET = "production";

const query = `*[_type=="toyReview"]{productName,"slug":slug.current,"links":affiliateLinks[]{partnerId,url,tag}}|order(productName asc)`;
const url = `https://${PROJECT_ID}.api.sanity.io/v2023-05-03/data/query/${DATASET}?query=${encodeURIComponent(query)}`;

const DP = /\/dp\/([A-Za-z0-9]{8,})/i;
const GP = /\/gp\/product\/([A-Za-z0-9]{8,})/i;

function classify(links) {
  if (!links || links.length === 0) return { kind: "none", detail: null };
  for (const l of links) {
    const u = (l && l.url) || "";
    let p;
    try {
      p = new URL(u);
    } catch {
      continue;
    }
    const m = DP.exec(p.pathname) || GP.exec(p.pathname);
    if (m) return { kind: "direct", detail: m[1] };
    if (p.pathname === "/s" && p.searchParams.has("k")) {
      return { kind: "search", detail: p.searchParams.get("k") };
    }
  }
  return { kind: "other", detail: links[0].url || "" };
}

const res = await fetch(url);
const { result } = await res.json();

const buckets = { direct: [], search: [], none: [], other: [] };
for (const prod of result) {
  const { kind, detail } = classify(prod.links);
  buckets[kind].push({ name: prod.productName, slug: prod.slug, detail });
}

const line = "=".repeat(70);
console.log(line);
console.log(`TOTAL PRODUCTS: ${result.length}`);
console.log(`  Direct /dp/ links (ASIN): ${buckets.direct.length}`);
console.log(`  Search-URL fallback:      ${buckets.search.length}`);
console.log(`  No affiliate link:        ${buckets.none.length}`);
console.log(`  Other/unexpected:         ${buckets.other.length}`);
console.log(line);

if (buckets.search.length) {
  console.log("\n--- SEARCH-URL FALLBACKS (candidates to upgrade to /dp/) ---");
  for (const r of buckets.search) console.log(`  • ${r.name}\n      k = ${r.detail}`);
}
if (buckets.none.length) {
  console.log("\n--- NO AFFILIATE LINK ---");
  for (const r of buckets.none) console.log(`  • ${r.name}  (${r.slug})`);
}
if (buckets.other.length) {
  console.log("\n--- OTHER/UNEXPECTED ---");
  for (const r of buckets.other) console.log(`  • ${r.name}  -> ${r.detail}`);
}

fs.writeFileSync(
  new URL("./search-fallbacks.json", import.meta.url),
  JSON.stringify(buckets.search, null, 2)
);
fs.writeFileSync(
  new URL("./direct-links.json", import.meta.url),
  JSON.stringify(buckets.direct, null, 2)
);
