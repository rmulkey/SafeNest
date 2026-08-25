#!/usr/bin/env node
/**
 * On-page audit across every sitemap URL, grouped the way a third-party crawler
 * groups its findings so its report can be reconciled against served output.
 *
 * A hosted crawler reports on the snapshot it last took, from whichever host the
 * campaign was pointed at, up to whatever page limit the plan allows. When those
 * three things drift — a stale crawl, the `www` host that redirects, a 100-page
 * cap on a 221-page site — the issue counts describe a site that no longer
 * exists. This measures the live site instead, so the two can be compared.
 *
 * Errors (a crawler counts these as errors):
 *   - non-200 status
 *   - soft 404: HTTP 200 whose title or body says the page is missing
 *   - missing or empty <title>
 *   - duplicate <title> across URLs
 *   - missing <h1>, or more than one
 *   - missing or empty meta description
 *   - duplicate meta description across URLs
 *   - missing canonical
 *
 * Warnings:
 *   - title over 60 characters
 *   - meta description outside 70–160 characters
 *   - fewer than 300 words of body text
 *   - images with no alt attribute
 *   - duplicate <h1> text across URLs
 *
 * Body text is measured with inline <script> and <style> removed, so an RSC
 * flight payload is not counted as page copy.
 *
 * Usage:
 *   node scripts/audit-onpage.mjs                       # live site
 *   node scripts/audit-onpage.mjs http://localhost:3114 # local build
 *   VERBOSE=1 node scripts/audit-onpage.mjs             # list every URL
 */

const BASE = (process.argv[2] || "https://safenesttoys.com").replace(/\/$/, "");
const VERBOSE = process.env.VERBOSE === "1";
const CONCURRENCY = 8;
const TITLE_MAX = 60;
const DESC_MIN = 70;
const DESC_MAX = 160;
const MIN_WORDS = 300;

const decode = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–");

const strip = (s) => decode(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const normPath = (p) => p.replace(/\/$/, "") || "/";

const sitemapRes = await fetch(`${BASE}/sitemap.xml`);
if (!sitemapRes.ok) {
  console.error(`FAILED: sitemap.xml -> HTTP ${sitemapRes.status}`);
  process.exit(1);
}
const paths = [
  ...new Set(
    [...(await sitemapRes.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
      normPath(new URL(m[1].trim()).pathname)
    )
  ),
];

const pages = [];

for (let i = 0; i < paths.length; i += CONCURRENCY) {
  await Promise.all(
    paths.slice(i, i + CONCURRENCY).map(async (path) => {
      let res;
      try {
        res = await fetch(BASE + path);
      } catch (err) {
        pages.push({ path, status: 0, error: String(err) });
        return;
      }
      const raw = await res.text();
      // The RSC flight payload repeats the whole tree as JSON inside <script>.
      const body = raw
        .replace(/<script\b[\s\S]*?<\/script>/gi, "")
        .replace(/<style\b[\s\S]*?<\/style>/gi, "");

      const titleRaw = raw.match(/<title>([\s\S]*?)<\/title>/);
      const title = titleRaw ? decode(titleRaw[1]).trim() : "";
      const descRaw = raw.match(
        /<meta\s+name="description"\s+content="([^"]*)"/i
      );
      const description = descRaw ? decode(descRaw[1]).trim() : "";
      const canonical = (
        raw.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i) ?? []
      )[1];
      const h1s = [...body.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) =>
        strip(m[1])
      );
      const words = strip(body).split(" ").filter(Boolean).length;
      const imgs = [...body.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
      const imgsNoAlt = imgs.filter((t) => !/\salt=/i.test(t)).length;

      // Affiliate disclosure must accompany affiliate links. The Associates
      // agreement requires it, so its disappearance is a compliance failure, not
      // a cosmetic one — and it is exactly the kind of thing a refactor removes
      // silently because no page looks broken without it.
      const affiliateLinks = (
        raw.match(/href="https:\/\/(?:www\.)?amazon\.[a-z.]+\/[^"]*"/gi) || []
      ).length;
      const visibleText = strip(raw).replace(/<[^>]+>/g, " ");
      const hasDisclosure =
        /affiliate/i.test(visibleText) &&
        /(commission|earn|paid)/i.test(visibleText);

      pages.push({
        path,
        status: res.status,
        affiliateLinks,
        hasDisclosure,
        title,
        titleLen: [...title].length,
        description,
        descLen: [...description].length,
        canonical: canonical ? normPath(new URL(canonical).pathname) : "",
        h1s,
        words,
        imgs: imgs.length,
        imgsNoAlt,
        softNotFound:
          res.status === 200 &&
          /not found|no longer available/i.test(`${title} ${h1s.join(" ")}`),
      });
    })
  );
}

