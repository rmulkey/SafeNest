#!/usr/bin/env node
/**
 * Submit every URL in the live sitemap to the IndexNow participants.
 *
 * The Sanity webhook already pushes individual pages as they are published;
 * this is for the cases the webhook cannot cover — the first submission for a
 * new site, or after a bulk change such as adding a whole family of pages.
 *
 * IMPORTANT: this does not submit anything to Google. Google is not an IndexNow
 * participant, its Indexing API accepts only JobPosting and BroadcastEvent
 * pages, and the sitemap ping endpoint was retired in 2024. For Google, the
 * `Sitemap:` line in robots.txt plus Search Console are the only channels.
 *
 * Usage:
 *   node scripts/submit-indexnow.mjs                       # live site
 *   node scripts/submit-indexnow.mjs https://example.com    # another origin
 *   DRY_RUN=1 node scripts/submit-indexnow.mjs              # show, don't send
 */

const BASE = (process.argv[2] || "https://safenesttoys.com").replace(/\/$/, "");
const ORIGIN = new URL(BASE).origin;
const HOST = new URL(BASE).host;
const KEY_PATH = "/indexnow-key.txt";
const ENDPOINT = "https://api.indexnow.org/indexnow";
const DRY_RUN = process.env.DRY_RUN === "1";

/** The key must be served from the site itself — that is how ownership is proven. */
async function fetchKey() {
  const res = await fetch(`${ORIGIN}${KEY_PATH}`);
  if (!res.ok) {
    throw new Error(`${KEY_PATH} returned HTTP ${res.status} — deploy it first`);
  }
  const key = (await res.text()).trim();
  if (!/^[a-zA-Z0-9-]{8,128}$/.test(key)) {
    throw new Error(`${KEY_PATH} does not contain a valid IndexNow key`);
  }
  return key;
}

async function fetchSitemapUrls() {
  const res = await fetch(`${ORIGIN}/sitemap.xml`);
  if (!res.ok) {
    throw new Error(`sitemap.xml returned HTTP ${res.status}`);
  }
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  // Off-host URLs would make the endpoint reject the entire batch.
  return [...new Set(locs.filter((u) => new URL(u).origin === ORIGIN))];
}

const key = await fetchKey();
const urlList = await fetchSitemapUrls();

console.log(`host        ${HOST}`);
console.log(`key         ${key.slice(0, 8)}… (served at ${KEY_PATH})`);
console.log(`urls        ${urlList.length}`);

if (DRY_RUN) {
  console.log("\nDRY_RUN=1 — nothing submitted. First 5 URLs:");
  for (const u of urlList.slice(0, 5)) console.log(`  ${u}`);
  process.exit(0);
}

const res = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host: HOST,
    key,
    keyLocation: `${ORIGIN}${KEY_PATH}`,
    urlList,
  }),
});

const body = await res.text();
console.log(`\nHTTP ${res.status}${body ? ` — ${body.slice(0, 300)}` : ""}`);

// 200 = accepted; 202 = accepted, key validation pending.
if (res.status === 200 || res.status === 202) {
  console.log(`ACCEPTED: ${urlList.length} URLs submitted to the IndexNow participants.`);
  console.log("Reminder: Google is not among them — use Search Console for Google.");
  process.exit(0);
}

let errorCode = "";
try {
  errorCode = JSON.parse(body)?.errorCode ?? "";
} catch {
  /* body is not JSON */
}

// On a freshly deployed key file the endpoint answers 403
// SiteVerificationNotCompleted: it has not fetched the key yet. That is a
// "retry shortly", not a misconfiguration.
if (res.status === 403 && errorCode === "SiteVerificationNotCompleted") {
  console.error(
    `PENDING: the endpoint has not yet fetched ${ORIGIN}${KEY_PATH}. ` +
      "Wait a few minutes and run this again — no configuration change is needed."
  );
  process.exit(1);
}

const reasons = {
  400: "Bad request — malformed key or payload",
  403: `Key rejected — check that ${KEY_PATH} serves the submitted key`,
  422: "URLs do not belong to the submitted host, or the key does not match",
  429: "Rate limited — too many submissions",
};
console.error(`FAILED: ${reasons[res.status] ?? `unexpected status ${res.status}`}`);
process.exit(1);
