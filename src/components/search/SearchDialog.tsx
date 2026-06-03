"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, Loader2, ArrowRight } from "lucide-react";
import { urlForImage } from "@/lib/sanity/client";
import type { SearchableReview } from "@/lib/search/filter";

const DEBOUNCE_MS = 200;

const POPULAR_CATEGORIES = [
  { label: "Building", href: "/categories/building-toys" },
  { label: "Sensory", href: "/categories/sensory-toys" },
  { label: "Outdoor", href: "/categories/outdoor-toys" },
  { label: "Educational", href: "/categories/educational-toys" },
];

type Status = "idle" | "loading" | "loaded";

interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
}

function formatAgeRange(range: SearchableReview["ageRange"]): string | null {
  if (!range) return null;
  const { minMonths, maxMonths } = range;
  if (maxMonths < 12) return `${minMonths}–${maxMonths} mo`;
  const minYears = Math.floor(minMonths / 12);
  const maxYears = Math.floor(maxMonths / 12);
  if (minMonths < 12) return `${minMonths}mo–${maxYears}yr`;
  return `${minYears}–${maxYears} yr`;
}

/**
 * Public wrapper. Only mounts the dialog body while `open` is true so that all
 * transient state (query, results) is created fresh on each open — no reset
 * effect required, which keeps state updates out of effect bodies.
 */
export function SearchDialog({ open, onClose }: SearchDialogProps) {
  if (!open) return null;
  return <SearchDialogContent onClose={onClose} />;
}

/**
 * Global command-palette style search dialog body.
 *
 * Accessibility:
 * - role="dialog" + aria-modal, labelled by the search heading.
 * - Focus moves to the input on open and is trapped within the dialog.
 * - Escape closes; the parent trigger restores focus to itself.
 * - Combobox/listbox pattern with aria-activedescendant for arrow-key nav.
 */
function SearchDialogContent({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchableReview[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const headingId = useId();

  const trimmedQuery = query.trim();
  const optionId = useCallback(
    (index: number) => `${listboxId}-option-${index}`,
    [listboxId]
  );

  // Focus the input once after mount.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced fetch against the search API. State updates happen inside the
  // async timer / abort callbacks, never synchronously in the effect body.
  useEffect(() => {
    if (trimmedQuery === "") return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmedQuery)}`,
          { signal: controller.signal }
        );
        const data = await res.json().catch(() => ({ results: [] }));
        setResults(Array.isArray(data.results) ? data.results : []);
        setActiveIndex(-1);
        setStatus("loaded");
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        setResults([]);
        setStatus("loaded");
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmedQuery]);

  // Prevent background scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      setQuery(next);
      if (next.trim() === "") {
        setResults([]);
        setStatus("idle");
        setActiveIndex(-1);
      } else {
        setStatus("loading");
      }
    },
    []
  );

  const navigateToResult = useCallback(
    (review: SearchableReview) => {
      onClose();
      router.push(`/reviews/${review.slug.current}`);
    },
    [onClose, router]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      // Trap Tab focus within the dialog.
      if (e.key === "Tab") {
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables || focusables.length === 0) return;
        const list = Array.from(focusables);
        const first = list[0];
        const last = list[list.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
        return;
      }

      if (results.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % results.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
      } else if (e.key === "Enter") {
        if (activeIndex >= 0 && activeIndex < results.length) {
          e.preventDefault();
          navigateToResult(results[activeIndex]);
        }
      }
    },
    [results, activeIndex, navigateToResult, onClose]
  );

  const activeDescendant = useMemo(
    () => (activeIndex >= 0 ? optionId(activeIndex) : undefined),
    [activeIndex, optionId]
  );

  const showEmpty =
    status === "loaded" && trimmedQuery !== "" && results.length === 0;
  const showResults = results.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh]"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close search"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-primary-900/30 backdrop-blur-sm"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search toy reviews"
        aria-labelledby={headingId}
        className="relative w-full max-w-xl overflow-hidden rounded-xl border border-border bg-background shadow-xl"
      >
        <h2 id={headingId} className="sr-only">
          Search toy reviews
        </h2>

        {/* Input row */}
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search
            className="size-5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={showResults}
            aria-controls={listboxId}
            aria-activedescendant={activeDescendant}
            aria-autocomplete="list"
            aria-label="Search toy reviews"
            value={query}
            onChange={handleQueryChange}
            placeholder="Search toys by name or category…"
            className="w-full bg-transparent py-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          {status === "loading" && (
            <Loader2
              className="size-5 shrink-0 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
          )}
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {/* Initial state: popular categories */}
          {status === "idle" && trimmedQuery === "" && (
            <div className="px-2 py-3">
              <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Popular categories
              </p>
              <ul className="flex flex-wrap gap-2 px-2">
                {POPULAR_CATEGORIES.map((cat) => (
                  <li key={cat.href}>
                    <Link
                      href={cat.href}
                      onClick={onClose}
                      className="inline-flex items-center rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {cat.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Loading state */}
          {status === "loading" && (
            <div
              role="status"
              aria-label="Searching"
              className="flex items-center justify-center gap-2 px-2 py-8 text-sm text-muted-foreground"
            >
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              <span className="sr-only">Searching</span>
              <span aria-hidden="true">Searching…</span>
            </div>
          )}

          {/* Empty state */}
          {showEmpty && (
            <div className="flex flex-col items-center px-4 py-10 text-center">
              <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
                <Search
                  className="size-6 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
              <p className="text-sm font-medium text-foreground">
                No toys match “{trimmedQuery}”
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a different name or browse our full catalog.
              </p>
              <Link
                href="/reviews"
                onClick={onClose}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
              >
                Browse all reviews
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          )}

          {/* Results */}
          {showResults && (
            <ul
              id={listboxId}
              role="listbox"
              aria-label="Search results"
              className="space-y-1"
            >
              {results.map((review, index) => {
                const isActive = index === activeIndex;
                const ageLabel = formatAgeRange(review.ageRange);
                return (
                  <li key={review._id} role="presentation">
                    <Link
                      id={optionId(index)}
                      role="option"
                      aria-selected={isActive}
                      href={`/reviews/${review.slug.current}`}
                      onClick={onClose}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                        isActive ? "bg-primary-50" : "hover:bg-muted"
                      }`}
                    >
                      <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {review.mainImage?.asset?._ref ? (
                          <Image
                            src={urlForImage(review.mainImage)
                              .width(96)
                              .height(96)
                              .url()}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-xl">
                            🧸
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {review.productName}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                          {review.category && <span>{review.category}</span>}
                          {ageLabel && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{ageLabel}</span>
                            </>
                          )}
                        </span>
                      </span>
                      {typeof review.safetyScore === "number" && (
                        <span className="shrink-0 rounded-full bg-secondary-100 px-2.5 py-1 text-xs font-semibold text-secondary-800">
                          {review.safetyScore}/100
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
