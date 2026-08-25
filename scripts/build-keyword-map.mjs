#!/usr/bin/env node
/**
 * Generate seo/keyword-map.csv — one row per keyword opportunity, with every
 * score component in its own column.
 *
 * The brief asks for
 *   Opportunity = demand x attainability x intent x authority x CTR x value / effort
 * and explicitly asks that the components not be hidden behind one number. They
 * are all here, so a reader can disagree with a weighting and recompute rather
 * than having to trust the total.
 *
 * Two of the brief's classes cannot be populated from this site's data, and
 * saying so is more useful than inventing rows:
 *
 *   A. Quick CTR wins — needs impressions and CTR. There is no Search Console or
 *      GA4 data in this repo or environment, so no page can be shown to be
 *      under-performing its impressions. Zero rows, by absence of evidence.
 *   B. Striking distance (positions 4-20) — zero keywords rank above position 25.
 *      The band is empty. The nearest equivalent is 21-50, which is treated as a
 *      separate class (B2) rather than silently relabelled.
 *
 * Sources:
 *   seo/data/organic-positions.csv     current rankings
 *   seo/data/keyword-difficulty.csv    KD per ranking keyword
 *   seo/url-inventory.csv              which URL owns what, and its link equity
 *   GAP_KEYWORDS below                 measured via phrase_fullsearch + phrase_kdi
 *
 * Usage: node scripts/build-keyword-map.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";

const OUT = "seo/keyword-map.csv";

function readCsv(path, delim = ",") {
  const lines = readFileSync(path, "utf8").split("\n").filter((l) => l && !l.startsWith("#"));
  const head = lines[0].split(delim);
  return lines.slice(1).map((l) => {
    const cells = l.split(delim);
    return Object.fromEntries(head.map((h, i) => [h, cells[i]]));
  });
}

const positions = readCsv("seo/data/organic-positions.csv", ";");
const kdRows = readCsv("seo/data/keyword-difficulty.csv", ";");
const KD = new Map(
  kdRows.map((r) => [r.Keyword?.toLowerCase(), Number(r["Keyword Difficulty Index"] ?? 50)])
);

/** Inbound editorial link count per path, from the inventory. */
const inventory = readCsv("seo/url-inventory.csv");
const linksIn = new Map(inventory.map((r) => [r.url, Number(r.internal_links_in || 0)]));
const wordsOf = new Map(inventory.map((r) => [r.url, Number(r.word_count || 0)]));

/**
 * Measured gap keywords: real volume and KD from phrase_fullsearch + phrase_kdi,
 * for clusters where SafeNest owns a page but ranks nowhere in the top 100.
 * Nothing here is estimated.
 */
const GAP_KEYWORDS = [
  ["best toys for 6 month old", 2400, 15, "/guides/best-toys-6-12-months"],
  ["best toys for a 6 month old", 320, 15, "/guides/best-toys-6-12-months"],
  ["best toys for 6 month olds", 260, 15, "/guides/best-toys-6-12-months"],
  ["best toy for 6 month old", 260, 15, "/guides/best-toys-6-12-months"],
  ["best toys for 6 month old baby", 170, 15, "/guides/best-toys-6-12-months"],
  ["best developmental toys for 6 month old", 140, 22, "/guides/best-toys-6-12-months"],
  ["best sensory toys for 6 month old", 90, 17, "/guides/best-sensory-toys-babies"],
  ["best learning toys for 6 month old", 90, 11, "/guides/best-toys-6-12-months"],
  ["best educational toys for 6 month old", 70, 12, "/guides/best-toys-6-12-months"],
  ["best montessori toys for 6 month old", 40, 2, "/guides/best-toys-6-12-months"],
  ["best wooden toys for toddlers", 0, 10, "/guides/best-wooden-nontoxic-toys"],
];

/** Intent by keyword shape. Verified against the SERPs for the head terms. */
function intentOf(kw) {
  if (/^(best|top)\b/.test(kw)) return ["commercial investigation", 1.0];
  if (/\b(reviews?|product info)\b/.test(kw)) return ["transactional/navigational", 0.45];
  if (/^(what|how|why|which|are|is)\b/.test(kw)) return ["informational", 0.8];
  return ["commercial investigation", 0.9];
}

/**
 * Topical authority fit: how well the destination matches what SafeNest can
 * actually substantiate. Guides and age listings are its strongest ground;
 * product-name queries are the weakest, because those SERPs are retailer-owned
 * and a review site cannot displace Target, Walmart, Amazon and the manufacturer.
 */
function authorityFit(url, kw) {
  if (/\b(reviews?|product info)\b/.test(kw)) return [0.15, "product-name SERP is retailer-owned"];
  if (url.startsWith("/guides/")) return [1.0, "buying guide, SafeNest's strongest format"];
  if (url.startsWith("/best-toys/")) return [0.9, "age listing matches the collection-page intent Google serves"];
  if (url.startsWith("/categories/")) return [0.7, "category listing"];
  if (url.startsWith("/reviews/")) return [0.2, "single review page"];
  if (url.startsWith("/blog/")) return [0.5, "article"];
  return [0.5, "other"];
}

