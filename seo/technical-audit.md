# Technical SEO audit

**Data date:** 2026-08-25
**Target:** https://safenesttoys.com (Next.js 16.2.7, App Router, `cacheComponents: true`, Vercel)
**Method:** the repo's own audit scripts against production, plus Chromium with
JavaScript disabled for render checks. Every number below is reproducible.

---

## 1. Verified state, all 14 page types

Per the brief's required test set. All checks against production.

| Page type | URL | Status | `<main>` | `<h1>` | Title | Self-canonical | JSON-LD | Words | HTML |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| homepage | `/` | 200 | 1 | 1 | yes | yes | 6 | 817 | 146 KB |
| review index | `/reviews` | 200 | 1 | 1 | yes | yes | 2 | 2,448 | **1,079 KB** |
| review (older) | `/reviews/green-toys-stacking-cups` | 200 | 1 | 1 | yes | yes | 4 | 1,004 | 115 KB |
| review (newer) | `/reviews/learning-resources-snap-cubes-100-piece-set` | 200 | 1 | 1 | yes | yes | 4 | 1,029 | 113 KB |
| age hub | `/best-toys` | 200 | 1 | 1 | yes | yes | **0** | 219 | 52 KB |
| age page | `/best-toys/1-2-years` | 200 | 1 | 1 | yes | yes | 2 | 3,243 | **1,259 KB** |
| category hub | `/categories` | 200 | 1 | 1 | yes | yes | 2 | 181 | 59 KB |
| category page | `/categories/sensory-toys` | 200 | 1 | 1 | yes | yes | 2 | 615 | 204 KB |
| buying guide | `/guides/best-sensory-toys-babies` | 200 | 1 | 1 | yes | yes | 2 | 495 | 122 KB |
| gift guide | `/gift-guides/first-birthday-gifts` | 200 | 1 | 1 | yes | yes | 2 | 522 | 151 KB |
| recalls | `/recalls` | 200 | 1 | 1 | yes | yes | 2 | 4,389 | 187 KB |
| blog article | `/blog/top-7-child-safe-toys-2026` | 200 | 1 | 1 | yes | yes | 4 | 1,166 | 147 KB |
| methodology | `/transparency` | 200 | 1 | 1 | yes | yes | **0** | 1,199 | 80 KB |
| about | `/about` | 200 | 1 | 1 | yes | yes | **0** | 527 | 59 KB |

Sitewide, from `scripts/audit-onpage.mjs` across all 221 sitemap URLs:

| Check | Result |
| --- | --- |
| Non-200 status | 0 |
| Soft 404 | 0 |
| Missing title / H1 / meta description / canonical | 0 |
| Multiple H1 | 0 |
| Duplicate title / meta description | 0 / 0 |
| Sitemap URLs sharing a canonical | 0 |
| Sitemap URLs not self-canonical | 0 |
| Affiliate links without a disclosure | 0 |
| Images without alt | 0 |
| Orphan pages | 0 / 221 |
| Broken internal links | 0 |
| Prohibited claims (222 pages) | 0 |
| Stale trust claims (233 routes, 4 surfaces) | 0 |
| JSON-LD parse failures (189 pages) | 0 |
| Accessibility bugs (16 page types) | 0 |
| `www` → apex | single 308; `http` → `https` single hop |

---

## 2. The reported P0 was not real. Establishing that took three wrong measurements.

The brief flagged that search-engine-visible pages might still expose "Loading",
"Expert Reviewed" or "independent lab testing". **None of it is present.** Worth
recording how the wrong answers were reached, because each is an easy trap.

**Wrong measurement 1 — a scanner that flagged the truth.** The first version of
`audit-stale-claims.mjs` reported **373 findings** on production. Every one was a
false positive: the pattern for "laboratory testing" was matching SafeNest's own
disclaimers.

> "an editorial assessment based on publicly available information — **not
> laboratory testing** or certification"
> "We **do not** physically or **laboratory test** toys"

Acting on that output would have deleted required language. The scanner is now
negation-aware (`src/lib/seo/claim-negation.ts`), with 17 tests whose disclaimer
cases are the real sentences above, asserting both directions.

