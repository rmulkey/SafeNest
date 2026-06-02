/**
 * Merges the three ASIN batch files, drops nulls, and applies verified direct
 * /dp/{ASIN} links. Products with a null/missing ASIN keep their existing
 * search-link affiliateLinks (the safe fallback).
 *
 * Usage: SANITY_API_TOKEN="..." node scripts/merge-and-apply-asins.mjs
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
const ASIN_RE = /^B[0-9A-Z]{9}$/;

const batches = ['a', 'b', 'c'].map((b) =>
  JSON.parse(readFileSync(`scripts/asins-batch-${b}.json`, 'utf-8'))
);
const merged = Object.assign({}, ...batches);

async function main() {
  const all = Object.entries(merged);
  const verified = all.filter(([, asin]) => asin && ASIN_RE.test(asin));
  const skipped = all.filter(([, asin]) => !asin || !ASIN_RE.test(asin));

  console.log(`Applying ${verified.length} verified direct links; leaving ${skipped.length} on search-link fallback.\n`);

  for (const [reviewId, asin] of verified) {
    await client
      .patch(reviewId)
      .set({
        affiliateLinks: [
          {
            _type: 'affiliateLink',
            _key: 'amazon-direct',
            partnerId: 'amazon',
            url: `https://www.amazon.com/dp/${asin}`,
            tag: TAG,
          },
        ],
      })
      .commit();
    console.log(`  ✓ ${reviewId} → /dp/${asin}`);
  }

  if (skipped.length) {
    console.log(`\n⚠️  Kept on search-link fallback (no verified ASIN):`);
    skipped.forEach(([id]) => console.log(`   - ${id}`));
  }

  console.log(`\n✅ Done. ${verified.length} direct, ${skipped.length} fallback.`);
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
