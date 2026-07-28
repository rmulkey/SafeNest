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
    // Both `safenesttoys.com` and `www.safenesttoys.com` resolve to this
    // deployment. Serving 200 on both splits crawl budget and forces Google to
    // guess a canonical, so send the www host to the apex host — which is the
    // host already declared by every <link rel="canonical"> and by robots.txt.
    if (CANONICAL_HOST.startsWith('www.')) {
      return [];
    }
    return [
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
