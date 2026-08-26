# Implementation summary

**Data date:** 2026-08-25
**Commits:** `8034fde`, `19445b3`, `56a9b1c`, `0ae75f8`, `eb1cd15`, `3d1508d`,
`4c837d9`, `abea983`, `da84f3a`, `296a8f4`, `d2f66aa`, `58fd3dc`, `202fe33`,
`1cb5581`

---

## 1. What Semrush data was pulled

All via the MCP server at `https://mcp.semrush.com/v2/mcp`
(`Authorization: Apikey`). The REST APIs are unusable with this key — v4 answers
`403`, v3 answers `ERROR 120 :: WRONG KEY - ID PAIR`. MCP also carries read-only
Projects API v3, the only channel exposing Site Audit.

Raw responses in `seo/data/`, each with a header recording report, parameters and
fetch time. `seo/data/manifest.json` lists every call and outcome.

| Report | File | Result |
| --- | --- | --- |
| `domain_ranks` | `domain-overview.csv` | Rank 15,306,701 · 30 keywords · traffic 0 |
| `resource_organic` | `organic-positions.csv` | 30 rows |
| `resource_organic_unique` | `organic-pages.csv` | 6 URLs |
| `resource_organic` (new) | `organic-positions-new.csv` | 1 gained |
| `resource_organic` (lost) | `organic-positions-lost.csv` | empty (`ERROR 50`) |
| `domain_organic_organic` | `organic-competitors.csv` | **empty (`ERROR 50`)** |
| `backlinks_overview` | `backlinks-overview.csv` | 38 links · 31 domains · AS 2 |
| `backlinks_refdomains` | `referring-domains.csv` | 31 rows |
| `backlinks` | `backlinks.csv` | 38 rows |
| `backlinks_anchors` | `backlink-anchors.csv` | 22 anchors |
| `info` / `snapshots` / `meta_issues` | `site-audit-*.json` | Jul 14 snapshot, 100 pages |
| `phrase_kdi` | `keyword-difficulty.csv` | KD for all 30 |
| `phrase_organic` x6 | `serps/*.csv` | 20 results per target keyword |
| `phrase_fullsearch` | (analysed, not retained) | 240 related keywords |

**Failed and why:** Position Tracking. `campaigns` returns `targets: null` with a
1-target limit; `tracking_position_organic` answers `campaign not found`. The tool
is enabled on the project but no campaign target is exposed. Recorded as a
limitation, not worked around.

**No first-party data exists.** `NEXT_PUBLIC_GA4_MEASUREMENT_ID` and
`NEXT_PUBLIC_POSTHOG_KEY` are both empty; no GSC or GA4 export is present. So this
engagement has **zero impressions, zero CTR and zero click data**, and every
statement about click-through is labelled a hypothesis.

---

## 2. Which opportunities were selected, and why they beat the alternatives

The scoring in `seo/keyword-map.csv` collapses onto **three URLs**:

| Score | Keyword | Volume | KD | Position | Destination |
| --- | --- | --- | --- | --- | --- |
| 77.0 | best toys for building independence | 4,400 | **12** | 98 | `/guides/best-building-toys-preschoolers` |
| 30.7 | best toys for 6 month old | 2,400 | 15 | none | `/guides/best-toys-6-12-months` |
| 30.4 | sensory toys for babies | 3,600 | 24 | 62 | `/guides/best-sensory-toys-babies` |

Every one of the top twelve points at one of those three.

**Why these:** two of the three are the **shortest content on the site** while
holding 24 of its 30 ranking keywords. Difficulty across the entire ranking set is
0–31, and an unknown Shopify store blog holds position 1 for the 4,400/mo term at
KD 12. Measured against the field:

| Page | Words | Median of pages beating it |
| --- | --- | --- |
| `/guides/best-building-toys-preschoolers` | 471 | ~2,700 |
| `/guides/best-sensory-toys-babies` | 495 | 1,743 |
| `/guides/best-wooden-nontoxic-toys` | 688 | 1,887 |

**What they beat:**

- **The 138 review pages.** They hold 5 keywords total, and that is structural:
  product-name SERPs are Target, Walmart, Amazon and the manufacturer, with zero
  editorial results in the top ten. Reviews are a conversion surface, not an
  acquisition channel.
- **New content.** The site has 221 URLs of which 6 rank. Adding URL 222 does not
  address that.
