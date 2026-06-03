import type { Metadata } from "next";
import Link from "next/link";
import { generateOpenGraphMeta } from "@/components/seo/OpenGraphMeta";
import { SITE_URL } from "@/lib/seo/site-config";

export const metadata: Metadata = {
  title: "About SafeNest Toys — A Family-Built Toy Safety Guide",
  description:
    "SafeNest was built by Rodrigo and Vanessa, homeschooling parents of three in Kennesaw, Georgia, to help families choose safer, smarter toys with confidence.",
  ...generateOpenGraphMeta({
    title: "About SafeNest Toys — A Family-Built Toy Safety Guide",
    description:
      "Built by Rodrigo and Vanessa, homeschooling parents of three, to take the guesswork out of choosing safe, developmental toys.",
    url: `${SITE_URL}/about`,
  }),
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-6 lg:px-8">
      {/* Hero */}
      <header className="mb-12">
        <p className="text-sm font-medium uppercase tracking-wider text-primary-600 mb-3">
          A family-built guide
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground mb-4">
          About SafeNest Toys
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Helping parents choose safer, smarter toys with confidence.
        </p>
      </header>

      {/* Founder Story */}
      <section className="mb-12" aria-labelledby="our-story">
        <h2 id="our-story" className="text-2xl font-semibold text-foreground mb-4">
          Why we built SafeNest
        </h2>
        <p className="text-base text-foreground/80 leading-relaxed mb-4">
          SafeNest started in our home in Kennesaw, Georgia. We&apos;re Rodrigo and
          Vanessa, parents to Liam, Amy, and Zoe — and, depending on the day, to
          two very opinionated Pomeranians.
        </p>
        <p className="text-base text-foreground/80 leading-relaxed mb-4">
          When we decided to homeschool our three kids, our home became their
          main learning environment. That raised the stakes on something most
          parents only think about occasionally: the toys we brought in. They
          weren&apos;t just playthings — they were part of how our children
          learned, explored, and grew. We found ourselves digging through recall
          notices, certification standards, and conflicting advice for every
          purchase.
        </p>
        <blockquote className="my-6 border-l-4 border-primary-300 bg-primary-50/50 py-4 pl-5 pr-4 text-foreground/90 italic rounded-r-lg">
          We built SafeNest because, as parents, we wanted to remove the
          guesswork when it came to choosing toys that were both safe and
          genuinely helped our children learn and grow.
        </blockquote>
        <p className="text-base text-foreground/80 leading-relaxed">
          What began as our own research became a guide we wanted to share with
          other families facing the same decisions.
        </p>
      </section>

      {/* Philosophy */}
      <section className="mb-12" aria-labelledby="our-philosophy">
        <h2
          id="our-philosophy"
          className="text-2xl font-semibold text-foreground mb-4"
        >
          How we think about toys
        </h2>
        <p className="text-base text-foreground/80 leading-relaxed mb-4">
          Two questions guide every review: <em>Is it safe?</em> and{" "}
          <em>does it genuinely help a child develop?</em> We look at materials,
          choking risk, recall history, and certifications on the safety side —
          and motor, cognitive, and sensory engagement on the development side.
          Every toy is scored the same way, with the math published openly.
        </p>
        <ul className="space-y-3 text-base text-foreground/80">
          <li className="flex items-start gap-3">
            <span className="text-secondary-500 mt-0.5" aria-hidden="true">✓</span>
            <span>
              <strong className="text-foreground">Safety first</strong> — we
              check materials, choking hazards, recalls, and certifications
              against recognized standards.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-secondary-500 mt-0.5" aria-hidden="true">✓</span>
            <span>
              <strong className="text-foreground">Development matters</strong> —
              we favor toys that support curiosity, independence, and
              learning through play.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-secondary-500 mt-0.5" aria-hidden="true">✓</span>
            <span>
              <strong className="text-foreground">Transparent scoring</strong> —
              our methodology is public and reproducible, never a black box.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-secondary-500 mt-0.5" aria-hidden="true">✓</span>
            <span>
              <strong className="text-foreground">No medical claims</strong> — we
              share developmental insights, never medical advice.
            </span>
          </li>
        </ul>
      </section>

      {/* Mission */}
      <section className="mb-12" aria-labelledby="our-mission">
        <h2 id="our-mission" className="text-2xl font-semibold text-foreground mb-4">
          Our mission
        </h2>
        <p className="text-base text-foreground/80 leading-relaxed">
          To take the guesswork out of choosing toys — so any parent can pick
          something safe and developmentally meaningful in minutes, with
          confidence. We&apos;ve already done the hard part; we just want to share
          it.
        </p>
      </section>

      {/* Editorial Policy Disclosure */}
      <section
        className="rounded-lg border border-border bg-muted/30 p-6"
        aria-labelledby="editorial-policy"
      >
        <h2
          id="editorial-policy"
          className="text-2xl font-semibold text-foreground mb-4"
        >
          Editorial policy &amp; affiliate disclosure
        </h2>
        <p className="text-base text-muted-foreground leading-relaxed mb-4">
          Our editorial selections are independent of affiliate partnerships.
          When you purchase through our affiliate links, we may earn a commission
          at no additional cost to you. This revenue supports our independent
          safety research.
        </p>
        <p className="text-base text-muted-foreground leading-relaxed">
          Affiliate relationships never influence safety scores or
          recommendations. Our{" "}
          <Link
            href="/transparency"
            className="text-primary-600 hover:text-primary-700 underline underline-offset-2"
          >
            Transparency page
          </Link>{" "}
          details exactly how scores are computed.
        </p>
      </section>
    </div>
  );
}
