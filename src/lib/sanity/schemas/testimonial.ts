import { defineType, defineField } from "sanity";

/**
 * Parent testimonial. ONLY add entries that are genuine, with the person's
 * verifiable consent. Per FTC endorsement rules and our data-integrity policy,
 * never create fictitious testimonials. The homepage renders this section only
 * when at least one approved testimonial exists.
 */
export const testimonial = defineType({
  name: "testimonial",
  title: "Parent Testimonial",
  type: "document",
  fields: [
    defineField({
      name: "quote",
      title: "Quote",
      type: "text",
      description: "The parent's exact words, as given with their consent.",
      validation: (Rule) => Rule.required().min(20).max(400),
    }),
    defineField({
      name: "authorName",
      title: "Author name (or initial)",
      type: "string",
      description: "e.g. 'Jessica R.' — use only what the person consented to share.",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "authorContext",
      title: "Author context",
      type: "string",
      description: "e.g. 'Mom of two, Austin TX'. Optional.",
    }),
    defineField({
      name: "avatar",
      title: "Avatar (optional)",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "consentVerified",
      title: "Consent verified",
      type: "boolean",
      description:
        "Confirm you have documented permission to publish this testimonial. Required before it can be approved.",
      initialValue: false,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "approved",
      title: "Approved for display",
      type: "boolean",
      description: "Only approved, consent-verified testimonials appear on the site.",
      initialValue: false,
    }),
    defineField({
      name: "order",
      title: "Display order",
      type: "number",
      initialValue: 0,
    }),
  ],
  preview: {
    select: { title: "authorName", subtitle: "quote" },
  },
});
