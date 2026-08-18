#!/usr/bin/env node
/**
 * Flag copy that reads as machine-generated rather than parent-written.
 *
 * WHY THIS EXISTS
 * SafeNest's premise is that two homeschooling parents did this research for
 * their own kids and published it. That premise is the whole differentiator
 * against the scraped-affiliate-roundup sites it competes with, and it dies the
 * moment the prose reads like a template. This finds the tells.
 *
 * Three classes of finding, in descending severity:
 *
 *   ACCURACY  — copy that claims something the site elsewhere disclaims, e.g.
 *               "toys we've tested" when the methodology page says plainly that
 *               SafeNest performs no testing. A voice problem is cosmetic; this
 *               is the site contradicting itself.
 *   FIRSTHAND — claims of physical experience with a product nobody handled
 *               ("a toy we'd trust without a second thought"). Same failure mode
 *               as an invented ASIN: asserting something unverifiable as fact.
 *   VOICE     — LLM register tells. Corporate throat-clearing, tricolons,
 *               "not just X but Y", hedge stacking, uniform sentence rhythm.
 *
 * Usage:
 *   node scripts/audit-voice.mjs            # CMS content
 *   node scripts/audit-voice.mjs --verbose  # with the offending sentence
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "ofvgjgsi";
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const TOKEN = process.env.SANITY_API_TOKEN;
const VERBOSE = process.argv.includes("--verbose");

// ── Accuracy: the site says it does not do these things ──────────────────────
//
// These must only fire when SAFENEST is the subject. A manufacturer really does
// safety-test for the age it labels, so "improvised play the toy was never
// safety-tested for" is accurate and must not be flagged; likewise the
// NO_LAB_TESTING_NOTICE disclaimer ("Not independently laboratory tested by
// SafeNest") states the correct position and is not a claim. Earlier versions of
// this scanner flagged both, which is how a checker loses its credibility.
const NEGATED = /\b(not|never|no|without|does not|do not|cannot)\b[^.]{0,40}$/i;

const ACCURACY = [
  [/\b(we|our team|safenest)\s+(have\s+|has\s+|'ve\s+)?(tested|test|lab-tested|laboratory-tested)\b/i, 'claims SafeNest tests products; the methodology page says it does not'],
  [/\b(our|safenest'?s?)\s+(safety[- ])?tested\b/i, 'claims SafeNest testing'],
  [/\b(we|safenest)('ve| have)?\s*(independently\s+)?(measured|verified|certified|confirmed)\b/i, 'claims verification the site disclaims'],
  [/\bour team\b/i, '"our team" — it is two parents, and the site says so elsewhere'],
  [/\bhard at work\b/i, 'corporate filler implying a staff'],
  [/\bwe'?ve tested\b/i, 'claims testing'],
  [/\btoys we'?ve tested\b/i, 'claims testing'],
];

// ── First-hand experience with products nobody handled ───────────────────────
const FIRSTHAND = [
  [/\bwe'?d (happily |gladly )?(hand|give|put|buy)\b/i, 'implies first-hand judgement of a specific product'],
  [/\bwe'?d trust\b/i, 'implies first-hand trust of a product'],
  [/\bin our own kids'? hands\b/i, 'implies the product was used by their children'],
  [/\bwe'?d feel good about\b/i, 'implies first-hand endorsement'],
  [/\bour (kids|children) (love|loved|adore)\b/i, 'claims their children used the product'],
  [/\bwe (own|owned|use|used) (this|it)\b/i, 'claims ownership'],
];

// ── LLM register tells ────────────────────────────────────────────────────────
const VOICE = [
  [/\bit'?s worth (noting|mentioning)\b/i, 'throat-clearing'],
  [/\bit'?s important to (note|remember|understand)\b/i, 'throat-clearing'],
  [/\bwhen it comes to\b/i, 'filler transition'],
  [/\bin today'?s\b/i, 'essay filler'],
  [/\bnot just .{3,40} but\b/i, '"not just X but Y" — LLM cadence'],
  [/\bmore than just\b/i, '"more than just" — LLM cadence'],
  [/\bdelve\b/i, 'LLM vocabulary'],
  // "harness" is excluded: on a toy site it is nearly always a real product
  // part ("3-point harness"), not the verb.
  [/\b(seamless|robust|leverage|elevate|unlock|myriad|plethora|tapestry|testament)\b/i, 'LLM vocabulary'],
  [/\bharness(es|ing) the\b/i, 'LLM vocabulary (verb sense)'],
  [/\b(furthermore|moreover|additionally,|in conclusion|ultimately,)\b/i, 'essay connective'],
  [/\bpeace of mind\b/i, 'marketing cliché'],
  [/\bworry[- ]free\b/i, 'marketing cliché'],
  [/\brest assured\b/i, 'marketing cliché'],
  [/\bgame[- ]chang(er|ing)\b/i, 'marketing cliché'],
  // "perfect for" is only a problem attached to safety. "Perfect for a backyard
  // full of cousins" is editorial opinion about a use case and exactly the voice
  // this site wants; "perfect for a newborn" implies a safety judgement it
  // cannot make. Flagging both taught the earlier version of this scanner to be
  // ignored.
  [/\bperfect(ly)? safe\b/i, 'implies a safety guarantee'],
  [/\bperfect for (a |your |an )?(newborn|baby|infant|toddler)\b/i, 'implies a safety judgement about an age'],
  [/\bthe best .{0,30}(for your|money can)\b/i, 'superlative framing'],
  [/\blook no further\b/i, 'marketing cliché'],
  [/\bwhether you'?re .{3,50} or\b/i, '"whether you\'re X or Y" — LLM cadence'],
  [/\bdive (in|into)\b/i, 'LLM vocabulary'],
  [/\bat the end of the day\b/i, 'filler'],
  [/\bthat'?s where .{3,30} comes in\b/i, 'infomercial cadence'],
  [/\bnavigat(e|ing) the world of\b/i, 'LLM cadence'],
  [/\bempower(s|ing|ed)?\b/i, 'corporate vocabulary'],
  [/\bcurated\b/i, 'marketing vocabulary'],
  [/\bhere'?s the thing\b/i, 'forced-casual filler'],
  [/\blet'?s (be honest|face it)\b/i, 'forced-casual filler'],
  [/\bno guesswork\b/i, 'repeated tagline filler'],
  [/\bin minutes\b/i, 'marketing cadence'],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function q(groq) {
  const url = new URL(`https://${PROJECT_ID}.api.sanity.io/v2024-01-01/data/query/${DATASET}`);
  url.searchParams.set("query", groq);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const json = await res.json();
  if (json.error) throw new Error(JSON.stringify(json.error));
  return json.result;
}

/** Flatten a Portable Text body to plain sentences. */
function blocksToText(body) {
  if (!Array.isArray(body)) return "";
  return body
    .filter((b) => b?._type === "block")
    .map((b) => (b.children || []).map((c) => c.text || "").join(""))
    .join("\n");
}

