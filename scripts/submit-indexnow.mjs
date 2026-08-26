#!/usr/bin/env node
/**
 * One-off backfill of the whole sitemap to the IndexNow participants.
 *
 * WHY THIS EXISTS
 * submitToIndexNow is already wired into the Sanity webhook and the publish path,
 * so anything that *changes* gets pushed. Nothing ever submitted the back
 * catalogue, so the 221 URLs that existed before those hooks were added were
 * never announced. This closes that gap.
 *
 * WHAT THIS DOES NOT DO
 * Google is not an IndexNow participant, so this submits nothing to Google
 * Search and will not move Google's index coverage. Participants are Bing,
 * Yandex, Seznam, Naver and IndexNow's other members. That is still worth having
 * — Bing's index feeds DuckDuckGo and several assistant search products — but if
 * the goal is Google specifically, this is not the lever. Google needs Request
 * Indexing in the Search Console UI, which has no API.
 *
 * Usage:
 *   set -a; . ./.env.local; set +a
 *   node scripts/submit-indexnow.mjs --dry-run
 *   node scripts/submit-indexnow.mjs
 */

import { execFileSync } from "node:child_process";

const DRY_RUN = process.argv.includes("--dry-run");
const SITEMAP = process.env.SITEMAP_URL || "https://safenesttoys.com/sitemap.xml";

const res = await fetch(SITEMAP, { headers: { "Cache-Control": "no-cache" } });
if (!res.ok) {
  console.error(`could not fetch ${SITEMAP}: HTTP ${res.status}`);
  process.exit(1);
}
const xml = await res.text();
const urls = [...new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()))];
console.log(`${SITEMAP}: ${urls.length} URLs`);

// Verify the key file resolves before submitting. A 404 here means the endpoint
// answers 403 and the whole batch is silently wasted.
const keyPath = "/indexnow-key.txt";
const origin = new URL(urls[0]).origin;
const keyRes = await fetch(`${origin}${keyPath}`);
const servedKey = (await keyRes.text()).trim();
console.log(`${keyPath}: HTTP ${keyRes.status}, serves ${servedKey || "(empty)"}`);
if (!keyRes.ok || !servedKey) {
  console.error("key file is not serving; IndexNow would reject the batch with 403");
  process.exit(1);
}

if (DRY_RUN) {
  console.log("\n--dry-run: nothing submitted");
  console.log(urls.slice(0, 10).map((u) => `  ${u}`).join("\n"));
  console.log(`  ... and ${Math.max(0, urls.length - 10)} more`);
  process.exit(0);
}

// submitToIndexNow lives in TypeScript under src/, so run it through tsx rather
// than duplicating the protocol handling (host/key/keyLocation, the off-host
// filter, and the 200-vs-202 distinction) in this script.
const inline = `
import { submitToIndexNow } from "./src/lib/seo/indexnow.ts";
const urls = ${JSON.stringify(urls)};
const r = await submitToIndexNow(urls, { baseUrl: ${JSON.stringify(origin)} });
console.log(JSON.stringify(r, null, 2));
process.exit(r.outcome === "submitted" ? 0 : 1);
`;
const tmp = "./.indexnow-run.tmp.mts";
const { writeFileSync, rmSync } = await import("node:fs");
writeFileSync(tmp, inline);
try {
  execFileSync("npx", ["tsx", tmp], { stdio: "inherit" });
} finally {
  rmSync(tmp, { force: true });
}