- **CTR work.** Impossible without Search Console, and pointless below position 20.
- **Title length.** 40 titles exceed 60 characters; Google truncates rather than
  penalises, and with no CTR data there is no way to know whether it costs clicks.
- **The 31 spam referring domains.** Google discounts them automatically.
- **Semrush Site Health.** 186 of its 270 errors are one bug fixed in August.

---

## 3. Files changed

**Fixed:**

| File(s) | Change |
| --- | --- |
| 15 `page.tsx` + 3 `loading.tsx` + `not-found.tsx` | nested `<main>` → single landmark |
| `src/components/seo/InternalLinks.tsx` | guide slots, rotating review windows, dead `ageBasedGuide` branches removed |
| `src/lib/sanity/queries.ts` | `relatedGuidesQuery` on `targetAgeRange`; rotating review windows; `latestBlogPostsQuery` |
| `src/app/(public)/page.tsx` | soft-404 link removed; reads `blogPost` |
| `src/app/(public)/reviews/[slug]/page.tsx` | title frame; material links |
| `src/app/(public)/safe-toys/[toyType]/page.tsx` | title frame |
| `src/app/(public)/categories/[slug]/page.tsx` | "Narrow by age" nav |
| `src/app/(public)/best-toys/page.tsx` | canonical age slugs only |
| `src/app/(public)/best-toys/category/[category]/[ageGroup]/page.tsx` | visible breadcrumb |
| `src/app/(public)/blog/[slug]/page.tsx` | buy CTAs from `relatedReviews` |
| `src/lib/seo/programmatic-pages.ts` | `getLinkableToyTypes`, boundary-age canonicals, `CANONICAL_AGE_SLUGS` |
| `src/components/layout/Footer.tsx` | `/best-toys`, `/gift-guides` |
| `src/components/affiliate/BuyButton.tsx` | `BUY_CTA_LABEL` as default |
| `src/app/api/webhooks/sanity/route.ts` | revalidate `/llms.txt` |

**Added:** `src/app/llms.txt/route.ts`, `src/lib/seo/claim-negation.ts` (+ tests),
`src/components/seo/InternalLinks.test.ts`, `.github/workflows/seo-guards.yml`,
and eleven scripts (`audit-stale-claims`, `audit-onpage`, `audit-orphan-pages`,
`pull-semrush`, `semrush-mcp`, `build-url-inventory`, `build-keyword-map`,
`verify-nojs-render`, `browser-drive`, `browser-session`,
`backfill-post-related-reviews`).

**Deleted:** `scripts/audit-stale-claims.test.mjs` — vitest collected it by name
and its `process.exit(0)` failed the run; superseded by the vitest suite.

---

## 4. URLs affected

| Scope | Count |
| --- | --- |
| Orphans linked | 35 |
| Review titles reframed | 138 |
| Age URLs consolidated | 11 → 5 canonical |
| Routes with `<main>` corrected | 31 |
| Guides whose inbound links changed | 12 |
| Roundups given a buy path | 5 |
| New routes | 1 (`/llms.txt`) |
| Redirects created | **0** |
| URLs removed or noindexed | **0** |

---

## 5. Tests run

| Check | Result |
| --- | --- |
| `vitest run` | 56 files, **659 tests** pass |
| `tsc --noEmit` | clean |
| `eslint src scripts` | 0 errors, 11 pre-existing warnings |
| `npm run build` | 99/99 pages |
| `audit-stale-claims` | 0 findings, 233 routes, 4 surfaces |
| `scan-output-claims` | 0 violations, 222 pages |
| `audit-onpage` | 0 errors, 72 warnings, 221 URLs |
| `check-index-readiness` (`SAMPLE=all`) | 0 problems, 0 warnings |
| `audit-internal-links` | 0 broken |
| `audit-orphan-pages` | 0 / 221 |
| `verify-review-output` | 0 problems |
| `audit-a11y` | 0 bugs, 16 page types |
| 14 page types individually | all 200, one `<main>`, one `<h1>`, self-canonical |

---

## 6. Before / after

| Measure | Before | After |
| --- | --- | --- |
| Orphan pages | 35 | **0** |
| Titles over 60 chars | 117 | 40 |
| Titles over 70 chars | 55 | 15 |
| Competing age URLs | 9 self-canonical | 5 canonical, 11 spellings folded |
| `<main>` per page | up to 3 | **1** |
| Inbound links to guides (min / max / total) | 1 / 38 / 73 | **14 / 68 / 390** |
| Worst review-page link concentration | 147 | 27 |
| Median inbound links per page | 9 | 14 |
| Roundups with a buy path | 0 of 5 | 5 of 5 |
| Soft 404s linked from the homepage | 1 | 0 |
| Audit scripts running in CI | 0 | 8 |
| Tests | 632 | 659 |

