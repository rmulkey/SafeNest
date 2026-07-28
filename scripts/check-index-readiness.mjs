#!/usr/bin/env node
/**
 * Verify that the deployed site is actually indexable by Google.
 *
 * Search Console can only report problems after Google has crawled, which takes
 * days. This checks the same signals directly against served output so a
 * regression is caught at deploy time:
 *
 *   1. robots.txt is reachable, does not block crawling, and declares a sitemap
 *      on the canonical host.
 *   2. sitemap.xml is reachable, parses, and every <loc> uses the canonical
 *      origin exactly once.
 *   3. <lastmod>, when present, is a real timestamp and not in the future.
 *   4. The www host permanently redirects to the canonical host.
 *   5. Every sitemap URL returns 200, is not noindex'd, and carries a
 *      self-referencing canonical.
 *   6. Known duplicate URL spellings canonicalise to one preferred URL.
 *   7. Programmatic listing families are present in the sitemap (otherwise they
 *      are orphans that no crawler can discover).
 *
 * Google Search Console verification is reported for information only: DNS TXT
 * verification is equally valid and leaves no mark on the HTML.
 *
 * Usage:
 *   node scripts/check-index-readiness.mjs                        # live site
 *   node scripts/check-index-readiness.mjs http://localhost:3000  # local build
 *   SAMPLE=all node scripts/check-index-readiness.mjs             # every URL
 */

const BASE = (process.argv[2] || "https://safenesttoys.com").replace(/\/$/, "");
const BASE_URL = new URL(BASE);
const IS_LOCAL = /^(localhost|127\.0\.0\.1)$/.test(BASE_URL.hostname);
/** How many sitemap URLs to page-check. `SAMPLE=all` checks every one. */
const SAMPLE = process.env.SAMPLE === "all" ? Infinity : Number(process.env.SAMPLE || 24);
const CONCURRENCY = 6;

/**
 * URL spellings that must not compete with a canonical URL. Each entry is
 * [requested path, expected canonical path].
 */
const EXPECTED_CANONICALS = [
  ["/best-toys/18", "/best-toys/1-2-years"],
  ["/best-toys/12-24-months", "/best-toys/1-2-years"],
  ["/best-toys/9", "/best-toys/6-12-months"],
  ["/best-toys/0-12-months", "/best-toys/6-12-months"],
  ["/best-toys/3", "/best-toys/0-6-months"],
  ["/best-toys/24-36-months", "/best-toys/2-3-years"],
  ["/best-toys/3-4-years", "/best-toys/3-plus-years"],
];

/** Sitemap must contain at least one URL matching each of these. */
const REQUIRED_SITEMAP_FAMILIES = [
  { label: "reviews", pattern: /\/reviews\/[^/]+$/ },
  { label: "guides", pattern: /\/guides\/[^/]+$/ },
  { label: "blog posts", pattern: /\/blog\/[^/]+$/ },
  { label: "categories", pattern: /\/categories\/[^/]+$/ },
  { label: "gift guides", pattern: /\/gift-guides\/[^/]+$/ },
  { label: "age listings", pattern: /\/best-toys\/[a-z0-9-]+$/ },
  { label: "toy-type listings", pattern: /\/safe-toys\/[^/]+$/ },
  { label: "category+age listings", pattern: /\/best-toys\/category\/[^/]+\/[^/]+$/ },
];

const failures = [];
const warnings = [];

function fail(check, detail) {
  failures.push(`${check}: ${detail}`);
  console.log(`  FAIL  ${check} — ${detail}`);
}
function pass(check, detail = "") {
  console.log(`  ok    ${check}${detail ? ` — ${detail}` : ""}`);
}
function warn(check, detail) {
  warnings.push(`${check}: ${detail}`);
  console.log(`  warn  ${check} — ${detail}`);
}
function info(check, detail) {
  console.log(`  info  ${check} — ${detail}`);
}

async function request(url, { method = "GET", redirect = "manual", ua } = {}) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        method,
        redirect,
        headers: { "User-Agent": ua || "SafeNest-index-readiness" },
      });
      const body = method === "GET" ? await res.text() : "";
      return { status: res.status, headers: res.headers, body };
    } catch (error) {
      if (attempt === 3) return { status: 0, headers: new Headers(), body: "", error };
      await new Promise((r) => setTimeout(r, 1200 * attempt));
    }
  }
  return { status: 0, headers: new Headers(), body: "" };
}

