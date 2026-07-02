/**
 * Custom Next.js image loader that serves images directly from Sanity's CDN
 * instead of routing them through Vercel's Image Optimization.
 *
 * Why: Sanity's image CDN already handles on-the-fly resizing, quality, and
 * format conversion (including HEIF -> WebP/AVIF). Using it directly avoids
 * Vercel's optimized-image quota/billing (which returns HTTP 402 once exceeded)
 * and eliminates redundant double-optimization.
 *
 * Behavior:
 *  - For cdn.sanity.io URLs: set the requested responsive width + quality and
 *    `auto=format` (so modern browsers get WebP/AVIF; HEIF is transcoded). The
 *    `h` param is dropped so the image scales proportionally to the requested
 *    width (the crop region from `rect`, when present, preserves framing).
 *  - For any other src (local/static assets, other hosts): returned unchanged.
 *
 * Configured via `images.loaderFile` in next.config.ts. Must stay dependency-free
 * since it runs on both server and client.
 */
interface LoaderArgs {
  src: string;
  width: number;
  quality?: number;
}

export default function sanityImageLoader({ src, width, quality }: LoaderArgs): string {
  if (!src.startsWith("http")) return src;

  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return src;
  }

  if (url.hostname !== "cdn.sanity.io") return src;

  url.searchParams.set("w", String(width));
  url.searchParams.set("q", String(quality ?? 75));
  url.searchParams.set("auto", "format");
  // Drop any fixed height so the requested width scales proportionally.
  url.searchParams.delete("h");
  return url.toString();
}