function scan(text, where, findings) {
  if (!text) return;
  for (const [group, rules] of [
    ["ACCURACY", ACCURACY],
    ["FIRSTHAND", FIRSTHAND],
    ["VOICE", VOICE],
  ]) {
    for (const [re, why] of rules) {
      const m = text.match(re);
      if (!m) continue;
      // Skip negated forms: a disclaimer stating SafeNest does NOT test is the
      // correct position, not a violation of it.
      const before = text.slice(Math.max(0, m.index - 45), m.index);
      if (group === "ACCURACY" && NEGATED.test(before)) continue;
      const i = Math.max(0, m.index - 60);
      findings.push({
        group,
        where,
        phrase: m[0],
        why,
        context: text.slice(i, m.index + m[0].length + 60).replace(/\s+/g, " ").trim(),
      });
    }
  }
}

/** Rhythm check: LLM prose has unusually uniform sentence lengths. */
function rhythm(text) {
  const sents = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim().split(/\s+/).length)
    .filter((n) => n > 2);
  if (sents.length < 6) return null;
  const mean = sents.reduce((a, b) => a + b, 0) / sents.length;
  const sd = Math.sqrt(sents.reduce((a, b) => a + (b - mean) ** 2, 0) / sents.length);
  return { count: sents.length, mean: +mean.toFixed(1), sd: +sd.toFixed(1), cv: +(sd / mean).toFixed(2) };
}

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e.startsWith(".")) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(p) && !/\.test\./.test(p)) out.push(p);
  }
  return out;
}

