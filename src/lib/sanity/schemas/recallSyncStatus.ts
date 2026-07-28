import { defineType, defineField } from "sanity";

/**
 * Singleton document recording the outcome of CPSC recall synchronisation.
 *
 * This exists so the recalls page can state how current its data actually is
 * instead of asserting a monitoring frequency. `lastSuccessfulSyncAt` is only
 * written when a sync completed with zero failed windows, so a partial run can
 * never masquerade as full coverage.
 */
export const recallSyncStatus = defineType({
  name: "recallSyncStatus",
  title: "Recall Sync Status",
  type: "document",
  // Singleton: the sync job always writes the fixed id `recall-sync-status`.
  fields: [
    defineField({
      name: "lastSuccessfulSyncAt",
      title: "Last Successful Sync",
      type: "datetime",
      description:
        "Completion time of the most recent sync that had zero failed windows. Drives the freshness indicator shown to users.",
    }),
    defineField({
      name: "lastAttemptAt",
      title: "Last Attempt",
      type: "datetime",
      description: "When a sync last ran, successful or not.",
    }),
    defineField({
      name: "lastAttemptOk",
      title: "Last Attempt Succeeded",
      type: "boolean",
    }),
    defineField({
      name: "lastError",
      title: "Last Error",
      type: "text",
      description: "Failure detail from the most recent unsuccessful sync.",
    }),
    defineField({
      name: "consecutiveFailures",
      title: "Consecutive Failures",
      type: "number",
      description: "Used to alert when the scheduled job is silently broken.",
    }),
    defineField({
      name: "recallsFetched",
      title: "Recalls Fetched (last run)",
      type: "number",
    }),
    defineField({
      name: "recallsUpserted",
      title: "Recalls Created/Updated (last run)",
      type: "number",
    }),
    defineField({
      name: "duplicatesCollapsed",
      title: "Duplicates Collapsed (last run)",
      type: "number",
    }),
    defineField({
      name: "skippedIncomplete",
      title: "Skipped Incomplete Records (last run)",
      type: "number",
    }),
    defineField({
      name: "matchCandidatesQueued",
      title: "Match Candidates Queued (last run)",
      type: "number",
    }),
    defineField({
      name: "sourceAttribution",
      title: "Data Source",
      type: "string",
      initialValue: "U.S. Consumer Product Safety Commission (CPSC)",
      readOnly: true,
    }),
  ],
  preview: {
    select: { title: "lastSuccessfulSyncAt", subtitle: "lastError" },
  },
});
