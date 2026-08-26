# Search Console findings — and corrections to the rest of `seo/`

**Data date:** 2026-08-25
**Source:** first-party, `gsc/` via `scripts/pull-search-console.mjs`
**Window:** 2026-06-02 to 2026-08-23 — **83 days, not 16 months**

This document takes precedence over the Semrush-derived conclusions in
`seo/baseline.md`, `seo/keyword-map.csv` and `seo/content-roadmap.md` wherever
they disagree. Several of them are wrong.

---

## Headline totals

| Metric | Value |
| --- | --- |
| Impressions | 1,138 |
| Clicks | 8 |
| Distinct queries with impressions | 90 |
| Distinct pages with impressions | 80 |
| Queries in top 3 | 0 |
| Queries in **top 10** | **12** |
| Queries in **top 20** | **22** |
| Average position across queries | 49.2 |
| Days with data | 83 |
| Impressions per day | ~14 |

The property was created around 2026-06-02, which matches the age of the DNS TXT
record. **There is no 16-month history to recover** — 83 days is all that exists.

---

## Correction 1 — Semrush was wrong about positions, badly

`seo/baseline.md` states, from Semrush: *"Nothing ranks above position 25. The
single best position on the entire site is 25."* It then draws a major conclusion
from that — that the brief's "striking distance" class (positions 4–20) is empty
and its priorities had to be rewritten around the 21–50 band.

**That is false.** First-party data shows **22 queries in the top 20 and 12 in the
top 10**, with pages averaging as high as position 6.9.

Semrush's keyword database simply does not contain this site's long-tail product
queries. Third-party tools track a fixed keyword universe; queries like
`manhattan toy skwish choking hazard` are not in it. Semrush was not lying — it
reported everything it could see, which was 30 keywords out of at least 90.

**Consequence: the brief's Class A (quick CTR wins) and Class B (striking
distance, 4–20) both exist and are populatable.** I recorded both as empty. They
are not.

## Correction 2 — review pages outrank the guides, by a wide margin

`seo/content-roadmap.md` opens with: *"Guides are the acquisition channel. Reviews
are not… Review pages should be treated as a conversion surface, not a traffic
source."* It argues review pages cannot rank because product-name SERPs are
retailer-dominated.

**The data says the opposite.**

| Page | Avg position | Impressions |
| --- | --- | --- |
| `/reviews/hape-shape-sorter-xylophone` | **6.9** | 40 |
| `/reviews/janod-translucent-sensory-stacking-blocks` | **7.3** | 35 |
| `/reviews/leapfrog-learning-friends-book` | **8.0** | 37 |
| `/reviews/bright-starts-oball-shaker-toy` | **8.1** | 20 |
| `www/reviews/hape-pound-tap-xylophone` | **8.4** | 39 |
| `/reviews/fat-brain-dimpl` | **9.9** | 58 |
| `/reviews/grimms-large-rainbow-stacker` | **10.9** | 19 |
| `/reviews/manhattan-toy-skwish-rattle` | **11.6** | 80 |
| — | | |
| `www/guides/best-educational-toys-2-3-years` | 38.0 | 42 |
| `www/guides/best-sensory-toys-babies` | **49.7** | **291** |
| `/guides/best-wooden-nontoxic-toys` | 74.3 | 18 |
| `/guides/best-building-toys-preschoolers` | **83.7** | 30 |

Reviews sit at 7–12. Guides sit at 38–84. The guide I identified as the single
highest-value target on the site — `/guides/best-building-toys-preschoolers`,
scored 77.0 in `seo/keyword-map.csv` — is at position **83.7**.

Where I was right: the guides do attract the most impressions when they rank at
all (`best-sensory-toys-babies` has 291, the most of any page). Where I was wrong:
I concluded reviews *cannot* rank from SERP composition on head terms, and never
checked whether they were already ranking on long-tail terms. They are.

## Correction 3 — the winning query shape is safety concern, not "best X"

This is the finding that should reshape the content plan. The queries where
SafeNest ranks best are not "best toys for…" at all:

