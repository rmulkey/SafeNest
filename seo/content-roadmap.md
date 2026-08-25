# Content roadmap

**Data date:** 2026-08-25
**Depends on:** `seo/keyword-map.csv`, `seo/competitor-gap.md`, `seo/baseline.md`

---

## The strategic conclusion, first

Three facts from the data decide everything below.

**1. Guides are the acquisition channel. Reviews are not.** Three buying guides
hold 25 of the site's 30 ranking keywords. The 138 review pages hold 5 between
them — and that is not fixable. Product-name SERPs are wall-to-wall retailers:

> `fisher price giant rock a stack` → Target, Walmart, shop.mattel, Amazon,
> TikTok, Canadian Tire, Instagram, Macy's, eBay. Zero editorial results in the
> top ten.

Review pages should be treated as a **conversion surface** — the thing a guide
sends someone to, and where the affiliate click happens — not as a traffic source.
Content effort spent making review pages rank is spent against Google's intent
read for those queries.

**2. The constraint is depth, not difficulty.** Keyword difficulty across the
whole ranking set is **0 to 31**. An unknown Shopify store blog holds position 1
for a 4,400/mo term at KD 12. Meanwhile:

| Page | Keywords held | Volume | Words | Median of pages beating it |
| --- | --- | --- | --- | --- |
| `/guides/best-sensory-toys-babies` | 18 | 7,070/mo | **495** | 1,743 |
| `/guides/best-building-toys-preschoolers` | 6 | 4,770/mo | **471** | ~2,700 |
| `/guides/best-wooden-nontoxic-toys` | 1 | 50/mo | **688** | 1,887 |

The pages carrying the site's entire organic surface are its shortest content.

**3. Nothing new should be written until those three exist properly.** The site
has 221 URLs, 6 of which rank. Adding URL 222 does not address that.

---

## P1 — Deepen the three pages that already rank

**This is the whole first phase.** No new pages.

### 1. `/guides/best-building-toys-preschoolers` — highest score in the map (77.0)

| | |
| --- | --- |
| Primary keyword | "best toys for building independence" — 4,400/mo, **KD 12**, currently **98** |
| Secondary cluster | best building toys for 3 year olds (90, KD 7, at 59), best construction toys (90, KD 15, at 79), best building construction toys (70, KD 11, at 80), best building toy (50, KD 13, at 82) |
| Now | 471 words, 4 h2, 9 h3, 12 images |
| Target | ~2,500 words, matching the #1 result's 3,571 rather than amightygirl's 10,901 (which ranks 7th) |

The primary keyword is the single best opportunity on the site: highest volume in
the ranking set, second-lowest difficulty, and we are at 98 — meaning Google
already associates the page with the term and ranks it last.

Note the intent: "building **independence**" is developmental, not
material-related. The page currently reads as a product list. The winning results
(chalkacademy, dayswithgrey) organise around what the child is *doing*.

**Sections to add, each substantiable:**
- What "independent play" means at 3–5, and why open-ended sets support it —
  framed as published developmental guidance, not SafeNest's clinical opinion
- Per pick: reported materials with **evidence status**, published dimensions, the
  small-parts interpretation, and the dated CPSC recall check
- **Mixed-age households** — the single biggest gap in every competing page. A
  guide recommending small-parts building sets that never mentions a crawling
  sibling is incomplete, and parents of more than one child know it. Source
  material already exists at `/blog/homeschool-manipulatives-safety-mixed-ages`.
- How to choose between magnetic tiles, wooden unit blocks and interlocking bricks
  — a decision framework, which no competing page provides
- What SafeNest could not verify

### 2. `/guides/best-sensory-toys-babies` — 18 keywords, the broadest cluster

| | |
| --- | --- |
| Primary keyword | "sensory toys for babies" — 3,600/mo, KD 24, currently **62** |
| Secondary cluster (all already ranking) | baby sensory toys (880, KD 23, at 45), sensory toys for newborns (720, KD 21, at 40), sensory toys for infants (590, KD 14, at 59), sensory baby toys (170, **KD 4**, at 41), sensory items for infants (110, KD 9, at 52), sensory infant toys (90, **KD 3**, at 56), sensory toys baby (40, **KD 0**, at 58) |
| Now | 495 words |
| Target | ~1,800 words, at the median of the ranking field |

