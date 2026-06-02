/**
 * Applies VERIFIED Amazon ASINs to products as direct /dp/{ASIN} affiliate links.
 *
 * Input: a JSON file mapping reviewId -> ASIN (only verified ASINs belong here).
 * Products NOT present in the map keep their existing (search-link) affiliateLinks.
 *
 * The stored URL does NOT include the tag — BuyButton.buildAmazonUrl appends it.
 *
 * Usage: SANITY_API_TOKEN="..." node scripts/apply-verified-asins.mjs <map.json>
 */
import { createClient } from '@sanity/client';
import { readFileSync } from 'node:fs';

const client = createClient({
  projectId: 'ofvgjgsi',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

const TAG = 'safeneststore-20';
const ASIN_RE = /^B[0-9A-Z]{9}$/; // standard ASIN format

const mapFile = process.argv[2];
if (!mapFile) {
  console.error('Usage: node scripts/apply-verified-asins.mjs <map.json>');
  process.exit(1);
}

const map = JSON.parse(readFileSync(mapFile, 'utf-8'));

async function main() {
  const entries = Object.entries(map);
  console.log(`🔗 Applying ${entries.length} verified direct product links...\n`);
  let ok = 0;
  const bad = [];

  for (const [reviewId, asin] of entries) {
    if (!ASIN_RE.test(asin)) {
      bad.push(`${reviewId}: invalid ASIN format "${asin}"`);
      continue;
    }
    const url = `https://www.amazon.com/dp/${asin}`;
    await client
      .patch(reviewId)
      .set({
        affiliateLinks: [
          {
            _type: 'affiliateLink',
            _key: 'amazon-direct',
            partnerId: 'amazon',
            url,
            tag: TAG,
          },
        ],
      })
      .commit();
    ok++;
    console.log(`  ✓ ${reviewId} → ${asin}`);
  }

  console.log(`\n✅ ${ok} products set to direct links.`);
  if (bad.length) {
    console.log(`⚠️  Skipped ${bad.length}:`);
    bad.forEach((b) => console.log('   - ' + b));
  }
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
