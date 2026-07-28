import { describe, it, expect } from "vitest";
import { matchProductToRecall, matchRecalls, tokenize } from "../match";
import { normalizeRecall } from "../normalize";
import { TEETHING_TOY_RECALL, MAGNET_RECALL, DRESSER_RECALL } from "./fixtures";

const teething = normalizeRecall(TEETHING_TOY_RECALL)!;
const magnet = normalizeRecall(MAGNET_RECALL)!;
const dresser = normalizeRecall(DRESSER_RECALL)!;

const product = (productName: string, brand?: string) => ({
  _id: `review-${productName.toLowerCase().replace(/\s+/g, "-")}`,
  productName,
  brand,
});

describe("tokenize", () => {
  it("drops generic filler words that carry no matching signal", () => {
    expect(tokenize("My First Wooden Baby Toy Set")).toEqual([]);
  });

  it("keeps distinctive terms", () => {
    expect(tokenize("Sili Factory Pull String Teething")).toContain("teething");
    expect(tokenize("Sili Factory Pull String Teething")).toContain("factory");
  });
});

describe("matchProductToRecall — conservative by design", () => {
  it("confirms on an exact model-number hit", () => {
    const r = matchProductToRecall(
      product("Sili Factory Teething Toy SF-1180", "Sili Factory"),
      teething
    );
    expect(r.confidence).toBe("confirmed");
    expect(r.evidence.join(" ")).toMatch(/SF-1180/);
  });

  it("confirms on brand plus two distinctive shared terms", () => {
    const r = matchProductToRecall(
      product("Sili Factory Pull String Teether", "Aojieni Silicone Co., Ltd."),
      teething
    );
    expect(r.confidence).toBe("confirmed");
  });

  it("NEVER confirms on brand alone", () => {
    // A brand recalling one product must not flag every product by that brand.
    const r = matchProductToRecall(
      product("Wooden Shape Sorter", "Aojieni Silicone Co., Ltd."),
      teething
    );
    expect(r.confidence).toBe("needs-review");
    expect(r.confidence).not.toBe("confirmed");
  });

  it("queues suggestive-but-inconclusive overlap for human review", () => {
    const r = matchProductToRecall(product("Magnetic Building Sticks"), magnet);
    expect(r.confidence).toBe("needs-review");
    expect(r.evidence.join(" ")).toMatch(/human review/i);
  });

  it("returns no-match for an unrelated product", () => {
    expect(matchProductToRecall(product("Green Toys Dump Truck", "Green Toys"), teething).confidence)
      .toBe("no-match");
    expect(matchProductToRecall(product("Hape Rainbow Bead Abacus", "Hape"), dresser).confidence)
      .toBe("no-match");
  });

  it("does not match on generic words shared by unrelated toys", () => {
    // "Toy"/"Set"/"Wooden" are stopwords; no signal should accumulate.
    const r = matchProductToRecall(product("Wooden Toy Set", "Hape"), magnet);
    expect(r.confidence).toBe("no-match");
  });

  it("does not match a brand that only appears as a substring of another word", () => {
    // Regression: the brand "Hape" occurs inside "shape", and toy recalls very
    // often mention "shape sorter". Substring matching flagged every Hape
    // product against any such recall (81 spurious candidates in one real run).
    const shapeRecall = normalizeRecall({
      ...MAGNET_RECALL,
      Title: "Shape Sorter Toys Recalled Due to Choking Hazard",
      Description: "The recalled shape sorter includes small shapes.",
      Products: [{ Name: "Wooden Shape Sorter" }],
      Manufacturers: [{ Name: "Unrelated Firm" }],
    })!;
    const r = matchProductToRecall(product("Hape Rainbow Bead Abacus", "Hape"), shapeRecall);
    expect(r.evidence.join(" ")).not.toMatch(/names the brand/);
    expect(r.confidence).toBe("no-match");
  });

  it("still matches a brand that appears as a whole word", () => {
    const hapeRecall = normalizeRecall({
      ...MAGNET_RECALL,
      Title: "Hape Wooden Trains Recalled",
      Manufacturers: [{ Name: "Hape International" }],
      Products: [{ Name: "Hape Wooden Train" }],
    })!;
    const r = matchProductToRecall(product("Hape Fantasia Blocks Train", "Hape"), hapeRecall);
    expect(r.evidence.join(" ")).toMatch(/names the brand/);
  });

  it("does not treat a shared brand word as a brand hit", () => {
    // "Green Toys" must not match on the word "Toys" appearing in a recall.
    const r = matchProductToRecall(
      product("Green Toys Stacking Cups", "Green Toys"),
      teething
    );
    expect(r.evidence.join(" ")).not.toMatch(/names the brand/);
  });

  it("ignores model strings that are not plausible identifiers", () => {
    const vague = normalizeRecall({
      ...MAGNET_RECALL,
      Products: [{ Name: "Blocks", Model: "All" }],
    })!;
    const r = matchProductToRecall(product("All Purpose Blocks Set", "Brand"), vague);
    expect(r.evidence.join(" ")).not.toMatch(/appears in the product name/);
  });

  it("always explains its decision for auditability", () => {
    const r = matchProductToRecall(
      product("Sili Factory Teething Toy SF-1180", "Sili Factory"),
      teething
    );
    expect(r.evidence.length).toBeGreaterThan(0);
    expect(r.recallNumber).toBe("26-701");
  });
});

describe("matchRecalls", () => {
  const catalog = [
    product("Sili Factory Pull String Teething Toy SF-1180", "Sili Factory"),
    product("Green Toys Dump Truck", "Green Toys"),
    product("Magnetic Building Sticks Set", "Generic Import Co."),
    product("Hape Rainbow Bead Abacus", "Hape"),
    // Brand-only overlap with the magnet recall: the recalled firm also made
    // this unrelated item, so it must be queued for review, never auto-flagged.
    product("Wooden Shape Sorter", "Generic Import Co."),
  ];

  it("separates confirmed matches from review candidates", () => {
    const { confirmed, needsReview } = matchRecalls(catalog, [teething, magnet]);
    expect(confirmed.some((m) => m.productName.includes("Sili Factory"))).toBe(true);
    expect(needsReview.length).toBeGreaterThan(0);
    // Nothing may appear in both buckets.
    const overlap = confirmed.filter((c) =>
      needsReview.some((n) => n.productId === c.productId && n.recallNumber === c.recallNumber)
    );
    expect(overlap).toEqual([]);
  });

  it("never flags an unrelated product as confirmed", () => {
    const { confirmed } = matchRecalls(catalog, [teething, magnet, dresser]);
    expect(confirmed.some((m) => m.productName === "Green Toys Dump Truck")).toBe(false);
    expect(confirmed.some((m) => m.productName === "Hape Rainbow Bead Abacus")).toBe(false);
  });

  it("produces no matches at all for an unrelated recall", () => {
    const { confirmed, needsReview } = matchRecalls(catalog, [dresser]);
    expect(confirmed).toEqual([]);
    expect(needsReview).toEqual([]);
  });

  it("is deterministic across runs", () => {
    const a = matchRecalls(catalog, [teething, magnet]);
    const b = matchRecalls(catalog, [teething, magnet]);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