| Query | Position | Impressions |
| --- | --- | --- |
| `hape pound and tap bench () reviews` | **8.3** | 7 |
| `fat brain dimpl () reviews` | **10.4** | 5 |
| `manhattan toy skwish choking hazard` | **12.8** | 13 |
| `melissa and doug stacking train recall` | **14.0** | 12 |
| `manhattan toy skwish ökotest` | 26.6 | 5 |
| `newborn sensory toys` | 41.1 | 51 |
| `sensory toys for babies` | 51.1 | 38 |
| `toy warning label` | 66.3 | 6 |
| `best building toy` | 85.6 | 5 |

The pattern: **`{specific product} + {safety concern}`** ranks at 8–14.
**`best {category} toys`** ranks at 41–86.

`choking hazard`, `recall`, `ökotest` (a German consumer-testing organisation),
`warning label` — this is precisely SafeNest's differentiator, and it is *already
working* without anyone targeting it. Meanwhile the effort has gone into "best X"
guides that are losing at position 38–84 to sites with real backlink profiles.

## Correction 4 — the `()` queries are historical, not a bug

Twelve queries contain a literal `()` — `hape pound & tap bench () reviews`,
`bright starts oball rattle () reviews` — ranking at 7.8–13.

I checked: `()` appears in no current title, H1 or visible text on those pages.
Google is still matching **the old title format**, which was
`{product} Safety Review - Score N/100` before it changed this morning. Semrush's
`vtech race & learn driver product info and reviews` is the same artefact.

**Nothing to fix.** But it does mean the title change shipped today has not been
re-crawled, so any title-based measurement needs to wait for that.

---

## What is *not* established: the CTR gap

Sitewide CTR is 0.70% (8 clicks / 1,138 impressions). A generic
position-to-CTR curve would predict roughly 22 clicks, so ~2%.

**I am not going to call that a CTR problem yet**, for two reasons:

1. **The counts are tiny.** Most pages have 1–40 impressions. A page at position
   6.4 with 16 impressions has an expected click count of 0.8; observing 0 is
   unremarkable.
2. **`position` in Search Console is an average across impressions.** A page with
   average position 6.4 may have sat at 15 for most of them, which inflates the
   expected-click estimate.

The shortfall is suggestive and worth watching. It is not yet a finding, and
building a title test on it now would be measuring noise.

**The binding constraint is impression volume: ~14 per day.** That is the number
to move, and it is a coverage-and-authority problem, not a titles problem.

---

## What this changes in the plan

**Do this instead of what `seo/content-roadmap.md` currently says:**

1. **Stop treating review pages as a lost cause.** They are the site's best-ranking
   asset. There are 138 of them and they already reach positions 7–12 on long-tail
   product queries.
2. **Lean into the safety-concern query shape.** `{product} choking hazard`,
   `{product} recall`, `{product} safe for {age}`, `{product} warning label`. These
   rank at 8–14 today with no deliberate targeting, they match what SafeNest can
   uniquely substantiate, and no competitor covered in
   `seo/competitor-gap.md` addresses them. This is the wedge.
3. **Demote the guide-depth work from P1.** It is not wrong — 471 and 495 words
   against a 1,743–2,700 word field is still a real deficit — but those pages are
   at 38–84 against established competitors, while reviews are at 7–12. The guides
   are the harder fight and I had them as the priority.
4. **Keep `www` in view.** The single highest-impression page is the **www** version
   of the sensory guide (291 impressions). First-party data confirms Google holds
   substantial www history, so consolidation genuinely matters.
5. **Revisit CTR once impressions grow.** `seo/ctr-test-plan.md` is no longer
   blocked on data availability, but it is blocked on volume. Re-read it when a
   page clears a few hundred impressions.

---

## Re-running this

```
set -a; . ./.env.local; set +a
node scripts/pull-search-console.mjs
```

Six CSVs into `gsc/` (gitignored): queries, pages, query+page, dates, devices,
countries, plus a manifest. Safe to run on a schedule.

**Still not available via any API here:** Indexing → Pages, i.e. how many of the
221 sitemap URLs are indexed versus "Discovered – currently not indexed". 80 pages
have impressions, so at least 80 are indexed. The gap between 80 and 221 is worth
reading in the UI.
