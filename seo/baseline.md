# SafeNest Toys — SEO baseline

> **SUPERSEDED IN PART — read `seo/gsc-findings.md` first.**
> First-party Search Console data obtained 2026-08-25 contradicts several
> Semrush-derived conclusions in this document. Most importantly: Semrush
> reported nothing above position 25, while Search Console shows **22 queries in
> the top 20 and 12 in the top 10**, and review pages (positions 7–12) outrank the
> buying guides (38–84). Corrections are itemised in `seo/gsc-findings.md`.

**Data date:** 2026-08-25
**Site:** https://safenesttoys.com
**Framework:** Next.js 16.2.7 / React 19.2.4, App Router, `cacheComponents: true` (Partial Prerendering), deployed on Vercel
**Raw evidence:** `seo/data/` — one file per report, each with a header recording the report name, parameters and fetch time. `seo/data/manifest.json` lists every call and its outcome.

---

## 1. How this data was obtained, and what it is worth

Everything came through the Semrush MCP server at `https://mcp.semrush.com/v2/mcp`
(`Authorization: Apikey`). The REST APIs are not usable with this account's key:
v4 endpoints answer `403 Forbidden`, v3 answers `ERROR 120 :: WRONG KEY - ID PAIR`.
MCP also carries read-only Projects API v3, which is the only channel that exposes
Site Audit.

**Semrush organic traffic and search volume are modelled estimates, not
measurements.** They are used here for *relative* prioritisation only.

**There is no first-party search data.** `NEXT_PUBLIC_GA4_MEASUREMENT_ID` and
`NEXT_PUBLIC_POSTHOG_KEY` are both empty in `.env.local`, no GSC or GA4 export
exists in the repo, and `semrush/` contains only its README. So there are **no
impressions, no CTR and no click data anywhere in this baseline**. Every CTR
statement in the roadmap is therefore a hypothesis, not an observation, and the
title test in `seo/ctr-test-plan.md` cannot be evaluated until Search Console
data exists.

Google Search Console *is* verified — a `google-site-verification` TXT record
resolves on the apex — so the data exists; it just has not been exported.

---

## 2. Current performance

From `seo/data/domain-overview.csv`:

| Metric | Value |
| --- | --- |
| Semrush Rank | 15,306,701 |
| Organic keywords (US) | **30** |
| Organic traffic (modelled) | **0** |
| Organic traffic cost | 0 |
| Paid keywords | 0 |

### Ranking distribution

From `seo/data/organic-positions.csv` (30 keywords):

| Bucket | Keywords |
| --- | --- |
| Top 3 | **0** |
| 4–10 | **0** |
| 11–20 | **0** |
| 21–50 | 9 |
| 51–100 | 21 |

Nothing ranks above position 25 **in Semrush's database**. That turned out to be
a limitation of Semrush rather than a fact about the site: first-party Search
Console data shows 22 queries in the top 20 and 12 in the top 10, with pages
averaging as high as position 6.9. Semrush's keyword universe does not contain
this site's long-tail product queries. See `seo/gsc-findings.md`. That is why modelled traffic is 0 despite 12,360 monthly searches across
the ranking set — every ranking sits below where clicks occur.

**This appeared to change how the brief's priorities apply** — on Semrush data
alone there were no positions 4–20 to work with. First-party data has since shown
that both that class and the high-impression class do exist; see
`seo/gsc-findings.md`. The paragraph below reflects the Semrush-only view and is
retained for the record. There are no positions 4–20 to improve, and with no GSC data
there are no observed impressions. Priority has to shift to the 21–50 band and to
the structural reasons nothing has climbed out of it.

### Which URLs hold the visibility

From `seo/data/organic-pages.csv` — **6 URLs out of 221 carry every ranking
keyword**:

| URL | Keywords | Modelled traffic |
| --- | --- | --- |
| `/guides/best-sensory-toys-babies` | 18 | 0 |
| `/guides/best-building-toys-preschoolers` | 6 | 0 |
| `/reviews/little-tikes-3-in-1-splash-n-grow-water-table` | 3 | 0 |
| `/guides/best-wooden-nontoxic-toys` | 1 | 0 |
| `/reviews/vtech-race-and-learn-driver` | 1 | 0 |
| `/reviews/mega-bloks-first-builders-big-bag-of-blocks` | 1 | 0 |

