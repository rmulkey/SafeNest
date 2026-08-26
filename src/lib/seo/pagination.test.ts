import { describe, it, expect } from "vitest";
import {
  parsePageParam,
  pageBounds,
  countPages,
  isPageOutOfRange,
  buildPageHref,
} from "./pagination";

/**
 * These tests are written from what production actually served before the fix.
 * `/recalls?page=10`, `?page=99` and `?page=99999` all returned HTTP 200 with the
 * "No recalls are currently on file." empty state, and
 * `/categories/outdoor-toys?page=50` did the same with its own empty state. That
 * is a soft 404, and because `?page=` took any integer it made the crawl space
 * unbounded on a site where 143 of 221 real URLs have never been crawled.
 */

describe("parsePageParam", () => {
  it("reads a normal page number", () => {
    expect(parsePageParam("3")).toBe(3);
  });

  it("defaults to 1 for absent or empty input", () => {
    expect(parsePageParam(undefined)).toBe(1);
    expect(parsePageParam(null)).toBe(1);
    expect(parsePageParam("")).toBe(1);
  });

  it("defaults to 1 for the forgiving cases production already accepted", () => {
    // Preserved deliberately: these render page 1 and canonicalise to the bare
    // path, so they cost a crawl but cannot rank or mislead.
    expect(parsePageParam("0")).toBe(1);
    expect(parsePageParam("-1")).toBe(1);
    expect(parsePageParam("abc")).toBe(1);
  });

  it("truncates a fractional page rather than passing it through", () => {
    // Number("2.7") is 2.7, which produced a fractional GROQ slice offset.
    expect(parsePageParam("2.7")).toBe(2);
    expect(parsePageParam("1.999")).toBe(1);
  });

  it("rejects Infinity, which Number() produces from large exponents", () => {
    expect(parsePageParam("1e999")).toBe(1);
    expect(parsePageParam("Infinity")).toBe(1);
    expect(parsePageParam("-Infinity")).toBe(1);
  });

  it("still accepts a large but finite page, leaving the range check to decide", () => {
    expect(parsePageParam("99999")).toBe(99999);
  });
});

describe("pageBounds", () => {
  it("produces zero-based slice bounds", () => {
    expect(pageBounds(1, 25)).toEqual({ start: 0, end: 25 });
    expect(pageBounds(2, 25)).toEqual({ start: 25, end: 50 });
    expect(pageBounds(4, 20)).toEqual({ start: 60, end: 80 });
  });
});

describe("countPages", () => {
  it("divides and rounds up", () => {
    expect(countPages(50, 25)).toBe(2);
    expect(countPages(51, 25)).toBe(3);
  });

  it("floors at 1 for an empty collection", () => {
    // /categories and /blog used a bare Math.ceil, giving 0 here. An
    // out-of-range check built on that would 404 page 1 and hide the empty state.
    expect(countPages(0, 25)).toBe(1);
    expect(countPages(-5, 25)).toBe(1);
    expect(countPages(Number.NaN, 25)).toBe(1);
  });
});

describe("isPageOutOfRange", () => {
  it("accepts pages that exist", () => {
    expect(isPageOutOfRange(1, 50, 25)).toBe(false);
    expect(isPageOutOfRange(2, 50, 25)).toBe(false);
  });

  it("rejects the exact production cases that returned 200", () => {
    // /recalls had 9 pages of 25.
    expect(isPageOutOfRange(10, 225, 25)).toBe(true);
    expect(isPageOutOfRange(99, 225, 25)).toBe(true);
    expect(isPageOutOfRange(99999, 225, 25)).toBe(true);
    // /categories/outdoor-toys?page=50 against a single page of reviews.
    expect(isPageOutOfRange(50, 3, 20)).toBe(true);
  });

  it("never rejects page 1, so an empty listing keeps its empty state", () => {
    expect(isPageOutOfRange(1, 0, 25)).toBe(false);
  });

  it("rejects page 2 of an empty listing", () => {
    expect(isPageOutOfRange(2, 0, 25)).toBe(true);
  });

  it("treats the last real page as in range and the next as out", () => {
    expect(isPageOutOfRange(9, 225, 25)).toBe(false);
    expect(isPageOutOfRange(10, 225, 25)).toBe(true);
  });
});

describe("buildPageHref", () => {
  it("omits the param for page 1 so the duplicate URL is never linked", () => {
    // /recalls and /recalls?page=1 served byte-identical HTML, and ?page=1
    // canonicalised to /recalls, but the Previous link on page 2 pointed at it,
    // so it was discoverable and cost a crawl.
    expect(buildPageHref("/recalls", 1)).toBe("/recalls");
    expect(buildPageHref("/blog", 1)).toBe("/blog");
    expect(buildPageHref("/categories/outdoor-toys", 1)).toBe(
      "/categories/outdoor-toys"
    );
  });

  it("includes the param for later pages", () => {
    expect(buildPageHref("/blog", 2)).toBe("/blog?page=2");
    expect(buildPageHref("/recalls", 9)).toBe("/recalls?page=9");
  });

  it("preserves a search filter across pages", () => {
    expect(buildPageHref("/recalls", 2, { q: "magnets" })).toBe(
      "/recalls?q=magnets&page=2"
    );
  });

  it("keeps the filter but drops page on the way back to page 1", () => {
    expect(buildPageHref("/recalls", 1, { q: "magnets" })).toBe(
      "/recalls?q=magnets"
    );
  });

  it("ignores empty and undefined extra params", () => {
    expect(buildPageHref("/recalls", 2, { q: "" })).toBe("/recalls?page=2");
    expect(buildPageHref("/recalls", 2, { q: undefined })).toBe("/recalls?page=2");
  });

  it("encodes values that need it", () => {
    expect(buildPageHref("/recalls", 2, { q: "button batteries" })).toBe(
      "/recalls?q=button+batteries&page=2"
    );
  });
});
