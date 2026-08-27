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

/**
 * Phrases meaning the page is a real product page but the item cannot be bought.
 *
 * These are NOT covered by NOT_FOUND_MARKERS, and that gap let 30 of the 44
 * direct `/dp/{ASIN}` links on the site sit dead while this auditor reported them
 * healthy. Amazon serves an unavailable product with HTTP 200 and a complete,
 * valid-looking page: no 404, no bot wall, and none of the not-found wording. So
 * `probeUrl` returned "ok" and the weekly cron never proposed a fallback.
 *
 * `scripts/verify-direct-links.mjs` had checked for these all along, which is why
 * it reported 30 unavailable while `audit-affiliate-links` reported no hard 404s.
 * Two checks of the same thing at different rigour; this closes the weaker one.
 *
 * For the reader's purposes an unavailable item is as useless as a missing one,
 * and the remedy is the same search fallback, so it resolves to "dead" — with a
 * distinct note, because the causes differ and that matters when auditing.
 */
const UNAVAILABLE_MARKERS = [
  "currently unavailable",
  "no longer available for purchase",
];

/*
 * A buy-affordance guard was tried here first and removed. The idea was to only
 * call a page unavailable when no "add to cart" / "buy now" text was present, so
 * the wording appearing in a recommendations strip would not count. Measured
 * against the real pages, Amazon ships those strings in scripts and
 * other-sellers widgets on unavailable listings too:
 *
 *   B00FZEURMC  Tegu blocks, unavailable   "currently unavailable"=yes  "add to cart"=yes
 *   B0053X62GK  VTech walker, unavailable  "currently unavailable"=yes  "add to cart"=yes
 *   B000BNCA4K  Winkel rattle, buyable     "currently unavailable"=NO   "add to cart"=yes
 *
 * The guard therefore suppressed every detection — all 44 links came back "ok".
 * The phrase alone is what discriminates: absent on the buyable control, present
 * on both dead ones. Residual risk accepted: a buyable page that happens to carry
 * the phrase elsewhere reads as dead, and the remedy is a search URL for the same
 * product, which is a safe outcome rather than a broken one.
 */

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
    // Real product page, unbuyable item. Checked after the bot-wall and
    // not-found branches so those keep their more specific verdicts.
    if (body && UNAVAILABLE_MARKERS.some((m) => body.includes(m))) {
      return {
        verdict: "dead",
        httpStatus: status,
        note: "product currently unavailable (200 with no buy affordance)",
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
  /**
   * How many times to probe a URL while the answer stays inconclusive.
   * Set to 1 in tests to keep them fast and deterministic.
   */
  probeAttempts?: number;
  /** Base backoff between inconclusive attempts; doubles each time. */
  probeBackoffMs?: number;
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

/**
 * Probe a URL, retrying with backoff while the answer is inconclusive.
 *
 * WHY
 * "Inconclusive" almost always means Amazon rate-limited or bot-walled us, which
 * says nothing about the product. Without a retry the link is skipped and the run
 * makes no progress on it, and because throttling gets worse with request volume,
 * simply running the audit again does not help: a full pass over 138 reviews went
 * from 22 inconclusive to 37 on the second attempt, fixing only 4 of 30 known
 * dead links.
 *
 * Backoff turns most of those into a real verdict within the same run, which is
 * what lets the weekly cron actually converge instead of stalling on the same
 * links every week.
 */
async function probeWithBackoff(
  url: string,
  fetchImpl: typeof fetch,
  attempts: number,
  backoffMs: number
): Promise<ProbeResult> {
  let last: ProbeResult = { verdict: "inconclusive", httpStatus: null };
  for (let attempt = 0; attempt < Math.max(1, attempts); attempt += 1) {
    last = await probeUrl(url, fetchImpl);
    if (last.verdict !== "inconclusive") return last;
    if (attempt < attempts - 1) {
      // Doubling each time: a throttle that just tripped needs real time to clear.
      await sleep(backoffMs * 2 ** attempt);
    }
  }
  return last;
}

export async function auditReviewLinks(
  reviews: ReviewWithLinks[],
  options: AuditOptions = {}
): Promise<AuditSummary> {
  const {
    autoFix = false,
    delayMs = 600,
    fetchImpl = fetch,
    applyFix,
    probeAttempts = 3,
    probeBackoffMs = 2_000,
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

      const probe = await probeWithBackoff(
        url,
        fetchImpl,
        probeAttempts,
        probeBackoffMs
      );
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
