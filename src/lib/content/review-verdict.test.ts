import { describe, it, expect } from "vitest";
import {
  editorialVerdict,
  SCORE_EVIDENCE_DISCLAIMER,
} from "./review-verdict";

describe("editorialVerdict", () => {
  it("states the score with its confidence for High confidence", () => {
    expect(editorialVerdict({ score: 95, confidence: "high" }).text).toBe(
      "SafeNest editorial safety assessment: 95/100 \u2014 High evidence confidence."
    );
  });

  it("states the score with its confidence for Medium confidence", () => {
    expect(editorialVerdict({ score: 95, confidence: "medium" }).text).toBe(
      "SafeNest editorial safety assessment: 95/100 \u2014 Medium evidence confidence."
    );
  });

  it("adds a cautionary sentence for Low confidence", () => {
    const v = editorialVerdict({ score: 85, confidence: "low" });
    expect(v.text).toBe(
      "SafeNest editorial safety assessment: 85/100 \u2014 Low evidence confidence. " +
        "Interpret the score cautiously because important claims have limited supporting evidence."
    );
    expect(v.showsScore).toBe(true);
  });

  it("never publishes a precise score when evidence is insufficient", () => {
    const v = editorialVerdict({ score: 42, confidence: "insufficient" });
    expect(v.showsScore).toBe(false);
    expect(v.text).toBe(
      "SafeNest could not produce a sufficiently supported editorial safety assessment for this product."
    );
    // The stored number must not leak into the copy.
    expect(v.text).not.toMatch(/\d/);
  });

  it("suppresses the score when none is available, whatever the confidence", () => {
    for (const confidence of ["high", "medium", "low"] as const) {
      const v = editorialVerdict({ score: null, confidence });
      expect(v.showsScore).toBe(false);
      expect(v.text).not.toMatch(/\d/);
    }
    expect(editorialVerdict({ score: undefined, confidence: "high" }).showsScore).toBe(false);
    expect(editorialVerdict({ score: NaN, confidence: "high" }).showsScore).toBe(false);
  });

  it("never uses endorsement language", () => {
    const banned = /safety pick|safest|approved|recommended as safe|our verdict/i;
    for (const confidence of ["high", "medium", "low", "insufficient"] as const) {
      expect(editorialVerdict({ score: 90, confidence }).text).not.toMatch(banned);
    }
  });

  it("rounds rather than printing a fractional score", () => {
    expect(editorialVerdict({ score: 84.6, confidence: "high" }).text).toContain("85/100");
  });
});

describe("SCORE_EVIDENCE_DISCLAIMER", () => {
  it("matches the approved wording exactly", () => {
    expect(SCORE_EVIDENCE_DISCLAIMER).toBe(
      "SafeNest scores are editorial research tools based on publicly available information. " +
        "Evidence confidence describes how well that information is supported. " +
        "Neither is a certification, guarantee, endorsement or substitute for manufacturer " +
        "instructions and official recall notices."
    );
  });

  it("disclaims certification, guarantee and endorsement", () => {
    for (const word of ["certification", "guarantee", "endorsement"]) {
      expect(SCORE_EVIDENCE_DISCLAIMER.toLowerCase()).toContain(word);
    }
  });
});
