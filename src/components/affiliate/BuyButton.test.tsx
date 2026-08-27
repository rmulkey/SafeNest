import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import fc from "fast-check";
import {
  BuyButton,
  buildAmazonUrl,
  BUY_CTA_LABEL,
  AmazonGlyphSprite,
  AMAZON_GLYPH_ID,
} from "./BuyButton";

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

  /**
   * The label is pinned here on purpose.
   *
   * Six wordings had spread across ten call sites, so the canonical one is now
   * the component default and no call site passes a label at all. This test and
   * scripts/verify-review-output.mjs assert the same string; the script cannot
   * import from a .tsx, so this is what stops the two drifting apart.
   */
  it("pins the canonical default label", () => {
    expect(BUY_CTA_LABEL).toBe("Check price at Amazon");
    const html = renderToStaticMarkup(
      <BuyButton url="https://www.amazon.com/dp/B000" tag="t" />
    );
    expect(html).toContain(BUY_CTA_LABEL);
  });

  it("does not promise a purchase, since most links land on a search page", () => {
    // 94 of 138 stored links are /s?k= search URLs. "Buy on Amazon" would
    // overstate what the click delivers.
    expect(BUY_CTA_LABEL).not.toMatch(/\bbuy\b/i);
    expect(BUY_CTA_LABEL).toMatch(/check/i);
  });

  it("renders a custom label when one is explicitly passed", () => {
    const html = renderToStaticMarkup(
      <BuyButton url="https://www.amazon.com/dp/B000" tag="t" label="Compare" />
    );
    expect(html).toContain("Compare");
    expect(html).not.toContain(BUY_CTA_LABEL);
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

/**
 * The Amazon glyph is defined once per document and referenced, not inlined.
 *
 * Measured 2026-08-27: inlining it put 1,220 bytes of path data into every
 * BuyButton. /guides/best-sensory-toys-babies was 308 KB of HTML for 5.5 KB of
 * text, and 40 KB of that was 33 identical copies of this glyph — 12.3% of the
 * page. The heavy listings are worse: /best-toys/1-2-years is 1,260 KB with 87
 * cards, /reviews 1,080 KB with 138. That repetition, not thin copy, is what
 * Semrush reports as "low text to HTML ratio" across 228 pages.
 */
describe("AmazonGlyph — sprite reference, not inline path data", () => {
  it("emits a <use> reference and no path data", () => {
    const html = renderToStaticMarkup(
      <BuyButton url="https://www.amazon.com/dp/B000" tag="safenest-20" />
    );
    expect(html).toContain(`<use href="#${AMAZON_GLYPH_ID}"`);
    // The 1,220-byte payload must not be in the button.
    expect(html).not.toContain("M13.958 10.09");
  });

  it("stays small when many buttons render, which is the point", () => {
    const one = renderToStaticMarkup(
      <BuyButton url="https://www.amazon.com/dp/B000" tag="t" />
    );
    const thirtyThree = renderToStaticMarkup(
      <>
        {Array.from({ length: 33 }, (_, i) => (
          <BuyButton key={i} url="https://www.amazon.com/dp/B000" tag="t" />
        ))}
      </>
    );
    // Inlining made 33 buttons cost 33x the glyph. Referencing keeps the
    // per-button growth far below the 1,220-byte payload it replaced.
    const perButton = (thirtyThree.length - one.length) / 32;
    expect(perButton).toBeLessThan(1220);
    expect(thirtyThree).not.toContain("M13.958 10.09");
  });

  it("defines the glyph exactly once in the sprite", () => {
    const sprite = renderToStaticMarkup(<AmazonGlyphSprite />);
    expect(sprite).toContain(`id="${AMAZON_GLYPH_ID}"`);
    expect(sprite).toContain("M13.958 10.09");
    expect(sprite.match(/M13\.958 10\.09/g)).toHaveLength(1);
  });

  it("keeps the sprite out of the accessibility tree and the tab order", () => {
    // aria-hidden alone does not remove SVG from the tab order in older engines.
    const sprite = renderToStaticMarkup(<AmazonGlyphSprite />);
    expect(sprite).toContain('aria-hidden="true"');
    expect(sprite).toContain('focusable="false"');
  });

  it("keeps the in-button glyph hidden from assistive tech", () => {
    const html = renderToStaticMarkup(
      <BuyButton url="https://www.amazon.com/dp/B000" tag="t" />
    );
    const svg = html.slice(html.indexOf("<svg"), html.indexOf("</svg>"));
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).toContain('focusable="false"');
  });
});
