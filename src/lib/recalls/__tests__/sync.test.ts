import { describe, it, expect, vi } from "vitest";
import type { SanityClient } from "@sanity/client";
import { syncRecalls, SYNC_STATUS_DOC_ID } from "../sync";
import {
  TEETHING_TOY_RECALL,
  DRESSER_RECALL,
  INCOMPLETE_RECALL,
} from "./fixtures";

const NOW = new Date("2026-07-28T12:00:00Z");

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Minimal in-memory stand-in for the Sanity client. */
function makeClient(
  products: Array<{ _id: string; productName: string; brand?: string }> = [],
  existingStatus: Record<string, unknown> | null = null
) {
  const created: Record<string, unknown>[] = [];
  const createdIfNotExists: Record<string, unknown>[] = [];
  const patched: Array<{ id: string; data: unknown }> = [];

  const client = {
    fetch: vi.fn(async (q: string) => {
      if (q.includes("toyReview")) return products;
      if (q.includes("consecutiveFailures") || q.includes("lastSuccessfulSyncAt"))
        return existingStatus;
      return null;
    }),
    createOrReplace: vi.fn(async (doc: Record<string, unknown>) => {
      created.push(doc);
      return doc;
    }),
    createIfNotExists: vi.fn(async (doc: Record<string, unknown>) => {
      createdIfNotExists.push(doc);
      return doc;
    }),
    patch: vi.fn((id: string) => ({
      set: (data: unknown) => ({
        commit: async () => {
          patched.push({ id, data });
        },
      }),
    })),
  };

  return { client: client as unknown as SanityClient, created, createdIfNotExists, patched };
}

const okFetch = (body: unknown) =>
  vi.fn(async () => jsonResponse(body)) as unknown as typeof fetch;

