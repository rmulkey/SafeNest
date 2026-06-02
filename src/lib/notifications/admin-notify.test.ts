import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  notifyAdminUnhealthyLinks,
  UnhealthyLinkAlert,
} from "./admin-notify";

describe("notifyAdminUnhealthyLinks", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const sampleLinks: UnhealthyLinkAlert[] = [
    {
      linkId: "link-1",
      destinationUrl: "https://amazon.com/product/123",
      httpStatus: 404,
      flaggedAt: new Date("2024-01-15T10:00:00Z"),
    },
    {
      linkId: "link-2",
      destinationUrl: "https://target.com/toy/456",
      httpStatus: null,
      flaggedAt: new Date("2024-01-15T10:00:00Z"),
    },
  ];

  it("returns true for empty array (no notification needed)", async () => {
    const result = await notifyAdminUnhealthyLinks([]);
    expect(result).toBe(true);
  });

  it("sends POST to webhook URL when configured", async () => {
    process.env.ADMIN_WEBHOOK_URL = "https://hooks.slack.com/test";
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    const result = await notifyAdminUnhealthyLinks(sampleLinks);

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://hooks.slack.com/test",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.type).toBe("unhealthy_links");
    expect(body.links).toHaveLength(2);
    expect(body.summary).toContain("2 affiliate link(s)");
  });

  it("returns false when webhook responds with error status", async () => {
    process.env.ADMIN_WEBHOOK_URL = "https://hooks.slack.com/test";
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal("fetch", mockFetch);

    const result = await notifyAdminUnhealthyLinks(sampleLinks);
    expect(result).toBe(false);
  });

  it("returns false when webhook request throws", async () => {
    process.env.ADMIN_WEBHOOK_URL = "https://hooks.slack.com/test";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network failure")));

    const result = await notifyAdminUnhealthyLinks(sampleLinks);
    expect(result).toBe(false);
  });

  it("falls back to console logging when no webhook URL configured", async () => {
    delete process.env.ADMIN_WEBHOOK_URL;
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await notifyAdminUnhealthyLinks(sampleLinks);

    expect(result).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[admin-notify] UNHEALTHY LINKS ALERT:"),
      expect.any(String)
    );
  });
});
