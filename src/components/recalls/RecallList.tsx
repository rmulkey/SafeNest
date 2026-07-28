import Link from "next/link";

export interface RecallEntry {
  _id: string;
  affectedProduct: string;
  recallDate?: string;
  recallReason: string;
  issuingAuthority: string;
  recommendedAction?: string;
  officialNoticeUrl?: string;
  publishedAt: string;
  affectedReviews?: { _id: string; productName: string; slug: { current: string } }[];
  // Provenance from the CPSC sync. Rendered so readers can see that the hazard
  // and remedy wording is CPSC's, not SafeNest's assessment.
  cpscRecallNumber?: string;
  hazards?: string[];
  affectedModels?: string[];
  manufacturers?: string[];
  sourceAttribution?: string;
}

interface RecallListProps {
  recalls: RecallEntry[];
}

function formatDate(value?: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function RecallList({ recalls }: RecallListProps) {
  if (recalls.length === 0) {
    return (
      <p className="text-zinc-500 dark:text-zinc-400 py-8 text-center">
        No active recall alerts at this time.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-zinc-200 dark:divide-zinc-700" role="list">
      {recalls.map((recall) => {
        // Prefer the official recall date over our ingestion timestamp.
        const displayDate =
          formatDate(recall.recallDate) ?? formatDate(recall.publishedAt);
        const hazard =
          recall.hazards && recall.hazards.length > 0
            ? recall.hazards.join(" ")
            : recall.recallReason;

        return (
          <li key={recall._id} className="py-6">
            <article className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {recall.affectedProduct}
              </h3>

              <dl className="grid gap-1.5 text-sm">
                {displayDate && (
                  <div className="flex gap-2">
                    <dt className="font-medium text-zinc-700 dark:text-zinc-300">
                      Recall date:
                    </dt>
                    <dd className="text-zinc-600 dark:text-zinc-400">
                      <time dateTime={recall.recallDate ?? recall.publishedAt}>
                        {displayDate}
                      </time>
                    </dd>
                  </div>
                )}

                <div className="flex gap-2">
                  <dt className="font-medium text-zinc-700 dark:text-zinc-300">
                    Hazard:
                  </dt>
                  <dd className="text-zinc-600 dark:text-zinc-400">{hazard}</dd>
                </div>

                {recall.recommendedAction && (
                  <div className="flex gap-2">
                    <dt className="font-medium text-zinc-700 dark:text-zinc-300">
                      Remedy:
                    </dt>
                    <dd className="text-zinc-600 dark:text-zinc-400">
                      {recall.recommendedAction}
                    </dd>
                  </div>
                )}

                {recall.affectedModels && recall.affectedModels.length > 0 && (
                  <div className="flex gap-2">
                    <dt className="font-medium text-zinc-700 dark:text-zinc-300">
                      Affected model(s):
                    </dt>
                    <dd className="text-zinc-600 dark:text-zinc-400">
                      {recall.affectedModels.join(", ")}
                    </dd>
                  </div>
                )}

                {recall.manufacturers && recall.manufacturers.length > 0 && (
                  <div className="flex gap-2">
                    <dt className="font-medium text-zinc-700 dark:text-zinc-300">
                      Manufacturer:
                    </dt>
                    <dd className="text-zinc-600 dark:text-zinc-400">
                      {recall.manufacturers.join(", ")}
                    </dd>
                  </div>
                )}

                <div className="flex gap-2">
                  <dt className="font-medium text-zinc-700 dark:text-zinc-300">
                    Source:
                  </dt>
                  <dd className="text-zinc-600 dark:text-zinc-400">
                    {recall.sourceAttribution ?? recall.issuingAuthority}
                    {recall.cpscRecallNumber
                      ? ` · Recall no. ${recall.cpscRecallNumber}`
                      : ""}
                  </dd>
                </div>
              </dl>

              {/* Reviews are linked only when the sync confirmed an unambiguous
                  match; uncertain matches are held for human review. */}
              {recall.affectedReviews && recall.affectedReviews.length > 0 && (
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  <span className="font-medium">Reviewed on SafeNest:</span>{" "}
                  {recall.affectedReviews.map((r, i) => (
                    <span key={r._id}>
                      {i > 0 && ", "}
                      <Link
                        href={`/reviews/${r.slug.current}`}
                        className="text-primary-600 underline hover:text-primary-700"
                      >
                        {r.productName}
                      </Link>
                    </span>
                  ))}
                </p>
              )}

              {recall.officialNoticeUrl && (
                <a
                  href={recall.officialNoticeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-red-600 underline hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  Read the official recall notice
                  <span className="sr-only"> for {recall.affectedProduct}</span>{" "}
                  (opens in a new tab) →
                </a>
              )}
            </article>
          </li>
        );
      })}
    </ul>
  );
}
