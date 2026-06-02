/**
 * Upload product images to Sanity and link them to toy reviews.
 * Uses Unsplash source images (free, no auth required) as representative toy photos.
 * Run with: node scripts/upload-images.mjs
 */

import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'ofvgjgsi',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

// Map of review IDs to representative image URLs (Unsplash source - free to use)
const reviewImages = [
  {
    reviewId: 'review-wooden-blocks',
    imageUrl: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=800&q=80',
    altText: 'Colorful wooden building blocks stacked together',
  },
  {
    reviewId: 'review-mega-bloks',
    imageUrl: 'https://images.unsplash.com/photo-1587654780291-39c9404d7dd0?w=800&q=80',
    altText: 'Colorful plastic building blocks for toddlers',
  },
  {
    reviewId: 'review-water-table',
    imageUrl: 'https://images.unsplash.com/photo-1473946008478-332139fc4100?w=800&q=80',
    altText: 'Child playing with water toys outdoors',
  },
  {
    reviewId: 'review-sensory-bin',
    imageUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80',
    altText: 'Colorful sensory play materials for children',
  },
  {
    reviewId: 'review-shape-sorter',
    imageUrl: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800&q=80',
    altText: 'Educational shape sorting toy for babies',
  },
];

async function uploadImageFromUrl(imageUrl, filename) {
  console.log(`  ↓ Downloading: ${filename}...`);
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
  const buffer = await response.arrayBuffer();
  
  console.log(`  ↑ Uploading to Sanity...`);
  const asset = await client.assets.upload('image', Buffer.from(buffer), {
    filename,
    contentType: 'image/jpeg',
  });
  
  return asset;
}

async function seed() {
  console.log('🖼️  Uploading product images to Sanity...\n');

  for (const { reviewId, imageUrl, altText } of reviewImages) {
    try {
      const filename = `${reviewId}.jpg`;
      const asset = await uploadImageFromUrl(imageUrl, filename);
      
      // Patch the review with the image
      await client.patch(reviewId).set({
        mainImage: {
          _type: 'image',
          alt: altText,
          asset: {
            _type: 'reference',
            _ref: asset._id,
          },
        },
      }).commit();
      
      console.log(`  ✓ ${reviewId} → image linked (${asset._id})\n`);
    } catch (err) {
      console.error(`  ✗ Failed for ${reviewId}: ${err.message}\n`);
    }
  }

  console.log('✅ Image upload complete! Refresh your browser to see the images.');
}

seed().catch((err) => {
  console.error('❌ Script failed:', err.message);
  process.exit(1);
});
