import { describe, it, expect } from "vitest";
import {
  qualifyClaimText,
  qualifyClaimList,
  QUALIFICATION_RULES,
} from "./qualify-claims";
import { findProhibitedClaims } from "./evidence";

describe("qualifyClaimText — the exact live Green Toys string", () => {
  const LIVE =
    "All cups are large diameter (2.5 inches+). No choking hazard. Safe for 6m+.";

  it("removes the absolute 'No choking hazard' verdict", () => {
    const { text } = qualifyClaimText(LIVE);
    expect(text.toLowerCase()).not.toContain("no choking hazard");
  });

  it("removes the absolute 'Safe for 6m+' claim", () => {
    const { text } = qualifyClaimText(LIVE);
    expect(text.toLowerCase()).not.toContain("safe for 6m");
  });

  it("attributes the age guidance to the manufacturer", () => {
    const { text } = qualifyClaimText(LIVE);
    expect(text.toLowerCase()).toContain(
      "manufacturer labels this product for ages 6 months and older"
    );
  });

  it("discloses that SafeNest has not performed small-parts testing", () => {
    const { text } = qualifyClaimText(LIVE);
    expect(text.toLowerCase()).toMatch(
      /has not physically measured the product or performed small-parts testing/
    );
  });

  it("retains the published measurement but attributes it", () => {
    const { text } = qualifyClaimText(LIVE);
    expect(text).toContain("2.5 inches");
    expect(text.toLowerCase()).toContain("manufacturer or retailer reports");
    // Never presented as something SafeNest measured.
    expect(text.toLowerCase()).not.toMatch(/we measured|safenest measured/);
  });

  it("produces text containing no prohibited claims", () => {
    const { text } = qualifyClaimText(LIVE);
    expect(findProhibitedClaims(text)).toEqual([]);
  });
});

