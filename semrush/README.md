# Semrush exports

Drop CSV exports here. This directory is gitignored — exports carry account
and traffic data that shouldn't be committed.

## What's most useful, in priority order

**1. Site Audit → Issues → Export (all issues)**
The one with `Issue`, `URL`, and severity columns. This is the crawl. Before
exporting, check the crawl settings and tell me:
- how many pages it crawled (should be ~221 to match the sitemap)
- whether JavaScript rendering was enabled — this matters a lot here, because
  the site uses Partial Prerendering and some content arrives in a streamed
  chunk. A non-JS crawl will report content as missing that a browser sees.

**2. Organic Research → Positions → Export**
Keyword, position, volume, URL, traffic. This is the data I have never had:
what actually ranks, and for what. It's the difference between advising by
inference and advising by evidence.

**3. Organic Research → Pages → Export**
Traffic by page. Needed to prioritise anything — right now I can't tell a page
with 400 monthly sessions from one with 4.

**4. Backlinks → Backlink Analytics → Referring Domains**
Small sites usually have almost none. Worth confirming rather than assuming.

**5. Keyword Gap** (only if you have competitors configured)
Suggested competitors, based on this session's research into who actually
occupies this niche: babygearlab.com, babygearwise.com, and for the
development-framed angle, whatever ranks for "best toys for 6 month old".

## Also useful, and not from Semrush

Google Search Console → Performance → Export, 12 months, with the
**Queries** and **Pages** tabs. Search Console is ground truth for impressions
and CTR where Semrush is modelled. If you can only send one thing, send this.

## Filenames

Anything is fine, but a hint of what it is helps:
`site-audit-issues.csv`, `organic-positions.csv`, `gsc-queries.csv`.
