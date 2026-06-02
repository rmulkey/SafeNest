/**
 * Verify each image URL in a JSON map returns HTTP 200, an image/* content-type,
 * and a body larger than 2KB. Exits non-zero if any fail.
 *
 * Usage: node scripts/verify-images.mjs scripts/images-25-real.json
 */
import { readFileSync } from 'node:fs';

const mapFile = process.argv[2];
if (!mapFile) {
  console.error('Usage: node scripts/verify-images.mjs <map.json>');
  process.exit(1);
}

const MAP = JSON.parse(readFileSync(mapFile, 'utf-8'));
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

async function check(id, url) {
  const resp = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8' },
  });
  const ct = resp.headers.get('content-type') || '';
  const buf = await resp.arrayBuffer();
  const size = buf.byteLength;
  const ok = resp.ok && ct.startsWith('image/') && size > 2000;
  return { id, status: resp.status, ct, size, ok };
}

const results = [];
for (const [id, { url }] of Object.entries(MAP)) {
  try {
    const r = await check(id, url);
    results.push(r);
    console.log(`${r.ok ? '✓' : '✗'} ${id}  HTTP ${r.status}  ${r.ct}  ${r.size}B`);
  } catch (e) {
    results.push({ id, ok: false, err: e.message });
    console.log(`✗ ${id}  ERROR ${e.message}`);
  }
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} images verified.`);
if (failed.length) {
  console.log('FAILED:', failed.map((f) => f.id).join(', '));
  process.exit(2);
}
