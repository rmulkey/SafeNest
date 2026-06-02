/**
 * Replace fabricated /dp/{ASIN} affiliate links with Amazon SEARCH URLs.
 * Search URLs never 404, always show relevant products, and preserve the
 * affiliate tag so qualifying purchases still earn commission.
 *
 * Usage: SANITY_API_TOKEN="..." node scripts/fix-affiliate-links.mjs
 */
import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'ofvgjgsi',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

const TAG = 'safeneststore-20';

function buildSearchUrl(brand, productName) {
  // Avoid duplicating the brand if the product name already starts with it
  // (handles cases like brand "B. toys (Battat)" + name "B. toys Bristle Blocks").
  const normalizedBrand = brand.replace(/\s*\(.*?\)\s*/g, "").trim(); // strip parentheticals
  const nameLower = productName.toLowerCase();
  const brandLower = normalizedBrand.toLowerCase();
  const query =
    !normalizedBrand || nameLower.startsWith(brandLower) || nameLower.includes(brandLower)
      ? productName
      : `${normalizedBrand} ${productName}`;
  const k = encodeURIComponent(query.trim());
  // Do NOT include tag here — BuyButton.buildAmazonUrl appends it.
  return `https://www.amazon.com/s?k=${k}`;
}

async function main() {
  const reviews = await client.fetch(
    `*[_type == "toyReview"]{_id, productName, brand, affiliateLinks}`
  );

  console.log(`🔗 Rebuilding affiliate links for ${reviews.length} products...\n`);
  let updated = 0;

  for (const review of reviews) {
    const brand = review.brand || '';
    const searchUrl = buildSearchUrl(brand, review.productName);

    const newLinks = [
      {
        _type: 'affiliateLink',
        _key: 'amazon-search',
        partnerId: 'amazon',
        url: searchUrl,
        tag: TAG,
      },
    ];

    await client.patch(review._id).set({ affiliateLinks: newLinks }).commit();
    updated++;
    console.log(`  ✓ ${review.productName}`);
  }

  console.log(`\n✅ Updated ${updated} products with valid Amazon search links.`);
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
