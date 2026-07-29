#!/usr/bin/env node
/**
 * Scan served pages for malformed age ranges.
 *
 * Six separate local implementations of age formatting existed alongside the
 * centralised one, each broken differently: "2 years–3 years" on the guides
 * page, "6mo – 3yr" on the reviews index and review headers, "1 – 5 years" on
 * the homepage, "6 – 36 months" on category pages. A unit test on the formatter
 * cannot catch a page that never calls it, so this checks rendered output.
 *
 * Usage:
 *   node scripts/scan-age-formatting.mjs                       # live site
 *   node scripts/scan-age-formatting.mjs http://localhost:3100 # local build
 */

const BASE = (process.argv[2] || "https://safenesttoys.com").replace(/\/$/, "");

const PAGES = [
  "/",
  "/guides",
  "/reviews",
  "/categories/sensory-toys",
  "/best-toys/1-2-years",
  "/reviews/green-toys-stacking-cups",
  "/safe-toys/wood",
  "/guides/best-building-toys-toddlers-2025",
];

/** Any age-range-looking string. */
const AGE_RANGE =
  /(?:Birth|\d+)\s*(?:months?|mo|years?|yr)?\s*[\u2013-]\s*\d+\s*(?:months?|mo|years?|yr)/gi;

/** Shapes that must never be emitted, with the reason. */
const MALFORMED = [
  [/\b1 years\b/i, "ungrammatical plural for one year"],
  [/\b1 months\b/i, "ungrammatical plural for one month"],
  [/years\u2013\d+\s*years/i, "unit repeated on both sides of a year range"],
  [/months\u2013\d+\s*months/i, "unit repeated on both sides of a month range"],
  [/\d+\s*mo\s*[\u2013-]\s*\d+\s*yr/i, "abbreviated mixed units (e.g. 6mo–3yr)"],
  [/\d+\s+[\u2013-]\s+\d+\s+(?:years|months)/i, "spaced hyphen instead of an en dash"],
  [/\d+\s*[\u2013-]\s*\d+\s*mo\b/i, "abbreviated month unit (e.g. 6–36 mo)"],
];

let failures = 0;

for (const path of PAGES) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    console.log(`\n${path}\n  FAIL  HTTP ${res.status}`);
    failures++;
    continue;
  }
  const text = (await res.text())
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ");

  const found = [...new Set((text.match(AGE_RANGE) || []).map((s) => s.trim()))];
  const offenders = [];
  for (const hit of found) {
    for (const [pattern, reason] of MALFORMED) {
      if (pattern.test(hit)) offenders.push(`"${hit}" (${reason})`);
    }
  }

  console.log(`\n${path}  —  ${found.length} distinct age string(s)`);
  if (found.length) console.log(`  ${found.join("  |  ")}`);
  if (offenders.length) {
    for (const o of offenders) console.log(`  FAIL  ${o}`);
    failures += offenders.length;
  } else {
    console.log("  ok    all well-formed");
  }
}

console.log(
  `\n${failures === 0 ? "PASSED" : "FAILED"}: ${failures} malformed age string(s) across ${PAGES.length} pages`
);
process.exit(failures === 0 ? 0 : 1);
