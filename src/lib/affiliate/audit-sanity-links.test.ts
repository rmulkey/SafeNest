import { describe, it, expect, vi } from "vitest";
import {
  isSearchUrl,
  isDirectProductUrl,
  buildSearchFallback,
  probeUrl,
  auditReviewLinks,
  type ReviewWithLinks,
} from "./audit-sanity-links";

/** Build a fake fetch returning a given status/body. */
function fakeFetch(status: number, body = "") {
  return vi.fn(async () =>
    new Response(body, { status, headers: { "content-type": "text/html" } })
  ) as unknown as typeof fetch;
}

const review = (over: Partial<ReviewWithLinks> = {}): ReviewWithLinks => ({
  _id: "review-1",
  productName: "Skip Hop Cloud Activity Gym",
  brand: "Skip Hop",
  slug: "skip-hop-activity-gym",
  affiliateLinks: [
    { _key: "amazon-direct", partnerId: "amazon", url: "https://www.amazon.com/dp/B0BS742KZ9" },
  ],
  ...over,
});

describe("URL classification", () => {
  it("detects Amazon search URLs", () => {
    expect(isSearchUrl("https://www.amazon.com/s?k=green+toys")).toBe(true);
    expect(isSearchUrl("https://www.amazon.com/dp/B01ABCDEFG")).toBe(false);
  });

  it("detects direct product URLs", () => {
    expect(isDirectProductUrl("https://www.amazon.com/dp/B0BS742KZ9")).toBe(true);
    expect(isDirectProductUrl("https://www.amazon.com/gp/product/B0BS742KZ9")).toBe(true);
    expect(isDirectProductUrl("https://www.amazon.com/s?k=toy")).toBe(false);
  });
});

describe("buildSearchFallback", () => {
  it("prefixes the brand when the name doesn't already include it", () => {
    expect(buildSearchFallback("Hape", "Rainbow Bead Abacus")).toBe(
      "https://www.amazon.com/s?k=Hape%20Rainbow%20Bead%20Abacus"
    );
  });

  it("does not duplicate a brand already present in the name", () => {
    expect(buildSearchFallback("Hape", "Hape Rainbow Bead Abacus")).toBe(
      "https://www.amazon.com/s?k=Hape%20Rainbow%20Bead%20Abacus"
    );
  });

  it("never produces a /dp/ link", () => {
    expect(buildSearchFallback("Brand", "Product")).not.toContain("/dp/");
  });

  it("omits the affiliate tag (appended at render time)", () => {
    expect(buildSearchFallback("Brand", "Product")).not.toContain("tag=");
  });
});

describe("probeUrl", () => {
  it("reports ok for a healthy page", async () => {
    const r = await probeUrl("https://x.test/a", fakeFetch(200, "<h1>Great Toy</h1>"));
    expect(r.verdict).toBe("ok");
  });

  it("reports dead on a hard 404", async () => {
    const r = await probeUrl("https://x.test/a", fakeFetch(404));
    expect(r.verdict).toBe("dead");
    expect(r.httpStatus).toBe(404);
  });

  it("detects Amazon's soft 404 served with status 200", async () => {
    const r = await probeUrl(
      "https://x.test/a",
      fakeFetch(200, "Sorry! We couldn't find that page")
    );
    expect(r.verdict).toBe("dead");
    expect(r.note).toMatch(/soft 404/);
  });

  it("treats bot-blocking as inconclusive, never dead", async () => {
    for (const status of [503, 429, 403]) {
      const r = await probeUrl("https://x.test/a", fakeFetch(status));
      expect(r.verdict).toBe("inconclusive");
    }
  });

  it("treats a captcha/bot wall body as inconclusive", async () => {
    const r = await probeUrl(
      "https://x.test/a",
      fakeFetch(200, "To discuss automated access contact api-services-support@amazon.com")
    );
    expect(r.verdict).toBe("inconclusive");
  });

  it("treats a network failure as inconclusive, never dead", async () => {
    const boom = vi.fn(async () => {
      throw new Error("ECONNRESET");
    }) as unknown as typeof fetch;
    const r = await probeUrl("https://x.test/a", boom);
    expect(r.verdict).toBe("inconclusive");
    expect(r.httpStatus).toBeNull();
  });
});

