"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

const AGE_RANGES = [
  { value: "0-2", label: "0–2 years" },
  { value: "3-5", label: "3–5 years" },
  { value: "6-8", label: "6–8 years" },
  { value: "9-12", label: "9–12 years" },
] as const;

type AgeRange = (typeof AGE_RANGES)[number]["value"];

interface FormErrors {
  email?: string;
  ageRange?: string;
}

export function InlineSignupForm() {
  const [email, setEmail] = useState("");
  const [ageRange, setAgeRange] = useState<AgeRange | "">("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error" | "already-subscribed"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  function validateEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  function validate(): FormErrors {
    const newErrors: FormErrors = {};

    if (!email.trim()) {
      newErrors.email = "Email address is required.";
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!ageRange) {
      newErrors.ageRange = "Please select a child age range.";
    }

    return newErrors;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setStatus("submitting");
    setErrorMessage("");

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, ageRange }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.alreadySubscribed) {
          setStatus("already-subscribed");
        } else {
          setStatus("error");
          setErrorMessage(
            data.message || "Subscription could not be completed. Please try again."
          );
        }
        return;
      }

      if (data.alreadySubscribed) {
        setStatus("already-subscribed");
      } else {
        setStatus("success");
        setEmail("");
        setAgeRange("");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Subscription could not be completed. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-lg bg-green-50 p-4 text-center text-green-800" role="status">
        <p className="font-medium">You&apos;re subscribed!</p>
        <p className="mt-1 text-sm">
          You&apos;ll receive age-appropriate toy safety updates and recommendations.
        </p>
      </div>
    );
  }

  if (status === "already-subscribed") {
    return (
      <div className="rounded-lg bg-blue-50 p-4 text-center text-blue-800" role="status">
        <p className="font-medium">Already subscribed</p>
        <p className="mt-1 text-sm">
          This email address is already on our newsletter list.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <div>
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          placeholder="Your email address"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
          }}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "newsletter-email-error" : undefined}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50 aria-invalid:border-destructive"
        />
        {errors.email && (
          <p id="newsletter-email-error" className="mt-1 text-xs text-destructive" role="alert">
            {errors.email}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="newsletter-age-range" className="sr-only">
          Child age range
        </label>
        <select
          id="newsletter-age-range"
          value={ageRange}
          onChange={(e) => {
            setAgeRange(e.target.value as AgeRange | "");
            if (errors.ageRange) setErrors((prev) => ({ ...prev, ageRange: undefined }));
          }}
          aria-invalid={!!errors.ageRange}
          aria-describedby={errors.ageRange ? "newsletter-age-error" : undefined}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50 aria-invalid:border-destructive"
        >
          <option value="">Select child age range</option>
          {AGE_RANGES.map((range) => (
            <option key={range.value} value={range.value}>
              {range.label}
            </option>
          ))}
        </select>
        {errors.ageRange && (
          <p id="newsletter-age-error" className="mt-1 text-xs text-destructive" role="alert">
            {errors.ageRange}
          </p>
        )}
      </div>

      {status === "error" && (
        <p className="text-xs text-destructive" role="alert">
          {errorMessage}
        </p>
      )}

      <Button type="submit" disabled={status === "submitting"} className="w-full">
        {status === "submitting" ? "Subscribing..." : "Subscribe"}
      </Button>
    </form>
  );
}
