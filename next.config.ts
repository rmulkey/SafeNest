import type { NextConfig } from "next";

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
