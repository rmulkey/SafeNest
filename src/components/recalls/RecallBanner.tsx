import Link from "next/link";

interface RecallBannerProps {
  recallReason: string;
}

export function RecallBanner({ recallReason }: RecallBannerProps) {
  return (
    <div
      role="alert"
      className="rounded-md border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950"
    >
      <div className="flex items-start gap-3">
        <span className="text-xl" aria-hidden="true">
          ⚠️
        </span>
        <div className="flex flex-col gap-1">
          <p className="font-semibold text-red-800 dark:text-red-200">
            This product is subject to an active recall
          </p>
          <p className="text-sm text-red-700 dark:text-red-300">
            {recallReason}
          </p>
          <Link
            href="/recalls"
            className="mt-1 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            View all recall alerts →
          </Link>
        </div>
      </div>
    </div>
  );
}
