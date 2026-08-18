import Link from "next/link";
import Image from "next/image";

/**
 * Compact founder-identity strip for the homepage. A quiet "real family behind
 * this" trust signal — readable in well under 10 seconds, and placed BELOW the
 * Toy Finder so it never pushes product discovery off the first screen.
 *
 * The whole strip links to /about — see the note on the anchor below.
 */
export function FounderStrip() {
  return (
    <section
      aria-labelledby="founder-strip-heading"
      className="mx-auto max-w-3xl px-4 md:px-6 lg:px-8"
    >
      {/* The whole strip is the link, not just the trailing "Our story" text.
          The photo is the part people actually aim at, and a 14px text link beside
          a 56px face was the smallest target in the row. One anchor also means
          the hover state can announce the whole block as clickable. */}
      <Link
        href="/about"
        aria-label="Our story — about Rodrigo and Vanessa, the parents behind SafeNest"
        className="group flex flex-col items-center gap-4 rounded-2xl border border-border bg-card/60 px-5 py-4 text-center transition-colors hover:border-primary-200 hover:bg-card sm:flex-row sm:text-left"
      >
        <FamilyAvatar />
        <div className="flex-1">
          <p id="founder-strip-heading" className="text-sm font-semibold text-foreground">
            Built by Rodrigo &amp; Vanessa in Kennesaw, Georgia
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Homeschooling parents of three, sharing the toy research we do for
            our own kids.{" "}
            <span className="font-medium text-primary-600 underline-offset-2 group-hover:underline">
              Our story
              <span aria-hidden="true"> →</span>
            </span>
          </p>
        </div>
      </Link>
    </section>
  );
}

/**
 * The founders' photo, at avatar resolution.
 *
 * Points at founders-avatar.jpg (168x224, 20KB) rather than the full
 * founders.jpg. next.config.ts sets a custom image loader that only rewrites
 * cdn.sanity.io URLs and returns local paths untouched, so `sizes="56px"` buys
 * nothing here — the browser downloads whatever file it is given. That meant
 * 412KB of 900x1200 JPEG to draw a 56px circle on the homepage. Both files are
 * proportional resizes of the same photograph, so CSS object-cover produces an
 * identical crop from either.
 *
 * alt="" is deliberate. The image sits inside a link whose adjacent text already
 * names Rodrigo and Vanessa, so describing the photo as well would make the link
 * announce them twice. An image that repeats its neighbouring text is decorative.
 */
function FamilyAvatar() {
  return (
    <span className="relative size-14 shrink-0 overflow-hidden rounded-full bg-muted ring-2 ring-primary-100 transition-colors group-hover:ring-primary-300">
      <Image src="/founders-avatar.jpg" alt="" fill className="object-cover" sizes="56px" />
    </span>
  );
}
