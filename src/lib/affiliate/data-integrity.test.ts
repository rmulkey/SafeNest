import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  buildAffiliateUrl,
  isFabricatedDpLink,
  isValidAffiliateUrl,
} from "./link-builder";

/**
 * Data-integrity guard tests.
 *
 * These enforce the project's data-integrity rule for affiliate links: direct
 * `/dp/{ASIN}` and `/gp/product/` links carry a concrete product identifier
 * that must be verified to resolve to a live page, so they are treated as the
 * fabricated-link risk. The always-valid safe fallback is an Amazon search URL
 * (`/s?k={query}`), which preserves attribution without inventing an ASIN.
 *
 * This is a pure unit test of the validation helpers — it makes no network
 * calls and does not assert that any specific ASIN resolves.
 */

const AMAZON_TAG = "safeneststore-20";

describe("isFabricatedDpLink", () => {
  describe("flags direct product (fabricated-risk) links", () => {
    it("flags a bare /dp/{ASIN} link", () => {
      expect(isFabricatedDpLink("https://www.amazon.com/dp/B07FZ8S74R")).toBe(
        true
      );
    });

    it("flags a /dp/{ASIN} link with a product slug before it", () => {
      expect(
        isFabricatedDpLink(
          "https://www.amazon.com/Melissa-Doug-Wooden-Blocks/dp/B00005RDV9"
        )
      ).toBe(true);
    });

    it("flags a /gp/product/ link", () => {
      expect(
        isFabricatedDpLink("https://www.amazon.com/gp/product/B07FZ8S74R")
      ).toBe(true);
    });

    it("flags direct product links with a tag already appended", () => {
      expect(
        isFabricatedDpLink(
          "https://www.amazon.com/dp/B07FZ8S74R?tag=safeneststore-20"
        )
      ).toBe(true);
    });

    it("flags direct product links on non-US Amazon domains", () => {
      expect(isFabricatedDpLink("https://www.amazon.co.uk/dp/B07FZ8S74R")).toBe(
        true
      );
    });
  });

  describe("does NOT flag the safe search-URL fallback", () => {
    it("does not flag a plain Amazon search URL", () => {
      expect(
        isFabricatedDpLink("https://www.amazon.com/s?k=wooden+blocks")
      ).toBe(false);
    });

    it("does not flag a search URL with an attribution tag", () => {
      expect(
        isFabricatedDpLink(
          "https://www.amazon.com/s?k=wooden+blocks&tag=safeneststore-20"
        )
      ).toBe(false);
    });
  });

  describe("does NOT flag non-Amazon or malformed input", () => {
    it("does not flag a non-Amazon host even with a /dp/ path", () => {
      expect(isFabricatedDpLink("https://www.notamazon.com/dp/B000")).toBe(
        false
      );
    });

    it("does not flag a look-alike host", () => {
      expect(
        isFabricatedDpLink("https://amazon.com.evil.example/dp/B000")
      ).toBe(false);
    });

    it("does not flag empty or whitespace-only strings", () => {
      expect(isFabricatedDpLink("")).toBe(false);
      expect(isFabricatedDpLink("   ")).toBe(false);
    });

    it("does not flag relative or malformed URLs", () => {
      expect(isFabricatedDpLink("/dp/B07FZ8S74R")).toBe(false);
      expect(isFabricatedDpLink("not a url at all")).toBe(false);
    });

    it("does not flag the Amazon homepage", () => {
      expect(isFabricatedDpLink("https://www.amazon.com/")).toBe(false);
    });
  });
});

describe("search-URL fallback passes the validity guard", () => {
  it("an Amazon search URL is accepted by isValidAffiliateUrl", () => {
    const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(
      "wooden blocks"
    )}`;
    expect(isValidAffiliateUrl(searchUrl)).toBe(true);
  });

  it("a fabricated /dp/ link is flagged AND, while structurally valid, is the risky form the search URL replaces", () => {
    const dpLink = "https://www.amazon.com/dp/FAKEASIN00";
    // It is structurally an Amazon product URL...
    expect(isValidAffiliateUrl(dpLink)).toBe(true);
    // ...but the integrity guard flags it as the fabricated-link risk.
    expect(isFabricatedDpLink(dpLink)).toBe(true);
  });
});

describe("buildAffiliateUrl never doubles the tag", () => {
  it("appends exactly one tag= for a search URL with no existing tag", () => {
    const result = buildAffiliateUrl(
      "https://www.amazon.com/s?k=blocks",
      "amazon",
      AMAZON_TAG
    );
    expect(new URL(result).searchParams.getAll("tag")).toEqual([AMAZON_TAG]);
  });

  it("overwrites an existing tag instead of appending a second one", () => {
    const result = buildAffiliateUrl(
      "https://www.amazon.com/s?k=blocks&tag=old-tag",
      "amazon",
      AMAZON_TAG
    );
    expect(new URL(result).searchParams.getAll("tag")).toEqual([AMAZON_TAG]);
  });

  it("rejects (returns unchanged) empty and malformed URLs", () => {
    expect(buildAffiliateUrl("", "amazon", AMAZON_TAG)).toBe("");
    expect(buildAffiliateUrl("not a url", "amazon", AMAZON_TAG)).toBe(
      "not a url"
    );
  });
});

describe("property: search URL construction always yields a parseable URL with exactly one tag=", () => {
  it("buildAffiliateUrl on a generated Amazon search URL is parseable and single-tagged", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        (query) => {
          const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(
            query
          )}`;
          const result = buildAffiliateUrl(searchUrl, "amazon", AMAZON_TAG);

          // The result must always be a parseable absolute URL.
          const parsed = new URL(result);

          // Exactly one tag= parameter, set to our tag.
          expect(parsed.searchParams.getAll("tag")).toEqual([AMAZON_TAG]);

          // The fallback search URL must satisfy the affiliate guard.
          expect(isValidAffiliateUrl(result)).toBe(true);

          // And it must never be classified as a fabricated /dp/ link.
          expect(isFabricatedDpLink(result)).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("re-tagging an already-tagged search URL stays single-tagged", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.string({ minLength: 1 }).filter((s) => /^[a-zA-Z0-9-]+$/.test(s)),
        (query, existingTag) => {
          const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(
            query
          )}&tag=${existingTag}`;
          const result = buildAffiliateUrl(searchUrl, "amazon", AMAZON_TAG);
          const parsed = new URL(result);
          expect(parsed.searchParams.getAll("tag")).toEqual([AMAZON_TAG]);
        }
      ),
      { numRuns: 200 }
    );
  });
});
