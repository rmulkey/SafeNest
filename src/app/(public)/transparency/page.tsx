import type { Metadata } from "next";
import { generateOpenGraphMeta } from "@/components/seo/OpenGraphMeta";
import { SITE_URL } from "@/lib/seo/site-config";

/**
 * Date this methodology text was last substantively revised.
 *
 * A literal constant on purpose: it must reflect a real content change, not the
 * request time. Rendering `new Date()` here would claim the methodology was
 * updated on every page view. Bump this when the methodology actually changes.
 */
export const METHODOLOGY_LAST_UPDATED = "2026-07-28";

export const metadata: Metadata = {
  title: "Transparency - Scoring Methodology | SafeNest Toys",
  description:
    "How SafeNest Toys computes Safety Scores and Development Scores. Full methodology, factor weights, and data sources disclosed.",
  ...generateOpenGraphMeta({
    title: "Transparency - Scoring Methodology | SafeNest Toys",
    description:
      "How SafeNest Toys computes Safety Scores and Development Scores. Full methodology, factor weights, and data sources disclosed.",
    url: `${SITE_URL}/transparency`,
  }),
};

function ScoreFactorRow({
  label,
  weight,
  description,
}: {
  label: string;
  weight: string;
  description: string;
}) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-3 pr-4 font-medium text-foreground">{label}</td>
      <td className="py-3 pr-4 text-center font-mono text-sm text-primary-600">
        {weight}
      </td>
      <td className="py-3 text-sm text-muted-foreground">{description}</td>
    </tr>
  );
}