pages.sort((a, z) => a.path.localeCompare(z.path));

const dupesOf = (key) => {
  const seen = new Map();
  for (const p of pages) {
    const v = p[key];
    if (!v) continue;
    if (!seen.has(v)) seen.set(v, []);
    seen.get(v).push(p.path);
  }
  return [...seen.entries()].filter(([, ps]) => ps.length > 1);
};

const dupTitles = dupesOf("title");
const dupDescs = dupesOf("description");

/**
 * Two sitemap URLs claiming the same canonical.
 *
 * Every URL the sitemap lists should be self-canonical: the sitemap is the set of
 * pages we are asking Google to index, so a listed URL pointing its canonical
 * elsewhere is either a mistake or a page that should not be listed.
 *
 * The site does have deliberate many-to-one canonicals — eleven alternate age
 * spellings fold onto five preferred URLs — but none of those eleven is in the
 * sitemap, which is exactly why "both in the sitemap" is the right test. It flags
 * the accident without flagging the design.
 */
const canonicalGroups = new Map();
for (const p of pages) {
  if (p.status !== 200 || !p.canonical) continue;
  if (!canonicalGroups.has(p.canonical)) canonicalGroups.set(p.canonical, []);
  canonicalGroups.get(p.canonical).push(p.path);
}
const dupCanonicals = [...canonicalGroups.entries()].filter(([, ps]) => ps.length > 1);
const nonSelfCanonical = pages.filter(
  (p) => p.status === 200 && p.canonical && p.canonical !== p.path
);

const missingDisclosure = pages.filter(
  (p) => p.status === 200 && p.affiliateLinks > 0 && !p.hasDisclosure
);
const dupH1s = (() => {
  const seen = new Map();
  for (const p of pages) {
    if (p.h1s?.length !== 1) continue;
    const v = p.h1s[0];
    if (!seen.has(v)) seen.set(v, []);
    seen.get(v).push(p.path);
  }
  return [...seen.entries()].filter(([, ps]) => ps.length > 1);
})();

const ERRORS = [
  ["non-200 status", pages.filter((p) => p.status !== 200)],
  ["soft 404 (200 but reads as missing)", pages.filter((p) => p.softNotFound)],
  ["missing <title>", pages.filter((p) => p.status === 200 && !p.title)],
  ["missing <h1>", pages.filter((p) => p.status === 200 && p.h1s?.length === 0)],
  ["multiple <h1>", pages.filter((p) => (p.h1s?.length ?? 0) > 1)],
  [
    "missing meta description",
    pages.filter((p) => p.status === 200 && !p.description),
  ],
  ["missing canonical", pages.filter((p) => p.status === 200 && !p.canonical)],
];

const WARNINGS = [
  [
    `title over ${TITLE_MAX} chars`,
    pages.filter((p) => p.titleLen > TITLE_MAX),
  ],
  [
    `meta description outside ${DESC_MIN}–${DESC_MAX} chars`,
    pages.filter(
      (p) => p.description && (p.descLen < DESC_MIN || p.descLen > DESC_MAX)
    ),
  ],
  [
    `under ${MIN_WORDS} words of body text`,
    pages.filter((p) => p.status === 200 && p.words < MIN_WORDS),
  ],
  ["images with no alt attribute", pages.filter((p) => p.imgsNoAlt > 0)],
];

console.log(`on-page audit of ${BASE}`);
console.log(`sitemap URLs crawled: ${pages.length}\n`);

