import { createClient } from '@sanity/client';
const client = createClient({ projectId: 'ofvgjgsi', dataset: 'production', apiVersion: '2024-01-01', useCdn: false, token: process.env.SANITY_API_TOKEN });

const images = [
  { reviewId: 'review-water-table', url: 'https://images.unsplash.com/photo-1527525443983-6e60c75fff46?w=800&q=80', alt: 'Children playing with water toys on a sunny day' },
  { reviewId: 'review-sensory-bin', url: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=80', alt: 'Toddler engaged in colorful sensory play activity' },
  { reviewId: 'review-manhattan-toy-skwish', url: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800&q=80', alt: 'Wooden baby rattle and teething toy' },
  { reviewId: 'review-b-toys-bristle-blocks', url: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=800&q=80', alt: 'Colorful interlocking blocks for creative building' },
];

for (const { reviewId, url, alt } of images) {
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const buf = await resp.arrayBuffer();
    const asset = await client.assets.upload('image', Buffer.from(buf), { filename: `${reviewId}.jpg`, contentType: 'image/jpeg' });
    await client.patch(reviewId).set({ mainImage: { _type: 'image', alt, asset: { _type: 'reference', _ref: asset._id } } }).commit();
    console.log(`✓ ${reviewId}`);
  } catch (e) { console.log(`✗ ${reviewId}: ${e.message}`); }
}
