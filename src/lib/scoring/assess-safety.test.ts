import { describe, it, expect } from "vitest";
import { assessSafety, SAFETY_FACTORS } from "./assess-safety";
import { computeSafetyScore } from "./safety-score";
import {
  capFactorScore,
  computeEvidenceConfidence,
  parseEvidenceStatus,
  EVIDENCE_SCORE_CAP,
  EVIDENCE_STATUS_LABELS,
  LEGACY_DEFAULT_STATUS,
  type EvidenceStatus,
} from "./evidence-status";

const HIGH_FACTORS = {
  materialSafety: 95,
  chokingRisk: 95,
  recallHistory: 95,
  certificationPresence: 95,
};

const allStatuses = Object.keys(EVIDENCE_STATUS_LABELS) as EvidenceStatus[];

describe("capFactorScore", () => {
  it("never raises a score", () => {
    for (const s of allStatuses) {
      expect(capFactorScore(40, s)).toBeLessThanOrEqual(40);
    }
  });

  it("caps unverified manufacturer claims below full marks", () => {
    expect(capFactorScore(100, "manufacturer_reported")).toBe(85);
    expect(capFactorScore(100, "retailer_reported")).toBe(75);
    expect(capFactorScore(100, "secondary_source")).toBe(70);
  });

  it("caps missing evidence so absence cannot look like safety", () => {
    expect(capFactorScore(100, "no_evidence_found")).toBe(50);
  });

  it("caps conflicting information", () => {
    expect(capFactorScore(100, "conflicting_information")).toBe(60);
  });

  it("allows full marks only with accessible documentation", () => {
    expect(capFactorScore(100, "verified_documentation")).toBe(100);
  });

  it("clamps out-of-range input", () => {
    expect(capFactorScore(150, "verified_documentation")).toBe(100);
    expect(capFactorScore(-20, "verified_documentation")).toBe(0);
  });
});

describe("computeEvidenceConfidence", () => {
  it("rates fully documented evidence as high", () => {
    const { confidence } = computeEvidenceConfidence(
      Array(4).fill("verified_documentation")
    );
    expect(confidence).toBe("high");
  });

  it("rates unverified manufacturer claims as medium, not high", () => {
    const { confidence } = computeEvidenceConfidence(
      Array(4).fill("manufacturer_reported")
    );
    expect(confidence).toBe("medium");
  });

  it("rates thin or second-hand evidence as low", () => {
    expect(
      computeEvidenceConfidence(Array(4).fill("secondary_source")).confidence
    ).toBe("low");
  });

  it("rates a total absence of evidence as insufficient", () => {
    expect(
      computeEvidenceConfidence(Array(4).fill("no_evidence_found")).confidence
    ).toBe("insufficient");
  });

  it("treats all-not-applicable as insufficient rather than perfect", () => {
    const { confidence, ratio } = computeEvidenceConfidence(
      Array(4).fill("not_applicable")
    );
    expect(confidence).toBe("insufficient");
    expect(ratio).toBe(0);
  });

  it("excludes not-applicable factors from the average", () => {
    const withNA = computeEvidenceConfidence([
      "verified_documentation",
      "not_applicable",
    ]);
    const without = computeEvidenceConfidence(["verified_documentation"]);
    expect(withNA.ratio).toBe(without.ratio);
  });

  it("degrades confidence as evidence weakens", () => {
    const order: EvidenceStatus[] = [
      "verified_documentation",
      "manufacturer_reported",
      "retailer_reported",
      "secondary_source",
      "conflicting_information",
      "no_evidence_found",
    ];
    const ratios = order.map(
      (s) => computeEvidenceConfidence(Array(4).fill(s)).ratio
    );
    for (let i = 1; i < ratios.length; i++) {
      expect(ratios[i]).toBeLessThan(ratios[i - 1]);
    }
  });
});

describe("parseEvidenceStatus", () => {
  it("falls back to manufacturer-reported for legacy rows, never to verified", () => {
    for (const bad of [undefined, null, "", "bogus", 42, {}]) {
      expect(parseEvidenceStatus(bad)).toBe(LEGACY_DEFAULT_STATUS);
      expect(parseEvidenceStatus(bad)).not.toBe("verified_documentation");
    }
  });

  it("accepts every known status", () => {
    for (const s of allStatuses) {
      expect(parseEvidenceStatus(s)).toBe(s);
    }
  });
});

