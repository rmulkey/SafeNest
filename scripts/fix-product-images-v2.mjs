/**
 * Use images from Target.com's open CDN (target.scene7.com) which serves
 * product images publicly without authentication.
 */
import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'ofvgjgsi',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

// Target.scene7.com serves product images publicly.
// Format: https://target.scene7.com/is/image/Target/DPCI_NUMBER
// Alternative: Use open product image APIs
const productImages = [
  // Melissa Doug Wooden Blocks - Target DPCI
  { reviewId: 'review-wooden-blocks', url: 'https://target.scene7.com/is/image/Target/GUEST_b7a9e7c6-6091-45dc-85ab-fc91bf0e498e?wid=800&qlt=80', alt: 'Melissa & Doug Wooden Building Blocks Set - 100 blocks in 4 colors' },
  // MEGA BLOKS
  { reviewId: 'review-mega-bloks', url: 'https://target.scene7.com/is/image/Target/GUEST_48e6c00c-3a54-4a57-9230-60f05dba54ad?wid=800&qlt=80', alt: 'MEGA BLOKS First Builders Big Building Bag 80 pieces' },
  // Fisher-Price Shape Sorter
  { reviewId: 'review-shape-sorter', url: 'https://target.scene7.com/is/image/Target/GUEST_4f98dbbf-f108-4d60-8c9d-3b20f4e62793?wid=800&qlt=80', alt: 'Fisher-Price Babys First Blocks Shape Sorter' },
  // Step2 Water Table
  { reviewId: 'review-water-table', url: 'https://target.scene7.com/is/image/Target/GUEST_61b0b1ac-d07e-455d-b3f3-7b3c42c3e7d9?wid=800&qlt=80', alt: 'Step2 Rain Showers Splash Pond Water Table' },
  // Hape Xylophone
  { reviewId: 'review-hape-xylophone', url: 'https://target.scene7.com/is/image/Target/GUEST_5f77fb86-d2e4-4736-bf65-8e82daa82e3b?wid=800&qlt=80', alt: 'Hape Pound and Tap Bench with Slide Out Xylophone' },
  // VTech Walker
  { reviewId: 'review-vtech-sit-to-stand', url: 'https://target.scene7.com/is/image/Target/GUEST_ef1fa9d6-4038-4e88-889a-ca6dbece66e4?wid=800&qlt=80', alt: 'VTech Sit-to-Stand Learning Walker' },
  // Little Tikes Cozy Coupe
  { reviewId: 'review-little-tikes-cozy-coupe', url: 'https://target.scene7.com/is/image/Target/GUEST_6f1bc58c-2ece-4c0b-a45b-02ac2068ad3d?wid=800&qlt=80', alt: 'Little Tikes Cozy Coupe 30th Anniversary ride-on' },
  // Radio Flyer
  { reviewId: 'review-radio-flyer-wagon', url: 'https://target.scene7.com/is/image/Target/GUEST_57d89ba5-2c79-4a5e-ba09-1bfaa9f91ae8?wid=800&qlt=80', alt: 'Radio Flyer Classic Red Wagon' },
];

async function uploadAndLink(reviewId, imageUrl, alt) {
  const resp = await fetch(imageUrl);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const contentType = resp.headers.get('content-type') || 'image/jpeg';
  const buf = await resp.arrayBuffer();
  const asset = await client.assets.upload('image', Buffer.from(buf), {
    filename: `${reviewId}.jpg`,
    contentType,
  });
  await client.patch(reviewId).set({
    mainImage: { _type: 'image', alt, asset: { _type: 'reference', _ref: asset._id } }
  }).commit();
  return asset._id;
}

async function main() {
  console.log('📸 Attempting Target CDN images...\n');
  let success = 0, fail = 0;

  for (const { reviewId, url, alt } of productImages) {
    try {
      await uploadAndLink(reviewId, url, alt);
      success++;
      console.log(`  ✓ ${reviewId}`);
    } catch (e) {
      fail++;
      console.log(`  ✗ ${reviewId}: ${e.message}`);
    }
  }

  console.log(`\n${success} uploaded, ${fail} failed`);
}

main();
