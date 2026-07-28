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
    expect(text.toLowerCase()).toMatch(/not performed physical small-parts testing/);
  });

  it("preserves the published measurement rather than deleting information", () => {
    const { text } = qualifyClaimText(LIVE);
    expect(text).toContain("2.5 inches");
  });

  it("produces text containing no prohibited claims", () => {
    const { text } = qualifyClaimText(LIVE);
    expect(findProhibitedClaims(text)).toEqual([]);
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
    expect(text.toLowerCase()).toContain("has not verified by testing");
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
