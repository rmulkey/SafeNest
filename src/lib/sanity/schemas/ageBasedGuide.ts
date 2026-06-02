import { defineType, defineField } from "sanity";

export const ageBasedGuide = defineType({
  name: "ageBasedGuide",
  title: "Age-Based Guide",
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
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "relatedReviews",
      title: "Related Reviews",
      type: "array",
      of: [{ type: "reference", to: [{ type: "toyReview" }] }],
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "reference",
      to: [{ type: "category" }],
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
