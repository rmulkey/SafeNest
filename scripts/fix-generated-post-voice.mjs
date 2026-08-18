#!/usr/bin/env node
/**
 * Rewrite the published auto-generated roundups to match the corrected generator.
 *
 * WHY THIS EXISTS
 * Six blog posts were published by the fortnightly cron before its templates were
 * fixed. They share prose verbatim — 19 paragraphs appear in more than one
 * article — and they claim first-hand experience of products SafeNest has never
 * handled ("a toy we'd trust without a second thought", "in our own kids'
 * hands"), on a site whose methodology page states it performs no testing.
 * Fixing the generator stops new posts being written that way; it does nothing
 * about the six already indexed.
 *
 * This rebuilds each one's body using the same buildRoundupPost() the cron now
 * uses, from the products the post already references. Nothing is invented: the
 * product set, scores, ages, materials and images all come from the existing
 * review documents.
 *
 * Title, slug and publishedAt are preserved, so no URL changes and no redirect
 * is needed.
 *
 * Run with tsx, since it imports the generator's TypeScript directly rather than
 * duplicating the templates:
 *   npx tsx scripts/fix-generated-post-voice.mjs --dry-run
 *   npx tsx scripts/fix-generated-post-voice.mjs
 */
import { createClient } from "@sanity/client";
import {
  buildRoundupPost,
  TOPICS_BY_REF,
} from "../src/lib/catalog/generate-blog-post.ts";

const DRY_RUN = process.argv.includes("--dry-run");
const TOKEN = process.env.SANITY_API_TOKEN;
if (!TOKEN) {
  console.error("SANITY_API_TOKEN required");
  process.exit(1);
}

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "ofvgjgsi",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2024-01-01",
  token: TOKEN,
  useCdn: false,
});

const posts = await client.fetch(
  `*[_type == "blogPost" && _id match "blog-top-child-safe-*"] | order(publishedAt asc){
     _id, title, publishedAt, "slug": slug.current, "cat": category._ref,
     "picks": relatedReviews[]._ref
   }`
);

console.log(`Found ${posts.length} generated post(s).\n`);

const patches = [];

for (const post of posts) {
  const topic = TOPICS_BY_REF[post.cat];
  if (!topic) {
    console.log(`  SKIP     ${post.slug} — unknown category ref ${post.cat}`);
    continue;
  }

  // Rebuild from the exact products this post already references, in order, so
  // the article keeps covering the same toys it always covered.
  const products = await client.fetch(
    `*[_type == "toyReview" && _id in $ids]{
       _id, productName, brand, slug, safetyScore, developmentScore, ageRange,
       materials, hasActiveRecall,
       materialSafety, chokingRisk, recallHistory, certificationPresence,
       "imageRef": mainImage.asset._ref, "imageAlt": mainImage.alt
     }`,
    { ids: post.picks ?? [] }
  );

  if (products.length === 0) {
    console.log(`  SKIP     ${post.slug} — no referenced products resolved`);
    continue;
  }

  const rebuilt = buildRoundupPost(topic, products, new Date(post.publishedAt));
  if (!rebuilt) {
    console.log(`  SKIP     ${post.slug} — too few products to rebuild`);
    continue;
  }

  patches.push({
    patch: {
      id: post._id,
      // Title, slug and publishedAt deliberately untouched: the URL is indexed.
      set: { body: rebuilt.body, excerpt: rebuilt.excerpt },
    },
  });

  console.log(`  REWRITE  ${post.slug}  (${products.length} products)`);
}

console.log(`\n${patches.length} post(s) to rewrite.${DRY_RUN ? " (dry run)" : ""}`);

if (DRY_RUN || patches.length === 0) {
  if (DRY_RUN) console.log("Dry run: nothing written.");
  process.exit(0);
}

await client.mutate(patches);
console.log("Applied. Titles, slugs and publish dates unchanged.");
