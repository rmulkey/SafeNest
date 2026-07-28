import { defineType, defineField } from "sanity";

/**
 * A possible — but not confirmed — link between a CPSC recall and a reviewed toy.
 *
 * The matcher only auto-confirms on strong, explainable evidence (a model-number
 * hit, or brand plus multiple distinctive shared terms). Everything weaker lands
 * here for a human to adjudicate, so the site never tells a parent a toy is
 * recalled on the strength of a coincidence, and never silently discards a lead.
 *
 * These documents are internal: they are not rendered on the public site until a
 * human sets status to "confirmed".
 */
export const recallMatchCandidate = defineType({
  name: "recallMatchCandidate",
  title: "Recall Match Candidate (needs review)",
  type: "document",
  fields: [
    defineField({
      name: "status",
      title: "Review Status",
      type: "string",
      options: {
        list: [
          { title: "Pending human review", value: "pending" },
          { title: "Confirmed — is the same product", value: "confirmed" },
          { title: "Rejected — different product", value: "rejected" },
        ],
        layout: "radio",
      },
      initialValue: "pending",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "recallNumber",
      title: "CPSC Recall Number",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "recallTitle",
      title: "Recall Title",
      type: "string",
    }),
    defineField({
      name: "officialNoticeUrl",
      title: "Official CPSC Notice",
      type: "url",
      description: "Open this to adjudicate the match against the real notice.",
    }),
    defineField({
      name: "review",
      title: "Possibly Affected Review",
      type: "reference",
      to: [{ type: "toyReview" }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "matchEvidence",
      title: "Why This Was Flagged",
      type: "array",
      of: [{ type: "string" }],
      description:
        "Machine-generated justification. Recorded so the decision is auditable.",
      readOnly: true,
    }),
    defineField({
      name: "matchScore",
      title: "Match Score",
      type: "number",
      readOnly: true,
    }),
    defineField({
      name: "detectedAt",
      title: "Detected At",
      type: "datetime",
      readOnly: true,
    }),
    defineField({
      name: "reviewedBy",
      title: "Adjudicated By",
      type: "string",
      description: "Who made the confirm/reject decision.",
    }),
    defineField({
      name: "reviewedAt",
      title: "Adjudicated At",
      type: "datetime",
    }),
  ],
  preview: {
    select: { title: "recallTitle", subtitle: "status" },
  },
});
