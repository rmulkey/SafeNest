import { defineType, defineField } from "sanity";

/**
 * Queued Product — a verified-but-unpublished toy waiting to be auto-published
 * to the live catalog by the daily publisher cron (/api/cron/publish-products).
 *
 * DATA INTEGRITY: only REAL, verified products belong here. Every entry must
 * carry a real product name/brand, an Amazon SEARCH url (always-valid fallback,
 * never a fabricated /dp/{ASIN}), and a real, fetchable image URL from an
 * approved CDN (manufacturer or authorized retailer). The publisher re-verifies
 * the affiliate URL and image bytes at publish time and refuses to publish
 * anything that fails — so the queue can never leak fabricated data into the
 * catalog, even unattended.
 *
 * Mirrors the toyReview field shape so publishing is a near-direct copy.
 */
export const queuedProduct = defineType({
  name: "queuedProduct",
  title: "Queued Product",
  type: "document",
  fields: [
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: [
          { title: "Queued (will auto-publish)", value: "queued" },
          { title: "Published", value: "published" },
          { title: "Failed verification (needs fix)", value: "failed" },
        ],
        layout: "radio",
      },
      initialValue: "queued",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "productName",
      title: "Product Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "brand",
      title: "Brand",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "categoryRef",
      title: "Category ID",
      type: "string",
      description: "Sanity category _id: cat-building | cat-educational | cat-outdoor | cat-sensory",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "ageMinMonths",
      title: "Min Age (months)",
      type: "number",
      validation: (Rule) => Rule.required().min(0),
    }),
    defineField({
      name: "ageMaxMonths",
      title: "Max Age (months)",
      type: "number",
      validation: (Rule) => Rule.required().min(0),
    }),
    // Verified external data
    defineField({
      name: "affiliateUrl",
      title: "Affiliate URL (Amazon search or verified product URL)",
      type: "url",
      description:
        "Amazon SEARCH url (https://www.amazon.com/s?k=...) WITHOUT the tag, or a VERIFIED /dp/{ASIN} url. Re-checked at publish time.",
      validation: (Rule) => Rule.required().uri({ scheme: ["http", "https"] }),
    }),
    defineField({
      name: "imageUrl",
      title: "Image URL (approved CDN)",
      type: "url",
      description:
        "Direct image URL from manufacturer or authorized retailer CDN. Must return real image bytes — verified at publish time.",
      validation: (Rule) => Rule.required().uri({ scheme: ["http", "https"] }),
    }),
    defineField({
      name: "imageAlt",
      title: "Image Alt Text",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    // Editorial scoring factors (0-100). Authored editorially — allowed per rule.
    defineField({ name: "materialSafety", title: "Material Safety", type: "number", validation: (R) => R.required().min(0).max(100) }),
    defineField({ name: "chokingRisk", title: "Choking Risk (higher=safer)", type: "number", validation: (R) => R.required().min(0).max(100) }),
    defineField({ name: "recallHistory", title: "Recall History", type: "number", validation: (R) => R.required().min(0).max(100) }),
    defineField({ name: "certificationPresence", title: "Certification Presence", type: "number", validation: (R) => R.required().min(0).max(100) }),
    defineField({ name: "motorSkills", title: "Motor Skills", type: "number", validation: (R) => R.required().min(0).max(100) }),
    defineField({ name: "cognitiveSkills", title: "Cognitive Skills", type: "number", validation: (R) => R.required().min(0).max(100) }),
    defineField({ name: "sensoryEngagement", title: "Sensory Engagement", type: "number", validation: (R) => R.required().min(0).max(100) }),
    defineField({
      name: "materials",
      title: "Materials",
      type: "array",
      of: [{ type: "string" }],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: "chokingHazardAssessment",
      title: "Choking Hazard Assessment",
      type: "text",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "certifications",
      title: "Certifications",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "pros",
      title: "Pros",
      type: "array",
      of: [{ type: "string" }],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: "cons",
      title: "Cons",
      type: "array",
      of: [{ type: "string" }],
      validation: (Rule) => Rule.required().min(1),
    }),
    // Set by the publisher when it fails verification, for debugging.
    defineField({
      name: "lastError",
      title: "Last Publish Error",
      type: "string",
      readOnly: true,
    }),
    defineField({
      name: "publishedReviewId",
      title: "Published Review ID",
      type: "string",
      readOnly: true,
    }),
  ],
  preview: {
    select: { title: "productName", subtitle: "status", media: "brand" },
  },
});
