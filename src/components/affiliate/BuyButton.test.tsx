import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import fc from "fast-check";
import { BuyButton, buildAmazonUrl } from "./BuyButton";

describe("buildAmazonUrl", () => {
  it("appends ?tag= when the url has no query string", () => {
    expect(buildAmazonUrl("https://www.amazon.com/dp/B000", "safenest-20")).toBe(
      "https://www.amazon.com/dp/B000?tag=safenest-20"
    );
  });

  it("appends &tag= when the url already has a query string", () => {
    expect(
      buildAmazonUrl("https://www.amazon.com/s?k=blocks", "safenest-20")
    ).toBe("https://www.amazon.com/s?k=blocks&tag=safenest-20");
  });

  it("uses & when the url ends with a bare ?", () => {
    expect(buildAmazonUrl("https://www.amazon.com/dp/B000?", "tag1")).toBe(
      "https://www.amazon.com/dp/B000?&tag=tag1"
    );
  });

  // Feature: safenest-toys, buildAmazonUrl preserves the original url and adds the tag exactly once
  it("property: result starts with the original url and contains the tag exactly once", () => {
    fc.assert(
      fc.property(
        // urls that contain neither "?" nor "tag=" so the count is unambiguous
        fc
          .webUrl()
          .filter((u) => !u.includes("?") && !u.includes("tag=")),
        // tags that don't themselves contain the "tag=" marker
        fc.string({ minLength: 1 }).filter((t) => !t.includes("tag=")),
        (url, tag) => {
          const result = buildAmazonUrl(url, tag);

          // Starts with the original url, untouched.
          expect(result.startsWith(url)).toBe(true);

          // The "tag=" marker appears exactly once.
          const occurrences = result.split("tag=").length - 1;
          expect(occurrences).toBe(1);

          // The actual tag value is present right after the marker.
          expect(result).toContain(`tag=${tag}`);
        }
      ),
      { numRuns: 200 }
    );
  });

  // Feature: safenest-toys, buildAmazonUrl chooses the correct separator
  it("property: inserts ? when url has no query, & otherwise", () => {
    fc.assert(
      fc.property(
        fc.webUrl(),
        fc.string({ minLength: 1 }),
        (url, tag) => {
          const result = buildAmazonUrl(url, tag);
          const expectedSep = url.includes("?") ? "&" : "?";
          expect(result).toBe(`${url}${expectedSep}tag=${tag}`);
        }
      ),
      { numRuns: 200 }
    );
  });
});

describe("BuyButton component", () => {
  it("renders an <a> with the correct affiliate attributes", () => {
    const html = renderToStaticMarkup(
      <BuyButton url="https://www.amazon.com/dp/B000" tag="safenest-20" />
    );

    expect(html).toContain("<a");
    expect(html).toContain('rel="nofollow sponsored noopener"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain(
      'href="https://www.amazon.com/dp/B000?tag=safenest-20"'
    );
  });

  it("renders the default label", () => {
    const html = renderToStaticMarkup(
      <BuyButton url="https://www.amazon.com/dp/B000" tag="t" />
    );
    expect(html).toContain("Buy on Amazon");
  });

  it("renders a custom label when provided", () => {
    const html = renderToStaticMarkup(
      <BuyButton url="https://www.amazon.com/dp/B000" tag="t" label="Buy" />
    );
    expect(html).toContain("Buy");
    expect(html).not.toContain("Buy on Amazon");
  });

  it("href reflects & separator for urls with an existing query", () => {
    const html = renderToStaticMarkup(
      <BuyButton url="https://www.amazon.com/s?k=blocks" tag="safenest-20" />
    );
    expect(html).toContain(
      'href="https://www.amazon.com/s?k=blocks&amp;tag=safenest-20"'
    );
  });
});
