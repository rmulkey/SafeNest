import { defineType, defineField } from "sanity";

export const recallAlert = defineType({
  name: "recallAlert",
  title: "Recall Alert",
  type: "document",
  fields: [
    defineField({
      name: "affectedProduct",
      title: "Affected Product",
      type: "string",
      description: "Name of the affected product",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "recallDate",
      title: "Recall Date",
      type: "date",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "recallReason",
      title: "Recall Reason",
      type: "text",
      description: "Why the product was recalled",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "issuingAuthority",
      title: "Issuing Authority",
      type: "string",
      description: "The authority that issued the recall (e.g., CPSC, Health Canada)",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "recommendedAction",
      title: "Recommended Action",
      type: "text",
      description: "What parents should do",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "officialNoticeUrl",
      title: "Official Notice URL",
      type: "url",
      description: "Link to the official recall notice",
      validation: (Rule) => Rule.uri({ scheme: ["http", "https"] }),
    }),
    defineField({
      name: "affectedReviews",
      title: "Affected Reviews",
      type: "array",
      of: [{ type: "reference", to: [{ type: "toyReview" }] }],
      description: "Toy reviews affected by this recall",
    }),
    defineField({
      name: "isResolved",
      title: "Is Resolved",
      type: "boolean",
      description: "Whether the recall has been resolved",
      initialValue: false,
    }),
    defineField({
      name: "publishedAt",
      title: "Published At",
      type: "datetime",
      validation: (Rule) => Rule.required(),
    }),
    // ─── Provenance (populated by the CPSC sync job) ─────────────────────────
    // These make it explicit on-page that a recall came from the official CPSC
    // database rather than SafeNest's own determination.
    defineField({
      name: "cpscRecallNumber",
      title: "CPSC Recall Number",
      type: "string",
      description:
        "Official CPSC recall number. Used as the idempotency key by the sync job.",
    }),
    defineField({
      name: "hazards",
      title: "Hazards (as published by CPSC)",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "affectedModels",
      title: "Affected Models (as published by CPSC)",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "manufacturers",
      title: "Manufacturers (as published by CPSC)",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "isLikelyChildProduct",
      title: "Likely Child/Juvenile Product",
      type: "boolean",
      description:
        "Heuristic used only for surfacing priority. Never asserts a match with a reviewed toy.",
    }),
    defineField({
      name: "syncedAt",
      title: "Last Synced From CPSC",
      type: "datetime",
    }),
    defineField({
      name: "sourceAttribution",
      title: "Data Source",
      type: "string",
      description: "Where this record came from, shown to users.",
    }),
  ],
  preview: {
    select: {
      title: "affectedProduct",
      subtitle: "issuingAuthority",
    },
  },
});
