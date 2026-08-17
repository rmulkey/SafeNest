#!/usr/bin/env node
/**
 * Verify candidate ASINs and upgrade search links to direct product links.
 *
 * WHY THIS EXISTS
 * 68% of the catalog's affiliate links are Amazon SEARCH urls. That is a
 * deliberate consequence of the project's data-integrity rule against inventing
 * ASINs — a search URL is always valid, so it was the safe fallback. It is also a
 * worse funnel: the reader lands on a results page and has to choose, instead of
 * landing on the product being reviewed.
 *
 * The correct fix is verified ASINs, not guessed ones. This script takes a
 * mapping of review slug -> ASIN that a human has looked up, and:
 *
 *   1. checks the ASIN is well formed (10 chars, Amazon's format)
 *   2. fetches https://www.amazon.com/dp/{ASIN} and confirms it resolves to a
 *      real product page, not a 404 and not a bot wall
 *   3. compares the page title against the stored product name, so a
 *      transcription slip pointing at the wrong product is caught rather than
 *      published
 *   4. only then writes the /dp/ link, preserving the affiliate tag
 *
 * Anything that fails any step is reported and left on its search URL. Amazon
 * bot-blocks aggressively, so an inconclusive response is never treated as
 * confirmation.
 *
 * Usage:
 *   node scripts/verify-asins.mjs scripts/asin-candidates.json --dry-run
 *   node scripts/verify-asins.mjs scripts/asin-candidates.json
 *
 * Candidate file shape:
 *   [{ "slug": "green-toys-stacking-cups", "asin": "B00BWQMFHE" }]
 */
import { readFileSync } from "node:fs";

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "ofvgjgsi";
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const TOKEN = process.env.SANITY_API_TOKEN;
const DRY_RUN = process.argv.includes("--dry-run");
const inFile = process.argv[2];

if (!inFile || !TOKEN) {
  console.error("Usage: SANITY_API_TOKEN=... node scripts/verify-asins.mjs <candidates.json> [--dry-run]");
  process.exit(1);
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
const ASIN_RE = /^[A-Z0-9]{10}$/;
const NOT_FOUND = [
  "sorry! we couldn't find that page",
  "the web address you entered is not a functioning page",
  "looking for something?",
];
const BOT_WALL = [
  "api-services-support@amazon.com",
  "enter the characters you see below",
  "not a robot",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function q(groq, params = {}) {
  const url = new URL(`https://${PROJECT_ID}.api.sanity.io/v2024-01-01/data/query/${DATASET}`);
  url.searchParams.set("query", groq);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(`$${k}`, JSON.stringify(v));
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const json = await res.json();
  if (json.error) throw new Error(JSON.stringify(json.error));
  return json.result;
}

async function mutate(mutations) {
  const res = await fetch(`https://${PROJECT_ID}.api.sanity.io/v2024-01-01/data/mutate/${DATASET}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ mutations }),
  });
  const json = await res.json();
  if (json.error) throw new Error(JSON.stringify(json.error));
}

/** Significant words from a product name, for loose title matching. */
function tokens(name) {
  const STOP = new Set(["the","and","with","for","a","an","of","in","to","set","toy","toys","piece","pc","pcs"]);
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

async function probeAsin(asin, expectedName) {
  const url = `https://www.amazon.com/dp/${asin}`;
  let res;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
  } catch (e) {
    return { verdict: "inconclusive", note: e.name };
  }

  if (res.status === 404 || res.status === 410) return { verdict: "dead", note: `HTTP ${res.status}` };
  if ([403, 429, 503].includes(res.status)) return { verdict: "inconclusive", note: `HTTP ${res.status} bot wall` };

  const html = (await res.text()).toLowerCase();
  if (BOT_WALL.some((m) => html.includes(m))) return { verdict: "inconclusive", note: "bot wall" };
  if (NOT_FOUND.some((m) => html.includes(m))) return { verdict: "dead", note: "soft 404" };

  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] ?? "";
  const want = tokens(expectedName);
  const hit = want.filter((w) => title.includes(w));
  const ratio = want.length ? hit.length / want.length : 0;

  // Require a majority of significant words to appear, so a valid-but-wrong ASIN
  // is caught rather than silently published.
  if (ratio < 0.5) {
    return {
      verdict: "mismatch",
      note: `title matched ${hit.length}/${want.length} words: "${title.slice(0, 90)}"`,
    };
  }
  return { verdict: "ok", note: `title matched ${hit.length}/${want.length} words` };
}

const candidates = JSON.parse(readFileSync(inFile, "utf-8"));
console.log(`Verifying ${candidates.length} candidate ASIN(s)…\n`);

const mutations = [];
const summary = { ok: 0, dead: 0, mismatch: 0, inconclusive: 0, malformed: 0, notfound: 0, alreadyDirect: 0 };

for (const c of candidates) {
  const asin = String(c.asin || "").toUpperCase().trim();
  if (!ASIN_RE.test(asin)) {
    console.log(`  MALFORMED  ${c.slug} — "${c.asin}" is not a 10-character ASIN`);
    summary.malformed++;
    continue;
  }

  const doc = await q(
    `*[_type=="toyReview" && slug.current==$slug][0]{_id, productName, affiliateLinks}`,
    { slug: c.slug }
  );
  if (!doc) {
    console.log(`  NO REVIEW  ${c.slug}`);
    summary.notfound++;
    continue;
  }

  const links = doc.affiliateLinks ?? [];
  const idx = links.findIndex((l) => l?.partnerId === "amazon" || /amazon\./.test(l?.url ?? ""));
  if (idx === -1) {
    console.log(`  NO LINK    ${c.slug}`);
    summary.notfound++;
    continue;
  }
  if (/\/dp\/[A-Z0-9]{10}/i.test(links[idx].url)) {
    console.log(`  SKIP       ${c.slug} — already a direct product link`);
    summary.alreadyDirect++;
    continue;
  }

  const probe = await probeAsin(asin, doc.productName);
  const label = { ok: "OK       ", dead: "DEAD     ", mismatch: "MISMATCH ", inconclusive: "UNKNOWN  " }[probe.verdict];
  console.log(`  ${label}  ${c.slug}  ${asin}  ${probe.note}`);
  summary[probe.verdict === "ok" ? "ok" : probe.verdict]++;

  if (probe.verdict === "ok") {
    const next = [...links];
    // Preserve the existing tag; BuyButton appends it at render time.
    next[idx] = { ...links[idx], url: `https://www.amazon.com/dp/${asin}` };
    mutations.push({ patch: { id: doc._id, set: { affiliateLinks: next } } });
  }

  await sleep(1500 + Math.random() * 1200);
}

console.log(
  `\nverified ${summary.ok} · dead ${summary.dead} · mismatch ${summary.mismatch} · inconclusive ${summary.inconclusive} · malformed ${summary.malformed} · skipped ${summary.alreadyDirect} · missing ${summary.notfound}`
);
console.log(`${mutations.length} link(s) to upgrade.${DRY_RUN ? " (dry run)" : ""}`);

if (DRY_RUN || mutations.length === 0) {
  if (DRY_RUN) console.log("Dry run: nothing written.");
  process.exit(0);
}
await mutate(mutations);
console.log("Applied. Anything not verified stays on its search URL.");