/** Run an async mapper over items with a fixed concurrency. */
async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

const firstMatch = (html, re) => html.match(re)?.[1];
const canonicalOf = (html) =>
  firstMatch(html, /<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i) ??
  firstMatch(html, /<link[^>]+href="([^"]+)"[^>]+rel="canonical"/i);
const robotsMetaOf = (html) =>
  firstMatch(html, /<meta[^>]+name="robots"[^>]+content="([^"]*)"/i);

// ── 1. robots.txt ────────────────────────────────────────────────────────────
console.log(`\nIndex readiness for ${BASE}\n`);
console.log("robots.txt");

const robots = await request(`${BASE}/robots.txt`, { redirect: "follow" });
let declaredSitemap = null;
if (robots.status !== 200) {
  fail("robots.txt reachable", `HTTP ${robots.status}`);
} else {
  pass("robots.txt reachable");

  // Only inspect the wildcard group — a block aimed at one bot is not our problem.
  const lines = robots.body.split(/\r?\n/).map((l) => l.trim());
  let inWildcard = false;
  const wildcardDisallows = [];
  for (const line of lines) {
    const ua = /^user-agent:\s*(.+)$/i.exec(line);
    if (ua) {
      inWildcard = ua[1].trim() === "*";
      continue;
    }
    const dis = /^disallow:\s*(.*)$/i.exec(line);
    if (dis && inWildcard) wildcardDisallows.push(dis[1].trim());
    const sm = /^sitemap:\s*(.+)$/i.exec(line);
    if (sm) declaredSitemap = sm[1].trim();
  }

  if (wildcardDisallows.includes("/")) {
    fail("robots.txt allows crawling", "`Disallow: /` blocks the whole site for User-agent: *");
  } else {
    pass("robots.txt allows crawling", `disallow: ${wildcardDisallows.join(", ") || "(none)"}`);
  }

  if (!declaredSitemap) {
    fail("robots.txt declares a sitemap", "no `Sitemap:` line");
  } else if (!IS_LOCAL && new URL(declaredSitemap).origin !== BASE_URL.origin) {
    fail(
      "sitemap declared on the canonical host",
      `robots.txt points at ${declaredSitemap}, expected origin ${BASE_URL.origin}`
    );
  } else {
    pass("robots.txt declares a sitemap", declaredSitemap);
  }
}

// ── 2. sitemap.xml ───────────────────────────────────────────────────────────
console.log("\nsitemap.xml");

const sitemap = await request(`${BASE}/sitemap.xml`, { redirect: "follow" });
let locs = [];
if (sitemap.status !== 200) {
  fail("sitemap.xml reachable", `HTTP ${sitemap.status}`);
} else {
  pass("sitemap.xml reachable");

  const contentType = sitemap.headers.get("content-type") || "";
  if (!/xml/i.test(contentType)) {
    fail("sitemap.xml is served as XML", `content-type: ${contentType || "(none)"}`);
  } else {
    pass("sitemap.xml is served as XML", contentType);
  }

  const urlBlocks = sitemap.body.match(/<url>[\s\S]*?<\/url>/g) ?? [];
  locs = urlBlocks
    .map((block) => firstMatch(block, /<loc>([^<]+)<\/loc>/))
    .filter(Boolean);

  if (locs.length === 0) {
    fail("sitemap.xml lists URLs", "no <loc> entries found");
  } else {
    pass("sitemap.xml lists URLs", `${locs.length} URLs`);
  }

  if (locs.length > 50000) {
    fail("sitemap.xml within limits", `${locs.length} URLs exceeds the 50,000 per-file limit`);
  }

  const duplicates = [...new Set(locs.filter((u, i) => locs.indexOf(u) !== i))];
  if (duplicates.length > 0) {
    fail("sitemap URLs are unique", `${duplicates.length} duplicated, e.g. ${duplicates[0]}`);
  } else if (locs.length > 0) {
    pass("sitemap URLs are unique");
  }

  const foreign = locs.filter((u) => {
    try {
      return new URL(u).origin !== BASE_URL.origin;
    } catch {
      return true;
    }
  });
  if (foreign.length > 0 && !IS_LOCAL) {
    fail(
      "sitemap URLs use the canonical origin",
      `${foreign.length} off-origin, e.g. ${foreign[0]}`
    );
  } else if (locs.length > 0) {
    pass("sitemap URLs use the canonical origin");
  }

  // 3. lastmod sanity: a future or unparseable date makes Google distrust the
  //    field for the entire sitemap.
  const lastmods = (sitemap.body.match(/<lastmod>([^<]+)<\/lastmod>/g) ?? []).map((m) =>
    m.replace(/<\/?lastmod>/g, "")
  );
  const now = Date.now();
  const bad = lastmods.filter((v) => {
    const t = Date.parse(v);
    return Number.isNaN(t) || t > now + 60_000;
  });
  if (bad.length > 0) {
    fail("sitemap lastmod values are real dates", `${bad.length} invalid/future, e.g. ${bad[0]}`);
  } else {
    pass(
      "sitemap lastmod values are real dates",
      `${lastmods.length} dated of ${locs.length} URLs`
    );
  }

  // 7. Programmatic families must be discoverable.
  for (const { label, pattern } of REQUIRED_SITEMAP_FAMILIES) {
    const count = locs.filter((u) => pattern.test(new URL(u).pathname)).length;
    if (count === 0) {
      fail(`sitemap includes ${label}`, "no matching URLs — these pages are orphans");
    } else {
      pass(`sitemap includes ${label}`, `${count} URLs`);
    }
  }
}

