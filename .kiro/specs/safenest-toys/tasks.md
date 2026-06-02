# Implementation Plan: SafeNest Toys

## Overview

Implement the SafeNest Toys platform as a Next.js App Router application with TypeScript, Tailwind CSS, shadcn/ui, Sanity CMS, PostgreSQL (Prisma), Clerk auth, Klaviyo, and analytics integrations. Tasks are ordered for incremental progress: infrastructure first, then data layer, content layer, core logic, public pages, and finally integrations and testing.

## Tasks

- [x] 1. Project scaffolding and infrastructure setup
  - [x] 1.1 Initialize Next.js App Router project with TypeScript, Tailwind CSS, and shadcn/ui
    - Create Next.js project with App Router enabled
    - Configure Tailwind CSS with the design system's muted color palette and spacing scale (4px increments)
    - Install and configure shadcn/ui component library
    - Set up project directory structure per the design document (`src/app`, `src/components`, `src/lib`, `prisma`)
    - Configure environment variables structure (`.env.local`, `.env.example`)
    - _Requirements: 7.1, 7.2, 7.5, 7.6, 7.8, 13.3_

  - [x] 1.2 Configure Tailwind theme with design system tokens
    - Define color palette with saturation ≤ 30% for backgrounds
    - Set up typography hierarchy (max 2 font families, min 16px body, 4+ heading levels)
    - Configure responsive breakpoints: mobile (<768px), tablet (768–1023px), desktop (≥1024px)
    - Define spacing scale using 4px base unit with max 8 values
    - Ensure minimum touch target sizes (44x44px mobile, 36x36px desktop)
    - _Requirements: 7.1, 7.5, 7.6, 7.7, 7.8_

- [x] 2. Database schema and Prisma setup
  - [x] 2.1 Define Prisma schema and configure PostgreSQL connection
    - Create `prisma/schema.prisma` with all models: User, Favorite, AffiliateClick, AffiliateLinkStatus, NewsletterSubscription
    - Configure cascade delete on User → Favorites relationship
    - Add unique constraints (`[userId, reviewSlug]`, `[productId, partnerId]`, email)
    - Add indexes for performance (clerkId, userId, productId, timestamp, partnerId+timestamp, email, ageRange, isHealthy)
    - _Requirements: 9.1, 9.2, 9.3, 9.7_

  - [x] 2.2 Create Prisma client singleton and database utility layer
    - Create `src/lib/db/prisma.ts` with singleton pattern for serverless
    - Implement database retry logic (3 retries, 2-second delay)
    - Implement error handling that never exposes internal DB details
    - _Requirements: 9.2, 9.5, 9.6_

  - [x] 2.3 Generate initial Prisma migration
    - Run `prisma migrate dev` to create initial migration
    - Verify referential integrity constraints are enforced
    - _Requirements: 9.4, 9.7_

- [x] 3. Sanity CMS schemas and client configuration
  - [x] 3.1 Create Sanity project configuration and client
    - Configure Sanity client in `src/lib/sanity/client.ts` with project ID, dataset, and API version
    - Set up GROQ query helpers in `src/lib/sanity/queries.ts`
    - _Requirements: 2.4_

  - [x] 3.2 Define Sanity document schemas
    - Create Toy Review schema with all required fields and validation rules (product name, age range, scoring factors 0–100, materials, choking hazard, certifications, pros, cons, alternatives, affiliate links)
    - Create Buying Guide schema (min 3 review references, target age range)
    - Create Safety Article schema
    - Create Age-Based Guide schema
    - Create Recall Alert schema (affected product, recall date, reason, issuing authority, recommended action, official notice URL, affected reviews, isResolved)
    - Create Category schema
    - Create Affiliate Link object schema
    - _Requirements: 2.1, 2.2, 2.5, 2.6, 2.7, 11.4_

  - [x] 3.3 Implement Sanity validation rules for content integrity
    - Add validation that alternatives must include at least one product from a different brand
    - Add validation preventing publication with missing required fields
    - Add validation rejecting scoring factors outside 0–100 range
    - _Requirements: 2.7, 3.5, 3.7, 12.3, 12.6_

