import { describe, it, expect, vi } from "vitest";
import { buildDateWindows, fetchCpscRecalls, toIsoDate } from "../cpsc-client";
import { TEETHING_TOY_RECALL, MAGNET_RECALL } from "./fixtures";

const noSleep = async () => {};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("buildDateWindows", () => {
  it("covers the range in inclusive windows", () => {
    const w = buildDateWindows("2026-01-01", "2026-01-10", 5);
    expect(w).toEqual([
      { start: "2026-01-01", end: "2026-01-05" },
      { start: "2026-01-06", end: "2026-01-10" },
    ]);
  });

  it("does not skip or overlap days", () => {
    const w = buildDateWindows("2026-01-01", "2026-03-31", 30);
    expect(w[0].start).toBe("2026-01-01");
    expect(w[w.length - 1].end).toBe("2026-03-31");
    for (let i = 1; i < w.length; i++) {
      const prevEnd = Date.parse(w[i - 1].end + "T00:00:00Z");
      const thisStart = Date.parse(w[i].start + "T00:00:00Z");
      expect(thisStart - prevEnd).toBe(86_400_000);
    }
  });

  it("handles a single-day range", () => {
    expect(buildDateWindows("2026-05-05", "2026-05-05", 90)).toEqual([
      { start: "2026-05-05", end: "2026-05-05" },
    ]);
  });

  it("returns nothing for an inverted or invalid range", () => {
    expect(buildDateWindows("2026-05-05", "2026-01-01", 30)).toEqual([]);
    expect(buildDateWindows("nonsense", "2026-01-01", 30)).toEqual([]);
  });
});

describe("fetchCpscRecalls", () => {
  it("aggregates records across windows", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([TEETHING_TOY_RECALL]))
      .mockResolvedValueOnce(jsonResponse([MAGNET_RECALL])) as unknown as typeof fetch;

    const res = await fetchCpscRecalls({
      since: "2026-01-01",
      until: "2026-01-10",
      windowDays: 5,
      fetchImpl,
      sleepImpl: noSleep,
    });

    expect(res.records).toHaveLength(2);
    expect(res.failedWindows).toEqual([]);
    expect(res.requestCount).toBe(2);
  });

  it("requests the documented CPSC endpoint with date bounds", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse([])) as unknown as typeof fetch;
    await fetchCpscRecalls({
      since: "2026-02-01",
      until: "2026-02-05",
      windowDays: 90,
      fetchImpl,
      sleepImpl: noSleep,
    });
    const url = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("saferproducts.gov/RestWebServices/Recall");
    expect(url).toContain("format=json");
    expect(url).toContain("RecallDateStart=2026-02-01");
    expect(url).toContain("RecallDateEnd=2026-02-05");
  });

  it("retries transient server errors then succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 500))
      .mockResolvedValueOnce(jsonResponse([TEETHING_TOY_RECALL])) as unknown as typeof fetch;

    const res = await fetchCpscRecalls({
      since: "2026-01-01",
      until: "2026-01-02",
      fetchImpl,
      sleepImpl: noSleep,
    });
    expect(res.records).toHaveLength(1);
    expect(res.failedWindows).toEqual([]);
  });

  it("records a failed window after exhausting retries, without throwing", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, 500)) as unknown as typeof fetch;
    const res = await fetchCpscRecalls({
      since: "2026-01-01",
      until: "2026-01-02",
      maxAttempts: 2,
      fetchImpl,
      sleepImpl: noSleep,
    });
    expect(res.records).toEqual([]);
    expect(res.failedWindows).toHaveLength(1);
    expect(res.failedWindows[0].error).toBe("HTTP 500");
  });

  it("does not retry a non-retryable 4xx", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, 400)) as unknown as typeof fetch;
    await fetchCpscRecalls({
      since: "2026-01-01",
      until: "2026-01-02",
      maxAttempts: 3,
      fetchImpl,
      sleepImpl: noSleep,
    });
    expect((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });

  it("retries a 429 rate limit", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 429))
      .mockResolvedValueOnce(jsonResponse([MAGNET_RECALL])) as unknown as typeof fetch;
    const res = await fetchCpscRecalls({
      since: "2026-01-01",
      until: "2026-01-02",
      fetchImpl,
      sleepImpl: noSleep,
    });
    expect(res.records).toHaveLength(1);
  });

  it("treats a network throw as a retryable failure", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("ECONNRESET")) as unknown as typeof fetch;
    const res = await fetchCpscRecalls({
      since: "2026-01-01",
      until: "2026-01-02",
      maxAttempts: 2,
      fetchImpl,
      sleepImpl: noSleep,
    });
    expect(res.failedWindows).toHaveLength(1);
    expect(res.failedWindows[0].error).toMatch(/ECONNRESET/);
  });

  it("rejects an unexpected non-array payload rather than storing junk", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: "nope" })) as unknown as typeof fetch;
    const res = await fetchCpscRecalls({
      since: "2026-01-01",
      until: "2026-01-02",
      maxAttempts: 1,
      fetchImpl,
      sleepImpl: noSleep,
    });
    expect(res.records).toEqual([]);
    expect(res.failedWindows[0].error).toMatch(/unexpected response shape/);
  });
});

describe("toIsoDate", () => {
  it("formats as YYYY-MM-DD", () => {
    expect(toIsoDate(new Date("2026-07-28T23:45:00Z"))).toBe("2026-07-28");
  });
});
