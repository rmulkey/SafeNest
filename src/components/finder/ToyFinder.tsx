"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Baby, Sparkles, Wallet, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import { urlForImage } from "@/lib/sanity/client";
import { BuyButton } from "@/components/affiliate/BuyButton";
import { formatAgeRange } from "@/lib/content/format-age";

/* ── Static option data (matches real Sanity category slugs) ──────────────── */

// `months` is the representative age used to query; the label is formatted from
// the range it stands for so the finder matches the rest of the site.
const AGE_OPTIONS = [
  { label: formatAgeRange(0, 6), months: 4 },
  { label: formatAgeRange(6, 12), months: 9 },
  { label: formatAgeRange(12, 24), months: 18 },
  { label: formatAgeRange(24, 36), months: 30 },
  { label: "3 years and up", months: 42 },
] as const;

const INTEREST_OPTIONS = [
  { label: "Building", slug: "building-toys", emoji: "🧱" },
  { label: "Sensory", slug: "sensory-toys", emoji: "🌈" },
  { label: "Outdoor", slug: "outdoor-toys", emoji: "🌳" },
  { label: "Educational", slug: "educational-toys", emoji: "📚" },
] as const;

const BUDGET_OPTIONS = [
  { label: "Under $25", value: "under-25" },
  { label: "$25–$50", value: "25-50" },
  { label: "$50+", value: "50-plus" },
  { label: "No preference", value: "any" },
] as const;

/* ── Types ────────────────────────────────────────────────────────────────── */

interface FinderResult {
  _id: string;
  productName: string;
  slug: { current: string };
  ageRange: { minMonths: number; maxMonths: number };
  safetyScore: number;
  developmentScore: number;
  hasActiveRecall: boolean;
  affiliateLinks?: { partnerId: string; url: string; tag: string }[];
  mainImage?: { asset: { _ref: string }; alt?: string };
  category?: { title: string; slug: string } | null;
}

type Step = 0 | 1 | 2 | 3; // 0=age, 1=interests, 2=budget, 3=results

const STEP_META = [
  { icon: Baby, title: "How old is your child?", hint: "We match toys to age-appropriate safety standards." },
  { icon: Sparkles, title: "What are they into?", hint: "Pick any that apply — or skip to see top picks." },
  { icon: Wallet, title: "Any budget in mind?", hint: "Helps us frame picks. Live prices are always shown on Amazon." },
];

