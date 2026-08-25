#!/usr/bin/env node
/**
 * Structural verification of served review HTML.
 *
 * The phrase scanner in scan-output-claims.mjs checks *what* the page says. This
 * checks *where* it says it, because the defect being guarded against here was
 * purely one of order:
 *
 *   The fourth evidence factor ("Certification claims") arrived after "How we
 *   assessed this toy", the testing and certification disclosures, the recall
 *   check and a Buy link. React had closed the factor list after "Recall
 *   history", left a <template> placeholder, and streamed the trailing <li>
 *   later in the document to be moved into position by a script.
 *
 * A unit test on the component cannot catch that, because the split is introduced
 * by the streaming renderer, not by the JSX. So this runs against real served
 * output and compares byte positions.
 *
 * Usage:
 *   node scripts/verify-review-output.mjs                       # live site
 *   node scripts/verify-review-output.mjs http://localhost:3100 # local build
 */

const BASE = (process.argv[2] || "https://safenesttoys.com").replace(/\/$/, "");

/** Representative reviews: the two named in the brief plus a spread of others. */
const SLUGS = [
  "green-toys-stacking-cups",
  "lovevery-play-kits-0-12",
  "kiwico-panda-crate",
  "oball-classic-ball",
  "hape-rainbow-bead-abacus",
  "fisher-price-giant-rock-a-stack",
  "step2-naturally-playful-sandbox",
];

/** Must appear in this relative order in the served HTML. */
const REQUIRED_ORDER = [
  "Material safety",
  "Choking risk",
  "Recall history",
  "Certification claims",
  "How we assessed this toy",
  "Testing status",
  "Recall check",
  "Who assessed this, and when",
  "Report a correction",
];

/**
 * Present, but not part of the strict byte-order check.
 *
 * These render after the evidence area in the DOM, but Next streams the evidence
 * tail into placeholders that sit earlier in the byte stream, so the panel's raw
 * offset can precede the resumed evidence text. Post-relocation order is
 * asserted separately by comparing placeholder positions.
 */
const REQUIRED_PRESENT_AFTER_RELOCATION = [
  "right for your child", // purchase-decision panel heading
  "Related Content",
];

/** Strings that must not appear at all. */
const FORBIDDEN = [
  "See the latest price and availability",
  "safety pick",
  "Our verdict",
  "Editorial scoring, with limits",
  "Developmentally staged by experts",
  "Expert-designed developmental activities",
  "2 years\u20133 years",
  "Check Price on Amazon", // superseded CTA wording
];

/** Things that must appear exactly once per page. */
const EXACTLY_ONCE = [
  "SafeNest scores are editorial research tools",
  "How we assessed this toy",
  "Evidence for each safety factor",
  "SafeNest editorial safety assessment",
];

/**
 * Must be present.
 *
 * The disclosure sentence is the canonical wording from
 * src/components/affiliate/AffiliateDisclosure.tsx (AFFILIATE_DISCLOSURE_TEXT).
 * It is duplicated here rather than imported because this script runs under plain
 * node with no TypeScript loader. AffiliateDisclosure.test.tsx pins the same
 * string, so changing the wording is a deliberate edit in two known places rather
 * than something that can drift silently — which is what happened when twelve
 * different phrasings of it accumulated across the codebase.
 */
const REQUIRED = [
  // BUY_CTA_LABEL from src/components/affiliate/BuyButton.tsx. Duplicated here
  // because this script runs under plain node with no TypeScript loader;
  // BuyButton.test.tsx pins the same string so the two cannot drift silently.
  "Check price at Amazon",
  "Some links here are affiliate links. If you buy through one we may earn a commission, at no extra cost to you — it never changes our scores or which toys we include.",
];

let failures = 0;
const fail = (slug, msg) => {
  console.log(`  FAIL  ${msg}`);
  failures++;
};

/**
 * Remove <script> contents before checking.
 *
 * Next inlines the serialised RSC payload in <script> tags interleaved through
 * the document, and it repeats every visible string. Counting occurrences
 * without stripping it double-reports everything. Markup is left intact so byte
 * positions still reflect the order a crawler and a screen reader consume.
 */
function htmlBodyOnly(html) {
  return html.replace(/<script[\s\S]*?<\/script>/g, (m) =>
    " ".repeat(m.length)
  );
}

