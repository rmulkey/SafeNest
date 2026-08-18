import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AffiliateDisclosure,
  AFFILIATE_DISCLOSURE_TEXT,
} from "./AffiliateDisclosure";

/**
 * Twelve different wordings of the affiliate disclosure existed across the
 * codebase, and this component — the obvious home for it — was written and then
 * never imported, so its version was the only one nobody saw.
 *
 * The exact-string test below is deliberately brittle. scripts/verify-review-output.mjs
 * asserts the same sentence against served HTML and cannot import from a .tsx,
 * so this test is what makes the duplication safe: change the wording and this
 * fails, telling you the other place to change. Without it the two drift apart
 * and the audit starts failing for a reason nobody can find.
 */
describe("AffiliateDisclosure", () => {
  it("pins the canonical wording (also asserted in verify-review-output.mjs)", () => {
    expect(AFFILIATE_DISCLOSURE_TEXT).toBe(
      "Some links here are affiliate links. If you buy through one we may earn a commission, at no extra cost to you — it never changes our scores or which toys we include."
    );
  });

  it("discloses the three things the FTC cares about", () => {
    // That the links are affiliate links, that the reader pays no more, and
    // that the money does not buy coverage.
    expect(AFFILIATE_DISCLOSURE_TEXT).toMatch(/affiliate links/i);
    expect(AFFILIATE_DISCLOSURE_TEXT).toMatch(/no extra cost/i);
    expect(AFFILIATE_DISCLOSURE_TEXT).toMatch(/never changes our scores/i);
  });

  it("renders the canonical text", () => {
    const html = renderToStaticMarkup(<AffiliateDisclosure />);
    expect(html).toContain("Some links here are affiliate links");
  });

  it("centres only when asked", () => {
    expect(renderToStaticMarkup(<AffiliateDisclosure />)).not.toContain("text-center");
    expect(renderToStaticMarkup(<AffiliateDisclosure align="center" />)).toContain(
      "text-center"
    );
  });

  it("claims no testing or verification", () => {
    // The disclosure sits beside a buy button; it must not imply the product was
    // examined, which the methodology page says it was not.
    expect(AFFILIATE_DISCLOSURE_TEXT).not.toMatch(/tested|verified|certified/i);
  });
});
