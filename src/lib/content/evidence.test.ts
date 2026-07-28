import { describe, it, expect } from "vitest";
import {
  recallSearchStatement,
  certificationClaimLabel,
  EVIDENCE_LABELS,
  EVIDENCE_EXPLANATIONS,
  NO_LAB_TESTING_NOTICE,
  SCORE_DISCLAIMER,
  findProhibitedClaims,
} from "./evidence";
import { reviewCountLabel, reviewCountFloor } from "./site-stats";

describe("recallSearchStatement", () => {
  it("dates a negative result, because a recall search is only true when it ran", () => {
    const s = recallSearchStatement("2026-07-28T10:00:00Z", false);
    expect(s).toBe("No matching CPSC recall was located as of 2026-07-28.");
  });

  it("dates a positive result and defers to the official notice", () => {
    const s = recallSearchStatement("2026-07-28T10:00:00Z", true);
    expect(s).toMatch(/matching CPSC recall was located as of 2026-07-28/);
    expect(s).toMatch(/official notice/i);
  });

  it("never implies a check happened when none is recorded", () => {
    for (const v of [null, undefined, "", "not-a-date"]) {
      const s = recallSearchStatement(v, false);
      expect(s).toMatch(/no recall search has been recorded/i);
      expect(s).not.toMatch(/was located as of/);
    }
  });

  it("makes no unsupported claim in any output", () => {
    expect(findProhibitedClaims(recallSearchStatement(new Date(), false))).toEqual([]);
    expect(findProhibitedClaims(recallSearchStatement(new Date(), true))).toEqual([]);
    expect(findProhibitedClaims(recallSearchStatement(null, false))).toEqual([]);
  });
});

describe("certificationClaimLabel", () => {
  it("attributes the claim to the manufacturer rather than asserting compliance", () => {
    expect(certificationClaimLabel("ASTM F963")).toBe(
      "Manufacturer reports compliance with ASTM F963"
    );
  });

  it("never produces a prohibited claim", () => {
    for (const cert of ["ASTM F963", "CPSIA", "EN 71", "CPSC"]) {
      expect(findProhibitedClaims(certificationClaimLabel(cert))).toEqual([]);
    }
  });

  it("does not assert the product is certified safe", () => {
    expect(certificationClaimLabel("CPSIA").toLowerCase()).not.toContain("certified safe");
  });
});

describe("standing disclaimers", () => {
  it("states the absence of laboratory testing explicitly", () => {
    expect(NO_LAB_TESTING_NOTICE).toMatch(/not independently laboratory tested/i);
    expect(findProhibitedClaims(NO_LAB_TESTING_NOTICE)).toEqual([]);
  });

  it("frames the score as editorial, not certification or guarantee", () => {
    expect(SCORE_DISCLAIMER).toMatch(/editorial/i);
    expect(SCORE_DISCLAIMER).toMatch(/not a safety certification/i);
    expect(findProhibitedClaims(SCORE_DISCLAIMER)).toEqual([]);
  });

  it("provides a label and explanation for every evidence source", () => {
    const keys = Object.keys(EVIDENCE_LABELS);
    expect(keys.length).toBeGreaterThan(3);
    for (const k of keys) {
      expect(EVIDENCE_LABELS[k as keyof typeof EVIDENCE_LABELS]).toBeTruthy();
      expect(
        EVIDENCE_EXPLANATIONS[k as keyof typeof EVIDENCE_EXPLANATIONS].length
      ).toBeGreaterThan(20);
    }
  });

  it("marks unverified evidence as unconfirmed rather than reassuring", () => {
    expect(EVIDENCE_EXPLANATIONS["unverified"]).toMatch(/unconfirmed/i);
    expect(EVIDENCE_LABELS["manufacturer-reported"]).toMatch(/manufacturer/i);
  });
});

describe("review count claims", () => {
  it("states the exact count with an accurate method label", () => {
    expect(reviewCountLabel(132)).toBe("132 parent-researched reviews");
  });

  it("never labels reviews as expert", () => {
    expect(findProhibitedClaims(reviewCountLabel(132))).toEqual([]);
    expect(reviewCountLabel(132)).not.toMatch(/expert/i);
  });

  it("floors approximate counts so a claim understates rather than overstates", () => {
    expect(reviewCountFloor(132)).toBe(130);
    expect(reviewCountFloor(139)).toBe(130);
    expect(reviewCountFloor(140)).toBe(140);
  });

  it("does not round tiny catalogs up to a misleading figure", () => {
    expect(reviewCountFloor(7)).toBe(7);
  });
});
