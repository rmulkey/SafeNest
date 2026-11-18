/**
 * Run the claim qualifier over every stored assessment and look for artifacts.
 *
 * WHY
 * qualifyClaimText rewrites absolute safety claims into supportable wording by
 * pattern replacement. Overlapping rules can splice mid-word and leave a
 * fragment — a hand-written probe produced "...for ages 6 months and older.nths
 * and up." That particular input is not in the catalogue, so nothing is broken
 * on the live site, but the failure mode is real and a future edit could land on
 * it. This checks every value that actually exists instead of guessing.
 *
 * Flags, per assessment:
 *   - a sentence fragment left at the end or spliced mid-word
 *   - duplicated or orphaned punctuation and doubled spaces
 *   - a prohibited claim that survives qualification
 *   - text the qualifier leaves containing an absolute safety assertion
 *
 * Usage: node --import tsx scripts/audit-qualifier-artifacts.mjs
 */
import { createClient } from "@sanity/client";
import { qualifyClaimText } from "../src/lib/content/qualify-claims.ts";

const client = createClient({
  projectId: "ofvgjgsi",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: false,
});

/** Phrases that must not survive into rendered output. */
const PROHIBITED = [
  "no choking hazard",
  "completely safe",
  "safe from birth",
  "certified safe",
  "proven safe",
  "guaranteed safe",
  "perfectly safe",
];

/** Lowercase word fragments that indicate a mid-word splice. */
const FRAGMENT = /(^|[.!?]\s*)[a-z]{1,4}\s+(and up|and older|months|years)\b/;

const rows = await client.fetch(
  `*[_type == "toyReview" && defined(chokingHazardAssessment)]{
     "slug": slug.current, chokingHazardAssessment } | order(slug asc)`
);

let problems = 0;
const idemFail = [];

for (const r of rows) {
  const src = r.chokingHazardAssessment;
  const once = qualifyClaimText(src).text;
  const twice = qualifyClaimText(once).text;
  const issues = [];

  if (once !== twice) idemFail.push(r.slug);

  const low = once.toLowerCase();
  for (const p of PROHIBITED) {
    if (low.includes(p)) issues.push(`prohibited phrase survives: "${p}"`);
  }
  if (FRAGMENT.test(once)) issues.push("looks like a mid-word splice fragment");
  if (/\s{2,}/.test(once)) issues.push("doubled whitespace");
  if (/[.!?]\s*[.!?]/.test(once)) issues.push("doubled sentence punctuation");
  if (/\b(\w+)\.\1\b/i.test(once)) issues.push("repeated token across a period");
  // A trailing clause with no verb and no capital start, e.g. "...older.nths and up."
  if (/\.[a-z]{2,6}\s+\w+\.$/.test(once)) issues.push("trailing fragment after a period");

  if (issues.length) {
    problems++;
    console.log(`\n${r.slug}`);
    console.log(`  stored  : ${src}`);
    console.log(`  rendered: ${once}`);
    issues.forEach((i) => console.log(`  ISSUE   : ${i}`));
  }
}

console.log(`\nchecked ${rows.length} stored assessments`);
console.log(`  with artifacts in rendered output : ${problems}`);
console.log(`  non-idempotent                    : ${idemFail.length}${idemFail.length ? " -> " + idemFail.join(", ") : ""}`);
process.exit(problems > 0 || idemFail.length > 0 ? 1 : 0);
