import { describe, it, expect } from "vitest";
import {
  computeSafetyScore,
  SafetyScoreFactors,
  WEIGHT_MATERIAL_SAFETY,
  WEIGHT_CHOKING_RISK,
  WEIGHT_RECALL_HISTORY,
  WEIGHT_CERTIFICATION_PRESENCE,
} from "./safety-score";

describe("computeSafetyScore", () => {
  describe("known inputs → expected outputs", () => {
    it("all factors at 100 → score 100", () => {
      const factors: SafetyScoreFactors = {
        materialSafety: 100,
        chokingRisk: 100,
        recallHistory: 100,
        certificationPresence: 100,
      };
      expect(computeSafetyScore(factors)).toBe(100);
    });

    it("all factors at 0 → score 0", () => {
      const factors: SafetyScoreFactors = {
        materialSafety: 0,
        chokingRisk: 0,
        recallHistory: 0,
        certificationPresence: 0,
      };
      expect(computeSafetyScore(factors)).toBe(0);
    });

    it("all factors at 50 → score 50", () => {
      const factors: SafetyScoreFactors = {
        materialSafety: 50,
        chokingRisk: 50,
        recallHistory: 50,
        certificationPresence: 50,
      };
      expect(computeSafetyScore(factors)).toBe(50);
    });

    it("computes correct weighted sum for mixed values", () => {
      const factors: SafetyScoreFactors = {
        materialSafety: 80,
        chokingRisk: 60,
        recallHistory: 90,
        certificationPresence: 70,
      };
      // 80*0.30 + 60*0.30 + 90*0.20 + 70*0.20 = 24 + 18 + 18 + 14 = 74
      expect(computeSafetyScore(factors)).toBe(74);
    });

    it("rounds to nearest integer", () => {
      const factors: SafetyScoreFactors = {
        materialSafety: 33,
        chokingRisk: 67,
        recallHistory: 45,
        certificationPresence: 89,
      };
      // 33*0.30 + 67*0.30 + 45*0.20 + 89*0.20 = 9.9 + 20.1 + 9 + 17.8 = 56.8
      expect(computeSafetyScore(factors)).toBe(57);
    });
  });

  describe("boundary values", () => {
    it("accepts factor at exactly 0", () => {
      const factors: SafetyScoreFactors = {
        materialSafety: 0,
        chokingRisk: 100,
        recallHistory: 100,
        certificationPresence: 100,
      };
      expect(computeSafetyScore(factors)).toBe(70);
    });

    it("accepts factor at exactly 100", () => {
      const factors: SafetyScoreFactors = {
        materialSafety: 100,
        chokingRisk: 0,
        recallHistory: 0,
        certificationPresence: 0,
      };
      expect(computeSafetyScore(factors)).toBe(30);
    });
  });

  describe("invalid inputs rejected", () => {
    it("throws for materialSafety below 0", () => {
      const factors: SafetyScoreFactors = {
        materialSafety: -1,
        chokingRisk: 50,
        recallHistory: 50,
        certificationPresence: 50,
      };
      expect(() => computeSafetyScore(factors)).toThrow(
        "Invalid materialSafety: must be between 0 and 100"
      );
    });

    it("throws for chokingRisk above 100", () => {
      const factors: SafetyScoreFactors = {
        materialSafety: 50,
        chokingRisk: 101,
        recallHistory: 50,
        certificationPresence: 50,
      };
      expect(() => computeSafetyScore(factors)).toThrow(
        "Invalid chokingRisk: must be between 0 and 100"
      );
    });

    it("throws for NaN input", () => {
      const factors: SafetyScoreFactors = {
        materialSafety: NaN,
        chokingRisk: 50,
        recallHistory: 50,
        certificationPresence: 50,
      };
      expect(() => computeSafetyScore(factors)).toThrow(
        "Invalid materialSafety: must be a finite number"
      );
    });

    it("throws for Infinity input", () => {
      const factors: SafetyScoreFactors = {
        materialSafety: 50,
        chokingRisk: 50,
        recallHistory: Infinity,
        certificationPresence: 50,
      };
      expect(() => computeSafetyScore(factors)).toThrow(
        "Invalid recallHistory: must be a finite number"
      );
    });

    it("throws for negative Infinity input", () => {
      const factors: SafetyScoreFactors = {
        materialSafety: 50,
        chokingRisk: 50,
        recallHistory: 50,
        certificationPresence: -Infinity,
      };
      expect(() => computeSafetyScore(factors)).toThrow(
        "Invalid certificationPresence: must be a finite number"
      );
    });
  });

  describe("weights are correctly exported", () => {
    it("weights sum to 1.0", () => {
      const sum =
        WEIGHT_MATERIAL_SAFETY +
        WEIGHT_CHOKING_RISK +
        WEIGHT_RECALL_HISTORY +
        WEIGHT_CERTIFICATION_PRESENCE;
      expect(sum).toBeCloseTo(1.0);
    });

    it("has correct individual weight values", () => {
      expect(WEIGHT_MATERIAL_SAFETY).toBe(0.3);
      expect(WEIGHT_CHOKING_RISK).toBe(0.3);
      expect(WEIGHT_RECALL_HISTORY).toBe(0.2);
      expect(WEIGHT_CERTIFICATION_PRESENCE).toBe(0.2);
    });
  });
});
