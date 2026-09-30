/**
 * Drain the queuedProduct queue once from the command line.
 *
 * Mirrors what /api/cron/publish-products does, for local verification and for
 * operators without the cron secret handy. The publisher itself owns the
 * data-integrity gate: it re-verifies each product's affiliate URL and image
 * bytes and refuses to publish anything that fails, so running it by hand is no
 * less safe than letting the cron do it.
 *
 * The one thing the cron does that this cannot is revalidatePath, which is only
 * available inside a Next request. New pages therefore appear on the next
 * deployment or revalidation rather than immediately.
 *
 * Requires the tsx loader so the TypeScript publisher can be imported:
 *   SANITY_API_TOKEN="..." node --import tsx scripts/publish-queued-once.mjs
 *   SANITY_API_TOKEN="..." node --import tsx scripts/publish-queued-once.mjs --limit 10
 *   node --import tsx scripts/publish-queued-once.mjs --dry-run
 */
import { createClient } from "@sanity/client";

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const limitIdx = argv.indexOf("--limit");
const limit = limitIdx !== -1 ? Number(argv[limitIdx + 1]) : 5;

if (!Number.isFinite(limit) || limit < 1) {
  console.error(`--limit must be a positive number (got ${argv[limitIdx + 1]})`);
  process.exit(1);
}
if (!dryRun && !process.env.SANITY_API_TOKEN) {
  console.error("SANITY_API_TOKEN is required for a write run.");
  process.exit(1);
}

const client = createClient({
  projectId: "ofvgjgsi",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

const pending = await client.fetch(
  `*[_type == "queuedProduct" && status == "queued"] | order(_createdAt asc){
     productName, brand, certifications, factorEvidence,
     "certCount": count(coalesce(certificationEvidence, []))
   }`
);

console.log(`${pending.length} product(s) queued; limit ${limit}.\n`);
for (const p of pending.slice(0, limit)) {
  const certs = p.certifications?.length ?? 0;
  const gap = certs > 0 && p.certCount === 0 ? "  <-- certifications with no provenance" : "";
  console.log(
    `  ${p.productName}\n      factorEvidence=${p.factorEvidence ? "yes" : "NO"} ` +
      `certifications=${certs} certificationEvidence=${p.certCount}${gap}`
  );
}

if (dryRun) {
  console.log("\nDRY RUN — nothing published.");
  process.exit(0);
}

const { publishQueuedBatch } = await import("../src/lib/catalog/publish-queued.ts");

console.log(`\nPublishing...\n`);
const outcomes = await publishQueuedBatch(client, limit);

const by = (s) => outcomes.filter((o) => o.status === s);
for (const o of outcomes) {
  const mark =
    o.status === "published" ? "✓" : o.status === "skipped-duplicate" ? "•" : "✗";
  console.log(
    `  ${mark} ${o.productName} — ${o.status}${o.error ? `: ${o.error}` : ""}`
  );
}

console.log(
  `\npublished=${by("published").length} failed=${by("failed").length} ` +
    `duplicate=${by("skipped-duplicate").length} of ${outcomes.length} attempted`
);
process.exit(by("failed").length > 0 ? 1 : 0);
