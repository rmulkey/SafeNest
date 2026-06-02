/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import fc from "fast-check";
import { ExitIntentModal, shouldTrigger } from "./ExitIntentModal";

describe("shouldTrigger", () => {
  it("returns false when the modal was already shown this session", () => {
    expect(shouldTrigger(true)).toBe(false);
  });

  it("returns true when the modal has not been shown yet", () => {
    expect(shouldTrigger(false)).toBe(true);
  });

  // Feature: safenest-toys, exit-intent modal shows at most once per session
  it("property: is the logical negation of sessionShown", () => {
    fc.assert(
      fc.property(fc.boolean(), (sessionShown) => {
        expect(shouldTrigger(sessionShown)).toBe(!sessionShown);
      }),
      { numRuns: 200 }
    );
  });
});

describe("ExitIntentModal component", () => {
  it("renders nothing initially (not open until an exit-intent triggers)", () => {
    // On initial render `open` is false and effects have not run, so the
    // component returns null and produces no markup.
    const html = renderToStaticMarkup(<ExitIntentModal />);
    expect(html).toBe("");
  });
});