It also closed a genuine gap in the pre-existing `scan-output-claims.mjs`, which
forbids `"lab tested"` and `"laboratory tested"` but not `"lab testing"` — so
`"independent lab testing"`, the exact phrase the brief named, would have passed
straight through it.

**Wrong measurement 2 — too generous.** Counting words after stripping only
`<script>` says a review page serves ~1,000 words without JavaScript. That counts
`hidden` subtrees, so it overstates what is rendered.

**Wrong measurement 3 — alarmist.** Measuring *rendered* text instead gives 14
words and reads as catastrophic. Also wrong.

**Ground truth**, Chromium with `java_script_enabled=False`
(`scripts/verify-nojs-render.py`):

| Page | `body.textContent` | `body.innerText` | `<h2>` in DOM | Links in DOM |
| --- | --- | --- | --- | --- |
| `/` | 3,964 | 4 | 6 | 48 |
| `/reviews/green-toys-stacking-cups` | 3,219 | 4 | 11 | 43 |
| `/best-toys/1-2-years` | 10,918 | 4 | 88 | 380 |
| `/guides/best-sensory-toys-babies` | 2,085 | 4 | 4 | 46 |
| `/recalls` | 9,829 | 4 | 26 | 52 |

The copy **is** in the DOM without JavaScript, headings and links included.
`innerText` is empty only because the content sits in `hidden` subtrees until
hydration — per spec, `innerText` on an unrendered element falls back to
`textContent`, which is why `querySelector('h1').innerText` returns the right
heading while `body.innerText` returns nothing.

**Consequence:** Googlebot, third-party SEO crawlers and markup-parsing AI
crawlers all read the full content. Only consumers that respect `hidden` or
extract rendered text see nothing — which includes a human with JavaScript off.

---

## 3. What was actually broken, and is now fixed

**Nested `<main>` landmarks, sitewide** (`da84f3a`).

`src/app/layout.tsx:71` correctly owns `<main id="main-content" tabindex="-1">` as
the landmark and skip-link target. **15 page templates, 3 `loading.tsx` skeletons
and `not-found.tsx` each rendered another `<main>` inside it.** Two defects at once:

- Invalid HTML. One `<main>` per document; nesting is disallowed.
- Broken screen-reader landmark navigation on every page.

And worse on three routes: the skeletons emitted
`<main role="status" aria-label="Loading">` **first in document order**, so
anything reading the first main landmark got a loading state instead of the page.
That is the kernel of truth behind the reported P0 — not stale content, but a
skeleton occupying the landmark.

| Route family | `<main>` before | after |
| --- | --- | --- |
| `/best-toys/[age]`, `/categories/[slug]`, `/blog/[slug]` | 3 | 1 |
| `/guides/*`, `/recalls`, `/reviews`, `/gift-guides/*` | 2 | 1 |
| `/reviews/[slug]`, `/` | 1 | 1 |

Skeletons keep `role="status"` so assistive tech still announces the pending
state; they are simply no longer landmarks.

---

## 4. Structured data — clean, no changes made

| Check | Result |
| --- | --- |
| `AggregateRating` anywhere | **0 of 233 pages** |
| `Offer` (price / availability) | **0** |
| JSON-LD parse failures | 0 of 189 pages |
| Author / publisher truthful | yes — `Organization: SafeNest Toys`, no invented person |

Review pages use the correct shape for a single editorial review:

```
Review
  itemReviewed: Product { name, brand, image }
  reviewRating: Rating { ratingValue 4.8, bestRating 5, worstRating 1 }
  author:    Organization "SafeNest Toys"
  publisher: Organization "SafeNest Toys"
  reviewBody: "... SafeNest has not physically measured the product or
               performed small-parts testing ..."
```

The methodology limit is stated **inside** `reviewBody`, which is the right place
for it. Gift guides use `ItemList` with 12 of 12 elements resolving to real review
URLs.

Semrush reports `markups: schemaOrg: 0` across 93 pages. That is its counter
failing to read JSON-LD, not missing markup — verified directly.