**Unchanged, and worth stating:** organic keywords 30, best position 25, modelled
traffic 0, referring domains 31 (all spam), Authority Score 2. None of this work
was expected to move rankings inside one session; the content work that might is
in `seo/content-roadmap.md` and has not been done.

---

## 7. Claims and schema deliberately rejected

| Rejected | Why |
| --- | --- |
| "Fixing" 824 nofollow notices | Amazon affiliate links must carry `rel="nofollow sponsored"` |
| `AggregateRating` on review pages | An editorial score is not a customer rating. **0 across 233 pages.** |
| `Offer` price / availability | SafeNest does not track prices; Associates rules restrict display |
| A fake `Person` author | `author` and `publisher` are `Organization: SafeNest Toys` |
| Deleting "not laboratory testing" disclaimers | The first scanner flagged 373 of these as violations. They are required language. |
| Disavow file for 31 spam domains | Google discounts them; one anchor names `itxoft.com`, proving templated spam rather than a targeted attack |
| Chasing `schemaOrg: 0` | Semrush's counter cannot read JSON-LD; markup is present and valid |
| Truncating product names for title length | Trades a real query term for a presentational metric |
| Redirecting the 11 age-alias URLs | They canonicalise correctly already; working as designed |

---

## 8. Unresolved

1. **Page weight.** `/best-toys/1-2-years` 1,259 KB, `/reviews` 1,079 KB. Needs a
   pagination decision. The most likely true cause of Semrush's "low text to HTML
   ratio" on 91 of 100 pages.
2. **The cron will keep manufacturing cannibalisation.**
   `generate-blog-post` rotates four category topics on week-stamped slugs, so a
   new ~400-word near-duplicate of each category appears every ~8 weeks
   indefinitely, each competing with a guide that ranks. Stopping it is one line;
   consolidating the three existing posts needs a redirect map and your decision.
3. **The 6–12 month cannibalisation.** `/guides/best-toys-6-12-months` (471 words)
   and `/best-toys/6-12-months` (1,676 words) have near-identical titles and both
   rank for nothing on a 2,400/mo KD-15 head term.
4. **Both Semrush projects are on `www`.** 22 of 30 ranking URLs are recorded
   there. Until rebuilt on the apex, no Site Audit or Position Tracking figure is
   trustworthy.
5. **Search Console is now connected** — resolved 2026-08-25. Service account
   reads `sc-domain:safenesttoys.com`; `scripts/pull-search-console.mjs` pulls six
   reports into `gsc/`. The data contradicts several Semrush-derived conclusions in
   this directory; see `seo/gsc-findings.md`. Only 83 days of history exists (the
   property was created ~2026-06-02), so there is no 16-month baseline to recover.
6. **Zero legitimate backlinks.** The other candidate explanation for positions
   25–98, and it cannot be separated from the depth hypothesis with current data.
7. **Three pages carry no JSON-LD** — `/about`, `/transparency`, `/best-toys`.
8. **`reviewRating` 4.8/5 vs visible "Safety 95/100."** Same value rescaled; your
   judgement whether to align them.

---

## 9. Measurement checkpoints

**Day 30 — did the technical work get picked up?**
Re-run `scripts/pull-semrush.mjs` and the guards. Expect: indexed pages steady or
up, orphans still 0, guides still holding the internal-link distribution. Do not
expect ranking movement yet. Record in `seo/seo-changelog.csv`.

**Day 60 — is depth working?**
Only meaningful if the content work in `seo/content-roadmap.md` has shipped. Check
`/guides/best-building-toys-preschoolers` on "best toys for building independence"
(baseline 98) and `/guides/best-sensory-toys-babies` on the KD 0–4 tail (baseline
41–58). Expect movement into the 20s–30s if depth is the constraint.

**Day 90 — the falsification test.**
If all three pages are at competitive depth and nothing has moved out of the 21–50
band, **depth was not the constraint and authority is.** Stop writing and put
everything into earning legitimate referring domains.

Stated this way deliberately, so it can be checked rather than rationalised.

**Throughout, if Search Console gets connected:** treat its clicks, impressions,
CTR and average position as authoritative over every Semrush figure in these
documents.
