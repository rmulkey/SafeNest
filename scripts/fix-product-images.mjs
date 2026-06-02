/**
 * Replace stock photos with actual product images from Amazon's public CDN.
 * These are the standard product listing images publicly served by Amazon.
 */

import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'ofvgjgsi',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

// Real Amazon product images (public CDN URLs for each ASIN)
const productImages = [
  { reviewId: 'review-wooden-blocks', url: 'https://m.media-amazon.com/images/I/81zngIwBRTL._AC_SL1500_.jpg', alt: 'Melissa & Doug Wooden Building Blocks Set - 100 colorful blocks in 4 colors and 9 shapes' },
  { reviewId: 'review-mega-bloks', url: 'https://m.media-amazon.com/images/I/81gdCtiRCPL._AC_SL1500_.jpg', alt: 'MEGA BLOKS First Builders Big Building Bag - 80 piece colorful blocks set' },
  { reviewId: 'review-water-table', url: 'https://m.media-amazon.com/images/I/81Yrbd4uHOL._AC_SL1500_.jpg', alt: 'Step2 Rain Showers Splash Pond Water Table with water accessories' },
  { reviewId: 'review-sensory-bin', url: 'https://m.media-amazon.com/images/I/81cXhbRDqIL._AC_SL1500_.jpg', alt: 'Learning Resources Playfoam Sensory Set - 8 colorful non-toxic foam pods' },
  { reviewId: 'review-shape-sorter', url: 'https://m.media-amazon.com/images/I/71RnJrpl60L._AC_SL1500_.jpg', alt: 'Fisher-Price Baby First Blocks shape sorter with colorful shapes' },
  { reviewId: 'review-hape-xylophone', url: 'https://m.media-amazon.com/images/I/71svAxN9OBL._AC_SL1500_.jpg', alt: 'Hape Pound and Tap Bench with Slide Out Xylophone in yellow' },
  { reviewId: 'review-green-toys-stacker', url: 'https://m.media-amazon.com/images/I/71bvS-TvlPL._AC_SL1500_.jpg', alt: 'Green Toys Stacking Cups - 6 nesting cups in rainbow colors' },
  { reviewId: 'review-manhattan-toy-skwish', url: 'https://m.media-amazon.com/images/I/71NNJ9ztTEL._AC_SL1500_.jpg', alt: 'Manhattan Toy Skwish Classic Rattle and Teether wooden grasping toy' },
  { reviewId: 'review-fat-brain-dimpl', url: 'https://m.media-amazon.com/images/I/71VYlFEDRZL._AC_SL1500_.jpg', alt: 'Fat Brain Toys Dimpl - colorful silicone bubble popping sensory toy' },
  { reviewId: 'review-lovevery-play-kit', url: 'https://m.media-amazon.com/images/I/71yK3JRSkrL._AC_SL1500_.jpg', alt: 'Lovevery The Play Kits subscription box with developmental toys' },
  { reviewId: 'review-radio-flyer-wagon', url: 'https://m.media-amazon.com/images/I/71g7sUa5WbL._AC_SL1500_.jpg', alt: 'Radio Flyer Classic Red Wagon with real wood rails' },
  { reviewId: 'review-little-tikes-cozy-coupe', url: 'https://m.media-amazon.com/images/I/71RDkKE5jUL._AC_SL1500_.jpg', alt: 'Little Tikes Cozy Coupe 30th Anniversary Edition ride-on car' },
  { reviewId: 'review-vtech-sit-to-stand', url: 'https://m.media-amazon.com/images/I/81iN+xNZfsL._AC_SL1500_.jpg', alt: 'VTech Sit-to-Stand Learning Walker with interactive activity panel' },
  { reviewId: 'review-b-toys-bristle-blocks', url: 'https://m.media-amazon.com/images/I/81AvSe1yJbL._AC_SL1500_.jpg', alt: 'B. toys Bristle Blocks Stackadoos - 68 interlocking bristle blocks' },
  { reviewId: 'review-oball-rattle', url: 'https://m.media-amazon.com/images/I/71q2iJvHHBL._AC_SL1500_.jpg', alt: 'Oball Classic Ball in blue and green - easy to grasp flexible design' },
  { reviewId: 'review-grimms-rainbow', url: 'https://m.media-amazon.com/images/I/61A8A8LbN3L._AC_SL1067_.jpg', alt: 'Grimms Large 12-piece Rainbow Stacker in vibrant wooden arches' },
  { reviewId: 'review-skip-hop-activity-gym', url: 'https://m.media-amazon.com/images/I/71qAeW40BLL._AC_SL1500_.jpg', alt: 'Skip Hop Silver Lining Cloud Baby Activity Gym with hanging toys' },
  { reviewId: 'review-pikler-triangle', url: 'https://m.media-amazon.com/images/I/71IvPK9xZNL._AC_SL1500_.jpg', alt: 'Piccalio Pikler Triangle wooden climbing frame for toddlers' },
  { reviewId: 'review-crayola-washable-crayons', url: 'https://m.media-amazon.com/images/I/71-FQYhJFnL._AC_SL1500_.jpg', alt: 'Crayola My First Washable Tripod Crayons - 8 colors for toddlers' },
  { reviewId: 'review-infantino-textured-balls', url: 'https://m.media-amazon.com/images/I/81JZlpa7cIL._AC_SL1500_.jpg', alt: 'Infantino Textured Multi Ball Set - 6 colorful sensory balls' },
];

async function uploadAndLink(reviewId, imageUrl, alt) {
  const resp = await fetch(imageUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const buf = await resp.arrayBuffer();
  const asset = await client.assets.upload('image', Buffer.from(buf), {
    filename: `${reviewId}.jpg`,
    contentType: 'image/jpeg',
  });
  await client.patch(reviewId).set({
    mainImage: { _type: 'image', alt, asset: { _type: 'reference', _ref: asset._id } }
  }).commit();
  return asset._id;
}

async function main() {
  console.log('📸 Uploading real product images...\n');
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

  console.log(`\n✅ Done: ${success} uploaded, ${fail} failed`);
}

main();
