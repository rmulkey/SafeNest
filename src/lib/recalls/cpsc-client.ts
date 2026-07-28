/**
 * Client for the U.S. CPSC public recall API.
 *
 * Source of truth:
 *   https://www.cpsc.gov/Recalls/CPSC-Recalls-Application-Program-Interface-API-Information
 *   Endpoint: https://www.saferproducts.gov/RestWebServices/Recall?format=json
 *
 * The API is public and requires no key. It returns a JSON array of recall
 * records. Notable behaviours this client accounts for:
 *  - There is no cursor pagination; results are windowed by date and can be
 *    paged with RecallDateStart/RecallDateEnd. Large windows return large
 *    payloads, so we fetch in bounded date chunks.
 *  - The API can be slow, so every request is time-bounded and retried with
 *    exponential backoff on transient failures.
 *  - Field names are PascalCase and several fields are arrays of objects.
 *
 * This module performs network I/O only. Normalisation lives in ./normalize so
 * it can be unit tested against fixtures without hitting the network.
 */

export const CPSC_API_BASE =
  "https://www.saferproducts.gov/RestWebServices/Recall";

export const CPSC_ATTRIBUTION =
  "U.S. Consumer Product Safety Commission (CPSC)";

/** Raw shape of the fields this project consumes. Unused fields are ignored. */
export interface CpscRawRecall {
  RecallID?: number | string;
  RecallNumber?: string;
  RecallDate?: string;
  LastPublishDate?: string;
  Title?: string;
  Description?: string;
  URL?: string;
  Hazards?: Array<{ Name?: string; HazardType?: string }>;
  Remedies?: Array<{ Name?: string }>;
  RemedyOptions?: Array<{ Option?: string }>;
  Products?: Array<{
    Name?: string;
    Description?: string;
    Model?: string;
    Type?: string;
    NumberOfUnits?: string;
  }>;
  Manufacturers?: Array<{ Name?: string }>;
  Retailers?: Array<{ Name?: string }>;
  Images?: Array<{ URL?: string; Caption?: string }>;
  Injuries?: Array<{ Name?: string }>;
}

export interface FetchOptions {
  /** Inclusive ISO date (YYYY-MM-DD) to start from. */
  since: string;
  /** Inclusive ISO date (YYYY-MM-DD) to stop at. Defaults to today. */
  until?: string;
  /** Days per request window. Smaller windows = more requests, smaller payloads. */
  windowDays?: number;
  /** Attempts per window before giving up on it. */
  maxAttempts?: number;
  /** Per-request timeout in ms. */
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  /** Injected for deterministic tests. */
  sleepImpl?: (ms: number) => Promise<void>;
}

export interface FetchResult {
  records: CpscRawRecall[];
  /** Windows that failed every attempt. A non-empty list means a partial sync. */
  failedWindows: Array<{ start: string; end: string; error: string }>;
  requestCount: number;
}

const DAY_MS = 86_400_000;

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Split [since, until] into inclusive windows of at most `windowDays` days. */
export function buildDateWindows(
  since: string,
  until: string,
  windowDays: number
): Array<{ start: string; end: string }> {
  const startMs = Date.parse(`${since}T00:00:00Z`);
  const endMs = Date.parse(`${until}T00:00:00Z`);
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) return [];

  const windows: Array<{ start: string; end: string }> = [];
  let cursor = startMs;
  while (cursor <= endMs) {
    const winEnd = Math.min(cursor + (windowDays - 1) * DAY_MS, endMs);
    windows.push({
      start: toIsoDate(new Date(cursor)),
      end: toIsoDate(new Date(winEnd)),
    });
    cursor = winEnd + DAY_MS;
  }
  return windows;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Fetch recalls from CPSC across a date range.
 *
 * Never throws for individual window failures: partial data plus an explicit
 * `failedWindows` list is more useful than an all-or-nothing error, and it lets
 * the caller refuse to record a "successful sync" when anything failed.
 */
export async function fetchCpscRecalls(
  options: FetchOptions
): Promise<FetchResult> {
  const {
    since,
    until = toIsoDate(new Date()),
    windowDays = 90,
    maxAttempts = 3,
    timeoutMs = 45_000,
    fetchImpl = fetch,
    sleepImpl = defaultSleep,
  } = options;

  const windows = buildDateWindows(since, until, windowDays);
  const records: CpscRawRecall[] = [];
  const failedWindows: FetchResult["failedWindows"] = [];
  let requestCount = 0;

  for (const win of windows) {
    let lastError = "unknown error";
    let ok = false;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const url =
        `${CPSC_API_BASE}?format=json` +
        `&RecallDateStart=${win.start}` +
        `&RecallDateEnd=${win.end}`;
      requestCount++;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetchImpl(url, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        clearTimeout(timer);

        if (!res.ok) {
          lastError = `HTTP ${res.status}`;
          // 4xx other than 429 will not fix themselves; stop retrying.
          if (res.status >= 400 && res.status < 500 && res.status !== 429) break;
        } else {
          const body = (await res.json()) as unknown;
          if (!Array.isArray(body)) {
            lastError = "unexpected response shape (expected array)";
          } else {
            records.push(...(body as CpscRawRecall[]));
            ok = true;
            break;
          }
        }
      } catch (e) {
        lastError = e instanceof Error ? `${e.name}: ${e.message}` : "fetch failed";
      }

      if (attempt < maxAttempts) {
        await sleepImpl(2 ** (attempt - 1) * 1000);
      }
    }

    if (!ok) failedWindows.push({ ...win, error: lastError });
  }

  return { records, failedWindows, requestCount };
}
