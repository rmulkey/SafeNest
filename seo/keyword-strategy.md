
# Keyword strategy, grounded in first-party data

Written 2026-08-26. Supersedes the keyword ordering in `content-roadmap.md`.

## The Semrush keyword pull was largely unusable, and that matters

`scripts/keyword-research.mjs` expanded 12 safety-shaped seeds into 224
keywords. Two problems make the output unfit to plan from:

1. **API units ran out mid-run.** `phrase_kdi` returned
   `ERROR 132 :: API UNITS BALANCE IS ZERO` on the second batch, so **47 of 136
   rows were never scored** and default to difficulty 100, which the scorer reads
   as unreachable. The ordering is therefore incomplete, not wrong-but-complete.
2. **Much of what did return is off-topic or junk.** The highest-scoring rows
   included `check your recall unit 9` (volume 8,100), `cpsc recall ml837-15`,
   `evermore surprise eggs recall lead`, and `crib recall` (14,800). Cribs are not
   toys. Specific recall numbers are one-off events, not evergreen targets.

Nine of twelve seeds returned `ERROR 50 :: NOTHING FOUND` for `phrase_related`,
because the seeds are longer-tail than Semrush's related-keyword index covers.

Genuinely useful rows, kept for reference: `baby toys 0-6 months` (1,600, KD 19),
`newborn toys 0-3 months` (1,000, KD 7), `wooden toys` (4,400, KD 20),
`stuffed toys for infants` (3,600, KD 27), `infant toys` (3,600, KD 30).
Volumes and difficulties are Semrush model estimates, not measurements.

## What Search Console actually says

First-party, 83 days, and it points somewhere the keyword tool did not.

**Sensory toys are 274 of 405 query-page impressions — 68% of everything this
site is shown for.** One page takes 271 of the 274.

```
newborn sensory toys        51 impressions   position 41.1
sensory toys for babies     38               position 51.1
sensory toys for infants    25               position 54.4
baby sensory toys           24               position 49.7
infant sensory toys         21               position 48.2
sensory toys for newborns   21               position 45.4
```

Never better than position 41. Google considers the site relevant to the query
and not competitive for it.

Second cluster, much smaller: `best educational toys for 2 to 3 year olds`,
12 impressions at position 59.5.

The `{product} + safety concern` shape still holds as the only thing ranking
well — `manhattan toy skwish choking hazard` at 12.8, `melissa and doug stacking
train recall` at 14.0 — but it is 25 impressions, not a cluster to build on yet.

## The finding that changed the plan

The brief was to add products for strong keywords. The right move was the
opposite of sourcing new ones.

`/guides/best-sensory-toys-babies` owns 68% of site demand. It was **495 words,
4 `<h2>`s, and 6 linked products. There are 35 reviews in the sensory
category.** It used 6 of 35.

The same pattern held across every guide that carries a category reference —
all four were linking exactly 6:

| Guide | Linked before | Available | After |
|---|---|---|---|
| `best-sensory-toys-babies` | 6 | 33 | 33 |
| `best-educational-toys-2-3-years` | 6 | 47 | 47 |
| `best-building-toys-preschoolers` | 6 | 28 | 28 |
| `best-outdoor-water-toys-toddlers` | 6 | 24 | 24 |

Fixed by `scripts/expand-guide-product-links.mjs`, which reads each guide's own
category and `targetAgeRange` and selects in-category reviews whose age range
overlaps, excluding active recalls. Nothing invented — these are references to
already-published, already-verified documents. Live:

```
GUIDE                                  LINKS   WORDS   HTML
best-sensory-toys-babies                  34     912   308 KB
best-educational-toys-2-3-years           50   1,143   407 KB
best-building-toys-preschoolers           31     847   275 KB
best-outdoor-water-toys-toddlers          28     776   247 KB
```

Page weight stays well inside the sane band; the pages flagged by Semrush issue
112 are 1,080-1,260 KB.

### One claim I made and then disproved

I expected this to help crawl discovery, since 80 of the 143 uncrawled URLs are
now linked from these guides. Re-running `rank-indexing-requests.mjs` shows the
Request Indexing order **unchanged**: `/reviews` already links every review, so
the guides contribute nothing in set-cover terms. The benefit is topical depth
and relevance for the queries these guides target, not discovery.

### And a finding worth acting on separately

Three of the four guides are themselves **uncrawled on apex**. The sensory
guide's 271 impressions are attributed to
`https://www.safenesttoys.com/guides/best-sensory-toys-babies` — the **www**
host, which now 308s to apex. Google indexed www; the apex URL has never been
fetched. The page earning most of the site's visibility is ranking on a URL that
redirects. This resolves itself when Google recrawls, but it is a reason to
expect the apex numbers to look worse than reality for a while.

## What to do next, in order

1. **Deepen the prose on the four category guides.** All four have exactly 5 body
   blocks. Product cards now carry the word count; the written guidance does not.
   For "sensory toys for babies" at position 41, thin prose is the remaining
   constraint. This is editorial work — it should be written in the site's voice,
   not generated.
2. **Resolve sensory cannibalisation.** `/categories/sensory-toys` ranks for 38
   query-page rows against the same queries as the guide, positions 48-84. Two
   pages splitting one cluster. Decide which is the target and have the other
   support it.
3. **Do not add new sensory products.** 33 are in use and 2 more exist but are
   age-inappropriate for the guide. Sourcing more adds data-integrity risk for no
   keyword gain.
4. **If products are added, do it for a gap, not for sensory.** The reachable
   Semrush clusters not already covered were plush/stuffed infant toys and wooden
   toys. Use `scripts/build-verified-queue.mjs`, which requires a real Target
   product URL, reads Target's own `primary_image`, verifies the bytes, and emits
   Amazon **search** URLs so no ASIN is ever invented.
5. **Re-run the keyword pull when API units reset**, and treat the 47 unscored
   rows as unknown rather than unreachable.