/** Attainability from difficulty and how far off the pace the page already is. */
function attainability(kd, position) {
  const byKd = Math.max(0.05, 1 - kd / 60);
  // Already in the top 100 is a real signal Google understands the page.
  const byPos =
    position === 0 ? 0.45
      : position <= 20 ? 1.0
      : position <= 50 ? 0.8
      : 0.55;
  return Number((byKd * byPos).toFixed(3));
}

/** CTR potential. Deliberately coarse: with no GSC data this is a prior, not a measurement. */
function ctrPotential(position, kw) {
  if (position === 0) return [0.5, "not ranking; prior only"];
  if (position <= 10) return [1.0, "on page 1"];
  if (position <= 20) return [0.6, "page 2"];
  if (/^(best|top)\b/.test(kw)) return [0.35, "deep, but the query shape favours a strong title"];
  return [0.25, "deep in the results"];
}

/** Business value: proximity to an affiliate click or an email signup. */
function businessValue(url) {
  if (url.startsWith("/guides/") || url.startsWith("/gift-guides/")) return [1.0, "affiliate + email"];
  if (url.startsWith("/best-toys/")) return [0.9, "affiliate"];
  if (url.startsWith("/reviews/")) return [0.85, "affiliate, but low acquisition ceiling"];
  if (url.startsWith("/categories/")) return [0.6, "routes to reviews"];
  return [0.5, "indirect"];
}

/** Effort, 1 = trivial. */
function effort(url, isGap) {
  const words = wordsOf.get(url) ?? 0;
  if (isGap) return [3, "page exists but needs expansion and internal links"];
  if (words > 0 && words < 600) return [2, `thin at ${words} words; expand`];
  return [1.5, "on-page refinement"];
}

const maxVolume = Math.max(
  ...positions.map((r) => Number(r["Search Volume"] || 0)),
  ...GAP_KEYWORDS.map((g) => g[1])
);

const rows = [];

function addRow({ kw, volume, kd, position, url, cls, clsReason }) {
  const [intent, intentFit] = intentOf(kw);
  const [authFit, authWhy] = authorityFit(url, kw);
  const attain = attainability(kd, position);
  const [ctr, ctrWhy] = ctrPotential(position, kw);
  const [value, valueWhy] = businessValue(url);
  const [eff, effWhy] = effort(url, position === 0);
  const demand = Number((volume / maxVolume).toFixed(4));
  const score = Number(
    ((demand * attain * intentFit * authFit * ctr * value) / eff * 1000).toFixed(2)
  );
  rows.push({
    keyword: kw,
    class: cls,
    class_reason: clsReason,
    primary_url: url,
    current_position: position || "not ranking",
    search_volume: volume,
    keyword_difficulty: kd,
    search_intent: intent,
    internal_links_in: linksIn.get(url) ?? "",
    page_words: wordsOf.get(url) ?? "",
    c_demand_normalised: demand,
    c_attainability: attain,
    c_intent_fit: intentFit,
    c_authority_fit: authFit,
    c_authority_note: authWhy,
    c_ctr_potential: ctr,
    c_ctr_note: ctrWhy,
    c_business_value: value,
    c_business_note: valueWhy,
    c_effort: eff,
    c_effort_note: effWhy,
    opportunity_score: score,
  });
}

// ─── Class B2: ranks 21-50 ───────────────────────────────────────────────────
// The brief's class B (4-20) is empty, so this is the nearest real band.
const inventoryByPath = new Map(inventory.map((r) => [r.url, r]));
function urlForKeyword(kwRow) {
  try {
    return new URL(kwRow.Url).pathname.replace(/\/$/, "") || "/";
  } catch {
    return "";
  }
}

for (const r of positions) {
  const kw = r.Keyword;
  const pos = Number(r.Position);
  const url = urlForKeyword(r);
  if (!inventoryByPath.has(url)) continue;
  const kd = KD.get(kw.toLowerCase()) ?? 50;
  const volume = Number(r["Search Volume"] || 0);
  if (pos <= 50) {
    addRow({
      kw, volume, kd, position: pos, url,
      cls: "B2 striking distance (21-50)",
      clsReason: `position ${pos}, KD ${kd} — closest thing to striking distance on this site`,
    });
  } else {
    addRow({
      kw, volume, kd, position: pos, url,
      cls: "C existing-page expansion (51-100)",
      clsReason: `position ${pos}, KD ${kd} — page is understood but not competitive`,
    });
  }
}

// ─── Class E: measured demand, page exists, no ranking ───────────────────────
for (const [kw, volume, kd, url] of GAP_KEYWORDS) {
  addRow({
    kw, volume, kd, position: 0, url,
    cls: "E existing page, zero ranking",
    clsReason: "SafeNest owns a page for this cluster but does not rank in the top 100",
  });
}