// ── 4. Canonical host ────────────────────────────────────────────────────────
console.log("\ncanonical host");

if (IS_LOCAL) {
  info("www redirects to the canonical host", "skipped for a local base URL");
} else if (BASE_URL.hostname.startsWith("www.")) {
  info("www redirects to the canonical host", `${BASE_URL.hostname} is itself the canonical host`);
} else {
  const wwwUrl = `${BASE_URL.protocol}//www.${BASE_URL.hostname}/`;
  const res = await request(wwwUrl);
  const location = res.headers.get("location");
  if (res.status === 301 || res.status === 308) {
    const target = location ? new URL(location, wwwUrl) : null;
    if (target && target.hostname === BASE_URL.hostname) {
      pass("www redirects to the canonical host", `HTTP ${res.status} -> ${target.origin}`);
    } else {
      fail("www redirects to the canonical host", `HTTP ${res.status} -> ${location}`);
    }
  } else if (res.status === 200) {
    fail(
      "www redirects to the canonical host",
      `${wwwUrl} serves HTTP 200, so both hosts are crawlable`
    );
  } else {
    fail("www redirects to the canonical host", `HTTP ${res.status}`);
  }
}

// ── 5. Per-page indexability ─────────────────────────────────────────────────
console.log("\npage checks");

if (locs.length > 0) {
  // Sample evenly across the sitemap so every content family is represented.
  const step = Math.max(1, Math.ceil(locs.length / Math.min(SAMPLE, locs.length)));
  const sampled = SAMPLE === Infinity ? locs : locs.filter((_, i) => i % step === 0);
  const sitemapPaths = new Set(locs.map((u) => new URL(u).pathname.replace(/\/$/, "") || "/"));

  const results = await mapLimit(sampled, CONCURRENCY, async (url) => {
    const res = await request(url, { redirect: "manual" });
    return { url, ...res };
  });

  let notOk = 0;
  let noindexed = 0;
  let missingCanonical = 0;
  let wrongCanonical = 0;
  let missingTitle = 0;
  let missingDescription = 0;

  for (const { url, status, body } of results) {
    const pathname = new URL(url).pathname;
    if (status !== 200) {
      notOk++;
      fail("sitemap URL returns 200", `${pathname} -> HTTP ${status}`);
      continue;
    }

    const robotsMeta = robotsMetaOf(body);
    if (robotsMeta && /noindex/i.test(robotsMeta)) {
      noindexed++;
      fail("sitemap URL is indexable", `${pathname} is noindex ("${robotsMeta}")`);
    }

    const canonical = canonicalOf(body);
    if (!canonical) {
      missingCanonical++;
      fail("sitemap URL declares a canonical", `${pathname} has no <link rel="canonical">`);
    } else {
      const canonicalPath = new URL(canonical, BASE).pathname.replace(/\/$/, "") || "/";
      const ownPath = pathname.replace(/\/$/, "") || "/";
      // A sitemap URL should either be its own canonical or point at another
      // URL that is itself in the sitemap; anything else is a dead-end signal.
      if (canonicalPath !== ownPath && !sitemapPaths.has(canonicalPath)) {
        wrongCanonical++;
        fail(
          "sitemap URL canonical resolves",
          `${ownPath} canonicalises to ${canonicalPath}, which is not in the sitemap`
        );
      }
    }

    if (!/<title>[^<]+<\/title>/i.test(body)) {
      missingTitle++;
      warn("page has a title", `${pathname} has no non-empty <title>`);
    }
    const description = firstMatch(body, /<meta[^>]+name="description"[^>]+content="([^"]*)"/i);
    if (!description) {
      missingDescription++;
      warn("page has a meta description", `${pathname} has none`);
    }
  }

  if (notOk === 0) pass("sampled sitemap URLs return 200", `${results.length} checked`);
  if (noindexed === 0) pass("sampled sitemap URLs are indexable");
  if (missingCanonical === 0) pass("sampled sitemap URLs declare a canonical");
  if (wrongCanonical === 0) pass("sampled canonicals resolve to sitemap URLs");
  if (missingTitle === 0 && missingDescription === 0) {
    pass("sampled pages have a title and meta description");
  }
} else {
  fail("page checks", "skipped — no sitemap URLs to check");
}

