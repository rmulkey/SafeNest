import Link from "next/link";

export default function NotFound() {
  return (
    // A <div>, not <main>: app/layout.tsx wraps this and already provides the
    // <main id="main-content"> landmark, so a second one here would nest.
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="max-w-md space-y-6">
        {/* Branding */}
        <p className="text-sm font-medium tracking-wide text-primary-500 uppercase">
          SafeNest Toys
        </p>

        {/* Heading */}
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Page not found
        </h1>

        {/* Description */}
        <p className="text-base text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        {/* Navigation links */}
        <nav aria-label="Helpful links" className="flex flex-col items-center gap-3 pt-4 sm:flex-row sm:justify-center sm:gap-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Go to Homepage
          </Link>
          <Link
            href="/categories"
            className="inline-flex items-center justify-center rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Browse Categories
          </Link>
          <Link
            href="/blog"
            className="inline-flex items-center justify-center rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Read Blog
          </Link>
        </nav>
      </div>
    </div>
  );
}