const findings = [];

// ── Codebase copy ────────────────────────────────────────────────────────────
for (const file of walk("src")) {
  const src = readFileSync(file, "utf-8");
  // Strip comments so internal notes are not audited as user-facing copy.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  scan(code, file.replace(/^src\//, "src/"), findings);
}

// ── CMS content ──────────────────────────────────────────────────────────────
const rhythms = [];
if (TOKEN) {
  const guides = await q(`*[_type=="buyingGuide"]{"slug":slug.current, title, excerpt, body}`);
  await sleep(200);
  const posts = await q(`*[_type=="blogPost"]{"slug":slug.current, title, excerpt, body}`);
  await sleep(200);
  const reviews = await q(
    `*[_type=="toyReview"]{"slug":slug.current, productName, chokingHazardAssessment, pros, cons}`
  );
  await sleep(200);
  const cats = await q(`*[_type=="category"]{"slug":slug.current, title, description}`);

  for (const g of guides) {
    const t = [g.excerpt, blocksToText(g.body)].filter(Boolean).join("\n");
    scan(t, `cms:buyingGuide/${g.slug}`, findings);
    const r = rhythm(t);
    if (r) rhythms.push({ what: `guide/${g.slug}`, ...r });
  }
  for (const p of posts) {
    const t = [p.excerpt, blocksToText(p.body)].filter(Boolean).join("\n");
    scan(t, `cms:blogPost/${p.slug}`, findings);
    const r = rhythm(t);
    if (r) rhythms.push({ what: `post/${p.slug}`, ...r });
  }
  for (const rv of reviews) {
    const t = [rv.chokingHazardAssessment, ...(rv.pros || []), ...(rv.cons || [])]
      .filter(Boolean)
      .join("\n");
    scan(t, `cms:toyReview/${rv.slug}`, findings);
  }
  for (const c of cats) scan(c.description, `cms:category/${c.slug}`, findings);
} else {
  console.log("(no SANITY_API_TOKEN — scanned codebase copy only)\n");
}

// ── Report ───────────────────────────────────────────────────────────────────
const order = { ACCURACY: 0, FIRSTHAND: 1, VOICE: 2 };
findings.sort((a, b) => order[a.group] - order[b.group] || a.where.localeCompare(b.where));

let last = "";
for (const f of findings) {
  if (f.group !== last) {
    const banner = { ACCURACY: "CONTRADICTS THE SITE'S OWN METHODOLOGY", FIRSTHAND: "CLAIMS FIRST-HAND EXPERIENCE OF A PRODUCT", VOICE: "READS AS MACHINE-WRITTEN" }[f.group];
    console.log(`\n${"═".repeat(78)}\n${f.group}  —  ${banner}\n${"═".repeat(78)}`);
    last = f.group;
  }
  console.log(`  ${f.where}`);
  console.log(`    "${f.phrase}"  — ${f.why}`);
  if (VERBOSE) console.log(`    …${f.context}…`);
}

const counts = findings.reduce((a, f) => ((a[f.group] = (a[f.group] || 0) + 1), a), {});
console.log(`\n${"─".repeat(78)}`);
console.log(
  `accuracy ${counts.ACCURACY || 0} · firsthand ${counts.FIRSTHAND || 0} · voice ${counts.VOICE || 0}`
);

if (rhythms.length) {
  // Coefficient of variation under ~0.45 means suspiciously even sentence
  // lengths — human writing varies far more than that.
  const flat = rhythms.filter((r) => r.cv < 0.45).sort((a, b) => a.cv - b.cv);
  console.log(`\nsentence-rhythm outliers (cv < 0.45 = uniform, machine-like):`);
  if (!flat.length) console.log("  none");
  for (const r of flat) {
    console.log(`  ${r.what.padEnd(50)} sentences=${String(r.count).padEnd(4)} mean=${String(r.mean).padEnd(6)} cv=${r.cv}`);
  }
}

const blocking = (counts.ACCURACY || 0) + (counts.FIRSTHAND || 0);
if (blocking > 0) {
  console.log(`\nFAILED: ${blocking} claim(s) contradict the site's stated methodology.`);
  process.exit(1);
}
console.log("\nPASSED: no self-contradicting claims.");
