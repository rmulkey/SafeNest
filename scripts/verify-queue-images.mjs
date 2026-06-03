/**
 * Verify candidate product image URLs return REAL image bytes before they are
 * queued. Reads a JSON array of { name, imageUrl } and reports pass/fail.
 *
 * Usage: node scripts/verify-queue-images.mjs scripts/queue-candidates.json
 */
import { readFileSync } from "node:fs";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/verify-queue-images.mjs <candidates.json>");
  process.exit(1);
}
const candidates = JSON.parse(readFileSync(file, "utf-8"));

async function verify(url) {
  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!resp.ok) return { ok: false, reason: `HTTP ${resp.status}` };
    const ct = resp.headers.get("content-type") || "";
    if (!ct.startsWith("image/")) return { ok: false, reason: `content-type ${ct || "none"}` };
    const buf = await resp.arrayBuffer();
    if (buf.byteLength < 2000) return { ok: false, reason: `too small ${buf.byteLength}b` };
    return { ok: true, reason: `${ct} ${Math.round(buf.byteLength / 1024)}KB` };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

let pass = 0;
let fail = 0;
const passed = [];
for (const c of candidates) {
  const r = await verify(c.imageUrl);
  if (r.ok) {
    pass++;
    passed.push(c.name);
    console.log(`  ✓ ${c.name} — ${r.reason}`);
  } else {
    fail++;
    console.log(`  ✗ ${c.name} — ${r.reason}`);
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
