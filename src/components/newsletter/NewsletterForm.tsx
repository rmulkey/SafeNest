"use client";

import { useState, useId } from "react";
import { Loader2, CheckCircle2, Mail } from "lucide-react";
import { trackNewsletterSignup } from "@/lib/analytics/events";

type Status = "idle" | "submitting" | "success" | "error";

interface NewsletterFormProps {
  /** Visual treatment. "hero" = larger homepage block, "inline" = compact blog/article footer. */
  variant?: "hero" | "inline";
  /** Optional className passthrough on the wrapper. */
  className?: string;
}

const AGE_OPTIONS = [
  { value: "0-2", label: "0–2 years" },
  { value: "3-5", label: "3–5 years" },
  { value: "6-8", label: "6–8 years" },
  { value: "9-12", label: "9–12 years" },
] as const;

/**
 * First-party newsletter signup form.
 *
 * Posts to /api/newsletter/subscribe, which stores the subscriber in SafeNest's
 * own PostgreSQL database (no third-party email service). On success it fires the
 * `newsletter_signup` analytics conversion event so signups show up in GA4 /
 * PostHog / Meta alongside affiliate clicks.
 */
export function NewsletterForm({ variant = "hero", className = "" }: NewsletterFormProps) {
  const [email, setEmail] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const emailId = useId();
  const ageId = useId();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;

    setStatus("submitting");
    setMessage("");

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, ageRange }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setStatus("success");
        setMessage(
          data.alreadySubscribed
            ? "You're already on the list — thanks for being here!"
            : "You're in! Check your inbox for safety picks and recall alerts."
        );
        // Fire conversion event (no-ops gracefully if analytics not consented/loaded).
        trackNewsletterSignup({ email, ageRange });
        setEmail("");
        setAgeRange("");
      } else {
        setStatus("error");
        setMessage(data.message || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please check your connection and try again.");
    }
  }

  if (status === "success") {
    return (
      <div
        role="status"
        className={`flex items-center justify-center gap-2 rounded-lg bg-white/80 px-4 py-3 text-sm font-medium text-primary-700 ${className}`}
      >
        <CheckCircle2 className="size-5 shrink-0 text-secondary-500" aria-hidden="true" />
        {message}
      </div>
    );
  }

  const inputBase =
    "rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500";

  return (
    <form
      onSubmit={handleSubmit}
      className={`${variant === "hero" ? "max-w-lg mx-auto" : ""} ${className}`}
      noValidate
    >
      <div className="flex flex-col sm:flex-row gap-3">
        <label htmlFor={emailId} className="sr-only">
          Email address
        </label>
        <input
          id={emailId}
          type="email"
          name="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email address"
          autoComplete="email"
          className={`flex-1 ${inputBase}`}
          disabled={status === "submitting"}
        />
        <label htmlFor={ageId} className="sr-only">
          Child age range
        </label>
        <select
          id={ageId}
          name="ageRange"
          required
          value={ageRange}
          onChange={(e) => setAgeRange(e.target.value)}
          className={inputBase}
          disabled={status === "submitting"}
        >
          <option value="" disabled>
            Child age range
          </option>
          {AGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={status === "submitting"}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-60"
        >
          {status === "submitting" ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Subscribing
            </>
          ) : (
            <>
              <Mail className="size-4" aria-hidden="true" />
              Subscribe
            </>
          )}
        </button>
      </div>

      {status === "error" && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {message}
        </p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        No spam. Unsubscribe anytime.
      </p>
    </form>
  );
}
