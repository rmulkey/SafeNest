import { defineType, defineField } from "sanity";

/**
 * Expert / pediatrician endorsement or advisory-board member.
 *
 * CRITICAL: Only add real, named professionals who have given documented consent
 * to be associated with SafeNest. Fabricating health-professional endorsements is
 * prohibited by FTC rules and our data-integrity policy, and is especially harmful
 * on a child-safety site. The homepage renders this section only when at least one
 * approved endorsement exists.
 */
export const expertEndorsement = defineType({
  name: "expertEndorsement",
  title: "Expert Endorsement",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Full name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "credentials",
      title: "Credentials",
      type: "string",
      description: "e.g. 'MD, FAAP, Pediatrician'.",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "affiliation",
      title: "Affiliation",
      type: "string",
      description: "e.g. 'Boston Children's Hospital'. Optional.",
    }),
    defineField({
      name: "quote",
      title: "Endorsement quote",
      type: "text",
      validation: (Rule) => Rule.required().min(20).max(500),
    }),
    defineField({
      name: "headshot",
      title: "Headshot",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "profileUrl",
      title: "Verifiable profile URL",
      type: "url",
      description:
        "Link to the professional's official bio/registry so visitors can verify them.",
    }),
    defineField({
      name: "consentVerified",
      title: "Consent verified",
      type: "boolean",
      description:
        "Confirm you have documented, written permission from this professional. Required before approval.",
      initialValue: false,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "approved",
      title: "Approved for display",
      type: "boolean",
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
    select: { title: "name", subtitle: "credentials" },
  },
});
