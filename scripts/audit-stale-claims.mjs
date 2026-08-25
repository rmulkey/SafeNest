#!/usr/bin/env node
/**
 * P0 guard: stale trust claims and "Loading" shells in crawler-visible output.
 *
 * This is deliberately separate from scan-output-claims.mjs, which reads the
 * sitemap. Two things that scanner cannot catch:
 *
 *   1. Routes the sitemap omits. A stale page absent from the sitemap is still
 *      indexable if anything links it, and Google may already hold it.
 *   2. Inflected variants. The existing FORBIDDEN list has "lab tested" and
 *      "laboratory tested" but not "lab testing", so "independent lab testing"
 *      passed straight through it.
 *
 * Checks four surfaces separately, because a claim in a <title> is a different
 * defect from one in body copy, and one inside JSON-LD is invisible to a reader
 * but not to Google:
 *
 *   raw       the HTTP response body exactly as a crawler receives it
 *   visible   text with <script>/<style> removed — what a reader sees
 *   meta      <title>, meta description, og:title, og:description
 *   jsonld    every application/ld+json block
 *
 * Also flags a "Loading" shell: a page whose <main> holds almost no text and
 * says "Loading". That is the signature of content that only exists after
 * client-side hydration, which a crawler may never see.
 *
 * Usage:
 *   node scripts/audit-stale-claims.mjs                       # live site
 *   node scripts/audit-stale-claims.mjs http://localhost:3114 # local build
 */

const BASE = (process.argv[2] || "https://safenesttoys.com").replace(/\/$/, "");
const CONCURRENCY = 6;

/**
 * Phrases that must not reach a crawler, as regexes so inflections are covered.
 * Each carries the reason, because a bare list invites someone to "fix" a
 * finding by deleting a true statement.
 */
const FORBIDDEN = [
  [/expert[\s-]*reviewed/i, "SafeNest has no expert reviewers"],
  [/expert[\s-]*review\b/i, "implies a credentialled reviewer"],
  [/\bsafety experts?\b/i, "no expert is on staff"],
  [/independent(ly)?\s+lab(oratory)?\s+test/i, "no laboratory testing is performed"],
  [/\blab(oratory)?\s+test(ed|ing|s)?\b/i, "no laboratory testing is performed"],
  [/independently\s+tested/i, "nothing is independently tested"],
  [/\bwe\s+tested\b/i, "nothing is physically tested"],
  [/parent[\s-]*tested/i, "reviews are researched, not tested"],
  [/safety[\s-]*tested/i, "nothing is safety tested"],
  [/certified\s+(safe|by\s+safenest)/i, "SafeNest certifies nothing"],
  [/(guaranteed|proven|completely)\s+safe/i, "safety is never guaranteed"],
  [/cpsc[\s-]*approved/i, "the CPSC approves nothing"],
  [/\bsafenest\s+approved\b/i, "SafeNest approves nothing"],
  [/aggregate\s*rating/i, "an editorial score is not a customer rating"],
];

/**
 * Minimum words of text a page must carry in its served markup.
 *
 * Set against measured reality: the thinnest real page on this site
 * (/categories, a link hub) carries ~180 words, and review pages carry ~1,000.
 * A page under this is either a genuine shell or has lost its content.
 */
const SHELL_MIN_DOM_WORDS = 120;

/**
 * Words that invert a claim when they appear just before it.
 *
 * This matters more than it sounds. Without it, the first version of this script
 * reported 373 violations across the site — every one of them a sentence like
 * "an editorial assessment based on publicly available information — not
 * laboratory testing or certification" or "We do not physically or laboratory
 * test toys". Those are exactly the disclaimers the site is required to carry.
 * A scanner that flags them teaches whoever runs it to delete the truth, which
 * is a worse outcome than having no scanner at all.
 */
const NEGATORS = [
  "not",
  "never",
  "without",
  "no",
  "cannot",
  "does not",
  "do not",
  "did not",
  "isn't",
  "aren't",
  "doesn't",
  "don't",
  "rather than",
  "instead of",
];

/** How far back to look for a negator, in characters. */
const NEGATION_WINDOW = 90;

function isNegated(content, index) {
  const before = content.slice(Math.max(0, index - NEGATION_WINDOW), index).toLowerCase();
  return NEGATORS.some((n) => new RegExp(`\\b${n.replace(/'/g, "['’]")}\\b`).test(before));
}

const strip = (html) =>
  html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ");

