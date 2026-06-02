import type { Metadata } from "next";
import Link from "next/link";
import { generateOpenGraphMeta } from "@/components/seo/OpenGraphMeta";
import { SITE_URL } from "@/lib/seo/site-config";

export const metadata: Metadata = {
  title: "About SafeNest Toys - Our Mission & Editorial Policy",
  description:
    "Learn about SafeNest Toys, our mission to bring transparency to toy safety, and our editorial independence policy.",
  ...generateOpenGraphMeta({
    title: "About SafeNest Toys - Our Mission & Editorial Policy",
    description:
      "Learn about SafeNest Toys, our mission to bring transparency to toy safety, and our editorial independence policy.",
    url: `${SITE_URL}/about`,
  }),
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-6 lg:px-8">
      {/* Hero */}
      <header className="mb-12">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground mb-4">
          About SafeNest Toys
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Toy safety intelligence built on trust, transparency, and independent
          research.
        </p>
      </header>

      {/* Brand Story */}
      <section className="mb-12" aria-labelledby="our-story">
        <h2
          id="our-story"
          className="text-2xl font-semibold text-foreground mb-4"
        >
          Our Story
        </h2>
        <p className="text-base text-muted-foreground leading-relaxed mb-4">
          SafeNest Toys is a toy safety intelligence platform that helps parents
          make informed decisions about the toys they bring into their homes. We
          combine rigorous safety research, transparent scoring methodologies,
          and developmental science to give every parent the confidence they
          deserve.
        </p>
        <p className="text-base text-muted-foreground leading-relaxed">
          Founded by parents who found the toy safety landscape confusing and
          opaque, SafeNest exists to cut through marketing noise and deliver
          clear, actionable safety information you can trust.
        </p>
      </section>

      {/* Mission */}
      <section className="mb-12" aria-labelledby="our-mission">
        <h2
          id="our-mission"
          className="text-2xl font-semibold text-foreground mb-4"
        >
          Our Mission
        </h2>
        <p className="text-base text-muted-foreground leading-relaxed mb-4">
          We believe every parent deserves access to clear, honest, and
          science-backed toy safety information — free from hidden agendas.
        </p>
        <p className="text-base text-muted-foreground leading-relaxed">
          Our trust-first approach means we will never compromise editorial
          integrity for commercial gain. Safety scores are computed using a
          transparent, published methodology. Every review follows the same
          rigorous evaluation criteria, regardless of brand or affiliate
          relationship.
        </p>
      </section>

      {/* Editorial Policy Disclosure */}
      <section
        className="mb-12 rounded-lg border border-border bg-muted/30 p-6"
        aria-labelledby="editorial-policy"
      >
        <h2
          id="editorial-policy"
          className="text-2xl font-semibold text-foreground mb-4"
        >
          Editorial Policy &amp; Affiliate Disclosure
        </h2>
        <p className="text-base text-muted-foreground leading-relaxed mb-4">
          Our editorial selections are independent of affiliate partnerships.
          When you purchase through our affiliate links, we may earn a commission
          at no additional cost to you. This revenue supports our independent
          safety research and content creation.
        </p>
        <p className="text-base text-muted-foreground leading-relaxed">
          We never allow affiliate relationships to influence safety scores,
          editorial recommendations, or review outcomes. Our{" "}
          <Link
            href="/transparency"
            className="text-primary-600 hover:text-primary-700 underline underline-offset-2"
          >
            Transparency page
          </Link>{" "}
          details exactly how scores are computed.
        </p>
      </section>

      {/* Philosophy */}
      <section aria-labelledby="our-philosophy">
        <h2
          id="our-philosophy"
          className="text-2xl font-semibold text-foreground mb-4"
        >
          Our Philosophy
        </h2>
        <ul className="space-y-3 text-base text-muted-foreground">
          <li className="flex items-start gap-3">
            <span className="text-secondary-500 mt-0.5" aria-hidden="true">
              ✓
            </span>
            <span>
              <strong className="text-foreground">Transparency first</strong> —
              Our scoring methodology is fully public and reproducible.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-secondary-500 mt-0.5" aria-hidden="true">
              ✓
            </span>
            <span>
              <strong className="text-foreground">No medical claims</strong> — We
              share developmental insights, never medical advice.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-secondary-500 mt-0.5" aria-hidden="true">
              ✓
            </span>
            <span>
              <strong className="text-foreground">Independent research</strong>{" "}
              — Our reviews are never influenced by commercial relationships.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-secondary-500 mt-0.5" aria-hidden="true">
              ✓
            </span>
            <span>
              <strong className="text-foreground">Parent-centered</strong> — We
              design every page for busy parents who need clear answers fast.
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
