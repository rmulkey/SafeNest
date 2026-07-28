/**
 * Audits the affiliate links stored on Sanity `toyReview` documents.
 *
 * WHY THIS EXISTS
 * The pre-existing /api/cron/check-links job reads the Postgres
 * `AffiliateLinkStatus` table. Nothing in the codebase ever *creates* rows in
 * that table (only `update`), so that job iterates an empty set and effectively
 * checks nothing. Meanwhile the links customers actually click live on Sanity
 * `toyReview.affiliateLinks[].url`. A dead `/dp/{ASIN}` link therefore stayed
 * live and unnoticed. This module audits the real source of truth.
 *
 * DATA INTEGRITY
 * When a direct `/dp/{ASIN}` link is confirmed dead, the safe remedy prescribed
 * by this project's rules is an Amazon SEARCH url (always valid, preserves
 * attribution) — never a guessed replacement ASIN. Search URLs are inherently
 * valid and are skipped by the audit.
 *
 * Amazon aggressively bot-blocks automated requests. A block is reported as
 * INCONCLUSIVE and never treated as "dead", so we never rewrite a good link on
 * the strength of a 503.
 */

/** Classification for a single audited link. */
export type LinkVerdict = "ok" | "dead" | "inconclusive" | "skipped";

export interface AuditedLink {
  reviewId: string;
  productName: string;
  slug: string;
  url: string;
  verdict: LinkVerdict;
  httpStatus: number | null;
  /** Set when verdict is "dead" and a safe replacement was computed. */
  suggestedUrl?: string;
  note?: string;
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

/** Amazon serves a 200 "page not found" page; these phrases identify it. */
const NOT_FOUND_MARKERS = [
  "sorry! we couldn't find that page",
  "looking for something?",
  "the web address you entered is not a functioning page",
];

/** Phrases indicating we were bot-blocked rather than given a real answer. */
const BOT_BLOCK_MARKERS = [
  "api-services-support@amazon.com",
  "enter the characters you see below",
  "sorry, we just need to make sure you're not a robot",
];

export function isSearchUrl(url: string): boolean {
  return url.includes("/s?k=") || url.includes("/s/?k=");
}

export function isDirectProductUrl(url: string): boolean {
  return /\/dp\/[A-Z0-9]{10}/i.test(url) || /\/gp\/product\//i.test(url);
}

/**
 * Build the safe fallback search URL for a product.
 * Deliberately omits the affiliate tag: the BuyButton appends it at render time,
 * matching how the rest of the catalog stores links.
 */
export function buildSearchFallback(brand: string, productName: string): string {
  const name = productName ?? "";
  const query =
    brand && !name.toLowerCase().includes(brand.toLowerCase())
      ? `${brand} ${name}`
      : name;
  return `https://www.amazon.com/s?k=${encodeURIComponent(query.trim())}`;
}

export interface ProbeResult {
  verdict: Extract<LinkVerdict, "ok" | "dead" | "inconclusive">;
  httpStatus: number | null;
  note?: string;
}

/**
 * Probe a single URL.
 *
 * Uses GET rather than HEAD: Amazon commonly answers HEAD with a status that
 * does not reflect whether the product page really exists, and the 200-with-
 * not-found-body case can only be detected from the body.
 */
export async function probeUrl(
  url: string,
  fetchImpl: typeof fetch = fetch
): Promise<ProbeResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const res = await fetchImpl(url, {
      headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const status = res.status;

    if (status === 404 || status === 410) {
      return { verdict: "dead", httpStatus: status };
    }
    // Rate limiting / bot walls tell us nothing about the product.
    if (status === 503 || status === 429 || status === 403) {
      return {
        verdict: "inconclusive",
        httpStatus: status,
        note: "bot-blocked or rate limited",
      };
    }

    let body = "";
    try {
      body = (await res.text()).toLowerCase();
    } catch {
      // Body unavailable; fall back to status-only judgement below.
    }

    if (body && BOT_BLOCK_MARKERS.some((m) => body.includes(m))) {
      return { verdict: "inconclusive", httpStatus: status, note: "bot wall" };
    }
    if (body && NOT_FOUND_MARKERS.some((m) => body.includes(m))) {
      return {
        verdict: "dead",
        httpStatus: status,
        note: "soft 404 (not-found page served with 200)",
      };
    }
    if (status >= 200 && status < 400) {
      return { verdict: "ok", httpStatus: status };
    }
    return { verdict: "dead", httpStatus: status };
  } catch (e) {
    // Network failure or timeout is not evidence the product is gone.
    return {
      verdict: "inconclusive",
      httpStatus: null,
      note: e instanceof Error ? e.name : "fetch failed",
    };
  }
}

export interface ReviewWithLinks {
  _id: string;
  productName: string;
  brand?: string;
  slug: string;
  affiliateLinks?: Array<{ _key?: string; url?: string; partnerId?: string; tag?: string }>;
}

export interface AuditOptions {
  /** When false (default) nothing is written; dead links are reported only. */
  autoFix?: boolean;
  /** Delay between probes, to stay polite. */
  delayMs?: number;
  fetchImpl?: typeof fetch;
  /** Patch callback, invoked only when autoFix is true. */
  applyFix?: (reviewId: string, links: unknown[]) => Promise<void>;
}

export interface AuditSummary {
  checked: number;
  ok: number;
  dead: number;
  inconclusive: number;
  skipped: number;
  fixed: number;
  results: AuditedLink[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function auditReviewLinks(
  reviews: ReviewWithLinks[],
  options: AuditOptions = {}
): Promise<AuditSummary> {
  const {
    autoFix = false,
    delayMs = 600,
    fetchImpl = fetch,
    applyFix,
  } = options;

  const results: AuditedLink[] = [];
  let fixed = 0;

  for (const review of reviews) {
    const links = review.affiliateLinks ?? [];
    let mutated = false;
    const nextLinks = [...links];

    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      const url = link?.url;
      if (!url) continue;

      // Search URLs are always valid — no network call needed.
      if (isSearchUrl(url)) {
        results.push({
          reviewId: review._id,
          productName: review.productName,
          slug: review.slug,
          url,
          verdict: "skipped",
          httpStatus: null,
          note: "search URL (always valid)",
        });
        continue;
      }

      const probe = await probeUrl(url, fetchImpl);
      const entry: AuditedLink = {
        reviewId: review._id,
        productName: review.productName,
        slug: review.slug,
        url,
        verdict: probe.verdict,
        httpStatus: probe.httpStatus,
        note: probe.note,
      };

      if (probe.verdict === "dead" && isDirectProductUrl(url)) {
        const fallback = buildSearchFallback(
          review.brand ?? "",
          review.productName
        );
        entry.suggestedUrl = fallback;
        if (autoFix && applyFix) {
          nextLinks[i] = { ...link, url: fallback };
          mutated = true;
        }
      }

      results.push(entry);
      if (delayMs > 0) await sleep(delayMs);
    }

    if (mutated && applyFix) {
      await applyFix(review._id, nextLinks);
      fixed += nextLinks.filter((l, i) => l !== links[i]).length;
    }
  }

  return {
    checked: results.length,
    ok: results.filter((r) => r.verdict === "ok").length,
    dead: results.filter((r) => r.verdict === "dead").length,
    inconclusive: results.filter((r) => r.verdict === "inconclusive").length,
    skipped: results.filter((r) => r.verdict === "skipped").length,
    fixed,
    results,
  };
}
