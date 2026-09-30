#!/usr/bin/env node
/**
 * Print what a Target listing says about a product, before anyone writes a
 * review of it.
 *
 * The candidate file for build-verified-queue.mjs needs an age range, materials
 * and a choking assessment. Those are facts, so they come from the retailer's
 * listing, and this is how they are read. Editorial fields (scores, pros, cons)
 * are then written against these facts, not from memory.
 *
 * Usage:
 *   node scripts/target-facts.mjs <target-url> [<target-url> ...] > facts.json
 */
import { fetchTargetProduct, canonicalTargetUrl } from "./lib/target-product.mjs";

const urls = process.argv.slice(2);
if (urls.length === 0) {
  console.error("Usage: node scripts/target-facts.mjs <target-url> [...]");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = [];
for (const url of urls) {
  try {
    const facts = await fetchTargetProduct(url);
    out.push({ targetUrl: canonicalTargetUrl(url), ...facts });
    console.error(`ok    ${facts.tcin}  ${facts.title.slice(0, 70)}`);
  } catch (e) {
    out.push({ targetUrl: url, error: e.message });
    console.error(`FAIL  ${url}  ${e.message}`);
  }
  // Target rate-limits bursts; the published queue builder waits the same way.
  await sleep(900 + Math.random() * 700);
}
console.log(JSON.stringify(out, null, 2));
