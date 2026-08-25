#!/usr/bin/env node
/**
 * Tests for the negation logic in audit-stale-claims.
 *
 * The first version of that scanner reported 373 findings against production and
 * every one was a false positive: it matched "laboratory testing" inside the
 * site's own disclaimers ("... not laboratory testing or certification", "We do
 * not physically or laboratory test toys"). Acting on that output would have
 * meant deleting the exact language SafeNest is required to publish.
 *
 * Run: node scripts/audit-stale-claims.test.mjs
 */

const NEGATORS = [
  "not", "never", "without", "no", "cannot", "does not", "do not", "did not",
  "isn't", "aren't", "doesn't", "don't", "rather than", "instead of",
];
const NEGATION_WINDOW = 90;

function isNegated(content, index) {
  const before = content.slice(Math.max(0, index - NEGATION_WINDOW), index).toLowerCase();
  return NEGATORS.some((n) => new RegExp(`\\b${n.replace(/'/g, "['’]")}\\b`).test(before));
}

const LAB = /\blab(oratory)?\s+test(ed|ing|s)?\b/i;
const EXPERT = /expert[\s-]*reviewed/i;

const cases = [
  // [text, pattern, expectNegated, label]
  [
    "an editorial assessment based on publicly available information — not laboratory testing or certification.",
    LAB, true, "real disclaimer from /about",
  ],
  [
    "age guidance when it is available. We do not physically or laboratory test toys.",
    LAB, true, "real disclaimer from the homepage",
  ],
  [
    "SafeNest does not perform physical or laboratory testing, does not certify.",
    LAB, true, "real disclaimer from /transparency",
  ],
  [
    "Every toy goes through independent laboratory testing before we score it.",
    LAB, false, "an actual prohibited claim",
  ],
  [
    "Our laboratory testing confirms the materials are safe.",
    LAB, false, "prohibited claim, no negator",
  ],
  [
    "This content is never expert reviewed, because we employ no experts.",
    EXPERT, true, "negated expert-reviewed",
  ],
  [
    "All 138 toys are expert reviewed by our safety team.",
    EXPERT, false, "prohibited expert-reviewed claim",
  ],
  [
    "We rely on published documentation rather than laboratory testing.",
    LAB, true, "'rather than' negator",
  ],
  [
    "Scores are editorial and involve no laboratory testing of any kind.",
    LAB, true, "'no' negator",
  ],
];

let pass = 0;
let fail = 0;

for (const [text, pattern, expected, label] of cases) {
  const m = text.match(pattern);
  if (!m) {
    console.log(`  FAIL  pattern did not match at all — ${label}`);
    fail += 1;
    continue;
  }
  const got = isNegated(text, m.index);
  if (got === expected) {
    console.log(`  ok    negated=${String(got).padEnd(5)} ${label}`);
    pass += 1;
  } else {
    console.log(`  FAIL  negated=${got} expected=${expected} — ${label}`);
    console.log(`        ${text}`);
    fail += 1;
  }
}

console.log(`\n${fail === 0 ? "PASSED" : "FAILED"}: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
