#!/usr/bin/env node
/**
 * Generate seo/url-inventory.csv — one row per indexable URL.
 *
 * Joins three sources so the technical state and the search performance sit on
 * the same row:
 *   1. a crawl of production (status, canonical, metadata, headings, schema, weight)
 *   2. an inbound/outbound internal link graph built from that crawl
 *   3. seo/data/organic-positions.csv for ranking keywords per URL
 *
 * The Semrush join normalises host: 22 of the 30 ranking URLs are recorded on
 * www.safenesttoys.com and 8 on the apex, because Google's index holds history
 * from both. Matching on path only would still be wrong if it dropped the host
 * distinction entirely, so the host each keyword was observed on is kept in its
 * own column.
 *
 * Fields that are editorial judgement rather than measurement — intended primary
 * keyword, secondary cluster, conversion goal, disposition — are derived from
 * explicit rules below and labelled in the header so nobody mistakes them for
 * observed data.
 *
 * Usage:
 *   node scripts/build-url-inventory.mjs                       # live site
 *   node scripts/build-url-inventory.mjs http://localhost:3117  # local build
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const BASE = (process.argv[2] || "https://safenesttoys.com").replace(/\/$/, "");
const OUT = "seo/url-inventory.csv";
const CONCURRENCY = 6;

const norm = (p) => p.replace(/\/$/, "") || "/";

/** Route pattern -> page type, search intent, conversion goal. */
const ROUTE_RULES = [
  [/^\/$/, "homepage", "navigational", "discovery -> guides/reviews"],
  [/^\/reviews$/, "review index", "commercial investigation", "discovery -> review"],
  [/^\/reviews\/[^/]+$/, "review", "commercial investigation", "affiliate click"],
  [/^\/guides$/, "guide index", "commercial investigation", "discovery -> guide"],
  [/^\/guides\/[^/]+$/, "buying guide", "commercial investigation", "affiliate click + email"],
  [/^\/gift-guides$/, "gift guide index", "commercial investigation", "discovery -> gift guide"],
  [/^\/gift-guides\/[^/]+$/, "gift guide", "transactional", "affiliate click"],
  [/^\/best-toys$/, "age hub", "commercial investigation", "discovery -> age page"],
  [/^\/best-toys\/category\//, "category+age listing", "commercial investigation", "affiliate click"],
  [/^\/best-toys\/[^/]+$/, "age listing", "commercial investigation", "affiliate click"],
  [/^\/categories$/, "category hub", "navigational", "discovery -> category"],
  [/^\/categories\/[^/]+$/, "category listing", "commercial investigation", "discovery -> review"],
  [/^\/safe-toys\/[^/]+$/, "material listing", "informational", "discovery -> review"],
  [/^\/blog$/, "blog index", "informational", "email"],
  [/^\/blog\/[^/]+$/, "article", "informational", "email + affiliate click"],
  [/^\/recalls$/, "recalls", "informational", "trust + email"],
  [/^\/transparency$/, "methodology", "informational", "trust"],
  [/^\/about$/, "about", "navigational", "trust"],
  [/^\/contact$/, "contact", "navigational", "contact"],
  [/^\/(privacy|terms)$/, "legal", "navigational", "none"],
  [/^\/llms\.txt$/, "machine-readable map", "n/a", "AI citation"],
];

function classify(path) {
  for (const [re, type, intent, goal] of ROUTE_RULES) {
    if (re.test(path)) return { type, intent, goal };
  }
  return { type: "other", intent: "unknown", goal: "unknown" };
}

/** Off-sitemap but indexable, so the inventory is not blind to them. */
const OFF_SITEMAP = [
  "/llms.txt",
  "/best-toys/3", "/best-toys/6", "/best-toys/9", "/best-toys/12",
  "/best-toys/18", "/best-toys/24", "/best-toys/36",
  "/best-toys/0-12-months", "/best-toys/12-24-months",
  "/best-toys/24-36-months", "/best-toys/3-4-years",
];

const clean = (s) =>
  s
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/&#x27;|&apos;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—").replace(/&ndash;/g, "–")
    .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const textOf = (html) =>
  clean(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<template\b[\s\S]*?<\/template>/gi, " ")
  );

