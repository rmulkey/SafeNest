import type { Metadata } from "next";

/**
 * Configuration options for generating Open Graph and Twitter Card metadata.
 * Used across all public pages to ensure consistent social sharing metadata.
 *
 * Validates: Requirements 4.6
 */
export interface OpenGraphMetaOptions {
  title: string;
  description: string;
  url: string;
  type?: "website" | "article";
  image?: string;
  imageAlt?: string;
  siteName?: string;
}

const DEFAULT_SITE_NAME = "SafeNest Toys";
// Branded OG image generated dynamically at /opengraph-image (1200×630).
const DEFAULT_OG_IMAGE = "/opengraph-image";
const DEFAULT_IMAGE_ALT = "SafeNest Toys — Toy safety reviews built by parents";

/**
 * Generates Open Graph and Twitter Card metadata for Next.js Metadata API.
 *
 * Returns a partial Metadata object containing:
 * - og:title, og:description, og:image, og:url, og:type
 * - twitter:card, twitter:title, twitter:description, twitter:image
 *
 * Usage:
 * ```ts
 * import { generateOpenGraphMeta } from "@/components/seo/OpenGraphMeta";
 *
 * export const metadata: Metadata = {
 *   title: "Page Title",
 *   description: "Page description",
 *   ...generateOpenGraphMeta({
 *     title: "Page Title",
 *     description: "Page description",
 *     url: "https://safenesttoys.com/page",
 *   }),
 * };
 * ```
 */
export function generateOpenGraphMeta(
  options: OpenGraphMetaOptions
): Pick<Metadata, "openGraph" | "twitter"> {
  const {
    title,
    description,
    url,
    type = "website",
    image = DEFAULT_OG_IMAGE,
    imageAlt = DEFAULT_IMAGE_ALT,
    siteName = DEFAULT_SITE_NAME,
  } = options;

  return {
    openGraph: {
      title,
      description,
      url,
      type,
      siteName,
      images: [
        {
          url: image,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [
        {
          url: image,
          alt: imageAlt,
        },
      ],
    },
  };
}
