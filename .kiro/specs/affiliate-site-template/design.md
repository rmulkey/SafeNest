# Design Document

## Overview

This document locks the **config schema** and the **scoring/segmentation model**
for turning the proven SafeNest Toys codebase into a **config-driven affiliate
engine** in a Turborepo monorepo. From the engine, new niche review sites
(starting with **LearningNest** — educational / STEM) can be created with
minimal per-site effort: a brand, a theme, a product vertical, and verified
content — no engine code changes. It is a paper artifact; no code is changed by
this document.

Non-goals: rewriting working features; changing the data-integrity rules (real
products/links/images only — they apply to every site); fabricating content.

**Guiding principle.** The current code already separates into three layers. The
template formalizes that split:

| Layer | Varies per site? | Examples |
|-------|------------------|----------|
| **Engine** | No | affiliate links + click tracking + redirect + health checks, first-party newsletter, SEO (sitemap, OG images, JSON-LD, robots), analytics, queue auto-publisher, bi-weekly blog generator, content-integrity validation, cookie consent, search |
| **Vertical model** | Yes (config) | scoring axes, segmentation dimension, product attributes, taxonomy |
| **Brand** | Yes (config + assets) | name, domain, logo, palette, affiliate tag, founders, copy |

~70% of the codebase is engine and ports nearly unchanged. The work is
extracting it cleanly and pushing the other 30% into typed config.

## Architecture

### Monorepo structure (Turborepo + npm workspaces)

```
affiliate-engine/                  (new repo)
├── package.json                   workspaces: packages/*, apps/*
├── turbo.json
├── packages/
│   ├── core/                      the engine (framework-agnostic TS)
│   │   ├── affiliate/             link-builder, click recording, health checker
│   │   ├── newsletter/            first-party subscribe handler
│   │   ├── seo/                   sitemap, OG image factory, JSON-LD, metadata
│   │   ├── analytics/             GA4/PostHog/Meta/Vercel event helpers
│   │   ├── scoring/               GENERIC weighted-score engine (see below)
│   │   ├── catalog/               queue publisher + blog generator (config-driven)
│   │   ├── content/               integrity validation rules
│   │   └── config/                SiteConfig types + loader + validation
│   ├── ui/                        shared React components (Header, Footer,
│   │                              BuyButton, ScoreBadge, ComparisonTable,
│   │                              NewsletterForm, ToyFinder→"Finder", cards)
│   └── sanity-schema/             schema FACTORY (builds review/category/etc.
│                                  schemas from a SiteConfig)
├── apps/
│   ├── safenest-toys/             app #1 (re-homed from current repo)
│   │   ├── site.config.ts
│   │   ├── theme.css              Tailwind tokens
│   │   ├── public/                logo, founders photo, etc.
│   │   └── src/app/               thin route shells that call engine + ui
│   └── <next-niche>/              app #2 …
└── tooling/
    └── create-site/               scaffolder: `npm run create-site`
```

Each app is its **own Vercel project + domain + env**. They import `@core`,
`@ui`, `@sanity-schema`. Fix a bug in `core` once → every site benefits.

## Components and Interfaces

### The heart: `SiteConfig`

Everything niche-specific lives in one typed object per app. Draft schema:

```ts
export interface SiteConfig {
  brand: {
    name: string;            // "SafeNest Toys"
    shortName: string;       // "SafeNest"
    domain: string;          // "safenesttoys.com"
    affiliateTag: string;    // "safeneststore-20"
    founders?: string;       // "Rodrigo & Vanessa Mulkey"
    location?: string;       // "Kennesaw, Georgia"
    tagline: string;
  };

  theme: {
    // Maps to CSS variables consumed by Tailwind. Logo/icon are asset paths.
    palette: { primary: string; secondary: string; accent: string; /*…*/ };
    logo: string;            // /logo.svg
    ogEmoji?: string;        // fallback mark for OG images
  };

  // The product noun and how items are described.
  product: {
    nounSingular: string;    // "toy"  | "vitamin"   | "machine"
    nounPlural: string;      // "toys" | "vitamins"  | "machines"
    reviewTypeName: string;  // Sanity type, e.g. "toyReview" | "productReview"
  };

  // GENERALIZED scoring — replaces hardcoded Safety/Development.
  scoring: ScoringAxis[];    // 1..n axes, each a named weighted sum

  // GENERALIZED segmentation — replaces hardcoded age-in-months.
  segmentation: SegmentationDimension;

  taxonomy: { id: string; label: string; slug: string }[];  // categories

  // Editorial copy slots used across the engine (hero, disclosure, gift-guide
  // intros, blog hook templates). Keeps prose out of the engine.
  copy: SiteCopy;

  // Which gift-guide occasions exist for this niche.
  giftGuides: GiftGuideConfig[];
}

export interface ScoringAxis {
  key: string;               // "safety"
  label: string;             // "Safety Score"
  factors: { key: string; label: string; weight: number }[]; // weights sum→1
}

export interface SegmentationDimension {
  key: string;               // "ageMonths" | "goal" | "skillLevel"
  label: string;             // "Age" | "Health Goal" | "Skill Level"
  // Either a numeric range model (age) or a discrete enum (goals).
  kind: "numericRange" | "enum";
  buckets: { slug: string; label: string; min?: number; max?: number; value?: string }[];
}
```

