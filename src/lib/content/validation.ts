/**
 * Content Validation Module for SafeNest Toys.
 *
 * Enforces editorial integrity rules:
 * - No inventory counts, stock urgency, or purchase pressure indicators (Req 12.1)
 * - No medical claims without cited peer-reviewed sources (Req 12.4, 12.7)
 * - Affiliate disclosure within 50px of affiliate links (Req 12.5)
 * - Alternative brand diversity in reviews (Req 12.3, 12.6)
 *
 * These validators can be used in Sanity webhook handlers or as standalone utilities.
 */

// --- Purchase Pressure Validation (Requirement 12.1) ---

/**
 * Patterns that indicate purchase pressure, stock urgency, or inventory counts.
 * These are forbidden in Phase 1 content.
 */
const PURCHASE_PRESSURE_PATTERNS: RegExp[] = [
  // Inventory counts: "only 3 left", "5 remaining", "12 in stock"
  /\bonly\s+\d+\s+left\b/i,
  /\b\d+\s+(remaining|left\s+in\s+stock)\b/i,
  /\b\d+\s+in\s+stock\b/i,
  // Stock urgency: "limited stock", "selling fast", "almost gone"
  /\blimited\s+stock\b/i,
  /\bselling\s+fast\b/i,
  /\balmost\s+(gone|sold\s+out)\b/i,
  /\bwhile\s+supplies\s+last\b/i,
  /\bhurry\b/i,
  /\bdon'?t\s+miss\s+out\b/i,
  /\bact\s+(now|fast|quickly)\b/i,
  // Urgency timers / time pressure
  /\b(offer|deal|sale)\s+ends?\b/i,
  /\blimited\s+time\b/i,
  /\btoday\s+only\b/i,
  /\blast\s+chance\b/i,
  /\bcountdown\b/i,
  // Purchase pressure / FOMO
  /\bbuy\s+now\s+before\b/i,
  /\bselling\s+out\b/i,
  /\bhigh\s+demand\b/i,
  /\blow\s+stock\b/i,
  /\bstock\s+running\s+(low|out)\b/i,
];

