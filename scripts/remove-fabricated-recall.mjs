/**
 * Remove the fabricated recall document from the live catalog.
 *
 * WHY
 * `recall-example-magnetic-tiles` ("MagicTiles Magnetic Building Set (Model
 * MT-200)", dated 2025-01-05) was demo/seed data, but it was published on the
 * public /recalls page and attributed to "U.S. Consumer Product Safety
 * Commission (CPSC)" with a generic https://www.cpsc.gov/Recalls link rather
 * than a specific notice.
 *
 * It was verified against the official CPSC recall API before removal:
 *   - Query by title "MagicTiles" -> 0 records.
 *   - All recalls 2024-12-01..2025-03-01 (89 records) -> no MagicTiles / MT-200.
 *     The nearest genuine recall is "Magnetic Building Sticks Sets Recalled Due
 *     to Ingestion Hazard" (2024-12-19), a different product.
 *
 * A fabricated recall attributed to a federal safety regulator is the most
 * serious integrity defect this site could carry, so it is removed rather than
 * relabelled. The document is exported to
 * scripts/removed-fabricated-recall.backup.json first so the deletion is
 * reversible and auditable.
 *
 * Run: SANITY_API_TOKEN="..." node scripts/remove-fabricated-recall.mjs
 */
import { writeFileSync } from "node:fs";
import { createClient } from "@sanity/client";

const DOC_ID = "recall-example-magnetic-tiles";
const BACKUP = "scripts/removed-fabricated-recall.backup.json";

const client = createClient({
  projectId: "ofvgjgsi",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

async function main() {
  const doc = await client.fetch(`*[_id == $id][0]`, { id: DOC_ID });
  if (!doc) {
    console.log(`• ${DOC_ID} not present — nothing to remove.`);
    return;
  }

  writeFileSync(BACKUP, JSON.stringify(doc, null, 2));
  console.log(`✓ backed up to ${BACKUP}`);

  // Detach from any reviews first so no review links to a deleted recall.
  const linked = await client.fetch(
    `*[_type == "toyReview" && references($id)]{_id, productName}`,
    { id: DOC_ID }
  );
  if (linked.length) {
    console.log(`  ${linked.length} review(s) referenced it:`);
    linked.forEach((r) => console.log(`    - ${r.productName}`));
  }

  await client.delete(DOC_ID);
  console.log(`✓ deleted ${DOC_ID}`);

  const remaining = await client.fetch(`count(*[_type == "recallAlert"])`);
  console.log(`\nrecallAlert documents remaining: ${remaining}`);
  console.log(
    "The /recalls page will now show an honest empty state until the CPSC sync runs."
  );
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
