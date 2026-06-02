/**
 * Custom Sanity CMS validation utilities for SafeNest Toys.
 *
 * These helpers enforce content integrity rules:
 * - Scoring factors must be in [0, 100]
 * - Alternatives must include at least one product from a different brand
 * - Required fields must be present before publication
 *
 * Requirements: 2.7, 3.5, 3.7, 12.3, 12.6
 */

/**
 * Validates that a scoring factor value is within the acceptable range [0, 100].
 *
 * Requirement 3.7: IF a factor value is outside the range of 0–100,
 * THEN reject the input and display a validation error indicating the acceptable range.
 */
export function validateScoringFactor(value: unknown): true | string {
  if (value === undefined || value === null) {
    return "Scoring factor is required";
  }

  if (typeof value !== "number") {
    return "Scoring factor must be a number";
  }

  if (!Number.isFinite(value)) {
    return "Scoring factor must be a finite number";
  }

  if (value < 0 || value > 100) {
    return "Scoring factor must be between 0 and 100";
  }

  return true;
}

/**
 * Result returned from the brand diversity validation.
 */
export interface BrandDiversityResult {
  valid: boolean;
  error?: string;
}

/**
 * Represents a referenced alternative product with its brand information.
 */
export interface AlternativeProduct {
  _id: string;
  brand?: string;
}

/**
 * Validates that at least one alternative product is from a different brand
 * than the primary product being reviewed.
 *
 * Requirement 12.3: Every Toy Review must have at least one alternative from a different brand.
 * Requirement 12.6: IF a Toy Review is submitted without an alternative product
 * recommendation from a different brand, THEN prevent publication.
 *
 * @param primaryBrand - The brand of the toy being reviewed
 * @param alternatives - Array of alternative products with brand info
 * @returns Validation result with valid flag and optional error message
 */
export function validateAlternativeBrandDiversity(
  primaryBrand: string | undefined | null,
  alternatives: AlternativeProduct[]
): BrandDiversityResult {
  if (!alternatives || alternatives.length === 0) {
    return {
      valid: false,
      error:
        "At least one alternative product is required. It must be from a different brand than the reviewed product.",
    };
  }

  if (!primaryBrand) {
    // If primary brand is not set, we can't validate diversity yet.
    // This will be caught by required field validation instead.
    return { valid: true };
  }

  const normalizedPrimaryBrand = primaryBrand.trim().toLowerCase();

  const hasDifferentBrand = alternatives.some((alt) => {
    if (!alt.brand) {
      // An alternative without a brand cannot satisfy the diversity requirement
      return false;
    }
    return alt.brand.trim().toLowerCase() !== normalizedPrimaryBrand;
  });

  if (!hasDifferentBrand) {
    return {
      valid: false,
      error:
        "At least one alternative product must be from a different brand than the reviewed product. " +
        `All alternatives are currently from the same brand as the reviewed product ("${primaryBrand}").`,
    };
  }

  return { valid: true };
}

/**
 * Configuration for required fields validation.
 */
export interface RequiredFieldConfig {
  /** The field name (key in the document) */
  name: string;
  /** Human-readable label for error messages */
  label: string;
  /** Optional custom validator — return true if value is considered present */
  isPresent?: (value: unknown) => boolean;
}

/**
 * Result returned from required fields validation.
 */
export interface RequiredFieldsResult {
  valid: boolean;
  missingFields: string[];
  error?: string;
}

/**
 * Default presence check: value is non-null, non-undefined, and non-empty.
 */
function defaultIsPresent(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

/**
 * The required fields for a Toy Review document.
 *
 * Requirement 2.7 / 3.5: All required fields must be present before publication.
 */
export const TOY_REVIEW_REQUIRED_FIELDS: RequiredFieldConfig[] = [
  { name: "productName", label: "Product Name" },
  { name: "brand", label: "Brand" },
  { name: "slug", label: "Slug" },
  {
    name: "ageRange",
    label: "Age Range",
    isPresent: (value) => {
      if (!value || typeof value !== "object") return false;
      const range = value as { minMonths?: number; maxMonths?: number };
      return range.minMonths !== undefined && range.maxMonths !== undefined;
    },
  },
  { name: "category", label: "Category" },
  { name: "materialSafety", label: "Material Safety Score" },
  { name: "chokingRisk", label: "Choking Risk Score" },
  { name: "recallHistory", label: "Recall History Score" },
  { name: "certificationPresence", label: "Certification Presence Score" },
  { name: "motorSkills", label: "Motor Skills Score" },
  { name: "cognitiveSkills", label: "Cognitive Skills Score" },
  { name: "sensoryEngagement", label: "Sensory Engagement Score" },
  { name: "materials", label: "Materials List" },
  { name: "chokingHazardAssessment", label: "Choking Hazard Assessment" },
  { name: "pros", label: "Pros" },
  { name: "cons", label: "Cons" },
  { name: "alternatives", label: "Alternatives" },
];

/**
 * Validates that all required fields are present in a document before publication.
 *
 * Requirement 2.7: IF an Admin attempts to publish a Toy Review with any required field
 * missing, THEN prevent publication and display a validation error listing missing fields.
 * Requirement 3.5: IF a Safety_Score or Development_Score factor value is missing, THEN
 * flag the Toy Review as incomplete and prevent publication.
 *
 * @param document - The document data to validate (key-value pairs)
 * @param requiredFields - Array of field configurations to check
 * @returns Validation result with valid flag, list of missing fields, and optional error message
 */
export function validateRequiredFields(
  document: Record<string, unknown>,
  requiredFields: RequiredFieldConfig[] = TOY_REVIEW_REQUIRED_FIELDS
): RequiredFieldsResult {
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    const value = document[field.name];
    const checkPresence = field.isPresent ?? defaultIsPresent;

    if (!checkPresence(value)) {
      missingFields.push(field.label);
    }
  }

  if (missingFields.length > 0) {
    return {
      valid: false,
      missingFields,
      error: `Publication prevented: the following required fields are missing: ${missingFields.join(", ")}`,
    };
  }

  return { valid: true, missingFields: [] };
}
