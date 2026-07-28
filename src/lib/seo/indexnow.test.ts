import { describe, it, expect, vi, afterEach } from "vitest";
import {
  prepareUrls,
  isValidIndexNowKey,
  getIndexNowKey,
  submitToIndexNow,
  INDEXNOW_KEY_PATH,
} from "./indexnow";

/**
 * The previous implementation of this feature GET-ed the Bing endpoint with a
 * sitemap URL and no key, which the protocol answers with HTTP 400 — so every
 * content publish silently notified nothing. These tests pin the parts of the
 * request that made it fail: a valid key, a keyLocation, and page URLs (not a
 * sitemap URL) that all belong to the submitted host.
 */

const BASE = "https://safenesttoys.com";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete process.env.INDEXNOW_KEY;
});

describe("isValidIndexNowKey", () => {
  it("accepts keys of 8 to 128 characters from the allowed alphabet", () => {
    expect(isValidIndexNowKey("a882bf1344ebaa7bfcb6c8b24e312d60")).toBe(true);
    expect(isValidIndexNowKey("abcd1234")).toBe(true);
    expect(isValidIndexNowKey("with-dashes-are-fine-1234")).toBe(true);
    expect(isValidIndexNowKey("A".repeat(128))).toBe(true);
  });

  it("rejects keys that are too short, too long, or use illegal characters", () => {
    expect(isValidIndexNowKey("short")).toBe(false);
    expect(isValidIndexNowKey("A".repeat(129))).toBe(false);
    expect(isValidIndexNowKey("has spaces 123")).toBe(false);
    expect(isValidIndexNowKey("has_underscore1")).toBe(false);
    expect(isValidIndexNowKey("")).toBe(false);
  });
});

describe("getIndexNowKey", () => {
  it("ships a valid default so submission works without extra configuration", () => {
    expect(isValidIndexNowKey(getIndexNowKey())).toBe(true);
  });

  it("prefers INDEXNOW_KEY when set, so the key can be rotated", () => {
    process.env.INDEXNOW_KEY = "rotated-key-0001";
    expect(getIndexNowKey()).toBe("rotated-key-0001");
  });
});

describe("prepareUrls", () => {
  it("resolves relative paths against the site origin", () => {
    const { urlList } = prepareUrls(["/reviews/oball-classic-ball"], BASE);
    expect(urlList).toEqual([`${BASE}/reviews/oball-classic-ball`]);
  });

  it("drops off-host URLs instead of sending them", () => {
    // IndexNow rejects the entire submission with 422 if one URL is off-host.
    const { urlList, skipped } = prepareUrls(
      [`${BASE}/reviews/a`, "https://example.com/reviews/b"],
      BASE
    );
    expect(urlList).toEqual([`${BASE}/reviews/a`]);
    expect(skipped).toEqual(["https://example.com/reviews/b"]);
  });

  it("treats the www host as off-host, since the canonical host is the apex", () => {
    const { urlList, skipped } = prepareUrls(
      ["https://www.safenesttoys.com/reviews/a"],
      BASE
    );
    expect(urlList).toEqual([]);
    expect(skipped).toHaveLength(1);
  });

  it("de-duplicates repeated URLs", () => {
    const { urlList } = prepareUrls(
      [`${BASE}/reviews/a`, `${BASE}/reviews/a`, "/reviews/a"],
      BASE
    );
    expect(urlList).toEqual([`${BASE}/reviews/a`]);
  });

  it("caps a submission at the protocol limit of 10,000 URLs", () => {
    const many = Array.from({ length: 10_050 }, (_, i) => `/reviews/toy-${i}`);
    const { urlList } = prepareUrls(many, BASE);
    expect(urlList).toHaveLength(10_000);
  });
});

describe("submitToIndexNow", () => {
  it("POSTs host, key, keyLocation and urlList to the shared endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 200 } as Response);
    vi.stubGlobal("fetch", fetchMock);

    const result = await submitToIndexNow([`${BASE}/reviews/a`], {
      baseUrl: BASE,
      key: "a882bf1344ebaa7bfcb6c8b24e312d60",
    });

    expect(result.outcome).toBe("submitted");
    expect(result.submitted).toBe(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.indexnow.org/indexnow");
    expect(init.method).toBe("POST");

    const body = JSON.parse(init.body as string);
    expect(body).toEqual({
      host: "safenesttoys.com",
      key: "a882bf1344ebaa7bfcb6c8b24e312d60",
      keyLocation: `${BASE}${INDEXNOW_KEY_PATH}`,
      urlList: [`${BASE}/reviews/a`],
    });
  });

  it("treats 202 as accepted (key validation still pending)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 202 } as Response));
    const result = await submitToIndexNow([`${BASE}/reviews/a`], { baseUrl: BASE });
    expect(result.outcome).toBe("submitted");
    expect(result.status).toBe(202);
  });

  it("reports a rejection with an explanation instead of claiming success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 403 } as Response));
    const result = await submitToIndexNow([`${BASE}/reviews/a`], { baseUrl: BASE });
    expect(result.outcome).toBe("rejected");
    expect(result.status).toBe(403);
    expect(result.detail).toContain(INDEXNOW_KEY_PATH);
    expect(result.submitted).toBe(0);
  });

  it("does not send a request when there is nothing on-host to submit", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await submitToIndexNow(["https://example.com/x"], { baseUrl: BASE });

    expect(result.outcome).toBe("nothing-to-submit");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses to submit with a malformed key rather than getting a 400", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await submitToIndexNow([`${BASE}/reviews/a`], {
      baseUrl: BASE,
      key: "nope",
    });

    expect(result.outcome).toBe("invalid-key");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never throws when the endpoint is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const result = await submitToIndexNow([`${BASE}/reviews/a`], { baseUrl: BASE });

    expect(result.outcome).toBe("request-failed");
    expect(result.detail).toContain("network down");
  });
});
