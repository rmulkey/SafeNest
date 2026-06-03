import { describe, it, expect, vi, beforeEach } from "vitest";
import { slugifyProductName, publishOneQueued, type QueuedProductDoc } from "./publish-queued";

// Mock the scoring + link-builder deps so the unit under test is isolated.
vi.mock("@/lib/scoring/safety-score", () => ({
  computeSafetyScore: () => 90,
}));
vi.mock("@/lib/scoring/development-score", () => ({
  computeDevelopmentScore: () => 85,
}));

import { isValidAffiliateUrl } from "@/lib/affiliate/link-builder";

function makeQueued(overrides: Partial<QueuedProductDoc> = {}): QueuedProductDoc {
  return {
    _id: "queued-1",
    productName: "Test Wooden Blocks",
    brand: "TestBrand",
    categoryRef: "cat-building",
    ageMinMonths: 12,
    ageMaxMonths: 36,
    affiliateUrl: "https://www.amazon.com/s?k=test+wooden+blocks",
    imageUrl: "https://cdn.example.com/blocks.jpg",
    imageAlt: "Test Wooden Blocks",
    materialSafety: 90,
    chokingRisk: 85,
    recallHistory: 95,
    certificationPresence: 90,
    motorSkills: 88,
    cognitiveSkills: 90,
    sensoryEngagement: 80,
    materials: ["wood"],
    chokingHazardAssessment: "No small parts.",
    certifications: ["ASTM F963"],
    pros: ["Durable"],
    cons: ["Pricey"],
    ...overrides,
  };
}

describe("slugifyProductName", () => {
  it("lowercases, strips punctuation, and hyphenates", () => {
    expect(slugifyProductName("Melissa & Doug Shape Sorter!")).toBe(
      "melissa-and-doug-shape-sorter"
    );
  });

  it("handles apostrophes and trims length", () => {
    expect(slugifyProductName("Baby's First Blocks")).toBe("babys-first-blocks");
  });

  it("collapses repeated separators", () => {
    expect(slugifyProductName("A   --  B")).toBe("a-b");
  });
});

/**
 * A minimal fake Sanity client capturing calls so we can assert the publisher's
 * verification gating without touching the network or a real dataset.
 */
function makeFakeClient(opts: {
  existingSlug?: boolean;
  uploadOk?: boolean;
}) {
  const calls = {
    created: [] as unknown[],
    patches: [] as Array<Record<string, unknown>>,
    uploads: 0,
  };
  const client = {
    fetch: vi.fn(async () => (opts.existingSlug ? "review-existing" : null)),
    assets: {
      upload: vi.fn(async () => {
        calls.uploads += 1;
        if (opts.uploadOk === false) throw new Error("upload failed");
        return { _id: "image-asset-1" };
      }),
    },
    createOrReplace: vi.fn(async (doc: unknown) => {
      calls.created.push(doc);
      return doc;
    }),
    patch: vi.fn((_id: string) => ({
      set: (data: Record<string, unknown>) => ({
        commit: async () => {
          calls.patches.push(data);
        },
      }),
    })),
  };
  return { client, calls };
}

describe("publishOneQueued — data-integrity gate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("refuses to publish a fabricated /dp/ URL that fails validation", async () => {
    // A non-resolving fabricated dp link is NOT a valid stored URL by our rule;
    // isValidAffiliateUrl accepts /dp/ only structurally, so use a clearly
    // invalid (non-amazon) URL to exercise the gate.
    const { client, calls } = makeFakeClient({});
    const q = makeQueued({ affiliateUrl: "https://not-amazon.example.com/x" });

    // Sanity check our assumption about the validator.
    expect(isValidAffiliateUrl(q.affiliateUrl)).toBe(false);

    const outcome = await publishOneQueued(client as never, q);

    expect(outcome.status).toBe("failed");
    expect(outcome.error).toMatch(/invalid affiliate URL/i);
    // No toyReview created, no image uploaded.
    expect(calls.created).toHaveLength(0);
    expect(calls.uploads).toBe(0);
    // Queue doc marked failed.
    expect(calls.patches.some((p) => p.status === "failed")).toBe(true);
  });

  it("skips (does not duplicate) when the slug already exists", async () => {
    const { client, calls } = makeFakeClient({ existingSlug: true });
    const outcome = await publishOneQueued(client as never, makeQueued());

    expect(outcome.status).toBe("skipped-duplicate");
    expect(calls.created).toHaveLength(0);
    expect(calls.uploads).toBe(0);
  });

  it("marks failed (and publishes nothing) when the image cannot be verified", async () => {
    // Image fetch will reject because global fetch returns a non-image.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        headers: { get: () => "text/html" },
        arrayBuffer: async () => new ArrayBuffer(5000),
      }))
    );
    const { client, calls } = makeFakeClient({});
    const outcome = await publishOneQueued(client as never, makeQueued());

    expect(outcome.status).toBe("failed");
    expect(outcome.error).toMatch(/not an image/i);
    expect(calls.created).toHaveLength(0);
    vi.unstubAllGlobals();
  });

  it("publishes a real product when URL + image both verify", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        headers: { get: () => "image/jpeg" },
        arrayBuffer: async () => new ArrayBuffer(50_000),
      }))
    );
    const { client, calls } = makeFakeClient({});
    const outcome = await publishOneQueued(client as never, makeQueued());

    expect(outcome.status).toBe("published");
    expect(outcome.reviewId).toBe("review-test-wooden-blocks");
    expect(calls.created).toHaveLength(1);
    expect(calls.uploads).toBe(1);
    expect(calls.patches.some((p) => p.status === "published")).toBe(true);
    vi.unstubAllGlobals();
  });
});
