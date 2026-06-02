import { createClient } from "next-sanity";
import imageUrlBuilder, { type SanityImageSource } from "@sanity/image-url";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "placeholder";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const apiVersion = "2024-01-01";

/**
 * Public read client for fetching published content.
 * Uses the CDN for fast, cached reads. No authentication token required.
 */
export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
  perspective: "published",
});

/**
 * Server-side client with write token for webhook operations
 * and draft content access. Does not use CDN to ensure fresh data.
 */
export const sanityWriteClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
  perspective: "published",
});

/**
 * Image URL builder for generating optimized image URLs from Sanity assets.
 */
const builder = imageUrlBuilder(sanityClient);

export function urlForImage(source: SanityImageSource) {
  return builder.image(source);
}
