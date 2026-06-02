/**
 * Feature: safenest-toys, Property 1: Safety Score bounded weighted sum
 *
 * Validates: Requirements 3.1, 3.7
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { computeSafetyScore } from "./safety-score";

describe("Property 1: Safety Score bounded weighted sum", () => {
  it("computed score equals weighted sum rounded to nearest integer and is in [0, 100]", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (materialSafety, chokingRisk, recallHistory, certificationPresence) => {
          const result = computeSafetyScore({
            materialSafety,
            chokingRisk,
            recallHistory,
            certificationPresence,
          });

          // Verify: computed score equals the weighted sum rounded to nearest integer
          const expectedScore = Math.round(
            materialSafety * 0.3 +
              chokingRisk * 0.3 +
              recallHistory * 0.2 +
              certificationPresence * 0.2
          );
          expect(result).toBe(expectedScore);

          // Verify: result is always in [0, 100]
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });
});