const text = (html) =>
  strip(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

async function routesToCheck() {
  const res = await fetch(`${BASE}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap.xml -> HTTP ${res.status}`);
  const xml = await res.text();
  const fromSitemap = [
    ...new Set(
      [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
        (m) => new URL(m[1].trim()).pathname.replace(/\/$/, "") || "/"
      )
    ),
  ];

  // Indexable routes the sitemap deliberately omits. These still answer 200, so
  // a crawler that finds one anywhere gets whatever they contain.
  const offSitemap = [
    "/llms.txt",
    // Alternate age spellings. All canonicalise to a sitemap URL, but they
    // render their own HTML and that HTML is what a crawler reads.
    "/best-toys/3",
    "/best-toys/6",
    "/best-toys/9",
    "/best-toys/12",
    "/best-toys/18",
    "/best-toys/24",
    "/best-toys/36",
    "/best-toys/0-12-months",
    "/best-toys/12-24-months",
    "/best-toys/24-36-months",
    "/best-toys/3-4-years",
  ];

  return [...new Set([...fromSitemap, ...offSitemap])].sort();
}

const findings = [];

async function checkRoute(path) {
  let res;
  try {
    res = await fetch(BASE + path);
  } catch (err) {
    findings.push({ path, surface: "fetch", detail: String(err) });
    return;
  }
  if (!res.ok) {
    findings.push({ path, surface: "status", detail: `HTTP ${res.status}` });
    return;
  }
  const raw = await res.text();

  const surfaces = {
    visible: text(raw),
    meta: [
      raw.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "",
      raw.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1] ?? "",
      raw.match(/<meta\s+property="og:title"\s+content="([^"]*)"/i)?.[1] ?? "",
      raw.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i)?.[1] ?? "",
    ].join(" | "),
    jsonld: [...raw.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)]
      .map((m) => m[1])
      .join(" "),
  };
  // The raw body minus the RSC flight payload. The payload repeats visible copy
  // as JSON, so scanning it as well would double-report every finding.
  surfaces.raw = strip(raw);

  for (const [pattern, reason] of FORBIDDEN) {
    for (const [surface, content] of Object.entries(surfaces)) {
      // Every occurrence, not just the first — a page can state a disclaimer and
      // still make the claim elsewhere.
      const rx = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
      let hit;
      while ((hit = rx.exec(content)) !== null) {
        if (isNegated(content, hit.index)) continue;
        // A finding in `visible` is already implied by `raw`; report the narrower
        // surface only, so one defect is one line.
        if (surface === "raw" && surfaces.visible.match(pattern)) break;
        const i = Math.max(0, hit.index - 70);
        findings.push({
          path,
          surface,
          detail: `${pattern.source} — ${reason}`,
          excerpt: content.slice(i, hit.index + hit[0].length + 60).trim(),
        });
        break; // one finding per pattern per surface is enough to act on
      }
    }
  }

  // Is the page's copy actually in the served markup?
  //
  // Deliberately NOT "does <main> contain text at parse time". Under Partial
  // Prerendering the layout's <main> legitimately closes early holding only
  // Suspense placeholders, and the content arrives later in the same response for
  // React to move in. Gating on the <main> span flags every PPR page as broken —
  // it reported 31 failures here against a site whose pages carry 2,000-11,000
  // words of DOM text. What matters is whether a markup parser can reach the
  // copy, so that is what this measures: the whole body, hidden subtrees kept,
  // scripts and templates dropped.
  const domWords = text(raw).split(" ").filter(Boolean).length;
  if (domWords < SHELL_MIN_DOM_WORDS) {
    findings.push({
      path,
      surface: "shell",
      detail: `only ${domWords} words of text in the served markup`,
      excerpt: text(raw).slice(0, 140),
    });
  }
}

const routes = await routesToCheck();
console.log(`stale-claim audit of ${BASE}`);
console.log(`routes checked: ${routes.length} (sitemap + off-sitemap indexable)\n`);

for (let i = 0; i < routes.length; i += CONCURRENCY) {
  await Promise.all(routes.slice(i, i + CONCURRENCY).map(checkRoute));
}

if (findings.length === 0) {
  console.log(`PASSED: no stale trust claims or Loading shells across ${routes.length} routes`);
  console.log("surfaces checked per route: raw HTTP body, visible text, metadata, JSON-LD");
  process.exit(0);
}

const bySurface = new Map();
for (const f of findings) {
  if (!bySurface.has(f.surface)) bySurface.set(f.surface, []);
  bySurface.get(f.surface).push(f);
}

console.log(`FINDINGS (${findings.length}):\n`);
for (const [surface, list] of [...bySurface].sort((a, z) => z[1].length - a[1].length)) {
  console.log(`  ${surface.toUpperCase()} (${list.length})`);
  for (const f of list.slice(0, 15)) {
    console.log(`    ${f.path}`);
    console.log(`      ${f.detail}`);
    if (f.excerpt) console.log(`      …${f.excerpt}…`);
  }
  if (list.length > 15) console.log(`    …and ${list.length - 15} more`);
  console.log();
}
console.log(`FAILED: ${findings.length} finding(s) across ${bySurface.size} surface(s)`);
process.exit(1);