- [x] 4. Core scoring engine
  - [x] 4.1 Implement Safety Score computation
    - Create `src/lib/scoring/safety-score.ts`
    - Implement weighted sum: materialSafety × 0.30 + chokingRisk × 0.30 + recallHistory × 0.20 + certificationPresence × 0.20
    - Validate all inputs are in range [0, 100], reject with error if not
    - Ensure output is always in range [0, 100]
    - _Requirements: 3.1, 3.7_

  - [x] 4.2 Implement Development Score computation
    - Create `src/lib/scoring/development-score.ts`
    - Implement weighted sum: motorSkills × 0.40 + cognitiveSkills × 0.35 + sensoryEngagement × 0.25
    - Validate all inputs are in range [0, 100], reject with error if not
    - Ensure output is always in range [0, 100]
    - _Requirements: 3.2, 3.7_

  - [x] 4.3 Write property test for Safety Score (Property 1)
    - **Property 1: Safety Score bounded weighted sum**
    - Generate 4 random integers in [0, 100], verify computed score equals exact weighted sum and is in [0, 100]
    - **Validates: Requirements 3.1, 3.7**

  - [x] 4.4 Write property test for Development Score (Property 2)
    - **Property 2: Development Score bounded weighted sum**
    - Generate 3 random integers in [0, 100], verify computed score equals exact weighted sum and is in [0, 100]
    - **Validates: Requirements 3.2, 3.7**

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Public pages and components
  - [x] 6.1 Create shared layout components (Header, Footer, Navigation)
    - Implement `src/components/layout/Header.tsx`, `Footer.tsx`, `Navigation.tsx`
    - Ensure mobile-first responsive design with hamburger menu on mobile
    - Add affiliate disclosure in footer
    - Implement root layout in `src/app/layout.tsx`
    - _Requirements: 1.3, 7.1, 7.2, 7.4, 7.5_

  - [x] 6.2 Implement Homepage
    - Create `src/app/(public)/page.tsx` with ISR (60s revalidate)
    - Display 3–6 featured toy reviews from Sanity
    - Display up to 5 latest safety articles sorted by publication date descending
    - Include newsletter signup prompt (inline form)
    - _Requirements: 1.1, 1.4_

  - [x] 6.3 Implement Category pages with pagination
    - Create `src/app/(public)/categories/[slug]/page.tsx` with ISR (on-demand)
    - Display filtered Toy Reviews for the category, max 20 per page with pagination
    - Show empty state message when no reviews exist for a category
    - _Requirements: 1.5, 1.7_

  - [x] 6.4 Implement Toy Review pages
    - Create `src/app/(public)/reviews/[slug]/page.tsx` with ISR (on-demand)
    - Create `src/components/reviews/ReviewCard.tsx`
    - Create `src/components/reviews/SafetyScoreDisplay.tsx` showing score breakdown with weights
    - Create `src/components/reviews/DevelopmentScoreDisplay.tsx` showing score breakdown with weights
    - Display all review content: name, age range, materials, choking hazard, certifications, pros, cons, alternatives
    - Include recall banner if toy has active recall
    - _Requirements: 1.1, 3.4, 11.2_

  - [x] 6.5 Implement Blog listing and post pages
    - Create `src/app/(public)/blog/page.tsx` (blog listing with ISR)
    - Create `src/app/(public)/blog/[slug]/page.tsx` (individual posts)
    - Include newsletter inline signup on blog pages
    - _Requirements: 1.1, 6.1_

  - [x] 6.6 Implement Buying Guide pages
    - Create `src/app/(public)/guides/[slug]/page.tsx` with ISR (on-demand)
    - Display referenced toy reviews and age range
    - _Requirements: 1.1, 2.5_

  - [x] 6.7 Implement static pages (About, Contact, Transparency)
    - Create `src/app/(public)/about/page.tsx` with editorial policy disclosure
    - Create `src/app/(public)/contact/page.tsx`
    - Create `src/app/(public)/transparency/page.tsx` with scoring methodology, factor weights, data sources, last update date
    - _Requirements: 1.1, 3.6, 11.3, 12.2_

  - [x] 6.8 Implement Recall Alerts page
    - Create `src/app/(public)/recalls/page.tsx` with ISR (300s revalidate)
    - Create `src/components/recalls/RecallList.tsx` and `RecallBanner.tsx`
    - Display recalls sorted by date descending, max 50 per page with pagination
    - Show cached data indicator when external source is unavailable
    - _Requirements: 11.1, 11.6, 11.7_

  - [x] 6.9 Implement 404 error page
    - Create custom not-found page with navigation links to Homepage
    - _Requirements: 1.6_

