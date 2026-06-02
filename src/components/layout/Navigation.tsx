"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, BookOpen, Shield, AlertTriangle, FileText, Baby } from "lucide-react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { href: "/reviews", label: "Reviews", icon: BookOpen },
  { href: "/guides", label: "Guides", icon: FileText },
  { href: "/recalls", label: "Recalls", icon: AlertTriangle },
  { href: "/blog", label: "Blog", icon: Shield },
];

const ageGroups = [
  { href: "/best-toys/0-12-months", label: "0–1 yr" },
  { href: "/best-toys/1-2-years", label: "1–2 yr" },
  { href: "/best-toys/2-3-years", label: "2–3 yr" },
  { href: "/best-toys/3-plus-years", label: "3+ yr" },
];

const mobileCategories = [
  { href: "/categories/building", label: "Building" },
  { href: "/categories/sensory", label: "Sensory" },
  { href: "/categories/outdoor", label: "Outdoor" },
  { href: "/categories/educational", label: "Educational" },
];

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [ageDropdownOpen, setAgeDropdownOpen] = useState(false);
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation">
      {/* Mobile hamburger button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="mobile-nav"
        aria-label={isOpen ? "Close menu" : "Open menu"}
      >
        {isOpen ? <X className="size-6" /> : <Menu className="size-6" />}
      </Button>

      {/* Desktop navigation */}
      <ul className="hidden lg:flex items-center gap-1">
        {navLinks.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? "text-primary-700 bg-primary-50"
                    : "text-foreground/70 hover:text-foreground hover:bg-muted"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
        {/* Age Groups dropdown */}
        <li className="relative">
          <button
            onClick={() => setAgeDropdownOpen(!ageDropdownOpen)}
            onBlur={() => setTimeout(() => setAgeDropdownOpen(false), 150)}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-foreground/70 rounded-md hover:text-foreground hover:bg-muted transition-colors"
            aria-expanded={ageDropdownOpen}
            aria-haspopup="true"
          >
            <Baby className="size-4" />
            Age Groups
            <svg className={`size-3 transition-transform ${ageDropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {ageDropdownOpen && (
            <ul className="absolute top-full left-0 mt-1 w-36 rounded-lg border border-border bg-background shadow-lg py-1 z-50">
              {ageGroups.map((age) => (
                <li key={age.href}>
                  <Link
                    href={age.href}
                    className="block px-4 py-2 text-sm text-foreground/80 hover:bg-muted hover:text-foreground transition-colors"
                    onClick={() => setAgeDropdownOpen(false)}
                  >
                    {age.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </li>
      </ul>

      {/* Mobile navigation */}
      {isOpen && (
        <div
          id="mobile-nav"
          className="absolute top-full left-0 right-0 bg-background border-b border-border shadow-lg lg:hidden z-50 animate-in slide-in-from-top-2 duration-200"
        >
          <div className="p-4 space-y-4">
            {/* Main nav links */}
            <div>
              <p className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Navigate
              </p>
              <ul className="space-y-0.5">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className={`flex items-center gap-3 px-4 py-3 text-base font-medium rounded-lg transition-colors ${
                          isActive
                            ? "text-primary-700 bg-primary-50"
                            : "text-foreground/80 hover:text-foreground hover:bg-muted"
                        }`}
                        onClick={() => setIsOpen(false)}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <Icon className="size-5 text-muted-foreground" />
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Age groups */}
            <div>
              <p className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                By Age
              </p>
              <ul className="grid grid-cols-2 gap-1.5 px-2">
                {ageGroups.map((age) => (
                  <li key={age.href}>
                    <Link
                      href={age.href}
                      className="flex items-center justify-center px-3 py-2.5 text-sm font-medium text-foreground/80 rounded-lg border border-border hover:bg-muted hover:text-foreground transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      {age.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Categories */}
            <div>
              <p className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Categories
              </p>
              <ul className="grid grid-cols-2 gap-1.5 px-2">
                {mobileCategories.map((cat) => (
                  <li key={cat.href}>
                    <Link
                      href={cat.href}
                      className="flex items-center justify-center px-3 py-2.5 text-sm font-medium text-foreground/80 rounded-lg border border-border hover:bg-muted hover:text-foreground transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      {cat.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Sign In button on mobile */}
            <div className="px-2 pt-2 border-t border-border">
              <Button variant="outline" className="w-full" size="sm">
                Sign In
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
