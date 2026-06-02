import { describe, it, expect } from "vitest";
import {
  validateNoPurchasePressure,
  validateNoMedicalClaims,
  validateAffiliateDisclosureProximity,
  validateContent,
  MAX_DISCLOSURE_DISTANCE_PX,
} from "./validation";

describe("validateNoPurchasePressure", () => {
  it("passes for normal editorial content", () => {
    const content =
      "This wooden stacking toy is great for developing fine motor skills. We recommend it for toddlers aged 12-24 months.";
    const result = validateNoPurchasePressure(content);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects content with inventory counts", () => {
    const result = validateNoPurchasePressure("Only 3 left in stock!");
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe("no-purchase-pressure");
  });

  it("rejects 'limited stock' language", () => {
    const result = validateNoPurchasePressure(
      "Get this toy while there is limited stock available."
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0].match).toBe("limited stock");
  });

  it("rejects 'selling fast' urgency", () => {
    const result = validateNoPurchasePressure("This toy is selling fast!");
    expect(result.valid).toBe(false);
  });

  it("rejects countdown timer references", () => {
    const result = validateNoPurchasePressure(
      "Check the countdown for when this deal expires."
    );
    expect(result.valid).toBe(false);
  });

  it("rejects 'hurry' pressure language", () => {
    const result = validateNoPurchasePressure("Hurry, this won't last!");
    expect(result.valid).toBe(false);
  });

  it("rejects 'act now' pressure", () => {
    const result = validateNoPurchasePressure(
      "Act now to get the best price."
    );
    expect(result.valid).toBe(false);
  });

  it("rejects 'today only' language", () => {
    const result = validateNoPurchasePressure("Today only — special pricing.");
    expect(result.valid).toBe(false);
  });

  it("rejects 'low stock' indicators", () => {
    const result = validateNoPurchasePressure(
      "This item is currently low stock."
    );
    expect(result.valid).toBe(false);
  });

  it("returns the position of the match", () => {
    const content = "Great toy. Only 5 left in stores.";
    const result = validateNoPurchasePressure(content);
    expect(result.valid).toBe(false);
    expect(result.errors[0].position).toBeGreaterThan(0);
  });
});

describe("validateNoMedicalClaims", () => {
  it("passes for normal developmental language", () => {
    const content =
      "This toy supports sensory exploration and helps engage cognitive development through play.";
    const result = validateNoMedicalClaims(content);
    expect(result.valid).toBe(true);
  });

  it("rejects 'clinically proven' without citation", () => {
    const result = validateNoMedicalClaims(
      "This toy is clinically proven to improve attention span."
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe("no-unsourced-medical-claims");
  });

  it("rejects 'cures' without citation", () => {
    const result = validateNoMedicalClaims(
      "Playing with this toy cures hyperactivity."
    );
    expect(result.valid).toBe(false);
  });

  it("rejects '100% safe' absolute guarantees", () => {
    const result = validateNoMedicalClaims("This product is 100% safe.");
    expect(result.valid).toBe(false);
  });

  it("rejects 'risk-free' guarantees", () => {
    const result = validateNoMedicalClaims(
      "A completely risk-free toy for your child."
    );
    expect(result.valid).toBe(false);
  });

  it("rejects 'guaranteed to heal' claims", () => {
    const result = validateNoMedicalClaims(
      "Guaranteed to improve health outcomes."
    );
    expect(result.valid).toBe(false);
  });

  it("allows medical claims WITH a DOI citation", () => {
    const content =
      "Studies suggest this type of play treats sensory processing challenges (doi: 10.1234/journal.2023.001).";
    const result = validateNoMedicalClaims(content);
    expect(result.valid).toBe(true);
  });

  it("allows medical claims WITH a PMID citation", () => {
    const content =
      "Clinically proven to support fine motor development (PMID: 12345678).";
    const result = validateNoMedicalClaims(content);
    expect(result.valid).toBe(true);
  });

  it("allows medical claims WITH a peer-reviewed reference", () => {
    const content =
      "This therapeutic benefit has been documented in peer-reviewed research from the Journal of Child Development.";
    const result = validateNoMedicalClaims(content);
    expect(result.valid).toBe(true);
  });

  it("allows claims with academic citation format", () => {
    const content =
      "Research shows this cures common developmental delays (Smith et al., 2022).";
    const result = validateNoMedicalClaims(content);
    expect(result.valid).toBe(true);
  });
});

describe("validateAffiliateDisclosureProximity", () => {
  it("passes when disclosure is within 50px", () => {
    const result = validateAffiliateDisclosureProximity({
      linkPosition: { top: 100, left: 200 },
      disclosurePosition: { top: 120, left: 200 },
    });
    expect(result.valid).toBe(true);
  });

  it("passes when disclosure is exactly at the link position", () => {
    const result = validateAffiliateDisclosureProximity({
      linkPosition: { top: 100, left: 200 },
      disclosurePosition: { top: 100, left: 200 },
    });
    expect(result.valid).toBe(true);
  });

  it("fails when disclosure is missing", () => {
    const result = validateAffiliateDisclosureProximity({
      linkPosition: { top: 100, left: 200 },
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe("affiliate-disclosure-proximity");
    expect(result.errors[0].message).toContain("missing a disclosure label");
  });

  it("fails when disclosure is more than 50px away", () => {
    const result = validateAffiliateDisclosureProximity({
      linkPosition: { top: 100, left: 200 },
      disclosurePosition: { top: 200, left: 200 },
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain("100px");
  });

  it("passes at exactly 50px distance", () => {
    const result = validateAffiliateDisclosureProximity({
      linkPosition: { top: 100, left: 200 },
      disclosurePosition: { top: 150, left: 200 },
    });
    expect(result.valid).toBe(true);
  });

  it("fails at 51px distance", () => {
    // 51px vertical distance
    const result = validateAffiliateDisclosureProximity({
      linkPosition: { top: 100, left: 200 },
      disclosurePosition: { top: 151, left: 200 },
    });
    expect(result.valid).toBe(false);
  });

  it("calculates diagonal distance correctly", () => {
    // 30px horizontal + 40px vertical = 50px diagonal (3-4-5 triangle)
    const result = validateAffiliateDisclosureProximity({
      linkPosition: { top: 100, left: 200 },
      disclosurePosition: { top: 140, left: 230 },
    });
    expect(result.valid).toBe(true);
  });

  it("uses MAX_DISCLOSURE_DISTANCE_PX constant", () => {
    expect(MAX_DISCLOSURE_DISTANCE_PX).toBe(50);
  });
});

describe("validateContent (combined)", () => {
  it("passes clean editorial content with no affiliate links", () => {
    const result = validateContent({
      content:
        "This wooden toy is excellent for toddlers. It promotes sensory engagement and fine motor development.",
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("catches both purchase pressure and medical claims", () => {
    const result = validateContent({
      content:
        "Hurry! This clinically proven toy is selling fast. Only 3 left!",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it("validates affiliate disclosure proximity when links provided", () => {
    const result = validateContent({
      content: "Check out this safe toy for your child.",
      affiliateLinks: [
        {
          linkPosition: { top: 100, left: 200 },
          disclosurePosition: { top: 300, left: 200 },
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe("affiliate-disclosure-proximity");
  });

  it("validates multiple affiliate links independently", () => {
    const result = validateContent({
      content: "Great toys for all ages.",
      affiliateLinks: [
        {
          linkPosition: { top: 100, left: 200 },
          disclosurePosition: { top: 110, left: 200 },
        },
        {
          linkPosition: { top: 500, left: 200 },
          // Missing disclosure
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
  });
});