- [x] 7. Affiliate link system
  - [x] 7.1 Implement affiliate link builder and component
    - Create `src/lib/affiliate/link-builder.ts` for constructing affiliate URLs with configurable tags
    - Create `src/components/affiliate/AffiliateLink.tsx` with `rel="nofollow sponsored"` and `target="_blank" rel="noopener"`
    - Create `src/components/affiliate/AffiliateDisclosure.tsx` with transparency text
    - Ensure disclosure label is within 50px of the affiliate link
    - _Requirements: 5.1, 5.3, 5.4, 12.5_

  - [x] 7.2 Implement affiliate click tracking API route
    - Create `src/app/api/affiliate/click/route.ts`
    - Record click event in PostgreSQL (timestamp UTC, productId, sourcePageUrl, partnerId, anonymized sessionId)
    - Always redirect to destination URL even if DB recording fails
    - Log recording failures for admin review
    - _Requirements: 5.2, 5.7_

  - [x] 7.3 Write property test for affiliate click redirect (Property 3)
    - **Property 3: Affiliate click always redirects**
    - Generate random click events with mocked DB (success/failure scenarios)
    - Verify redirect always occurs regardless of DB outcome
    - **Validates: Requirements 5.2, 5.7**

  - [x] 7.4 Implement daily link health checker
    - Create `src/app/api/cron/check-links/route.ts`
    - Check each affiliate link target URL for reachability
    - Flag links with 4xx/5xx or timeout (>10s) for admin review
    - Send notification within 24 hours for unhealthy links
    - _Requirements: 5.6_