// ─── Class D: cannibalisation ────────────────────────────────────────────────
const CANNIBAL = [
  {
    cluster: "sensory toys (category)",
    keeper: "/guides/best-sensory-toys-babies",
    competing: [
      "/categories/sensory-toys",
      "/blog/top-child-safe-sensory-toys-2026-w34",
      "/best-toys/category/sensory-toys/0-6-months",
    ],
    note:
      "The guide holds 18 keywords worth 7,070/mo. The cron-generated w34 roundup " +
      "is ~400 words, ranks for nothing, and targets the same category intent. " +
      "The cron rotates 4 categories on week-stamped slugs, so it will mint " +
      "another near-duplicate of this every ~8 weeks indefinitely.",
  },
  {
    cluster: "building toys (category)",
    keeper: "/guides/best-building-toys-preschoolers",
    competing: [
      "/categories/building-toys",
      "/blog/top-child-safe-building-toys-2026-w32",
      "/guides/best-building-toys-toddlers-2025",
    ],
    note:
      "The guide holds 6 keywords worth 4,770/mo including 'best toys for " +
      "building independence' (4,400/mo, KD 12) at position 98. Two other pages " +
      "target the same intent, one of them a dated 2025 guide.",
  },
  {
    cluster: "6-12 month toys",
    keeper: "/best-toys/6-12-months",
    competing: ["/guides/best-toys-6-12-months"],
    note:
      "Near-identical titles: 'Best Toys for 6-12 months' (listing, 1,676 words, " +
      "42 product cards) vs 'Best Toys for 6-12 Month Olds' (guide, 471 words). " +
      "Both self-canonical. The head term 'best toys for 6 month old' is " +
      "2,400/mo at KD 15 and neither ranks. The SERP is collection-page " +
      "dominated, which favours the listing as keeper.",
  },
];

for (const c of CANNIBAL) {
  rows.push({
    keyword: c.cluster,
    class: "D consolidation",
    class_reason: c.note,
    primary_url: c.keeper,
    current_position: "",
    search_volume: "",
    keyword_difficulty: "",
    search_intent: "commercial investigation",
    internal_links_in: linksIn.get(c.keeper) ?? "",
    page_words: wordsOf.get(c.keeper) ?? "",
    c_demand_normalised: "", c_attainability: "", c_intent_fit: "",
    c_authority_fit: "", c_authority_note: `competing: ${c.competing.join(" | ")}`,
    c_ctr_potential: "", c_ctr_note: "", c_business_value: "", c_business_note: "",
    c_effort: "", c_effort_note: "needs an editorial decision, not a code change",
    opportunity_score: "",
  });
}

// ─── Class F: rejected ───────────────────────────────────────────────────────
const REJECTED = [
  ["lovevery play kits", 9900, "Brand-navigational. lovevery.com owns it; CPC $13.38 signals pure commercial competition SafeNest cannot enter credibly."],
  ["fisher price giant rock a stack", 320, "Product-name SERP: Target, Walmart, shop.mattel, Amazon, eBay, Macy's. Zero editorial results in the top 10."],
  ["green toys stacking cups", 90, "Same pattern — greentoys.com x2, Amazon, Walmart, Toys R Us. No editorial slot exists."],
  ["vtech race & learn driver product info and reviews", 260, "Already position 25, but the phrasing mirrors SafeNest's own title pattern rather than natural search language. Not worth optimising toward."],
];
for (const [kw, volume, why] of REJECTED) {
  rows.push({
    keyword: kw, class: "F reject", class_reason: why,
    primary_url: "", current_position: "", search_volume: volume,
    keyword_difficulty: "", search_intent: "transactional",
    internal_links_in: "", page_words: "",
    c_demand_normalised: "", c_attainability: "", c_intent_fit: "",
    c_authority_fit: "", c_authority_note: "", c_ctr_potential: "", c_ctr_note: "",
    c_business_value: "", c_business_note: "", c_effort: "", c_effort_note: "",
    opportunity_score: "",
  });
}

// ─── Write ───────────────────────────────────────────────────────────────────
const HEADER = Object.keys(rows[0]);
const esc = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
rows.sort((a, z) => (Number(z.opportunity_score) || -1) - (Number(a.opportunity_score) || -1));
writeFileSync(
  OUT,
  [HEADER.join(","), ...rows.map((r) => HEADER.map((h) => esc(r[h])).join(","))].join("\n") + "\n"
);

console.log(`wrote ${OUT} — ${rows.length} rows\n`);
const byClass = new Map();
for (const r of rows) byClass.set(r.class, (byClass.get(r.class) ?? 0) + 1);
for (const [c, n] of [...byClass].sort()) console.log(`  ${String(n).padStart(3)}  ${c}`);
console.log(`\ntop 12 by opportunity score:`);
for (const r of rows.filter((r) => r.opportunity_score).slice(0, 12)) {
  console.log(
    `  ${String(r.opportunity_score).padStart(7)}  pos ${String(r.current_position).padStart(11)}  ` +
      `vol ${String(r.search_volume).padStart(5)}  KD ${String(r.keyword_difficulty).padStart(2)}  ${r.keyword.slice(0, 40)}`
  );
  console.log(`  ${" ".repeat(9)}-> ${r.primary_url}`);
}
