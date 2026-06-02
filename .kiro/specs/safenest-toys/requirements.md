# Requirements Document

## Introduction

SafeNest Toys is a toy safety intelligence platform and developmental play guide for parents of babies and toddlers. The platform combines Consumer Reports-style editorial content with curated affiliate recommendations, built on a trust-first model. Phase 1 delivers the content foundation, safety scoring, affiliate monetization, and SEO infrastructure with zero inventory. Later phases add a recommendation engine (Phase 2) and full eCommerce (Phase 3).

## Glossary

- **Platform**: The SafeNest Toys web application built with Next.js App Router, TypeScript, Tailwind CSS, and shadcn/ui, hosted on Vercel
- **Editorial_System**: The Sanity CMS-powered content management layer that stores and delivers toy reviews, buying guides, safety articles, age-based guides, and recall alerts
- **Safety_Scoring_Engine**: The algorithmic component that computes a Safety Score (0–100) and Development Score (0–100) for each toy based on defined criteria
- **Affiliate_System**: The subsystem that manages outbound affiliate links (Amazon and future direct brands) and tracks click events
- **Newsletter_System**: The Klaviyo-integrated email capture and segmentation subsystem
- **SEO_System**: The subsystem responsible for generating structured data markup, FAQ blocks, internal linking, and programmatic pages
- **Design_System**: The UI component library and visual design language providing a calm, trust-focused, mobile-first experience
- **Toy_Review**: A structured content type containing product name, age range, safety score, development score, materials list, choking hazard assessment, certifications, pros/cons, alternatives, and affiliate links
- **Safety_Score**: A numeric value (0–100) computed from material safety, choking risk, recall history, and certification presence
- **Development_Score**: A numeric value (0–100) computed from motor skills engagement, cognitive skills engagement, and sensory engagement
- **Recall_Alert**: A content type that surfaces product recalls relevant to toys covered on the platform
- **Parent**: The primary end user of the platform — a caregiver seeking safe, developmentally appropriate toy recommendations
- **Admin**: A content editor or platform operator who manages editorial content and reviews

## Requirements

### Requirement 1: Public Website Pages

**User Story:** As a Parent, I want to browse a well-organized website with dedicated pages for toy categories, reviews, guides, and company information, so that I can find trusted toy safety information easily.

#### Acceptance Criteria

1. THE Platform SHALL render the following pages: Homepage, Category pages, Toy safety review pages, Blog listing page, Blog post pages, About page, Contact page, and Newsletter signup page
2. WHEN a Parent navigates to any page, THE Platform SHALL render the page with first contentful paint within 3 seconds on a simulated 3G mobile connection (1.6 Mbps download, 750 ms RTT)
3. THE Platform SHALL display all pages using a mobile-first responsive layout that adapts to viewport widths of 320px, 768px, and 1024px or greater without horizontal scrolling
4. WHEN a Parent accesses the Homepage, THE Platform SHALL display a minimum of 3 and a maximum of 6 featured toy reviews, a maximum of 5 latest safety articles sorted by publication date descending, and a newsletter signup prompt
5. WHEN a Parent navigates to a Category page, THE Platform SHALL display a filtered list of Toy Reviews belonging to that category, showing a maximum of 20 reviews per page with pagination controls when more than 20 reviews exist
6. IF a Parent navigates to a page that does not exist, THEN THE Platform SHALL display a dedicated error page indicating the requested content was not found and provide navigation links back to the Homepage
7. IF a Category page contains no Toy Reviews, THEN THE Platform SHALL display a message indicating no reviews are available for that category

### Requirement 2: Editorial Content System

**User Story:** As an Admin, I want to create and manage structured editorial content through Sanity CMS, so that I can publish toy reviews, buying guides, safety articles, age-based guides, and recall alerts.

#### Acceptance Criteria

