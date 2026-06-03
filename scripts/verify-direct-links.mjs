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

const direct = JSON.parse(
  fs.readFileSync(new URL("./direct-links.json", import.meta.url), "utf8")
);

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
