import { defineType, defineField } from "sanity";

export const blogPost = defineType({
  name: "blogPost",
  title: "Blog Post",
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
      name: "excerpt",
      title: "Excerpt",
      type: "text",
      description: "Short summary for listings and SEO",
      validation: (Rule) => Rule.max(300),
    }),
    defineField({
      name: "body",
      title: "Post Body",
      type: "blockContent",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "reference",
      to: [{ type: "category" }],
    }),
    defineField({
      name: "relatedReviews",
      title: "Related Reviews",
      type: "array",
      of: [{ type: "reference", to: [{ type: "toyReview" }] }],
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
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "seasonal",
      title: "Seasonal Window",
      type: "object",
      description:
        "Optional. For holiday/seasonal posts, the window when this content is relevant. " +
        "It recurs every year, so the post resurfaces automatically each season. " +
        "Outside the window the post stays published and indexed, just not featured. " +
        "Use MM-DD (e.g. 06-15). The end may be earlier than the start to wrap the new year (e.g. 11-15 to 01-05).",
      options: { collapsible: true, collapsed: true },
      fields: [
        defineField({
          name: "startMonthDay",
          title: "Season starts (MM-DD)",
          type: "string",
          validation: (Rule) =>
            Rule.regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, {
              name: "MM-DD",
            }).error("Use MM-DD, e.g. 06-15"),
        }),
        defineField({
          name: "endMonthDay",
          title: "Season ends (MM-DD)",
          type: "string",
          validation: (Rule) =>
            Rule.regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, {
              name: "MM-DD",
            }).error("Use MM-DD, e.g. 07-05"),
        }),
      ],
    }),
  ],
  preview: {
    select: {
      title: "title",
      media: "mainImage",
    },
  },
});
