#!/usr/bin/env node
/**
 * Attribute manufacturer "expert" claims in stored review content.
 *
 * THE PROBLEM
 * Two reviews carried an unattributed expert claim as an editorial pro:
 *
 *   lovevery-play-kits-0-12  pros[0]  "Developmentally staged by experts"
 *   kiwico-panda-crate       pros[0]  "Expert-designed developmental activities"
 *
 * The issue is not that Lovevery or KiwiCo lack specialists — it is that as
 * written, the sentence reads as SafeNest's finding. SafeNest has not evaluated
 * anyone's credentials, so the claim has to name whose claim it is.
 *
 * WHAT THIS DOES NOT DO
 * It does not invent a professional type. Saying "designed with input from
 * paediatric occupational therapists" would require a source in the product data,
 * and there is none, so the replacement stays at the level the source supports:
 * the manufacturer describes it this way.
 *
 * Every edit is exact-match guarded: if the stored text is not byte-identical to
 * what is expected, the document is skipped and reported rather than overwritten.
 *
 * Usage:
 *   node scripts/fix-expert-attribution.mjs --dry-run
 *   node scripts/fix-expert-attribution.mjs
 */

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const TOKEN = process.env.SANITY_API_TOKEN;
const DRY_RUN = process.argv.includes("--dry-run");

if (!PROJECT_ID || !TOKEN) {
  console.error(
    "Missing NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_API_TOKEN in the environment."
  );
  process.exit(1);
}

/**
 * slug -> { field, index, expected, replacement, why }
 * `expected` must match the stored value exactly for the edit to apply.
 */
const EDITS = [
  {
    slug: "lovevery-play-kits-0-12",
    field: "pros",
    index: 0,
    expected: "Developmentally staged by experts",
    replacement: "The manufacturer describes the kits as developmentally staged",
    why: "Unattributed expert claim read as a SafeNest finding. SafeNest has not evaluated anyone's credentials, and the product data names no specific professional type.",
  },
  {
    slug: "kiwico-panda-crate",
    field: "pros",
    index: 0,
    expected: "Expert-designed developmental activities",
    replacement:
      "The manufacturer describes the activities as expert-designed",
    why: "Same defect: the claim is the manufacturer's, not SafeNest's, and no source identifies the experts.",
  },
];

async function query(groq, params = {}) {
  const url = new URL(
    `https://${PROJECT_ID}.api.sanity.io/v2024-01-01/data/query/${DATASET}`
  );
  url.searchParams.set("query", groq);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(`$${k}`, JSON.stringify(v));
  }
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const json = await res.json();
  if (json.error) throw new Error(JSON.stringify(json.error));
  return json.result;
}

async function mutate(mutations) {
  const res = await fetch(
    `https://${PROJECT_ID}.api.sanity.io/v2024-01-01/data/mutate/${DATASET}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mutations }),
    }
  );
  const json = await res.json();
  if (json.error) throw new Error(JSON.stringify(json.error));
  return json;
}

const mutations = [];
let skipped = 0;

for (const edit of EDITS) {
  const doc = await query(
    `*[_type == "toyReview" && slug.current == $slug][0]{ _id, productName, ${edit.field} }`,
    { slug: edit.slug }
  );

  if (!doc) {
    console.log(`SKIP  ${edit.slug} — no such review`);
    skipped++;
    continue;
  }

  const list = doc[edit.field];
  const actual = Array.isArray(list) ? list[edit.index] : undefined;

  if (actual !== edit.expected) {
    console.log(
      `SKIP  ${edit.slug} ${edit.field}[${edit.index}] — stored text differs, not overwriting\n` +
        `        expected: ${JSON.stringify(edit.expected)}\n` +
        `        actual:   ${JSON.stringify(actual)}`
    );
    skipped++;
    continue;
  }

  const next = [...list];
  next[edit.index] = edit.replacement;

  console.log(`\n${doc.productName}  (${edit.slug})`);
  console.log(`  field : ${edit.field}[${edit.index}]`);
  console.log(`  was   : ${edit.expected}`);
  console.log(`  now   : ${edit.replacement}`);
  console.log(`  why   : ${edit.why}`);

  mutations.push({ patch: { id: doc._id, set: { [edit.field]: next } } });
}

console.log(
  `\n${mutations.length} edit(s) to apply, ${skipped} skipped.${DRY_RUN ? " (dry run)" : ""}`
);

if (DRY_RUN) {
  console.log("Dry run: nothing was written.");
  process.exit(0);
}

if (mutations.length === 0) {
  console.log("Nothing to do.");
  process.exit(0);
}

await mutate(mutations);
console.log("Applied.");