1. THE Editorial_System SHALL support the following content types: Toy Review, Buying Guide, Safety Article, Age-Based Guide, and Recall Alert
2. WHEN an Admin creates a Toy Review, THE Editorial_System SHALL require the following fields: product name, age range (minimum and maximum months), safety score, development score, materials list (at least one material), choking hazard assessment, certifications, pros (at least one), cons (at least one), alternatives (at least one from a different brand), and affiliate links
3. WHEN an Admin publishes content, THE Platform SHALL make the content available on the public website within 60 seconds via Sanity webhook-triggered revalidation
4. THE Editorial_System SHALL store all content in Sanity CMS and deliver it to the Platform via Sanity API using GROQ queries
5. WHEN an Admin creates a Buying Guide, THE Editorial_System SHALL require at least three Toy Review references and a target age range
6. WHEN an Admin creates a Recall Alert, THE Editorial_System SHALL require the affected product name, recall date, recall reason, issuing authority, and recommended parent action
7. IF an Admin attempts to publish a Toy Review with any required field missing, THEN THE Editorial_System SHALL prevent publication and display a validation error listing the missing fields
8. IF an Admin references a Toy Review in a Buying Guide and that Toy Review is subsequently unpublished, THEN THE Editorial_System SHALL flag the Buying Guide for Admin review

### Requirement 3: Safety Scoring Engine

**User Story:** As a Parent, I want to see objective safety and developmental scores for each toy, so that I can make informed purchasing decisions based on transparent criteria.

#### Acceptance Criteria

1. THE Safety_Scoring_Engine SHALL compute a Safety_Score (0–100) as a weighted sum of the following factors: material safety (30%), choking risk (30%), recall history (20%), and certification presence (20%), where each factor is rated on a scale of 0–100
2. THE Safety_Scoring_Engine SHALL compute a Development_Score (0–100) as a weighted sum of the following factors: motor skills engagement (40%), cognitive skills engagement (35%), and sensory engagement (25%), where each factor is rated on a scale of 0–100
3. WHEN a Toy Review is created or updated, THE Safety_Scoring_Engine SHALL recalculate the Safety_Score and Development_Score within 5 seconds of the save event
4. THE Platform SHALL display the Safety_Score and Development_Score on every Toy Review page with a visual breakdown showing each contributing factor's individual score and weight
5. IF a Safety_Score or Development_Score factor value is missing, THEN THE Safety_Scoring_Engine SHALL flag the Toy Review as incomplete and prevent publication until all factor values are provided
6. THE Safety_Scoring_Engine SHALL store scoring criteria definitions, factor weights, and calculation methodology in a transparency section accessible to Parents at a dedicated URL
7. IF a factor value is outside the range of 0–100, THEN THE Safety_Scoring_Engine SHALL reject the input and display a validation error indicating the acceptable range

### Requirement 4: SEO System

**User Story:** As an Admin, I want the platform to automatically generate SEO-optimized structured data and programmatic pages, so that the platform ranks well in organic search results.

#### Acceptance Criteria

1. WHEN a Toy Review is published, THE SEO_System SHALL generate schema.org Product and Review markup embedded as JSON-LD in the page head, including product name, aggregate rating derived from Safety_Score, and review body
2. WHEN a Buying Guide is published, THE SEO_System SHALL generate schema.org FAQPage markup as JSON-LD from question-answer pairs within the guide content
3. THE SEO_System SHALL generate an internal linking structure by inserting a minimum of 3 and maximum of 6 related content links on each Toy Review, Buying Guide, and Age-Based Guide page, selected based on shared category and age range attributes
4. THE SEO_System SHALL generate programmatic landing pages for the following search patterns: "best toys for [age]" (for each age in months: 3, 6, 9, 12, 18, 24, 36), "best [category] toys for [age group]" (for each category and age group combination), and "safe [toy type] toys" (for each toy type in the system)
5. WHEN content is published or updated, THE SEO_System SHALL regenerate the XML sitemap within 5 minutes and submit it to search engines via ping
6. THE SEO_System SHALL include Open Graph meta tags (og:title, og:description, og:image, og:url, og:type) and Twitter Card meta tags (twitter:card, twitter:title, twitter:description, twitter:image) on all public pages
7. WHEN a programmatic landing page has fewer than 3 matching Toy Reviews, THE SEO_System SHALL not generate that page and SHALL return a 404 response for its URL

