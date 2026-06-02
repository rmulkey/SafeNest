# Data Integrity Rules (MANDATORY)

These rules are non-negotiable and apply to ALL data that enters this project —
product records, affiliate links, images, prices, ASINs, certifications, and any
external identifier.

## Core principle: No mock, fabricated, placeholder, or unverified data

NEVER invent, guess, or approximate real-world data and present it as real.
This specifically includes:

- **ASINs / product IDs** — Never fabricate an Amazon ASIN or any retailer SKU.
  Only use an ASIN that has been verified to resolve to a live product page.
- **Affiliate / product links** — Every link must resolve (no 404s). If a verified
  direct product URL cannot be obtained, use an Amazon **search URL**
  (`https://www.amazon.com/s?k={query}&tag={tag}`), which is always valid and
  preserves attribution. Do not invent `/dp/{ASIN}` links.
- **Images** — Only use real product images sourced from the manufacturer's site,
  an authorized retailer CDN (e.g. Target scene7), or an official press asset.
  Never substitute an unrelated stock photo and imply it is the product.
  Every image URL must be fetched and confirmed to return real image bytes
  (HTTP 200, `content-type: image/*`, non-trivial size) before it is stored.
- **Prices, ratings, certifications, recall data** — Only store values that come
  from a verifiable source. Do not estimate or invent them.

## When real data cannot be obtained

If verified data is genuinely unavailable, you MUST:
1. STOP and tell the user explicitly what could not be verified and why.
2. Offer the safe fallback (e.g. search URL instead of direct link) and label it
   clearly as a fallback.
3. NEVER silently fill the gap with invented values.

## Verification is part of "done"

A product, link, or image is not "done" until it has been verified:
- Links: confirmed to resolve (HTTP 200 to a real page, not a bot/404 page).
- Images: confirmed to return real image bytes from an approved source.
- Products: the product must be a real, currently-known product (verifiable via
  search or manufacturer listing).

Scores, pros/cons, and editorial copy MAY be authored editorially (this is a
review site), but they must be reasonable and clearly editorial — never presented
as sourced data they are not.
