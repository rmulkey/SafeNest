import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getBaseUrl,
  generateSitemapXml,
  createSitemapEntry,
  createSitemapEntries,
  createStaticPageEntries,
  pingSearchEngines,
} from "./sitemap";

/**
 * Unit tests for the pure sitemap helpers. No real network calls are made:
 * pingSearchEngines is exercised with a mocked global fetch.
 */

describe("getBaseUrl", () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("prefers NEXT_PUBLIC_SITE_URL when set", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://safenest.toys";
    expect(getBaseUrl()).toBe("https://safenest.toys");
  });

  it("falls back to the Vercel production URL (https-prefixed) when site URL is absent", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "safenest.vercel.app";
    expect(getBaseUrl()).toBe("https://safenest.vercel.app");
  });

  it("falls back to localhost when no env vars are set", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    expect(getBaseUrl()).toBe("http://localhost:3000");
  });
});

describe("generateSitemapXml", () => {
  it("produces a valid XML document with the urlset namespace", () => {
    const xml = generateSitemapXml([
      { url: "https://safenest.toys", priority: 1.0 },
    ]);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    );
    expect(xml.trimEnd().endsWith("</urlset>")).toBe(true);
  });

  it("emits one <url>/<loc> pair per entry", () => {
    const xml = generateSitemapXml([
      { url: "https://safenest.toys/a" },
      { url: "https://safenest.toys/b" },
      { url: "https://safenest.toys/c" },
    ]);
    const urlCount = xml.match(/<url>/g)?.length ?? 0;
    const locCount = xml.match(/<loc>/g)?.length ?? 0;
    expect(urlCount).toBe(3);
    expect(locCount).toBe(3);
    expect(xml).toContain("<loc>https://safenest.toys/a</loc>");
    expect(xml).toContain("<loc>https://safenest.toys/b</loc>");
    expect(xml).toContain("<loc>https://safenest.toys/c</loc>");
  });

  it("renders optional lastmod, changefreq and priority when present", () => {
    const xml = generateSitemapXml([
      {
        url: "https://safenest.toys/reviews",
        lastModified: new Date("2024-01-15T00:00:00.000Z"),
        changeFrequency: "daily",
        priority: 0.9,
      },
    ]);
    expect(xml).toContain("<lastmod>2024-01-15T00:00:00.000Z</lastmod>");
    expect(xml).toContain("<changefreq>daily</changefreq>");
    expect(xml).toContain("<priority>0.9</priority>");
  });

  it("omits optional tags when not provided", () => {
    const xml = generateSitemapXml([{ url: "https://safenest.toys/x" }]);
    expect(xml).not.toContain("<changefreq>");
    expect(xml).not.toContain("<priority>");
    expect(xml).not.toContain("<lastmod>");
  });

  it("returns a well-formed (empty) urlset for no entries", () => {
    const xml = generateSitemapXml([]);
    expect(xml).toContain("<urlset");
    expect(xml).toContain("</urlset>");
    expect(xml.match(/<url>/g)).toBeNull();
  });
});

describe("createSitemapEntry", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://safenest.toys";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("builds the URL as baseUrl + prefix + slug", () => {
    const entry = createSitemapEntry({
      slug: "wooden-blocks",
      prefix: "/reviews",
    });
    expect(entry.url).toBe("https://safenest.toys/reviews/wooden-blocks");
  });

  it("defaults changeFrequency to weekly and priority to 0.7", () => {
    const entry = createSitemapEntry({ slug: "abc", prefix: "/guides" });
    expect(entry.changeFrequency).toBe("weekly");
    expect(entry.priority).toBe(0.7);
  });

  it("honours explicit changeFrequency and priority", () => {
    const entry = createSitemapEntry({
      slug: "abc",
      prefix: "/guides",
      changeFrequency: "monthly",
      priority: 0.5,
    });
    expect(entry.changeFrequency).toBe("monthly");
    expect(entry.priority).toBe(0.5);
  });

  it("uses the supplied lastModified date", () => {
    const entry = createSitemapEntry({
      slug: "abc",
      prefix: "/reviews",
      lastModified: "2023-06-01T12:00:00.000Z",
    });
    expect(entry.lastModified).toEqual(new Date("2023-06-01T12:00:00.000Z"));
  });
});

describe("createSitemapEntries", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://safenest.toys";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("maps each item's slug to a prefixed sitemap entry", () => {
    const entries = createSitemapEntries(
      [
        { slug: { current: "a" }, _updatedAt: "2024-01-01T00:00:00.000Z" },
        { slug: { current: "b" } },
      ],
      "/reviews"
    );
    expect(entries).toHaveLength(2);
    expect(entries[0].url).toBe("https://safenest.toys/reviews/a");
    expect(entries[1].url).toBe("https://safenest.toys/reviews/b");
    expect(entries[0].lastModified).toEqual(
      new Date("2024-01-01T00:00:00.000Z")
    );
  });

  it("applies custom changeFrequency and priority to all entries", () => {
    const entries = createSitemapEntries(
      [{ slug: { current: "a" } }],
      "/guides",
      "monthly",
      0.6
    );
    expect(entries[0].changeFrequency).toBe("monthly");
    expect(entries[0].priority).toBe(0.6);
  });
});

describe("createStaticPageEntries", () => {
  const baseUrl = "https://safenest.toys";

  it("includes the homepage with priority 1.0", () => {
    const entries = createStaticPageEntries(baseUrl);
    const home = entries.find((e) => e.url === baseUrl);
    expect(home).toBeDefined();
    expect(home?.priority).toBe(1.0);
    expect(home?.changeFrequency).toBe("daily");
  });

  it("produces URLs that all begin with the supplied base URL", () => {
    const entries = createStaticPageEntries(baseUrl);
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry.url.startsWith(baseUrl)).toBe(true);
    }
  });

  it("includes the key marketing pages (reviews, recalls, best-toys)", () => {
    const urls = createStaticPageEntries(baseUrl).map((e) => e.url);
    expect(urls).toContain(`${baseUrl}/reviews`);
    expect(urls).toContain(`${baseUrl}/recalls`);
    expect(urls).toContain(`${baseUrl}/best-toys`);
  });

  it("keeps every priority within the [0, 1] range", () => {
    for (const entry of createStaticPageEntries(baseUrl)) {
      expect(entry.priority).toBeGreaterThanOrEqual(0);
      expect(entry.priority).toBeLessThanOrEqual(1);
    }
  });
});

describe("pingSearchEngines", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls fetch with the encoded sitemap URL and does not throw on success", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200 } as Response);
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      pingSearchEngines("https://safenest.toys/sitemap.xml")
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledWith = fetchMock.mock.calls[0][0] as string;
    expect(calledWith).toContain(
      encodeURIComponent("https://safenest.toys/sitemap.xml")
    );

    vi.unstubAllGlobals();
  });

  it("swallows fetch rejections (best-effort) without throwing", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(pingSearchEngines("https://safenest.toys/sitemap.xml"))
      .resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("does not throw when the ping returns a non-OK status", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 503 } as Response);
    vi.stubGlobal("fetch", fetchMock);

    await expect(pingSearchEngines("https://safenest.toys/sitemap.xml"))
      .resolves.toBeUndefined();

    vi.unstubAllGlobals();
  });
});