### Requirement 5: Affiliate Link System

**User Story:** As an Admin, I want to manage affiliate links and track outbound clicks, so that the platform can monetize recommendations transparently.

#### Acceptance Criteria

1. THE Affiliate_System SHALL support Amazon affiliate links with configurable affiliate tag and configurable links for future direct brand partnerships with custom URL patterns and attribution parameters
2. WHEN a Parent clicks an affiliate link, THE Affiliate_System SHALL record the click event in PostgreSQL with: timestamp (UTC), product identifier, source page URL, affiliate partner name, and anonymized session identifier
3. THE Affiliate_System SHALL display a transparency disclosure on every page containing affiliate links stating: "SafeNest Toys earns a commission from qualifying purchases made through affiliate links on this page"
4. WHEN an affiliate link is rendered, THE Affiliate_System SHALL apply the rel="nofollow sponsored" attribute and target="_blank" with rel="noopener" to the link element
5. THE Affiliate_System SHALL provide an Admin dashboard view showing total outbound clicks grouped by product and filterable by time period (today, last 7 days, last 30 days, custom range)
6. THE Affiliate_System SHALL check affiliate link target URLs for reachability on a daily scheduled basis, and IF a URL returns an HTTP status code of 4xx or 5xx or does not respond within 10 seconds, THEN THE Affiliate_System SHALL flag the link for Admin review and send a notification within 24 hours
7. IF the click recording fails due to a database error, THEN THE Affiliate_System SHALL still redirect the Parent to the affiliate destination without delay and log the recording failure for Admin review

### Requirement 6: Newsletter Capture and Email Integration

**User Story:** As a Parent, I want to subscribe to a newsletter segmented by my child's age, so that I receive relevant toy safety updates and recommendations.

#### Acceptance Criteria

1. THE Newsletter_System SHALL display an inline signup form containing an email address field and a child age range selector on the Homepage, Blog pages, and Toy Review pages
2. THE Newsletter_System SHALL display a timed popup signup form after a Parent has spent 30 seconds on the site, shown at most once per browser session, and the popup SHALL be dismissible via a visible close button
3. WHEN a Parent submits the newsletter form with a valid email address and a selected child age range, THE Newsletter_System SHALL sync the subscriber record including email and child age range to Klaviyo within 10 seconds and display a confirmation message indicating successful subscription
4. THE Newsletter_System SHALL segment subscribers in Klaviyo by the selected child age range, where child age ranges are: 0–2 years, 3–5 years, 6–8 years, and 9–12 years
5. IF a Parent submits an email address that does not conform to standard email format validation, THEN THE Newsletter_System SHALL display an inline validation error message indicating the email is invalid and SHALL NOT submit any data to Klaviyo
6. THE Newsletter_System SHALL include an unsubscribe link in all emails sent through Klaviyo
7. IF a Parent submits the newsletter form without selecting a child age range, THEN THE Newsletter_System SHALL display a validation error message indicating that a child age range selection is required and SHALL NOT submit data to Klaviyo
8. IF the sync to Klaviyo fails or does not complete within 10 seconds, THEN THE Newsletter_System SHALL display an error message indicating the subscription could not be completed and SHALL prompt the Parent to try again
9. IF a Parent submits an email address that is already subscribed, THEN THE Newsletter_System SHALL display a message indicating the email is already subscribed and SHALL NOT create a duplicate record in Klaviyo

### Requirement 7: Design System and Visual Language

**User Story:** As a Parent, I want the platform to feel calm, trustworthy, and easy to read, so that I feel confident in the safety information presented.

#### Acceptance Criteria

