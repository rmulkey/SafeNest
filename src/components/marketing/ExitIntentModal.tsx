"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Shield, X } from "lucide-react";

const SESSION_KEY = "exit_intent_shown";
const MOBILE_DELAY_MS = 45_000;
const MOBILE_BREAKPOINT = 768;

type Status = "idle" | "submitting" | "success" | "error";

function isMobileViewport() {
  if (typeof window === "undefined") return false;
  return window.innerWidth < MOBILE_BREAKPOINT;
}

/**
 * Pure session-gating predicate for the exit-intent modal.
 *
 * The modal is allowed to show at most once per session. Given whether it has
 * already been shown this session, decide whether a new trigger should open it.
 *
 * @param sessionShown - true if the modal has already been shown this session
 * @returns false if already shown, true otherwise
 */
export function shouldTrigger(sessionShown: boolean): boolean {
  return !sessionShown;
}

/**
 * Calm, trust-first exit-intent email capture.
 *
 * - Desktop: triggers on mouseleave at the top of the viewport (clientY <= 0).
 * - Mobile: triggers after a delay, or on a fast scroll-up near the top.
 * - Shows at most once per session via sessionStorage.
 * - No urgency, countdowns, or scarcity language.
 */
export function ExitIntentModal() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [email, setEmail] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [message, setMessage] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // Guards against re-triggering after the modal has been shown this session.
  const triggeredRef = useRef(false);

  const trigger = useCallback(() => {
    if (triggeredRef.current) return;
    if (typeof window === "undefined") return;
    if (!shouldTrigger(sessionStorage.getItem(SESSION_KEY) !== null)) {
      triggeredRef.current = true;
      return;
    }
    triggeredRef.current = true;
    sessionStorage.setItem(SESSION_KEY, "1");
    setOpen(true);
  }, []);

  // Set up exit-intent detection (desktop + mobile strategies).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const mobile = isMobileViewport();

    // ── Desktop: mouse leaves through the top of the viewport ──
    const handleMouseOut = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        trigger();
      }
    };

    // ── Mobile: timer + fast scroll-up near the top of the page ──
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastScrollY = window.scrollY;
    let lastScrollTime = Date.now();

    const handleScroll = () => {
      const now = Date.now();
      const currentY = window.scrollY;
      const dy = lastScrollY - currentY; // positive when scrolling up
      const dt = now - lastScrollTime || 1;
      const velocity = dy / dt; // px per ms upward

      // Fast upward flick while near the top of the document.
      if (velocity > 0.5 && currentY < 150) {
        trigger();
      }

      lastScrollY = currentY;
      lastScrollTime = now;
    };

    if (mobile) {
      timer = setTimeout(trigger, MOBILE_DELAY_MS);
      window.addEventListener("scroll", handleScroll, { passive: true });
    } else {
      document.addEventListener("mouseout", handleMouseOut);
    }

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("mouseout", handleMouseOut);
    };
  }, [trigger]);

  const close = useCallback(() => setOpen(false), []);

  // Focus the email input on open; handle Escape to close.
  useEffect(() => {
    if (!open) return;

    inputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    // Prevent background scroll while the modal is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setMessage("");

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, ageRange }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setStatus("success");
        setMessage(
          data?.message || "You're all set. Check your inbox for the checklist."
        );
      } else {
        setStatus("error");
        setMessage(
          data?.message || "Something went wrong. Please try again."
        );
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-intent-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={close}
        className="absolute inset-0 bg-primary-900/30 backdrop-blur-sm"
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl border border-secondary-200/60 bg-white p-6 shadow-xl md:p-8">
        <button
          ref={closeRef}
          type="button"
          onClick={close}
          aria-label="Close dialog"
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="size-5" />
        </button>

        <div className="text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-secondary-50">
            <Shield className="size-7 text-primary-600" />
          </div>
          <h2
            id="exit-intent-title"
            className="text-xl font-semibold text-foreground"
          >
            Get our free Toy Safety Checklist
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A simple, parent-researched checklist to help you choose safe,
            age-appropriate toys with confidence. We&apos;ll send it straight to
            your inbox.
          </p>
        </div>

        {status === "success" ? (
          <div className="mt-6 rounded-xl bg-secondary-50 px-4 py-5 text-center">
            <p className="text-sm font-medium text-secondary-800">{message}</p>
            <button
              type="button"
              onClick={close}
              className="mt-4 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <div>
              <label htmlFor="exit-intent-email" className="sr-only">
                Email address
              </label>
              <input
                ref={inputRef}
                id="exit-intent-email"
                type="email"
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label htmlFor="exit-intent-age" className="sr-only">
                Child age range
              </label>
              <select
                id="exit-intent-age"
                name="ageRange"
                required
                value={ageRange}
                onChange={(e) => setAgeRange(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-foreground focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="" disabled>
                  Child age range
                </option>
                <option value="0-2">0–2 years</option>
                <option value="3-5">3–5 years</option>
                <option value="6-8">6–8 years</option>
                <option value="9-12">9–12 years</option>
              </select>
            </div>

            {status === "error" && message && (
              <p className="text-sm text-red-600" role="alert">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-60"
            >
              {status === "submitting"
                ? "Subscribing…"
                : "Send me the checklist"}
            </button>
            <p className="text-center text-xs text-muted-foreground">
              No spam. Unsubscribe anytime.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