describe("qualifyClaimText — grammar (regression for the run-on shipped to production)", () => {
  const LIVE =
    "All cups are large diameter (2.5 inches+). No choking hazard. Safe for 6m+.";

  it("does not glue two clauses together without punctuation", () => {
    // Production rendered: "...has not performed physical small-parts testing
    // the manufacturer labels this product for ages 6 months and older."
    const { text } = qualifyClaimText(LIVE);
    expect(text).not.toMatch(/testing the manufacturer/i);
    expect(text).not.toMatch(/\btesting\s+the\b/i);
  });

  it("produces only well-formed sentences", () => {
    const { text } = qualifyClaimText(LIVE);
    const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
    for (const s of sentences) {
      // Each sentence starts with a capital (or digit) and ends with a stop.
      expect(s, `bad sentence: ${s}`).toMatch(/^[A-Z0-9"'(]/);
      expect(s, `bad sentence: ${s}`).toMatch(/[.!?]$/);
      // No lowercase sentence starts, which is the run-on signature.
      expect(s).not.toMatch(/^[a-z]/);
    }
  });

  it("keeps each qualification as its own sentence", () => {
    const { text } = qualifyClaimText(LIVE);
    expect(text).toContain("The manufacturer labels this product for ages 6 months and older.");
    expect(text).toContain("SafeNest has not physically measured the product or performed small-parts testing.");
  });

  it("never emits a doubled or orphaned full stop", () => {
    for (const input of [
      LIVE,
      "Completely safe. Non-toxic.",
      "No small parts. Safe from birth.",
      "Guaranteed safe.",
    ]) {
      const { text } = qualifyClaimText(input);
      expect(text).not.toMatch(/\.\s*\./);
      expect(text).not.toMatch(/^\s*\./);
    }
  });

  it("drops a sentence entirely when its only content was an unsupportable absolute", () => {
    const { text } = qualifyClaimText("Guaranteed safe.");
    expect(text).toBe("");
  });

  it("keeps surrounding content when a removal leaves real information", () => {
    const { text } = qualifyClaimText("Solid maple construction, completely safe.");
    expect(text.toLowerCase()).toContain("solid maple construction");
    expect(text.toLowerCase()).not.toContain("completely safe");
    expect(text).toMatch(/[.!?]$/);
  });
});

describe("qualifyClaimText — absolute safety verdicts", () => {
  it("attributes 'safe from birth' to the manufacturer", () => {
    const { text } = qualifyClaimText("Soft fabric. Safe from birth.");
    expect(text.toLowerCase()).toContain("manufacturer labels this product for use from birth");
    expect(text.toLowerCase()).not.toMatch(/\bsafe from birth\b/);
  });

  it("attributes year-based age claims", () => {
    const { text } = qualifyClaimText("Safe for 3 years+.");
    expect(text.toLowerCase()).toContain("ages 3 years and older");
  });

  it("deletes absolutes that no attribution can rescue", () => {
    for (const phrase of [
      "This toy is completely safe.",
      "Totally safe for babies.",
      "100% safe construction.",
      "Guaranteed safe materials.",
      "Confirmed safe by us.",
      "Certified safe design.",
    ]) {
      const { text } = qualifyClaimText(phrase);
      expect(text.toLowerCase()).not.toMatch(
        /(completely|totally|100%|guaranteed|confirmed|certified)\s+safe/
      );
      expect(findProhibitedClaims(text)).toEqual([]);
    }
  });

  it("never reports passing a small-parts test", () => {
    const { text } = qualifyClaimText("Passes the small-parts test.");
    expect(text.toLowerCase()).not.toContain("passes the small-parts test");
    expect(text.toLowerCase()).toContain("has not verified this by testing");
  });
});

describe("qualifyClaimText — property claims are attributed", () => {
  it("marks non-toxic as manufacturer-reported", () => {
    const { text } = qualifyClaimText("Made with non-toxic paint.");
    expect(text.toLowerCase()).toContain("manufacturer-reported non-toxic");
  });

  it("marks material composition claims as manufacturer-reported", () => {
    for (const claim of ["BPA-free", "phthalate-free", "lead-free", "PVC-free"]) {
      const { text } = qualifyClaimText(`Built from ${claim} plastic.`);
      expect(text.toLowerCase()).toContain(`manufacturer-reported ${claim.toLowerCase()}`);
    }
  });

  it("does not double-attribute an already-attributed claim", () => {
    const once = qualifyClaimText("Made with non-toxic paint.").text;
    const twice = qualifyClaimText(once).text;
    expect(twice.toLowerCase().match(/manufacturer-reported/g)?.length).toBe(1);
  });

  it("restates 'no small parts' as an information limit", () => {
    const { text } = qualifyClaimText("One-piece build. No small parts.");
    expect(text.toLowerCase()).toContain(
      "no small parts are described in the published product information"
    );
  });
});

describe("qualifyClaimText — safety properties", () => {
  it("leaves already-acceptable text untouched", () => {
    const ok =
      "The manufacturer reports compliance with ASTM F963. Follow the current packaging guidance.";
    const r = qualifyClaimText(ok);
    expect(r.changed).toBe(false);
    expect(r.text).toBe(ok);
  });

  it("handles null, undefined, and empty input without throwing", () => {
    for (const v of [null, undefined, "", "   "]) {
      const r = qualifyClaimText(v as string);
      expect(r.changed).toBe(false);
    }
  });

  it("is deterministic and idempotent on repeated application", () => {
    const input = "All cups 2.5 inches+. No choking hazard. Safe for 6m+. Non-toxic.";
    const once = qualifyClaimText(input).text;
    const twice = qualifyClaimText(once).text;
    const thrice = qualifyClaimText(twice).text;
    expect(twice).toBe(thrice);
    expect(findProhibitedClaims(once)).toEqual([]);
  });

  it("ends with terminal punctuation and no doubled punctuation", () => {
    const { text } = qualifyClaimText("Completely safe. Non-toxic.");
    expect(text).toMatch(/[.!?]$/);
    expect(text).not.toMatch(/\.\s*\./);
  });

  it("reports why each qualification was applied, for auditing", () => {
    const r = qualifyClaimText("No choking hazard. Safe for 6m+.");
    expect(r.changed).toBe(true);
    expect(r.appliedReasons.length).toBeGreaterThanOrEqual(2);
    for (const reason of r.appliedReasons) expect(reason.length).toBeGreaterThan(15);
  });

  it("does not mutate the caller's input", () => {
    const input = "No choking hazard.";
    const copy = String(input);
    qualifyClaimText(input);
    expect(input).toBe(copy);
  });

  it("survives repeated calls despite module-level global regexes", () => {
    // Global regexes carry lastIndex between calls; a leak would make the second
    // call silently skip a rule.
    const a = qualifyClaimText("Safe from birth.").text;
    const b = qualifyClaimText("Safe from birth.").text;
    expect(a).toBe(b);
  });

  it("documents a reason for every rule", () => {
    for (const rule of QUALIFICATION_RULES) {
      expect(rule.reason.length).toBeGreaterThan(15);
    }
  });
});

describe("qualifyClaimList", () => {
  it("qualifies every entry", () => {
    const out = qualifyClaimList(["Non-toxic wood", "BPA-free plastic", "Cotton"]);
    expect(out[0].toLowerCase()).toContain("manufacturer-reported non-toxic");
    expect(out[1].toLowerCase()).toContain("manufacturer-reported bpa-free");
    expect(out[2]).toBe("Cotton");
  });

  it("returns an empty array for non-array input", () => {
    expect(qualifyClaimList(null)).toEqual([]);
    expect(qualifyClaimList(undefined)).toEqual([]);
  });

  it("drops entries emptied by qualification", () => {
    expect(qualifyClaimList(["Completely safe"])).toEqual([]);
  });
});

/**
 * Regression tests for the mid-clause splice bug.
 *
 * These inputs are reconstructed from the text that was live on production
 * review pages, where a full-sentence replacement was substituted into the
 * middle of a clause. The output carried a capitalised word mid-sentence and a
 * ".;" punctuation pair, and it reached the visible page and the Review JSON-LD
 * `reviewBody` on 10 URLs.
 */
describe("qualifyClaimText — clause-level substitution (mid-sentence matches)", () => {
  /** Artifacts that prove a sentence was spliced inside another sentence. */
  function assertNoSpliceArtifacts(text: string) {
    expect(text).not.toMatch(/\.\s*[;,]/); // ".;" or ".,"
    expect(text).not.toMatch(/\.\./); // ".."
    // A capital starting a word mid-sentence, excluding brand-ish all-caps and
    // known proper nouns that legitimately appear (SafeNest, ASTM, BPA...).
    const midSentenceCapital = /[a-z,]\s+(?!SafeNest|ASTM|CPSC|BPA|PVC|EN71)[A-Z][a-z]+/;
    expect(text).not.toMatch(midSentenceCapital);
  }

  const productionStrings = [
    "Steering wheel and buttons are flush-mounted with no small parts; battery compartment is screw-secured. Labeled for ages 6 months and up.",
    "Steering-wheel toy with flush-mounted controls and no small parts; battery compartment screw-secured. Labeled for ages 2 and up.",
    "Wobble-and-roll toy is a single molded piece with soft textured spikes and no small parts; labeled for ages 6 months and up.",
    "Two-in-one toy that suctions to a tray or detaches as a hand rattle. All textured surfaces are molded to the body with no small parts.",
    "Ride-on scooter has no small parts; a low seat and four wheels provide stability. Labeled for ages 1 to 4.",
    "Foot-to-floor ride-on with attached activity features and no small parts; wide wheelbase for stability. Labeled for ages 1 and up.",
  ];

  it.each(productionStrings)(
    "produces grammatical output for: %s",
    (input) => {
      const { text } = qualifyClaimText(input);
      assertNoSpliceArtifacts(text);
      // The qualification must still be present, just in clause form.
      expect(text.toLowerCase()).toContain(
        "no small parts described in the published product information"
      );
    }
  );

  it("uses the sentence form when the phrase starts the sentence", () => {
    const { text } = qualifyClaimText("One-piece build. No small parts.");
    expect(text).toContain(
      "No small parts are described in the published product information."
    );
    assertNoSpliceArtifacts(text);
  });

  it("uses the clause form when the phrase is mid-sentence", () => {
    const { text } = qualifyClaimText("Molded in one piece with no small parts.");
    expect(text).toBe(
      "Molded in one piece with no small parts described in the published product information."
    );
  });

  it("keeps the sentence form after a quote or opening bracket", () => {
    const { text } = qualifyClaimText('"No small parts."');
    expect(text.toLowerCase()).toContain("no small parts are described");
  });

  it("is idempotent for both the sentence and the clause form", () => {
    for (const input of [
      "One-piece build. No small parts.",
      "Molded in one piece with no small parts.",
    ]) {
      const once = qualifyClaimText(input).text;
      const twice = qualifyClaimText(once).text;
      expect(twice).toBe(once);
    }
  });

  it("substitutes clause forms for every rule that can match mid-sentence", () => {
    const cases: Array<[string, string]> = [
      [
        "Large pieces throughout with no choking hazard.",
        "no small-parts concern identified in the published product information",
      ],
      [
        "Soft-bodied doll that is safe from birth.",
        "labeled by the manufacturer for use from birth",
      ],
      [
        "Chunky knob puzzle that is safe for 18m+.",
        "labeled by the manufacturer for ages 18 months and older",
      ],
      [
        "Wooden ride-on that is safe for 3 years+.",
        "labeled by the manufacturer for ages 3 years and older",
      ],
      [
        "Chunky design that passes the small-parts test.",
        "published dimensions that suggest the parts are larger than the small-parts cylinder",
      ],
    ];
    for (const [input, expected] of cases) {
      const { text } = qualifyClaimText(input);
      expect(text.toLowerCase()).toContain(expected.toLowerCase());
      assertNoSpliceArtifacts(text);
    }
  });

  it("expands capture groups in clause forms", () => {
    const { text } = qualifyClaimText("A stacking set that is safe for 9mo+.");
    expect(text).toContain("ages 9 months and older");
    expect(text).not.toContain("$1");
  });

  it("repairs a stray full stop before a weaker mark as a backstop", () => {
    // Directly exercises tidy() through a removal rule, which is the other path
    // that can leave dangling punctuation.
    const { text } = qualifyClaimText("Sturdy build, completely safe, great value.");
    expect(text).not.toMatch(/\.\s*[;,]/);
  });
});
