#!/usr/bin/env node
/**
 * Rank the never-crawled URLs for manual "Request Indexing" in Search Console.
 *
 * WHY RANKING IS THE WHOLE PROBLEM
 * 143 of 221 URLs have never been crawled, and Request Indexing allows roughly
 * 10-12 submissions per property per day. There is no API for it: Google's
 * Indexing API accepts only JobPosting and BroadcastEvent, and the sitemap ping
 * endpoint was retired in 2024. So the quota is the binding constraint, and
 * spending it well matters more than spending it fast.
 *
 * HOW THE ORDER IS CHOSEN
 * Discovery leverage first. Getting Googlebot to fetch a page that links to 90
 * other uncrawled URLs is worth far more than fetching a leaf page, because the
 * crawl of that one page can surface the rest without spending quota on each. So
 * the score is the count of *uncrawled* sitemap URLs a page links to, with search
 * demand as the tie-break.
 *
 * Reads gsc/index-coverage.csv, so run scripts/audit-index-coverage.mjs first.
 *
 * Usage:
 *   node scripts/rank-indexing-requests.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";

const COVERAGE = "gsc/index-coverage.csv";
const OUT = "gsc/indexing-request-queue.csv";
const ORIGIN = "https://safenesttoys.com";

/**
 * Minimal CSV parse: handles quoted fields containing commas.
 *
 * audit-index-coverage.mjs prefixes the file with `#` provenance lines (site,
 * fetch time, URL count), so those are skipped before the header is read.
 */
function parseCsv(raw) {
  const text = raw
    .split("\n")
    .filter((l) => !l.startsWith("#"))
    .join("\n");
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift().map((h) => h.trim());
  return rows.filter((r) => r.length === header.length)
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

const rows = parseCsv(readFileSync(COVERAGE, "utf8"));
const col = (r, ...names) => names.map((n) => r[n]).find((v) => v !== undefined) ?? "";

const uncrawled = rows.filter((r) => {
  const last = col(r, "lastCrawlTime", "last_crawl_time", "lastCrawl");
  return !last || last === "-" || last === "";
});
const uncrawledSet = new Set(uncrawled.map((r) => col(r, "url").replace(/\/$/, "")));
console.log(`coverage rows: ${rows.length}   never crawled: ${uncrawled.length}`);

/** The set of uncrawled sitemap URLs a page links to. */
async function leverage(url) {
  let html;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return { targets: new Set(), error: `HTTP ${res.status}` };
    html = await res.text();
  } catch (e) {
    return { targets: new Set(), error: e.message };
  }
  const hrefs = new Set();
  for (const m of html.matchAll(/href="(\/[^"#?]*)"/g)) {
    hrefs.add(`${ORIGIN}${m[1]}`.replace(/\/$/, ""));
  }
  const self = url.replace(/\/$/, "");
  const targets = new Set(
    [...hrefs].filter((h) => uncrawledSet.has(h) && h !== self)
  );
  return { targets, total: hrefs.size };
}

const scored = [];
let done = 0;
const queue = [...uncrawled];
async function worker() {
  while (queue.length) {
    const r = queue.shift();
    const url = col(r, "url");
    const lev = await leverage(url);
    scored.push({
      url,
      path: url.replace(ORIGIN, "") || "/",
      coverage: col(r, "coverageState", "coverage_state", "coverage"),
      targets: lev.targets,
      links: lev.total ?? 0,
      error: lev.error ?? "",
    });
    done += 1;
    if (done % 25 === 0) process.stdout.write(`  scored ${done}/${uncrawled.length}\r`);
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
console.log(`  scored ${done}/${uncrawled.length}`);

/**
 * Greedy set cover.
 *
 * Ranking by raw link count double-counts: the top pages mostly link to the same
 * review URLs, so summing their scores overstated the reach badly (622 "unlocks"
 * against only 143 uncrawled URLs in existence). Each step here picks the page
 * that reaches the most URLs *not already reached* by something above it, so the
 * number beside each row is its marginal contribution and the column sums
 * honestly. Shorter paths win ties, which favours hubs over deep programmatic
 * pages of equal reach.
 */
const covered = new Set();
const ordered = [];
const remaining = [...scored];
while (remaining.length > 0) {
  let bestIdx = 0;
  let bestGain = -1;
  for (let i = 0; i < remaining.length; i += 1) {
    let gain = 0;
    for (const t of remaining[i].targets) if (!covered.has(t)) gain += 1;
    if (
      gain > bestGain ||
      (gain === bestGain && remaining[i].path.length < remaining[bestIdx].path.length)
    ) {
      bestGain = gain;
      bestIdx = i;
    }
  }
  const [pick] = remaining.splice(bestIdx, 1);
  pick.unlocks = bestGain;
  for (const t of pick.targets) covered.add(t);
  ordered.push(pick);
  if (bestGain === 0 && remaining.length > 0) {
    // Nothing left reaches anything new; keep the rest in a stable order.
    remaining.sort((a, b) => a.path.length - b.path.length);
    for (const r of remaining) { r.unlocks = 0; ordered.push(r); }
    break;
  }
}
scored.length = 0;
scored.push(...ordered);

writeFileSync(
  OUT,
  ["priority,path,unlocks_uncrawled,total_internal_links,coverage_state,url"]
    .concat(scored.map((s, i) =>
      [i + 1, s.path, s.unlocks, s.links, `"${s.coverage}"`, s.url].join(",")))
    .join("\n") + "\n"
);

console.log(`\nTOP 12 — one day's Request Indexing quota\n`);
// console.log's %s/%d carry no width specifiers, so columns are padded by hand.
const pad = (v, w) => String(v).padEnd(w);
const padS = (v, w) => String(v).padStart(w);
console.log(`  ${pad("#", 3)} ${pad("PATH", 34)} ${padS("UNLOCKS", 8)}  COVERAGE`);
for (const [i, s] of scored.slice(0, 12).entries()) {
  console.log(
    `  ${pad(i + 1, 3)} ${pad(s.path, 34)} ${padS(s.unlocks, 8)}  ${s.coverage}`
  );
}
const top12 = scored.slice(0, 12).reduce((a, s) => a + s.unlocks, 0);
const pct = ((top12 / uncrawled.length) * 100).toFixed(0);
console.log(
  `\n  between them these 12 link to ${top12} of the ${uncrawled.length} ` +
    `uncrawled URLs (${pct}%), counting each once`
);
console.log(
  "  so one day's quota puts Googlebot one hop from most of the backlog,\n" +
    "  rather than spending 143 days requesting them one at a time"
);
console.log(`\nfull ranked queue -> ${OUT}`);
console.log(
  "\nPaste each into Search Console > URL Inspection > Request Indexing.\n" +
    "There is no API for this. Re-run scripts/audit-index-coverage.mjs in a few\n" +
    "days to see which ones took."
);