- [x] 8. Newsletter system
  - [x] 8.1 Implement newsletter signup API route
    - Create `src/app/api/newsletter/subscribe/route.ts`
    - Validate email format and age range selection
    - Check for existing subscription (prevent duplicates)
    - Sync to Klaviyo with age range segmentation (0–2, 3–5, 6–8, 9–12 years)
    - Handle Klaviyo timeout (>10s) with error message
    - Store subscription metadata in PostgreSQL
    - _Requirements: 6.3, 6.4, 6.5, 6.7, 6.8, 6.9_

  - [x] 8.2 Implement newsletter form components
    - Create `src/components/newsletter/InlineSignupForm.tsx` with email field and age range selector
    - Create `src/components/newsletter/PopupSignupForm.tsx` (30-second delay, once per session, dismissible)
    - Add inline validation error messages for invalid email and missing age range
    - _Requirements: 6.1, 6.2, 6.5, 6.7_

  - [x] 8.3 Write property test for invalid email rejection (Property 4)
    - **Property 4: Invalid email format rejection**
    - Generate random non-email strings, verify rejection and no Klaviyo sync
    - **Validates: Requirements 6.5**

  - [x] 8.4 Write property test for duplicate email prevention (Property 9)
    - **Property 9: Duplicate email subscription prevention**
    - Generate random emails, subscribe twice, verify count = 1
    - **Validates: Requirements 6.9**

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. SEO system
  - [x] 10.1 Implement JSON-LD structured data generators
    - Create `src/lib/seo/structured-data.ts`
    - Generate schema.org Product + Review markup for Toy Reviews (with aggregate rating from Safety Score)
    - Generate schema.org FAQPage markup for Buying Guides
    - Create `src/components/seo/JsonLd.tsx` component for embedding in page head
    - _Requirements: 4.1, 4.2_

  - [x] 10.2 Implement Open Graph and Twitter Card meta tags
    - Create `src/components/seo/OpenGraphMeta.tsx`
    - Add og:title, og:description, og:image, og:url, og:type on all public pages
    - Add twitter:card, twitter:title, twitter:description, twitter:image on all public pages
    - _Requirements: 4.6_

  - [x] 10.3 Implement internal linking system
    - Create `src/components/seo/InternalLinks.tsx`
    - Insert 3–6 related content links on Review, Guide, and Age-Based Guide pages
    - Select links based on shared category and age range
    - _Requirements: 4.3_

  - [x] 10.4 Implement programmatic SEO pages
    - Create `src/lib/seo/programmatic-pages.ts` with generation logic
    - Generate pages for: "best toys for [age]" (3, 6, 9, 12, 18, 24, 36 months), "best [category] toys for [age group]", "safe [toy type] toys"
    - Only generate pages with ≥ 3 matching reviews; return 404 otherwise
    - Implement static generation at build time
    - _Requirements: 4.4, 4.7_

  - [x] 10.5 Write property test for programmatic page minimum review count (Property 10)
    - **Property 10: Programmatic pages require minimum review count**
    - Generate random category/age combinations with 0–2 reviews, verify no page generated and 404 returned
    - **Validates: Requirements 4.7**

  - [x] 10.6 Implement sitemap generation and Sanity webhook handler
    - Create `src/lib/seo/sitemap.ts` for XML sitemap generation
    - Create `src/app/api/webhooks/sanity/route.ts` for webhook-triggered ISR revalidation
    - Trigger score recalculation for review create/update events
    - Regenerate sitemap within 5 minutes of content change and ping search engines
    - _Requirements: 2.3, 3.3, 4.5_

- [x] 11. Authentication system
  - [x] 11.1 Integrate Clerk authentication
    - Create `src/middleware.ts` with Clerk auth middleware
    - Configure Clerk for email/password and OAuth (Google, Apple)
    - Set up authenticated route group `src/app/(auth)/`
    - Allow all public content access without authentication
    - Handle expired sessions (redirect to login, preserve destination URL)
    - Handle Clerk unavailability (show message, allow public access)
    - _Requirements: 8.1, 8.3, 8.5, 8.7_

  - [x] 11.2 Implement user creation webhook and favorites API
    - Create user record in PostgreSQL linked to Clerk ID on signup (within 5 seconds)
    - Create `src/app/api/favorites/route.ts` for add/remove favorites
    - Persist/delete favorite associations with response within 2 seconds
    - Create `src/app/(auth)/favorites/page.tsx` to display saved reviews
    - _Requirements: 8.2, 8.4, 8.6_

  - [x] 11.3 Write property test for no orphaned favorites (Property 7)
    - **Property 7: No orphaned favorites on user deletion**
    - Generate random user with N favorites, delete user, verify zero orphaned records
    - **Validates: Requirements 9.7**

- [x] 12. Analytics integration
  - [x] 12.1 Implement cookie consent banner and analytics provider
    - Create `src/components/analytics/CookieConsentBanner.tsx` (first visit, persist 365 days)
    - Create `src/components/analytics/AnalyticsProvider.tsx`
    - Load GA4, PostHog, Meta Pixel scripts ONLY after consent granted
    - Load scripts asynchronously (defer/dynamic import) — must not increase LCP by >100ms
    - If consent declined: load zero analytics scripts, track only anonymous page view counts
    - _Requirements: 10.1, 10.2, 10.3, 10.5, 10.6, 10.7_

  - [x] 12.2 Implement analytics event tracking
    - Create `src/lib/analytics/events.ts` with event helper functions
    - Fire conversion events on affiliate click to GA4, PostHog, Meta Pixel within 500ms
    - Track newsletter signups as conversion events
    - Track review views, search queries, and filter usage in PostHog
    - _Requirements: 10.4_

  - [x] 12.3 Write property test for analytics consent gating (Property 8)
    - **Property 8: Analytics scripts load only with consent**
    - Generate random consent states (true/false/undefined), verify scripts present if and only if consent granted
    - **Validates: Requirements 10.6, 10.7**