let errorPages = 0;
let warningPages = 0;

console.log("ERRORS");
for (const [label, hits] of ERRORS) {
  errorPages += hits.length;
  console.log(`  ${String(hits.length).padStart(4)}  ${label}`);
  if (hits.length && (VERBOSE || hits.length <= 8)) {
    for (const h of hits.slice(0, 12)) {
      console.log(`          ${h.path}${h.status !== 200 ? `  (HTTP ${h.status})` : ""}`);
    }
  }
}
console.log(`  ${String(dupTitles.length).padStart(4)}  duplicate <title> across URLs`);
for (const [v, ps] of dupTitles.slice(0, VERBOSE ? 50 : 5)) {
  console.log(`          "${v.slice(0, 70)}" x${ps.length}: ${ps.slice(0, 3).join(", ")}`);
}
console.log(`  ${String(dupDescs.length).padStart(4)}  duplicate meta description across URLs`);
for (const [v, ps] of dupDescs.slice(0, VERBOSE ? 50 : 5)) {
  console.log(`          "${v.slice(0, 70)}…" x${ps.length}: ${ps.slice(0, 3).join(", ")}`);
}
console.log(
  `  ${String(dupCanonicals.length).padStart(4)}  sitemap URLs sharing a canonical (unexpected)`
);
for (const [canon, ps] of dupCanonicals.slice(0, VERBOSE ? 50 : 8)) {
  console.log(`          ${canon} <- ${ps.join(", ")}`);
}
console.log(
  `  ${String(nonSelfCanonical.length).padStart(4)}  sitemap URLs not self-canonical (unexpected)`
);
for (const p of nonSelfCanonical.slice(0, VERBOSE ? 50 : 8)) {
  console.log(`          ${p.path} -> ${p.canonical}`);
}
console.log(
  `  ${String(missingDisclosure.length).padStart(4)}  pages with affiliate links but no disclosure`
);
for (const p of missingDisclosure.slice(0, VERBOSE ? 50 : 8)) {
  console.log(`          ${p.path} (${p.affiliateLinks} affiliate link(s))`);
}
errorPages +=
  dupTitles.length +
  dupDescs.length +
  dupCanonicals.length +
  nonSelfCanonical.length +
  missingDisclosure.length;

console.log("\nWARNINGS");
for (const [label, hits] of WARNINGS) {
  warningPages += hits.length;
  console.log(`  ${String(hits.length).padStart(4)}  ${label}`);
  if (hits.length && (VERBOSE || hits.length <= 8)) {
    for (const h of hits.slice(0, 12)) console.log(`          ${h.path}`);
  }
}
console.log(`  ${String(dupH1s.length).padStart(4)}  duplicate <h1> text across URLs`);
for (const [v, ps] of dupH1s.slice(0, VERBOSE ? 50 : 5)) {
  console.log(`          "${v.slice(0, 60)}" x${ps.length}: ${ps.slice(0, 3).join(", ")}`);
}
warningPages += dupH1s.length;

const titles = pages.map((p) => p.titleLen).filter(Boolean).sort((a, z) => a - z);
const wordCounts = pages.map((p) => p.words).sort((a, z) => a - z);
const pct = (arr, q) => arr[Math.min(arr.length - 1, Math.floor(arr.length * q))];
console.log("\nDISTRIBUTIONS");
console.log(
  `  title length      median ${pct(titles, 0.5)}  p90 ${pct(titles, 0.9)}  max ${titles.at(-1)}`
);
console.log(
  `  body word count   median ${pct(wordCounts, 0.5)}  p10 ${pct(wordCounts, 0.1)}  min ${wordCounts[0]}`
);
console.log(
  `  images            ${pages.reduce((n, p) => n + (p.imgs ?? 0), 0)} total, ${pages.reduce((n, p) => n + (p.imgsNoAlt ?? 0), 0)} without alt`
);

console.log(`\nTOTAL: ${errorPages} error finding(s), ${warningPages} warning finding(s)`);
process.exit(errorPages === 0 ? 0 : 1);
