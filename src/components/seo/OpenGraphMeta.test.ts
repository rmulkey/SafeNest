import { describe, it, expect } from "vitest";
import { generateOpenGraphMeta } from "./OpenGraphMeta";

/**
 * Regression tests for canonical emission.
 *
 * Because `metadataBase` is configured, Next.js does not infer a canonical URL
 * automatically — it must be declared. Most pages only called this helper and
 * therefore shipped no <link rel="canonical"> at all (26 pages were affected,
 * including every /guides/*, /best-toys/*, and /categories/* page). The helper
 * already receives the page's canonical address as `url`, so it now emits the
 * canonical alongside the OG tags.
 */
describe("generateOpenGraphMeta canonical", () => {
  const base = {
    title: "Test Page",
    description: "A description",
    url: "https://safenesttoys.com/guides/best-bath-water-toys",
  };

  it("emits a self-referencing canonical matching the page url", () => {
    const meta = generateOpenGraphMeta(base);
    expect(meta.alternates?.canonical).toBe(base.url);
  });

  it("emits the canonical in the route-image branch too", () => {
    const meta = generateOpenGraphMeta({ ...base, useRouteImage: true });
    expect(meta.alternates?.canonical).toBe(base.url);
  });

  it("keeps canonical and og:url in agreement", () => {
    const meta = generateOpenGraphMeta(base);
    expect(meta.openGraph?.url).toBe(meta.alternates?.canonical);
  });

  it("emits an absolute canonical URL", () => {
    const meta = generateOpenGraphMeta(base);
    expect(String(meta.alternates?.canonical)).toMatch(/^https:\/\//);
  });
});

describe("generateOpenGraphMeta social tags", () => {
  const base = {
    title: "Test Page",
    description: "A description",
    url: "https://safenesttoys.com/blog/some-post",
  };

  it("provides og and twitter images by default", () => {
    const meta = generateOpenGraphMeta(base);
    expect(meta.openGraph?.images).toBeDefined();
    expect(meta.twitter?.images).toBeDefined();
  });

  it("omits explicit images when the route supplies its own OG image", () => {
    const meta = generateOpenGraphMeta({ ...base, useRouteImage: true });
    expect(meta.openGraph?.images).toBeUndefined();
    expect(meta.twitter?.images).toBeUndefined();
  });

  it("uses summary_large_image for Twitter in both branches", () => {
    expect(generateOpenGraphMeta(base).twitter?.card).toBe("summary_large_image");
    expect(
      generateOpenGraphMeta({ ...base, useRouteImage: true }).twitter?.card
    ).toBe("summary_large_image");
  });

  it("passes through the article type for editorial pages", () => {
    const meta = generateOpenGraphMeta({ ...base, type: "article" });
    expect(meta.openGraph?.type).toBe("article");
  });
});