Three buying guides account for 25 of the 30 keywords. The 138 review pages
account for 5 keywords between them.

### Highest-volume terms and where they sit

| Volume/mo | Position | Keyword | URL |
| --- | --- | --- | --- |
| 4,400 | 98 | best toys for building independence | `/guides/best-building-toys-preschoolers` |
| 3,600 | 62 | sensory toys for babies | `/guides/best-sensory-toys-babies` |
| 880 | 45 | baby sensory toys | `/guides/best-sensory-toys-babies` |
| 720 | 40 | sensory toys for newborns | `/guides/best-sensory-toys-babies` |
| 590 | 59 | sensory toys for infants | `/guides/best-sensory-toys-babies` |

### Movement

- **Gained:** 1 keyword ("3 in 1 splash n grow water table", position 38).
- **Lost:** none — the report returns `ERROR 50 NOTHING FOUND`, i.e. an empty set.

### Host split — a real problem visible in the data

Of the 30 ranking URLs, **22 are on `www.safenesttoys.com` and 8 on the apex**.
`www` answers `308` to the apex on every URL, so Google's index holds ranking
history split across two hostnames that are now consolidating. Both Semrush
projects (Site Audit and Position Tracking) are also configured against `www`.

---

## 3. Backlinks

From `seo/data/backlinks-overview.csv` and `referring-domains.csv`:

| Metric | Value |
| --- | --- |
| Backlinks | 38 |
| Referring domains | 31 |
| Follow / nofollow | 12 / 20 |
| Authority Score | 2 |
| Trust Score | 2 |

**All 31 referring domains are link-selling spam.** A sample:
`pbnlinks.shop`, `pbnlinksmaster.shop`, `seopxl-traffic-growth-lab.shop`,
`seopxl-ranking-boost-lab.shop`, `seo-growth-authority-boost-hub.shop`,
`high-traffic-backlinks.site`, `fiverr-affordable-seo-services.site`,
`linknora.shop`, `domraider.eu.com`. 16 of 31 are `.shop` or `.site`. Domain
scores 0–6, median 2. First seen 2026-06-05, still accruing 2026-08-24.

The anchor text (`seo/data/backlink-anchors.csv`) shows what these are:
*"high quality dofollow backlinks da 50 pa 40 premium pbn"* (6 domains),
*"thanks to fiverr, my safenesttoys.com da jumped from 20 to…"*, and — decisively
— *"before finding **itxoft.com**, my experience with seo was frus…"*, which names
a different domain entirely. These are templated fake-testimonial pages with the
victim's domain substituted in. **SafeNest is collateral, not a target.**

**Recommendation: do not build a disavow file.** Google's link spam systems
neutralise this class automatically; 12 dofollow links from score-0–6 domains is
noise it already discounts. The actionable fact is not the spam, it is that there
are **zero legitimate referring domains**. That is the single best explanation for
why nothing has climbed out of positions 25–98.

---

## 4. Competitors — the report is empty

`domain_organic_organic` returns `ERROR 50 :: NOTHING FOUND`. Semrush cannot
compute organic competitors for this domain because there is not enough shared
ranking surface to measure overlap.

**Consequence:** Phase 4's Keyword Gap and Backlink Gap cannot be run from
Semrush's competitor reports. Competitors have instead been derived directly from
the SERPs via `phrase_organic`, which does work. See `seo/competitor-gap.md`.

---

## 5. Site Audit — the existing findings do not describe the current site

From `seo/data/site-audit-info.json`, snapshot `6a56771ebf4bc629d2fdc83e`:

- **Last crawl: 2026-07-14** — six weeks before this baseline.
- **Configured against `www.safenesttoys.com`**, where every URL answers 308.
- **Crawled 100 pages of a 221-URL sitemap**, `pages_limit: 100`, max depth 2.
- Errors 270, warnings 138, notices 836.

The 270 errors reconcile exactly, and none of them are current:

