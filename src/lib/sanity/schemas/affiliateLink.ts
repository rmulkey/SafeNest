import { defineType, defineField } from "sanity";

export const affiliateLink = defineType({
  name: "affiliateLink",
  title: "Affiliate Link",
  type: "object",
  fields: [
    defineField({
      name: "partnerId",
      title: "Partner ID",
      type: "string",
      description: "Affiliate partner identifier (e.g., amazon, brand-direct)",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "destinationUrl",
      title: "Destination URL",
      type: "url",
      description: "The affiliate link URL",
      validation: (Rule) => Rule.required().uri({ scheme: ["http", "https"] }),
    }),
    defineField({
      name: "affiliateTag",
      title: "Affiliate Tag",
      type: "string",
      description: "The affiliate tag/tracking parameter",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "label",
      title: "Link Label",
      type: "string",
      description: "Display text for the affiliate link (e.g., 'Buy on Amazon')",
      validation: (Rule) => Rule.required(),
    }),
  ],
});
