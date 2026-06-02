import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { computeDevelopmentScore } from "./development-score";

/**
 * Feature: safenest-toys, Property 2: Development Score bounded weighted sum
 *
 * Validates: Requirements 3.2, 3.7
 */
describe("Property 2: Development Score bounded weighted sum", () => {
  it("computed score equals (motorSkills × 0.40 + cognitiveSkills × 0.35 + sensoryEngagement × 0.25) rounded to nearest integer", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (motorSkills, cognitiveSkills, sensoryEngagement) => {
          const result = computeDevelopmentScore({
            motorSkills,
            cognitiveSkills,
            sensoryEngagement,
          });

          const expected = Math.round(
            motorSkills * 0.4 + cognitiveSkills * 0.35 + sensoryEngagement * 0.25
          );

          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("result is always in [0, 100]", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (motorSkills, cognitiveSkills, sensoryEngagement) => {
          const result = computeDevelopmentScore({
            motorSkills,
            cognitiveSkills,
            sensoryEngagement,
          });

          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });
});
