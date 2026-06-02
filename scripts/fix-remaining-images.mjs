import { createClient } from '@sanity/client';
const client = createClient({ projectId: 'ofvgjgsi', dataset: 'production', apiVersion: '2024-01-01', useCdn: false, token: process.env.SANITY_API_TOKEN });

const fixes = [
  { reviewId: 'review-radio-flyer-wagon', imageUrl: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=80', alt: 'red wagon outdoor toy' },
  { reviewId: 'review-vtech-sit-to-stand', imageUrl: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=800&q=80', alt: 'baby learning walker toy' },
  { reviewId: 'review-b-toys-bristle-blocks', imageUrl: 'https://images.unsplash.com/photo-1560859251-d563a49c5e4a?w=800&q=80', alt: 'colorful interlocking blocks' },
];

for (const { reviewId, imageUrl, alt } of fixes) {
  try {
    const resp = await fetch(imageUrl);
    if (!resp.ok) { console.log(`FAIL ${reviewId}: ${resp.status}`); continue; }
    const buf = await resp.arrayBuffer();
    const asset = await client.assets.upload('image', Buffer.from(buf), { filename: `${reviewId}.jpg`, contentType: 'image/jpeg' });
    await client.patch(reviewId).set({ mainImage: { _type: 'image', alt, asset: { _type: 'reference', _ref: asset._id } } }).commit();
    console.log(`OK ${reviewId}`);
  } catch (e) { console.log(`ERR ${reviewId}: ${e.message}`); }
}
