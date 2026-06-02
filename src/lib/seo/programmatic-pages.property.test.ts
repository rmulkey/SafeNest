/**
 * Feature: safenest-toys, Property 10: Programmatic pages require minimum review count
 *
 * Validates: Requirements 4.7
 */
import { describe, it, expect, vi } from "vitest";
import * as fc from "fast-check";

// Mock the Sanity client to avoid needing environment variables
vi.mock("@/lib/sanity/client", () => ({
  sanityClient: { fetch: vi.fn() },
  sanityWriteClient: { fetch: vi.fn() },
  urlForImage: vi.fn(),
}));

import {
  hasEnoughReviews,
  MIN_REVIEWS_FOR_PAGE,
  type ToyReviewSummary,
} from "./programmatic-pages";

/**
 * Generator for a minimal ToyReviewSummary object.
 */
const toyReviewSummaryArb: fc.Arbitrary<ToyReviewSummary> = fc.record({
  _id: fc.uuid(),
  productName: fc.string({ minLength: 1, maxLength: 50 }),
  slug: fc.record({ current: fc.string({ minLength: 1, maxLength: 30 }) }),
  ageRange: fc.record({
    minMonths: fc.integer({ min: 0, max: 36 }),
    maxMonths: fc.integer({ min: 0, max: 72 }),
  }),
  category: fc.option(
    fc.record({
      _id: fc.uuid(),
      title: fc.string({ minLength: 1, maxLength: 30 }),
      slug: fc.record({ current: fc.string({ minLength: 1, maxLength: 20 }) }),
    }),
    { nil: null }
  ),
  safetyScore: fc.integer({ min: 0, max: 100 }),
  developmentScore: fc.integer({ min: 0, max: 100 }),
  materials: fc.array(fc.string({ minLength: 1, maxLength: 20 }), {
    minLength: 1,
    maxLength: 5,
  }),
  hasActiveRecall: fc.boolean(),
});

describe("Property 10: Programmatic pages require minimum review count", () => {
  it("arrays with fewer than MIN_REVIEWS_FOR_PAGE reviews return false (no page generated)", () => {
    fc.assert(
      fc.property(
        fc.array(toyReviewSummaryArb, {
          minLength: 0,
          maxLength: MIN_REVIEWS_FOR_PAGE - 1,
        }),
        (reviews) => {
          expect(hasEnoughReviews(reviews)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("arrays with MIN_REVIEWS_FOR_PAGE or more reviews return true (page generated)", () => {
    fc.assert(
      fc.property(
        fc.array(toyReviewSummaryArb, {
          minLength: MIN_REVIEWS_FOR_PAGE,
          maxLength: 10,
        }),
        (reviews) => {
          expect(hasEnoughReviews(reviews)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
