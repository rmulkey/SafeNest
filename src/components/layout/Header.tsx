import Link from "next/link";
import { Navigation } from "./Navigation";
import { Logo } from "@/components/brand/Logo";
import { SearchTrigger } from "@/components/search/SearchTrigger";

const categoryLinks = [
  { href: "/categories", label: "All Categories" },
  { href: "/categories/building-toys", label: "Building" },
  { href: "/categories/sensory-toys", label: "Sensory" },
  { href: "/categories/outdoor-toys", label: "Outdoor" },
  { href: "/categories/educational-toys", label: "Educational" },
];

/*
 * The sticky header is opaque, deliberately.
 *
 * It was `bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60`
 * — which drops the background to 60% on every browser that supports
 * backdrop-filter, so in practice always, behind a blur far too weak to hide
 * anything. Body text read straight through the navigation on every page:
 * scrolling a guide put "Gift Guides" and "no toys, no padding" in the same
 * pixels and made both unreadable.
 *
 * Tuning it did not work. 90% with 12px and 80% with 24px both still let body
 * copy through and still collided with the nav labels, even though the element
 * does respond to blur when forced (30px washed the text out entirely). Rather
 * than keep hunting a compositing setting that renders inconsistently, this
 * drops the effect: legibility of the primary navigation should not depend on
 * backdrop-filter behaving. The cost is a frosted flourish that was not working;
 * the gain is that the nav and the article are each readable while scrolling.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full bg-background">
      <div className="border-b border-border">
        <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6 lg:px-8">
          {/* Logo / Brand */}
          <Link
            href="/"
            className="flex items-center"
          >
            <Logo size="md" />
          </Link>

          {/* Navigation */}
          <Navigation />

          {/* Right side: Search */}
          <div className="flex items-center gap-2">
            <SearchTrigger />
          </div>
        </div>
      </div>

      {/* Category quick-links bar - desktop only */}
      <div className="hidden lg:block border-b border-border/50 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <ul className="flex items-center gap-1 py-1.5">
            {categoryLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex items-center px-3 py-1 text-xs font-medium text-muted-foreground rounded-full hover:text-foreground hover:bg-muted transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </header>
  );
}
