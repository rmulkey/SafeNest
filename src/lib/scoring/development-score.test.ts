import { describe, it, expect } from "vitest";
import {
  computeDevelopmentScore,
  DEVELOPMENT_SCORE_WEIGHTS,
} from "./development-score";

describe("computeDevelopmentScore", () => {
  it("returns 0 when all factors are 0", () => {
    expect(
      computeDevelopmentScore({ motorSkills: 0, cognitiveSkills: 0, sensoryEngagement: 0 })
    ).toBe(0);
  });

  it("returns 100 when all factors are 100", () => {
    expect(
      computeDevelopmentScore({ motorSkills: 100, cognitiveSkills: 100, sensoryEngagement: 100 })
    ).toBe(100);
  });

  it("returns 50 when all factors are 50", () => {
    expect(
      computeDevelopmentScore({ motorSkills: 50, cognitiveSkills: 50, sensoryEngagement: 50 })
    ).toBe(50);
  });

  it("computes correct weighted sum for mixed values", () => {
    // 80*0.40 + 60*0.35 + 40*0.25 = 32 + 21 + 10 = 63
    expect(
      computeDevelopmentScore({ motorSkills: 80, cognitiveSkills: 60, sensoryEngagement: 40 })
    ).toBe(63);
  });

  it("rounds to nearest integer", () => {
    // 33*0.40 + 33*0.35 + 33*0.25 = 13.2 + 11.55 + 8.25 = 33
    expect(
      computeDevelopmentScore({ motorSkills: 33, cognitiveSkills: 33, sensoryEngagement: 33 })
    ).toBe(33);

    // 1*0.40 + 1*0.35 + 0*0.25 = 0.4 + 0.35 + 0 = 0.75 → rounds to 1
    expect(
      computeDevelopmentScore({ motorSkills: 1, cognitiveSkills: 1, sensoryEngagement: 0 })
    ).toBe(1);
  });

  it("handles boundary value 0 for individual factors", () => {
    // 100*0.40 + 0*0.35 + 0*0.25 = 40
    expect(
      computeDevelopmentScore({ motorSkills: 100, cognitiveSkills: 0, sensoryEngagement: 0 })
    ).toBe(40);
  });

  it("handles boundary value 100 for individual factors", () => {
    // 0*0.40 + 0*0.35 + 100*0.25 = 25
    expect(
      computeDevelopmentScore({ motorSkills: 0, cognitiveSkills: 0, sensoryEngagement: 100 })
    ).toBe(25);
  });

  describe("input validation", () => {
    it("throws RangeError when motorSkills is below 0", () => {
      expect(() =>
        computeDevelopmentScore({ motorSkills: -1, cognitiveSkills: 50, sensoryEngagement: 50 })
      ).toThrow(RangeError);
    });

    it("throws RangeError when motorSkills is above 100", () => {
      expect(() =>
        computeDevelopmentScore({ motorSkills: 101, cognitiveSkills: 50, sensoryEngagement: 50 })
      ).toThrow(RangeError);
    });

    it("throws RangeError when cognitiveSkills is below 0", () => {
      expect(() =>
        computeDevelopmentScore({ motorSkills: 50, cognitiveSkills: -5, sensoryEngagement: 50 })
      ).toThrow(RangeError);
    });

    it("throws RangeError when cognitiveSkills is above 100", () => {
      expect(() =>
        computeDevelopmentScore({ motorSkills: 50, cognitiveSkills: 200, sensoryEngagement: 50 })
      ).toThrow(RangeError);
    });

    it("throws RangeError when sensoryEngagement is below 0", () => {
      expect(() =>
        computeDevelopmentScore({ motorSkills: 50, cognitiveSkills: 50, sensoryEngagement: -0.1 })
      ).toThrow(RangeError);
    });

    it("throws RangeError when sensoryEngagement is above 100", () => {
      expect(() =>
        computeDevelopmentScore({ motorSkills: 50, cognitiveSkills: 50, sensoryEngagement: 100.1 })
      ).toThrow(RangeError);
    });

    it("throws TypeError when a factor is NaN", () => {
      expect(() =>
        computeDevelopmentScore({ motorSkills: NaN, cognitiveSkills: 50, sensoryEngagement: 50 })
      ).toThrow(TypeError);
    });

    it("throws TypeError when a factor is Infinity", () => {
      expect(() =>
        computeDevelopmentScore({
          motorSkills: 50,
          cognitiveSkills: Infinity,
          sensoryEngagement: 50,
        })
      ).toThrow(TypeError);
    });
  });

  describe("weights", () => {
    it("exports correct weight constants", () => {
      expect(DEVELOPMENT_SCORE_WEIGHTS.motorSkills).toBe(0.4);
      expect(DEVELOPMENT_SCORE_WEIGHTS.cognitiveSkills).toBe(0.35);
      expect(DEVELOPMENT_SCORE_WEIGHTS.sensoryEngagement).toBe(0.25);
    });

    it("weights sum to 1.0", () => {
      const sum =
        DEVELOPMENT_SCORE_WEIGHTS.motorSkills +
        DEVELOPMENT_SCORE_WEIGHTS.cognitiveSkills +
        DEVELOPMENT_SCORE_WEIGHTS.sensoryEngagement;
      expect(sum).toBeCloseTo(1.0);
    });
  });
});