| Count | Issue | Status |
| --- | --- | --- |
| 182 | Broken internal links | All `/privacy` + `/terms`, on 91 pages × 2 hosts. Those pages did not exist on Jul 14; added in `66ccc7b` on Aug 17. Both return 200 now. |
| 28 | Duplicate title tag | 14 pages counted on both `www` and apex |
| 28 | Duplicate content | Same 14 pages, same cause |
| 28 | Duplicate meta descriptions | Same 14 pages, same cause |
| 4 | 4xx errors | `/privacy` + `/terms` on both hosts |

So **186 of 270 errors are one already-fixed bug, and 84 are the `www`/apex
double-crawl.** Zero are distinct current defects.

Warnings (138): 91 low text-to-HTML ratio, 37 title too long, 10 low word count.
Notices (836): **824 are `rel="nofollow"` on external links** — that is the
Amazon affiliate links complying with the Associates agreement. It must not be
"fixed". 2 blocked-from-crawling are `/api/` and `/dashboard` in robots.txt,
also correct. 1 is a missing `/llms.txt`, which has since been shipped.

`markups: schemaOrg: 0` across 93 pages is a Semrush counter limitation, not a
missing-markup finding — the served HTML carries `Product`, `Review`, `Rating`,
`Brand`, `BreadcrumbList`, `FAQPage`, `Organization`, `WebSite` and `BlogPosting`
JSON-LD, verified directly.

---

## 6. Current technical state, measured directly

Measured with the repo's own audit scripts against production:

| Check | Result |
| --- | --- |
| Sitemap URLs | 221, all HTTP 200, all indexable, all self-canonical |
| Orphan pages | **0 / 221** (script-stripped crawl, so it holds without JS) |
| Broken internal links | 0 |
| On-page errors | 0 (no missing/duplicate title, description, H1 or canonical) |
| On-page warnings | 72 — 40 titles over 60 chars, 15 meta descriptions 161–179 chars, 17 pages under 300 words |
| Prohibited claims | 0 across 222 pages |
| Stale trust claims | **0 across 233 routes**, on 4 surfaces (raw body, visible text, metadata, JSON-LD) |
| Accessibility | 0 bugs across 16 page types |
| `www` → apex | single 308, no chains; `http` → `https` single hop |
| robots.txt | allows crawling, declares the sitemap on the canonical host |

### The reported "Loading" / "Expert Reviewed" P0 is not present

This was checked carefully because it was reported as likely. It is not there,
and establishing that took three wrong measurements worth recording so they are
not repeated:

1. A first scanner reported **373 findings**. All false positives: the pattern
   for "laboratory testing" was matching the site's own disclaimers — *"an
   editorial assessment based on publicly available information — not laboratory
   testing or certification"*, *"We do not physically or laboratory test toys"*.
   Acting on that output would have deleted required language. The scanner is now
   negation-aware, with tests built from those real sentences.
2. Measuring "content without JS" by stripping only `<script>` says ~1,000 words
   per review page. That counts `hidden` subtrees, so it is too generous.
3. Measuring *rendered* text instead says 14 words, which reads as catastrophic
   and is equally wrong.

Ground truth, from Chromium with JavaScript disabled: `document.body.textContent`
is **2,085–10,918 words** per page, with every `<h2>` (up to 88) and every link
(up to 380) present in the DOM. `body.innerText` is 4 words because the copy sits
in `hidden` subtrees until hydration. **A markup parser — Googlebot, an SEO
crawler, most AI crawlers — reads all of it.**

### What was actually broken, and is now fixed

Nested `<main>` landmarks sitewide (`da84f3a`). `layout.tsx:71` owns
`<main id="main-content" tabindex="-1">`; 15 page templates, 3 `loading.tsx`
skeletons and `not-found.tsx` each rendered another inside it. Invalid HTML, and
the skeletons put `<main role="status" aria-label="Loading">` first in document
order. `/best-toys/1-2-years`, `/categories/*` and `/blog/*` went from 3 `<main>`
to 1; `/guides/*`, `/recalls`, `/reviews` from 2 to 1.

### Real, unresolved: page weight

