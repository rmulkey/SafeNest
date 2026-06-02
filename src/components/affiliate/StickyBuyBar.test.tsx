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

  it("renders the safety score", () => {
    const html = renderToStaticMarkup(<StickyBuyBar {...props} />);
    expect(html).toContain("Safety Score 92/100");
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

  it("uses the 'Buy' label for the compact sticky button", () => {
    const html = renderToStaticMarkup(<StickyBuyBar {...props} />);
    expect(html).toContain("Buy");
  });
});