The low-difficulty tail here is remarkable — KD 0, 3, 4 and 9 on terms where the
page already sits at 41–58. Those should be reachable on depth alone.

**Sections to add:** what "sensory" actually means across the five senses at 0–12
months and which toys serve which; the high-contrast question for newborn vision;
mouthing and material safety with evidence status per claim; washability, since
every sensory toy for this age goes in a mouth; when a sensory toy is
developmentally pointless (nobody says this, and it builds trust).

### 3. `/guides/best-toys-6-12-months` — a page that exists and ranks for nothing

| | |
| --- | --- |
| Primary keyword | "best toys for 6 month old" — **2,400/mo, KD 15, not ranking at all** |
| Cluster | ~6,860/mo unserved across ~30 measured variants |
| Now | 471 words, and until `abea983` it had **one** inbound internal link |

**This one needs a decision before writing** — see the cannibalisation section
below. It competes directly with `/best-toys/6-12-months` (1,676 words, 42 product
cards) on a near-identical title.

The winnable modifier variants are the low-difficulty ones: best montessori toys
for 6 month old (40, **KD 2**), best learning toys for 6 month old (90, KD 11),
best educational toys for 6 month old (70, KD 12), best developmental toys for 6
month old (140, KD 22).

Note `unitypoint.org` — a hospital — ranks **4th** for the head term with
child-development content. That is the closest analogue to SafeNest's positioning
and the strongest signal that a developmental framing beats a product list here.

---

## P1 — Resolve three cannibalisation clusters

These need editorial decisions, not code. Recorded in `seo/keyword-map.csv` class D.

### `/guides/best-toys-6-12-months` vs `/best-toys/6-12-months`

| | Guide | Listing |
| --- | --- | --- |
| Title | "Best Toys for 6–12 Month Olds" | "Best Toys for 6–12 months" |
| Words | 471 | 1,676 |
| Products | ~7 | 42 |
| Ranks for | nothing | nothing |

Two self-canonical URLs, near-identical titles, same intent. Google has to pick and
is picking neither.

**Recommendation: the listing wins the head term.** The SERP for "best toys for 6
month old" is collection-page dominated (fatbrainbaby "shop by age",
themontessoriroom collections, shop.kids2 collections). Google wants a browsable
list, which is what the listing is. Retitle the guide to own the *developmental*
angle instead — that is where `unitypoint.org` wins and where the listing cannot
compete.

**Do not redirect either.** Both are useful pages; the fix is differentiation.

### The cron-generated category roundups

`src/lib/catalog/generate-blog-post.ts` rotates four category topics on
week-stamped slugs, publishing on even ISO weeks. Three exist:

| Slug | Words | Ranking keywords | Competes with |
| --- | --- | --- | --- |
| `top-child-safe-educational-toys-2026-w30` | ~400 | 0 | `/guides/best-educational-toys-2-3-years` |
| `top-child-safe-building-toys-2026-w32` | ~400 | 0 | `/guides/best-building-toys-preschoolers` (6 kw) |
| `top-child-safe-sensory-toys-2026-w34` | ~400 | 0 | `/guides/best-sensory-toys-babies` (18 kw) |

**Left running, this mints a new near-duplicate of every category every ~8 weeks,
indefinitely.** Each one is ~400 words competing with a guide that actually ranks.
`top-7-child-safe-toys-2026` already shares 4 of its 7 products with the
educational roundup and 2 of 7 with the building one.

**Recommendation, in order:**

1. **Stop the category rotation.** One line in the topic list. This is the urgent
   part — it prevents the problem growing while the rest is decided.
2. **Keep the six explainer articles.** They are 3,500–8,200 characters, genuinely
   distinct, and two of them (`button-batteries-and-magnets-toy-safety`,
   `secondhand-toy-safety-checklist`) are the best link-earning candidates on the
   site.
