#!/usr/bin/env node
/**
 * Retire the duplicate auto-generated roundups that cover identical product sets.
 *
 * WHY THIS EXISTS
 * The fortnightly generator rotates topics back to each category every fourth
 * run, and the catalogue's top seven barely move in eight weeks. Building Toys
 * therefore published three times over the same seven products in the same
 * order, and Educational Toys twice — six URLs carrying three articles' worth of
 * content. Rewriting the prose could not fix it: any honest description of the
 * same seven toys is the same description. The generator now refuses to publish
 * when the picks are unchanged; this clears what already shipped.
 *
 * Each retired post's URL 301s to the newest post covering the same products.
 * Those redirects live in next.config.ts and MUST be deployed before this runs,
 * otherwise the URLs 404 in the gap.
 *
 * DESTRUCTIVE. Every document is written to a local JSON backup first, and
 * Sanity keeps its own document history, so this is recoverable two ways. The
 * script refuses to delete anything that is referenced by another document, and
 * refuses to delete a post whose redirect target is missing.
 *
 * Usage:
 *   node scripts/retire-duplicate-roundups.mjs --dry-run
 *   node scripts/retire-duplicate-roundups.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "ofvgjgsi";
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const TOKEN = process.env.SANITY_API_TOKEN;
const DRY_RUN = process.argv.includes("--dry-run");
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://safenesttoys.com";

if (!TOKEN) {
  console.error("SANITY_API_TOKEN required");
  process.exit(1);
}

/** retired slug -> the slug its URL should 301 to. Mirrors next.config.ts. */
const RETIRE = {
  "top-child-safe-building-toys-2026-w24": "top-child-safe-building-toys-2026-w32",
  "top-child-safe-building-toys-2026-w28": "top-child-safe-building-toys-2026-w32",
  "top-child-safe-educational-toys-2026-w26": "top-child-safe-educational-toys-2026-w30",
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

const toDelete = [];
const backup = [];
let blocked = 0;

for (const [slug, target] of Object.entries(RETIRE)) {
  const doc = await q(`*[_type=="blogPost" && slug.current==$s][0]`, { s: slug });
  if (!doc) {
    console.log(`  ALREADY GONE  ${slug}`);
    continue;
  }

  const targetDoc = await q(
    `*[_type=="blogPost" && slug.current==$s][0]{_id}`,
    { s: target }
  );
  if (!targetDoc) {
    console.log(`  BLOCKED       ${slug} — redirect target ${target} does not exist`);
    blocked++;
    continue;
  }

  const refs = await q(`count(*[references($id)])`, { id: doc._id });
  if (refs > 0) {
    console.log(`  BLOCKED       ${slug} — referenced by ${refs} other document(s)`);
    blocked++;
    continue;
  }

  // The redirect must already be live, or retiring the doc produces a 404.
  let redirectOk = false;
  try {
    const res = await fetch(`${SITE}/blog/${slug}`, { redirect: "manual" });
    const location = res.headers.get("location") ?? "";
    redirectOk = res.status === 308 || res.status === 301
      ? location.includes(target)
      : false;
    if (!redirectOk) {
      console.log(
        `  BLOCKED       ${slug} — live URL returns HTTP ${res.status}` +
          `${location ? ` -> ${location}` : ""}, expected a 301/308 to ${target}.` +
          ` Deploy next.config.ts first.`
      );
      blocked++;
      continue;
    }
  } catch (e) {
    console.log(`  BLOCKED       ${slug} — could not verify redirect (${e.message})`);
    blocked++;
    continue;
  }

  console.log(`  RETIRE        ${slug}`);
  console.log(`                301 verified -> /blog/${target}`);
  toDelete.push(doc._id);
  backup.push(doc);
}

if (blocked > 0) {
  console.error(
    `\nAborting: ${blocked} post(s) failed a safety check. Nothing deleted.`
  );
  process.exit(1);
}

console.log(`\n${toDelete.length} post(s) to retire.${DRY_RUN ? " (dry run)" : ""}`);

if (DRY_RUN || toDelete.length === 0) {
  if (DRY_RUN) console.log("Dry run: nothing deleted.");
  process.exit(0);
}

mkdirSync("backups", { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const path = `backups/retired-roundups-${stamp}.json`;
writeFileSync(path, JSON.stringify(backup, null, 2) + "\n");
console.log(`Backup written to ${path}`);

const res = await fetch(
  `https://${PROJECT_ID}.api.sanity.io/v2024-01-01/data/mutate/${DATASET}`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mutations: toDelete.map((id) => ({ delete: { id } })),
    }),
  }
);
const json = await res.json();
if (json.error) throw new Error(JSON.stringify(json.error));

console.log(`Deleted ${toDelete.length} document(s). URLs now 301 to their canonical post.`);
console.log("Recoverable from the backup above, or from Sanity document history.");
