"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, BookOpen, Shield, AlertTriangle, FileText, Baby, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatAgeRange } from "@/lib/content/format-age";

const navLinks = [
  { href: "/reviews", label: "Reviews", icon: BookOpen },
  { href: "/gift-guides", label: "Gift Guides", icon: Gift },
  { href: "/guides", label: "Guides", icon: FileText },
  { href: "/recalls", label: "Recalls", icon: AlertTriangle },
  { href: "/blog", label: "Blog", icon: Shield },
];

// Labels derived from the shared formatter, so the nav agrees with the pages it
// links to instead of using its own abbreviations.
const ageGroups = [
  { href: "/best-toys/0-12-months", label: formatAgeRange(0, 12) },
  { href: "/best-toys/1-2-years", label: formatAgeRange(12, 24) },
  { href: "/best-toys/2-3-years", label: formatAgeRange(24, 36) },
  { href: "/best-toys/3-plus-years", label: "3 years and up" },
];

const mobileCategories = [
  { href: "/categories/building-toys", label: "Building" },
  { href: "/categories/sensory-toys", label: "Sensory" },
  { href: "/categories/outdoor-toys", label: "Outdoor" },
  { href: "/categories/educational-toys", label: "Educational" },
];

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [ageDropdownOpen, setAgeDropdownOpen] = useState(false);
  const pathname = usePathname();
  const ageTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);

  // Close the Age Groups dropdown on Escape and return focus to its trigger.
  useEffect(() => {
    if (!ageDropdownOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAgeDropdownOpen(false);
        ageTriggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [ageDropdownOpen]);

  // Close the mobile panel on Escape and return focus to the hamburger. The
  // effect above is gated on `ageDropdownOpen`, so the mobile panel previously
  // had no Escape at all — a keyboard user could only leave it by shift-tabbing
  // back out through every link.
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        mobileTriggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  /**
   * Close a disclosure only when focus actually leaves its subtree.
   *
   * The dropdown used `onBlur={() => setTimeout(close, 150)}` on the trigger.
   * Because the menu is conditionally rendered, tabbing from the trigger to the
   * first link inside it fired blur on the trigger, unmounted the list 150ms
   * later, and dropped focus to <body> — the menu was unusable by keyboard while
   * working fine with a mouse, which is why it read as correct.
   *
   * React's onBlur is focusout, so it bubbles and `currentTarget` is the
   * container the handler is attached to. Comparing `relatedTarget` against it
   * closes on real focus-out (tabbing past the menu, clicking elsewhere) and
   * leaves focus moving *within* the menu alone.
   */
  function handleFocusOut(close: () => void) {
    return (e: React.FocusEvent<HTMLElement>) => {
      const next = e.relatedTarget as Node | null;
      if (next && e.currentTarget.contains(next)) return;
      close();
    };
  }

  return (
    <nav aria-label="Main navigation">
      {/* Mobile hamburger button */}
      <Button
        ref={mobileTriggerRef}
        variant="ghost"
        size="icon"
        className="lg:hidden size-11"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="mobile-nav"
        aria-label={isOpen ? "Close menu" : "Open menu"}
      >
        {isOpen ? <X className="size-6" aria-hidden="true" /> : <Menu className="size-6" aria-hidden="true" />}
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
        <li
          className="relative"
          onBlur={handleFocusOut(() => setAgeDropdownOpen(false))}
        >
          <button
            ref={ageTriggerRef}
            onClick={() => setAgeDropdownOpen(!ageDropdownOpen)}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-foreground/70 rounded-md hover:text-foreground hover:bg-muted transition-colors"
            aria-expanded={ageDropdownOpen}
            aria-controls="age-groups-menu"
          >
            <Baby className="size-4" aria-hidden="true" />
            Age Groups
            <svg
              className={`size-3 transition-transform ${ageDropdownOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {ageDropdownOpen && (
            <ul
              id="age-groups-menu"
              className="absolute top-full left-0 mt-1 w-36 rounded-lg border border-border bg-background shadow-lg py-1 z-50"
            >
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
      <div id="mobile-nav" onBlur={handleFocusOut(() => setIsOpen(false))}>
        {isOpen && (
          <div
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
          </div>
        </div>
        )}
      </div>
    </nav>
  );
}
