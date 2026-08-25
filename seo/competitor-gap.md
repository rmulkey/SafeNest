# Competitor gap analysis

**Data date:** 2026-08-25
**Raw evidence:** `seo/data/serps/*.csv` — one file per target keyword, from Semrush
`phrase_organic`, 20 results each.

---

## 1. Semrush cannot name our competitors, so the SERPs were used instead

`domain_organic_organic` returns `ERROR 50 :: NOTHING FOUND`. Semrush computes
organic competitors from shared ranking surface, and with 30 keywords and nothing
above position 25 there is not enough overlap to measure. **Keyword Gap and
Backlink Gap are therefore unavailable from Semrush for this domain**, and no
amount of retrying changes that.

The competitor set below is derived directly from who actually occupies the SERPs
for the six keywords the keyword map identifies as the real opportunities. That is
a better basis anyway: it selects competitors by "who holds the result we want"
rather than "who also sells toys", which is what the brief asked for.

Keywords sampled:

| Keyword | Volume | KD | SafeNest |
| --- | --- | --- | --- |
| best toys for building independence | 4,400 | 12 | 98 |
| sensory toys for babies | 3,600 | 24 | 62 |
| best toys for 6 month old | 2,400 | 15 | not ranking |
| sensory toys for infants | 590 | 14 | 59 |
| best building toys for 3 year olds | 90 | 9 | 59 |
| non toxic wood toys | 50 | 15 | 78 |

---

## 2. The SERPs are fragmented, and that is the opportunity

Across those six SERPs: **22 retail/brand domains, 3 UGC/social, and 52 distinct
editorial domains.** The most frequently appearing editorial domain shows up in
only 3 of the 6.

No entrenched authority owns this space. Compare the alternative: if BabyCenter
held the top three across every term, the honest advice would be to go elsewhere.
Instead the number-one results are:

| Keyword | #1 result | What it is |
| --- | --- | --- |
| best toys for building independence | **wonderkidstoy.com** | a small Shopify store blog |
| non toxic wood toys | **coloredorganics.com** | an organic clothing brand's blog |
| best building toys for 3 year olds | mindware.orientaltrading.com | retailer category |
| sensory toys for babies | fatbrainbaby.com | retailer |
| best toys for 6 month old | fatbrainbaby.com | retailer |

An unknown Shopify blog holds position 1 for a 4,400/mo term at keyword
difficulty 12. That is the strongest single piece of evidence that this is
winnable on merit rather than on domain authority.

### The editorial competitors that matter

These are parenting and education publishers, not big media. They are the set
SafeNest can realistically displace:

| Domain | SERPs | Best position | Character |
| --- | --- | --- | --- |
| dayswithgrey.com | 2 | 6 | play-activity blog, heavy imagery |
| finnandemma.com | 2 | 6 | brand blog, non-toxic materials |
| amightygirl.com | 2 | 7 | huge curated gift-guide lists |
| funandfunction.com | 2 | 8 | sensory-specialist retailer blog |
| mamainstincts.com | 2 | 10 | parenting blog, non-toxic focus |
| babycenter.com | 2 | 10 | major parenting publisher |
| chalkacademy.com | 1 | 4 | bilingual learning-activity blog |
| gimmethegoodstuff.org | 1 | 5 | non-toxic product research |
| **unitypoint.org** | 1 | **4** | **a hospital's child-development article** |

`unitypoint.org` is worth singling out. A health system ranks 4th for "best toys
for 6 month old" with developmental content. That is the closest positional
analogue to SafeNest — authority framing built on safety and development rather
than on commerce — and it demonstrates the angle works.

---

## 3. The gap is depth, measured

This is the finding that matters most, and it is not a matter of opinion.

**"best toys for building independence"** — 4,400/mo, KD 12, SafeNest at 98:

| Rank | Domain | Words | h2 | h3 | Images |
| --- | --- | --- | --- | --- | --- |
| 1 | wonderkidstoy.com | 3,571 | 23 | 53 | 16 |
| 2 | nytimes.com (Wirecutter) | 4,811 | 24 | 15 | 64 |
| 4 | chalkacademy.com | 3,107 | 18 | 6 | 24 |
| 5 | melissaanddoug.com | 2,040 | 0 | 17 | 34 |
| 6 | dayswithgrey.com | 2,352 | 8 | 45 | 67 |
| 7 | amightygirl.com | 10,901 | 93 | 0 | 542 |
| 8 | lifehacker.com | 1,152 | 1 | 5 | 20 |
| **98** | **safenesttoys.com** | **471** | **4** | **9** | **12** |

**"sensory toys for babies"** — 3,600/mo, KD 24, SafeNest at 62:

| Domain | Words |
| --- | --- |
| itzyritzy.com | 5,115 |
| funandfunction.com | 3,770 |
| fatbrainbaby.com | 1,743 |
| lovevery.com | 734 |
| sassybaby.com | 300 |
| *median of ranking editorial pages* | **1,743** |
| **safenesttoys.com** | **495** |

**"non toxic wood toys"** — 50/mo, KD 15, SafeNest at 78:

| Domain | Words |
| --- | --- |
| gimmethegoodstuff.org | 5,931 |
| finnandemma.com | 4,412 |
| hazelandfawn.com | 2,725 |
| thenaturalbabyco.com | 1,887 |
| montessorigeneration.com | 1,801 |
| coloredorganics.com | 1,192 |
| *median* | **1,887** |
| **safenesttoys.com** | **688** |

The pattern is consistent across all three: **SafeNest's ranking pages are a
quarter to a sixth of the depth of the pages beating them.** Difficulty is 12–24.
An unknown store blog holds one of the number-one slots. The deficit is content
depth, not authority — although the zero legitimate backlinks (see
`seo/baseline.md` §3) will cap how far depth alone can carry these pages.

---

## 4. Where the competing content is weak, and what SafeNest can add

Reviewed against what the top results actually contain. These are the specific,
substantiable gaps — not "write more words".

**Retailer and brand pages (the majority of the field)** are product carousels
with a paragraph of copy. `sassybaby.com` ranks 2nd for a 3,600/mo term on 300
words because it is the brand being searched around. They cannot say anything
critical about the products they sell, and they never state what they did not
check.

**Blog competitors (`dayswithgrey.com`, `chalkacademy.com`, `mamainstincts.com`)**
write from genuine hands-on play experience, which SafeNest cannot and must not
claim. But they carry no consistent evaluation framework: each product gets a
personal impression, not a comparable assessment, and none of them record recall
status or the evidence behind a materials claim.

**What SafeNest can contribute that none of the ranking pages do:**

1. **Evidence-status labelling per claim** — documented vs manufacturer-reported
   vs retailer-reported vs not found vs unclear. No competitor distinguishes
   these. It is the site's genuine differentiator and it is already built.
2. **CPSC recall-check context with a date** — "checked against publicly
   available CPSC records on <date>, no unambiguous match located". None of the
   52 editorial domains does this.
3. **Choking-risk interpretation from published dimensions** — reasoning from
   manufacturer specs and small-parts warnings, stated as interpretation rather
   than measurement.
4. **Mixed-age household hazards** — the site already has real material here
   (`/blog/homeschool-manipulatives-safety-mixed-ages`) and it is absent from
   every competing page. A guide recommending small-parts building toys that
   never mentions a crawling sibling is incomplete, and parents of more than one
   child know it.
5. **Explicit limitations** — stating what could not be verified. Counter-intuitive
   as a ranking asset, but it is the thing no commercial competitor will copy, and
   it is what makes the rest credible.
6. **A consistent scoring framework across every product** — so a comparison is
   actually comparable, which a per-product personal impression is not.

**What SafeNest must not copy:** the hands-on play narratives, the "we tested
these with our kids" framing, and `amightygirl.com`'s 10,901-word / 542-image
approach. That last one ranks 7th, not 1st — the number-one result is 3,571 words.
Depth is the target, not bulk.

---

## 5. Backlink gap — not available, and not the first move

Semrush's Backlink Gap requires the competitor set its competitor report cannot
produce. Prospects would have to be assembled by hand from the domains above.

Deferred deliberately. With zero legitimate referring domains, link acquisition is
the binding long-term constraint (`seo/baseline.md` §3), but the assets worth
pitching do not exist yet in a linkable form. The order that makes sense is:
deepen the three pages that already rank, then use the strongest of them —
most plausibly the CPSC recall resource and the mixed-age safety checklist — as
the thing to pitch. Prospecting before there is an asset produces a list nobody
can act on.

---

## 6. Confidence and what would change this reading

**High confidence:** the SERP composition and the word-count comparison. Both are
directly measured and reproducible from `seo/data/serps/`.

**Medium confidence:** that depth is the primary lever. The correlation is strong
and difficulty is low, but the site also has zero legitimate backlinks, and those
two variables cannot be separated with the data available. Deepening the three
pages is a cheap test of it.

**Low confidence / untestable now:** anything about click-through. There is no
Search Console data, so no competitor comparison of titles or snippets can be
validated against actual behaviour.

**What would change the reading:** if the three pages are deepened to competitive
depth and positions do not move within 60–90 days, the constraint is authority
rather than content, and effort should shift entirely to earning links.
