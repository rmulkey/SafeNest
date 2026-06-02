import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { buildAffiliateUrl, isValidAffiliateUrl } from "./link-builder";

describe("buildAffiliateUrl", () => {
  it("sets ?tag= for the amazon partner", () => {
    const result = buildAffiliateUrl(
      "https://www.amazon.com/dp/B000",
      "amazon",
      "safenest-20"
    );
    expect(result).toBe("https://www.amazon.com/dp/B000?tag=safenest-20");
  });

  it("sets ?ref= for a non-amazon partner", () => {
    const result = buildAffiliateUrl(
      "https://brand.example.com/product/123",
      "brand-direct",
      "safenest"
    );
    expect(result).toBe(
      "https://brand.example.com/product/123?ref=safenest"
    );
  });

  it("returns the input unchanged for a malformed URL", () => {
    expect(buildAffiliateUrl("not a url", "amazon", "tag")).toBe("not a url");
    expect(buildAffiliateUrl("", "amazon", "tag")).toBe("");
    expect(buildAffiliateUrl("/relative/path", "amazon", "tag")).toBe(
      "/relative/path"
    );
  });

  it("preserves existing query params (amazon)", () => {
    const result = buildAffiliateUrl(
      "https://www.amazon.com/s?k=blocks&node=42",
      "amazon",
      "safenest-20"
    );
    const url = new URL(result);
    expect(url.searchParams.get("k")).toBe("blocks");
    expect(url.searchParams.get("node")).toBe("42");
    expect(url.searchParams.get("tag")).toBe("safenest-20");
  });

  it("preserves existing query params (non-amazon)", () => {
    const result = buildAffiliateUrl(
      "https://shop.example.com/item?color=red",
      "shop",
      "safenest"
    );
    const url = new URL(result);
    expect(url.searchParams.get("color")).toBe("red");
    expect(url.searchParams.get("ref")).toBe("safenest");
  });

  it("overwrites an existing tag rather than duplicating it", () => {
    const result = buildAffiliateUrl(
      "https://www.amazon.com/dp/B000?tag=old",
      "amazon",
      "new-tag"
    );
    const url = new URL(result);
    expect(url.searchParams.getAll("tag")).toEqual(["new-tag"]);
  });

  // Feature: safenest-toys, buildAffiliateUrl always yields a parseable URL with the right param
  it("property: amazon links carry the tag, others carry the ref", () => {
    fc.assert(
      fc.property(
        fc.webUrl(),
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.boolean(),
        (destinationUrl, affiliateTag, isAmazon) => {
          const partnerId = isAmazon ? "amazon" : "other-partner";
          const result = buildAffiliateUrl(
            destinationUrl,
            partnerId,
            affiliateTag
          );
          const url = new URL(result);
          if (isAmazon) {
            expect(url.searchParams.get("tag")).toBe(affiliateTag);
          } else {
            expect(url.searchParams.get("ref")).toBe(affiliateTag);
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});

describe("isValidAffiliateUrl (re-exported guard, see link-validity.test.ts)", () => {
  it("accepts a real Amazon product URL", () => {
    expect(isValidAffiliateUrl("https://www.amazon.com/dp/B07FZ8S74R")).toBe(
      true
    );
  });

  it("rejects an empty string", () => {
    expect(isValidAffiliateUrl("")).toBe(false);
  });
});