1. THE Design_System SHALL use a soft, muted color palette where background colors have saturation values no greater than 30% and text elements maintain a minimum WCAG AA contrast ratio of 4.5:1 against their background
2. THE Design_System SHALL implement all UI components using shadcn/ui with Tailwind CSS styling
3. THE Platform SHALL achieve a Lighthouse accessibility score of 90 or above on all public pages
4. THE Design_System SHALL avoid aggressive eCommerce patterns including fake urgency indicators, countdown timers, discount spam elements, manipulative modal pop-ups, and dark patterns that pressure users into actions
5. THE Platform SHALL render all pages with a mobile-first layout that adapts to viewport widths of at least three breakpoints: mobile (below 768px), tablet (768px to 1023px), and desktop (1024px and above)
6. THE Design_System SHALL use consistent typography hierarchy with a maximum of two font families, a minimum body text size of 16px, and a minimum of four distinct heading levels
7. WHEN a page is loaded on any supported viewport, THE Platform SHALL display all interactive elements (buttons, links, form controls) with a minimum touch target size of 44x44 pixels on mobile and 36x36 pixels on desktop
8. THE Design_System SHALL maintain consistent spacing using a base unit scale (4px increments) with no more than 8 spacing values used across all components

### Requirement 8: Authentication and User Accounts

**User Story:** As a Parent, I want to optionally create an account, so that I can save favorite reviews and manage my newsletter preferences.

#### Acceptance Criteria

1. THE Platform SHALL integrate Clerk for user authentication supporting email/password and OAuth providers (Google, Apple)
2. WHEN a Parent signs up, THE Platform SHALL create a user record in PostgreSQL via Prisma ORM linked to the Clerk user identifier within 5 seconds of successful Clerk registration
3. THE Platform SHALL allow Parents to browse all public content without authentication
4. WHEN an authenticated Parent saves a Toy Review to favorites, THE Platform SHALL persist the favorite association in PostgreSQL and display the saved state within 2 seconds
5. IF a Clerk authentication session expires, THEN THE Platform SHALL redirect the Parent to the login page when accessing authenticated routes and preserve the intended destination URL for post-login redirect
6. WHEN an authenticated Parent removes a Toy Review from favorites, THE Platform SHALL delete the favorite association from PostgreSQL and update the displayed state within 2 seconds
7. IF the Clerk service is unavailable, THEN THE Platform SHALL display a message indicating that authentication is temporarily unavailable and allow continued access to public content

### Requirement 9: Database and Data Persistence

**User Story:** As an Admin, I want platform data (users, clicks, favorites) stored in a reliable database, so that analytics and user features function correctly.

#### Acceptance Criteria

1. THE Platform SHALL use PostgreSQL as the primary relational database
2. THE Platform SHALL use Prisma ORM for all database access and schema management
3. THE Platform SHALL store the following data in PostgreSQL: user accounts, affiliate click events, user favorites, and newsletter subscription metadata
4. WHEN the database schema changes, THE Platform SHALL apply migrations using Prisma Migrate without data loss to existing records
5. IF a database query fails, THEN THE Platform SHALL log the error and return an error message indicating the operation could not be completed, without exposing internal database details such as table names, query syntax, or connection strings
6. IF the database connection is unavailable, THEN THE Platform SHALL retry the connection up to 3 times with a 2-second delay between attempts before returning an error message indicating the service is temporarily unavailable
7. THE Platform SHALL enforce referential integrity constraints between related tables (user accounts, click events, favorites, and newsletter subscriptions) such that no orphaned records are created when a referenced record is deleted

### Requirement 10: Analytics Integration

**User Story:** As an Admin, I want to track user behavior across the platform, so that I can understand content performance and optimize the user experience.

#### Acceptance Criteria

1. THE Platform SHALL integrate Google Analytics 4 (GA4) for page view and event tracking on all public pages
2. THE Platform SHALL integrate PostHog for product analytics and feature usage tracking including toy review views, search queries, and filter usage
3. THE Platform SHALL integrate Meta Pixel for conversion tracking on affiliate link clicks and newsletter signups
4. WHEN a Parent clicks an affiliate link, THE Platform SHALL fire a conversion event to GA4, PostHog, and Meta Pixel within 500ms of the click, including product identifier and source page
5. THE Platform SHALL load all analytics scripts asynchronously using defer or dynamic import so they do not block initial page render or increase Largest Contentful Paint by more than 100ms
6. THE Platform SHALL present a cookie consent banner on first visit and load tracking scripts only after the Parent grants consent, persisting the consent decision for 365 days
7. IF a Parent declines cookie consent, THEN THE Platform SHALL not load GA4, PostHog, or Meta Pixel scripts and SHALL not track any user behavior beyond anonymous page view counts

