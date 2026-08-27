/**
 * Verify that each product's direct /dp/{ASIN} link still resolves to a LIVE
 * Amazon product page (data-integrity check — links must not 404 / die).
 *
 * For each ASIN we fetch the product page and record:
 *   - live      : productTitle present, not "currently unavailable"
 *   - unavailable: page loads but item is currently unavailable
 *   - dead      : not-found / dogs-of-amazon / no product title
 *   - blocked   : Amazon served a robot check (inconclusive — retry later)
 *
 * Read-only against Amazon. Writes scripts/direct-link-verification.json.
 */
import fs from "node:fs";

/*
 * Reads the direct links from Sanity, which is what customers actually click.
 *
 * This used to read a checked-in snapshot, scripts/direct-links.json, which made
 * the check meaningless as soon as the catalogue changed. After 30 dead
 * /dp/{ASIN} links were rewritten to search URLs on 2026-08-26, Sanity held 14
 * direct links and this script still reported the original 44 — including the 30
 * it had just helped fix. A verifier pointed at a frozen copy of the thing it is
 * verifying cannot fail usefully.
 */
const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const TOKEN = process.env.SANITY_API_TOKEN || process.env.SANITY_API_WRITE_TOKEN;

if (!PROJECT_ID) {
  console.error(
    "NEXT_PUBLIC_SANITY_PROJECT_ID is not set.\n" +
      "Run: set -a; . ./.env.local; set +a"
  );
  process.exit(2);
}

async function groqFetch(query) {
  const url =
    `https://${PROJECT_ID}.api.sanity.io/v2024-01-01/data/query/${DATASET}` +
    `?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {},
  });
  if (!res.ok) {
    throw new Error(`Sanity query failed: HTTP ${res.status}`);
  }
  return (await res.json()).result;
}

const rows = await groqFetch(
  `*[_type=="toyReview" && count(affiliateLinks[url match "*/dp/*"])>0]{
     productName, "slug": slug.current,
     "urls": affiliateLinks[url match "*/dp/*"].url
   } | order(slug asc)`
);

/** One entry per direct link, shaped as the rest of this script expects. */
const direct = rows.flatMap((r) =>
  (r.urls ?? [])
    .map((u) => {
      const m = String(u).match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
      return m ? { name: r.productName, slug: r.slug, detail: m[1] } : null;
    })
    .filter(Boolean)
);

console.log(`${direct.length} direct /dp/ link(s) in Sanity to verify\n`);

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function extract(html) {
  const titleM = html.match(/id="productTitle"[^>]*>([\s\S]*?)<\/span>/);
  const productTitle = titleM ? titleM[1].replace(/\s+/g, " ").trim() : null;
  const blocked = /automated access|api-services-support@amazon|type the characters you see/i.test(
    html
  );
  const notFound = /Looking for something\?|we couldn.?t find that page|Page Not Found|dogs of amazon/i.test(
    html
  );
  const unavailable = /currently unavailable|no longer available for purchase/i.test(
    html
  );
  return { productTitle, blocked, notFound, unavailable };
}

const results = [];
for (const { name, slug, detail: asin } of direct) {
  const url = `https://www.amazon.com/dp/${asin}`;
  let status = "error";
  let httpCode = 0;
  let productTitle = null;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
      redirect: "follow",
    });
    httpCode = res.status;
    const html = await res.text();
    const info = extract(html);
    productTitle = info.productTitle;
    if (info.blocked) status = "blocked";
    else if (info.notFound) status = "dead";
    else if (info.unavailable) status = "unavailable";
    else if (info.productTitle) status = "live";
    else status = "no_title";
  } catch (e) {
    status = "error";
    productTitle = String(e.message || e);
  }
  results.push({ name, slug, asin, status, httpCode, productTitle });
  console.log(
    `${status.toUpperCase().padEnd(11)} ${asin}  ${name}` +
      (productTitle && status === "live" ? `\n             → ${productTitle.slice(0, 90)}` : "")
  );
  await sleep(1500 + Math.random() * 1500);
}

const counts = results.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {});
console.log("\n" + "=".repeat(60));
console.log("SUMMARY:", JSON.stringify(counts));
fs.writeFileSync(
  new URL("./direct-link-verification.json", import.meta.url),
  JSON.stringify(results, null, 2)
);
