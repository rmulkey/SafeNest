import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'ofvgjgsi',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

const images = [
  { reviewId: 'review-mega-bloks', imageUrl: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=800&q=80', altText: 'Colorful plastic building blocks for toddlers' },
  { reviewId: 'review-water-table', imageUrl: 'https://images.unsplash.com/photo-1544776193-352d25ca82cd?w=800&q=80', altText: 'Child playing with water toys outdoors' },
];

for (const { reviewId, imageUrl, altText } of images) {
  try {
    const resp = await fetch(imageUrl);
    if (!resp.ok) {
      console.log(`FAIL ${reviewId}: HTTP ${resp.status}, trying fallback...`);
      // Try a different image
      const fallbackUrl = reviewId === 'review-mega-bloks'
        ? 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80'
        : 'https://images.unsplash.com/photo-1472162072942-cd5147eb3902?w=800&q=80';
      const resp2 = await fetch(fallbackUrl);
      if (!resp2.ok) { console.log(`FAIL ${reviewId}: fallback also failed`); continue; }
      const buf = await resp2.arrayBuffer();
      const asset = await client.assets.upload('image', Buffer.from(buf), { filename: reviewId + '.jpg', contentType: 'image/jpeg' });
      await client.patch(reviewId).set({ mainImage: { _type: 'image', alt: altText, asset: { _type: 'reference', _ref: asset._id } } }).commit();
      console.log(`OK ${reviewId} (fallback)`);
      continue;
    }
    const buf = await resp.arrayBuffer();
    const asset = await client.assets.upload('image', Buffer.from(buf), { filename: reviewId + '.jpg', contentType: 'image/jpeg' });
    await client.patch(reviewId).set({ mainImage: { _type: 'image', alt: altText, asset: { _type: 'reference', _ref: asset._id } } }).commit();
    console.log(`OK ${reviewId}`);
  } catch(e) {
    console.log(`ERR ${reviewId}: ${e.message}`);
  }
}