| URL | HTML size |
| --- | --- |
| `/best-toys/1-2-years` | **1,260 KB** |
| `/reviews` | **1,080 KB** |
| `/recalls` | 187 KB |
| `/` | 146 KB |
| `/reviews/green-toys-stacking-cups` | 115 KB |

The two heavy pages render 87 and 138 product cards with no pagination. This is
the most likely true cause of Semrush's "low text to HTML ratio" on 91 of 100
pages, and it is a genuine Core Web Vitals and crawl-budget problem. Unaddressed —
it needs a pagination decision.

---

## 7. Limitations

- **No first-party data.** No GSC, no GA4, no PostHog. No impressions, CTR or
  clicks anywhere in this baseline.
- **Position Tracking is unavailable via the API.** `campaigns` for project
  30424632 returns `targets: null` with a 1-target limit, and
  `tracking_position_organic` answers `campaign not found`. The tool is enabled
  on the project but no campaign target is exposed.
- **No competitor report.** Too little ranking surface for Semrush to compute
  overlap, so Keyword Gap and Backlink Gap are unavailable from that source.
- **Site Audit data is six weeks stale and points at the wrong host.** It cannot
  be used to judge current state and has not been.
- **Semrush volume and traffic are modelled.** Treated as relative signal only.
- **AI-visibility data** is not exposed by the MCP toolkits available here; the
  figures seen in the web UI (AI Visibility 0, 3 cited pages, all ChatGPT) are
  recorded from the dashboard and are not reproducible through the API.

---

## 8. Priority opportunities

Ordered by expected effect on qualified clicks, given the evidence above.

**P0 — done in this pass**
- Nested `<main>` landmarks, sitewide. Fixed and guarded.
- Guard gap: the existing claim scanner missed the `"lab testing"` inflection.
  Closed.

**P1 — structural, and the binding constraints**
1. **Rebuild both Semrush projects on the apex.** Every current finding is
   distorted by the `www` configuration, and 22 of 30 ranking URLs are on `www`.
   Until this is done, no Site Audit or Position Tracking number is trustworthy.
2. **Export Search Console.** Without it there is no CTR work possible at all,
   and half this brief's priorities are unmeasurable. This is the single highest
   information-value action available.
3. **Earn legitimate referring domains.** Zero exist. With Authority Score 2 and
   keyword difficulty of only 12–24 on the target terms, this is what is holding
   positions at 25–98 rather than anything on-page.
4. **Page weight** on `/best-toys/[age]` and `/reviews`.

**P2 — on-page, where the data supports it**
5. `/guides/best-toys-6-12-months` targets "best toys for 6 month old" (2,400/mo,
   KD 15) and ranks nowhere. It received 1 inbound internal link until `abea983`
   raised it to 36. Highest-leverage single page on the site.
6. Title/description work on the 6 URLs that actually rank — but see the CTR
   caveat: with no GSC data, any title change is unmeasurable, so this should
   wait for the export rather than being spent blind.
7. The 40 titles over 60 characters and 15 descriptions over 160.

**Explicitly rejected**
- Disavowing the 31 spam domains. Google discounts them; the work is busywork.
- "Fixing" the 824 nofollow notices. Those are required by the Associates
  agreement.
- Chasing `schemaOrg: 0`. The markup is present and correct; the counter is wrong.
- Chasing Site Health as a number. 186 of the 270 errors are one bug fixed in
  August.

---

## 9. Before-state measurements, for later comparison

Recorded 2026-08-25 so the effect of subsequent work can be judged:

| Measure | Value |
| --- | --- |
| Organic keywords (Semrush, US) | 30 |
| Keywords in top 3 / 10 / 20 | 0 / 0 / 0 |
| Keywords 21–50 / 51–100 | 9 / 21 |
| Best position on the site | 25 |
| URLs with ≥1 ranking keyword | 6 of 221 |
| Modelled organic traffic | 0 |
| Referring domains (all spam) | 31 |
| Authority Score | 2 |
| Sitemap URLs / orphans | 221 / 0 |
| Titles over 60 chars | 40 |
| Inbound internal links to guides (min / max / total) | 14 / 68 / 390 |
| Heaviest page | 1,260 KB |
| `<main>` elements per page | 1 (was up to 3) |
