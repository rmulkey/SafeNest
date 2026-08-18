import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RecallFlag } from "./RecallFlag";

/**
 * RecallFlag currently renders on no page in production: zero of the 138
 * reviews carry hasActiveRecall. That is exactly why it needs tests. The eleven
 * hand-rolled treatments it replaced were all dead paths too, which is how they
 * managed to drift into three different glyphs and five different wordings
 * without anyone noticing — nobody could see them.
 *
 * These assertions are the only thing standing between a future recall and a
 * badge that renders wrong on the day it finally matters.
 */
describe("RecallFlag", () => {
  it("always states the word 'recall' in text, not only in colour", () => {
    const html = renderToStaticMarkup(<RecallFlag />);
    expect(html).toContain("Active recall");
  });

  it("carries an icon that is hidden from assistive tech", () => {
    const html = renderToStaticMarkup(<RecallFlag />);
    // lucide renders an <svg>; it must not be announced, since the text says it.
    expect(html).toContain("<svg");
    expect(html).toMatch(/aria-hidden="true"/);
  });

  it("uses no emoji", () => {
    const html = renderToStaticMarkup(<RecallFlag detail="see the review" />);
    // The treatments this replaced used ⚠️ and ⚠, which screen readers announce
    // as "warning sign" ahead of the label and which render differently per OS.
    expect(html).not.toMatch(/[\u26A0\uFE0F]/);
  });

  it("keeps the AA-passing colour pairing", () => {
    // text-red-800 on bg-red-100 measures 6.80:1. text-red-600 on bg-red-100 —
    // one careless edit away — measures 3.95 and fails.
    const html = renderToStaticMarkup(<RecallFlag />);
    expect(html).toContain("bg-red-100");
    expect(html).toContain("text-red-800");
  });

  it("appends detail after an em dash when given", () => {
    const html = renderToStaticMarkup(<RecallFlag detail="see the review before buying" />);
    expect(html).toContain("Active recall — see the review before buying");
  });

  it("omits the dash entirely when no detail is given", () => {
    const html = renderToStaticMarkup(<RecallFlag />);
    expect(html).not.toContain("—");
  });
});
