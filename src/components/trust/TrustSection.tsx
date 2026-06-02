import Image from "next/image";
import Link from "next/link";
import {
  ShieldCheck,
  FlaskConical,
  ClipboardCheck,
  AlertTriangle,
  BadgeCheck,
  Quote,
} from "lucide-react";
import { urlForImage } from "@/lib/sanity/client";

/* ── Types for verified, data-driven content ──────────────────────────────── */

interface Testimonial {
  _id: string;
  quote: string;
  authorName: string;
  authorContext?: string;
  avatar?: { asset: { _ref: string }; alt?: string };
}

interface Endorsement {
  _id: string;
  name: string;
  credentials: string;
  affiliation?: string;
  quote: string;
  headshot?: { asset: { _ref: string }; alt?: string };
  profileUrl?: string;
}

interface TrustSectionProps {
  testimonials: Testimonial[];
  endorsements: Endorsement[];
  reviewCount: number;
}

/* ── Truthful, evergreen content (describes things that actually exist) ────── */

const methodologySteps = [
  {
    icon: FlaskConical,
    title: "Material & hazard review",
    body: "We examine materials, finishes, and construction, and run the small-parts test against the 1.75-inch choking-hazard standard.",
  },
  {
    icon: ClipboardCheck,
    title: "Certification check",
    body: "We confirm which recognized standards a toy meets — ASTM F963, CPSIA, and EN 71 — rather than relying on marketing claims.",
  },
  {
    icon: AlertTriangle,
    title: "Recall monitoring",
    body: "We track CPSC recall feeds daily and flag any affected product on its review within 24 hours.",
  },
  {
    icon: BadgeCheck,
    title: "Transparent scoring",
    body: "Every toy gets a published Safety and Development score with the exact factor weights shown — no black box.",
  },
];

// Real, public safety standards we evaluate against.
const standards = [
  { code: "ASTM F963", desc: "U.S. toy safety standard" },
  { code: "CPSIA", desc: "Federal lead & phthalate limits" },
  { code: "EN 71", desc: "European toy safety standard" },
  { code: "CPSC", desc: "Recall data, monitored daily" },
];

export function TrustSection({
  testimonials,
  endorsements,
  reviewCount,
}: TrustSectionProps) {
  return (
    <section
      aria-labelledby="trust-heading"
      className="py-16 mx-auto max-w-7xl px-4 md:px-6 lg:px-8"
    >
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2
          id="trust-heading"
          className="text-2xl md:text-3xl font-semibold text-foreground"
        >
          Built on evidence, not marketing
        </h2>
        <p className="mt-3 text-muted-foreground">
          Every SafeNest rating comes from the same transparent process, applied
          the same way to {reviewCount > 0 ? `all ${reviewCount}+ ` : "every "}
          toys we review — with no sponsorships or paid placements.
        </p>
      </div>

      {/* ── Pillar 1: Testing methodology (always shown, truthful) ────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {methodologySteps.map((step, i) => {
          const Icon = step.icon;
          return (
            <div
              key={step.title}
              className="relative rounded-2xl border border-border bg-card p-6"
            >
              <span className="absolute right-4 top-4 text-sm font-semibold text-primary-200">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="size-11 rounded-xl bg-secondary-50 flex items-center justify-center mb-4">
                <Icon className="size-6 text-secondary-600" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1.5">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.body}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 text-center">
        <Link
          href="/transparency"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          See our full scoring methodology →
        </Link>
      </div>

      {/* ── Pillar 2: Safety standards we check (always shown, truthful) ──── */}
      <div className="mt-12 rounded-2xl border border-border bg-muted/30 p-6 md:p-8">
        <div className="flex items-center justify-center gap-2 mb-5">
          <ShieldCheck className="size-5 text-primary-600" aria-hidden="true" />
          <h3 className="text-base font-semibold text-foreground">
            Safety standards we evaluate against
          </h3>
        </div>
        <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {standards.map((s) => (
            <li
              key={s.code}
              className="rounded-xl bg-card border border-border px-4 py-3 text-center"
            >
              <p className="font-semibold text-foreground">{s.code}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.desc}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          We report which standards each toy meets. We are not affiliated with
          these standards bodies.
        </p>
      </div>

      {/* ── Pillar 3: Expert endorsements (only if verified ones exist) ───── */}
      {endorsements.length > 0 && (
        <div className="mt-16">
          <h3 className="text-xl font-semibold text-foreground text-center mb-8">
            Reviewed by child-health professionals
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {endorsements.map((e) => (
              <figure
                key={e._id}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <Quote className="size-6 text-primary-300 mb-3" aria-hidden="true" />
                <blockquote className="text-foreground/90 leading-relaxed">
                  {e.quote}
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  {e.headshot && (
                    <span className="relative size-12 shrink-0 overflow-hidden rounded-full bg-muted">
                      <Image
                        src={urlForImage(e.headshot).width(96).height(96).url()}
                        alt={e.headshot.alt || e.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </span>
                  )}
                  <span>
                    <span className="block font-semibold text-foreground">
                      {e.profileUrl ? (
                        <a
                          href={e.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary-600 underline-offset-2 hover:underline"
                        >
                          {e.name}
                        </a>
                      ) : (
                        e.name
                      )}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {e.credentials}
                      {e.affiliation ? ` · ${e.affiliation}` : ""}
                    </span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}

      {/* ── Pillar 4: Parent testimonials (only if verified ones exist) ───── */}
      {testimonials.length > 0 && (
        <div className="mt-16">
          <h3 className="text-xl font-semibold text-foreground text-center mb-8">
            What parents tell us
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map((t) => (
              <figure
                key={t._id}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <Quote className="size-5 text-secondary-300 mb-3" aria-hidden="true" />
                <blockquote className="text-sm text-foreground/90 leading-relaxed">
                  {t.quote}
                </blockquote>
                <figcaption className="mt-4 flex items-center gap-3">
                  {t.avatar && (
                    <span className="relative size-9 shrink-0 overflow-hidden rounded-full bg-muted">
                      <Image
                        src={urlForImage(t.avatar).width(72).height(72).url()}
                        alt={t.avatar.alt || t.authorName}
                        fill
                        className="object-cover"
                        sizes="36px"
                      />
                    </span>
                  )}
                  <span>
                    <span className="block text-sm font-semibold text-foreground">
                      {t.authorName}
                    </span>
                    {t.authorContext && (
                      <span className="block text-xs text-muted-foreground">
                        {t.authorContext}
                      </span>
                    )}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