### How the toy site maps onto this (proof it generalizes)

```
scoring: [
  { key:"safety", label:"Safety Score", factors:[
     {key:"materialSafety",weight:.3},{key:"chokingRisk",weight:.3},
     {key:"recallHistory",weight:.2},{key:"certificationPresence",weight:.2}]},
  { key:"development", label:"Development Score", factors:[
     {key:"motorSkills",weight:.4},{key:"cognitiveSkills",weight:.35},
     {key:"sensoryEngagement",weight:.25}]},
]
segmentation: { key:"ageMonths", kind:"numericRange",
  buckets:[{slug:"0-6-months",min:0,max:6}, …] }
```

### How a **vitamins** site would map (the validation target)

```
product: { nounSingular:"supplement", nounPlural:"supplements", reviewTypeName:"productReview" }
scoring: [
  { key:"purity", label:"Purity Score", factors:[
     {key:"thirdPartyTested",weight:.4},{key:"ingredientTransparency",weight:.3},
     {key:"fillersAdditives",weight:.3}]},
  { key:"value", label:"Value Score", factors:[
     {key:"costPerServing",weight:.5},{key:"potency",weight:.5}]},
]
segmentation: { key:"goal", kind:"enum",
  buckets:[{slug:"immunity",value:"immunity",label:"Immunity"},
           {slug:"energy",value:"energy",label:"Energy"}, …] }
```

The engine's existing `computeSafetyScore` (a bounded weighted sum) becomes a
generic `computeAxis(axis, factorValues)` — same math, config-driven field
names. Programmatic pages (`/best-[noun]/[segment]`), gift guides, and the blog
generator all read `scoring`/`segmentation` instead of hardcoded
`safetyScore`/`ageMonths`.

### Validation niche: **LearningNest** (educational / STEM)

The first site built from the template. Deliberately the closest cousin to
SafeNest — same audience (parents), same age-based segmentation — so the
extraction is validated without also stress-testing a wildly different vertical.
It still exercises every config knob: a new brand, a new scoring model, a new
taxonomy, and its own dataset + `siteId`.

```
brand: { name:"LearningNest", domain:"learningnest…", affiliateTag:"<assoc-tag>",
         founders:"Rodrigo & Vanessa Mulkey", location:"Kennesaw, Georgia" }
product: { nounSingular:"learning tool", nounPlural:"learning tools",
           reviewTypeName:"productReview" }
scoring: [
  { key:"educational", label:"Educational Value", factors:[
     {key:"skillDevelopment",weight:.4},{key:"engagement",weight:.3},
     {key:"ageAppropriateness",weight:.3}]},
  { key:"quality", label:"Quality & Safety", factors:[
     {key:"materialSafety",weight:.4},{key:"durability",weight:.3},
     {key:"certificationPresence",weight:.3}]},
]
segmentation: { key:"ageYears", kind:"numericRange", buckets:[
     {slug:"2-4-years",min:24,max:48}, {slug:"5-7-years",min:60,max:84},
     {slug:"8-10-years",min:96,max:120}, {slug:"11-plus-years",min:132,max:168}]}
taxonomy: ["stem-kits","puzzles","books","coding-toys","science-tools"]
```

