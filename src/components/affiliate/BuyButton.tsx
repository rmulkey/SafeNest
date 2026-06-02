import React from "react";

interface BuyButtonProps {
  url: string;
  tag: string;
  /** Visual size variant */
  size?: "sm" | "md" | "lg";
  /** Optional label override; defaults to "Buy on Amazon" */
  label?: string;
  className?: string;
}

/**
 * Builds the final Amazon affiliate URL with the partner tag appended.
 */
export function buildAmazonUrl(url: string, tag: string): string {
  return url + (url.includes("?") ? "&" : "?") + "tag=" + tag;
}

function AmazonGlyph({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.958 10.09c0 1.232.029 2.256-.591 3.351-.502.891-1.301 1.438-2.186 1.438-1.214 0-1.922-.924-1.922-2.292 0-2.692 2.415-3.182 4.7-3.182v.685zm3.186 7.705a.66.66 0 01-.753.077c-1.06-.878-1.25-1.284-1.828-2.12-1.747 1.784-2.983 2.318-5.246 2.318-2.676 0-4.76-1.652-4.76-4.955 0-2.58 1.397-4.334 3.387-5.191 1.724-.756 4.132-.891 5.971-1.099v-.412c0-.756.058-1.648-.385-2.301-.385-.582-1.124-.822-1.78-.822-1.21 0-2.286.62-2.55 1.905-.054.285-.263.566-.548.58l-3.075-.33c-.259-.058-.546-.266-.472-.66C5.627 1.3 8.806 0 11.639 0c1.455 0 3.356.385 4.502 1.488 1.455 1.36 1.318 3.17 1.318 5.142v4.654c0 1.398.58 2.012 1.124 2.768.192.266.234.584-.012.78-.614.514-1.706 1.47-2.307 2.006l-.012-.043z" />
      <path d="M21.83 18.504c-2.078 1.533-5.091 2.35-7.685 2.35-3.637 0-6.912-1.345-9.388-3.583-.194-.176-.021-.416.213-.28 2.674 1.556 5.98 2.492 9.394 2.492 2.303 0 4.836-.478 7.166-1.467.352-.15.646.231.3.488z" />
      <path d="M22.678 17.377c-.265-.34-1.752-.16-2.42-.081-.203.024-.234-.152-.051-.281 1.185-.832 3.13-.592 3.357-.313.228.283-.06 2.238-1.172 3.17-.171.144-.334.067-.258-.123.25-.627.812-2.03.544-2.372z" />
    </svg>
  );
}

const sizeClasses: Record<NonNullable<BuyButtonProps["size"]>, string> = {
  sm: "px-4 py-2 text-sm gap-1.5",
  md: "px-5 py-2.5 text-sm gap-2",
  lg: "px-6 py-3 text-base gap-2",
};

const glyphSize: Record<NonNullable<BuyButtonProps["size"]>, string> = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
};

/**
 * A consistent, FTC-compliant Amazon buy button used across review pages.
 */
export function BuyButton({
  url,
  tag,
  size = "md",
  label = "Buy on Amazon",
  className = "",
}: BuyButtonProps) {
  return (
    <a
      href={buildAmazonUrl(url, tag)}
      target="_blank"
      rel="nofollow sponsored noopener"
      className={`inline-flex items-center justify-center rounded-lg bg-[#FF9900] font-semibold text-white hover:bg-[#E88B00] transition-colors shadow-sm ${sizeClasses[size]} ${className}`}
    >
      <AmazonGlyph className={glyphSize[size]} />
      {label}
    </a>
  );
}
