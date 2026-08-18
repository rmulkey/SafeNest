#!/usr/bin/env node
/**
 * Repair the four paragraphs in the 2026 top-7 roundup that borrowed the old
 * generator's phrasing.
 *
 * WHY THIS EXISTS
 * This post is hand-written, but its opening, methodology aside and one product
 * blurb were lifted from the automated generator's templates — including the two
 * claims of first-hand experience ("a toy we'd happily hand our own kids", "a toy
 * we'd trust without a second thought"). SafeNest has not handled these products.
 * The methodology page says so. Rewriting the generator does not touch a post a
 * human copied it into.
 *
 * Each replacement below keeps every fact from the original — scores, ages,
 * materials, the ASTM F963/CPSIA reference, the recycled-milk-jug detail — and
 * changes only the claims SafeNest cannot support and the phrases that read as
 * template filler.
 *
 * Targeted by block _key, so the rest of the article is untouched.
 *
 * Usage:
 *   node scripts/fix-post-voice-top7.mjs --dry-run
 *   node scripts/fix-post-voice-top7.mjs
 */
const DRY_RUN = process.argv.includes("--dry-run");
const TOKEN = process.env.SANITY_API_TOKEN;
const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "ofvgjgsi";
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";

if (!TOKEN) {
  console.error("SANITY_API_TOKEN required");
  process.exit(1);
}

const SLUG = "top-7-child-safe-toys-2026";

/** blockKey -> replacement text. Facts preserved; claims and filler removed. */
const REPLACEMENTS = {
  // Was: "…we've spent years sorting the truly excellent toys from the merely
  // loud ones… every one of them is a toy we'd happily hand our own kids."
  p1:
    "Toy packaging is built to sell, not to inform, and the two questions we " +
    "actually want answered are rarely on the box: what is it made of, and is it " +
    "right for the age we're buying for. These seven scored highest in our " +
    "catalog for 2026 on the safety side. We have not handled them — the score " +
    "comes from published product information, not from a shelf in our house.",

  // Was: "…No sponsorships, no guesswork. Here's the shortlist, best-first."
  p3:
    "Each one is scored out of 100 on material information, choking-risk " +
    "research, recall history and certification claims, then checked against " +
    "current CPSC recall data. We take no sponsorships and no payment for " +
    "placement. Ordered best-first.",

  // Was: "…A score in the 90s means a toy we'd trust without a second thought.
  // Every toy here cleared that bar."
  p7:
    "The Safety Score weighs four things: what a toy is reported to be made of, " +
    "whether its published dimensions and warnings suggest a choking risk for " +
    "its age, its recall history, and which certifications the manufacturer " +
    "claims (ASTM F963 and CPSIA being the two that matter most in the US). A " +
    "score in the 90s means the published information is both reassuring and " +
    "reasonably complete — which is not the same as a toy being proven safe.",

  // Was: "…about as worry-free as a first toy gets — and they double as bath and
  // sand scoops as your child grows."
  p12:
    "Safety 95/100 · Development 74/100 · Ages 6–36 months. Reported as 100% " +
    "recycled milk jugs with no BPA, phthalates or external coatings, which is " +
    "about as short as a materials list gets — and a short materials list is " +
    "the main reason this one scores where it does. They also work as bath and " +
    "sand scoops later, which is why they tend to outlast the nesting stage.",
};

async function q(groq, params = {}) {
  const url = new URL(
    `https://${PROJECT_ID}.api.sanity.io/v2024-01-01/data/query/${DATASET}`
  );
  url.searchParams.set("query", groq);
  for (const [k, v] of Object.entries(params))
    url.searchParams.set(`$${k}`, JSON.stringify(v));
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const json = await res.json();
  if (json.error) throw new Error(JSON.stringify(json.error));
  return json.result;
}

const doc = await q(
  `*[_type=="blogPost" && slug.current==$slug][0]{_id, "body": body}`,
  { slug: SLUG }
);
if (!doc) {
  console.error(`No post found for slug "${SLUG}"`);
  process.exit(1);
}

let changed = 0;
const body = doc.body.map((block) => {
  const replacement = REPLACEMENTS[block._key];
  if (!replacement || block._type !== "block") return block;
  const oldText = (block.children ?? []).map((c) => c.text).join("");
  console.log(`  ${block._key}`);
  console.log(`    was: ${oldText.slice(0, 110)}…`);
  console.log(`    now: ${replacement.slice(0, 110)}…\n`);
  changed++;
  // Collapse to a single span. These blocks carry no marks or links.
  return {
    ...block,
    children: [
      {
        _type: "span",
        _key: `${block._key}s0`,
        text: replacement,
        marks: [],
      },
    ],
    markDefs: [],
  };
});

const missing = Object.keys(REPLACEMENTS).filter(
  (k) => !doc.body.some((b) => b._key === k)
);
if (missing.length) {
  console.error(`Block key(s) not found, aborting rather than half-applying: ${missing.join(", ")}`);
  process.exit(1);
}

console.log(`${changed} block(s) to rewrite.${DRY_RUN ? " (dry run)" : ""}`);
if (DRY_RUN) {
  console.log("Dry run: nothing written.");
  process.exit(0);
}

const res = await fetch(
  `https://${PROJECT_ID}.api.sanity.io/v2024-01-01/data/mutate/${DATASET}`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mutations: [{ patch: { id: doc._id, set: { body } } }],
    }),
  }
);
const json = await res.json();
if (json.error) throw new Error(JSON.stringify(json.error));
console.log("Applied.");
