/**
 * Build a verified queue batch from a candidate list of REAL products.
 *
 * DATA INTEGRITY (mandatory):
 *  - Each candidate names a real, currently-sold toy and points at its real
 *    Target.com product page (targetUrl).
 *  - We fetch that page, read Target's own `primary_image.image_name` (the
 *    canonical product photo — never a guess), build the scene7 image URL, and
 *    verify it returns real image bytes (HTTP 200, content-type image/*, >2KB).
 *  - Only candidates whose image verifies are written to the output queue file.
 *    Anything that fails is reported and dropped — never fabricated.
 *  - Affiliate links are Amazon SEARCH urls (no tag; BuyButton appends it), so
 *    there are no invented /dp/{ASIN} links.
 *
 * Scores/materials/pros/cons/assessment are authored editorially (allowed for a
 * review site) in the candidate file and copied through unchanged.
 *
 * Usage:
 *   node scripts/build-verified-queue.mjs scripts/new-products.json scripts/verified-queue.json
 */
import { readFileSync, writeFileSync } from "node:fs";

const [, , inFile, outFile] = process.argv;
if (!inFile || !outFile) {
  console.error(
    "Usage: node scripts/build-verified-queue.mjs <candidates.json> <out.json>"
  );
  process.exit(1);
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
const MIN_IMAGE_BYTES = 2000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Pull Target's canonical primary image id from a product page. */
async function getPrimaryImageId(targetUrl) {
  const res = await fetch(targetUrl, {
    headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`target page HTTP ${res.status}`);
  const html = await res.text();
  const m = html.match(/"primary_image":\{"image_name":"(GUEST_[a-f0-9-]+)"/);
  if (!m) throw new Error("primary_image not found on page");
  return m[1];
}

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

const candidates = JSON.parse(readFileSync(inFile, "utf-8"));
const verified = [];
const failures = [];

console.log(`Verifying ${candidates.length} candidate products...\n`);

for (const c of candidates) {
  try {
    const gid = await getPrimaryImageId(c.targetUrl);
    const imageUrl = `https://target.scene7.com/is/image/Target/${gid}?wid=800&hei=800&qlt=80`;
    const v = await verifyImage(imageUrl);
    if (!v.ok) {
      throw new Error(`image failed (HTTP ${v.status}, ${v.ct}, ${v.bytes}B)`);
    }
    const { targetUrl, ...rest } = c;
    verified.push({
      ...rest,
      affiliateUrl: searchUrl(c.brand, c.productName),
      imageUrl,
      imageAlt: c.imageAlt || c.productName,
    });
    console.log(`✓ ${c.productName}  (${v.bytes}B)`);
  } catch (e) {
    failures.push({ productName: c.productName, error: e.message });
    console.log(`✗ ${c.productName}  — ${e.message}`);
  }
  await sleep(800 + Math.random() * 700);
}

writeFileSync(outFile, JSON.stringify(verified, null, 2));
console.log(
  `\n${verified.length}/${candidates.length} verified → ${outFile}`
);
if (failures.length) {
  console.log(`\nFailed (${failures.length}):`);
  failures.forEach((f) => console.log(`  - ${f.productName}: ${f.error}`));
}
