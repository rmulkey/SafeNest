# Requirements Document

## Introduction

This feature extracts the proven SafeNest Toys codebase into a **config-driven
affiliate-site engine** housed in a Turborepo monorepo, so new niche review
sites can be created with minimal effort (brand, theme, vertical config, and
verified content — no engine code changes). The first site built from the
template is **LearningNest** (educational / STEM toys, kits, books, puzzles,
learning tools), and SafeNest Toys is re-homed as the first app on the engine.

The work is an extraction and generalization, not a rewrite: existing,
working behavior must be preserved and verified before any production cutover.
The project's data-integrity rules (real products, links, and images only) apply
unchanged to every site built from the template.

## Glossary

- **Engine**: Niche-agnostic shared code (`packages/core`, `packages/ui`,
  `packages/sanity-schema`) reused by every site.
- **App**: A single deployable site (`apps/<name>`) with its own brand, domain,
  Sanity dataset, and `siteId`.
- **SiteConfig**: The typed configuration object that declares everything
  niche-specific for one app (brand, theme, scoring, segmentation, taxonomy, copy).
- **Scoring Axis**: A named weighted sum (weights total 1.0) over factor values,
  e.g. "Safety Score" or "Educational Value".
- **Segmentation Dimension**: The single axis a site organizes products by —
  either a numeric range (age) or a discrete enum (e.g. health goal).
- **siteId**: Stable identifier for an app, used to scope all shared-database rows.
- **Schema Factory**: A function that builds a site's Sanity schema from its
  SiteConfig.
- **Parity**: The re-homed SafeNest app behaving identically to the current
  production site, verified before cutover.

## Requirements

### Requirement 1: Monorepo structure

**User Story:** As the operator, I want one repository with a shared engine and
thin per-site apps, so a fix in the engine benefits every site and each site
deploys independently.

#### Acceptance Criteria

1. THE Engine SHALL be organized as a Turborepo monorepo using npm workspaces with `packages/*` and `apps/*`.
2. THE Engine SHALL expose shared code as packages `@core`, `@ui`, and `@sanity-schema`.
3. WHERE an app needs engine functionality, THE App SHALL consume it by importing the shared packages rather than copying code.
4. THE Engine SHALL allow each App to build and deploy independently as its own Vercel project with its own domain and environment variables.
5. THE Engine SHALL reside in a new Git repository, leaving the existing SafeNest repository operational until cutover.

### Requirement 2: SiteConfig drives all niche-specific behavior

**User Story:** As the operator, I want every niche-specific value in one typed
config object per app, so creating a new site means writing config, not editing engine code.

#### Acceptance Criteria

1. THE Engine SHALL define a typed `SiteConfig` containing at minimum: `siteId`, brand, theme, product nouns, scoring axes, segmentation dimension, taxonomy, copy, and gift-guide definitions.
2. WHEN the engine renders brand-dependent output (site name, domain, affiliate tag, founders, logo, palette), THE Engine SHALL read those values from `SiteConfig` and SHALL NOT contain hardcoded brand literals.
3. IF a `SiteConfig` is missing a required field or contains an invalid value (e.g. scoring weights that do not sum to 1.0), THEN THE Engine SHALL fail validation at build time with a descriptive error.
4. WHERE editorial prose appears in engine-generated output (hero, disclosures, gift-guide intros, blog hooks), THE Engine SHALL source it from `SiteConfig.copy` rather than hardcoded strings.

### Requirement 3: Generalized scoring engine

**User Story:** As the operator, I want scoring defined as configurable named
axes, so each niche can score products on its own dimensions without code changes.

#### Acceptance Criteria

1. THE Scoring engine SHALL compute each axis as a weighted sum of its factor values, producing an integer in the range [0, 100].
2. WHERE a `SiteConfig` declares one or more scoring axes, THE Engine SHALL compute, store, and display a score for each declared axis.
3. IF a scoring axis's factor weights do not sum to 1.0 (within rounding tolerance), THEN THE Engine SHALL reject the configuration at validation time.
4. IF a scoring axis's factor weights sum to exactly 0.0 (all weights zero), THEN THE Engine SHALL reject the configuration as invalid.
5. THE Scoring engine SHALL preserve SafeNest's existing Safety and Development score values when SafeNest is expressed as a two-axis configuration.
6. IF any factor value supplied for scoring is outside [0, 100] or non-finite, THEN THE Scoring engine SHALL reject the input with an error.

### Requirement 4: Generalized segmentation

**User Story:** As the operator, I want each site to organize products by its own
dimension (age, goal, skill level), so programmatic pages and guides fit the niche.

#### Acceptance Criteria

1. THE Segmentation model SHALL support a numeric-range dimension (e.g. age) and a discrete-enum dimension (e.g. goal) selected via `SiteConfig`.
2. WHEN the engine generates programmatic "best [product] for [segment]" pages, THE Engine SHALL derive the routes and labels from the configured segmentation buckets.
3. WHERE a requested segment slug matches a configured bucket, THE Engine SHALL resolve it to the bucket and render the corresponding page; otherwise THE Engine SHALL return a not-found response.
4. THE Segmentation model SHALL preserve SafeNest's existing age-based pages, and WHERE the new bucket configuration requires it, THE Engine MAY change SafeNest's age slugs to match the configured buckets.

### Requirement 5: Sanity schema factory and per-site datasets

**User Story:** As the operator, I want each site's CMS schema generated from its
config and isolated in its own dataset, so content models fit the niche and never collide.

