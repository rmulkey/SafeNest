import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { isValidAffiliateUrl } from "../link-builder";

/**
 * These tests encode the project's data-integrity rule for affiliate links:
 * a link is only acceptable when it is an absolute http(s) Amazon URL that is
 * either a search URL (`/s?k=`) or a direct product URL (`/dp/` or `/gp/`).
 * Fabricated, empty, relative, or non-Amazon URLs must be rejected so they can
 * never silently become "verified" data.
 */
describe("isValidAffiliateUrl", () => {
  describe("valid Amazon URLs", () => {
    it("accepts a real search URL", () => {
      expect(
        isValidAffiliateUrl("https://www.amazon.com/s?k=wooden+blocks")
      ).toBe(true);
    });

    it("accepts a search URL with an attribution tag", () => {
      expect(
        isValidAffiliateUrl(
          "https://www.amazon.com/s?k=wooden+blocks&tag=safenest-20"
        )
      ).toBe(true);
    });

    it("accepts a direct /dp/ product URL", () => {
      expect(isValidAffiliateUrl("https://www.amazon.com/dp/B07FZ8S74R")).toBe(
        true
      );
    });

    it("accepts a /gp/ product URL", () => {
      expect(
        isValidAffiliateUrl("https://www.amazon.com/gp/product/B07FZ8S74R")
      ).toBe(true);
    });

    it("accepts a product URL with a slug before /dp/", () => {
      expect(
        isValidAffiliateUrl(
          "https://www.amazon.com/Melissa-Doug-Wooden-Blocks/dp/B00005RDV9"
        )
      ).toBe(true);
    });

    it("accepts http (not just https) Amazon URLs", () => {
      expect(isValidAffiliateUrl("http://www.amazon.com/dp/B07FZ8S74R")).toBe(
        true
      );
    });

    it("accepts non-US Amazon domains", () => {
      expect(isValidAffiliateUrl("https://www.amazon.co.uk/dp/B07FZ8S74R")).toBe(
        true
      );
    });
  });

  describe("invalid URLs", () => {
    it("rejects an empty string", () => {
      expect(isValidAffiliateUrl("")).toBe(false);
    });

    it("rejects whitespace-only strings", () => {
      expect(isValidAffiliateUrl("   ")).toBe(false);
    });

    it("rejects relative URLs", () => {
      expect(isValidAffiliateUrl("/dp/B07FZ8S74R")).toBe(false);
      expect(isValidAffiliateUrl("dp/B07FZ8S74R")).toBe(false);
    });

    it("rejects fabricated / non-resolving garbage", () => {
      expect(isValidAffiliateUrl("not a url at all")).toBe(false);
      expect(isValidAffiliateUrl("javascript:alert(1)")).toBe(false);
      expect(isValidAffiliateUrl("ftp://amazon.com/dp/B000")).toBe(false);
    });

    it("rejects an Amazon homepage with no product or search path", () => {
      expect(isValidAffiliateUrl("https://www.amazon.com/")).toBe(false);
    });

    it("rejects an Amazon search URL without the k= query param", () => {
      expect(isValidAffiliateUrl("https://www.amazon.com/s")).toBe(false);
      expect(isValidAffiliateUrl("https://www.amazon.com/s?node=42")).toBe(
        false
      );
    });

    it("rejects non-Amazon hosts even with /dp/ paths", () => {
      expect(isValidAffiliateUrl("https://www.notamazon.com/dp/B000")).toBe(
        false
      );
      expect(
        isValidAffiliateUrl("https://amazon.com.evil.example/dp/B000")
      ).toBe(false);
    });
  });

  // Feature: safenest-toys, the affiliate link guard rejects relative/empty URLs
  it("property: never accepts empty or relative-looking strings", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(""),
          fc.constant("   "),
          fc.string().map((s) => `/${s}`),
          fc.string().map((s) => `./${s}`),
          fc.string().filter((s) => !s.includes("://"))
        ),
        (candidate) => {
          expect(isValidAffiliateUrl(candidate)).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });

  // Feature: safenest-toys, generated Amazon search URLs are always considered valid
  it("property: well-formed Amazon search URLs are always valid", () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1 })
          .filter((s) => s.trim().length > 0),
        (query) => {
          const url = `https://www.amazon.com/s?k=${encodeURIComponent(
            query
          )}&tag=safenest-20`;
          expect(isValidAffiliateUrl(url)).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });
});
