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
          Every toy receives a Safety Score from 0 to 100, computed as a
          weighted sum of four factors we assess from publicly available
          information. Higher scores indicate a more favorable SafeNest editorial
          assessment based on the information available at the time. Scores are
          not measurements of absolute safety.
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
                label="Material Safety"
                weight="30%"
                description="Toxicity testing results, material certifications (OEKO-TEX, CPSIA), presence of harmful substances like lead, phthalates, or BPA."
              />
              <ScoreFactorRow
                label="Choking Risk"
                weight="30%"
                description="Small parts assessment per ASTM F963, age-appropriateness of components, detachability of parts under stress."
              />
              <ScoreFactorRow
                label="Recall History"
                weight="20%"
                description="Whether the product or manufacturer has active or historical recalls from CPSC or international equivalents."
              />
              <ScoreFactorRow
                label="Certification Presence"
                weight="20%"
                description="Third-party safety certifications including ASTM, EN-71, ISO 8124, and voluntary programs."
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Evidence statuses and the maximum factor score each permits
            </caption>
            <thead>
              <tr className="border-b border-border text-left">
                <th scope="col" className="py-2 pr-4 font-semibold">Status</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Meaning</th>
                <th scope="col" className="py-2 font-semibold">Max factor score</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b border-border/60">
                <td className="py-2 pr-4">Supported by accessible documentation</td>
                <td className="py-2 pr-4">We located a published specification or public regulatory record.</td>
                <td className="py-2">100</td>
              </tr>
              <tr className="border-b border-border/60">
                <td className="py-2 pr-4">Manufacturer-reported</td>
                <td className="py-2 pr-4">The manufacturer states it. We have not verified it.</td>
                <td className="py-2">85</td>
              </tr>
              <tr className="border-b border-border/60">
                <td className="py-2 pr-4">Retailer-reported</td>
                <td className="py-2 pr-4">Taken from a retailer listing, which is often less reliable.</td>
                <td className="py-2">75</td>
              </tr>
              <tr className="border-b border-border/60">
                <td className="py-2 pr-4">Secondary source</td>
                <td className="py-2 pr-4">Reported by a third party, not the manufacturer or a regulator.</td>
                <td className="py-2">70</td>
              </tr>
              <tr className="border-b border-border/60">
                <td className="py-2 pr-4">Unclear — sources conflict</td>
                <td className="py-2 pr-4">Sources disagree. Treat as unresolved and check current packaging.</td>
                <td className="py-2">60</td>
              </tr>
              <tr className="border-b border-border/60">
                <td className="py-2 pr-4">Not found</td>
                <td className="py-2 pr-4">We could not find information. This is not evidence of safety.</td>
                <td className="py-2">50</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Not applicable</td>
                <td className="py-2 pr-4">The factor does not apply; it is excluded and the remaining weights are renormalised.</td>
                <td className="py-2">excluded</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="mt-6 text-lg font-semibold text-foreground mb-2">
          How missing and conflicting evidence affect a score
        </h3>
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          <li>
            Missing information never improves a score. Where a claim cannot be
            supported, the maximum score available for that factor is capped, so
            absence of evidence can never read as evidence of safety.
          </li>
          <li>
            Conflicting information is surfaced as “unclear” rather than averaged
            into a confident-looking number, and its factor is capped.
          </li>
          <li>
            When the supporting information is too thin overall, we show
            “Insufficient evidence” instead of inventing a precise score.
          </li>
          <li>
            Evidence confidence is reported separately from the score as High,
            Medium, Low, or Insufficient, so a well-supported assessment is
            distinguishable from a thin one.
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
