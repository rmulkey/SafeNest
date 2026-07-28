import { defineType, defineField } from "sanity";

/**
 * Human-readable evidence statuses for Studio dropdowns. Values must stay in sync
 * with EvidenceStatus in src/lib/scoring/evidence-status.ts.
 */
const EVIDENCE_STATUS_OPTIONS = [
  { title: "Supported by accessible documentation", value: "verified_documentation" },
  { title: "Manufacturer-reported (unverified)", value: "manufacturer_reported" },
  { title: "Retailer-reported (unverified)", value: "retailer_reported" },
  { title: "Secondary source", value: "secondary_source" },
  { title: "Not found", value: "no_evidence_found" },
  { title: "Unclear \u2014 sources conflict", value: "conflicting_information" },
  { title: "Not applicable", value: "not_applicable" },
];

export const toyReview = defineType({
  name: "toyReview",
  title: "Toy Review",
  type: "document",
  fields: [
    defineField({
      name: "productName",
      title: "Product Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "productName", maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "ageRange",
      title: "Age Range",
      type: "object",
      fields: [
        defineField({
          name: "minMonths",
          title: "Minimum Age (months)",
          type: "number",
          validation: (Rule) => Rule.required().min(0),
        }),
        defineField({
          name: "maxMonths",
          title: "Maximum Age (months)",
          type: "number",
          validation: (Rule) => Rule.required().min(0),
        }),
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "reference",
      to: [{ type: "category" }],
      validation: (Rule) => Rule.required(),
    }),
    // Safety scoring factors (0-100 each)
    defineField({
      name: "materialSafety",
      title: "Material Safety Score",
      type: "number",
      description: "Material safety rating (0–100)",
      validation: (Rule) => Rule.required().min(0).max(100),
    }),
    defineField({
      name: "chokingRisk",
      title: "Choking Risk Score",
      type: "number",
      description: "Choking risk rating (0–100, higher = safer)",
      validation: (Rule) => Rule.required().min(0).max(100),
    }),
    defineField({
      name: "recallHistory",
      title: "Recall History Score",
      type: "number",
      description: "Recall history rating (0–100, higher = better)",
      validation: (Rule) => Rule.required().min(0).max(100),
    }),
    defineField({
      name: "certificationPresence",
      title: "Certification Presence Score",
      type: "number",
      description: "Certification presence rating (0–100)",
      validation: (Rule) => Rule.required().min(0).max(100),
    }),
    // Development scoring factors (0-100 each)
    defineField({
      name: "motorSkills",
      title: "Motor Skills Score",
      type: "number",
      description: "Motor skills engagement rating (0–100)",
      validation: (Rule) => Rule.required().min(0).max(100),
    }),
    defineField({
      name: "cognitiveSkills",
      title: "Cognitive Skills Score",
      type: "number",
      description: "Cognitive skills engagement rating (0–100)",
      validation: (Rule) => Rule.required().min(0).max(100),
    }),
    defineField({
      name: "sensoryEngagement",
      title: "Sensory Engagement Score",
      type: "number",
      description: "Sensory engagement rating (0–100)",
      validation: (Rule) => Rule.required().min(0).max(100),
    }),
    // Computed scores (set by webhook/server)
    defineField({
      name: "safetyScore",
      title: "Safety Score",
      type: "number",
      description: "Computed safety score (set automatically)",
      readOnly: true,
    }),
    defineField({
      name: "developmentScore",
      title: "Development Score",
      type: "number",
      description: "Computed development score (set automatically)",
      readOnly: true,
    }),
    defineField({
      name: "materials",
      title: "Materials",
      type: "array",
      of: [{ type: "string" }],
      description: "List of materials used in the toy",
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: "chokingHazardAssessment",
      title: "Choking Hazard Assessment",
      type: "text",
      description: "Detailed choking hazard assessment",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "certifications",
      title: "Certifications",
      type: "array",
      of: [{ type: "string" }],
      description: "Safety certifications (e.g., ASTM, CPSC, EN71)",
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
    defineField({
      name: "alternatives",
      title: "Alternatives",
      type: "array",
      of: [{ type: "reference", to: [{ type: "toyReview" }] }],
      description: "Alternative toy recommendations (must include at least one from a different brand)",
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: "affiliateLinks",
      title: "Affiliate Links",
      type: "array",
      of: [{ type: "affiliateLink" }],
    }),
    defineField({
      name: "body",
      title: "Review Body",
      type: "blockContent",
    }),
    defineField({
      name: "mainImage",
      title: "Main Image",
      type: "image",
      options: { hotspot: true },
      fields: [
        {
          name: "alt",
          type: "string",
          title: "Alternative Text",
        },
      ],
    }),
    defineField({
      name: "brand",
      title: "Brand",
      type: "string",
      description: "The brand/manufacturer of the toy",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "hasActiveRecall",
      title: "Has Active Recall",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "needsReview",
      title: "Needs Review",
      type: "boolean",
      description: "Flagged for admin review",
      initialValue: false,
    }),
    // ─── Evidence provenance per safety factor ──────────────────────────────
    // Records HOW WELL each factor is supported. Without this, a factor could
    // score highly on an unverified marketing claim. See
    // src/lib/scoring/evidence-status.ts for the caps and confidence weights.
    // Legacy reviews with no value fall back to "manufacturer_reported", which
    // honestly describes where the existing catalog data came from.
    defineField({
      name: "factorEvidence",
      title: "Evidence Status per Safety Factor",
      type: "object",
      description:
        "How well each safety factor is supported. Leave blank to inherit the legacy default (manufacturer-reported, unverified).",
      options: { collapsible: true, collapsed: true },
      fields: [
        defineField({ name: "materialSafety", title: "Material safety", type: "string", options: { list: EVIDENCE_STATUS_OPTIONS } }),
        defineField({ name: "chokingRisk", title: "Choking risk", type: "string", options: { list: EVIDENCE_STATUS_OPTIONS } }),
        defineField({ name: "recallHistory", title: "Recall history", type: "string", options: { list: EVIDENCE_STATUS_OPTIONS } }),
        defineField({ name: "certificationPresence", title: "Certification claims", type: "string", options: { list: EVIDENCE_STATUS_OPTIONS } }),
      ],
    }),
    defineField({
      name: "certificationEvidence",
      title: "Certification Claim Sources",
      type: "array",
      description:
        "Per-certification provenance. Use this instead of asserting compliance.",
      of: [
        {
          type: "object",
          fields: [
            { name: "certification", title: "Certification", type: "string" },
            {
              name: "status",
              title: "Claim Status",
              type: "string",
              options: { list: EVIDENCE_STATUS_OPTIONS },
            },
            {
              name: "sourceUrl",
              title: "Supporting Document URL",
              type: "url",
              description:
                "Only fill this in if a real accessible document exists. Never invent one.",
            },
          ],
        },
      ],
    }),
    defineField({
      name: "reviewedBy",
      title: "Assessed By",
      type: "string",
      description:
        "Named person accountable for this editorial assessment. Leave blank rather than inventing a credentialed reviewer — the page renders an honest fallback.",
    }),
    defineField({
      name: "lastReviewedAt",
      title: "Last Reviewed At",
      type: "datetime",
      description:
        "When this assessment was last re-checked. Shown to readers; if blank the page says the details may be out of date.",
    }),
    defineField({
      name: "recallCheckedAt",
      title: "Recall Last Checked At",
      type: "datetime",
      description:
        "When a CPSC recall lookup last ran for this product. A recall search is only true as of the date it ran.",
    }),
    defineField({
      name: "publishedAt",
      title: "Published At",
      type: "datetime",
    }),
  ],
  preview: {
    select: {
      title: "productName",
      subtitle: "brand",
      media: "mainImage",
    },
  },
});
