# Implementation Plan

## Overview

Extract the SafeNest Toys codebase into a config-driven affiliate engine in a new
Turborepo monorepo, re-home SafeNest as the first app, and stand up LearningNest
as the validation niche. Tasks are ordered so the live SafeNest site is never at
risk: all work is additive until an explicit, verified domain cutover (Phase 4).

Conventions:
- Each task is a coding activity with a checkbox.
- `_Requirements: N.M_` ties a task to acceptance criteria in requirements.md.
- `_Properties: N_` ties a task to a Correctness Property in design.md (PBT).
- "No behavior change" tasks must keep ported tests green.

## Tasks

- [x] 1. Phase 0 — Scaffold the monorepo
  - [x] 1.1 Initialize the `affiliate-engine` repo with Turborepo + npm workspaces
    - Create new Git repo; add root `package.json` with workspaces `packages/*`, `apps/*`, `tooling/*`
    - Add `turbo.json` with `build`/`lint`/`test`/`type-check` pipelines
    - Add shared root `tsconfig.base.json`, ESLint flat config, Prettier, `.npmrc` (legacy-peer-deps as in current repo)
    - Add CI workflow (lint + type-check + test across workspaces)
    - _Requirements: 1.1, 1.5_
  - [x] 1.2 Create empty workspace package skeletons
    - Scaffold `packages/core`, `packages/ui`, `packages/sanity-schema` with package.json, tsconfig, and an index entry each
    - Wire path aliases `@core`, `@ui`, `@sanity-schema` and confirm a trivial cross-package import builds
    - _Requirements: 1.2, 1.3_

- [x] 2. Phase 1 — Define SiteConfig contract and validation (foundation)
  - [x] 2.1 Implement `SiteConfig` types in `packages/core/config`
    - Define `SiteConfig`, `ScoringAxis`, `SegmentationDimension`, `SiteCopy`, `GiftGuideConfig`, plus `siteId`
    - _Requirements: 2.1_
  - [x] 2.2 Implement config validation + loader
    - Validate required fields; reject weights not summing to 1.0, zero-sum weights, and invalid bucket definitions; produce descriptive build-time errors
    - _Requirements: 2.3, 3.3, 3.4_
  - [x] 2.3 Write config-validation tests
    - Property test: valid configs accepted, invalid (bad weight sum incl. zero-sum) rejected
    - _Requirements: 2.3, 3.3, 3.4_
    - _Properties: 2_

- [x] 3. Phase 1 — Generalize the scoring engine
  - [x] 3.1 Implement generic `computeAxis(axis, factorValues)` in `packages/core/scoring`
    - Bounded weighted sum returning integer [0,100]; reject out-of-range/non-finite factor values
    - Provide `computeAllAxes(config, values)` returning a score per configured axis
    - _Requirements: 3.1, 3.2, 3.6_
  - [x] 3.2 Port + adapt scoring tests; add generalized property tests
    - Confirm SafeNest's Safety/Development values reproduce under a two-axis config
    - Property: bounded axis score; property: factor-range rejection
    - _Requirements: 3.1, 3.2, 3.5, 3.6_
    - _Properties: 1, 3_

- [x] 4. Phase 1 — Generalize segmentation
  - [x] 4.1 Implement segmentation resolver in `packages/core/config`
    - Support `numericRange` and `enum`; `resolveSegment(slug)` → bucket or null; generate route params + labels from buckets
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 4.2 Write segmentation tests
    - Property: known slug resolves to exactly one bucket; unknown slug never resolves
    - _Requirements: 4.2, 4.3_
    - _Properties: 4_

- [x] 5. Phase 1 — Port the niche-agnostic engine (no behavior change)
  - [x] 5.1 Port affiliate module into `packages/core/affiliate`
    - link-builder, `isValidAffiliateUrl`, click recording, redirect, link-health checker; carry tests
    - _Requirements: 8.1, 9.1_
    - _Properties: 7_
  - [x] 5.2 Port SEO module into `packages/core/seo`
    - sitemap helpers, dynamic OG image factory, JSON-LD generators, metadata/canonical, robots; carry tests
    - _Requirements: 8.2_
  - [x] 5.3 Port analytics + cookie-consent into `packages/core/analytics`
    - GA4/PostHog/Meta/Vercel event helpers and consent gating; carry tests
    - _Requirements: 8.2_
  - [x] 5.4 Port content-integrity validation into `packages/core/content`
    - disclosure proximity, no-pressure language, alternative-brand diversity, mandatory-field checks; carry tests
    - _Requirements: 8.2, 9.1_
  - [x] 5.5 Port search into `packages/core` (+ `@ui` for the dialog)
    - filter logic with tests; keep results client-side
    - _Requirements: 8.2_

