#!/usr/bin/env node
/**
 * Remove unsupported verification claims from portable-text BODY content.
 *
 * A sibling script fixes `excerpt`. This one walks `body[].children[].text`,
 * which is where the seed scripts put the same phrasing — and where it actually
 * renders on the guide and article pages. Fixing excerpts alone left the claim
 * live on 14 pages.
 *
 * Same distinction as everywhere else in this codebase:
 *   "independently ..."     removed — SafeNest is not a third party to itself
 *   "parent-tested"         removed — implies physical testing
 *   "vetted by parents"     removed — same
 *   "safety-scored"         KEPT    — a score really is produced
 *   "recall-checked"        KEPT    — recalls really are checked
 *
 * Only the specific text spans that match are rewritten; block structure, keys
 * and marks are preserved so nothing about the document layout changes.
 *
 * Usage:
 *   node scripts/fix-body-claim-text.mjs --dry-run
 *   node scripts/fix-body-claim-text.mjs
 */

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "ofvgjgsi";
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const TOKEN = process.env.SANITY_API_TOKEN;
const DRY_RUN = process.argv.includes("--dry-run");

if (!TOKEN) {
  console.error("SANITY_API_TOKEN is required");
  process.exit(1);
}

/** Longest / most specific first. */
const REPLACEMENTS = [
  ["independently safety-scored and parent-tested", "safety-scored and recall-checked"],
  ["independently safety-scored and recall-checked", "safety-scored and recall-checked"],
  ["independently safety-scored and checked for recalls", "safety-scored and checked for recalls"],
  ["independently safety-scored by SafeNest Toys", "safety-scored by SafeNest Toys"],
  ["been independently safety-scored", "been safety-scored"],
  ["are independently safety-scored", "are safety-scored"],
  ["is independently safety-scored", "is safety-scored"],
  ["each independently safety-scored", "each safety-scored"],
  ["every one independently safety-scored", "every one safety-scored"],
  ["Independently safety-scored", "Safety-scored"],
  ["independently safety-scored", "safety-scored"],
  ["our independent safety score", "our editorial safety score"],
  ["independent safety score", "SafeNest's editorial safety score"],
  ["parent-tested", "parent-researched"],
  ["vetted by parents", "researched by parents"],
  ["The safest, most engaging", "Parent-researched, engaging"],
  // SafeNest scoring its own products is not independent scoring.
  ["independently scored out of 100", "scored out of 100"],
  ["Browse our independently scored", "Browse our safety-scored"],
  ["our independently scored", "our safety-scored"],
  ["independently scored", "safety-scored"],
];

/**
 * Uses of "independent" that are TRUE and must survive.
 *
 * ASTM F963 and CPSIA really are independent standards; calling them that is
 * accurate. The false claim is SafeNest describing its OWN scoring as
 * independent. A span containing only these is left alone and not reported.
 */
const LEGITIMATE = [
  "independent safety certifications",
  "independent certifications",
  "independent standard",
  "independent lab",
];

const TRIGGER = /independent|parent-tested|vetted by parents/i;

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
  `*[_type in ["buyingGuide","blogPost","safetyArticle","ageBasedGuide"] && defined(body)]{_id, _type, "slug": slug.current, body}`
);

const mutations = [];
let touchedDocs = 0;
let touchedSpans = 0;
let stillDirty = [];

for (const doc of docs) {
  let changed = false;
  const nextBody = doc.body.map((block) => {
    if (!block?.children) return block;
    const children = block.children.map((child) => {
      if (typeof child?.text !== "string" || !TRIGGER.test(child.text)) return child;
      const next = rewrite(child.text);
      if (next === child.text) {
        const lower = child.text.toLowerCase();
        // Strip the accurate uses, then see whether any claim actually remains.
        let residual = lower;
        for (const ok of LEGITIMATE) residual = residual.split(ok).join("");
        if (TRIGGER.test(residual)) {
          stillDirty.push(`${doc._type}/${doc.slug}: ${child.text.slice(0, 110)}`);
        }
        return child;
      }
      changed = true;
      touchedSpans++;
      return { ...child, text: next };
    });
    return { ...block, children };
  });

  if (!changed) continue;
  touchedDocs++;
  console.log(`  ${doc._type}/${doc.slug}`);
  mutations.push({ patch: { id: doc._id, set: { body: nextBody } } });
}

console.log(
  `\n${docs.length} document(s) scanned · ${touchedDocs} to update · ${touchedSpans} text span(s) rewritten.${DRY_RUN ? " (dry run)" : ""}`
);

if (stillDirty.length) {
  console.log(`\n${stillDirty.length} span(s) matched the trigger but no rule applied — review by hand:`);
  for (const s of stillDirty.slice(0, 10)) console.log(`  ${s}`);
}

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