describe("assessSafety", () => {
  it("does not exceed the raw weighted score", () => {
    const a = assessSafety(HIGH_FACTORS, {
      materialSafety: "verified_documentation",
      chokingRisk: "verified_documentation",
      recallHistory: "verified_documentation",
      certificationPresence: "verified_documentation",
    });
    expect(a.score).toBe(computeSafetyScore(HIGH_FACTORS));
    expect(a.adjustedForEvidence).toBe(false);
  });

  it("lowers the score when claims are only manufacturer-reported", () => {
    const verified = assessSafety(HIGH_FACTORS, {
      materialSafety: "verified_documentation",
      chokingRisk: "verified_documentation",
      recallHistory: "verified_documentation",
      certificationPresence: "verified_documentation",
    });
    const unverified = assessSafety(HIGH_FACTORS, {
      materialSafety: "manufacturer_reported",
      chokingRisk: "manufacturer_reported",
      recallHistory: "manufacturer_reported",
      certificationPresence: "manufacturer_reported",
    });
    expect(unverified.score!).toBeLessThan(verified.score!);
    expect(unverified.score).toBe(85);
    expect(unverified.adjustedForEvidence).toBe(true);
  });

  it("does not let missing evidence produce a high score", () => {
    const a = assessSafety(HIGH_FACTORS, {
      materialSafety: "no_evidence_found",
      chokingRisk: "no_evidence_found",
      recallHistory: "manufacturer_reported",
      certificationPresence: "manufacturer_reported",
    });
    expect(a.score!).toBeLessThanOrEqual(70);
    expect(a.confidence === "low" || a.confidence === "insufficient").toBe(true);
  });

  it("returns no precise score when evidence is insufficient", () => {
    const a = assessSafety(HIGH_FACTORS, {
      materialSafety: "no_evidence_found",
      chokingRisk: "no_evidence_found",
      recallHistory: "no_evidence_found",
      certificationPresence: "no_evidence_found",
    });
    expect(a.insufficientEvidence).toBe(true);
    expect(a.score).toBeNull();
    expect(a.confidenceLabel).toMatch(/insufficient/i);
  });

  it("surfaces conflicting information as unclear rather than averaging it away", () => {
    const a = assessSafety(HIGH_FACTORS, {
      materialSafety: "conflicting_information",
      chokingRisk: "manufacturer_reported",
      recallHistory: "manufacturer_reported",
      certificationPresence: "manufacturer_reported",
    });
    const material = a.factors.find((f) => f.key === "materialSafety")!;
    expect(material.evidenceLabel).toMatch(/unclear/i);
    expect(material.score).toBeLessThanOrEqual(
      EVIDENCE_SCORE_CAP.conflicting_information
    );
  });

  it("excludes not-applicable factors by renormalising the weights", () => {
    const a = assessSafety(
      { ...HIGH_FACTORS, certificationPresence: 0 },
      {
        materialSafety: "verified_documentation",
        chokingRisk: "verified_documentation",
        recallHistory: "verified_documentation",
        certificationPresence: "not_applicable",
      }
    );
    // The 0-scoring inapplicable factor must not drag the result down.
    expect(a.score).toBe(95);
    expect(a.factors.find((f) => f.key === "certificationPresence")!.applicable).toBe(
      false
    );
  });

  it("defaults legacy reviews with no evidence data to manufacturer-reported", () => {
    const a = assessSafety(HIGH_FACTORS);
    expect(a.factors.every((f) => f.evidenceStatus === LEGACY_DEFAULT_STATUS)).toBe(
      true
    );
    expect(a.confidence).toBe("medium");
    expect(a.score).toBe(85);
  });

  it("is deterministic", () => {
    const a = JSON.stringify(assessSafety(HIGH_FACTORS));
    const b = JSON.stringify(assessSafety(HIGH_FACTORS));
    expect(a).toBe(b);
  });

  it("exposes human-readable labels only, never internal identifiers", () => {
    const a = assessSafety(HIGH_FACTORS, { materialSafety: "retailer_reported" });
    for (const f of a.factors) {
      expect(f.evidenceLabel).not.toMatch(/_/);
      expect(f.label).not.toMatch(/_/);
    }
    expect(a.confidenceLabel).not.toMatch(/_/);
  });

  it("publishes weights that sum to 1", () => {
    const sum = SAFETY_FACTORS.reduce((s, f) => s + f.weight, 0);
    expect(Number(sum.toFixed(4))).toBe(1);
  });

  it("never claims physical small-parts testing in its factor descriptions", () => {
    const choking = SAFETY_FACTORS.find((f) => f.key === "chokingRisk")!;
    expect(choking.description).toMatch(/does not perform physical small-parts testing/i);
  });

  it("handles malformed factor values without throwing", () => {
    const a = assessSafety({
      materialSafety: NaN,
      chokingRisk: -5,
      recallHistory: 500,
      certificationPresence: 50,
    } as never);
    expect(a.score).not.toBeNull();
    expect(a.factors.every((f) => f.score >= 0 && f.score <= 100)).toBe(true);
  });
});
