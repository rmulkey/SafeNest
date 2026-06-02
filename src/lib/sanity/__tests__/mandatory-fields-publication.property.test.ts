/**
 * Feature: safenest-toys, Property 5: Content publication requires all mandatory fields
 *
 * For any Toy Review submission where at least one required field is missing,
 * the system SHALL prevent publication and display validation errors listing all missing fields.
 *
 * Validates: Requirements 2.2, 2.7, 3.5
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  validateRequiredFields,
  TOY_REVIEW_REQUIRED_FIELDS,
  type RequiredFieldConfig,
} from "../validation";

/**
 * Generates a complete, valid Toy Review document with all mandatory fields present.
 */
function generateCompleteDocument(): Record<string, unknown> {
  return {
    productName: "Test Toy",
    brand: "TestBrand",
    slug: { current: "test-toy" },
    ageRange: { minMonths: 6, maxMonths: 36 },
    category: { _ref: "category-1" },
    materialSafety: 80,
    chokingRisk: 70,
    recallHistory: 90,
    certificationPresence: 85,
    motorSkills: 75,
    cognitiveSkills: 60,
    sensoryEngagement: 80,
    materials: ["wood", "non-toxic paint"],
    chokingHazardAssessment: "No small parts present. Suitable for children under 3.",
    pros: ["Durable construction"],
    cons: ["Higher price point"],
    alternatives: [{ _ref: "alt-review-1" }],
  };
}

/**
 * Arbitrary that generates a non-empty subset of field indices to remove from the document.
 * This ensures at least one required field is always missing.
 */
const missingFieldSubsetArb = fc
  .subarray(
    Array.from({ length: TOY_REVIEW_REQUIRED_FIELDS.length }, (_, i) => i),
    { minLength: 1 }
  );

describe("Property 5: Content publication requires all mandatory fields", () => {
  it("should prevent publication when any subset of required fields is missing", () => {
    fc.assert(
      fc.property(missingFieldSubsetArb, (indicesToRemove) => {
        // Start with a complete valid document
        const doc = generateCompleteDocument();

        // Remove the selected subset of required fields
        const removedFields: RequiredFieldConfig[] = [];
        for (const idx of indicesToRemove) {
          const field = TOY_REVIEW_REQUIRED_FIELDS[idx];
          removedFields.push(field);
          delete doc[field.name];
        }

        // Validate the document
        const result = validateRequiredFields(doc, TOY_REVIEW_REQUIRED_FIELDS);

        // Publication MUST be prevented
        expect(result.valid).toBe(false);

        // Missing fields list must be non-empty
        expect(result.missingFields.length).toBeGreaterThan(0);

        // Error message must be present
        expect(result.error).toBeDefined();
        expect(result.error!.length).toBeGreaterThan(0);

        // Each removed field should appear in the missing fields list
        for (const field of removedFields) {
          expect(result.missingFields).toContain(field.label);
        }

        // The error message should mention "missing"
        expect(result.error).toContain("missing");
      }),
      { numRuns: 100 }
    );
  });

  it("should allow publication when ALL required fields are present", () => {
    fc.assert(
      fc.property(
        // Generate random valid scoring values to ensure it works across all valid inputs
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (matSafety, choking, recall, cert, motor, cog, sensory) => {
          const doc: Record<string, unknown> = {
            productName: "Any Toy",
            brand: "AnyBrand",
            slug: { current: "any-toy" },
            ageRange: { minMonths: 0, maxMonths: 36 },
            category: { _ref: "cat-1" },
            materialSafety: matSafety,
            chokingRisk: choking,
            recallHistory: recall,
            certificationPresence: cert,
            motorSkills: motor,
            cognitiveSkills: cog,
            sensoryEngagement: sensory,
            materials: ["plastic"],
            chokingHazardAssessment: "Assessment text",
            pros: ["A pro"],
            cons: ["A con"],
            alternatives: [{ _ref: "ref-1" }],
          };

          const result = validateRequiredFields(doc, TOY_REVIEW_REQUIRED_FIELDS);
          expect(result.valid).toBe(true);
          expect(result.missingFields).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should list exactly the fields that are missing (no false positives or negatives)", () => {
    fc.assert(
      fc.property(missingFieldSubsetArb, (indicesToRemove) => {
        const doc = generateCompleteDocument();

        // Remove selected fields
        const removedFieldLabels = new Set<string>();
        for (const idx of indicesToRemove) {
          const field = TOY_REVIEW_REQUIRED_FIELDS[idx];
          removedFieldLabels.add(field.label);
          delete doc[field.name];
        }

        const result = validateRequiredFields(doc, TOY_REVIEW_REQUIRED_FIELDS);

        // The missing fields set should exactly match what we removed
        const reportedMissing = new Set(result.missingFields);
        expect(reportedMissing).toEqual(removedFieldLabels);
      }),
      { numRuns: 100 }
    );
  });
});
