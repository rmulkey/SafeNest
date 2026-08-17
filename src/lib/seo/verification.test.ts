import { describe, it, expect, afterEach } from "vitest";
import { buildVerification } from "./verification";

/**
 * Pins the shape Next.js needs: Bing rides under `other` with its real meta
 * name, and an unconfigured engine emits nothing rather than a tag with empty
 * content.
 */

const KEYS = [
  "GOOGLE_SITE_VERIFICATION",
  "BING_SITE_VERIFICATION",
  "YANDEX_SITE_VERIFICATION",
];

afterEach(() => {
  for (const k of KEYS) delete process.env[k];
});

describe("buildVerification", () => {
  it("omits verification entirely when no engine is configured", () => {
    expect(buildVerification()).toEqual({});
    expect(buildVerification().verification).toBeUndefined();
  });

  it("emits only the engines that are configured", () => {
    process.env.GOOGLE_SITE_VERIFICATION = "g-token";
    expect(buildVerification()).toEqual({ verification: { google: "g-token" } });
  });

  it("maps Bing to msvalidate.01 under `other`", () => {
    // Next has no `bing` key; the real meta name is msvalidate.01.
    process.env.BING_SITE_VERIFICATION = "b-token";
    expect(buildVerification()).toEqual({
      verification: { other: { "msvalidate.01": "b-token" } },
    });
  });

  it("uses Next's native yandex key", () => {
    process.env.YANDEX_SITE_VERIFICATION = "y-token";
    expect(buildVerification()).toEqual({ verification: { yandex: "y-token" } });
  });

  it("supports Google, Bing and Yandex together", () => {
    process.env.GOOGLE_SITE_VERIFICATION = "g-token";
    process.env.BING_SITE_VERIFICATION = "b-token";
    process.env.YANDEX_SITE_VERIFICATION = "y-token";
    expect(buildVerification()).toEqual({
      verification: {
        google: "g-token",
        yandex: "y-token",
        other: { "msvalidate.01": "b-token" },
      },
    });
  });

  it("treats an empty string as unset", () => {
    process.env.GOOGLE_SITE_VERIFICATION = "";
    process.env.BING_SITE_VERIFICATION = "b-token";
    expect(buildVerification()).toEqual({
      verification: { other: { "msvalidate.01": "b-token" } },
    });
  });
});
