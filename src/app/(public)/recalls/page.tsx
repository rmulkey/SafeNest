import type { Metadata } from "next";
import { sanityClient } from "@/lib/sanity/client";
import {
  activeRecallAlertsQuery,
  recallAlertCountQuery,
} from "@/lib/sanity/queries";
import { RecallList, type RecallEntry } from "@/components/recalls/RecallList";
import Link from "next/link";
import { generateOpenGraphMeta } from "@/components/seo/OpenGraphMeta";
import { SITE_URL } from "@/lib/seo/site-config";

export const metadata: Metadata = {
  title: "Toy Recall Alerts | SafeNest Toys",
  description:
    "Stay informed about toy recalls and safety alerts. Up-to-date information on recalled products and recommended actions for parents.",
  ...generateOpenGraphMeta({
    title: "Toy Recall Alerts | SafeNest Toys",
    description:
      "Stay informed about toy recalls and safety alerts. Up-to-date information on recalled products and recommended actions for parents.",
    url: `${SITE_URL}/recalls`,
  }),
};

const RECALLS_PER_PAGE = 50;

interface RecallsPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function RecallsPage({ searchParams }: RecallsPageProps) {
  const params = await searchParams;
  const currentPage = Math.max(1, Number(params.page) || 1);
  const start = (currentPage - 1) * RECALLS_PER_PAGE;
  const end = start + RECALLS_PER_PAGE;

  const [recalls, totalCount] = await Promise.all([
    sanityClient.fetch<RecallEntry[]>(activeRecallAlertsQuery, { start, end }),
    sanityClient.fetch<number>(recallAlertCountQuery),
  ]);

  const totalPages = Math.ceil(totalCount / RECALLS_PER_PAGE);
  const lastUpdated = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        Recall Alerts
      </h1>

      <p className="mb-8 text-sm text-zinc-500 dark:text-zinc-400">
        Last updated: {lastUpdated}
      </p>

      <RecallList recalls={recalls} />

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          aria-label="Recall alerts pagination"
          className="mt-12 flex items-center justify-center gap-4"
        >
          {currentPage > 1 && (
            <Link
              href={`/recalls?page=${currentPage - 1}`}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Previous
            </Link>
          )}
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            Page {currentPage} of {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link
              href={`/recalls?page=${currentPage + 1}`}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Next
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
