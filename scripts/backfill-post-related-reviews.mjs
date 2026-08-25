#!/usr/bin/env node
/**
 * Populate `relatedReviews` on hand-written roundup posts from the review links
 * already present in their body text.
 *
 * WHY THIS EXISTS
 * The blog page now renders a buy CTA per product from `relatedReviews`. The
 * generated roundups have always written that field, but the two hand-written
 * roundups — top-7-child-safe-toys-2026 and top-7-toys-safe-fourth-of-july —
 * cite seven reviews each as inline links in the body and leave the field empty.
 * So the highest purchase-intent posts on the site would still render no buy path
 * while the machine-written ones did.
 *
 * Nothing is invented here. The script reads the `/reviews/{slug}` hrefs the
 * author already put in the article, resolves each to a real toyReview document,
 * and records those references in document order. A slug that does not resolve is
 * reported and skipped rather than guessed at.
 *
 * Usage:
 *   node scripts/backfill-post-related-reviews.mjs --dry-run
 *   node scripts/backfill-post-related-reviews.mjs
 */
const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "ofvgjgsi";
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const TOKEN = process.env.SANITY_API_TOKEN;
const DRY_RUN = process.argv.includes("--dry-run");

if (!TOKEN) {
  console.error("SANITY_API_TOKEN required");
  process.exit(1);
}

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

/** Every /reviews/{slug} href in a Portable Text body, in document order. */
function reviewSlugsFromBody(body) {
  const slugs = [];
  for (const block of body ?? []) {
    for (const def of block?.markDefs ?? []) {
      const href = def?.href ?? "";
      const m = /^\/reviews\/([a-z0-9-]+)\/?$/.exec(href);
      if (m && !slugs.includes(m[1])) slugs.push(m[1]);
    }
  }
  return slugs;
}

/*
 * Posts with no relatedReviews yet.
 *
 * The `!defined(...)` arm matters: in GROQ `count(null)` evaluates to null, and
 * `null == 0` is false, so a filter of `count(relatedReviews) == 0` alone silently
 * matches nothing when the field is absent entirely — which is exactly the state
 * of the posts this script exists to fix.
 */
const posts = await q(
  `*[_type == "blogPost" && (!defined(relatedReviews) || count(relatedReviews) == 0)]{
     _id, title, "slug": slug.current, body
   } | order(publishedAt asc)`
);

const mutations = [];

for (const post of posts) {
  const slugs = reviewSlugsFromBody(post.body);
  if (slugs.length === 0) {
    // Explainer articles cite no products. Correct to leave alone.
    console.log(`  skip      ${post.slug} — no review links in body`);
    continue;
  }

  const found = await q(
    `*[_type == "toyReview" && slug.current in $slugs]{_id, "slug": slug.current}`,
    { slugs }
  );
  const bySlug = new Map(found.map((r) => [r.slug, r._id]));

  const missing = slugs.filter((s) => !bySlug.has(s));
  if (missing.length) {
    console.log(`  WARN      ${post.slug} — unresolved slug(s): ${missing.join(", ")}`);
  }

  // Preserve the order the author used in the article.
  const refs = slugs
    .filter((s) => bySlug.has(s))
    .map((s, i) => ({
      _type: "reference",
      _ref: bySlug.get(s),
      _key: `rel${i}`,
    }));

  if (refs.length === 0) {
    console.log(`  skip      ${post.slug} — nothing resolved`);
    continue;
  }

  console.log(`  backfill  ${post.slug} — ${refs.length} review(s)`);
  mutations.push({ patch: { id: post._id, set: { relatedReviews: refs } } });
}

console.log(`\n${mutations.length} post(s) to update.${DRY_RUN ? " (dry run)" : ""}`);
if (DRY_RUN || mutations.length === 0) {
  if (DRY_RUN) console.log("Dry run: nothing written.");
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
    body: JSON.stringify({ mutations }),
  }
);
const json = await res.json();
if (json.error) throw new Error(JSON.stringify(json.error));
console.log("Applied. Body content unchanged — only the reference field was set.");