- [x] 6. Phase 1 — Shared DB schema with siteId scoping
  - [x] 6.1 Define shared Prisma schema with `siteId` on transactional tables
    - Add `siteId` (non-null) to AffiliateClick, AffiliateLinkStatus, NewsletterSubscription; change newsletter unique key to `(siteId, email)`; add a queued-product mirror if needed
    - _Requirements: 6.1, 6.3_
  - [x] 6.2 Implement `withSite(siteId)` Prisma wrapper
    - All transactional reads/writes flow through it; scope cannot be omitted
    - _Requirements: 6.2_
  - [x] 6.3 Write a non-destructive migration that backfills `siteId = "safenest-toys"`
    - Migration script + dry-run verification; do NOT run against production DB in this task
    - _Requirements: 6.4_
  - [x] 6.4 Write siteId + newsletter scoping tests
    - Property: `withSite(s)` never returns another site's rows; per-site email uniqueness
    - _Requirements: 6.2, 6.3, 6.5_
    - _Properties: 5, 6_

- [x] 7. Phase 2 — Config-driven catalog automation
  - [x] 7.1 Port + generalize the queue publisher into `packages/core/catalog`
    - Re-verify affiliate URL + image bytes + all-required-fields-complete before publish; flag+skip on failure; reads scoring/segmentation from config
    - _Requirements: 8.3, 9.2, 9.3, 9.4_
    - _Properties: 8_
  - [x] 7.2 Port + generalize the bi-weekly blog generator
    - Hooked "Top N child-safe/<noun>" posts with real product images + review links; topics from config taxonomy; idempotent week-stamped slug
    - _Requirements: 8.3_
  - [x] 7.3 Port first-party newsletter subscribe handler (site-scoped)
    - Stores to shared DB scoped by `siteId`; per-site dedupe
    - _Requirements: 6.3, 8.2_
  - [x] 7.4 Carry/adapt catalog + newsletter tests
    - Publish-gate property; newsletter per-site uniqueness property
    - _Requirements: 8.3, 9.2, 9.3, 9.4, 6.3_
    - _Properties: 6, 8_

- [x] 8. Phase 2 — Sanity schema factory
  - [x] 8.1 Implement `buildSchema(config)` in `packages/sanity-schema`
    - Generate productReview (fields from scoring factors + segmentation), category, blogPost, queuedProduct from a SiteConfig
    - _Requirements: 5.1, 5.2_
  - [x] 8.2 Write schema-factory tests
    - A config's product-review fields match its scoring factors + segmentation
    - _Requirements: 5.1, 5.2_

- [x] 9. Phase 3 — Extract themeable UI package
  - [x] 9.1 Port shared components into `packages/ui`
    - Header, Footer, BuyButton, ScoreBadge, ComparisonTable, NewsletterForm, Finder, product cards
    - _Requirements: 7.1_
  - [x] 9.2 Make components theme/config-driven
    - Brand + palette from theme tokens / SiteConfig; no hardcoded brand literals
    - _Requirements: 2.2, 7.2_
  - [x] 9.3 Render scoring axes generically (themeable, with safe fallback)
    - Components read configured axes (not "Safety"/"Development"); axis labels/styling themeable; fall back to default names if generic render fails
    - _Requirements: 7.3, 7.4_
  - [x] 9.4 Carry/adapt component tests
    - _Requirements: 7.1, 7.3_

- [ ] 10. Phase 4 — Re-home SafeNest as `apps/safenest-toys`
  - [x] 10.1 Create the app shell consuming engine + ui
    - Next.js app importing `@core`/`@ui`/`@sanity-schema`; thin route shells for all current pages (reviews, best-by-segment, gift-guides, blog, recalls, transparency, about, contact, dashboards, sitemap/robots/OG, crons)
    - _Requirements: 1.3, 1.4_
  - [x] 10.2 Author `safenest-toys` `site.config.ts` + theme + assets
    - Two-axis scoring (Safety/Development), age buckets, taxonomy, brand, copy, gift guides; carry logo/founders assets
    - _Requirements: 2.1, 2.2, 2.4, 3.5, 4.4_
  - [x] 10.3 Migrate SafeNest content to the standard factory schema
    - Transform existing Sanity docs to the standard schema; verify no data loss
    - _Requirements: 5.4_
  - [x] 10.4 Run full ported test suite; achieve green
    - Equivalent coverage to current suite + new generalized/scoping tests
    - _Requirements: 8.4_
  - [x] 10.5 Deploy SafeNest app to a PREVIEW and verify parity vs production
    - Route/visual diff; SEO output (sitemap, OG, JSON-LD) matches; affiliate + newsletter + crons work
    - _Requirements: 8.5_
  - [ ] 10.6 Cut over the domain after parity is confirmed; archive old repo
    - Apply the `siteId` backfill migration to production DB at cutover; switch domain; keep old repo archived (not deleted)
    - _Requirements: 6.4, 8.5_