- [x] 13. Admin dashboard
  - [x] 13.1 Implement admin affiliate clicks dashboard
    - Create `src/app/(admin)/dashboard/clicks/page.tsx` (SSR, no cache)
    - Display total outbound clicks grouped by product
    - Add time period filter (today, last 7 days, last 30 days, custom range)
    - _Requirements: 5.5_

  - [x] 13.2 Implement admin link health dashboard
    - Create `src/app/(admin)/dashboard/links/page.tsx`
    - Display flagged unhealthy affiliate links with status and last checked date
    - _Requirements: 5.6_

- [x] 14. Content integrity validation
  - [x] 14.1 Implement content validation rules
    - Enforce no inventory counts, stock urgency, or purchase pressure indicators
    - Reject content with medical claims/health guarantees without cited peer-reviewed source
    - Ensure affiliate disclosure within 50px of affiliate links
    - _Requirements: 12.1, 12.4, 12.5, 12.7_

  - [x] 14.2 Write property test for mandatory fields (Property 5)
    - **Property 5: Content publication requires all mandatory fields**
    - Generate random subsets of missing fields, verify publication prevented and errors shown
    - **Validates: Requirements 2.2, 2.7, 3.5**

  - [x] 14.3 Write property test for alternative brand diversity (Property 6)
    - **Property 6: Alternative product from different brand**
    - Generate random review data with random brand assignments, verify constraint enforcement
    - **Validates: Requirements 12.3, 12.6**

- [x] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. CI/CD and deployment configuration
  - [x] 16.1 Configure Vercel deployment and CI pipeline
    - Set up `vercel.json` configuration
    - Configure GitHub Actions (or Vercel-native CI) for linting, type checking, and tests on push to main and PR
    - Block deployment if any CI step fails
    - Configure preview deployments on PRs with URL in status check
    - Set up environment variables in Vercel (no secrets in source code)
    - Configure deployment failure notifications
    - Configure CI pipeline timeout (fail at 15 minutes)
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

  - [x] 16.2 Configure Lighthouse CI for accessibility and performance
    - Add Lighthouse CI to pipeline
    - Set thresholds: accessibility ≥ 90, performance ≥ 80
    - Verify FCP < 3s on simulated 3G
    - _Requirements: 1.2, 7.3_

- [x] 17. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using fast-check
- Unit tests validate specific examples and edge cases
- All scoring computation is server-side for consistency and auditability
- Sanity webhooks trigger on-demand ISR revalidation for content freshness
- Affiliate click tracking never blocks the user redirect

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "3.3"] },
    { "id": 3, "tasks": ["4.1", "4.2"] },
    { "id": 4, "tasks": ["4.3", "4.4", "6.1", "6.9"] },
    { "id": 5, "tasks": ["6.2", "6.3", "6.4", "6.5", "6.6", "6.7", "6.8"] },
    { "id": 6, "tasks": ["7.1", "8.1", "8.2", "10.1", "10.2", "10.3"] },
    { "id": 7, "tasks": ["7.2", "7.4", "8.3", "8.4", "10.4", "10.6"] },
    { "id": 8, "tasks": ["7.3", "10.5", "11.1"] },
    { "id": 9, "tasks": ["11.2", "12.1", "12.2"] },
    { "id": 10, "tasks": ["11.3", "12.3", "13.1", "13.2"] },
    { "id": 11, "tasks": ["14.1", "14.2", "14.3"] },
    { "id": 12, "tasks": ["16.1", "16.2"] }
  ]
}
```