// ─── Semrush ranking data ────────────────────────────────────────────────────
function loadRankings() {
  let raw;
  try {
    raw = readFileSync("seo/data/organic-positions.csv", "utf8");
  } catch {
    console.error("  warning: seo/data/organic-positions.csv missing — run pull-semrush.mjs");
    return new Map();
  }
  const lines = raw.split("\n").filter((l) => l && !l.startsWith("#"));
  const head = lines[0].split(";");
  const byPath = new Map();
  for (const line of lines.slice(1)) {
    const cells = line.split(";");
    const row = Object.fromEntries(head.map((h, i) => [h, cells[i]]));
    if (!row.Url) continue;
    let u;
    try {
      u = new URL(row.Url);
    } catch {
      continue;
    }
    const path = norm(u.pathname);
    if (!byPath.has(path)) byPath.set(path, []);
    byPath.get(path).push({
      keyword: row.Keyword,
      position: Number(row.Position),
      volume: Number(row["Search Volume"] || 0),
      host: u.hostname.startsWith("www.") ? "www" : "apex",
    });
  }
  return byPath;
}

// ─── Crawl ───────────────────────────────────────────────────────────────────
async function sitemapPaths() {
  const res = await fetch(`${BASE}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap.xml -> HTTP ${res.status}`);
  const xml = await res.text();
  return [
    ...new Set(
      [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => norm(new URL(m[1].trim()).pathname))
    ),
  ];
}

const pages = new Map();
const outbound = new Map();

