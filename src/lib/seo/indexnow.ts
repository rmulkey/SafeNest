/**
 * IndexNow submission.
 *
 * IndexNow is a push protocol: you POST the URLs you changed and participating
 * engines fetch them sooner than they would on their own crawl schedule. One
 * submission to the shared endpoint reaches every participant.
 *
 * IMPORTANT: Google is not an IndexNow participant. This does not submit
 * anything to Google Search. Google offers no equivalent API for a site like
 * this one — its Indexing API accepts only JobPosting and BroadcastEvent pages,
 * and the old sitemap "ping" endpoint was retired in 2024 (it now returns 404).
 * For Google, discovery happens through the `Sitemap:` line in robots.txt and
 * through Search Console, which requires an authenticated site owner.
 *
 * Protocol reference: https://www.indexnow.org/documentation
 */

import { getBaseUrl } from "./sitemap";

/** Shared endpoint — notifies all participating engines in one request. */
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

/**
 * Public path that serves the key file.
 *
 * The protocol's default is `/{key}.txt`, which would need the key at build
 * time; `keyLocation` exists precisely so the file can live at a fixed path
 * instead. Keep this in sync with src/app/indexnow-key.txt/route.ts.
 */
export const INDEXNOW_KEY_PATH = "/indexnow-key.txt";

/**
 * Default key. This is deliberately committed: an IndexNow key is not a secret.
 * Its whole purpose is to be published at a URL on the domain so an engine can
 * confirm that whoever submitted the URLs controls the site. Override with the
 * INDEXNOW_KEY env var to rotate it.
 */
const DEFAULT_INDEXNOW_KEY = "a882bf1344ebaa7bfcb6c8b24e312d60";

/** Keys are 8–128 characters of [a-zA-Z0-9-]. */
const KEY_PATTERN = /^[a-zA-Z0-9-]{8,128}$/;

/** The protocol caps a single submission at 10,000 URLs. */
const MAX_URLS_PER_SUBMISSION = 10_000;

export function getIndexNowKey(): string {
  return process.env.INDEXNOW_KEY || DEFAULT_INDEXNOW_KEY;
}

export function isValidIndexNowKey(key: string): boolean {
  return KEY_PATTERN.test(key);
}

export type IndexNowOutcome =
  | "submitted"
  | "nothing-to-submit"
  | "invalid-key"
  | "rejected"
  | "request-failed";

export interface IndexNowResult {
  outcome: IndexNowOutcome;
  /** Number of URLs actually sent. */
  submitted: number;
  /** HTTP status from the endpoint, when a request was made. */
  status?: number;
  /** URLs dropped because they are not on this site's host. */
  skipped: string[];
  detail?: string;
}

/**
 * Normalises a candidate list into absolute URLs on this site's origin.
 *
 * Anything on another host is dropped rather than sent: IndexNow rejects the
 * whole submission with 422 if a single URL is off-host.
 */
export function prepareUrls(
  urls: string[],
  baseUrl: string
): { urlList: string[]; skipped: string[] } {
  const origin = new URL(baseUrl).origin;
  const urlList: string[] = [];
  const skipped: string[] = [];
  const seen = new Set<string>();

  for (const candidate of urls) {
    let absolute: URL;
    try {
      absolute = new URL(candidate, origin);
    } catch {
      skipped.push(candidate);
      continue;
    }
    if (absolute.origin !== origin) {
      skipped.push(candidate);
      continue;
    }
    const href = absolute.toString();
    if (seen.has(href)) continue;
    seen.add(href);
    urlList.push(href);
  }

  return { urlList: urlList.slice(0, MAX_URLS_PER_SUBMISSION), skipped };
}

/**
 * Submits changed URLs to the IndexNow participants.
 *
 * Best-effort by design: never throws, so a publish or a cron run is not failed
 * by an unreachable third party. The returned result says what actually
 * happened, which is what makes this testable and honest in logs.
 */
export async function submitToIndexNow(
  urls: string[],
  options: { baseUrl?: string; key?: string; timeoutMs?: number } = {}
): Promise<IndexNowResult> {
  const baseUrl = options.baseUrl ?? getBaseUrl();
  const key = options.key ?? getIndexNowKey();
  const { urlList, skipped } = prepareUrls(urls, baseUrl);

  if (!isValidIndexNowKey(key)) {
    return {
      outcome: "invalid-key",
      submitted: 0,
      skipped,
      detail: "INDEXNOW_KEY must be 8-128 characters of a-z, A-Z, 0-9 or '-'",
    };
  }

  if (urlList.length === 0) {
    return { outcome: "nothing-to-submit", submitted: 0, skipped };
  }

  const host = new URL(baseUrl).host;

  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `${new URL(baseUrl).origin}${INDEXNOW_KEY_PATH}`,
        urlList,
      }),
      signal: AbortSignal.timeout(options.timeoutMs ?? 10_000),
    });

    // 200 = accepted; 202 = accepted, key validation still pending.
    if (response.status === 200 || response.status === 202) {
      return {
        outcome: "submitted",
        submitted: urlList.length,
        status: response.status,
        skipped,
      };
    }

    return {
      outcome: "rejected",
      submitted: 0,
      status: response.status,
      skipped,
      detail: describeRejection(response.status),
    };
  } catch (error) {
    return {
      outcome: "request-failed",
      submitted: 0,
      skipped,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

function describeRejection(status: number): string {
  switch (status) {
    case 400:
      return "Bad request — the key or payload was malformed";
    case 403:
      return `Key not valid — check that ${INDEXNOW_KEY_PATH} serves the same key`;
    case 422:
      return "URLs do not belong to the submitted host, or the key does not match";
    case 429:
      return "Rate limited — too many submissions";
    default:
      return `Unexpected status ${status}`;
  }
}
