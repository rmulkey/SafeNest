"use client";

import { useState, useEffect, useRef, useCallback, type FormEvent } from "react";
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

const SESSION_STORAGE_KEY = "safenest-newsletter-popup-shown";

export function PopupSignupForm() {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [ageRange, setAgeRange] = useState<AgeRange | "">("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error" | "already-subscribed"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const dialogRef = useRef<HTMLDialogElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  const lastFocusableRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Don't show if already shown this session
    if (typeof window === "undefined") return;

    try {
      if (sessionStorage.getItem(SESSION_STORAGE_KEY)) return;
    } catch {
      // sessionStorage unavailable, proceed anyway
    }

    const timer = setTimeout(() => {
      setIsVisible(true);
      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, "true");
      } catch {
        // Ignore storage errors
      }
    }, 30000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isVisible && dialogRef.current) {
      dialogRef.current.showModal();
      firstFocusableRef.current?.focus();
    }
  }, [isVisible]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    if (dialogRef.current) {
      dialogRef.current.close();
    }
  }, []);

  // Handle Escape key and click outside
  useEffect(() => {
    if (!isVisible) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isVisible, handleClose]);

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
      }
    } catch {
      setStatus("error");
      setErrorMessage("Subscription could not be completed. Please try again.");
    }
  }

  if (!isVisible) return null;

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-auto max-h-fit w-full max-w-md rounded-xl border border-border bg-background p-0 shadow-lg backdrop:bg-black/50"
      aria-labelledby="popup-newsletter-title"
      onCancel={handleClose}
    >
      <div className="relative p-6">
        {/* Close button */}
        <button
          ref={firstFocusableRef}
          type="button"
          onClick={handleClose}
          aria-label="Close newsletter signup"
          className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <h2 id="popup-newsletter-title" className="text-lg font-semibold">
          Stay updated on toy safety
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Get age-appropriate toy safety updates and recommendations delivered to your inbox.
        </p>

        {status === "success" ? (
          <div className="mt-4 rounded-lg bg-green-50 p-4 text-center text-green-800" role="status">
            <p className="font-medium">You&apos;re subscribed!</p>
            <p className="mt-1 text-sm">
              You&apos;ll receive age-appropriate toy safety updates and recommendations.
            </p>
          </div>
        ) : status === "already-subscribed" ? (
          <div className="mt-4 rounded-lg bg-blue-50 p-4 text-center text-blue-800" role="status">
            <p className="font-medium">Already subscribed</p>
            <p className="mt-1 text-sm">
              This email address is already on our newsletter list.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-3">
            <div>
              <label htmlFor="popup-newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="popup-newsletter-email"
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "popup-email-error" : undefined}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50 aria-invalid:border-destructive"
              />
              {errors.email && (
                <p id="popup-email-error" className="mt-1 text-xs text-destructive" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="popup-newsletter-age-range" className="sr-only">
                Child age range
              </label>
              <select
                id="popup-newsletter-age-range"
                value={ageRange}
                onChange={(e) => {
                  setAgeRange(e.target.value as AgeRange | "");
                  if (errors.ageRange) setErrors((prev) => ({ ...prev, ageRange: undefined }));
                }}
                aria-invalid={!!errors.ageRange}
                aria-describedby={errors.ageRange ? "popup-age-error" : undefined}
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
                <p id="popup-age-error" className="mt-1 text-xs text-destructive" role="alert">
                  {errors.ageRange}
                </p>
              )}
            </div>

            {status === "error" && (
              <p className="text-xs text-destructive" role="alert">
                {errorMessage}
              </p>
            )}

            <Button
              ref={lastFocusableRef}
              type="submit"
              disabled={status === "submitting"}
              className="w-full"
            >
              {status === "submitting" ? "Subscribing..." : "Subscribe"}
            </Button>
          </form>
        )}
      </div>
    </dialog>
  );
}