describe("syncRecalls", () => {
  it("persists child-product recalls and records a successful sync", async () => {
    const { client, created } = makeClient();
    const outcome = await syncRecalls(client, {
      now: NOW,
      lookbackDays: 30,
      fetchImpl: okFetch([TEETHING_TOY_RECALL]),
    });

    expect(outcome.ok).toBe(true);
    expect(outcome.persisted).toBe(1);

    const recall = created.find((d) => d._type === "recallAlert")!;
    expect(recall._id).toBe("recall-cpsc-26-701");
    expect(recall.cpscRecallNumber).toBe("26-701");
    expect(recall.issuingAuthority).toMatch(/Consumer Product Safety Commission/);
    expect(recall.officialNoticeUrl).toContain("cpsc.gov");

    const status = created.find((d) => d._id === SYNC_STATUS_DOC_ID)!;
    expect(status.lastAttemptOk).toBe(true);
    expect(status.lastSuccessfulSyncAt).toBe(NOW.toISOString());
    expect(status.consecutiveFailures).toBe(0);
  });

  it("filters out non-child products by default", async () => {
    const { client, created } = makeClient();
    const outcome = await syncRecalls(client, {
      now: NOW,
      fetchImpl: okFetch([DRESSER_RECALL]),
    });
    expect(outcome.usable).toBe(0);
    expect(created.some((d) => d._type === "recallAlert")).toBe(false);
  });

  it("includes non-child products when explicitly requested", async () => {
    const { client } = makeClient();
    const outcome = await syncRecalls(client, {
      now: NOW,
      childProductsOnly: false,
      fetchImpl: okFetch([DRESSER_RECALL]),
    });
    expect(outcome.usable).toBe(1);
  });

  it("skips records too incomplete to represent honestly", async () => {
    const { client } = makeClient();
    // Single date window so the mocked payload is delivered exactly once.
    const outcome = await syncRecalls(client, {
      now: NOW,
      lookbackDays: 10,
      fetchImpl: okFetch([TEETHING_TOY_RECALL, INCOMPLETE_RECALL]),
    });
    expect(outcome.skippedIncomplete).toBe(1);
    expect(outcome.persisted).toBe(1);
  });

  it("is idempotent: the same payload produces the same document id", async () => {
    const a = makeClient();
    const b = makeClient();
    await syncRecalls(a.client, { now: NOW, fetchImpl: okFetch([TEETHING_TOY_RECALL]) });
    await syncRecalls(b.client, { now: NOW, fetchImpl: okFetch([TEETHING_TOY_RECALL]) });
    const idA = a.created.find((d) => d._type === "recallAlert")!._id;
    const idB = b.created.find((d) => d._type === "recallAlert")!._id;
    expect(idA).toBe(idB);
  });

  it("attaches only high-confidence matches and flags those reviews", async () => {
    const { client, created, patched } = makeClient([
      {
        _id: "review-sili",
        productName: "Sili Factory Pull String Teething Toy SF-1180",
        brand: "Sili Factory",
      },
      { _id: "review-unrelated", productName: "Green Toys Dump Truck", brand: "Green Toys" },
    ]);

    const outcome = await syncRecalls(client, {
      now: NOW,
      fetchImpl: okFetch([TEETHING_TOY_RECALL]),
    });

    expect(outcome.confirmedMatches).toBe(1);
    const recall = created.find((d) => d._type === "recallAlert")!;
    expect(JSON.stringify(recall.affectedReviews)).toContain("review-sili");
    expect(JSON.stringify(recall.affectedReviews)).not.toContain("review-unrelated");
    expect(patched.map((p) => p.id)).toEqual(["review-sili"]);
  });

  it("queues uncertain matches for human review instead of publishing them", async () => {
    const { client, created, createdIfNotExists, patched } = makeClient([
      // Brand-only overlap: suggestive, not conclusive.
      { _id: "review-other", productName: "Wooden Shape Sorter", brand: "Aojieni Silicone Co., Ltd." },
    ]);

    const outcome = await syncRecalls(client, {
      now: NOW,
      fetchImpl: okFetch([TEETHING_TOY_RECALL]),
    });

    expect(outcome.confirmedMatches).toBe(0);
    expect(outcome.candidatesQueued).toBe(1);

    const candidate = createdIfNotExists[0];
    expect(candidate._type).toBe("recallMatchCandidate");
    expect(candidate.status).toBe("pending");
    expect(candidate.officialNoticeUrl).toContain("cpsc.gov");
    expect(Array.isArray(candidate.matchEvidence)).toBe(true);

    // Crucially: no review is flagged and no recall claims the product.
    expect(patched).toEqual([]);
    const recall = created.find((d) => d._type === "recallAlert")!;
    expect(recall.affectedReviews).toBeUndefined();
  });

  it("does NOT record a successful sync when any window failed", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({}, 500)) as unknown as typeof fetch;
    const { client, created } = makeClient();

    const outcome = await syncRecalls(client, {
      now: NOW,
      lookbackDays: 10,
      fetchImpl,
      sleepImpl: async () => {},
    });

    expect(outcome.ok).toBe(false);
    expect(outcome.failedWindows.length).toBeGreaterThan(0);
    const status = created.find((d) => d._id === SYNC_STATUS_DOC_ID)!;
    expect(status.lastAttemptOk).toBe(false);
    expect(status.lastSuccessfulSyncAt).toBeUndefined();
    expect(status.lastError).toMatch(/partial sync/);
  });

  it("preserves the previous success timestamp across a failed run", async () => {
    const previous = "2026-07-20T05:00:00.000Z";
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({}, 500)) as unknown as typeof fetch;
    const { client, created } = makeClient([], {
      consecutiveFailures: 2,
      lastSuccessfulSyncAt: previous,
    });

    await syncRecalls(client, { now: NOW, lookbackDays: 10, fetchImpl, sleepImpl: async () => {} });

    const status = created.find((d) => d._id === SYNC_STATUS_DOC_ID)!;
    expect(status.lastSuccessfulSyncAt).toBe(previous);
    expect(status.consecutiveFailures).toBe(3);
  });

  it("writes nothing on a dry run", async () => {
    const { client, created, createdIfNotExists, patched } = makeClient();
    const outcome = await syncRecalls(client, {
      now: NOW,
      dryRun: true,
      fetchImpl: okFetch([TEETHING_TOY_RECALL]),
    });
    expect(outcome.dryRun).toBe(true);
    expect(outcome.usable).toBe(1);
    expect(created).toEqual([]);
    expect(createdIfNotExists).toEqual([]);
    expect(patched).toEqual([]);
  });

  it("never throws on catastrophic failure; reports it instead", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("total network loss");
    }) as unknown as typeof fetch;
    const { client } = makeClient();
    const outcome = await syncRecalls(client, { now: NOW, lookbackDays: 5, fetchImpl, sleepImpl: async () => {} });
    expect(outcome.ok).toBe(false);
  });

  it("collapses duplicate recalls delivered across overlapping windows", async () => {
    const { client, created } = makeClient();
    const outcome = await syncRecalls(client, {
      now: NOW,
      lookbackDays: 30,
      fetchImpl: okFetch([TEETHING_TOY_RECALL, TEETHING_TOY_RECALL]),
    });
    expect(outcome.duplicatesCollapsed).toBe(1);
    expect(created.filter((d) => d._type === "recallAlert")).toHaveLength(1);
  });
});
