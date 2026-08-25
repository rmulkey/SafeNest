#!/usr/bin/env node
/**
 * Find orphan pages: URLs in the sitemap that no other page links to.
 *
 * An orphan is discoverable by a crawler that reads the sitemap, but it earns
 * no internal PageRank and reads to Google as a page the site itself does not
 * consider worth linking. Programmatic listing families (/safe-toys/[material],
 * /best-toys/category/[c]/[age]) are the usual offenders because they are
 * generated from data and never wired into any nav.
 *
 * Crawls every sitemap URL, collects outgoing internal hrefs, and reports which
 * sitemap URLs never appear as a link target.
 *
 * Usage:
 *   node scripts/audit-orphan-pages.mjs                       # live site
 *   node scripts/audit-orphan-pages.mjs http://localhost:3114 # local build
 */

const BASE = (process.argv[2] || "https://safenesttoys.com").replace(/\/$/, "");
const CONCURRENCY = 8;

const normalise = (pathname) => pathname.replace(/\/$/, "") || "/";

const sitemapRes = await fetch(`${BASE}/sitemap.xml`);
if (!sitemapRes.ok) {
  console.error(`FAILED: sitemap.xml -> HTTP ${sitemapRes.status}`);
  process.exit(1);
}
const sitemapXml = await sitemapRes.text();

// A local `next start` emits localhost:3000 in the sitemap regardless of the
// port it is served on, so compare paths, never full URLs.
const sitemapPaths = [
  ...new Set(
    [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
      normalise(new URL(m[1].trim()).pathname)
    )
  ),
];

console.log(`sitemap URLs: ${sitemapPaths.length}`);

/** path -> Set of pages that link to it */
const inbound = new Map();
const unreachable = [];

for (let i = 0; i < sitemapPaths.length; i += CONCURRENCY) {
  const batch = sitemapPaths.slice(i, i + CONCURRENCY);
  await Promise.all(
    batch.map(async (page) => {
      const res = await fetch(BASE + page);
      if (!res.ok) {
        unreachable.push({ page, status: res.status });
        return;
      }
      // Strip inline <script> before reading hrefs. The RSC flight payload
      // repeats every href as a JSON string, so counting it would credit a
      // page with links a crawler cannot follow without executing JS.
      const html = (await res.text()).replace(/<script\b[\s\S]*?<\/script>/gi, "");
      for (const m of html.matchAll(/href="(\/[^"]*)"/g)) {
        const target = normalise(m[1].split(/[#?]/)[0]);
        if (target.startsWith("/_next") || target.startsWith("/api")) continue;
        if (!inbound.has(target)) inbound.set(target, new Set());
        // Self-links (canonical, hreflang, pagination to self) do not count.
        if (target !== page) inbound.get(target).add(page);
      }
    })
  );
}

const orphans = sitemapPaths.filter((p) => (inbound.get(p)?.size ?? 0) === 0);

/** Group by route family so 14 sibling orphans read as one problem. */
const family = (p) => {
  const parts = p.split("/").filter(Boolean);
  if (parts.length === 0) return "/";
  if (parts.length === 1) return `/${parts[0]}`;
  return `/${parts[0]}/${parts.slice(1).map(() => "*").join("/")}`;
};

const byFamily = new Map();
for (const p of orphans) {
  const key = family(p);
  if (!byFamily.has(key)) byFamily.set(key, []);
  byFamily.get(key).push(p);
}

if (unreachable.length > 0) {
  console.log(`\nSITEMAP URLS THAT DO NOT RESOLVE (${unreachable.length}):`);
  for (const u of unreachable) console.log(`  ${u.status}  ${u.page}`);
}

console.log(`\norphans: ${orphans.length} / ${sitemapPaths.length}`);
for (const [key, paths] of [...byFamily].sort((a, z) => z[1].length - a[1].length)) {
  console.log(`\n  ${key}  (${paths.length})`);
  for (const p of paths.sort()) console.log(`    ${p}`);
}

const linkedCount = sitemapPaths.length - orphans.length;
console.log(
  `\n${orphans.length === 0 ? "PASSED" : "FOUND"}: ${linkedCount} linked, ${orphans.length} orphaned`
);
process.exit(orphans.length === 0 ? 0 : 1);
