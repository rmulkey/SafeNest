/**
 * Analytics event helpers for SafeNest Toys.
 *
 * Fires events to GA4 (window.gtag), PostHog (window.posthog), and Meta Pixel (window.fbq).
 * All helpers gracefully no-op when the corresponding script is not loaded (e.g. consent not given).
 */

// ─── Type declarations for global analytics objects ────────────────────────────

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    posthog?: {
      capture: (event: string, properties?: Record<string, unknown>) => void;
    };
    fbq?: (...args: unknown[]) => void;
  }
}

// ─── Event payload types ───────────────────────────────────────────────────────

export interface AffiliateClickEvent {
  productId: string;
  sourcePageUrl: string;
  partnerId: string;
}

export interface NewsletterSignupEvent {
  email: string;
  ageRange: string;
}

export interface ReviewViewEvent {
  reviewSlug: string;
  productName: string;
  category?: string;
}

export interface SearchQueryEvent {
  query: string;
  resultsCount: number;
}

export interface FilterUsageEvent {
  filterType: string;
  filterValue: string;
  pageUrl: string;
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

function isGtagLoaded(): boolean {
  return typeof window !== 'undefined' && typeof window.gtag === 'function';
}

function isPostHogLoaded(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.posthog?.capture === 'function'
  );
}

function isFbqLoaded(): boolean {
  return typeof window !== 'undefined' && typeof window.fbq === 'function';
}

// ─── Conversion events ─────────────────────────────────────────────────────────

/**
 * Fires a conversion event when a parent clicks an affiliate link.
 * Sends to GA4, PostHog, and Meta Pixel within the same call stack (< 500ms).
 *
 * Validates: Requirements 10.4
 */
export function trackAffiliateClick(event: AffiliateClickEvent): void {
  const { productId, sourcePageUrl, partnerId } = event;

  if (isGtagLoaded()) {
    window.gtag!('event', 'affiliate_click', {
      product_id: productId,
      source_page: sourcePageUrl,
      partner_id: partnerId,
    });
  }

  if (isPostHogLoaded()) {
    window.posthog!.capture('affiliate_click', {
      product_id: productId,
      source_page: sourcePageUrl,
      partner_id: partnerId,
    });
  }

  if (isFbqLoaded()) {
    window.fbq!('trackCustom', 'AffiliateClick', {
      product_id: productId,
      source_page: sourcePageUrl,
      partner_id: partnerId,
    });
  }
}

/**
 * Fires a conversion event when a parent signs up for the newsletter.
 * Sends to GA4, PostHog, and Meta Pixel.
 *
 * Validates: Requirements 10.3, 10.4
 */
export function trackNewsletterSignup(event: NewsletterSignupEvent): void {
  const { ageRange } = event;

  if (isGtagLoaded()) {
    window.gtag!('event', 'newsletter_signup', {
      age_range: ageRange,
    });
  }

  if (isPostHogLoaded()) {
    window.posthog!.capture('newsletter_signup', {
      age_range: ageRange,
    });
  }

  if (isFbqLoaded()) {
    window.fbq!('trackCustom', 'NewsletterSignup', {
      age_range: ageRange,
    });
  }
}

// ─── Product analytics events (PostHog) ────────────────────────────────────────

/**
 * Tracks when a parent views a toy review page.
 *
 * Validates: Requirements 10.2
 */
export function trackReviewView(event: ReviewViewEvent): void {
  if (isPostHogLoaded()) {
    window.posthog!.capture('review_view', {
      review_slug: event.reviewSlug,
      product_name: event.productName,
      category: event.category,
    });
  }
}

/**
 * Tracks when a parent performs a search query.
 *
 * Validates: Requirements 10.2
 */
export function trackSearchQuery(event: SearchQueryEvent): void {
  if (isPostHogLoaded()) {
    window.posthog!.capture('search_query', {
      query: event.query,
      results_count: event.resultsCount,
    });
  }
}

/**
 * Tracks when a parent uses a filter (category, age range, etc.).
 *
 * Validates: Requirements 10.2
 */
export function trackFilterUsage(event: FilterUsageEvent): void {
  if (isPostHogLoaded()) {
    window.posthog!.capture('filter_usage', {
      filter_type: event.filterType,
      filter_value: event.filterValue,
      page_url: event.pageUrl,
    });
  }
}
