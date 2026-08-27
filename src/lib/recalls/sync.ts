/**
 * CPSC recall synchronisation orchestrator.
 *
 * Flow: fetch (windowed, retried) -> normalise + dedupe -> idempotent upsert ->
 * match against catalog -> queue uncertain matches -> record sync status.
 *
 * INTEGRITY GUARANTEES
 *  - `lastSuccessfulSyncAt` is written ONLY when zero windows failed. A partial
 *    fetch is recorded as a failed attempt, so the freshness indicator can never
 *    overstate coverage.
 *  - Upserts are keyed on the CPSC recall number, so re-running is idempotent.
 *  - Only high-confidence matches are attached to a review. Weaker signals become
 *    `recallMatchCandidate` documents for human adjudication.
 *  - Nothing about a recall is inferred; every stored field comes from CPSC.
 */
import type { SanityClient, Transaction } from "@sanity/client";
import { fetchCpscRecalls, toIsoDate, CPSC_ATTRIBUTION } from "./cpsc-client";
import {
  normalizeBatch,
  recallDocId,
  isLikelyChildProduct,
  type NormalizedRecall,
} from "./normalize";
import { matchRecalls, type CatalogProduct } from "./match";

export const SYNC_STATUS_DOC_ID = "recall-sync-status";

/** How far back to look on a routine run. */
export const DEFAULT_LOOKBACK_DAYS = 180;

export interface SyncOptions {
  /** Days of history to fetch. */
  lookbackDays?: number;
  /** Only persist recalls that look like child/juvenile products. */
  childProductsOnly?: boolean;
  fetchImpl?: typeof fetch;
  now?: Date;
  /** Skip all writes; used to preview a run. */
  dryRun?: boolean;
  /** Injected in tests so retry backoff does not add real delay. */
  sleepImpl?: (ms: number) => Promise<void>;
}

export interface SyncOutcome {
  ok: boolean;
  fetched: number;
  usable: number;
  persisted: number;
  duplicatesCollapsed: number;
  skippedIncomplete: number;
  confirmedMatches: number;
  candidatesQueued: number;
  failedWindows: Array<{ start: string; end: string; error: string }>;
  error?: string;
  dryRun: boolean;
}

function buildRecallDoc(r: NormalizedRecall, syncedAt: string) {
  return {
    _id: recallDocId(r.recallNumber),
    _type: "recallAlert" as const,
    // Existing display fields
    affectedProduct: r.productNames[0] ?? r.title,
    recallDate: r.recallDate,
    recallReason: r.hazards.join(" ") || r.description || r.title,
    issuingAuthority: CPSC_ATTRIBUTION,
    recommendedAction:
      r.remedies.join("; ") ||
      "See the official CPSC notice for remedy instructions.",
    officialNoticeUrl: r.officialNoticeUrl,
    isResolved: false,
    publishedAt: `${r.recallDate}T00:00:00Z`,
    // Provenance
    cpscRecallNumber: r.recallNumber,
    hazards: r.hazards,
    affectedModels: r.models,
    manufacturers: r.manufacturers,
    isLikelyChildProduct: isLikelyChildProduct(r),
    syncedAt,
    sourceAttribution: CPSC_ATTRIBUTION,
  };
}

/**
 * Run a synchronisation.
 *
 * Never throws: the outcome object always describes what happened so the caller
 * (a cron route) can log, alert, and return a useful status.
 */
