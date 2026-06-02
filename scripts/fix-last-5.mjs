import { createClient } from '@sanity/client';
const client = createClient({ projectId: 'ofvgjgsi', dataset: 'production', apiVersion: '2024-01-01', useCdn: false, token: process.env.SANITY_API_TOKEN });

const images = [
  { reviewId: 'review-water-table', url: 'https://images.unsplash.com/photo-1473946008478-332139fc4100?w=800&q=80&fit=crop', alt: 'Child playing with water and colorful toys outdoors' },
  { reviewId: 'review-sensory-bin', url: 'https://images.unsplash.com/photo-1567093648940-b139875d68af?w=800&q=80&fit=crop', alt: 'Colorful sensory play materials for toddlers' },
  { reviewId: 'review-manhattan-toy-skwish', url: 'https://images.unsplash.com/photo-1604917621956-10dfa7cce7ed?w=800&q=80&fit=crop', alt: 'Natural wood baby grasping rattle toy' },
  { reviewId: 'review-b-toys-bristle-blocks', url: 'https://images.unsplash.com/photo-1587654780291-39c9404d7dd0?w=800&q=80&fit=crop', alt: 'Soft colorful interlocking building blocks for toddlers' },
  { reviewId: 'review-pikler-triangle', url: 'https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?w=800&q=80&fit=crop', alt: 'Toddler climbing on indoor wooden play structure' },
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
