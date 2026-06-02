/**
 * Uploads product images to Sanity from a mapping of reviewId -> image URL.
 * The URLs come from official retailer CDNs (Target scene7, manufacturer sites)
 * extracted via rendered page fetches.
 *
 * Usage: SANITY_API_TOKEN="..." node scripts/upload-from-urls.mjs
 *
 * Edit the IMAGE_MAP below with reviewId -> { url, alt } entries.
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

// Load the image map from a JSON file passed as arg, or use inline map
const mapFile = process.argv[2];
const IMAGE_MAP = mapFile
  ? JSON.parse(readFileSync(mapFile, 'utf-8'))
  : {};

async function uploadOne(reviewId, url, alt) {
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const contentType = resp.headers.get('content-type') || 'image/jpeg';
  if (!contentType.startsWith('image/')) throw new Error(`Not an image: ${contentType}`);
  const buf = await resp.arrayBuffer();
  if (buf.byteLength < 2000) throw new Error(`Too small: ${buf.byteLength} bytes`);
  const asset = await client.assets.upload('image', Buffer.from(buf), {
    filename: `${reviewId}.jpg`,
    contentType,
  });
  await client.patch(reviewId).set({
    mainImage: { _type: 'image', alt, asset: { _type: 'reference', _ref: asset._id } },
  }).commit();
  return asset._id;
}

async function main() {
  const entries = Object.entries(IMAGE_MAP);
  console.log(`📸 Uploading ${entries.length} real product images...\n`);
  let ok = 0, fail = 0;
  const failed = [];

  for (const [reviewId, { url, alt }] of entries) {
    try {
      await uploadOne(reviewId, url, alt);
      ok++;
      console.log(`  ✓ ${reviewId}`);
    } catch (e) {
      fail++;
      failed.push(reviewId);
      console.log(`  ✗ ${reviewId}: ${e.message}`);
    }
  }

  console.log(`\n✅ ${ok} uploaded, ${fail} failed`);
  if (failed.length) console.log('Failed:', failed.join(', '));
}

main();
