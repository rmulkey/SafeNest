import type { Metadata } from "next";
import Link from "next/link";
import { generateOpenGraphMeta } from "@/components/seo/OpenGraphMeta";
import { SITE_URL } from "@/lib/seo/site-config";

/**
 * Privacy page.
 *
 * Every statement here was checked against the code that actually runs:
 *  - newsletter storage: prisma NewsletterSubscription (email + ageRange only)
 *  - click records: prisma AffiliateClick, whose sessionId is a truncated
 *    SHA-256 of `${ip}:${userAgent}` — described as a pseudonymous identifier
 *    rather than "anonymous", because a hash derived from an IP is not the same
 *    thing as not collecting one
 *  - GA4 / PostHog / Meta Pixel load only after consent is granted and are
 *    removed on withdrawal (AnalyticsProvider)
 *  - Vercel Analytics + Speed Insights load outside that gate
 *  - Klaviyo is NOT used: KLAVIYO_API_KEY is unreferenced by any code path
 *  - Clerk is NOT used: no @clerk package is installed and nothing calls it
 *
 * Deliberately absent, because inventing them would be worse than omitting
 * them: governing law, jurisdiction, dispute resolution, a named legal entity,
 * a postal address, GDPR/CCPA lawful-basis mapping, and fixed statutory response
 * windows. Those need a lawyer, not a plausible paragraph.
 */

const TITLE = "Privacy — What SafeNest Toys Collects";
const DESCRIPTION =
  "Exactly what data SafeNest Toys collects, why, who receives it, and how to opt out. Written from the code that runs the site.";

export const metadata: Metadata = {
  title: `${TITLE} | SafeNest Toys`,
  description: DESCRIPTION,
  ...generateOpenGraphMeta({
    title: `${TITLE} | SafeNest Toys`,
    description: DESCRIPTION,
    url: `${SITE_URL}/privacy`,
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

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-6 lg:px-8">
      <header>
        <p className="mb-3 text-sm font-medium uppercase tracking-wider text-primary-600">
          Privacy
        </p>
        <h1 className="mb-4 text-4xl font-semibold tracking-tight text-foreground">
          What SafeNest Toys collects
        </h1>
        <p className="text-lg leading-relaxed text-muted-foreground">
          SafeNest is a small, family-run review site. This page describes the
          data the site actually handles, written against the code that runs it
          rather than from a template.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Last updated{" "}
          <time dateTime={LAST_UPDATED}>{LAST_UPDATED}</time>.
        </p>
      </header>

      <Section id="reading" heading="Reading the site">
        <p>
          You do not need an account to read anything on SafeNest, and we do not
          create one for you. There is no reader login, and no profile is built
          from the pages you visit.
        </p>
      </Section>

      <Section id="newsletter" heading="If you join the newsletter">
        <p>
          We store two things: your email address and the child age range you
          select. Nothing else — no name, no location, no browsing history
          attached to it.
        </p>
        <p>
          That record lives in our own database. We do not pass it to a
          third-party email platform, and we do not sell, rent or trade it.
        </p>
        <p>
          We do not currently run an automatic deletion schedule, so a
          subscription persists until you ask us to remove it. Email us via the{" "}
          <Link href="/contact" className="text-primary-600 underline">
            contact page
          </Link>{" "}
          and we will delete it.
        </p>
      </Section>

      <Section id="affiliate" heading="If you click a buy link">
        <p>
          SafeNest earns a commission on some purchases made through links on
          this site, at no additional cost to you. See the{" "}
          <Link
            href="/transparency#affiliate"
            className="text-primary-600 underline"
          >
            affiliate disclosure
          </Link>{" "}
          for how that works and how it is kept separate from our editorial
          assessments.
        </p>
        <p>
          When you click one, we record which product and page it came from,
          which retailer, and the time. We also record a short one-way hash
          derived from your IP address and browser user-agent, used to tell
          repeat clicks apart. We do not store the IP address or the user-agent
          themselves, and the hash is not reversible — but because it is derived
          from them, we describe it as pseudonymous rather than anonymous.
        </p>
        <p>
          Following the link takes you to the retailer, who then applies their
          own privacy policy. As an Amazon Associate, purchases you make are
          visible to us only as aggregate commission reporting from Amazon; we
          never see your payment details, and we cannot see what you bought as an
          individual.
        </p>
      </Section>

      <Section id="analytics" heading="Analytics, and what only runs with consent">
        <p>
          Google Analytics 4, PostHog and the Meta Pixel load{" "}
          <strong className="font-medium text-foreground">
            only after you accept
          </strong>{" "}
          on the cookie banner. Decline, and they are not loaded; withdraw
          consent after accepting, and they are removed. While consent is
          declined, page views are counted locally in your own browser and are
          not sent anywhere.
        </p>
        <p>
          Where those tools are active, data goes to Google, PostHog and Meta
          respectively under their own policies. The Meta Pixel in particular
          allows Meta to associate the visit with its own advertising profile of
          you — that is Meta&apos;s processing, not ours, and declining consent
          prevents it.
        </p>
        <p>
          Separately, we use Vercel Web Analytics and Vercel Speed Insights to
          measure aggregate traffic and page performance. These do not use
          cookies and do not build a per-person profile. They are not part of the
          consent gate, because they do not identify you.
        </p>
      </Section>

      <Section id="cookies" heading="Cookies">
        <p>
          The site stores your cookie choice so it does not have to ask again.
          Beyond that, cookies are only set by the analytics tools listed above,
          and only once you have accepted them.
        </p>
      </Section>

      <Section id="children" heading="Children">
        <p>
          SafeNest is written for parents and carers, not for children. We do not
          knowingly collect information from children. The age ranges you can
          select describe the child you are shopping for; they are not
          information about an account holder.
        </p>
      </Section>

      <Section id="requests" heading="Asking what we hold, or asking us to delete it">
        <p>
          Email us through the{" "}
          <Link href="/contact" className="text-primary-600 underline">
            contact page
          </Link>
          . Given the data we hold, a request is usually answered by telling you
          whether your email address is on the newsletter list and removing it if
          you want it gone. We are a two-person operation and will respond as
          promptly as we reasonably can.
        </p>
      </Section>

      <Section id="changes" heading="Changes to this page">
        <p>
          If what the site collects changes, this page changes with it, and the
          date at the top is updated. Spotted something here that does not match
          how the site behaves?{" "}
          <Link href="/contact" className="text-primary-600 underline">
            Tell us
          </Link>{" "}
          — we would rather fix it than leave it wrong.
        </p>
      </Section>
    </div>
  );
}