describe("auditReviewLinks", () => {
  it("skips search URLs without any network call", async () => {
    const spy = fakeFetch(200);
    const summary = await auditReviewLinks(
      [
        review({
          affiliateLinks: [{ url: "https://www.amazon.com/s?k=hape+abacus" }],
        }),
      ],
      { fetchImpl: spy, delayMs: 0 }
    );
    expect(summary.skipped).toBe(1);
    expect(summary.checked).toBe(1);
    expect(spy).not.toHaveBeenCalled();
  });

  it("flags a dead direct link and suggests a search fallback", async () => {
    const summary = await auditReviewLinks([review()], {
      fetchImpl: fakeFetch(404),
      delayMs: 0,
    });
    expect(summary.dead).toBe(1);
    expect(summary.results[0].suggestedUrl).toBe(
      "https://www.amazon.com/s?k=Skip%20Hop%20Cloud%20Activity%20Gym"
    );
  });

  it("does NOT write anything when autoFix is off (default)", async () => {
    const applyFix = vi.fn();
    const summary = await auditReviewLinks([review()], {
      fetchImpl: fakeFetch(404),
      delayMs: 0,
      applyFix,
    });
    expect(applyFix).not.toHaveBeenCalled();
    expect(summary.fixed).toBe(0);
  });

  it("rewrites a dead direct link to the search fallback when autoFix is on", async () => {
    const applyFix = vi.fn();
    const summary = await auditReviewLinks([review()], {
      fetchImpl: fakeFetch(404),
      delayMs: 0,
      autoFix: true,
      applyFix,
    });
    expect(applyFix).toHaveBeenCalledTimes(1);
    const [, links] = applyFix.mock.calls[0];
    expect((links as Array<{ url: string }>)[0].url).toBe(
      "https://www.amazon.com/s?k=Skip%20Hop%20Cloud%20Activity%20Gym"
    );
    expect(summary.fixed).toBe(1);
  });

  it("preserves other link fields when rewriting the url", async () => {
    const applyFix = vi.fn();
    await auditReviewLinks([review()], {
      fetchImpl: fakeFetch(404),
      delayMs: 0,
      autoFix: true,
      applyFix,
    });
    const [, links] = applyFix.mock.calls[0];
    const link = (links as Array<Record<string, unknown>>)[0];
    expect(link._key).toBe("amazon-direct");
    expect(link.partnerId).toBe("amazon");
  });

  it("never rewrites a link on an inconclusive result", async () => {
    const applyFix = vi.fn();
    const summary = await auditReviewLinks([review()], {
      fetchImpl: fakeFetch(503),
      delayMs: 0,
      autoFix: true,
      applyFix,
    });
    expect(applyFix).not.toHaveBeenCalled();
    expect(summary.inconclusive).toBe(1);
    expect(summary.dead).toBe(0);
  });

  it("leaves healthy links untouched", async () => {
    const applyFix = vi.fn();
    const summary = await auditReviewLinks([review()], {
      fetchImpl: fakeFetch(200, "<h1>Product</h1>"),
      delayMs: 0,
      autoFix: true,
      applyFix,
    });
    expect(applyFix).not.toHaveBeenCalled();
    expect(summary.ok).toBe(1);
  });

  it("handles reviews with no links without throwing", async () => {
    const summary = await auditReviewLinks(
      [review({ affiliateLinks: [] }), review({ affiliateLinks: undefined })],
      { fetchImpl: fakeFetch(200), delayMs: 0 }
    );
    expect(summary.checked).toBe(0);
  });

  it("summarises counts across many reviews", async () => {
    const summary = await auditReviewLinks(
      [
        review({ _id: "a", affiliateLinks: [{ url: "https://www.amazon.com/s?k=x" }] }),
        review({ _id: "b" }),
      ],
      { fetchImpl: fakeFetch(404), delayMs: 0 }
    );
    expect(summary.checked).toBe(2);
    expect(summary.skipped).toBe(1);
    expect(summary.dead).toBe(1);
  });
});