export interface ValidationError {
  rule: string;
  message: string;
  match?: string;
  position?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validates that content does not contain purchase pressure language,
 * inventory counts, stock urgency, or FOMO-inducing indicators.
 *
 * @param content - The text content to validate
 * @returns ValidationResult indicating whether content passes the check
 */
export function validateNoPurchasePressure(content: string): ValidationResult {
  const errors: ValidationError[] = [];

  for (const pattern of PURCHASE_PRESSURE_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      errors.push({
        rule: "no-purchase-pressure",
        message: `Content contains purchase pressure language: "${match[0]}"`,
        match: match[0],
        position: match.index,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// --- Medical Claims Validation (Requirements 12.4, 12.7) ---

/**
 * Patterns that indicate medical claims or health guarantees.
 */
const MEDICAL_CLAIM_PATTERNS: RegExp[] = [
  /\bcures?\b/i,
  /\btreat(s|ment)?\b/i,
  /\bprevents?\s+(disease|illness|condition|disorder)/i,
  /\bclinically\s+proven\b/i,
  /\bmedically\s+proven\b/i,
  /\bguaranteed?\s+to\s+(heal|cure|treat|prevent|improve\s+health)/i,
  /\btherapeutic\s+(benefit|outcome|effect|result)/i,
  /\bheals?\b/i,
  /\bdiagnos(e|is|tic)\b/i,
  /\bprescri(be|ption)\b/i,
  /\bwill\s+(cure|heal|treat|prevent|eliminate)\b/i,
  /\bguaranteed?\s+(safe|safety|health)\b/i,
  /\b100%\s+safe\b/i,
  /\babsolutely\s+safe\b/i,
  /\bcompletely\s+safe\b/i,
  /\bno\s+risk\b/i,
  /\brisk[- ]free\b/i,
];

/**
 * Pattern for detecting a peer-reviewed source citation.
 * Matches common academic citation formats:
 * - DOI references
 * - PubMed/PMID references
 * - Journal name with year pattern
 * - Explicit "peer-reviewed" mentions
 */
const PEER_REVIEWED_CITATION_PATTERNS: RegExp[] = [
  /\bdoi:\s*10\.\d{4,}/i,
  /\bpmid:\s*\d+/i,
  /\bpubmed\b/i,
  /\bpeer[- ]reviewed\b/i,
  /\b\w+\s+journal\b.*\b\d{4}\b/i,
  /\(\w+\s+et\s+al\.\s*,?\s*\d{4}\)/i,
  /\[\d+\]/,
];

/**
 * Checks whether content near a medical claim contains a peer-reviewed citation.
 * Looks within a window of 500 characters after the claim.
 */
function hasCitationNearClaim(
  content: string,
  claimPosition: number
): boolean {
  // Look within 500 characters after the claim for a citation
  const windowEnd = Math.min(content.length, claimPosition + 500);
  const surroundingText = content.slice(claimPosition, windowEnd);

  return PEER_REVIEWED_CITATION_PATTERNS.some((pattern) =>
    pattern.test(surroundingText)
  );
}

/**
 * Validates that content does not contain medical claims or health guarantees
 * unless they are attributed to a cited peer-reviewed source.
 *
 * @param content - The text content to validate
 * @returns ValidationResult indicating whether content passes the check
 */
export function validateNoMedicalClaims(content: string): ValidationResult {
  const errors: ValidationError[] = [];

  for (const pattern of MEDICAL_CLAIM_PATTERNS) {
    const match = content.match(pattern);
    if (match && match.index !== undefined) {
      // Check if there's a peer-reviewed citation near this claim
      if (!hasCitationNearClaim(content, match.index)) {
        errors.push({
          rule: "no-unsourced-medical-claims",
          message: `Content contains a medical claim without a cited peer-reviewed source: "${match[0]}"`,
          match: match[0],
          position: match.index,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// --- Affiliate Disclosure Proximity Validation (Requirement 12.5) ---

/**
 * Represents the position of an element in the rendered layout.
 */
export interface ElementPosition {
  /** Top offset in pixels from the document/container top */
  top: number;
  /** Left offset in pixels from the document/container left */
  left: number;
}

/**
 * Represents an affiliate link with its position and associated disclosure.
 */
export interface AffiliateLinkWithDisclosure {
  /** The affiliate link element position */
  linkPosition: ElementPosition;
  /** The disclosure label element position, if present */
  disclosurePosition?: ElementPosition;
}

/** Maximum allowed distance in pixels between an affiliate link and its disclosure */
export const MAX_DISCLOSURE_DISTANCE_PX = 50;

/**
 * Calculates the Euclidean distance between two element positions.
 */
function calculateDistance(a: ElementPosition, b: ElementPosition): number {
  return Math.sqrt(Math.pow(a.top - b.top, 2) + Math.pow(a.left - b.left, 2));
}

/**
 * Validates that an affiliate disclosure label is within 50px of its
 * associated affiliate link.
 *
 * @param linkWithDisclosure - The affiliate link and its associated disclosure positions
 * @returns ValidationResult indicating whether disclosure proximity is satisfied
 */
export function validateAffiliateDisclosureProximity(
  linkWithDisclosure: AffiliateLinkWithDisclosure
): ValidationResult {
  const errors: ValidationError[] = [];

  if (!linkWithDisclosure.disclosurePosition) {
    errors.push({
      rule: "affiliate-disclosure-proximity",
      message:
        "Affiliate link is missing a disclosure label. A disclosure must be visible within 50px of the link.",
    });
    return { valid: false, errors };
  }

  const distance = calculateDistance(
    linkWithDisclosure.linkPosition,
    linkWithDisclosure.disclosurePosition
  );

  if (distance > MAX_DISCLOSURE_DISTANCE_PX) {
    errors.push({
      rule: "affiliate-disclosure-proximity",
      message: `Affiliate disclosure is ${Math.round(distance)}px from the link. Maximum allowed distance is ${MAX_DISCLOSURE_DISTANCE_PX}px.`,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// --- Alternative Brand Diversity Validation (Requirements 12.3, 12.6) ---

/**
 * Represents an alternative product with brand information.
 */
export interface AlternativeProduct {
  productId: string;
  productName: string;
  brand: string;
}

/**
 * Input for validating brand diversity in a review's alternatives list.
 */
export interface ReviewBrandDiversityInput {
  productName: string;
  brand: string;
  alternatives: AlternativeProduct[];
}

/**
 * Validates that a review's alternatives list contains at least one product
 * from a brand different from the primary reviewed product's brand.
 *
 * This ensures brand diversity in recommendations and prevents the appearance
 * of bias toward a single manufacturer.
 *
 * @param review - The review data with brand and alternatives
 * @returns ValidationResult indicating whether brand diversity is satisfied
 */
export function validateAlternativeBrandDiversity(
  review: ReviewBrandDiversityInput
): ValidationResult {
  const errors: ValidationError[] = [];

  if (!review.alternatives || review.alternatives.length === 0) {
    errors.push({
      rule: "alternative-brand-diversity",
      message:
        "Alternatives list must not be empty. At least one alternative from a different brand is required.",
    });
    return { valid: false, errors };
  }

  const primaryBrand = review.brand.toLowerCase().trim();
  const hasDifferentBrand = review.alternatives.some(
    (alt) => alt.brand.toLowerCase().trim() !== primaryBrand
  );

  if (!hasDifferentBrand) {
    errors.push({
      rule: "alternative-brand-diversity",
      message: `All alternatives are from the same brand ("${review.brand}"). At least one alternative must be from a different brand.`,
    });
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}

// --- Combined Content Validation ---

/**
 * Options for the combined content validation function.
 */
export interface ContentValidationOptions {
  /** The text content to validate for pressure language and medical claims */
  content: string;
  /** Optional affiliate link positions to validate disclosure proximity */
  affiliateLinks?: AffiliateLinkWithDisclosure[];
}

/**
 * Runs all content validation rules and returns a combined result.
 *
 * @param options - The content and optional affiliate link data to validate
 * @returns Combined ValidationResult from all rules
 */
export function validateContent(
  options: ContentValidationOptions
): ValidationResult {
  const allErrors: ValidationError[] = [];

  // Check for purchase pressure
  const pressureResult = validateNoPurchasePressure(options.content);
  allErrors.push(...pressureResult.errors);

  // Check for unsourced medical claims
  const medicalResult = validateNoMedicalClaims(options.content);
  allErrors.push(...medicalResult.errors);

  // Check affiliate disclosure proximity
  if (options.affiliateLinks) {
    for (const link of options.affiliateLinks) {
      const disclosureResult = validateAffiliateDisclosureProximity(link);
      allErrors.push(...disclosureResult.errors);
    }
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}
