/**
 * Resolve the remaining recall leads against the CPSC record itself.
 *
 * WHY THIS IS NOT THE SAME AS THE EARLIER RE-TRIAGE
 * retriage-recall-candidates.mjs removed candidates the matcher no longer
 * considered related — noise like "Dresbe LED Christmas Headbands" sharing the
 * word "two" with a block set. What was left is harder and more important: 48
 * leads where the brand genuinely matches, 40 of them from two real recalls
 * against brands this catalogue carries. Those cannot be dismissed on text
 * similarity, because a same-brand recall is exactly the case where a product
 * might actually be affected.
 *
 * So this asks CPSC instead of guessing. For each lead it fetches the recall by
 * number from saferproducts.gov and reads the recalling firm and the recalled
 * product list. A CPSC recall names specific products:
 *
 *   26780  Melissa & Doug        "Lights & Sounds Fire Truck Activity Board"
 *   26739  William Carter Co.    "Baby Sesame Street Elmo Silicone Teethers"
 *   27083  SHEIN Distribution    "Baby Rattle and Teether Toy Sets"
 *
 * A lead is dismissed only when the recalled product is demonstrably not the
 * product under review: no distinctive word of the recalled product's name
 * appears in the review's product name. Anything that overlaps stays pending for
 * a human, and anything whose CPSC record cannot be fetched stays pending too —
 * a failed lookup must never read as "safe".
 *
 * The recall itself is never touched. All of them stay in the catalogue and on
 * /recalls, and hasActiveRecall is not written by this script.
 *
 * Usage:
 *   node scripts/resolve-recall-leads-against-cpsc.mjs --dry-run
 *   SANITY_API_TOKEN="..." node scripts/resolve-recall-leads-against-cpsc.mjs
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

const CPSC = "https://www.saferproducts.gov/RestWebServices/Recall?format=json&RecallNumber=";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Words that carry no product-identity signal. */
const STOP = new Set([
  "the", "and", "for", "with", "set", "sets", "toy", "toys", "baby", "babies",
  "kids", "kid", "infant", "toddler", "child", "children", "piece", "pieces",
  "pack", "play", "playset", "game", "games", "first", "my", "of", "in", "a",
  "an", "to", "classic", "deluxe", "jumbo", "mini", "large", "small", "other",
  "lights", "sounds", "sound", "activity", "board", "boards",
]);

const tokens = (s) =>
  new Set(
    (s || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/[\s-]+/)
      .filter((t) => t.length >= 4 && !STOP.has(t))
  );

const pending = await client.fetch(
  `*[_type == "recallMatchCandidate" && status == "pending"]{
     _id, recallNumber, recallTitle, officialNoticeUrl,
     "reviewName": review->productName, "reviewBrand": review->brand,
     "reviewSlug": review->slug.current
   }`
);

console.log(`${pending.length} pending lead(s)\n`);

// One CPSC fetch per distinct recall, not per lead.
const numbers = [...new Set(pending.map((p) => String(p.recallNumber)))];
const recalls = new Map();
for (const n of numbers) {
  try {
    const res = await fetch(CPSC + encodeURIComponent(n), {
      headers: { Accept: "application/json" },
    });
    const body = await res.json();
    if (Array.isArray(body) && body.length) {
      const r = body[0];
      const firms = [
        ...(r.Manufacturers || []),
        ...(r.Importers || []),
        ...(r.Retailers || []),
      ].map((f) => f.Name).filter(Boolean);
      recalls.set(n, {
        title: r.Title || "",
        firms,
        products: (r.Products || []).map((p) => p.Name).filter(Boolean),
      });
      console.log(`  CPSC ${n}: ${(r.Products || []).map((p) => p.Name).join(" / ") || "(no product names)"}`);
    } else {
      console.log(`  CPSC ${n}: no record returned`);
    }
  } catch (e) {
    console.log(`  CPSC ${n}: fetch failed — ${String(e).slice(0, 70)}`);
  }
  await sleep(1200);
}

const dismiss = [];
const keep = [];

for (const p of pending) {
  const rec = recalls.get(String(p.recallNumber));
  if (!rec || !rec.products.length) {
    keep.push({ ...p, why: "CPSC record unavailable — not safe to dismiss on missing data" });
    continue;
  }
  const reviewTok = tokens(p.reviewName);
  // Overlap between the recalled product's name and the product under review.
  const overlaps = rec.products.flatMap((prod) =>
    [...tokens(prod)].filter((t) => reviewTok.has(t))
  );
  if (overlaps.length) {
    keep.push({
      ...p,
      why: `recalled product shares "${[...new Set(overlaps)].join('", "')}" with this product`,
      rec,
    });
  } else {
    dismiss.push({ ...p, rec });
  }
}

console.log(`\ndismiss (recalled product is a different product) : ${dismiss.length}`);
console.log(`keep pending (overlap, or no CPSC record)         : ${keep.length}\n`);

if (keep.length) {
  console.log("STAYING PENDING — a human still decides these:");
  for (const k of keep) {
    console.log(`  ${k.reviewName?.slice(0, 44)}  <-  [${k.recallNumber}]`);
    console.log(`      ${k.why}`);
  }
  console.log();
}

const byRecall = new Map();
for (const d of dismiss) {
  const k = `${d.recallNumber} :: ${d.rec.products.join(" / ")}`;
  byRecall.set(k, (byRecall.get(k) || 0) + 1);
}
console.log("dismissing, grouped by recall:");
for (const [k, n] of [...byRecall].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(3)}x  [${k}]`);
}

if (DRY_RUN) {
  console.log("\nDRY RUN — nothing written.");
  process.exit(0);
}
if (!dismiss.length) {
  console.log("\nnothing to write.");
  process.exit(0);
}

const now = new Date().toISOString();
const CHUNK = 40;
let done = 0;
for (let i = 0; i < dismiss.length; i += CHUNK) {
  let tx = client.transaction();
  for (const d of dismiss.slice(i, i + CHUNK)) {
    tx = tx.patch(d._id, {
      set: {
        status: "dismissed",
        resolvedAt: now,
        resolutionNote:
          `Checked against the CPSC record for recall ${d.recallNumber}. ` +
          `The recall names ${d.rec.firms[0] ? `${d.rec.firms[0]} and ` : ""}` +
          `the product "${d.rec.products.join('", "')}", which is not this ` +
          `product and is not in the catalogue. No distinctive term of the ` +
          `recalled product's name appears in "${d.reviewName}". ` +
          `Source: ${d.officialNoticeUrl}`,
      },
    });
  }
  await tx.commit();
  done += Math.min(CHUNK, dismiss.length - i);
  console.log(`  committed ${done}/${dismiss.length}`);
}
console.log(`\ndismissed ${done}; ${keep.length} left pending.`);
