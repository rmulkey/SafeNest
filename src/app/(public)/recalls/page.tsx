import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { sanityClient } from "@/lib/sanity/client";
import {
  activeRecallAlertsQuery,
  recallAlertCountQuery,
  searchRecallAlertsQuery,
  searchRecallAlertCountQuery,
} from "@/lib/sanity/queries";
import {
  parsePageParam,
  pageBounds,
  countPages,
  isPageOutOfRange,
  buildPageHref,
} from "@/lib/seo/pagination";
import { RecallList, type RecallEntry } from "@/components/recalls/RecallList";
import { RecallFreshness } from "@/components/recalls/RecallFreshness";
import { generateOpenGraphMeta } from "@/components/seo/OpenGraphMeta";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { SITE_URL } from "@/lib/seo/site-config";
import { getRecallSyncStatus } from "@/lib/recalls/sync";
import { getFreshnessStatus } from "@/lib/recalls/freshness";
import { CPSC_ATTRIBUTION } from "@/lib/recalls/cpsc-client";

const TITLE = "Toy Recall Alerts from the CPSC | SafeNest Toys";
const DESCRIPTION =
  "Current children's product recalls republished from the U.S. CPSC public database, with hazard, remedy, affected models, and a link to each official notice.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...generateOpenGraphMeta({
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/recalls`,
  }),
};

const RECALLS_PER_PAGE = 25;

interface RecallsPageProps {
  searchParams: Promise<{ page?: string; q?: string }>;
}

export default async function RecallsPage({ searchParams }: RecallsPageProps) {
  const params = await searchParams;
  const currentPage = parsePageParam(params.page);
  const rawQuery = (params.q ?? "").trim();
  const { start, end } = pageBounds(currentPage, RECALLS_PER_PAGE);

  // GROQ `match` uses glob semantics; wrap the term so partial words match.
  const searching = rawQuery.length >= 2;
  const globQuery = `*${rawQuery}*`;

  const [recalls, totalCount, syncStatus] = await Promise.all([
    searching
      ? sanityClient.fetch<RecallEntry[]>(searchRecallAlertsQuery, {
          q: globQuery,
          start,
          end,
        })
      : sanityClient.fetch<RecallEntry[]>(activeRecallAlertsQuery, { start, end }),
    searching
      ? sanityClient.fetch<number>(searchRecallAlertCountQuery, { q: globQuery })
      : sanityClient.fetch<number>(recallAlertCountQuery),
    getRecallSyncStatus(sanityClient),
  ]);

  // Past the last page is a 404, not an empty state at HTTP 200. `?page=99999`
  // used to render "No recalls are currently on file.", which is a soft 404 and
  // makes `?page=` unbounded crawl space.
  if (isPageOutOfRange(currentPage, totalCount, RECALLS_PER_PAGE)) {
    notFound();
  }

  const totalPages = countPages(totalCount, RECALLS_PER_PAGE);
  const freshness = getFreshnessStatus(syncStatus.lastSuccessfulSyncAt);

  const pageHref = (page: number) =>
    buildPageHref("/recalls", page, { q: rawQuery });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: SITE_URL },
          { name: "Recall Alerts", url: `${SITE_URL}/recalls` },
        ]}
      />

      <h1 className="mb-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        Toy &amp; Children&apos;s Product Recalls
      </h1>
      <p className="mb-6 text-zinc-600 dark:text-zinc-400">
        Recalls affecting children&apos;s products, republished from the{" "}
        {CPSC_ATTRIBUTION} public recall database.
      </p>

      {/* Truthful freshness, driven by the real last-successful-sync time. */}
      <div className="mb-8">
        <RecallFreshness status={freshness} />
      </div>

      {/* Search */}
      <form action="/recalls" method="get" className="mb-8" role="search">
        <label
          htmlFor="recall-search"
          className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Search recalls by product, brand, hazard, or CPSC recall number
        </label>
        <div className="flex gap-2">
          <input
            id="recall-search"
            name="q"
            type="search"
            defaultValue={rawQuery}
            placeholder="e.g. teething, magnets, stroller"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <button
            type="submit"
            className="shrink-0 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
          >
            Search
          </button>
        </div>
      </form>

      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400" aria-live="polite">
        {searching ? (
          <>
            {totalCount} recall{totalCount === 1 ? "" : "s"} matching{" "}
            <strong>{rawQuery}</strong>.{" "}
            <Link href="/recalls" className="text-primary-600 underline">
              Clear search
            </Link>
          </>
        ) : (
          <>{totalCount} recall{totalCount === 1 ? "" : "s"} on file.</>
        )}
      </p>

      {recalls.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <p className="font-medium text-zinc-800 dark:text-zinc-200">
            {searching
              ? "No recalls matched that search."
              : "No recalls are currently on file."}
          </p>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            This page only reflects what SafeNest has synchronised. Search the{" "}
            <a
              href="https://www.cpsc.gov/Recalls"
              className="text-primary-600 underline"
              rel="noopener noreferrer"
              target="_blank"
            >
              official CPSC recall database
            </a>{" "}
            to be certain.
          </p>
        </div>
      ) : (
        <RecallList recalls={recalls} />
      )}

      {totalPages > 1 && (
        <nav
          aria-label="Recall alerts pagination"
          className="mt-12 flex items-center justify-center gap-4"
        >
          {currentPage > 1 && (
            <Link
              href={pageHref(currentPage - 1)}
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
              href={pageHref(currentPage + 1)}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Next
            </Link>
          )}
        </nav>
      )}

      <section className="mt-12 rounded-lg border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
        <h2 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-100">
          How to use this page
        </h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            SafeNest republishes public CPSC data. We do not issue recalls or
            determine whether a product is defective.
          </li>
          <li>
            Always open the official CPSC notice for the authoritative hazard
            description, affected units, and remedy instructions.
          </li>
          <li>
            A recall is only linked to one of our reviews when the match is
            unambiguous. Possible-but-unconfirmed matches are held for human
            review and are not shown here.
          </li>
          <li>
            Stop using a recalled product immediately and follow the
            manufacturer&apos;s remedy instructions.
          </li>
        </ul>
      </section>
    </div>
  );
}
