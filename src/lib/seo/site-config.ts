/**
 * Site-wide configuration for SEO metadata generation.
 * Uses NEXT_PUBLIC_SITE_URL environment variable when available,
 * falls back to the production domain.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://safenest.toys";

export const SITE_NAME = "SafeNest Toys";
