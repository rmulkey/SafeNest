import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkLinkHealth } from "./link-checker";

describe("checkLinkHealth", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns healthy for 200 response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ status: 200 })
    );

    const result = await checkLinkHealth("https://example.com/product");
    expect(result.isHealthy).toBe(true);
    expect(result.httpStatus).toBe(200);
  });

  it("returns healthy for 301 redirect response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ status: 301 })
    );

    const result = await checkLinkHealth("https://example.com/redirect");
    expect(result.isHealthy).toBe(true);
    expect(result.httpStatus).toBe(301);
  });

  it("returns unhealthy for 404 response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ status: 404 })
    );

    const result = await checkLinkHealth("https://example.com/missing");
    expect(result.isHealthy).toBe(false);
    expect(result.httpStatus).toBe(404);
  });

  it("returns unhealthy for 500 response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ status: 500 })
    );

    const result = await checkLinkHealth("https://example.com/error");
    expect(result.isHealthy).toBe(false);
    expect(result.httpStatus).toBe(500);
  });

  it("returns unhealthy with null status on network error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error"))
    );

    const result = await checkLinkHealth("https://unreachable.example.com");
    expect(result.isHealthy).toBe(false);
    expect(result.httpStatus).toBeNull();
  });

  it("returns unhealthy with null status on timeout (abort)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError"))
    );

    const result = await checkLinkHealth("https://slow.example.com");
    expect(result.isHealthy).toBe(false);
    expect(result.httpStatus).toBeNull();
  });

  it("uses HEAD method with 10s abort signal", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ status: 200 });
    vi.stubGlobal("fetch", mockFetch);

    await checkLinkHealth("https://example.com");

    expect(mockFetch).toHaveBeenCalledWith("https://example.com", {
      method: "HEAD",
      signal: expect.any(AbortSignal),
      redirect: "follow",
    });
  });
});
