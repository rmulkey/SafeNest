import { describe, it, expect } from "vitest";
import { computeSafetyScore } from "./safety-score";
import { computeDevelopmentScore } from "./development-score";

/**
 * Edge-case coverage for the two scoring functions, kept in a separate file so
 * the existing safety-score.test.ts / development-score.test.ts remain
 * untouched. Focus is on boundaries, rounding, and out-of-range rejection
 * that the existing suites do not already assert.
 */

describe("computeSafetyScore — edge cases", () => {
  it("all-zero inputs produce 0", () => {
    expect(
      computeSafetyScore({
        materialSafety: 0,
        chokingRisk: 0,
        recallHistory: 0,
        certificationPresence: 0,
      })
    ).toBe(0);
  });

  it("all-100 inputs produce 100", () => {
    expect(
      computeSafetyScore({
        materialSafety: 100,
        chokingRisk: 100,
        recallHistory: 100,
        certificationPresence: 100,
      })
    ).toBe(100);
  });

  it("accepts fractional values inside the valid range", () => {
    // 12.5*0.30 + 12.5*0.30 + 12.5*0.20 + 12.5*0.20 = 12.5 → rounds to 13
    expect(
      computeSafetyScore({
        materialSafety: 12.5,
        chokingRisk: 12.5,
        recallHistory: 12.5,
        certificationPresence: 12.5,
      })
    ).toBe(13);
  });

  it("rounds a .5 result half-up", () => {
    // 1.5*0.30 + 1.5*0.30 + 1.5*0.20 + 1.5*0.20 = 1.5 → Math.round → 2
    expect(
      computeSafetyScore({
        materialSafety: 1.5,
        chokingRisk: 1.5,
        recallHistory: 1.5,
        certificationPresence: 1.5,
      })
    ).toBe(2);
  });

  describe("out-of-range inputs are rejected", () => {
    it("rejects a value just below 0", () => {
      expect(() =>
        computeSafetyScore({
          materialSafety: -0.0001,
          chokingRisk: 50,
          recallHistory: 50,
          certificationPresence: 50,
        })
      ).toThrow();
    });

    it("rejects a value just above 100", () => {
      expect(() =>
        computeSafetyScore({
          materialSafety: 100.0001,
          chokingRisk: 50,
          recallHistory: 50,
          certificationPresence: 50,
        })
      ).toThrow();
    });

    it("rejects a large negative value on any factor", () => {
      expect(() =>
        computeSafetyScore({
          materialSafety: 50,
          chokingRisk: 50,
          recallHistory: 50,
          certificationPresence: -1000,
        })
      ).toThrow(/certificationPresence/);
    });
  });
});

describe("computeDevelopmentScore — edge cases", () => {
  it("all-zero inputs produce 0", () => {
    expect(
      computeDevelopmentScore({
        motorSkills: 0,
        cognitiveSkills: 0,
        sensoryEngagement: 0,
      })
    ).toBe(0);
  });

  it("all-100 inputs produce 100", () => {
    expect(
      computeDevelopmentScore({
        motorSkills: 100,
        cognitiveSkills: 100,
        sensoryEngagement: 100,
      })
    ).toBe(100);
  });

  it("accepts fractional values inside the valid range", () => {
    // 10.5*0.40 + 10.5*0.35 + 10.5*0.25 = 10.5 → rounds to 11 (half-up)
    expect(
      computeDevelopmentScore({
        motorSkills: 10.5,
        cognitiveSkills: 10.5,
        sensoryEngagement: 10.5,
      })
    ).toBe(11);
  });

  describe("out-of-range inputs are rejected with RangeError", () => {
    it("rejects a value just below 0", () => {
      expect(() =>
        computeDevelopmentScore({
          motorSkills: -0.0001,
          cognitiveSkills: 50,
          sensoryEngagement: 50,
        })
      ).toThrow(RangeError);
    });

    it("rejects a value just above 100", () => {
      expect(() =>
        computeDevelopmentScore({
          motorSkills: 50,
          cognitiveSkills: 100.0001,
          sensoryEngagement: 50,
        })
      ).toThrow(RangeError);
    });

    it("rejects a large out-of-range value", () => {
      expect(() =>
        computeDevelopmentScore({
          motorSkills: 50,
          cognitiveSkills: 50,
          sensoryEngagement: 9999,
        })
      ).toThrow(RangeError);
    });
  });

  describe("non-finite inputs are rejected with TypeError", () => {
    it("rejects NaN", () => {
      expect(() =>
        computeDevelopmentScore({
          motorSkills: NaN,
          cognitiveSkills: 50,
          sensoryEngagement: 50,
        })
      ).toThrow(TypeError);
    });

    it("rejects Infinity", () => {
      expect(() =>
        computeDevelopmentScore({
          motorSkills: 50,
          cognitiveSkills: 50,
          sensoryEngagement: Infinity,
        })
      ).toThrow(TypeError);
    });
  });
});
