/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StickyBuyBar } from "./StickyBuyBar";

describe("StickyBuyBar component", () => {
  const props = {
    productName: "Melissa & Doug Wooden Blocks",
    url: "https://www.amazon.com/dp/B00005RDV9",
    tag: "safenest-20",
    safetyScore: 92,
  };

  it("mounts without error and renders the product name", () => {
    const html = renderToStaticMarkup(<StickyBuyBar {...props} />);
    expect(html).toContain("Melissa &amp; Doug Wooden Blocks");
  });

  it("labels the score as editorial rather than as a safety verdict", () => {
    // "Safety Score 92/100" read as a measured safety result. The bar now names
    // it for what it is: SafeNest's editorial score.
    const html = renderToStaticMarkup(<StickyBuyBar {...props} />);
    expect(html).toContain("Editorial score 92/100");
    expect(html).not.toContain("Safety Score");
  });

  it("shows no score at all when the evidence is insufficient", () => {
    // A persistent CTA must not surface a number the review body withheld.
    const html = renderToStaticMarkup(
      <StickyBuyBar {...props} confidence="insufficient" />
    );
    expect(html).toContain("Evidence insufficient for a score");
    // Matched as "N/100" so SVG path coordinates containing the digits are not
    // mistaken for a rendered score.
    expect(html).not.toMatch(/\d+\/100/);
    expect(html).not.toContain("Editorial score");
  });

  it("contains a buy link whose href includes the affiliate tag exactly once", () => {
    const html = renderToStaticMarkup(<StickyBuyBar {...props} />);
    expect(html).toContain(
      'href="https://www.amazon.com/dp/B00005RDV9?tag=safenest-20"'
    );
    // The tag marker appears exactly once in the rendered href.
    const occurrences = html.split("tag=safenest-20").length - 1;
    expect(occurrences).toBe(1);
  });

  it("renders the BuyButton with the correct rel/target affiliate attributes", () => {
    const html = renderToStaticMarkup(<StickyBuyBar {...props} />);
    expect(html).toContain('rel="nofollow sponsored noopener"');
    expect(html).toContain('target="_blank"');
  });

  it("uses the specified merchant CTA, not a generic 'Buy'", () => {
    // A standalone "Buy" is a generic CTA with no merchant or action named.
    const html = renderToStaticMarkup(<StickyBuyBar {...props} />);
    expect(html).toContain("Check price at Amazon");
    expect(html).not.toMatch(/>Buy</);
  });
});