export function ToyFinder() {
  const [step, setStep] = useState<Step>(0);
  const [ageMonths, setAgeMonths] = useState<number | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [budget, setBudget] = useState<string>("any");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<FinderResult[] | null>(null);
  const [relaxed, setRelaxed] = useState(false);

  function toggleInterest(slug: string) {
    setInterests((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  async function fetchResults() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/toy-finder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ageMonths, categories: interests, budget }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Something went wrong.");
      setResults(data.results);
      setRelaxed(Boolean(data.relaxed));
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep(0);
    setAgeMonths(null);
    setInterests([]);
    setBudget("any");
    setResults(null);
    setError(null);
    setRelaxed(false);
  }

  const progress = step < 3 ? ((step + 1) / 3) * 100 : 100;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
        {/* Header + progress */}
        <div className="border-b border-border bg-gradient-to-r from-primary-50 to-secondary-50 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary-600" aria-hidden="true" />
            <h2 className="text-base font-semibold text-foreground">
              Find a Safe Toy in 30 Seconds
            </h2>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/70">
            <div
              className="h-full rounded-full bg-primary-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Toy Finder progress"
            />
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {/* ── Steps 0–2: questions ─────────────────────────────────────── */}
          {step < 3 && (
            <div>
              <div className="mb-5 flex items-start gap-3">
                {(() => {
                  const Icon = STEP_META[step].icon;
                  return (
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                      <Icon className="size-5" />
                    </span>
                  );
                })()}
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {STEP_META[step].title}
                  </p>
                  <p className="text-sm text-muted-foreground">{STEP_META[step].hint}</p>
                </div>
              </div>

              {/* Step 0: age */}
              {step === 0 && (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                  {AGE_OPTIONS.map((opt) => {
                    const active = ageMonths === opt.months;
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => {
                          setAgeMonths(opt.months);
                          setStep(1);
                        }}
                        className={`rounded-xl border px-3 py-4 text-sm font-medium transition-all ${
                          active
                            ? "border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-500/30"
                            : "border-border bg-background text-foreground hover:border-primary-300 hover:bg-primary-50/50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Step 1: interests (multi-select) */}
              {step === 1 && (
                <div className="grid grid-cols-2 gap-2.5">
                  {INTEREST_OPTIONS.map((opt) => {
                    const active = interests.includes(opt.slug);
                    return (
                      <button
                        key={opt.slug}
                        type="button"
                        onClick={() => toggleInterest(opt.slug)}
                        aria-pressed={active}
                        className={`flex items-center gap-2.5 rounded-xl border px-4 py-3.5 text-sm font-medium transition-all ${
                          active
                            ? "border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-500/30"
                            : "border-border bg-background text-foreground hover:border-primary-300 hover:bg-primary-50/50"
                        }`}
                      >
                        <span className="text-lg" aria-hidden="true">{opt.emoji}</span>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Step 2: budget */}
              {step === 2 && (
                <div className="grid grid-cols-2 gap-2.5">
                  {BUDGET_OPTIONS.map((opt) => {
                    const active = budget === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setBudget(opt.value)}
                        aria-pressed={active}
                        className={`rounded-xl border px-4 py-3.5 text-sm font-medium transition-all ${
                          active
                            ? "border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-500/30"
                            : "border-border bg-background text-foreground hover:border-primary-300 hover:bg-primary-50/50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {error && (
                <p className="mt-4 text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}

              {/* Nav controls */}
              <div className="mt-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep((s) => (s > 0 ? ((s - 1) as Step) : s))}
                  disabled={step === 0}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-0"
                >
                  ← Back
                </button>

                {step === 1 && (
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
                  >
                    {interests.length > 0 ? "Continue" : "Skip"}
                  </button>
                )}

                {step === 2 && (
                  <button
                    type="button"
                    onClick={fetchResults}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors disabled:opacity-70"
                  >
                    {loading && <Loader2 className="size-4 animate-spin" />}
                    {loading ? "Finding toys…" : "Show my matches"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Step 3: results ──────────────────────────────────────────── */}
          {step === 3 && results && (
            <div>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {results.length > 0
                      ? `Top ${results.length} safe ${results.length === 1 ? "pick" : "picks"} for you`
                      : "No exact matches yet"}
                  </p>
                  {relaxed && results.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      We broadened your interests to show the highest-scoring options for this age.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  <RotateCcw className="size-4" />
                  Start over
                </button>
              </div>

              {results.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    We don&apos;t have a reviewed match for that combination yet. Browse all
                    reviews instead.
                  </p>
                  <Link
                    href="/reviews"
                    className="mt-4 inline-flex rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
                  >
                    Browse all reviews
                  </Link>
                </div>
              ) : (
                <ul className="space-y-3">
                  {results.map((r) => {
                    const link = r.affiliateLinks?.[0];
                    return (
                      <li
                        key={r._id}
                        className="flex items-center gap-3 rounded-xl border border-border p-3 transition-shadow hover:shadow-sm"
                      >
                        <Link
                          href={`/reviews/${r.slug.current}`}
                          className="group flex min-w-0 flex-1 items-center gap-3"
                        >
                          <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                            {r.mainImage ? (
                              <Image
                                src={urlForImage(r.mainImage).width(128).height(128).url()}
                                alt={r.mainImage.alt || r.productName}
                                fill
                                className="object-cover"
                                sizes="64px"
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-xl">🧸</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground group-hover:text-primary-600 transition-colors">
                              {r.productName}
                            </p>
                            <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-semibold text-secondary-700">
                                Safety {r.safetyScore}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="font-semibold text-primary-700">
                                Dev {r.developmentScore}
                              </span>
                            </p>
                            {r.hasActiveRecall && (
                              <p className="mt-0.5 text-xs font-medium text-red-600">⚠ Active recall</p>
                            )}
                          </div>
                        </Link>
                        {link && (
                          <BuyButton
                            url={link.url}
                            tag={link.tag}
                            size="sm"
                            label="Check Price"
                            className="shrink-0"
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              <p className="mt-4 text-center text-xs text-muted-foreground">
                As an Amazon Associate, SafeNest earns from qualifying purchases. Scores are
                independent of affiliate partnerships.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