**Two things flagged rather than changed, both needing your judgement:**

1. `reviewRating` is `4.8/5` while the page displays "Safety 95/100". The same
   editorial value, rescaled. Google wants the rated value visible on the page;
   95/100 is visible, 4.8/5 is a derivation. Defensible, not identical.
2. `/about`, `/transparency` and `/best-toys` carry **no JSON-LD**. The first two
   are the trust pages and are the natural home for `Organization` and
   `AboutPage`. Low priority — schema is eligibility, not ranking — but it is a
   gap.

---

## 5. Real, unresolved: page weight

| URL | HTML | Product cards |
| --- | --- | --- |
| `/best-toys/1-2-years` | **1,259 KB** | 87 |
| `/reviews` | **1,079 KB** | 138 |
| `/categories/sensory-toys` | 204 KB | 20 |
| `/recalls` | 187 KB | — |
| `/` | 146 KB | — |

Two pages ship over a megabyte of HTML because they render every matching product
with no pagination. This is:

- A Core Web Vitals risk (LCP and TBT on mobile).
- A crawl-budget cost on the two pages Google must re-fetch most often.
- **The most likely true cause of Semrush's "low text to HTML ratio" on 91 of 100
  pages** — a finding I initially attributed to the RSC flight payload, which was
  wrong. 3,243 words of text inside 1,259 KB of markup is a genuinely poor ratio,
  and no amount of measurement technique changes that.

Unresolved because the fix is a product decision: paginate, lazy-render below the
fold, or reduce per-card markup. Recommendation in `seo/content-roadmap.md`.

---

## 6. Guards, and where they run

`.github/workflows/seo-guards.yml` runs eight audits daily at 07:15 UTC and on
demand, each with `if: always()` so one run surfaces every problem.

**Against production, not a CI build.** The main CI job builds with
`NEXT_PUBLIC_SANITY_PROJECT_ID: "ci-project"`, so a site built in CI has no
reviews, no guides and an empty sitemap. Crawling that would prove nothing.

| Guard | Fails when |
| --- | --- |
| `audit-stale-claims` | a prohibited claim appears unnegated in raw HTML, visible text, metadata or JSON-LD; or a page serves under 120 words of markup text |
| `scan-output-claims` | any forbidden phrase appears across 222 pages including `/llms.txt` |
| `audit-onpage` | non-200, soft 404, missing or duplicate title/description/H1/canonical, two sitemap URLs sharing a canonical, a sitemap URL not self-canonical, affiliate links without a disclosure |
| `check-index-readiness` | robots or sitemap misconfiguration, a non-self-canonical indexable page, a duplicate spelling not consolidating |
| `audit-internal-links` | any internal link 4xx/5xx |
| `audit-orphan-pages` | a sitemap URL nothing links to |
| `verify-review-output` | review section order breaks, or the testing/certification disclosures disappear |
| `audit-a11y` | heading-order or alt-text regressions |

Plus, in `npm test`: 17 unit tests on the negation logic, including a **drift
guard** that parses the crawler's pattern array and asserts it matches the tested
module. It earned its place on first run by catching a pattern present in one and
absent from the other.

---

## 7. What is deliberately not being "fixed"

| Semrush finding | Why it stands |
| --- | --- |
| 824 notices: nofollow on external links | Those are the Amazon affiliate links carrying `rel="nofollow sponsored"`. The Associates agreement requires it. |
| 2 notices: blocked from crawling | `/api/` and `/dashboard` in robots.txt. Correct. |
| 91 warnings: low text-to-HTML ratio | Real, but the cause is page weight (§5), not markup style. Addressing it means pagination, not tag golf. |
| `schemaOrg: 0` | Semrush's counter cannot read JSON-LD. The markup is present and valid. |
| 186 of 270 errors | `/privacy` and `/terms`, which did not exist at crawl time and were added in `66ccc7b` on 2026-08-17. |
| 84 of 270 errors | The `www`/apex double-crawl caused by the campaign host. |
| 31 spam referring domains | Google's link spam systems discount these automatically; a disavow file is busywork. |
