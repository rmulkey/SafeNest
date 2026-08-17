#!/usr/bin/env node
/**
 * Remove unsupported verification claims from stored guide and article excerpts.
 *
 * WHAT IS WRONG AND WHY
 *   "independently ..."  implies third-party verification. SafeNest scores are its
 *                        own editorial judgement, so "independently" is the false
 *                        word — the scoring itself is real.
 *   "parent-tested"      implies physical testing, which SafeNest does not do.
 *   "vetted by parents"  same problem.
 *   "The safest ..."     superlative safety claim, already banned site-wide.
 *
 * DELIBERATELY KEPT, because both are true:
 *   "safety-scored"      a score really is produced for every product.
 *   "recall-checked"     recalls really are checked against CPSC data.
 *
 * These excerpts are what Google shows in search results, so they matter more
 * than body copy. Every edit is applied only when the stored text still matches
 * one of the known bad phrases; anything else is left alone and reported.
 *
 * Usage:
 *   node scripts/fix-guide-claim-excerpts.mjs --dry-run
 *   node scripts/fix-guide-claim-excerpts.mjs
 */

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "ofvgjgsi";
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const TOKEN = process.env.SANITY_API_TOKEN;
const DRY_RUN = process.argv.includes("--dry-run");

if (!TOKEN) {
  console.error("SANITY_API_TOKEN is required");
  process.exit(1);
}

/** Ordered: longer, more specific phrases first so they win. */
const REPLACEMENTS = [
  ["independently safety-scored and parent-tested by SafeNest Toys", "safety-scored and recall-checked by SafeNest Toys"],
  ["independently safety-scored by SafeNest Toys", "safety-scored by SafeNest Toys"],
  ["independently safety-scored and recall-checked", "safety-scored and recall-checked"],
  ["independently safety-scored and checked for recalls", "safety-scored and checked for recalls"],
  ["Independently safety-scored", "Safety-scored"],
  ["independently safety-scored", "safety-scored"],
  ["parent-tested", "parent-researched"],
  ["vetted by parents", "researched by parents"],
  // "independent safety score" reads as third-party scoring. The score is real;
  // its independence from Amazon is real; independence as *verification* is not.
  // Possessive form first: "our independent safety score" must not become
  // "our SafeNest's editorial safety score".
  ["our independent safety score", "our editorial safety score"],
  ["ranked by independent safety score", "ranked by SafeNest's editorial safety score"],
  ["our SafeNest's editorial safety score", "our editorial safety score"],
  ["independent safety score", "SafeNest's editorial safety score"],
  ["The safest, most engaging sensory toys", "Parent-researched, engaging sensory toys"],
  ["The safest, most engaging", "Parent-researched, engaging"],
  ["The safest ", "Parent-researched "],
];

const TRIGGER = /independent|parent-tested|vetted by parents|the safest/i;

async function query(groq) {
  const url = `https://${PROJECT_ID}.api.sanity.io/v2024-01-01/data/query/${DATASET}?query=${encodeURIComponent(groq)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const json = await res.json();
  if (json.error) throw new Error(JSON.stringify(json.error));
  return json.result;
}

async function mutate(mutations) {
  const res = await fetch(
    `https://${PROJECT_ID}.api.sanity.io/v2024-01-01/data/mutate/${DATASET}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ mutations }),
    }
  );
  const json = await res.json();
  if (json.error) throw new Error(JSON.stringify(json.error));
}

function rewrite(text) {
  let out = text;
  for (const [a, b] of REPLACEMENTS) out = out.split(a).join(b);
  return out;
}

const docs = await query(
  `*[_type in ["buyingGuide","blogPost","ageBasedGuide"] && defined(excerpt)]{_id, _type, "slug": slug.current, excerpt}`
);

const mutations = [];
let unchanged = 0;

for (const d of docs) {
  if (!TRIGGER.test(d.excerpt)) {
    unchanged++;
    continue;
  }
  const next = rewrite(d.excerpt);
  if (next === d.excerpt) {
    console.log(`SKIP  ${d._type}/${d.slug} — matched the trigger but no rule applied:`);
    console.log(`        "${d.excerpt}"`);
    continue;
  }
  console.log(`\n${d._type}/${d.slug}`);
  console.log(`  was: ${d.excerpt}`);
  console.log(`  now: ${next}`);
  mutations.push({ patch: { id: d._id, set: { excerpt: next } } });
}

console.log(
  `\n${docs.length} document(s) scanned, ${unchanged} already clean, ${mutations.length} to update.${DRY_RUN ? " (dry run)" : ""}`
);

if (DRY_RUN) {
  console.log("Dry run: nothing written.");
  process.exit(0);
}
if (mutations.length === 0) {
  console.log("Nothing to do.");
  process.exit(0);
}
await mutate(mutations);
console.log("Applied.");