export default function TransparencyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-6 lg:px-8">
      {/* Hero */}
      <header className="mb-12">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground mb-4">
          Transparency &amp; Methodology
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          We believe parents deserve to know exactly how we evaluate toys. This
          page explains our scoring methodology, data sources, and guiding
          principles.
        </p>
      </header>

      {/* Safety Score */}
      <section className="mb-12" aria-labelledby="safety-score-heading">
        <h2
          id="safety-score-heading"
          className="text-2xl font-semibold text-foreground mb-4"
        >
          Safety Score Methodology
        </h2>
        <p className="text-base text-muted-foreground leading-relaxed mb-6">
          Every toy receives a SafeNest editorial Safety Score from 0 to 100
          based on four weighted factors. A higher score represents a more
          favorable SafeNest editorial assessment of the information available at
          the time. It does not measure absolute safety, certify a product, or
          guarantee that a product is hazard-free.
        </p>
        <p className="text-base text-muted-foreground leading-relaxed mb-6">
          SafeNest does not perform physical or laboratory testing, does not
          certify, guarantee, approve, or endorse products, and does not
          independently verify every manufacturer claim. Scores never replace the
          manufacturer&apos;s instructions or an official recall notice.
        </p>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-base">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="py-3 px-4 text-left font-semibold text-foreground">
                  Factor
                </th>
                <th className="py-3 px-4 text-center font-semibold text-foreground">
                  Weight
                </th>
                <th className="py-3 px-4 text-left font-semibold text-foreground">
                  What We Assess
                </th>
              </tr>
            </thead>
            <tbody>
              <ScoreFactorRow
                label="Material information"
                weight="30%"
                description="Published information about materials, finishes, warnings and manufacturer or retailer claims. SafeNest does not perform toxicity or laboratory testing."
              />
              <ScoreFactorRow
                label="Choking-risk research"
                weight="30%"
                description="Published dimensions, construction details, small-parts warnings and manufacturer age guidance. SafeNest does not physically measure products or perform ASTM small-parts testing."
              />
              <ScoreFactorRow
                label="Recall history"
                weight="20%"
                description="Checks against publicly available CPSC recall information. No match means that SafeNest did not locate an unambiguous match as of the recorded check date — not that a recall can never exist."
              />
              <ScoreFactorRow
                label="Certification claims"
                weight="20%"
                description="Standards or certifications reported by manufacturers or retailers, together with the source and evidence status. SafeNest does not verify compliance or certify products."
              />
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          Formula: Safety Score = (Material Safety × 0.30) + (Choking Risk ×
          0.30) + (Recall History × 0.20) + (Certification Presence × 0.20)
        </p>
      </section>

      {/* Evidence status + confidence. Added because a score built on
          unverified marketing copy previously looked identical to one backed by
          documentation. */}
      <section className="mb-12" aria-labelledby="evidence-heading">
        <h2
          id="evidence-heading"
          className="text-2xl font-semibold text-foreground mb-4"
        >
          Evidence status and evidence confidence
        </h2>
        <p className="text-base text-muted-foreground leading-relaxed mb-4">
          A score on its own cannot tell you how much is actually known about a
          toy. So alongside every score we record how well each safety factor is
          supported, and publish an overall evidence confidence rating.
        </p>
        <p className="text-base text-muted-foreground leading-relaxed mb-6">
          SafeNest reviews publicly available manufacturer information,
          certification claims, product specifications, age guidance, and CPSC
          recall records. We do not physically or laboratory test products,
          independently verify every manufacturer claim, or certify products.
        </p>

        <h3 className="text-lg font-semibold text-foreground mb-2">
          What each evidence status means
        </h3>
        {/* Deliberately no "maximum factor score" column. Publishing numerical
            caps while the application does not recalculate stored editorial
            scores created a contradiction between this page and every review.
            Evidence status drives evidence confidence only. */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Evidence statuses and what each one means
            </caption>
            <thead>
              <tr className="border-b border-border text-left">
                <th scope="col" className="py-2 pr-4 font-semibold">Status</th>
                <th scope="col" className="py-2 font-semibold">Meaning</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b border-border/60">
                <td className="py-2 pr-4">Supported by accessible documentation</td>
                <td className="py-2">We located a published specification or similar document supporting the claim.</td>
              </tr>
              <tr className="border-b border-border/60">
                <td className="py-2 pr-4">Official government source</td>
                <td className="py-2">Taken from an official public record, such as the CPSC recall database.</td>
              </tr>
              <tr className="border-b border-border/60">
                <td className="py-2 pr-4">Manufacturer-reported</td>
                <td className="py-2">The manufacturer states it. SafeNest has not verified it.</td>
              </tr>
              <tr className="border-b border-border/60">
                <td className="py-2 pr-4">Retailer-reported</td>
                <td className="py-2">Taken from a retailer listing, which is often less reliable than the manufacturer&apos;s own documentation.</td>
              </tr>
              <tr className="border-b border-border/60">
                <td className="py-2 pr-4">Secondary source</td>
                <td className="py-2">Reported by a third party rather than the manufacturer or a regulator.</td>
              </tr>
              <tr className="border-b border-border/60">
                <td className="py-2 pr-4">Sources conflict</td>
                <td className="py-2">Sources disagree. We surface the disagreement rather than reconciling it silently.</td>
              </tr>
              <tr className="border-b border-border/60">
                <td className="py-2 pr-4">Information not found</td>
                <td className="py-2">We could not find information about this. That is not proof of safety.</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Not applicable</td>
                <td className="py-2">The factor does not apply to this product, so it is excluded rather than penalised.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="mt-6 text-lg font-semibold text-foreground mb-2">
          How editorial scores and evidence confidence relate
        </h3>
        <p className="text-muted-foreground leading-relaxed mb-3">
          Editorial scores reflect SafeNest&apos;s assessment of publicly
          available product information. Evidence confidence separately describes
          how well that information is supported. Evidence confidence does not
          currently modify the editorial score.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-3">
          This means a high editorial score can appear alongside Medium or Low
          evidence confidence. A high editorial score with Low or Medium evidence
          confidence should be interpreted cautiously, and a high score is never
          proof that a product is objectively safer.
        </p>

        <h3 className="mt-6 text-lg font-semibold text-foreground mb-2">
          How evidence confidence is derived
        </h3>
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          <li>
            <strong className="text-foreground">High</strong> — important claims
            are predominantly supported by accessible documentation or official
            sources.
          </li>
          <li>
            <strong className="text-foreground">Medium</strong> — important claims
            are mostly manufacturer-reported.
          </li>
          <li>
            <strong className="text-foreground">Low</strong> — important claims
            rely heavily on retailers, secondary sources or missing information.
          </li>
          <li>
            <strong className="text-foreground">Insufficient</strong> — the
            available information cannot support a meaningful assessment, so we
            show no precise score.
          </li>
        </ul>

        <h3 className="mt-6 text-lg font-semibold text-foreground mb-2">
          How missing and conflicting evidence are handled
        </h3>
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          <li>
            Missing information is never treated as proof of safety. It lowers
            evidence confidence for that factor.
          </li>
          <li>
            Conflicting information is surfaced as &ldquo;sources
            conflict&rdquo; rather than silently reconciled, and it lowers
            confidence. Conflicting or missing evidence cannot produce High
            confidence.
          </li>
          <li>
            A certification claim is not a certification document. We record who
            reported it and whether supporting documentation was located.
          </li>
          <li>
            When the supporting information is too thin overall, we show
            &ldquo;Insufficient evidence&rdquo; rather than inventing a precise
            score.
          </li>
          <li>
            SafeNest does not perform physical or laboratory testing, and these
            scores are not professional product-safety opinions. Rodrigo and
            Vanessa are parents, not credentialed product-safety professionals.
          </li>
          <li>
            Affiliate relationships never influence scores. Corrections can be
            submitted through our{" "}
            <a href="/contact" className="text-primary-600 underline">
              contact form
            </a>
            .
          </li>
          <li>
            The manufacturer&apos;s instructions and official recall notices
            always take precedence over anything on this site.
          </li>
        </ul>

        <h3 className="mt-6 text-lg font-semibold text-foreground mb-2">
          Certification claims
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          We do not confirm that a toy complies with a standard. We record which
          certifications are reported and label each claim as supported by
          accessible documentation, manufacturer-reported, retailer-reported, not
          found, or unclear.
        </p>

        <h3 className="mt-6 text-lg font-semibold text-foreground mb-2">
          Recall checks
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          We check products against publicly available CPSC recall information
          and display the date of the latest recorded check. Always confirm with
          the official CPSC database. A recall is only attached to a review when
          the match is unambiguous; uncertain matches are held for human review
          rather than published.
        </p>

        <p className="mt-6 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          Scores are editorial assessments. They are not certifications,
          guarantees, or approvals, and they are not a substitute for the
          manufacturer&apos;s instructions or an official recall notice.
        </p>
      </section>

      {/* Development Score */}
      <section className="mb-12" aria-labelledby="development-score-heading">
        <h2
          id="development-score-heading"
          className="text-2xl font-semibold text-foreground mb-4"
        >
          Development Score Methodology
        </h2>
        <p className="text-base text-muted-foreground leading-relaxed mb-6">
          The Development Score (0–100) evaluates how well a toy supports a
          child&apos;s developmental growth across three dimensions.
        </p>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-base">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="py-3 px-4 text-left font-semibold text-foreground">
                  Factor
                </th>
                <th className="py-3 px-4 text-center font-semibold text-foreground">
                  Weight
                </th>
                <th className="py-3 px-4 text-left font-semibold text-foreground">
                  What We Assess
                </th>
              </tr>
            </thead>
            <tbody>
              <ScoreFactorRow
                label="Motor Skills"
                weight="40%"
                description="Support for fine and gross motor development appropriate to the target age range, including grasping, stacking, and coordination."
              />
              <ScoreFactorRow
                label="Cognitive Skills"
                weight="35%"
                description="Problem-solving engagement, cause-and-effect learning, pattern recognition, and age-appropriate complexity."
              />
              <ScoreFactorRow
                label="Sensory Engagement"
                weight="25%"
                description="Multi-sensory stimulation including textures, sounds, colors, and tactile feedback variety."
              />
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          Formula: Development Score = (Motor Skills × 0.40) + (Cognitive Skills
          × 0.35) + (Sensory Engagement × 0.25)
        </p>
      </section>

      {/* Data Sources */}
      <section className="mb-12" aria-labelledby="data-sources-heading">
        <h2
          id="data-sources-heading"
          className="text-2xl font-semibold text-foreground mb-4"
        >
          Data Sources
        </h2>
        <p className="text-base text-muted-foreground leading-relaxed mb-4">
          Our assessments draw from multiple authoritative sources:
        </p>
        <ul className="space-y-2 text-base text-muted-foreground list-disc pl-6">
          <li>
            <strong className="text-foreground">CPSC Recall Database</strong> —
            U.S. Consumer Product Safety Commission official recall listings
          </li>
          <li>
            <strong className="text-foreground">ASTM F963 Standards</strong> —
            Standard Consumer Safety Specification for Toy Safety
          </li>
          <li>
            <strong className="text-foreground">EN-71 Standards</strong> —
            European toy safety standards for mechanical, physical, and chemical
            properties
          </li>
          <li>
            <strong className="text-foreground">
              Manufacturer Disclosures
            </strong>{" "}
            — Published material safety data sheets and certifications
          </li>
          <li>
            <strong className="text-foreground">
              Developmental Psychology Research
            </strong>{" "}
            — Peer-reviewed studies on play and child development
          </li>
        </ul>
      </section>

      {/* Important Disclaimer */}
      <section
        className="mb-12 rounded-lg border border-border bg-muted/30 p-6"
        aria-labelledby="disclaimer-heading"
      >
        <h2
          id="disclaimer-heading"
          className="text-lg font-semibold text-foreground mb-3"
        >
          Important Note
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          SafeNest Toys provides educational information about toy safety and
          child development. We do not make medical claims, provide medical
          advice, or diagnose developmental conditions. Our Development Scores
          reflect general developmental engagement potential and should not
          replace guidance from pediatricians or child development specialists.
        </p>
      </section>

      {/* Last Updated */}
      <footer className="border-t border-border pt-6">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Last updated:</strong>{" "}
          <time dateTime={METHODOLOGY_LAST_UPDATED}>
            {new Date(METHODOLOGY_LAST_UPDATED).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              timeZone: "UTC",
            })}
          </time>
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          We review and update this methodology as new safety standards emerge or
          research advances our understanding of developmental play.
        </p>
      </footer>
    </div>
  );
}
