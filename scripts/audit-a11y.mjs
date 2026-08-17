#!/usr/bin/env node
/**
 * Static accessibility audit of served HTML.
 *
 * Not a substitute for testing with a screen reader — it checks the structural
 * things that are reliably detectable in markup and that regress silently:
 * heading order, a single h1, image alt text, form labels, link text, and
 * duplicate element ids.
 *
 * Header and footer chrome is excluded from heading-order checks: Next streams
 * those segments early, so their byte positions do not reflect DOM order.
 *
 * Usage:
 *   node scripts/audit-a11y.mjs                       # live site
 *   node scripts/audit-a11y.mjs http://localhost:3100
 */

const BASE = (process.argv[2] || "https://safenesttoys.com").replace(/\/$/, "");

const PAGES = [
  "/",
  "/reviews",
  "/reviews/green-toys-stacking-cups",
  "/guides",
  "/guides/best-building-toys-toddlers-2025",
  "/blog",
  "/categories",
  "/categories/sensory-toys",
  "/recalls",
  "/transparency",
  "/about",
  "/contact",
  "/best-toys",
  "/best-toys/1-2-years",
  "/gift-guides",
  "/safe-toys/wood",
];

/** Headings that belong to site chrome rather than page content. */
const CHROME_HEADINGS = new Set([
  "Quick Links",
  "Resources",
  "Legal",
  "SafeNest Toys",
]);

let bugs = 0;
let warns = 0;

for (const path of PAGES) {
  const res = await fetch(`${BASE}${path}`);
  const problems = [];

  if (!res.ok) {
    console.log(`FAIL  ${path}  HTTP ${res.status}`);
    bugs++;
    continue;
  }
  const html = await res.text();
  // Blank script bodies so inlined RSC payloads are not parsed as markup.
  const doc = html.replace(/<script[\s\S]*?<\/script>/g, (m) => " ".repeat(m.length));

  // ── Headings ──────────────────────────────────────────────────────────────
  const headings = [...doc.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/g)]
    .map((m) => ({
      level: Number(m[1]),
      text: m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    }))
    .filter((h) => !CHROME_HEADINGS.has(h.text));

  const h1s = headings.filter((h) => h.level === 1);
  if (h1s.length !== 1) problems.push(["BUG", `${h1s.length} <h1> (expected exactly 1)`]);

  for (let i = 1; i < headings.length; i++) {
    if (headings[i].level > headings[i - 1].level + 1) {
      problems.push([
        "BUG",
        `heading level skipped: h${headings[i - 1].level} "${headings[i - 1].text.slice(0, 30)}" -> h${headings[i].level} "${headings[i].text.slice(0, 30)}"`,
      ]);
    }
  }
  const empty = headings.filter((h) => h.text.length === 0).length;
  if (empty) problems.push(["BUG", `${empty} empty heading(s)`]);

  // ── Images ────────────────────────────────────────────────────────────────
  const imgs = [...doc.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  const noAlt = imgs.filter((t) => !/\balt\s*=/.test(t));
  if (noAlt.length) problems.push(["BUG", `${noAlt.length} <img> without an alt attribute`]);

  // ── Form controls ─────────────────────────────────────────────────────────
  const inputs = [...doc.matchAll(/<(input|select|textarea)\b[^>]*>/g)].map((m) => m[0]);
  const unlabelled = inputs.filter(
    (t) =>
      !/type\s*=\s*"(hidden|submit|button|image)"/i.test(t) &&
      !/aria-label\s*=/.test(t) &&
      !/aria-labelledby\s*=/.test(t) &&
      !/\bid\s*=/.test(t) // an id may be paired with a <label for>
  );
  if (unlabelled.length)
    problems.push(["BUG", `${unlabelled.length} form control(s) with no label, aria-label or id`]);

  // ── Link text ─────────────────────────────────────────────────────────────
  const links = [...doc.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];
  const emptyLinks = links.filter((m) => {
    const text = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return (
      text.length === 0 &&
      !/aria-label\s*=/.test(m[1]) &&
      !/aria-hidden\s*=\s*"true"/.test(m[1])
    );
  });
  if (emptyLinks.length)
    problems.push(["BUG", `${emptyLinks.length} link(s) with no accessible text`]);

  const vague = links.filter((m) =>
    /^(click here|here|read more|learn more|more)$/i.test(
      m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    )
  );
  if (vague.length) problems.push(["WARN", `${vague.length} link(s) with non-descriptive text`]);

  // ── Duplicate ids ─────────────────────────────────────────────────────────
  const ids = [...doc.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dupes = [...new Set(ids.filter((v, i) => ids.indexOf(v) !== i))]
    // React streaming placeholders legitimately reuse template ids.
    .filter((id) => !/^[BPS]:\d+$/.test(id));
  if (dupes.length)
    problems.push(["WARN", `duplicate id(s): ${dupes.slice(0, 4).join(", ")}`]);

  // ── lang ──────────────────────────────────────────────────────────────────
  if (!/<html[^>]+lang\s*=/.test(html)) problems.push(["BUG", "<html> has no lang attribute"]);

  const b = problems.filter((p) => p[0] === "BUG").length;
  const w = problems.filter((p) => p[0] === "WARN").length;
  bugs += b;
  warns += w;

  console.log(`${b ? "FAIL" : "ok  "}  ${path}  (${headings.length} headings, ${imgs.length} img, ${links.length} links)`);
  for (const [sev, msg] of problems) console.log(`        ${sev}  ${msg}`);
}

console.log(`\n${bugs === 0 ? "PASSED" : "FAILED"}: ${bugs} bug(s), ${warns} warning(s) across ${PAGES.length} pages`);
process.exit(bugs === 0 ? 0 : 1);
