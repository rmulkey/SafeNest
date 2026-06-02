/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  trackAffiliateClick,
  trackNewsletterSignup,
  trackReviewView,
  trackSearchQuery,
  trackFilterUsage,
} from './events';

describe('Analytics event helpers', () => {
  let gtagMock: ReturnType<typeof vi.fn>;
  let posthogCaptureMock: ReturnType<typeof vi.fn>;
  let fbqMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    gtagMock = vi.fn();
    posthogCaptureMock = vi.fn();
    fbqMock = vi.fn();

    // Set up global mocks
    window.gtag = gtagMock as unknown as typeof window.gtag;
    window.posthog = { capture: posthogCaptureMock as unknown as (event: string, properties?: Record<string, unknown>) => void };
    window.fbq = fbqMock as unknown as typeof window.fbq;
  });

  describe('trackAffiliateClick', () => {
    const event = {
      productId: 'toy-123',
      sourcePageUrl: '/reviews/toy-123',
      partnerId: 'amazon',
    };

    it('fires conversion event to GA4', () => {
      trackAffiliateClick(event);
      expect(gtagMock).toHaveBeenCalledWith('event', 'affiliate_click', {
        product_id: 'toy-123',
        source_page: '/reviews/toy-123',
        partner_id: 'amazon',
      });
    });

    it('fires conversion event to PostHog', () => {
      trackAffiliateClick(event);
      expect(posthogCaptureMock).toHaveBeenCalledWith('affiliate_click', {
        product_id: 'toy-123',
        source_page: '/reviews/toy-123',
        partner_id: 'amazon',
      });
    });

    it('fires conversion event to Meta Pixel', () => {
      trackAffiliateClick(event);
      expect(fbqMock).toHaveBeenCalledWith('trackCustom', 'AffiliateClick', {
        product_id: 'toy-123',
        source_page: '/reviews/toy-123',
        partner_id: 'amazon',
      });
    });

    it('does not throw when scripts are not loaded', () => {
      window.gtag = undefined;
      window.posthog = undefined;
      window.fbq = undefined;

      expect(() => trackAffiliateClick(event)).not.toThrow();
    });

    it('fires all three events synchronously (within 500ms budget)', () => {
      const start = performance.now();
      trackAffiliateClick(event);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(500);
      expect(gtagMock).toHaveBeenCalledTimes(1);
      expect(posthogCaptureMock).toHaveBeenCalledTimes(1);
      expect(fbqMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('trackNewsletterSignup', () => {
    const event = { email: 'parent@example.com', ageRange: '0-2' };

    it('fires conversion event to GA4', () => {
      trackNewsletterSignup(event);
      expect(gtagMock).toHaveBeenCalledWith('event', 'newsletter_signup', {
        age_range: '0-2',
      });
    });

    it('fires conversion event to PostHog', () => {
      trackNewsletterSignup(event);
      expect(posthogCaptureMock).toHaveBeenCalledWith('newsletter_signup', {
        age_range: '0-2',
      });
    });

    it('fires conversion event to Meta Pixel', () => {
      trackNewsletterSignup(event);
      expect(fbqMock).toHaveBeenCalledWith('trackCustom', 'NewsletterSignup', {
        age_range: '0-2',
      });
    });

    it('does not throw when scripts are not loaded', () => {
      window.gtag = undefined;
      window.posthog = undefined;
      window.fbq = undefined;

      expect(() => trackNewsletterSignup(event)).not.toThrow();
    });
  });

  describe('trackReviewView', () => {
    it('fires event to PostHog with review details', () => {
      trackReviewView({
        reviewSlug: 'wooden-blocks',
        productName: 'Wooden Blocks Set',
        category: 'building',
      });

      expect(posthogCaptureMock).toHaveBeenCalledWith('review_view', {
        review_slug: 'wooden-blocks',
        product_name: 'Wooden Blocks Set',
        category: 'building',
      });
    });

    it('does not fire to GA4 or Meta Pixel', () => {
      trackReviewView({
        reviewSlug: 'wooden-blocks',
        productName: 'Wooden Blocks Set',
      });

      expect(gtagMock).not.toHaveBeenCalled();
      expect(fbqMock).not.toHaveBeenCalled();
    });

    it('does not throw when PostHog is not loaded', () => {
      window.posthog = undefined;
      expect(() =>
        trackReviewView({ reviewSlug: 'x', productName: 'X' })
      ).not.toThrow();
    });
  });

  describe('trackSearchQuery', () => {
    it('fires event to PostHog with query and results count', () => {
      trackSearchQuery({ query: 'safe blocks', resultsCount: 12 });

      expect(posthogCaptureMock).toHaveBeenCalledWith('search_query', {
        query: 'safe blocks',
        results_count: 12,
      });
    });

    it('does not throw when PostHog is not loaded', () => {
      window.posthog = undefined;
      expect(() =>
        trackSearchQuery({ query: 'test', resultsCount: 0 })
      ).not.toThrow();
    });
  });

  describe('trackFilterUsage', () => {
    it('fires event to PostHog with filter details', () => {
      trackFilterUsage({
        filterType: 'age_range',
        filterValue: '0-2',
        pageUrl: '/categories/building',
      });

      expect(posthogCaptureMock).toHaveBeenCalledWith('filter_usage', {
        filter_type: 'age_range',
        filter_value: '0-2',
        page_url: '/categories/building',
      });
    });

    it('does not throw when PostHog is not loaded', () => {
      window.posthog = undefined;
      expect(() =>
        trackFilterUsage({
          filterType: 'category',
          filterValue: 'outdoor',
          pageUrl: '/',
        })
      ).not.toThrow();
    });
  });
});