async function crawl(path, inSitemap) {
  let res;
  try {
    res = await fetch(BASE + path, { redirect: "manual" });
  } catch (err) {
    pages.set(path, { path, status: 0, error: String(err), inSitemap });
    return;
  }
  const status = res.status;
  if (status >= 300) {
    pages.set(path, { path, status, inSitemap, location: res.headers.get("location") || "" });
    return;
  }
  const raw = await res.text();
  const stripped = raw
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ");

  const title = clean(raw.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
  const desc = clean(raw.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1] ?? "");
  const canonicalRaw = raw.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i)?.[1] ?? "";
  const h1s = [...stripped.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => clean(m[1]));
  const h2Count = (stripped.match(/<h2\b/gi) || []).length;
  const words = textOf(raw).split(" ").filter(Boolean).length;
  const robots = raw.match(/<meta\s+name="robots"\s+content="([^"]*)"/i)?.[1] ?? "";
  const schemaTypes = [
    ...new Set(
      [...raw.matchAll(/"@type"\s*:\s*"([A-Za-z]+)"/g)].map((m) => m[1])
    ),
  ].sort();
  const imgs = [...stripped.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const imgsNoAlt = imgs.filter((t) => !/\salt=/i.test(t)).length;
  const mains = (raw.match(/<main\b/gi) || []).length;

  const links = new Set();
  for (const m of stripped.matchAll(/href="(\/[^"]*)"/g)) {
    const t = norm(m[1].split(/[#?]/)[0]);
    if (t.startsWith("/_next") || t.startsWith("/api") || t === path) continue;
    links.add(t);
  }
  outbound.set(path, links);

  let canonicalPath = "";
  let canonicalHost = "";
  if (canonicalRaw) {
    try {
      const cu = new URL(canonicalRaw);
      canonicalPath = norm(cu.pathname);
      canonicalHost = cu.hostname;
    } catch {
      canonicalPath = canonicalRaw;
    }
  }

  pages.set(path, {
    path, status, inSitemap, title, desc,
    canonicalPath, canonicalHost,
    h1: h1s[0] ?? "", h1Count: h1s.length, h2Count,
    words, robots, schemaTypes, imgs: imgs.length, imgsNoAlt, mains,
    bytes: raw.length,
    outCount: links.size,
  });
}

// ─── Disposition rules ───────────────────────────────────────────────────────
/**
 * Keep / improve / consolidate / redirect / noindex.
 *
 * Deliberately conservative: nothing is marked redirect or noindex without a
 * concrete reason, because the brief requires URL equity be preserved and a
 * redirect map be justified by evidence.
 */
function disposition(p, ranks, inCount) {
  if (p.status === 0 || p.status >= 400) return ["fix", `HTTP ${p.status}`];
  if (p.status >= 300) return ["redirect (already)", `${p.status} -> ${p.location || "?"}`];
  if (/noindex/i.test(p.robots)) return ["noindex (already)", "robots meta"];

  const selfCanonical = p.canonicalPath === p.path;
  if (!selfCanonical && p.canonicalPath) {
    return ["consolidate", `canonicalises to ${p.canonicalPath}`];
  }
  if (ranks.length > 0) {
    const best = Math.min(...ranks.map((r) => r.position));
    return ["improve", `ranks ${ranks.length} kw, best position ${best}`];
  }
  if (!p.inSitemap) return ["review", "indexable but absent from the sitemap"];
  if (p.words < 300) return ["improve", `thin: ${p.words} words`];
  if (inCount <= 1) return ["improve", `only ${inCount} inbound internal link(s)`];
  return ["keep", "healthy, no ranking signal yet"];
}

// ─── Main ────────────────────────────────────────────────────────────────────
const rankings = loadRankings();
const sm = await sitemapPaths();
const all = [...new Set([...sm, ...OFF_SITEMAP])].sort();

console.log(`crawling ${all.length} URLs of ${BASE}`);
for (let i = 0; i < all.length; i += CONCURRENCY) {
  await Promise.all(all.slice(i, i + CONCURRENCY).map((p) => crawl(p, sm.includes(p))));
}

// Inbound counts, chrome links excluded so editorial linking is visible.
const inbound = new Map();
for (const [src, targets] of outbound) {
  for (const t of targets) {
    if (!inbound.has(t)) inbound.set(t, new Set());
    inbound.get(t).add(src);
  }
}
const CHROME_THRESHOLD = all.length - 5;

const HEADER = [
  "url", "page_type", "http_status", "in_sitemap", "indexable",
  "canonical_path", "canonical_host", "self_canonical",
  "title", "title_len", "meta_description", "meta_desc_len",
  "h1", "h1_count", "h2_count", "word_count", "html_bytes",
  "schema_types", "images", "images_no_alt", "main_elements",
  "internal_links_in", "internal_links_in_editorial", "internal_links_out",
  "ranking_keywords", "best_position", "ranking_volume", "observed_hosts",
  "top_keyword",
  "search_intent__editorial", "conversion_goal__editorial",
  "disposition__editorial", "disposition_reason",
];

const rows = [];
for (const path of all) {
  const p = pages.get(path);
  if (!p) continue;
  const { type, intent, goal } = classify(path);
  const ranks = rankings.get(path) ?? [];
  const inAll = inbound.get(path)?.size ?? 0;
  const isChrome = inAll >= CHROME_THRESHOLD;
  const inEditorial = isChrome ? "chrome" : String(inAll);
  const [disp, reason] = disposition(p, ranks, inAll);
  const best = ranks.length ? Math.min(...ranks.map((r) => r.position)) : "";
  const vol = ranks.reduce((s, r) => s + r.volume, 0);
  const hosts = [...new Set(ranks.map((r) => r.host))].join("+");
  const top = ranks.length
    ? ranks.slice().sort((a, b) => b.volume - a.volume)[0].keyword
    : "";

  rows.push([
    path, type, p.status ?? "", p.inSitemap ? "yes" : "no",
    /noindex/i.test(p.robots ?? "") ? "no" : "yes",
    p.canonicalPath ?? "", p.canonicalHost ?? "",
    p.canonicalPath === path ? "yes" : "no",
    p.title ?? "", (p.title ?? "").length,
    p.desc ?? "", (p.desc ?? "").length,
    p.h1 ?? "", p.h1Count ?? "", p.h2Count ?? "", p.words ?? "", p.bytes ?? "",
    (p.schemaTypes ?? []).join("|"), p.imgs ?? "", p.imgsNoAlt ?? "", p.mains ?? "",
    inAll, inEditorial, p.outCount ?? "",
    ranks.length, best, vol, hosts, top,
    intent, goal, disp, reason,
  ]);
}

const esc = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
mkdirSync("seo", { recursive: true });
writeFileSync(OUT, [HEADER, ...rows].map((r) => r.map(esc).join(",")).join("\n") + "\n");

const byDisp = new Map();
for (const r of rows) {
  const d = r[HEADER.indexOf("disposition__editorial")];
  byDisp.set(d, (byDisp.get(d) ?? 0) + 1);
}
console.log(`\nwrote ${OUT} — ${rows.length} rows\n`);
console.log("disposition summary:");
for (const [d, n] of [...byDisp].sort((a, z) => z[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${d}`);
}
const withRanks = rows.filter((r) => Number(r[HEADER.indexOf("ranking_keywords")]) > 0).length;
console.log(`\nURLs with at least one ranking keyword: ${withRanks} of ${rows.length}`);
