import Link from "next/link";
import { Search } from "lucide-react";
import { Navigation } from "./Navigation";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";

const categoryLinks = [
  { href: "/categories/building", label: "Building" },
  { href: "/categories/sensory", label: "Sensory" },
  { href: "/categories/outdoor", label: "Outdoor" },
  { href: "/categories/educational", label: "Educational" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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

          {/* Right side: Search + Sign In */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Search" className="text-muted-foreground hover:text-foreground">
              <Search className="size-5" />
            </Button>
            <Button variant="outline" size="sm" className="hidden lg:inline-flex">
              Sign In
            </Button>
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
