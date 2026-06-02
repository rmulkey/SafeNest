import { defineType, defineField } from "sanity";

export const buyingGuide = defineType({
  name: "buyingGuide",
  title: "Buying Guide",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "targetAgeRange",
      title: "Target Age Range",
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
      name: "reviewReferences",
      title: "Review References",
      type: "array",
      of: [{ type: "reference", to: [{ type: "toyReview" }] }],
      description: "Toy reviews referenced in this guide (minimum 3)",
      validation: (Rule) => Rule.required().min(3),
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "reference",
      to: [{ type: "category" }],
    }),
    defineField({
      name: "excerpt",
      title: "Excerpt",
      type: "text",
      description: "Short summary for listings and SEO",
      validation: (Rule) => Rule.max(300),
    }),
    defineField({
      name: "body",
      title: "Guide Body",
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
      name: "publishedAt",
      title: "Published At",
      type: "datetime",
    }),
  ],
  preview: {
    select: {
      title: "title",
      media: "mainImage",
    },
  },
});