export async function syncRecalls(
  client: SanityClient,
  options: SyncOptions = {}
): Promise<SyncOutcome> {
  const {
    lookbackDays = DEFAULT_LOOKBACK_DAYS,
    childProductsOnly = true,
    fetchImpl = fetch,
    now = new Date(),
    dryRun = false,
    sleepImpl,
  } = options;

  const base: SyncOutcome = {
    ok: false,
    fetched: 0,
    usable: 0,
    persisted: 0,
    duplicatesCollapsed: 0,
    skippedIncomplete: 0,
    confirmedMatches: 0,
    candidatesQueued: 0,
    failedWindows: [],
    dryRun,
  };

  try {
    const since = toIsoDate(
      new Date(now.getTime() - lookbackDays * 86_400_000)
    );
    const fetchRes = await fetchCpscRecalls({
      since,
      until: toIsoDate(now),
      fetchImpl,
      ...(sleepImpl ? { sleepImpl } : {}),
    });

    const { recalls, skipped, duplicatesCollapsed } = normalizeBatch(
      fetchRes.records
    );
    const relevant = childProductsOnly
      ? recalls.filter(isLikelyChildProduct)
      : recalls;

    base.fetched = fetchRes.records.length;
    base.usable = relevant.length;
    base.duplicatesCollapsed = duplicatesCollapsed;
    base.skippedIncomplete = skipped;
    base.failedWindows = fetchRes.failedWindows;

    const products = await client.fetch<CatalogProduct[]>(
      `*[_type == "toyReview"]{_id, productName, brand, "slug": slug.current}`
    );
    const { confirmed, needsReview } = matchRecalls(products, relevant);
    base.confirmedMatches = confirmed.length;
    base.candidatesQueued = needsReview.length;

    if (dryRun) {
      // A dry run reports what it would do but records no sync, so it cannot be
      // mistaken for real coverage.
      base.ok = fetchRes.failedWindows.length === 0;
      return base;
    }

    const syncedAt = now.toISOString();

    // Idempotent upsert of recall documents.
    await commitChunked(client, relevant, (tx, r) => {
      const doc = buildRecallDoc(r, syncedAt);
      const confirmedForThis = confirmed.filter(
        (m) => m.recallNumber === r.recallNumber
      );
      tx.createOrReplace({
        ...doc,
        ...(confirmedForThis.length
          ? {
              affectedReviews: confirmedForThis.map((m, i) => ({
                _type: "reference" as const,
                _ref: m.productId,
                _key: `aff${i}`,
              })),
            }
          : {}),
      });
    });
    // A chunk is atomic, so a resolved commit means every document in it landed.
    base.persisted = relevant.length;

    // Record that every product in the catalog was compared against this recall
    // set, and when. This is what lets a review page state "No matching CPSC
    // recall was located as of <date>" truthfully instead of staying silent —
    // silence reads as reassurance. Only written on a clean fetch, so a partial
    // run cannot imply a complete check.
    const confirmedIds = new Set(confirmed.map((m) => m.productId));
    if (fetchRes.failedWindows.length === 0) {
      await commitChunked(client, products, (tx, p) => {
        tx.patch(p._id, {
          set: {
            recallCheckedAt: syncedAt,
            ...(confirmedIds.has(p._id) ? { hasActiveRecall: true } : {}),
          },
        });
      });
    } else {
      // Still flag confirmed hits from the partial data, but do not claim a
      // complete check for anything.
      await commitChunked(client, [...confirmedIds], (tx, id) => {
        tx.patch(id, { set: { hasActiveRecall: true } });
      });
    }

    // Queue uncertain matches for human adjudication (idempotent by key).
    await commitChunked(client, needsReview, (tx, m) => {
      const recall = relevant.find((r) => r.recallNumber === m.recallNumber);
      tx.createIfNotExists({
        _id: `recall-candidate-${m.recallNumber}-${m.productId}`.replace(
          /[^a-zA-Z0-9-]/g,
          "-"
        ),
        _type: "recallMatchCandidate",
        status: "pending",
        recallNumber: m.recallNumber,
        recallTitle: recall?.title,
        officialNoticeUrl: recall?.officialNoticeUrl,
        review: { _type: "reference", _ref: m.productId },
        matchEvidence: m.evidence,
        matchScore: m.score,
        detectedAt: syncedAt,
      });
    });

    const allWindowsOk = fetchRes.failedWindows.length === 0;
    base.ok = allWindowsOk;

    await recordSyncStatus(client, {
      ok: allWindowsOk,
      now,
      outcome: base,
      error: allWindowsOk
        ? undefined
        : `partial sync: ${fetchRes.failedWindows.length} window(s) failed`,
    });

    return base;
  } catch (e) {
    base.error = e instanceof Error ? e.message : "unknown error";
    if (!dryRun) {
      await recordSyncStatus(client, {
        ok: false,
        now,
        outcome: base,
        error: base.error,
      }).catch(() => {});
    }
    return base;
  }
}

/**
 * Mutations per transaction.
 *
 * Chosen to keep each request small enough to be quick and retryable while still
 * collapsing hundreds of round trips into a handful.
 */
const TRANSACTION_CHUNK = 50;

