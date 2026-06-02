/**
 * Development Score computation for SafeNest Toys.
 *
 * Computes a weighted score reflecting a toy's developmental value
 * based on motor skills, cognitive skills, and sensory engagement factors.
 *
 * Requirements: 3.2, 3.7
 */

/** Weights for development score factors. */
export const DEVELOPMENT_SCORE_WEIGHTS = {
  motorSkills: 0.4,
  cognitiveSkills: 0.35,
  sensoryEngagement: 0.25,
} as const;

/** Input factors for development score computation. */
export interface DevelopmentScoreFactors {
  motorSkills: number;
  cognitiveSkills: number;
  sensoryEngagement: number;
}

/**
 * Computes the Development Score as a weighted sum of the input factors.
 *
 * @param factors - Object containing motorSkills, cognitiveSkills, and sensoryEngagement (each 0–100)
 * @returns The computed development score rounded to the nearest integer (0–100)
 * @throws {RangeError} If any factor is outside the [0, 100] range
 * @throws {TypeError} If any factor is not a finite number
 */
export function computeDevelopmentScore(factors: DevelopmentScoreFactors): number {
  validateFactor("motorSkills", factors.motorSkills);
  validateFactor("cognitiveSkills", factors.cognitiveSkills);
  validateFactor("sensoryEngagement", factors.sensoryEngagement);

  const score =
    factors.motorSkills * DEVELOPMENT_SCORE_WEIGHTS.motorSkills +
    factors.cognitiveSkills * DEVELOPMENT_SCORE_WEIGHTS.cognitiveSkills +
    factors.sensoryEngagement * DEVELOPMENT_SCORE_WEIGHTS.sensoryEngagement;

  return Math.round(score);
}

/**
 * Validates that a single factor value is a finite number in [0, 100].
 */
function validateFactor(name: string, value: number): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
  if (value < 0 || value > 100) {
    throw new RangeError(`${name} must be between 0 and 100, got ${value}`);
  }
}
