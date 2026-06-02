/**
 * Next.js sitemap generation (App Router convention).
 *
 * Fetches all published content slugs from Sanity (reviews, guides,
 * blog posts, categories) and generates sitemap entries.
 *
 * Requirements: 4.5
 */

import type { MetadataRoute } from "next";
import { groq } from "next-sanity";
import { sanityClient } from "@/lib/sanity/client";
import {
  getBaseUrl,
  createSitemapEntries,
  createStaticPageEntries,
} from "@/lib/seo/sitemap";

/** GROQ query to fetch all published content slugs for the sitemap. */
const sitemapContentQuery = groq`{
  "reviews": *[_type == "toyReview"] | order(_updatedAt desc) { slug, _updatedAt },
  "guides": *[_type == "buyingGuide"] | order(_updatedAt desc) { slug, _updatedAt },
  "blogPosts": *[_type == "blogPost"] | order(_updatedAt desc) { slug, _updatedAt },
  "categories": *[_type == "category"] | order(_updatedAt desc) { slug, _updatedAt },
  "safetyArticles": *[_type == "safetyArticle"] | order(_updatedAt desc) { slug, _updatedAt },
  "ageBasedGuides": *[_type == "ageBasedGuide"] | order(_updatedAt desc) { slug, _updatedAt }
}`;

interface SitemapContent {
  reviews: Array<{ slug: { current: string }; _updatedAt?: string }>;
  guides: Array<{ slug: { current: string }; _updatedAt?: string }>;
  blogPosts: Array<{ slug: { current: string }; _updatedAt?: string }>;
  categories: Array<{ slug: { current: string }; _updatedAt?: string }>;
  safetyArticles: Array<{ slug: { current: string }; _updatedAt?: string }>;
  ageBasedGuides: Array<{ slug: { current: string }; _updatedAt?: string }>;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();

  let content: SitemapContent = {
    reviews: [],
    guides: [],
    blogPosts: [],
    categories: [],
    safetyArticles: [],
    ageBasedGuides: [],
  };

  try {
    content = await sanityClient.fetch<SitemapContent>(sitemapContentQuery);
  } catch (error) {
    // If Sanity is unavailable, return static pages only
    console.error("[Sitemap] Failed to fetch content from Sanity:", error);
  }

  const staticPages = createStaticPageEntries(baseUrl);
  const reviewEntries = createSitemapEntries(content.reviews, "/reviews", "weekly", 0.9);
  const guideEntries = createSitemapEntries(content.guides, "/guides", "weekly", 0.8);
  const blogEntries = createSitemapEntries(content.blogPosts, "/blog", "weekly", 0.7);
  const categoryEntries = createSitemapEntries(content.categories, "/categories", "monthly", 0.6);
  const articleEntries = createSitemapEntries(content.safetyArticles, "/articles", "weekly", 0.7);
  const ageGuideEntries = createSitemapEntries(content.ageBasedGuides, "/guides/age", "monthly", 0.7);

  return [
    ...staticPages,
    ...reviewEntries,
    ...guideEntries,
    ...blogEntries,
    ...categoryEntries,
    ...articleEntries,
    ...ageGuideEntries,
  ];
}
