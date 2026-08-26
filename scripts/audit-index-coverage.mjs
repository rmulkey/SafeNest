#!/usr/bin/env node
/**
 * Per-URL index coverage from the Search Console URL Inspection API.
 *
 * This answers the question the Performance report cannot: of the URLs in the
 * sitemap, how many are actually indexed, versus "Discovered – currently not
 * indexed" or "Crawled – currently not indexed". That distinction separates a
 * discovery problem from a quality problem, and it decides where effort goes.
 *
 * I previously said no API exposed this and pointed at the Search Console UI.
 * That was wrong — urlInspection/index:inspect returns it per URL, including
 * Google's chosen canonical, which is the only reliable way to confirm the
 * www/apex consolidation is actually happening rather than assumed.
 *
 * Quota: 2,000 inspections per property per day, 600 per minute. A 221-URL
 * sitemap is well inside both, but the concurrency below stays low deliberately
 * because a 429 here costs the whole run.
 *
 * Needs the service account to hold at least full/restricted access to the
 * property — verified working with siteRestrictedUser.
 *
 * Usage:
 *   set -a; . ./.env.local; set +a
 *   node scripts/audit-index-coverage.mjs
 *   LIMIT=25 node scripts/audit-index-coverage.mjs     # sample while iterating
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createSign } from "node:crypto";

const SITE = process.env.GSC_SITE_URL || "sc-domain:safenesttoys.com";
const KEY_PATH = process.env.GSC_SERVICE_ACCOUNT_KEY;
const OUT = "gsc";
const LIMIT = Number(process.env.LIMIT || 0);
/** Comma-separated exact paths, e.g. ONLY=/reviews,/blog. Takes precedence over LIMIT. */
const ONLY = (process.env.ONLY || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const CONCURRENCY = 4;
/** Pause between batches. 600 QPM is the ceiling; this stays far under it. */
const PAUSE_MS = 350;

if (!KEY_PATH) {
  console.error("GSC_SERVICE_ACCOUNT_KEY is not set — see gsc/README.md");
  process.exit(2);
}

const key = JSON.parse(readFileSync(KEY_PATH, "utf8"));
const b64 = (b) =>
  Buffer.from(b).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64(
    JSON.stringify({
      iss: key.client_email,
      // The read-only scope is not enough for URL Inspection.
      scope: "https://www.googleapis.com/auth/webmasters",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${b64(signer.sign(key.private_key))}`,
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`token exchange ${res.status}: ${JSON.stringify(body).slice(0, 200)}`);
  return body.access_token;
}

async function sitemapUrls() {
  const res = await fetch("https://safenesttoys.com/sitemap.xml");
  const xml = await res.text();
  const urls = [...new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()))];
  // ONLY takes exact paths, so the hub pages can be rechecked for ~7 inspections
  // instead of 221. LIMIT slices the head of the list, which never contains them.
  if (ONLY.length > 0) {
    const wanted = new Set(ONLY.map((p) => p.replace(/\/+$/, "") || "/"));
    const picked = urls.filter((u) => {
      const path = new URL(u).pathname.replace(/\/+$/, "") || "/";
      return wanted.has(path);
    });
    const missing = [...wanted].filter(
      (p) => !picked.some((u) => (new URL(u).pathname.replace(/\/+$/, "") || "/") === p)
    );
    if (missing.length > 0) {
      console.warn(`not in sitemap, skipped: ${missing.join(", ")}`);
    }
    return picked;
  }
  return LIMIT > 0 ? urls.slice(0, LIMIT) : urls;
}

async function inspect(token, url) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const res = await fetch("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ inspectionUrl: url, siteUrl: SITE, languageCode: "en-US" }),
    });
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }
    const body = await res.json();
    if (!res.ok) {
      return { url, error: `${res.status} ${JSON.stringify(body).slice(0, 120)}` };
    }
    const i = body.inspectionResult?.indexStatusResult ?? {};
    return {
      url,
      verdict: i.verdict ?? "",
      coverageState: i.coverageState ?? "",
      robotsTxtState: i.robotsTxtState ?? "",
      indexingState: i.indexingState ?? "",
      pageFetchState: i.pageFetchState ?? "",
      lastCrawlTime: i.lastCrawlTime ?? "",
      googleCanonical: i.googleCanonical ?? "",
      userCanonical: i.userCanonical ?? "",
      sitemapListed: (i.sitemap ?? []).length > 0,
      referringUrls: (i.referringUrls ?? []).length,
    };
  }
  return { url, error: "gave up after retries" };
}

const token = await accessToken();
const urls = await sitemapUrls();
mkdirSync(OUT, { recursive: true });

console.log(`inspecting ${urls.length} sitemap URLs against ${SITE}`);
console.log(`(quota is 2,000/day — this run uses ${urls.length})\n`);

const rows = [];
for (let i = 0; i < urls.length; i += CONCURRENCY) {
  const batch = urls.slice(i, i + CONCURRENCY);
  rows.push(...(await Promise.all(batch.map((u) => inspect(token, u)))));
  process.stdout.write(`\r  inspected ${Math.min(i + CONCURRENCY, urls.length)}/${urls.length}`);
  if (i + CONCURRENCY < urls.length) await new Promise((r) => setTimeout(r, PAUSE_MS));
}
process.stdout.write("\n\n");

const HEADER = [
  "url", "verdict", "coverage_state", "robots_txt_state", "indexing_state",
  "page_fetch_state", "last_crawl_time", "google_canonical", "user_canonical",
  "canonical_matches", "in_sitemap_per_google", "referring_urls_known", "error",
];
const esc = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
writeFileSync(
  `${OUT}/index-coverage.csv`,
  [
    "# Search Console urlInspection/index:inspect",
    `# site: ${SITE}`,
    `# fetched: ${new Date().toISOString()}`,
    `# urls: ${rows.length}`,
    HEADER.join(","),
    ...rows.map((r) =>
      [
        r.url, r.verdict, r.coverageState, r.robotsTxtState, r.indexingState,
        r.pageFetchState, r.lastCrawlTime, r.googleCanonical, r.userCanonical,
        r.googleCanonical && r.userCanonical
          ? r.googleCanonical === r.userCanonical ? "yes" : "NO"
          : "",
        r.sitemapListed ? "yes" : "no",
        r.referringUrls ?? "",
        r.error ?? "",
      ].map(esc).join(",")
    ),
  ].join("\n") + "\n"
);

// ─── Report ──────────────────────────────────────────────────────────────────
const tally = (fn) => {
  const m = new Map();
  for (const r of rows) {
    const k = fn(r) || "(none)";
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m].sort((a, z) => z[1] - a[1]);
};

console.log("COVERAGE STATE");
for (const [k, n] of tally((r) => (r.error ? "API error" : r.coverageState))) {
  console.log(`  ${String(n).padStart(4)}  ${k}`);
}
console.log("\nVERDICT");
for (const [k, n] of tally((r) => (r.error ? "API error" : r.verdict))) {
  console.log(`  ${String(n).padStart(4)}  ${k}`);
}
console.log("\nROBOTS / FETCH");
for (const [k, n] of tally((r) => `${r.robotsTxtState || "?"} / ${r.pageFetchState || "?"}`)) {
  console.log(`  ${String(n).padStart(4)}  ${k}`);
}

const mismatched = rows.filter(
  (r) => r.googleCanonical && r.userCanonical && r.googleCanonical !== r.userCanonical
);
console.log(`\nCANONICAL DISAGREEMENTS: ${mismatched.length}`);
for (const r of mismatched.slice(0, 12)) {
  console.log(`  ${r.url}`);
  console.log(`    we say:     ${r.userCanonical}`);
  console.log(`    Google says: ${r.googleCanonical}`);
}

const never = rows.filter((r) => !r.error && !r.lastCrawlTime);
console.log(`\nNEVER CRAWLED: ${never.length}`);
for (const r of never.slice(0, 12)) console.log(`  ${r.url}`);

const crawled = rows.filter((r) => r.lastCrawlTime).map((r) => r.lastCrawlTime).sort();
if (crawled.length) {
  console.log(`\nCRAWL RECENCY`);
  console.log(`  oldest: ${crawled[0]}`);
  console.log(`  newest: ${crawled.at(-1)}`);
}

const indexed = rows.filter((r) => /indexed/i.test(r.coverageState) && !/not indexed/i.test(r.coverageState)).length;
console.log(`\nwrote ${OUT}/index-coverage.csv`);
console.log(`indexed: ${indexed} of ${rows.length} sitemap URLs`);