Why this niche is a strong fit: huge evergreen Amazon catalog with constant
refreshes, abundant high-intent content angles (e.g. "best STEM toys for
7-year-olds", "best microscopes for kids", "best beginner coding toys", "best
educational gifts for homeschoolers"), and the founders can authentically
reference how their three kids engage with different learning tools — the same
E-E-A-T advantage SafeNest has.

Note both axes intentionally reuse some SafeNest factor names (`materialSafety`,
`certificationPresence`): proof the factor catalog is shared vocabulary, not
per-niche reinvention, while the axes themselves differ.

### Sanity schema factory

`packages/sanity-schema` exports `buildSchema(config)` that generates the
`productReview` document (fields derived from `config.scoring` factors +
`config.segmentation`), `category`, `blogPost`, `queuedProduct`, etc. Each app
gets a correct, niche-specific schema with no hand-editing. Each site = its own
**Sanity dataset** (free, isolated).

## Data Models

### Data tenancy (DECIDED)

- **Sanity**: one **dataset per site** (free, fully isolated content).
- **Postgres/Neon**: **one shared database**, with a `siteId` column on every
  row of the transactional tables (`AffiliateClick`, `AffiliateLinkStatus`,
  `NewsletterSubscription`, `QueuedProduct` if mirrored). Every query is scoped
  by `siteId`, sourced from `SiteConfig.siteId`.

Implications the engine must enforce:
- A composite uniqueness change: `NewsletterSubscription` unique key becomes
  `(siteId, email)` — the same parent can subscribe to two sibling sites.
- All reads/writes pass `siteId`; a `withSite(siteId)` helper wraps Prisma calls
  so no query can forget the scope.
- Dashboards (`/dashboard/clicks`, `/dashboard/links`) filter by `siteId`.
- Migration adds `siteId` (non-null, default `"safenest-toys"` for existing
  rows) — backfills cleanly, non-destructive.

## Migration plan (non-destructive; SafeNest stays live throughout)

1. **Scaffold the monorepo** in a new repo. SafeNest's current repo/deploy is
   untouched and keeps serving traffic.
2. **Port engine → `packages/core` + `packages/ui`**, carrying tests with it.
   Generalize scoring/segmentation to config-driven as the only behavioral change.
3. **Re-home SafeNest as `apps/safenest-toys`** with its `site.config.ts`. Stand
   it up on a **preview deployment**, diff against production, run the full test
   suite (current: 298 tests) plus a visual check.
4. **Cut over** SafeNest's domain to the monorepo app only after the preview is
   verified identical. Old repo is archived, not deleted.
5. **Stand up LearningNest** from the template to validate the abstraction
   end-to-end (own dataset, own `siteId`, own Vercel project + domain).

## New-niche workflow (the payoff)

1. You give a brief: niche, brand name, scoring axes, segmentation, palette.
2. `npm run create-site` scaffolds `apps/<niche>/` with `site.config.ts` +
   theme + a Sanity dataset provisioned from the schema factory.
3. Seed the verified-product queue for the niche (same data-integrity process —
   real products, verified images, Amazon search-URL links).
4. New Vercel project + domain + env; deploy.

## Risks & mitigations

- **Engine extraction regressions** → port tests alongside code; SafeNest preview
  must match production before cutover.
- **Over-abstraction** → validate against ONE real second niche immediately;
  don't add config knobs no site uses.
- **Data integrity per site** → the steering rule applies to every app; the
  queue publisher's verification gate is part of `core`, so it's enforced everywhere.
- **Cost creep (N Vercel projects, N DBs)** → Vercel projects are free on Hobby
  within limits; consider shared Neon DB w/ `siteId` if DB cost matters.

## Correctness Properties

These invariants are encoded as property-based tests (the project's PBT
convention), carried over and extended from the current suite.

### Property 1: Bounded axis score

For any scoring axis whose weights sum to 1.0 and whose factor values are in
[0, 100], `computeAxis` returns an integer in [0, 100].

**Validates: Requirements 3.1, 3.2**

### Property 2: Weight-sum validation

A config whose axis factor weights do not sum to 1.0 (including the all-zero
case) is always rejected; a config whose weights sum to 1.0 is always accepted.

**Validates: Requirements 3.3, 3.4, 2.3**

### Property 3: Factor-range rejection

Any factor value supplied for scoring that is outside [0, 100] or non-finite is
always rejected with an error.

**Validates: Requirements 3.6**

### Property 4: Segment resolution totality

For any configured segmentation, a known bucket slug resolves to exactly one
bucket, and an unknown slug never resolves (yields a not-found result).

**Validates: Requirements 4.2, 4.3**

### Property 5: siteId isolation

For any set of transactional records spread across two or more site ids, a
`withSite(s)` query returns only rows whose `siteId == s` and never returns a row
belonging to another site.

**Validates: Requirements 6.1, 6.2, 6.5**

### Property 6: Newsletter per-site uniqueness

The same email may exist at most once per site and is deduplicated within a site;
subscribing twice to one site with the same email never creates two rows, while
the same email may subscribe to two different sites.

**Validates: Requirements 6.3**

### Property 7: Affiliate link validity

The affiliate-link guard accepts only Amazon product or search URLs and rejects
empty, relative, or fabricated links.

**Validates: Requirements 8.1, 9.1**

### Property 8: Publish-time verification gate

The publisher never produces a live review unless the affiliate URL validates,
the image returns real bytes, and all required fields are complete; otherwise the
queued item is flagged and skipped (never published).

**Validates: Requirements 8.3, 9.2, 9.3, 9.4**

## Error Handling

- **Invalid `SiteConfig`** → fail fast at build time with a descriptive error
  (missing required field; scoring weights not summing to 1.0; zero-sum weights;
  factor value outside [0,100]). A bad config must never reach runtime.
- **Unknown segment slug** → the programmatic page returns a not-found response
  rather than rendering an empty or fabricated page.
- **Publish-time verification failure** (bad affiliate URL, image returns no real
  bytes, or any required field incomplete) → the queued product is skipped and
  flagged `failed` with a reason; nothing fabricated is ever published. Transient
  infrastructure failures are retryable (item returns to `queued`).
- **`siteId` scope safety** → all transactional reads/writes flow through a
  `withSite(siteId)` Prisma wrapper so a query cannot silently omit the scope; a
  missing `siteId` is a programming error surfaced in tests.
- **External service degradation** (Sanity, analytics, recall sources) → the
  public site continues serving content; affiliate redirects never block on
  tracking, consistent with current behavior.

## Testing Strategy

- **Port existing tests with the code.** The current suite (≈298 tests) moves
  into `packages/core`/`packages/ui`; the ported set may be fewer tests provided
  it gives equivalent coverage of ported behavior.
- **New unit/property tests** for the generalized pieces: `computeAxis` bounded
  weighted sum across arbitrary axes; config validation (weight sums, zero-sum,
  out-of-range factor values); segmentation slug resolution for both
  `numericRange` and `enum`; `siteId` scoping (no cross-site leakage).
- **Schema-factory tests**: a `SiteConfig` produces a schema whose product-review
  fields match its scoring factors + segmentation.
- **Parity gate for cutover**: the re-homed SafeNest app is deployed to a
  **preview** and verified to match production (full suite green + visual/route
  diff) before the domain is switched. The old repo is archived, not deleted.
- **Data-integrity tests** (link validity, publish-time verification gate) run as
  part of `core`, so every app inherits them.

## Decisions (locked)

1. **Data tenancy**: one shared Neon DB with a `siteId` column on transactional
   tables; one Sanity dataset per site. (See "Data tenancy" section.)
2. **First validation niche**: **LearningNest** — educational / STEM toys, kits,
   books, puzzles, learning tools. (See "Validation niche" section.)
3. **Repo location**: a **new GitHub repo** (`affiliate-engine`); the current
   SafeNest repo is left running until cutover.

## Phased task outline (high level — detailed tasks after this is approved)

- **Phase 0**: scaffold monorepo (Turborepo, workspaces, shared tsconfig/eslint).
- **Phase 1**: extract `core` (affiliate, newsletter, seo, analytics, content)
  with tests; no behavior change.
- **Phase 2**: generalize scoring + segmentation to config; build `SiteConfig`
  types + loader + the schema factory.
- **Phase 3**: extract `ui` package (themeable components).
- **Phase 4**: re-home SafeNest as `apps/safenest-toys`; preview; verify parity;
  cut over.
- **Phase 5**: `create-site` scaffolder; stand up **LearningNest** as `apps/learningnest`.
```
