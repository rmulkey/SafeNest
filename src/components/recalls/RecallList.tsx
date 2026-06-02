import Link from "next/link";

export interface RecallEntry {
  _id: string;
  affectedProduct: string;
  recallDate: string;
  recallReason: string;
  issuingAuthority: string;
  officialNoticeUrl?: string;
  publishedAt: string;
  affectedReviews?: { _id: string; productName: string; slug: { current: string } }[];
}

interface RecallListProps {
  recalls: RecallEntry[];
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
      {recalls.map((recall) => (
        <li key={recall._id} className="py-6">
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {recall.affectedProduct}
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              <span className="font-medium">Reason:</span> {recall.recallReason}
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              <span className="font-medium">Issuing Authority:</span>{" "}
              {recall.issuingAuthority}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-500">
              <span className="font-medium">Date Published:</span>{" "}
              {new Date(recall.publishedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            {recall.officialNoticeUrl && (
              <Link
                href={recall.officialNoticeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                View Official Recall Notice →
              </Link>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