// ── 6. Duplicate URL spellings ───────────────────────────────────────────────
console.log("\nduplicate URL consolidation");

const canonicalResults = await mapLimit(
  EXPECTED_CANONICALS,
  CONCURRENCY,
  async ([path, expected]) => {
    const res = await request(`${BASE}${path}`, { redirect: "manual" });
    return { path, expected, ...res };
  }
);

let dupeFailures = 0;
for (const { path, expected, status, body, headers } of canonicalResults) {
  if (status === 301 || status === 308) {
    const target = headers.get("location");
    const targetPath = target ? new URL(target, BASE).pathname : "";
    if (targetPath === expected) {
      pass(`${path} consolidated`, `HTTP ${status} -> ${expected}`);
    } else {
      dupeFailures++;
      fail(`${path} consolidated`, `HTTP ${status} -> ${targetPath}, expected ${expected}`);
    }
    continue;
  }
  if (status !== 200) {
    dupeFailures++;
    fail(`${path} consolidated`, `HTTP ${status}`);
    continue;
  }
  const canonical = canonicalOf(body);
  const canonicalPath = canonical ? new URL(canonical, BASE).pathname : null;
  if (canonicalPath === expected) {
    pass(`${path} consolidated`, `canonical -> ${expected}`);
  } else {
    dupeFailures++;
    fail(
      `${path} consolidated`,
      `canonical is ${canonicalPath ?? "(missing)"}, expected ${expected}`
    );
  }
}
if (dupeFailures === 0) {
  pass("duplicate age URLs all point at one canonical", `${EXPECTED_CANONICALS.length} checked`);
}

// ── Search Console verification (informational) ───────────────────────────────
console.log("\nsearch console");

const home = await request(`${BASE}/`, { redirect: "follow" });
const gsc = firstMatch(
  home.body,
  /<meta[^>]+name="google-site-verification"[^>]+content="([^"]+)"/i
);
if (gsc) {
  info("google-site-verification meta tag", `present (${gsc.slice(0, 8)}…)`);
} else {
  info(
    "google-site-verification meta tag",
    "absent — fine if the property is verified by DNS TXT or the Vercel integration, otherwise set GOOGLE_SITE_VERIFICATION"
  );
}

// Googlebot must see the same page a browser does.
const asGooglebot = await request(`${BASE}/`, {
  redirect: "follow",
  ua: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
});
if (asGooglebot.status !== 200) {
  fail("Googlebot can fetch the homepage", `HTTP ${asGooglebot.status}`);
} else if (!/<h1[\s>]/i.test(asGooglebot.body)) {
  fail("Googlebot receives rendered content", "no <h1> in the HTML served to Googlebot");
} else {
  pass("Googlebot receives rendered content", `${asGooglebot.body.length} bytes, <h1> present`);
}

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(
  `\n${failures.length === 0 ? "PASSED" : "FAILED"}: ${failures.length} problem(s), ${warnings.length} warning(s)`
);
if (failures.length > 0) {
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