### Requirement 11: Recall Awareness and Safety Transparency

**User Story:** As a Parent, I want to see active recall alerts and understand how safety scores are calculated, so that I can trust the platform's recommendations.

#### Acceptance Criteria

1. THE Platform SHALL display a dedicated Recall Alerts page listing all active recalls relevant to toys reviewed on the platform, showing for each recall entry the toy name, recall reason, issuing authority, date published, and a link to the official recall notice
2. WHEN a new Recall Alert is published, THE Platform SHALL display a banner notification on the affected Toy Review page within 24 hours of the recall being added to the system, and the banner SHALL remain visible until the recall is resolved or the review is removed
3. THE Platform SHALL display a Transparency page explaining the Safety_Score methodology, listing each data source used, the scoring weight assigned to each factor as a percentage, and the date the methodology was last updated
4. WHEN a toy referenced in a published review is subject to a recall, THE Editorial_System SHALL flag the associated Toy Review for Admin review within 24 hours of the recall being recorded in the system
5. THE Platform SHALL not make medical claims or guarantee absolute safety in any content displayed to users
6. IF the external recall data source is unavailable, THEN THE Platform SHALL display the most recently cached recall data and indicate the date and time of the last successful data refresh
7. WHEN a user navigates to the Recall Alerts page, THE Platform SHALL display recall entries sorted by date published in descending order, showing a maximum of 50 entries per page with pagination controls to access older entries

### Requirement 12: Content Integrity and Non-Negotiable Rules

**User Story:** As a Parent, I want assurance that the platform operates with editorial integrity, so that I can trust recommendations are evidence-based.

#### Acceptance Criteria

1. THE Platform SHALL not display inventory counts, stock urgency, or purchase pressure indicators in Phase 1
2. THE Platform SHALL include a visible editorial policy disclosure on the About page explaining the separation between editorial content and affiliate monetization, containing at minimum: a statement that editorial selections are independent of affiliate partnerships, and a description of how affiliate links generate revenue
3. THE Editorial_System SHALL require that every Toy Review includes at least one alternative product recommendation from a different brand than the primary reviewed product
4. THE Platform SHALL not publish content containing medical claims, health guarantees, or therapeutic outcome promises unless attributed to a cited peer-reviewed source
5. WHEN a Toy Review contains an affiliate link, THE Platform SHALL display a disclosure label within 50 pixels of the link, visible without scrolling relative to the link position
6. IF a Toy Review is submitted without an alternative product recommendation, THEN THE Editorial_System SHALL prevent publication and display an error message indicating that at least one alternative product from a different brand is required
7. IF content submitted for publication contains medical claims or health guarantees without a cited peer-reviewed source, THEN THE Platform SHALL reject the submission and display an error message indicating the policy violation

### Requirement 13: Deployment and Hosting

**User Story:** As an Admin, I want the platform deployed on Vercel with CI/CD, so that content updates and code changes are delivered reliably.

#### Acceptance Criteria

1. WHEN a commit is pushed to the main branch, THE Platform SHALL trigger an automatic production deployment on Vercel within 5 minutes of the push event
2. IF a deployment fails, THEN THE Platform SHALL notify the Admin via the configured alerting channel within 5 minutes of the failure, including an indication of which commit triggered the failed deployment
3. THE Platform SHALL use environment variables for all secrets and API keys, stored in Vercel's environment configuration, with no secrets hardcoded in source code or build artifacts
4. WHEN a commit is pushed to the main branch or a pull request is opened, THE Platform SHALL execute a CI pipeline that runs linting, type checking, and tests, and SHALL block deployment if any step fails
5. WHEN a pull request is opened or updated, THE Platform SHALL generate a preview deployment on Vercel and provide the preview URL as a status check on the pull request within 10 minutes
6. IF the CI pipeline does not complete within 15 minutes, THEN THE Platform SHALL mark the pipeline as failed and notify the Admin via the configured alerting channel
