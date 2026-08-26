# CTR test plan

**Data date:** 2026-08-25
**Status: still do not run this yet — but the reason has changed.**

Search Console data now exists in `gsc/` (obtained 2026-08-25). So this is no
longer blocked on data availability. It is blocked on **volume**: 1,138
impressions across 83 days, roughly 14 a day, with most pages carrying 1–40
impressions. A page at position 6.4 with 16 impressions has an expected click
count of 0.8, so a title test there would measure noise.

Sitewide CTR is 0.70% against a rough position-based expectation of ~2%. That is
suggestive, not a finding — see `seo/gsc-findings.md` for why the counts are too
small and why Search Console's averaged `position` inflates the expectation.

Re-read this once a page clears a few hundred impressions. The cohort design,
title variants and guardrails below are unchanged and ready.

---

## Why this cannot start

A CTR test needs a before-and-after on impressions, clicks, click-through rate and
average position, per query. **None of that data exists for this site.**

| Source | State |
| --- | --- |
| Google Search Console export | none in the repo, none in `semrush/` |
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID` | empty in `.env.local` |
| `NEXT_PUBLIC_POSTHOG_KEY` | empty in `.env.local` |
| Semrush Position Tracking | unavailable — `campaigns` returns `targets: null`, `tracking_position_organic` answers `campaign not found` |
| Semrush organic traffic | modelled, and reads **0** |

Semrush estimates cannot substitute. They model traffic from position and volume,
so they would move whenever a *ranking* moved and never because a *title* changed.
Using them to judge a title test would measure the wrong thing and produce a
confident wrong answer.

There is a second, harder reason. **Nothing on this site ranks above position 25.**
CTR at position 25–98 is near zero regardless of the title, so even with perfect
data a title change would have almost nothing to act on. Titles start to matter
once a page reaches roughly the top 20.

**So the sequence is: earn positions first, then test titles.** Running this now
would burn the one clean baseline available on pages that cannot yet benefit.

---

## Unblocking, in order

1. **Get Search Console data into `gsc/`.** Either run
   `scripts/pull-search-console.mjs` after a one-time service-account setup
   (durable, repeatable, ~5 minutes — steps in `gsc/README.md`), or export the
   16-month CSV by hand from the Performance report. This is the single highest
   information-value action available on the whole engagement.

   Note the browser cannot do this for you: Chrome refuses remote debugging on
   the default profile as of Chrome 136, verified on 151, so a signed-in session
   cannot be driven.
2. Let 28 days of data accumulate as a clean baseline.
3. Get at least a few pages into the top 20 — see `seo/content-roadmap.md`.
4. Then run the test below.

---

## The test, ready to run when the data exists

### Cohort

Not every title at once. Two groups, so a ranking-wide shift can be told apart
from a title effect:

- **Test group:** pages that have reached the top 20 and show impressions with
  below-expected CTR for their position.
- **Control group:** comparable pages in the same position band, titles untouched
  for the whole window.

If both groups move together, the cause was not the titles.

### Candidates, with rewrites already drafted

Written now because the reasoning is available now; positions are current as of
2026-08-25 and all three are far too deep to test yet.

**`/guides/best-building-toys-preschoolers`** — currently
`Best Building & Construction Toys for Preschoolers | SafeNest Toys` (66 chars)

| # | Candidate | Chars | Rationale |
| --- | --- | --- | --- |
| A | `Best Building Toys for Preschoolers: 12 Compared` | 48 | count signals a real comparison |
| B | `Best Building Toys for 3–5s — Safety & Small Parts Checked` | 58 | leads on the differentiator |
| C | `Building Toys for Independent Play, Ages 3–5` | 44 | matches "building independence" intent |

**`/guides/best-sensory-toys-babies`** — currently
`Best Sensory Toys for Babies (0–12 Months) | SafeNest Toys` (57 chars)

| # | Candidate | Chars | Rationale |
| --- | --- | --- | --- |
| A | `Sensory Toys for Babies: 0–12 Months, Materials Checked` | 55 | the head term first |
| B | `Best Sensory Toys for Newborns & Babies (0–12 Months)` | 53 | covers the "newborns" variant, 720/mo |
| C | `Baby Sensory Toys: What's Worth It at 0–12 Months` | 49 | question framing, covers "baby sensory toys" 880/mo |

**`/best-toys/6-12-months`** — currently
`Best Toys for 6–12 months | SafeNest Toys` (41 chars)

| # | Candidate | Chars | Rationale |
| --- | --- | --- | --- |
| A | `Best Toys for 6 Month Olds — 42 Compared by Safety Score` | 56 | exact head term, 2,400/mo |
| B | `Best Toys for 6–12 Months: 42 Reviewed & Recall-Checked` | 55 | count plus the differentiator |
| C | `Toys for 6 Month Olds, Compared on Safety and Development` | 57 | the framing that wins for unitypoint.org |

### Language rules

Permitted, because each is true and verifiable: age range, product count,
"compared", "recall-checked", "materials checked", "safety score", the score
itself, "parent-researched".

Forbidden, because it would breach the site's own standards: "tested", "lab
tested", "expert reviewed", "certified", "safest", "guaranteed safe", any implied
laboratory result, invented urgency, or a year the page does not actually maintain.

### Measurement

| | |
| --- | --- |
| Baseline | 28 days before the change, per query and per page |
| Change window | one deploy, dated, recorded in `seo/seo-changelog.csv` |
| Evaluation | 28 days after, then again at 56 |
| Primary metric | CTR at comparable average position |
| Guardrails | average position, total impressions, affiliate outbound clicks, email signups |
| Query grouping | by cluster, not individual keyword — single-keyword CTR is too noisy at this volume |

### Rollback

Revert a title if, after 28 days at comparable average position, CTR falls more
than 15% relative to baseline, or affiliate clicks per session on that page fall
while position holds.

### The interpretation trap

**A CTR rise caused by a ranking rise is not evidence the title worked.** Position
1 has roughly ten times the CTR of position 10; a page moving 18 → 9 will show
better CTR whatever its title says.

So CTR is only ever read **at comparable average position**, and the control group
exists precisely to catch this. If test and control both improve, the cause was
ranking, and the honest conclusion is that the test was inconclusive.

---

## Separately: the 40 over-length titles

40 of 221 titles exceed 60 characters (`scripts/audit-onpage.mjs`). These are
**not** part of the test above and should not be batched into it.

28 are review pages where the length comes from a long product name, and trimming
one trades a real query term for a presentational metric. 6 are guides, 5 blog
posts, 1 a gift guide — editorial titles.

Google truncates for display; it does not penalise length. With no CTR data there
is no way to know whether truncation is costing clicks on any of them. Leave them,
and revisit once Search Console is connected and the question can actually be
answered.
