/**
 * Feature: safenest-toys, Property 6: Alternative product from different brand
 *
 * For any Toy Review, the alternatives list SHALL contain at least one product
 * from a brand different from the primary reviewed product's brand. If this
 * constraint is not met, publication SHALL be prevented.
 *
 * **Validates: Requirements 12.3, 12.6**
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  validateAlternativeBrandDiversity,
  type AlternativeProduct,
  type ReviewBrandDiversityInput,
} from "../validation";

/**
 * Generates a non-empty brand name string.
 */
function brandArbitrary(): fc.Arbitrary<string> {
  return fc
    .string({ minLength: 1, maxLength: 30 })
    .filter((s) => s.trim().length > 0);
}

/**
 * Generates a random alternative product with a given brand.
 */
function alternativeWithBrand(brand: fc.Arbitrary<string>): fc.Arbitrary<AlternativeProduct> {
  return fc.record({
    productId: fc.uuid(),
    productName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
    brand,
  });
}

/**
 * Generates review data where ALL alternatives share the same brand as the primary product.
 * This should FAIL validation.
 */
function reviewWithSameBrandAlternatives(): fc.Arbitrary<ReviewBrandDiversityInput> {
  return brandArbitrary().chain((primaryBrand) =>
    fc
      .array(alternativeWithBrand(fc.constant(primaryBrand)), {
        minLength: 1,
        maxLength: 5,
      })
      .map((alternatives) => ({
        productName: `Test Product ${primaryBrand}`,
        brand: primaryBrand,
        alternatives,
      }))
  );
}

/**
 * Generates review data where at least one alternative has a DIFFERENT brand.
 * This should PASS validation.
 */
function reviewWithDiverseBrandAlternatives(): fc.Arbitrary<ReviewBrandDiversityInput> {
  return fc
    .tuple(brandArbitrary(), brandArbitrary())
    .filter(([a, b]) => a.toLowerCase().trim() !== b.toLowerCase().trim())
    .chain(([primaryBrand, differentBrand]) =>
      fc
        .tuple(
          // At least one alternative from a different brand
          fc.array(alternativeWithBrand(fc.constant(differentBrand)), {
            minLength: 1,
            maxLength: 3,
          }),
          // Zero or more alternatives from the same brand
          fc.array(alternativeWithBrand(fc.constant(primaryBrand)), {
            minLength: 0,
            maxLength: 3,
          })
        )
        .map(([diverseAlts, sameAlts]) => ({
          productName: `Test Product ${primaryBrand}`,
          brand: primaryBrand,
          alternatives: [...diverseAlts, ...sameAlts],
        }))
    );
}

describe("Property 6: Alternative product from different brand", () => {
  it("should reject reviews where all alternatives share the primary brand", async () => {
    await fc.assert(
      fc.asyncProperty(
        reviewWithSameBrandAlternatives(),
        async (review) => {
          const result = validateAlternativeBrandDiversity(review);

          // Validation must fail
          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should accept reviews where at least one alternative is from a different brand", async () => {
    await fc.assert(
      fc.asyncProperty(
        reviewWithDiverseBrandAlternatives(),
        async (review) => {
          const result = validateAlternativeBrandDiversity(review);

          // Validation must pass
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should reject reviews with an empty alternatives list", async () => {
    await fc.assert(
      fc.asyncProperty(brandArbitrary(), async (primaryBrand) => {
        const review: ReviewBrandDiversityInput = {
          productName: "Test Product",
          brand: primaryBrand,
          alternatives: [],
        };

        const result = validateAlternativeBrandDiversity(review);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });
});
