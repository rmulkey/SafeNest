#!/usr/bin/env node
/**
 * Crawl representative pages and check every distinct internal link target.
 *
 * This caught `/privacy` and `/terms` 404ing from the footer of every page —
 * two broken links on all 19 pages sampled, which no unit test would surface
 * because the links were correct-looking hrefs to routes that did not exist.
 *
 * Usage:
 *   node scripts/audit-internal-links.mjs                       # live site
 *   node scripts/audit-internal-links.mjs http://localhost:3100 # local build
 */

const BASE = (process.argv[2] || "https://safenesttoys.com").replace(/\/$/, "");

/** One page per template, so shared chrome and per-template links are covered. */
const SEEDS = [
  "/",
  "/reviews",
  "/reviews/green-toys-stacking-cups",
  "/guides",
  "/guides/best-bath-water-toys",
  "/blog",
  "/categories",
  "/categories/sensory-toys",
  "/recalls",
  "/transparency",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/best-toys",
  "/best-toys/1-2-years",
  "/gift-guides",
  "/safe-toys/wood",
  "/best-toys/category/sensory-toys/6-12-months",
];

const targets = new Map(); // path -> Set of pages linking to it

for (const seed of SEEDS) {
  const res = await fetch(BASE + seed);
  if (!res.ok) {
    console.log(`  seed ${seed} -> HTTP ${res.status}`);
    continue;
  }
  const html = await res.text();
  for (const m of html.matchAll(/href="(\/[^"#?]*)/g)) {
    const path = m[1].replace(/\/$/, "") || "/";
    // Build assets and API routes are not navigable links.
    if (path.startsWith("/_next") || path.startsWith("/api")) continue;
    if (!targets.has(path)) targets.set(path, new Set());
    targets.get(path).add(seed);
  }
}

console.log(`distinct internal link targets: ${targets.size}`);

const paths = [...targets.keys()];
const broken = [];
const CONCURRENCY = 8;

for (let i = 0; i < paths.length; i += CONCURRENCY) {
  const batch = paths.slice(i, i + CONCURRENCY);
  await Promise.all(
    batch.map(async (path) => {
      const res = await fetch(BASE + path, { redirect: "manual" });
      // 3xx is fine: a redirect still resolves for a user and a crawler.
      if (res.status >= 400) {
        broken.push({ path, status: res.status, from: [...targets.get(path)] });
      }
    })
  );
}

if (broken.length === 0) {
  console.log(`PASSED: no broken internal links across ${SEEDS.length} pages`);
  process.exit(0);
}

console.log(`\nBROKEN (${broken.length}):`);
for (const b of broken.sort((a, z) => z.from.length - a.from.length)) {
  console.log(
    `  ${b.status}  ${b.path}   linked from ${b.from.length} page(s): ${b.from.slice(0, 3).join(", ")}${b.from.length > 3 ? " …" : ""}`
  );
}
console.log(`\nFAILED: ${broken.length} broken internal link target(s)`);
process.exit(1);
