import type { Metadata } from "next";

/**
 * Webmaster-verification meta tags, assembled from the environment.
 *
 *   GOOGLE_SITE_VERIFICATION -> <meta name="google-site-verification">
 *   BING_SITE_VERIFICATION   -> <meta name="msvalidate.01">
 *   YANDEX_SITE_VERIFICATION -> <meta name="yandex-verification">
 *
 * Each is optional. When none is set, `verification` is omitted from the
 * metadata entirely rather than emitted empty — a tag with content="" fails
 * verification in a way that is annoying to diagnose.
 *
 * Bing has no dedicated key in Next's Metadata type, so it goes through `other`
 * under its real meta name.
 *
 * Lives outside layout.tsx so it can be unit tested: importing the layout pulls
 * in next/font, which does not run under the test runner.
 */
export function buildVerification(): Pick<Metadata, "verification"> {
  const google = process.env.GOOGLE_SITE_VERIFICATION;
  const bing = process.env.BING_SITE_VERIFICATION;
  const yandex = process.env.YANDEX_SITE_VERIFICATION;

  if (!google && !bing && !yandex) return {};

  return {
    verification: {
      ...(google ? { google } : {}),
      ...(yandex ? { yandex } : {}),
      ...(bing ? { other: { "msvalidate.01": bing } } : {}),
    },
  };
}