- [x] 11. Phase 5 — `create-site` scaffolder
  - [x] 11.1 Implement `tooling/create-site`
    - Scaffolds `apps/<name>` with SiteConfig stub, theme tokens, app shell; builds against the engine with no engine edits
    - _Requirements: 10.1, 10.2_
  - [x] 11.2 Document new-site provisioning
    - Steps for Sanity dataset, `siteId`, Vercel project, domain, env vars
    - _Requirements: 10.3_

- [x] 12. Phase 5 — Stand up LearningNest (validation niche)
  - [x] 12.1 Generate `apps/learningnest` via `create-site`
    - _Requirements: 11.2_
  - [x] 12.2 Author LearningNest `site.config.ts`
    - Brand; two axes (Educational Value; Quality & Safety); age buckets (2–4, 5–7, 8–10, 11+); taxonomy (stem-kits, puzzles, books, coding-toys, science-tools); copy; gift guides
    - _Requirements: 11.1_
  - [x] 12.3 Provision LearningNest Sanity dataset + `siteId` + Vercel project + domain
    - _Requirements: 11.1, 11.4_
  - [x] 12.4 Seed LearningNest's verified-product queue (data-integrity gated)
    - Real products; verify product + affiliate link + image before content creation; block if any fails
    - _Requirements: 11.3, 9.1, 9.2, 9.3_
    - _Properties: 7, 8_
  - [x] 12.5 Build + deploy LearningNest standalone; confirm no engine edits were required
    - _Requirements: 11.2, 11.4_

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1.1"], "description": "Repo + Turborepo scaffold" },
    { "wave": 2, "tasks": ["1.2"], "description": "Workspace package skeletons + aliases" },
    { "wave": 3, "tasks": ["2.1", "5.1", "5.2", "5.3", "5.4", "5.5"], "description": "SiteConfig types + engine port (parallel)" },
    { "wave": 4, "tasks": ["2.2", "2.3", "3.1", "4.1", "6.1"], "description": "Config validation, scoring, segmentation, shared schema" },
    { "wave": 5, "tasks": ["3.2", "4.2", "6.2"], "description": "Scoring/segmentation tests + withSite wrapper" },
    { "wave": 6, "tasks": ["6.3", "6.4"], "description": "Backfill migration (dry-run) + scoping tests" },
    { "wave": 7, "tasks": ["7.1", "7.3", "8.1", "9.1"], "description": "Catalog publisher, newsletter, schema factory, UI port" },
    { "wave": 8, "tasks": ["7.2", "7.4", "8.2", "9.2", "9.3"], "description": "Blog generator, factory tests, themeable UI" },
    { "wave": 9, "tasks": ["9.4"], "description": "UI component tests" },
    { "wave": 10, "tasks": ["10.1", "10.2"], "description": "SafeNest app shell + site.config" },
    { "wave": 11, "tasks": ["10.3", "10.4"], "description": "Content migration + full test suite green" },
    { "wave": 12, "tasks": ["10.5"], "description": "Preview deploy + parity verification" },
    { "wave": 13, "tasks": ["10.6"], "description": "Cutover gate: backfill prod DB + switch domain" },
    { "wave": 14, "tasks": ["11.1", "11.2"], "description": "create-site scaffolder + docs" },
    { "wave": 15, "tasks": ["12.1", "12.2"], "description": "Generate LearningNest app + config" },
    { "wave": 16, "tasks": ["12.3", "12.4"], "description": "Provision LearningNest + seed verified queue" },
    { "wave": 17, "tasks": ["12.5"], "description": "Build + deploy LearningNest standalone" }
  ]
}
```

Critical path: `1.1 → 1.2 → 2.x → (3.x/4.x/6.x) → 7.x/8.x → 9.x → 10.x → 11.x → 12.x`.
The engine port (task 5) runs in parallel with the config work (tasks 2–4) after
1.2. Nothing touches the live SafeNest site until the cutover gate in wave 13
(task 10.6).

## Notes

- **Live site safety**: every task through wave 12 is additive in the new repo;
  the production SafeNest deploy is untouched until the wave-13 cutover, which is
  gated on verified preview parity (task 10.5).
- **Destructive step**: the only production-affecting actions are in task 10.6 —
  the `siteId` backfill migration and the domain switch. The backfill is
  non-destructive (adds a column with a default), and the old repo is archived,
  not deleted.
- **Data integrity**: the publish-time verification gate lives in `@core`
  (task 7.1), so every app inherits it; LearningNest content (task 12.4) must
  pass product + link + image verification or be blocked.
- **No fabrication**: LearningNest seeding follows the same process used for
  SafeNest — real products, verified images, Amazon search-URL links.
- **Parallelism**: waves group tasks with no inter-dependencies so they can be
  executed together; respect the wave order for correctness.

