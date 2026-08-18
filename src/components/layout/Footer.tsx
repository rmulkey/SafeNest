import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Shield, FileCheck, Ban } from "lucide-react";
import { AffiliateDisclosure } from "@/components/affiliate/AffiliateDisclosure";

const quickLinks = [
  { href: "/reviews", label: "Reviews" },
  { href: "/categories", label: "Categories" },
  { href: "/guides", label: "Guides" },
  { href: "/recalls", label: "Recalls" },
  { href: "/blog", label: "Blog" },
];

const resources = [
  { href: "/transparency", label: "Transparency" },
  { href: "/contact", label: "Contact" },
  { href: "/about", label: "About Us" },
];

const legal = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/transparency#affiliate", label: "Affiliate Disclosure" },
];

// Wording is constrained by src/lib/content/evidence.ts: SafeNest performs no
// laboratory testing and employs no credentialed product-safety experts, so
// "Expert Reviewed" was replaced with an accurate description of the work.
const trustBadges = [
  { icon: FileCheck, label: "CPSC Recall Data" },
  { icon: Shield, label: "Parent-Researched" },
  { icon: Ban, label: "No Sponsored Content" },
];

// Computed once at module load (build/server start), not during render, so it
// does not trip Next.js Cache Components' "current time during prerender" guard.
const CURRENT_YEAR = new Date().getFullYear();

export function Footer() {
  const currentYear = CURRENT_YEAR;

  return (
    <footer className="mt-auto bg-accent-50/50 border-t border-border">
      {/* Trust badges row */}
      <div className="border-b border-border/50">
        <div className="mx-auto max-w-7xl px-4 py-4 md:px-6 lg:px-8">
          <ul className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
            {trustBadges.map((badge) => {
              const Icon = badge.icon;
              return (
                <li key={badge.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="size-4 text-primary-500" aria-hidden="true" />
                  <span className="font-medium">{badge.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Main footer content */}
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-3">
            <Link
              href="/"
              className="inline-flex items-center"
            >
              <Logo size="sm" />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Independent toy safety reviews and developmental play guides for parents of babies and toddlers.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Quick Links
            </h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Resources
            </h3>
            <ul className="space-y-2">
              {resources.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Legal
            </h3>
            <ul className="space-y-2">
              {legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <AffiliateDisclosure className="mt-4" />
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-10 border-t border-border pt-6">
          <p className="text-xs text-muted-foreground text-center">
            &copy; {currentYear} SafeNest Toys. All rights reserved. Recall data
            sourced from the U.S. Consumer Product Safety Commission. Safety
            scores are SafeNest&apos;s own editorial assessment based on publicly
            available information — not laboratory testing or certification.
          </p>
        </div>
      </div>
    </footer>
  );
}
