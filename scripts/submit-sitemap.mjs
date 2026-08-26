#!/usr/bin/env node
/**
 * Resubmit the sitemap to Google Search Console, and report what Google has
 * actually processed.
 *
 * WHY THIS EXISTS
 * Google last downloaded the sitemap on 2026-08-03, when it held 212 URLs. It now
 * holds 221. Nine URLs had therefore never been announced, and index coverage was
 * measured at 77 of 221. Resubmitting is the one part of "get the site indexed"
 * that has a supported write API; the rest needs the Search Console UI.
 *
 * WHAT THIS IS NOT
 * Not a substitute for Request Indexing. The Indexing API only accepts JobPosting
 * and BroadcastEvent, so ordinary pages cannot be pushed into the index
 * programmatically. Submitting a sitemap asks Google to re-read the list; it does
 * not schedule a crawl of any particular URL, and it will not rescue the hub pages
 * that come back "URL is unknown to Google".
 *
 * SCOPE
 * Needs `https://www.googleapis.com/auth/webmasters`. The read-only scope used by
 * pull-search-console.mjs returns 403 on submit. The service account must hold
 * Owner or Full permission on the property; Restricted is not enough.
 *
 * Usage:
 *   set -a; . ./.env.local; set +a
 *   node scripts/submit-sitemap.mjs              # show status, then submit
 *   node scripts/submit-sitemap.mjs --dry-run    # show status only
 */

import { readFileSync } from "node:fs";
import { createSign } from "node:crypto";

const SITE = process.env.GSC_SITE_URL || "sc-domain:safenesttoys.com";
const SITEMAP = process.env.GSC_SITEMAP_URL || "https://safenesttoys.com/sitemap.xml";
const KEY_PATH = process.env.GSC_SERVICE_ACCOUNT_KEY;
// Write scope. `webmasters.readonly` authenticates but 403s on PUT.
const SCOPE = "https://www.googleapis.com/auth/webmasters";
const DRY_RUN = process.argv.includes("--dry-run");

if (!KEY_PATH) {
  console.error("GSC_SERVICE_ACCOUNT_KEY is not set. See scripts/pull-search-console.mjs.");
  process.exit(2);
}

const key = JSON.parse(readFileSync(KEY_PATH, "utf8"));
if (!key.client_email || !key.private_key) {
  console.error(`${KEY_PATH} is not a service-account JSON key`);
  process.exit(2);
}

const b64url = (buf) =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: key.client_email,
      scope: SCOPE,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const assertion = `${header}.${claims}.${b64url(signer.sign(key.private_key))}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`token exchange failed: ${res.status} ${JSON.stringify(body).slice(0, 300)}`);
  }
  return body.access_token;
}

const base = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}`;
const feed = `${base}/sitemaps/${encodeURIComponent(SITEMAP)}`;

/** How many <loc> entries the live sitemap actually has right now. */
async function liveUrlCount() {
  const xml = await (await fetch(SITEMAP, { headers: { "Cache-Control": "no-cache" } })).text();
  return (xml.match(/<loc>/g) || []).length;
}

function describe(s) {
  if (!s) return "  not submitted";
  const counts = (s.contents || [])
    .map((c) => `${c.type}=${c.submitted}${c.indexed ? ` indexed=${c.indexed}` : ""}`)
    .join(" ");
  return [
    `  path         ${s.path}`,
    `  lastSubmitted ${s.lastSubmitted || "never"}`,
    `  lastDownloaded ${s.lastDownloaded || "never"}`,
    `  contents     ${counts || "(none reported yet)"}`,
    `  warnings     ${s.warnings ?? 0}    errors ${s.errors ?? 0}`,
    `  isPending    ${s.isPending ?? false}   isSitemapsIndex ${s.isSitemapsIndex ?? false}`,
  ].join("\n");
}

async function getStatus(token) {
  const res = await fetch(feed, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`sitemaps.get failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
  }
  return res.json();
}

const token = await accessToken();
console.log(`property ${SITE}`);
console.log(`sitemap  ${SITEMAP}`);
console.log(`live <loc> count: ${await liveUrlCount()}\n`);

console.log("BEFORE");
const before = await getStatus(token);
console.log(describe(before));

if (DRY_RUN) {
  console.log("\n--dry-run: nothing submitted");
  process.exit(0);
}

const put = await fetch(feed, { method: "PUT", headers: { Authorization: `Bearer ${token}` } });
if (!put.ok) {
  const text = (await put.text()).slice(0, 400);
  console.error(`\nsitemaps.submit failed: ${put.status}\n${text}`);
  if (put.status === 403) {
    console.error(
      "\n403 means the service account lacks write permission. In Search Console,\n" +
        "Settings > Users and permissions, set\n" +
        `  ${key.client_email}\n` +
        "to Owner or Full. Restricted cannot submit sitemaps."
    );
  }
  process.exit(1);
}
console.log(`\nsubmitted: HTTP ${put.status}`);

// Google records lastSubmitted immediately; lastDownloaded and the indexed counts
// lag by hours to days, so an unchanged lastDownloaded here is expected.
console.log("\nAFTER");
console.log(describe(await getStatus(token)));
console.log(
  "\nlastDownloaded and indexed counts update on Google's own schedule, usually\n" +
    "within a few days. Re-run with --dry-run to check progress, and use\n" +
    "scripts/audit-index-coverage.mjs for per-URL state."
);