/**
 * Commit many mutations as chunked transactions instead of one request each.
 *
 * WHY THIS EXISTS
 * This function used to issue one HTTP round trip per mutation: one
 * `createOrReplace` per recall, one `patch().commit()` per catalogue product, one
 * `createIfNotExists` per match candidate. On 2026-08-26 that was 204 + 138 + 91
 * = 433 sequential requests against a route declaring `maxDuration = 300`.
 *
 * It did not fit, and the failure was silent and misleading. Measured on
 * production: `recallCheckedAt` was written to all 138 reviews at
 * 2026-08-26T05:42:46Z, with `_updatedAt` spread across 05:45:20-05:47:39 — the
 * patch loop alone finished 293 seconds after `syncedAt`, with 91 candidate
 * writes still to come. `recordSyncStatus` never ran, so
 * `recallSyncStatus.lastAttemptAt` stayed at 2026-08-17T16:48Z. Since
 * `recordSyncStatus` is called on both the success path and the catch path, the
 * only explanation is the process being killed rather than throwing.
 *
 * The visible result was `/recalls` telling readers "The last successful
 * synchronisation was 2026-08-17 16:48 UTC" when the check had run that morning,
 * and `audit-catalog-health` reporting the cron as not running at all.
 *
 * ATOMICITY CHANGE, DELIBERATE
 * A transaction is all-or-nothing, so a chunk either lands completely or not at
 * all. That is a change from the previous behaviour, where a mid-loop failure
 * left some products stamped and others not. Atomic is the safer direction here:
 * `recallCheckedAt` is what licenses a review page to say "no matching CPSC
 * recall was located as of <date>", and a half-stamped catalogue means some pages
 * make that claim on the back of a run that never finished.
 *
 * `visibility: "async"` is used because nothing downstream reads these documents
 * back within the same request, and waiting for query visibility is most of the
 * latency.
 */
async function commitChunked<T>(
  client: SanityClient,
  items: readonly T[],
  add: (tx: Transaction, item: T) => void
): Promise<void> {
  for (let i = 0; i < items.length; i += TRANSACTION_CHUNK) {
    const chunk = items.slice(i, i + TRANSACTION_CHUNK);
    const tx = client.transaction();
    for (const item of chunk) {
      add(tx, item);
    }
    await tx.commit({ visibility: "async" });
  }
}

async function recordSyncStatus(
  client: SanityClient,
  args: {
    ok: boolean;
    now: Date;
    outcome: SyncOutcome;
    error?: string;
  }
): Promise<void> {
  const { ok, now, outcome, error } = args;

  const previous = await client
    .fetch<{ consecutiveFailures?: number } | null>(
      `*[_id == $id][0]{consecutiveFailures}`,
      { id: SYNC_STATUS_DOC_ID }
    )
    .catch(() => null);

  const consecutiveFailures = ok
    ? 0
    : (previous?.consecutiveFailures ?? 0) + 1;

  await client.createOrReplace({
    _id: SYNC_STATUS_DOC_ID,
    _type: "recallSyncStatus",
    // Only advance the successful-sync marker on a fully clean run.
    ...(ok ? { lastSuccessfulSyncAt: now.toISOString() } : {}),
    ...(!ok
      ? await preserveLastSuccess(client)
      : {}),
    lastAttemptAt: now.toISOString(),
    lastAttemptOk: ok,
    lastError: error ?? null,
    consecutiveFailures,
    recallsFetched: outcome.fetched,
    recallsUpserted: outcome.persisted,
    duplicatesCollapsed: outcome.duplicatesCollapsed,
    skippedIncomplete: outcome.skippedIncomplete,
    matchCandidatesQueued: outcome.candidatesQueued,
    sourceAttribution: CPSC_ATTRIBUTION,
  });
}

/**
 * createOrReplace overwrites the whole document, so a failed run must carry the
 * previous success timestamp forward or freshness history would be lost.
 */
async function preserveLastSuccess(
  client: SanityClient
): Promise<{ lastSuccessfulSyncAt?: string }> {
  const prev = await client
    .fetch<{ lastSuccessfulSyncAt?: string } | null>(
      `*[_id == $id][0]{lastSuccessfulSyncAt}`,
      { id: SYNC_STATUS_DOC_ID }
    )
    .catch(() => null);
  return prev?.lastSuccessfulSyncAt
    ? { lastSuccessfulSyncAt: prev.lastSuccessfulSyncAt }
    : {};
}

/** Read the current freshness inputs for display. */
export async function getRecallSyncStatus(client: SanityClient): Promise<{
  lastSuccessfulSyncAt: string | null;
  lastAttemptAt: string | null;
  lastAttemptOk: boolean | null;
  consecutiveFailures: number | null;
}> {
  const doc = await client
    .fetch<{
      lastSuccessfulSyncAt?: string;
      lastAttemptAt?: string;
      lastAttemptOk?: boolean;
      consecutiveFailures?: number;
    } | null>(
      `*[_id == $id][0]{lastSuccessfulSyncAt, lastAttemptAt, lastAttemptOk, consecutiveFailures}`,
      { id: SYNC_STATUS_DOC_ID }
    )
    .catch(() => null);

  return {
    lastSuccessfulSyncAt: doc?.lastSuccessfulSyncAt ?? null,
    lastAttemptAt: doc?.lastAttemptAt ?? null,
    lastAttemptOk: doc?.lastAttemptOk ?? null,
    consecutiveFailures: doc?.consecutiveFailures ?? null,
  };
}
