/**
 * Safety Score computation for SafeNest Toys.
 *
 * Computes a weighted safety score from four factors:
 * - Material Safety (30%)
 * - Choking Risk (30%)
 * - Recall History (20%)
 * - Certification Presence (20%)
 *
 * Requirements: 3.1, 3.7
 */

/**
 * Input factors for computing the Safety Score.
 * Each factor must be a number in the range [0, 100].
 */
export interface SafetyScoreFactors {
  materialSafety: number;
  chokingRisk: number;
  recallHistory: number;
  certificationPresence: number;
}

/** Weight for the Material Safety factor */
export const WEIGHT_MATERIAL_SAFETY = 0.3;

/** Weight for the Choking Risk factor */
export const WEIGHT_CHOKING_RISK = 0.3;

/** Weight for the Recall History factor */
export const WEIGHT_RECALL_HISTORY = 0.2;

/** Weight for the Certification Presence factor */
export const WEIGHT_CERTIFICATION_PRESENCE = 0.2;

/**
 * Validates that a single factor value is within [0, 100].
 * Throws an error if the value is out of range or not a finite number.
 */
function validateFactor(name: string, value: number): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(
      `Invalid ${name}: must be a finite number, received ${value}`
    );
  }
  if (value < 0 || value > 100) {
    throw new Error(
      `Invalid ${name}: must be between 0 and 100, received ${value}`
    );
  }
}

/**
 * Computes the Safety Score as a weighted sum of the four input factors.
 *
 * Formula: materialSafety × 0.30 + chokingRisk × 0.30 + recallHistory × 0.20 + certificationPresence × 0.20
 *
 * @param factors - The four safety scoring factors, each in [0, 100]
 * @returns The computed safety score, rounded to the nearest integer, in [0, 100]
 * @throws Error if any factor is outside [0, 100] or not a finite number
 */
export function computeSafetyScore(factors: SafetyScoreFactors): number {
  validateFactor("materialSafety", factors.materialSafety);
  validateFactor("chokingRisk", factors.chokingRisk);
  validateFactor("recallHistory", factors.recallHistory);
  validateFactor("certificationPresence", factors.certificationPresence);

  const score =
    factors.materialSafety * WEIGHT_MATERIAL_SAFETY +
    factors.chokingRisk * WEIGHT_CHOKING_RISK +
    factors.recallHistory * WEIGHT_RECALL_HISTORY +
    factors.certificationPresence * WEIGHT_CERTIFICATION_PRESENCE;

  return Math.round(score);
}
