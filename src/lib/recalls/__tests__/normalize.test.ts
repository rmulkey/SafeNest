import { describe, it, expect } from "vitest";
import {
  normalizeRecall,
  normalizeBatch,
  recallDocId,
  isLikelyChildProduct,
} from "../normalize";
import { CPSC_ATTRIBUTION } from "../cpsc-client";
import {
  TEETHING_TOY_RECALL,
  TEETHING_TOY_RECALL_REPUBLISHED,
  MAGNET_RECALL,
  DRESSER_RECALL,
  INCOMPLETE_RECALL,
  ALL_FIXTURES,
} from "./fixtures";

describe("normalizeRecall", () => {
  it("maps a real-shaped CPSC toy recall", () => {
    const n = normalizeRecall(TEETHING_TOY_RECALL)!;
    expect(n.recallNumber).toBe("26-701");
    expect(n.recallId).toBe("30001");
    expect(n.recallDate).toBe("2026-07-23");
    expect(n.lastPublishDate).toBe("2026-07-23");
    expect(n.officialNoticeUrl).toContain("cpsc.gov/Recalls");
    expect(n.productNames).toContain("Sili Factory Pull String Teething Toy");
    expect(n.models).toContain("SF-1180");
    expect(n.hazards[0]).toMatch(/choking hazard/i);
    expect(n.remedies).toContain("Refund");
  });

  it("always records CPSC as the source, so provenance is explicit on-page", () => {
    expect(normalizeRecall(MAGNET_RECALL)!.sourceAttribution).toBe(CPSC_ATTRIBUTION);
  });

  it("strips HTML and entities from descriptions", () => {
    const n = normalizeRecall(TEETHING_TOY_RECALL)!;
    expect(n.description).not.toMatch(/<b>|&nbsp;/);
    expect(n.description).toContain("Sili Factory");
  });

  it("captures the first available image", () => {
    expect(normalizeRecall(TEETHING_TOY_RECALL)!.imageUrl).toContain("teething-toy.jpg");
  });

  it("leaves missing optional data null rather than inventing it", () => {
    const n = normalizeRecall(MAGNET_RECALL)!;
    expect(n.imageUrl).toBeNull();
    expect(n.retailers).toEqual([]);
  });

  it("rejects records without an identifier, date, URL, or title", () => {
    expect(normalizeRecall(INCOMPLETE_RECALL)).toBeNull();
    expect(normalizeRecall({ ...TEETHING_TOY_RECALL, URL: undefined })).toBeNull();
    expect(normalizeRecall({ ...TEETHING_TOY_RECALL, RecallDate: "not-a-date" })).toBeNull();
    expect(
      normalizeRecall({ ...TEETHING_TOY_RECALL, RecallNumber: undefined, RecallID: undefined })
    ).toBeNull();
  });

  it("falls back to RecallID when RecallNumber is absent", () => {
    const n = normalizeRecall({ ...TEETHING_TOY_RECALL, RecallNumber: undefined })!;
    expect(n.recallNumber).toBe("30001");
  });
});

describe("normalizeBatch", () => {
  it("normalises usable records and counts skipped ones", () => {
    const { recalls, skipped } = normalizeBatch(ALL_FIXTURES);
    expect(recalls).toHaveLength(3);
    expect(skipped).toBe(1);
  });

  it("is idempotent: syncing the same payload twice yields identical output", () => {
    const a = normalizeBatch(ALL_FIXTURES).recalls;
    const b = normalizeBatch([...ALL_FIXTURES, ...ALL_FIXTURES]).recalls;
    expect(b.map((r) => r.recallNumber)).toEqual(a.map((r) => r.recallNumber));
  });

  it("collapses duplicate recall numbers from overlapping date windows", () => {
    const { recalls, duplicatesCollapsed } = normalizeBatch([
      TEETHING_TOY_RECALL,
      TEETHING_TOY_RECALL,
    ]);
    expect(recalls).toHaveLength(1);
    expect(duplicatesCollapsed).toBe(1);
  });

  it("prefers the record with the newer LastPublishDate", () => {
    const { recalls } = normalizeBatch([
      TEETHING_TOY_RECALL,
      TEETHING_TOY_RECALL_REPUBLISHED,
    ]);
    expect(recalls).toHaveLength(1);
    expect(recalls[0].lastPublishDate).toBe("2026-07-25");
    expect(recalls[0].description).toMatch(/Updated description/);
  });

  it("does not regress to an older record when order is reversed", () => {
    const { recalls } = normalizeBatch([
      TEETHING_TOY_RECALL_REPUBLISHED,
      TEETHING_TOY_RECALL,
    ]);
    expect(recalls[0].lastPublishDate).toBe("2026-07-25");
  });

  it("sorts newest first", () => {
    const { recalls } = normalizeBatch(ALL_FIXTURES);
    const dates = recalls.map((r) => r.recallDate);
    expect([...dates].sort((a, b) => b.localeCompare(a))).toEqual(dates);
  });
});

describe("recallDocId", () => {
  it("is deterministic and filesystem/id safe", () => {
    expect(recallDocId("26-701")).toBe("recall-cpsc-26-701");
    expect(recallDocId("26-701")).toBe(recallDocId("26-701"));
    expect(recallDocId("26/701 A")).toMatch(/^recall-cpsc-[a-z0-9-]+$/);
  });
});

describe("isLikelyChildProduct", () => {
  it("identifies toy and juvenile recalls", () => {
    expect(isLikelyChildProduct(normalizeRecall(TEETHING_TOY_RECALL)!)).toBe(true);
    expect(isLikelyChildProduct(normalizeRecall(MAGNET_RECALL)!)).toBe(true);
  });

  it("does not classify unrelated furniture as a child product", () => {
    expect(isLikelyChildProduct(normalizeRecall(DRESSER_RECALL)!)).toBe(false);
  });

  it("uses word boundaries so substrings do not false-positive", () => {
    const n = normalizeRecall({
      ...MAGNET_RECALL,
      Title: "Blocking Valves Recalled",
      Description: "Industrial blocking valves.",
      Products: [{ Name: "Blocking Valve" }],
      Hazards: [{ Name: "Burn hazard" }],
    })!;
    expect(isLikelyChildProduct(n)).toBe(false);
  });
});