for (const slug of SLUGS) {
  const url = `${BASE}/reviews/${slug}`;
  const res = await fetch(url);
  console.log(`\n${slug}  (HTTP ${res.status})`);
  if (!res.ok) {
    fail(slug, `HTTP ${res.status}`);
    continue;
  }
  const html = htmlBodyOnly(await res.text());

  // ── Order ────────────────────────────────────────────────────────────────
  const positions = [];
  for (const marker of REQUIRED_ORDER) {
    const i = html.indexOf(marker);
    if (i === -1) {
      fail(slug, `missing marker: "${marker}"`);
      positions.push(null);
    } else {
      positions.push(i);
    }
  }
  let orderOk = true;
  for (let i = 1; i < positions.length; i++) {
    const prev = positions[i - 1];
    const cur = positions[i];
    if (prev === null || cur === null) continue;
    if (cur < prev) {
      fail(
        slug,
        `out of order: "${REQUIRED_ORDER[i]}" (@${cur}) precedes "${REQUIRED_ORDER[i - 1]}" (@${prev})`
      );
      orderOk = false;
    }
  }
  if (orderOk) console.log(`  ok    all ${REQUIRED_ORDER.length} markers in order`);

  // ── Streamed placeholders ─────────────────────────────────────────────────
  // Next 16 with cacheComponents prerenders a shell and resumes the dynamic
  // parts, so <template id="P:n"> placeholders are expected somewhere in the
  // document — they are a streaming mechanism, not a defect. What matters is
  // that the resumed content still lands in the correct reading order, which
  // the order check above asserts.
  //
  // What must NOT happen is the disclosure arriving between the factors, which
  // is what the original defect looked like.
  const certPos = html.indexOf("Certification claims");
  const howPos = html.indexOf("How we assessed this toy");
  const recallHistPos = html.indexOf("Recall history");
  if (certPos !== -1 && howPos !== -1 && recallHistPos !== -1) {
    if (certPos > recallHistPos && certPos < howPos) {
      console.log(
        "  ok    fourth factor reads between 'Recall history' and 'How we assessed this toy'"
      );
    } else {
      fail(
        slug,
        `fourth factor misplaced: recall@${recallHistPos} cert@${certPos} how@${howPos}`
      );
    }
  }

  // ── Post-relocation order ────────────────────────────────────────────────
  // React writes the resumed segments into the <template> holes, so the DOM the
  // browser and a screen reader end up with follows hole position, not the
  // position of the streamed bytes. The holes for the evidence tail must sit
  // before the purchase panel for the final order to be correct.
  const panelPos = html.indexOf("right for your child");
  const holePositions = [...html.matchAll(/<template id="P:\d+">/g)].map(
    (m) => m.index
  );
  const evidenceHoles = holePositions.filter(
    (i) => i > recallHistPos && recallHistPos !== -1
  );
  if (panelPos !== -1 && evidenceHoles.length > 0) {
    if (Math.max(...evidenceHoles) < panelPos) {
      console.log(
        "  ok    evidence placeholders resolve before the purchase panel"
      );
    } else {
      fail(slug, "an evidence placeholder sits after the purchase panel");
    }
  }
  for (const phrase of REQUIRED_PRESENT_AFTER_RELOCATION) {
    if (!html.includes(phrase)) fail(slug, `missing: "${phrase}"`);
  }

  // ── Forbidden ─────────────────────────────────────────────────────────────
  const found = FORBIDDEN.filter((f) => html.includes(f));
  if (found.length) fail(slug, `forbidden string(s): ${found.join(", ")}`);
  else console.log("  ok    no forbidden strings");

  // ── Exactly once ──────────────────────────────────────────────────────────
  for (const phrase of EXACTLY_ONCE) {
    const n = html.split(phrase).length - 1;
    if (n !== 1) fail(slug, `"${phrase}" appears ${n}x, expected exactly 1`);
  }

  // ── Required ──────────────────────────────────────────────────────────────
  for (const phrase of REQUIRED) {
    if (!html.includes(phrase)) fail(slug, `missing required: "${phrase}"`);
  }
}

console.log(
  `\n${failures === 0 ? "PASSED" : "FAILED"}: ${failures} problem(s) across ${SLUGS.length} review pages`
);
process.exit(failures === 0 ? 0 : 1);
