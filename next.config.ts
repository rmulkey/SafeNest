import type { NextConfig } from "next";

/**
 * Canonical host for the site, derived from the same env var that drives
 * `SITE_URL` in src/lib/seo/site-config.ts. Kept as a local parse (rather than
 * an import) because next.config.ts is loaded outside the `@/` path alias.
 */
const CANONICAL_HOST = (() => {
  try {
    return new URL(
      process.env.NEXT_PUBLIC_SITE_URL || "https://safenesttoys.com"
    ).host;
  } catch {
    return "safenesttoys.com";
  }
})();

const nextConfig: NextConfig = {
  cacheComponents: true,
  compress: true,
  images: {
    // Serve images directly from Sanity's CDN via a custom loader instead of
    // Vercel's Image Optimization (which returns HTTP 402 once its quota is hit).
    // Sanity handles resize/quality/format (incl. HEIF -> WebP/AVIF) itself.
    loader: 'custom',
    loaderFile: './src/lib/sanity/image-loader.ts',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
      },
    ],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  async redirects() {
    /*
     * Retired duplicate blog roundups.
     *
     * The fortnightly generator rotated topics back to each category every
     * fourth run, and the catalogue's top seven barely moved in between — so
     * Building Toys published three times over the same seven products in the
     * same order, and Educational Toys twice. Six URLs, three articles' worth of
     * content. The generator now refuses to publish when the picks are unchanged,
     * but these were already indexed.
     *
     * Each retired URL points at the newest post covering the same products,
     * which is the version a reader arriving from search should land on. 301
     * rather than 410: the content still exists, it just lives at one URL now,
     * and a permanent redirect passes the accumulated signals to it.
     */
    const retiredRoundups = [
      {
        source: '/blog/top-child-safe-building-toys-2026-w24',
        destination: '/blog/top-child-safe-building-toys-2026-w32',
        permanent: true,
      },
      {
        source: '/blog/top-child-safe-building-toys-2026-w28',
        destination: '/blog/top-child-safe-building-toys-2026-w32',
        permanent: true,
      },
      {
        source: '/blog/top-child-safe-educational-toys-2026-w26',
        destination: '/blog/top-child-safe-educational-toys-2026-w30',
        permanent: true,
      },
    ];

    // Both `safenesttoys.com` and `www.safenesttoys.com` resolve to this
    // deployment. Serving 200 on both splits crawl budget and forces Google to
    // guess a canonical, so send the www host to the apex host — which is the
    // host already declared by every <link rel="canonical"> and by robots.txt.
    if (CANONICAL_HOST.startsWith('www.')) {
      return retiredRoundups;
    }
    return [
      ...retiredRoundups,
      {
        source: '/:path*',
        has: [{ type: 'host', value: `www.${CANONICAL_HOST}` }],
        destination: `https://${CANONICAL_HOST}/:path*`,
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