3. **Fold the three roundups' useful content into the matching guides**, then
   301 the roundup URLs to those guides. They rank for nothing, so there is no
   equity at risk — but they are in the sitemap and carry internal links, so a
   redirect map is needed. Draft:

   ```
   /blog/top-child-safe-sensory-toys-2026-w34      -> /guides/best-sensory-toys-babies
   /blog/top-child-safe-building-toys-2026-w32     -> /guides/best-building-toys-preschoolers
   /blog/top-child-safe-educational-toys-2026-w30  -> /guides/best-educational-toys-2-3-years
   ```

4. **Keep `top-7-child-safe-toys-2026` and the Fourth of July post.** The first is
   a genuine site-wide "best of"; the second is seasonal and recurs usefully.

**This is your call, not mine.** It removes published content, and the brief is
explicit that URLs should not be redirected without evidence and a map. The
evidence is above; the decision is yours.

---

## P2 — Page weight

`/best-toys/1-2-years` ships **1,259 KB** and `/reviews` **1,079 KB**, rendering
87 and 138 product cards respectively with no pagination.

Options, cheapest first:

1. **Paginate at 24–30 cards.** Conventional, and `/reviews` is a browse surface
   where nobody reads card 100. Needs `rel` pagination handled properly and the
   sitemap updated.
2. **Keep one page, defer below-fold cards.** Preserves the single indexable URL
   and the internal links to every review, which matters — those listing pages are
   how review pages get their inbound links. Costs more implementation.
3. **Reduce per-card markup.** ~9 KB per card is high. Cheapest, smallest win.

**Recommendation: option 2 for `/best-toys/[age]`, option 1 for `/reviews`.** The
age pages are a ranking target and shed internal link equity if paginated; the
review index is pure navigation and does not.

---

## P3 — New content, only after P1 lands

Every proposal below is a hypothesis with measured demand. **None should be written
until the three P1 pages are at competitive depth**, because the same effort spent
there has better expected return and the site does not need more URLs.

The brief lists candidate clusters. Judged against the data:

| Cluster | Verdict |
| --- | --- |
| Choking hazards / small parts | **Strong.** SafeNest's choking-risk interpretation is a genuine differentiator and no competitor does it. Feeds every guide. |
| Battery-compartment safety | **Strong.** `button-batteries-and-magnets-toy-safety` already exists and is good — expand and promote it rather than write another. |
| Magnets in children's toys | Covered by the same existing article. Do not split. |
| Secondhand toy inspection | **Already exists** and is one of the two best articles on the site. Promote, do not rewrite. |
| Mixed-age homes | **Strong**, and the biggest gap in every competing page. Should become a section in the guides *first*, then possibly a standalone hub. |
| Toy recalls / what parents should do | **Strong link-earning asset.** `/recalls` already carries 4,389 words of real CPSC data. This is the most linkable thing the site owns. |
| Material-claim explainers | Medium. 20 `/safe-toys/[material]` pages exist at 270–298 words. Deepen the ones with real volume rather than adding more. |
| Bath-toy mould | Medium. `/guides/best-bath-water-toys` exists; check demand before expanding. |
| Toy safety by age | **Already the age listings.** Do not create a parallel set. |
| Quiet / open-ended toys | Unvalidated. Measure before committing. |
| Durable / washable toys | Unvalidated. Measure before committing. |

---

## Sequencing, and the falsification test

1. Stop the cron rotation. One line, prevents growth.
2. Deepen `/guides/best-building-toys-preschoolers`. Highest score, lowest difficulty.
3. Deepen `/guides/best-sensory-toys-babies`. Broadest cluster, KD 0–4 tail.
4. Decide the 6–12 month cannibalisation, then deepen the winner.
5. Re-measure at 30 and 60 days.

**The test that matters:** if all three pages reach competitive depth and positions
have not moved within 60–90 days, then depth was not the constraint and authority
is. At that point stop writing and put everything into earning links — because with
zero legitimate referring domains, that is the other candidate explanation and the
two cannot be separated with the data available today.

Stated plainly so it can be checked rather than rationalised later.
