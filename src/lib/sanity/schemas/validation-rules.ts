/**
 * Sanity-specific validation rule implementations for SafeNest Toys document schemas.
 *
 * These functions are designed to be used directly in Sanity schema field
 * definitions via the `validation` property, e.g.:
 *
 *   { name: 'materialSafety', type: 'number', validation: scoringFactorRule }
 *
 * They also support Sanity's async document-level validation for cross-field
 * and cross-document constraints (brand diversity check).
 *
 * Requirements: 2.7, 3.5, 3.7, 12.3, 12.6
 */

import {
  validateScoringFactor,
  validateAlternativeBrandDiversity,
  validateRequiredFields,
  TOY_REVIEW_REQUIRED_FIELDS,
  type AlternativeProduct,
} from "../validation";

/**
 * Sanity validation Rule type (simplified interface matching Sanity's API).
 * Sanity passes a Rule object to the validation function.
 */
interface SanityRule {
  required: () => SanityRule;
  min: (n: number) => SanityRule;
  max: (n: number) => SanityRule;
  custom: (
    fn: (value: unknown, context: SanityValidationContext) => true | string | Promise<true | string>
  ) => SanityRule;
}

/**
 * Sanity validation context provided to custom validation functions.
 */
interface SanityValidationContext {
  document?: Record<string, unknown>;
  parent?: Record<string, unknown>;
  path?: string[];
  type?: { name: string };
}

/**
 * Sanity client interface for fetching referenced documents.
 */
interface SanityClientLike {
  fetch: <T>(query: string, params?: Record<string, unknown>) => Promise<T>;
}

/**
 * Sanity field-level validation rule for scoring factors (0–100).
 *
 * Usage in schema:
 *   { name: 'materialSafety', type: 'number', validation: (Rule) => scoringFactorRule(Rule) }
 *
 * Requirement 3.7: Reject factor values outside [0, 100].
 */
export function scoringFactorRule(Rule: SanityRule): SanityRule {
  return Rule.required()
    .min(0)
    .max(100)
    .custom((value: unknown) => {
      return validateScoringFactor(value);
    });
}

/**
 * Creates an async document-level validation rule that checks brand diversity
 * among alternative product references.
 *
 * This requires fetching referenced alternative documents to inspect their brand field.
 * It is intended to be used as a document-level validation or on the `alternatives` field.
 *
 * Usage in schema:
 *   validation: (Rule) => Rule.custom((value, context) =>
 *     alternativeBrandDiversityRule(sanityClient, value, context)
 *   )
 *
 * Requirements 12.3, 12.6: At least one alternative must be from a different brand.
 *
 * @param client - Sanity client for fetching referenced documents
 * @param alternatives - The alternatives field value (array of references)
 * @param context - Sanity validation context containing the parent document
 */
export async function alternativeBrandDiversityRule(
  client: SanityClientLike,
  alternatives: unknown,
  context: SanityValidationContext
): Promise<true | string> {
  // If alternatives are not set, let the required field validation handle it
  if (!alternatives || !Array.isArray(alternatives) || alternatives.length === 0) {
    return true;
  }

  const document = context.document;
  if (!document) {
    return true;
  }

  const primaryBrand = document.brand as string | undefined;
  if (!primaryBrand) {
    // Can't validate diversity without knowing the primary brand
    return true;
  }

  // Extract reference IDs from Sanity reference objects
  const referenceIds = alternatives
    .filter((alt): alt is { _ref: string } => alt && typeof alt._ref === "string")
    .map((alt) => alt._ref);

  if (referenceIds.length === 0) {
    return "At least one alternative product reference is required from a different brand.";
  }

  // Fetch the referenced documents to check their brands
  const referencedProducts = await client.fetch<AlternativeProduct[]>(
    `*[_id in $ids]{ _id, brand }`,
    { ids: referenceIds }
  );

  const result = validateAlternativeBrandDiversity(primaryBrand, referencedProducts);

  if (!result.valid) {
    return result.error ?? "At least one alternative must be from a different brand.";
  }

  return true;
}

/**
 * Document-level validation rule that checks all required fields are present
 * before allowing publication of a Toy Review.
 *
 * Usage as a document-level validation in the schema:
 *   validation: (Rule) => Rule.custom((_, context) =>
 *     requiredFieldsPublicationRule(context)
 *   )
 *
 * Requirements 2.7, 3.5: Prevent publication with missing required fields.
 *
 * @param context - Sanity validation context containing the full document
 */
export function requiredFieldsPublicationRule(
  context: SanityValidationContext
): true | string {
  const document = context.document;
  if (!document) {
    return true;
  }

  const result = validateRequiredFields(document, TOY_REVIEW_REQUIRED_FIELDS);

  if (!result.valid) {
    return result.error ?? "Required fields are missing.";
  }

  return true;
}
