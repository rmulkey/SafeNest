import { describe, it, expect } from "vitest";
import {
  validateScoringFactor,
  validateAlternativeBrandDiversity,
  validateRequiredFields,
  TOY_REVIEW_REQUIRED_FIELDS,
} from "./validation";

describe("validateScoringFactor", () => {
  it("accepts 0", () => {
    expect(validateScoringFactor(0)).toBe(true);
  });

  it("accepts 100", () => {
    expect(validateScoringFactor(100)).toBe(true);
  });

  it("accepts 50", () => {
    expect(validateScoringFactor(50)).toBe(true);
  });

  it("rejects values below 0", () => {
    const result = validateScoringFactor(-1);
    expect(result).toContain("between 0 and 100");
  });

  it("rejects values above 100", () => {
    const result = validateScoringFactor(101);
    expect(result).toContain("between 0 and 100");
  });

  it("rejects null", () => {
    const result = validateScoringFactor(null);
    expect(result).toContain("required");
  });

  it("rejects undefined", () => {
    const result = validateScoringFactor(undefined);
    expect(result).toContain("required");
  });

  it("rejects non-number values", () => {
    const result = validateScoringFactor("50");
    expect(result).toContain("must be a number");
  });

  it("rejects Infinity", () => {
    const result = validateScoringFactor(Infinity);
    expect(result).toContain("finite");
  });

  it("rejects NaN", () => {
    const result = validateScoringFactor(NaN);
    expect(result).toContain("finite");
  });
});

describe("validateAlternativeBrandDiversity", () => {
  it("returns valid when at least one alternative is from a different brand", () => {
    const result = validateAlternativeBrandDiversity("BrandA", [
      { _id: "1", brand: "BrandA" },
      { _id: "2", brand: "BrandB" },
    ]);
    expect(result.valid).toBe(true);
  });

  it("returns invalid when all alternatives are from the same brand", () => {
    const result = validateAlternativeBrandDiversity("BrandA", [
      { _id: "1", brand: "BrandA" },
      { _id: "2", brand: "BrandA" },
    ]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("different brand");
  });

  it("returns invalid when alternatives array is empty", () => {
    const result = validateAlternativeBrandDiversity("BrandA", []);
    expect(result.valid).toBe(false);
  });

  it("is case-insensitive for brand comparison", () => {
    const result = validateAlternativeBrandDiversity("branda", [
      { _id: "1", brand: "BrandA" },
    ]);
    expect(result.valid).toBe(false);
  });

  it("treats alternatives without brand as not satisfying diversity", () => {
    const result = validateAlternativeBrandDiversity("BrandA", [
      { _id: "1", brand: undefined },
    ]);
    expect(result.valid).toBe(false);
  });

  it("returns valid when primary brand is not set", () => {
    const result = validateAlternativeBrandDiversity(undefined, [
      { _id: "1", brand: "BrandA" },
    ]);
    expect(result.valid).toBe(true);
  });

  it("trims whitespace in brand comparison", () => {
    const result = validateAlternativeBrandDiversity("BrandA", [
      { _id: "1", brand: " BrandA " },
    ]);
    expect(result.valid).toBe(false);
  });
});

describe("validateRequiredFields", () => {
  it("returns valid when all required fields are present", () => {
    const doc = {
      productName: "Test Toy",
      brand: "TestBrand",
      slug: { current: "test-toy" },
      ageRange: { minMonths: 6, maxMonths: 24 },
      category: { _ref: "cat-1" },
      materialSafety: 80,
      chokingRisk: 70,
      recallHistory: 90,
      certificationPresence: 85,
      motorSkills: 75,
      cognitiveSkills: 60,
      sensoryEngagement: 80,
      materials: ["wood", "paint"],
      chokingHazardAssessment: "No small parts",
      pros: ["Durable"],
      cons: ["Expensive"],
      alternatives: [{ _ref: "alt-1" }],
    };
    const result = validateRequiredFields(doc, TOY_REVIEW_REQUIRED_FIELDS);
    expect(result.valid).toBe(true);
    expect(result.missingFields).toHaveLength(0);
  });

  it("returns invalid with list of missing fields", () => {
    const doc = {
      productName: "Test Toy",
      brand: "TestBrand",
    };
    const result = validateRequiredFields(doc, TOY_REVIEW_REQUIRED_FIELDS);
    expect(result.valid).toBe(false);
    expect(result.missingFields.length).toBeGreaterThan(0);
    expect(result.error).toContain("missing");
  });

  it("treats empty arrays as missing", () => {
    const doc = {
      productName: "Test",
      brand: "B",
      slug: "s",
      ageRange: { minMonths: 0, maxMonths: 12 },
      category: { _ref: "c" },
      materialSafety: 50,
      chokingRisk: 50,
      recallHistory: 50,
      certificationPresence: 50,
      motorSkills: 50,
      cognitiveSkills: 50,
      sensoryEngagement: 50,
      materials: [], // empty
      chokingHazardAssessment: "OK",
      pros: ["Good"],
      cons: ["Bad"],
      alternatives: [{ _ref: "a" }],
    };
    const result = validateRequiredFields(doc, TOY_REVIEW_REQUIRED_FIELDS);
    expect(result.valid).toBe(false);
    expect(result.missingFields).toContain("Materials List");
  });

  it("treats empty strings as missing", () => {
    const doc = {
      productName: "",
      brand: "B",
      slug: "s",
      ageRange: { minMonths: 0, maxMonths: 12 },
      category: { _ref: "c" },
      materialSafety: 50,
      chokingRisk: 50,
      recallHistory: 50,
      certificationPresence: 50,
      motorSkills: 50,
      cognitiveSkills: 50,
      sensoryEngagement: 50,
      materials: ["wood"],
      chokingHazardAssessment: "OK",
      pros: ["Good"],
      cons: ["Bad"],
      alternatives: [{ _ref: "a" }],
    };
    const result = validateRequiredFields(doc, TOY_REVIEW_REQUIRED_FIELDS);
    expect(result.valid).toBe(false);
    expect(result.missingFields).toContain("Product Name");
  });

  it("validates ageRange requires both minMonths and maxMonths", () => {
    const doc = {
      productName: "T",
      brand: "B",
      slug: "s",
      ageRange: { minMonths: 6 }, // missing maxMonths
      category: { _ref: "c" },
      materialSafety: 50,
      chokingRisk: 50,
      recallHistory: 50,
      certificationPresence: 50,
      motorSkills: 50,
      cognitiveSkills: 50,
      sensoryEngagement: 50,
      materials: ["wood"],
      chokingHazardAssessment: "OK",
      pros: ["Good"],
      cons: ["Bad"],
      alternatives: [{ _ref: "a" }],
    };
    const result = validateRequiredFields(doc, TOY_REVIEW_REQUIRED_FIELDS);
    expect(result.valid).toBe(false);
    expect(result.missingFields).toContain("Age Range");
  });
});
