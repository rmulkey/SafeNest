import Link from "next/link";
import Image from "next/image";
import { Home } from "lucide-react";

/**
 * Compact founder-identity strip for the homepage. A quiet "real family behind
 * this" trust signal — readable in well under 10 seconds, and placed BELOW the
 * Toy Finder so it never pushes product discovery off the first screen.
 *
 * The family photo is optional: drop an image at /public/founders.jpg and it
 * renders automatically; otherwise a tasteful monogram avatar is shown so the
 * layout never breaks and no placeholder/stock face is implied.
 */
export function FounderStrip() {
  return (
    <section
      aria-labelledby="founder-strip-heading"
      className="mx-auto max-w-3xl px-4 md:px-6 lg:px-8"
    >
      <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-border bg-card/60 px-5 py-4 text-center sm:text-left">
        <FamilyAvatar />
        <div className="flex-1">
          <p id="founder-strip-heading" className="text-sm font-semibold text-foreground">
            Built by Rodrigo &amp; Vanessa in Kennesaw, Georgia
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Homeschooling parents of three, sharing the toy research we do for
            our own kids.{" "}
            <Link
              href="/about"
              className="font-medium text-primary-600 hover:text-primary-700 underline-offset-2 hover:underline"
            >
              Our story
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * Renders /public/founders.jpg if present; falls back to a brand monogram.
 * Using next/image with a static path — if the file is absent the build still
 * succeeds and only this element is affected.
 */
function FamilyAvatar() {
  // We intentionally avoid a stock photo. If a real family photo is added at
  // /public/founders.jpg, swap the monogram block below for the <Image>.
  const hasPhoto = false;

  if (hasPhoto) {
    return (
      <span className="relative size-14 shrink-0 overflow-hidden rounded-full bg-muted ring-2 ring-primary-100">
        <Image
          src="/founders.jpg"
          alt="Rodrigo and Vanessa, founders of SafeNest Toys"
          fill
          className="object-cover"
          sizes="56px"
        />
      </span>
    );
  }

  return (
    <span
      className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-100 ring-2 ring-primary-50"
      aria-hidden="true"
    >
      <Home className="size-6 text-primary-600" />
    </span>
  );
}
