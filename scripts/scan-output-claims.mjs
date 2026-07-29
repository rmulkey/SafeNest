#!/usr/bin/env node
/**
 * Scan RENDERED OUTPUT (not source) for prohibited claims.
 *
 * Editing a component is not proof that production changed: content also comes
 * from Sanity, seed scripts, cached pages, and metadata. This scans the served
 * HTML of representative pages and exits non-zero if any forbidden phrase
 * survives, so it can gate a deploy.
 *
 * Usage:
 *   node scripts/scan-output-claims.mjs                      # live site
 *   node scripts/scan-output-claims.mjs http://localhost:3000 # local prod build
 */
const BASE = process.argv[2] || "https://safenesttoys.com";

const PATHS = [
  "/",
  "/about",
  "/transparency",
  "/guides",
  "/reviews",
  "/recalls",
  "/reviews/green-toys-stacking-cups",
  "/reviews/hape-rainbow-bead-abacus",
  "/reviews/step2-waterpark-wonders-two-tier-water-table",
  "/best-toys",
  "/best-toys/1-2-years",
  "/categories/sensory-toys",
  "/guides/back-to-school-preschool-readiness",
];

/** Phrases that must not appear in rendered output. */
const FORBIDDEN = [
  "50+",
  "run the small-parts test",
  "runs the small-parts test",
  "within 24 hours",
  "recall feeds daily",
  "monitored daily",
  "daily recall monitoring",
  "confirm which recognized",
  "standards we evaluate against",
  "expert-curated",
  "expert curated",
  "expert reviewed",
  "expert-reviewed",
  "expert review",
  "safety experts",
  "independently tested",
  "laboratory tested",
  "lab tested",
  "lab-tested",
  "certified safe",
  "proven safe",
  "guaranteed safe",
  "cpsc approved",
  "cpsc-approved",
  "higher scores indicate safer",
  "no choking hazard",
  "safe from birth",
  "completely safe",
  "certified by safenest",
  "all 50 toys",
  // ─── Final production cleanup ─────────────────────────────────────────────
  // Unsupported price language. SafeNest does not track prices, so it cannot
  // claim to show the latest or best one. "current price" is permitted only
  // inside the merchant CTA, which is checked separately below.
  "see the latest price and availability",
  "latest price",
  "best price",
  "buy now",
  // Endorsement language: a score is not a pick, and SafeNest approves nothing.
  "safety pick",
  "safenest approved",
  "recommended as safe",
  // The removed numerical-cap model.
  "editorial scoring, with limits",
  "with limits",
  // Unattributed manufacturer expert claims.
  "developmentally staged by experts",
  "expert-designed",
  "expert designed",
  "expert-approved",
  "professionally reviewed",
  // Age-formatter regressions.
  "2 years\u20133 years",
  "1 years",
  "years\u2013 ",
];

/**
 * Phrases that are allowed, but only inside a specific context. The merchant CTA
 * legitimately says "Check current price at Amazon" — that describes what the
 * reader will do at the merchant, and claims nothing about SafeNest checking it.
 */
const CONTEXTUAL_ALLOWANCES = [
  { phrase: "current price", allowedWithin: "check current price at" },
];

/** Allowed when explicitly negated, e.g. "not laboratory tested". */
const NEGATION =
  /\b(no|not|never|without|non|neither|nor|isn't|aren't|doesn't|don't|cannot|can't)\b[^.!?;]{0,45}$/i;

async function fetchText(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "SafeNest-output-scan" },
        redirect: "follow",
      });
      if (res.ok) return await res.text();
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1500 * attempt));
  }
  return null;
}

let violations = 0;
let scanned = 0;

for (const path of PATHS) {
  const html = await fetchText(`${BASE}${path}`);
  if (html === null) {
    console.log(`  ${path.padEnd(52)} FETCH FAILED`);
    violations++;
    continue;
  }
  scanned++;
  // Collapse RSC escaping and whitespace so multi-line JSX prose reads contiguously.
  const flat = html.replace(/\\n|\\"/g, " ").replace(/\s+/g, " ");
  const lower = flat.toLowerCase();

  const hits = [];
  for (const phrase of FORBIDDEN) {
    let from = 0;
    for (;;) {
      const idx = lower.indexOf(phrase, from);
      if (idx === -1) break;
      const preceding = lower.slice(Math.max(0, idx - 60), idx);
      const window = lower.slice(Math.max(0, idx - 40), idx + phrase.length + 40);
      const allowed = CONTEXTUAL_ALLOWANCES.some(
        (a) => a.phrase === phrase && window.includes(a.allowedWithin)
      );
      if (!allowed && !NEGATION.test(preceding)) hits.push(phrase);
      from = idx + phrase.length;
    }
  }
  const unique = [...new Set(hits)];
  violations += unique.length;
  console.log(
    `  ${path.padEnd(52)} ${unique.length === 0 ? "CLEAN" : "VIOLATIONS: " + unique.join(", ")}`
  );
}

console.log(`\nscanned ${scanned}/${PATHS.length} pages · violations: ${violations}`);
if (violations > 0) {
  console.error(
    "\nFAILED: prohibited claims remain in rendered output. Editing a component is not sufficient — check Sanity content, seed scripts, and cached pages."
  );
  process.exit(1);
}
console.log("PASSED: no prohibited claims in rendered output.");