#### Acceptance Criteria

1. THE Schema Factory SHALL build a site's Sanity document schemas (product review, category, blog post, queued product) from its `SiteConfig`.
2. WHEN a `SiteConfig` declares scoring factors and a segmentation dimension, THE Schema Factory SHALL include corresponding fields on the product-review document.
3. THE Engine SHALL use a separate Sanity dataset per App.
4. THE Schema Factory SHALL produce a standard schema for SafeNest, and SafeNest's existing content SHALL be migrated/transformed to match the standard schema before acceptance (schema consistency takes priority over preserving the current structure).

### Requirement 6: Shared database with per-site scoping

**User Story:** As the operator, I want all sites to share one database scoped by
site, so I keep costs low while keeping each site's data separable.

#### Acceptance Criteria

1. THE Engine SHALL store transactional records (affiliate clicks, link statuses, newsletter subscriptions, and any queued-product mirror) in a single shared database with a non-null `siteId` column on each such table.
2. WHEN the engine reads or writes a transactional record, THE Engine SHALL scope the operation to the current app's `siteId`.
3. THE Newsletter subscription store SHALL treat email uniqueness as scoped per site, so the same email may subscribe to two different sites.
4. WHEN existing SafeNest rows are migrated into the shared schema, THE Migration SHALL assign them `siteId = "safenest-toys"` without data loss.
5. WHERE an admin dashboard displays transactional data, THE Dashboard SHALL show only the current app's `siteId` records.

### Requirement 7: Themeable shared UI

**User Story:** As the operator, I want shared UI components themed from config,
so every site looks distinct while reusing the same component code.

#### Acceptance Criteria

1. THE `@ui` package SHALL provide the shared components (header, footer, buy button, score badge, comparison table, newsletter form, product finder, cards) as reusable, themeable components.
2. WHEN a component renders brand or color, THE Component SHALL derive it from the app's theme tokens / `SiteConfig` rather than hardcoded values.
3. THE `@ui` components SHALL render a product's configured scoring axes generically (not assume the names "Safety"/"Development"), and THE scoring-axis presentation (labels and styling) SHALL be themeable through the same token system used for colors and branding.
4. IF generic scoring-axis rendering fails, THEN THE Component MAY fall back to default axis names rather than rendering nothing.

### Requirement 8: Engine feature parity (port without regression)

**User Story:** As the operator, I want all current SafeNest features to work
identically after extraction, so I lose nothing in the move.

#### Acceptance Criteria

1. THE Engine SHALL retain affiliate link building, click recording, redirect, and link-health checking behavior, including the data-integrity link validation.
2. THE Engine SHALL retain the first-party newsletter capture, the SEO features (sitemap, dynamic OG images, JSON-LD, robots, canonical URLs), the analytics event helpers, cookie-consent gating, and search.
3. THE Engine SHALL retain the queue-based daily product publisher and the bi-weekly blog generator, including the publish-time verification gate that blocks unverified links/images.
4. WHEN the engine's test suite runs, THE Engine SHALL pass all ported tests plus new tests covering generalized scoring, segmentation, and `siteId` scoping; the ported set MAY contain fewer than the current 298 tests provided it gives equivalent coverage of the ported behavior.
5. THE Re-homed SafeNest app SHALL be verified on a preview deployment to match current production before any domain cutover.

### Requirement 9: Data integrity preserved across all sites

**User Story:** As the operator, I want the no-fabrication rules enforced on every
site, so trust and Amazon compliance are never at risk.

#### Acceptance Criteria

1. THE Engine SHALL enforce, for every App, that affiliate links resolve (Amazon product or search URLs only; never fabricated `/dp/{ASIN}` links).
2. WHEN the publisher processes a queued product, THE Engine SHALL verify the affiliate URL and that the image returns real bytes before publishing, for every App.
3. IF verified data cannot be obtained for a queued product, THEN THE Engine SHALL skip publication and flag the item rather than publish fabricated data.
4. IF verification succeeds but any required product field is missing or incomplete, THEN THE Engine SHALL block publication until all required fields are complete.

### Requirement 10: New-site scaffolding

**User Story:** As the operator, I want a generator that scaffolds a new site
from a brief, so standing up a niche is fast and consistent.

#### Acceptance Criteria

1. THE Engine SHALL provide a `create-site` tool that scaffolds a new `apps/<name>` directory with a `SiteConfig` stub, theme tokens, and the app shell.
2. WHEN `create-site` runs for a new niche, THE Tool SHALL produce an app that builds against the engine without manual edits to engine packages.
3. THE Engine SHALL document the steps to provision a new site's Sanity dataset, `siteId`, Vercel project, domain, and environment variables.

### Requirement 11: LearningNest as the validation site

**User Story:** As the operator, I want LearningNest built from the template, so
the abstraction is proven against a real second niche end-to-end.

#### Acceptance Criteria

1. THE LearningNest App SHALL be created from the template with its own brand, two configured scoring axes (educational value; quality & safety), age-based segmentation, an educational/STEM taxonomy, its own Sanity dataset, and its own `siteId`.
2. THE LearningNest App SHALL build and deploy independently using only its `SiteConfig`, theme, assets, and content — with no changes to engine packages.
3. WHEN LearningNest content is created, THE App SHALL follow the same data-integrity rules, requiring the product, its affiliate link, and its image to ALL be verified before the content may be created; IF any of the three fails verification, THEN content creation SHALL be blocked.
4. THE LearningNest App SHALL be deployable to its own domain as a standalone Vercel project.
