#!/usr/bin/env node
/**
 * Fail when two gift guides would publish substantially the same list of toys.
 *
 * WHY THIS EXISTS
 * A gift guide's picks come from its age window, so two guides whose windows
 * overlap can resolve to near-identical lists that differ only by the intro
 * paragraph. That is thin duplicate content, and thin content is the measured
 * ceiling on this site's indexing — review pages carry 119 unique words against
 * 480 of boilerplate. Adding a guide costs nothing and invents nothing, which
 * makes it very easy to add one that is a copy of a guide already published.
 *
 * This recomputes the real selection against live Sanity data and reports every
 * pair, so adding a guide or shifting a window shows its effect on duplication
 * before it ships rather than after Google has formed a view.
 *
 * It deliberately imports getGiftGuideProducts rather than reimplementing the
 * ranking. A guard that approximates the thing it guards drifts away from it and
 * then lies.
 *
 * Usage: node --import tsx scripts/audit-gift-guide-overlap.mjs
 */
import {
  GIFT_GUIDES,
  getGiftGuideProducts,
  GIFT_GUIDE_SIZE,
  MAX_PICKS_PER_BRAND,
} from "../src/lib/seo/gift-guides.ts";

/**
 * The most two guides may share, as a fraction of the larger list.
 *
 * A third, which is one shared pick above the current worst pair rather than an
 * aspirational number. Two pairs sit at 3 of 12: gifts-for-2-year-olds against
 * gifts-for-3-year-olds, and gifts-for-4-to-6-year-olds against
 * gifts-for-school-age-kids. Both are the same catalogue limit — no toy is
 * labelled exactly 36–48 months and only one is labelled from 48, so the upper
 * guides have to reach down into labels the guide below them also uses.
 *
 * The single pick of headroom exists because the catalogue grows: a new review
 * landing in a sparse band can move one pick without any page becoming a
 * duplicate. A fourth shared pick is worth a human looking at. Before age-fit
 * ranking the worst pair shared 11 of 12 (92%); under symmetric fit, 6 of 12.
 */
const MAX_OVERLAP = 1 / 3;

/** A guide with fewer picks than this is a stub, not a page worth publishing. */
const MIN_PICKS = 6;

const lists = new Map();
for (const guide of GIFT_GUIDES) {
  const picks = await getGiftGuideProducts(guide);
  lists.set(guide.slug, picks);
}

const problems = [];

console.log(`gift guides: ${GIFT_GUIDES.length}  (target ${GIFT_GUIDE_SIZE} picks each, max ${MAX_PICKS_PER_BRAND} per brand)\n`);

for (const guide of GIFT_GUIDES) {
  const picks = lists.get(guide.slug);
  const brands = new Map();
  for (const p of picks) {
    const key = p.brand ?? "(no brand)";
    brands.set(key, (brands.get(key) ?? 0) + 1);
  }
  const worstBrand = Math.max(0, ...brands.values());
  const avg = picks.length
    ? Math.round(picks.reduce((t, p) => t + p.safetyScore, 0) / picks.length)
    : 0;
  console.log(
    `  ${guide.slug.padEnd(28)} ${String(guide.minMonths).padStart(2)}-${String(guide.maxMonths).padStart(3)}m  ` +
      `picks=${String(picks.length).padStart(2)}  brands=${String(brands.size).padStart(2)}  ` +
      `maxPerBrand=${worstBrand}  avgSafety=${avg}`
  );

  if (picks.length < MIN_PICKS) {
    problems.push(
      `${guide.slug}: only ${picks.length} picks (minimum ${MIN_PICKS}) — the window is too sparse to publish`
    );
  }
  if (worstBrand > MAX_PICKS_PER_BRAND) {
    problems.push(
      `${guide.slug}: ${worstBrand} picks from one brand (cap ${MAX_PICKS_PER_BRAND})`
    );
  }
}

// Two guides sharing a window is the thing worth catching, so report the whole
// matrix and not only the failures — the near-misses are what tell you a new
// window is badly chosen.
console.log("\npairwise overlap (shared picks / larger list):");
const slugs = GIFT_GUIDES.map((g) => g.slug);
const pairs = [];
for (let i = 0; i < slugs.length; i++) {
  for (let j = i + 1; j < slugs.length; j++) {
    const a = new Set(lists.get(slugs[i]).map((p) => p.slug.current));
    const b = new Set(lists.get(slugs[j]).map((p) => p.slug.current));
    const shared = [...a].filter((s) => b.has(s)).length;
    const denominator = Math.max(a.size, b.size, 1);
    pairs.push({ a: slugs[i], b: slugs[j], shared, ratio: shared / denominator, denominator });
  }
}
pairs.sort((x, y) => y.ratio - x.ratio);
for (const p of pairs) {
  const pct = `${Math.round(p.ratio * 100)}%`.padStart(4);
  const flag = p.ratio > MAX_OVERLAP ? " <-- TOO SIMILAR" : "";
  console.log(`  ${pct}  ${String(p.shared).padStart(2)}/${p.denominator}  ${p.a} <-> ${p.b}${flag}`);
  if (p.ratio > MAX_OVERLAP) {
    problems.push(
      `${p.a} and ${p.b} share ${p.shared} of ${p.denominator} picks (${pct.trim()}, ceiling ${Math.round(MAX_OVERLAP * 100)}%) — ` +
        `widen or merge the windows, or the two pages are duplicates of each other`
    );
  }
}

const worst = pairs[0];
console.log(
  `\nworst pair: ${worst ? `${Math.round(worst.ratio * 100)}% (${worst.a} <-> ${worst.b})` : "n/a"}` +
    `  ceiling ${Math.round(MAX_OVERLAP * 100)}%`
);

if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  problems.forEach((p) => console.log(`  - ${p}`));
  process.exit(1);
}
console.log("\n0 problems");
