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
    /**
     * Transactions record into the same arrays as the single-document methods.
     *
     * syncRecalls batches its writes (see commitChunked) because 433 sequential
     * round trips exceeded the route's 300s limit. Routing the transaction
     * methods to `created`, `createdIfNotExists` and `patched` keeps every
     * existing assertion in this file meaningful without restating it in terms
     * of transactions.
     */
    transaction: vi.fn(() => {
      const tx = {
        createOrReplace: (doc: Record<string, unknown>) => {
          created.push(doc);
          return tx;
        },
        createIfNotExists: (doc: Record<string, unknown>) => {
          createdIfNotExists.push(doc);
          return tx;
        },
        patch: (id: string, ops: { set?: unknown }) => {
          patched.push({ id, data: ops.set });
          return tx;
        },
        commit: async () => undefined,
      };
      return tx;
    }),
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

    // Every product records that it was checked, but only the true match is
    // flagged as recalled.
    const flagged = patched.filter(
      (p) => (p.data as { hasActiveRecall?: boolean }).hasActiveRecall
    );
    expect(flagged.map((p) => p.id)).toEqual(["review-sili"]);
    expect(patched.map((p) => p.id).sort()).toEqual(
      ["review-sili", "review-unrelated"].sort()
    );
    for (const p of patched) {
      expect((p.data as { recallCheckedAt?: string }).recallCheckedAt).toBe(
        NOW.toISOString()
      );
    }
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

    // Crucially: the product records that it was checked, but is NOT flagged as
    // recalled and the recall does not claim it.
    const flagged = patched.filter(
      (p) => (p.data as { hasActiveRecall?: boolean }).hasActiveRecall
    );
    expect(flagged).toEqual([]);
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

describe("syncRecalls — recall-check provenance", () => {
  it("does NOT claim a completed check when a window failed", async () => {
    // A partial fetch means we cannot honestly say a product was checked against
    // the full recall set, so recallCheckedAt must not be written.
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 500 })) as unknown as typeof fetch;
    const { client, patched } = makeClient([
      { _id: "review-a", productName: "Some Toy", brand: "Brand" },
    ]);

    const outcome = await syncRecalls(client, {
      now: NOW,
      lookbackDays: 10,
      fetchImpl,
      sleepImpl: async () => {},
    });

    expect(outcome.ok).toBe(false);
    expect(
      patched.some((p) => (p.data as { recallCheckedAt?: string }).recallCheckedAt)
    ).toBe(false);
  });

  it("records the check date for products with no match at all", async () => {
    const { client, patched } = makeClient([
      { _id: "review-unrelated", productName: "Green Toys Dump Truck", brand: "Green Toys" },
    ]);

    const outcome = await syncRecalls(client, {
      now: NOW,
      lookbackDays: 10,
      fetchImpl: okFetch([TEETHING_TOY_RECALL]),
    });

    expect(outcome.confirmedMatches).toBe(0);
    expect(patched).toHaveLength(1);
    expect((patched[0].data as { recallCheckedAt?: string }).recallCheckedAt).toBe(
      NOW.toISOString()
    );
    // Not flagged as recalled just because it was checked.
    expect((patched[0].data as { hasActiveRecall?: boolean }).hasActiveRecall).toBeUndefined();
  });
});

/**
 * Regression guard for the timeout that made this cron look dead.
 *
 * Before batching, syncRecalls made one HTTP round trip per mutation: one per
 * recall, one per catalogue product, one per match candidate. On 2026-08-26 that
 * was 433 sequential requests against a route declaring maxDuration = 300.
 *
 * It did not fit, and it failed silently. recallCheckedAt reached all 138 reviews
 * at 05:42:46Z with _updatedAt spread over 05:45:20-05:47:39, so the patch loop
 * alone finished 293s after syncedAt. recordSyncStatus never ran, leaving
 * lastAttemptAt at 2026-08-17T16:48Z. Because recordSyncStatus is called on both
 * the success and catch paths, the process must have been killed rather than
 * throwing. /recalls then told readers the last successful sync was nine days
 * earlier than it actually was.
 *
 * These tests pin the batching so a future edit cannot quietly restore
 * per-document commits.
 */
describe("syncRecalls — write batching", () => {
  /** A catalogue big enough to span several chunks (TRANSACTION_CHUNK is 50). */
  const bigCatalog = Array.from({ length: 138 }, (_, i) => ({
    _id: `review-${i}`,
    productName: `Toy ${i}`,
    brand: "TestBrand",
  }));

  it("stamps the whole catalogue without one request per product", async () => {
    const { client, patched } = makeClient(bigCatalog);
    const outcome = await syncRecalls(client, {
      now: NOW,
      fetchImpl: okFetch([TEETHING_TOY_RECALL]),
    });

    expect(outcome.ok).toBe(true);
    // Every product still gets recallCheckedAt — the integrity guarantee that
    // lets a review page say "no matching recall was located as of <date>".
    expect(patched).toHaveLength(bigCatalog.length);
    for (const p of patched) {
      expect((p.data as { recallCheckedAt?: string }).recallCheckedAt).toBe(
        NOW.toISOString()
      );
    }

    // The single-document patch path must not be used at all.
    expect(client.patch).not.toHaveBeenCalled();

    // 138 products in chunks of 50 is 3 transactions, plus one for the recall
    // upsert. Far below the 138 round trips this replaced.
    const txCalls = (client.transaction as unknown as { mock: { calls: unknown[] } })
      .mock.calls.length;
    expect(txCalls).toBeLessThanOrEqual(8);
    expect(txCalls).toBeGreaterThan(0);
  });

  it("still records sync status after batching the catalogue", async () => {
    // The whole point: the status write has to be reachable.
    const { client, created } = makeClient(bigCatalog);
    await syncRecalls(client, {
      now: NOW,
      fetchImpl: okFetch([TEETHING_TOY_RECALL]),
    });
    const status = created.find((d) => d._id === SYNC_STATUS_DOC_ID)!;
    expect(status).toBeDefined();
    expect(status.lastAttemptOk).toBe(true);
    expect(status.lastSuccessfulSyncAt).toBe(NOW.toISOString());
  });

  it("does not use single-document createOrReplace for recall documents", async () => {
    const { client, created } = makeClient(bigCatalog);
    await syncRecalls(client, {
      now: NOW,
      fetchImpl: okFetch([TEETHING_TOY_RECALL]),
    });
    // recallAlert docs go through a transaction; only the status doc is written
    // on its own, because it is a single document and needs read-then-write.
    const direct = (client.createOrReplace as unknown as { mock: { calls: Array<[Record<string, unknown>]> } })
      .mock.calls.map((c) => c[0]);
    expect(direct.every((d) => d._id === SYNC_STATUS_DOC_ID)).toBe(true);
    expect(created.some((d) => d._type === "recallAlert")).toBe(true);
  });

  it("reports persisted as the number of recalls actually committed", async () => {
    const { client } = makeClient(bigCatalog);
    const outcome = await syncRecalls(client, {
      now: NOW,
      fetchImpl: okFetch([TEETHING_TOY_RECALL]),
    });
    expect(outcome.persisted).toBe(outcome.usable);
  });
});
