/**
 * Write a verified product batch (from build-verified-queue.mjs) into the
 * Sanity `queuedProduct` queue. The daily publisher cron re-verifies each
 * product's affiliate URL and image bytes before publishing 5/day into the
 * live catalog, so nothing unverified can leak through.
 *
 * Usage: SANITY_API_TOKEN="..." node scripts/queue-verified.mjs scripts/verified-queue.json
 */
import { readFileSync } from "node:fs";
import { createClient } from "@sanity/client";

const inFile = process.argv[2];
if (!inFile) {
  console.error("Usage: node scripts/queue-verified.mjs <verified.json>");
  process.exit(1);
}
if (!process.env.SANITY_API_TOKEN) {
  console.error("SANITY_API_TOKEN env var is required");
  process.exit(1);
}

const client = createClient({
  projectId: "ofvgjgsi",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const products = JSON.parse(readFileSync(inFile, "utf-8"));

// Guard: skip products whose slug already exists as a live review, so we never
// create duplicate catalog entries.
const existingSlugs = new Set(
  await client.fetch(`*[_type == "toyReview"].slug.current`)
);

let queued = 0;
let skipped = 0;
for (const p of products) {
  const slug = slugify(p.productName);
  if (existingSlugs.has(slug)) {
    console.log(`• skip (already in catalog): ${p.productName}`);
    skipped++;
    continue;
  }
  const doc = {
    _id: `queued-${slug}`,
    _type: "queuedProduct",
    status: "queued",
    ...p,
  };
  await client.createOrReplace(doc);
  queued++;
  console.log(`✓ queued: ${p.productName}`);
}

console.log(
  `\n✅ ${queued} queued, ${skipped} skipped (already in catalog). The daily cron publishes 5/day after re-verification.`
);
