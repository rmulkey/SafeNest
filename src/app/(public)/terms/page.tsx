import type { Metadata } from "next";
import Link from "next/link";
import { generateOpenGraphMeta } from "@/components/seo/OpenGraphMeta";
import { SITE_URL } from "@/lib/seo/site-config";
import { SCORE_EVIDENCE_DISCLAIMER } from "@/lib/content/review-verdict";

/**
 * Terms of use.
 *
 * Scope note: this page states how the site works and what its content is and is
 * not — all of which is verifiable. It deliberately does NOT contain a
 * limitation-of-liability cap, an arbitration or class-action waiver, a
 * governing-law or venue clause, an indemnity, or a named contracting entity.
 * Those are enforceable legal instruments whose wording has consequences, and
 * writing a convincing-looking version without a lawyer would be worse than not
 * having one. They are listed as gaps for legal review instead.
 */

const TITLE = "Terms of Use";
const DESCRIPTION =
  "How to use SafeNest Toys, what our safety scores are and are not, our affiliate relationship, and how to report a correction.";

export const metadata: Metadata = {
  title: `${TITLE} | SafeNest Toys`,
  description: DESCRIPTION,
  ...generateOpenGraphMeta({
    title: `${TITLE} | SafeNest Toys`,
    description: DESCRIPTION,
    url: `${SITE_URL}/terms`,
  }),
};

/** Last substantive edit to this page. Update when the content changes. */
const LAST_UPDATED = "2026-08-17";

function Section({
  id,
  heading,
  children,
}: {
  id: string;
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="mt-10">
      <h2 id={id} className="text-xl font-semibold text-foreground">
        {heading}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-6 lg:px-8">
      <header>
        <p className="mb-3 text-sm font-medium uppercase tracking-wider text-primary-600">
          Terms
        </p>
        <h1 className="mb-4 text-4xl font-semibold tracking-tight text-foreground">
          Terms of use
        </h1>
        <p className="text-lg leading-relaxed text-muted-foreground">
          What SafeNest Toys is, what our scores mean, and what you can rely on
          this site for. Please read the section on safety information before
          using anything here to make a decision about a child&apos;s safety.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Last updated <time dateTime={LAST_UPDATED}>{LAST_UPDATED}</time>.
        </p>
      </header>

      <Section id="what-this-is" heading="What SafeNest is">
        <p>
          SafeNest Toys is an independent, family-run review site. Rodrigo and
          Vanessa are parents, not credentialed product-safety professionals. We
          research toys using publicly available information and publish what we
          find, along with our own editorial opinion.
        </p>
        <p>
          You may read, share and link to anything here. The words, scores and
          page designs are ours; please do not republish them wholesale as your
          own.
        </p>
      </Section>

      <Section id="not-safety-advice" heading="Our scores are research, not certification">
        <p>{SCORE_EVIDENCE_DISCLAIMER}</p>
        <p>
          We do not perform laboratory or physical testing, and we do not certify
          products. Where a manufacturer or retailer claims a certification, we
          record the claim and attribute it to them — recording a claim is not
          the same as verifying it. Our{" "}
          <Link href="/transparency" className="text-primary-600 underline">
            methodology page
          </Link>{" "}
          sets out exactly how a score is produced and where its limits are.
        </p>
        <p className="font-medium text-foreground">
          Always follow the manufacturer&apos;s own age guidance, warnings and
          instructions, and check official recall notices directly with the{" "}
          <a
            href="https://www.cpsc.gov/Recalls"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 underline"
          >
            U.S. Consumer Product Safety Commission
          </a>
          . Nothing on SafeNest replaces those, and nothing here is medical,
          legal or professional safety advice.
        </p>
      </Section>

      <Section id="recalls" heading="Recall information">
        <p>
          Our{" "}
          <Link href="/recalls" className="text-primary-600 underline">
            recalls page
          </Link>{" "}
          republishes public CPSC data. We do not issue recalls and we do not
          decide what is recalled. We show when our copy of that data was last
          synchronised, and we say so plainly when it is out of date. CPSC is the
          authoritative source; if the two ever disagree, believe CPSC.
        </p>
      </Section>

      <Section id="affiliate" heading="Affiliate links and how we make money">
        <p>
          Some links on this site are affiliate links, including Amazon
          Associates links. If you buy through one, SafeNest may earn a
          commission at no additional cost to you.
        </p>
        <p>
          Commissions do not influence our scores, our rankings or what we
          choose to criticise, and we do not accept payment for coverage or for a
          better score. The{" "}
          <Link
            href="/transparency#affiliate"
            className="text-primary-600 underline"
          >
            affiliate disclosure
          </Link>{" "}
          explains the arrangement in full.
        </p>
        <p>
          Prices and availability are the retailer&apos;s, change without notice,
          and are not tracked by us. That is why our buy links send you to the
          retailer to check the current price rather than quoting one.
        </p>
      </Section>

      <Section id="accuracy" heading="Accuracy, and telling us when we are wrong">
        <p>
          We try hard to be accurate, and we will get things wrong anyway.
          Product specifications change, listings get updated, and public
          information is sometimes incomplete or contradictory.
        </p>
        <p>
          If you find an error — a wrong material, a stale age range, a broken
          link, a claim we have not properly attributed — please{" "}
          <Link href="/contact" className="text-primary-600 underline">
            report a correction
          </Link>
          . We would much rather hear it from you than leave it published.
        </p>
      </Section>

      <Section id="third-party" heading="Links to other sites">
        <p>
          We link to retailers, manufacturers and government sources. We do not
          control those sites and are not responsible for their content,
          products, or how they handle your data. Once you leave SafeNest, their
          terms and privacy policies apply.
        </p>
      </Section>

      <Section id="changes" heading="Changes">
        <p>
          The site changes as we add reviews, revise scores and correct
          mistakes. When this page changes substantively, the date at the top
          changes with it.
        </p>
        <p>
          Questions about any of this?{" "}
          <Link href="/contact" className="text-primary-600 underline">
            Get in touch
          </Link>
          .
        </p>
      </Section>
    </div>
  );
}
