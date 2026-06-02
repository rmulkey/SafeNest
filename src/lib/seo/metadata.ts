/**
 * Metadata generators for Open Graph and Twitter Card meta tags.
 *
 * Provides helper functions that generate Next.js Metadata objects
 * for different page types, including OG and Twitter Card tags.
 *
 * Requirements: 4.6
 */

import type { Metadata } from "next";

const SITE_NAME = "SafeNest Toys";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.safenesttoys.com";
const DEFAULT_IMAGE = `${SITE_URL}/og-default.png`;

export interface ReviewMetadataInput {
  productName: string;
  slug: string;
  description?: string;
  imageUrl?: string;
}

export interface GuideMetadataInput {
  title: string;
  slug: string;
  description?: string;
  imageUrl?: string;
}

export interface ArticleMetadataInput {
  title: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  publishedAt?: string;
  authorName?: string;
}

/**
 * Generates metadata with Open Graph and Twitter Card tags for a toy review page.
 *
 * Requirements: 4.6
 */
export function generateReviewMetadata(review: ReviewMetadataInput): Metadata {
  const title = `${review.productName} Safety Review | ${SITE_NAME}`;
  const description =
    review.description ||
    `Read our in-depth safety review of ${review.productName}, including safety score, development score, and expert analysis.`;
  const url = `${SITE_URL}/reviews/${review.slug}`;
  const image = review.imageUrl || DEFAULT_IMAGE;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "article",
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

/**
 * Generates metadata with Open Graph and Twitter Card tags for a buying guide page.
 *
 * Requirements: 4.6
 */
export function generateGuideMetadata(guide: GuideMetadataInput): Metadata {
  const title = `${guide.title} | ${SITE_NAME}`;
  const description =
    guide.description ||
    `Expert buying guide: ${guide.title}. Find the safest and most developmentally appropriate toys.`;
  const url = `${SITE_URL}/guides/${guide.slug}`;
  const image = guide.imageUrl || DEFAULT_IMAGE;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "article",
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

/**
 * Generates metadata with Open Graph and Twitter Card tags for a blog/article page.
 *
 * Requirements: 4.6
 */
export function generateArticleMetadata(article: ArticleMetadataInput): Metadata {
  const title = `${article.title} | ${SITE_NAME}`;
  const description =
    article.description ||
    `${article.title} - Safety tips and expert advice from ${SITE_NAME}.`;
  const url = `${SITE_URL}/blog/${article.slug}`;
  const image = article.imageUrl || DEFAULT_IMAGE;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "article",
      ...(article.publishedAt ? { publishedTime: article.publishedAt } : {}),
      ...(article.authorName
        ? { authors: [article.authorName] }
        : {}),
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

/**
 * Generates generic metadata with Open Graph and Twitter Card tags for any page.
 *
 * Requirements: 4.6
 */
export function generatePageMetadata(
  title: string,
  description: string,
  options?: { url?: string; imageUrl?: string; type?: "website" | "article" }
): Metadata {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const url = options?.url || SITE_URL;
  const image = options?.imageUrl || DEFAULT_IMAGE;
  const type = options?.type || "website";

  return {
    title: fullTitle,
    description,
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      type,
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [image],
    },
  };
}
