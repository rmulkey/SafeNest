import type { Metadata } from "next";
import { generateOpenGraphMeta } from "@/components/seo/OpenGraphMeta";
import { SITE_URL } from "@/lib/seo/site-config";

export const metadata: Metadata = {
  title: "Contact Us - SafeNest Toys",
  description:
    "Get in touch with the SafeNest Toys team. Questions about toy safety, partnerships, or feedback — we'd love to hear from you.",
  ...generateOpenGraphMeta({
    title: "Contact Us - SafeNest Toys",
    description:
      "Get in touch with the SafeNest Toys team. Questions about toy safety, partnerships, or feedback — we'd love to hear from you.",
    url: `${SITE_URL}/contact`,
  }),
};

function ContactForm() {
  return (
    <form className="space-y-6" action="#" method="POST">
      <div>
        <label
          htmlFor="contact-name"
          className="block text-sm font-medium text-foreground mb-1.5"
        >
          Name
        </label>
        <input
          type="text"
          id="contact-name"
          name="name"
          required
          className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-ring/20"
          placeholder="Your name"
        />
      </div>

      <div>
        <label
          htmlFor="contact-email"
          className="block text-sm font-medium text-foreground mb-1.5"
        >
          Email
        </label>
        <input
          type="email"
          id="contact-email"
          name="email"
          required
          className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-ring/20"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label
          htmlFor="contact-message"
          className="block text-sm font-medium text-foreground mb-1.5"
        >
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={5}
          className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-ring/20 resize-y"
          placeholder="How can we help?"
        />
      </div>

      <button
        type="submit"
        className="inline-flex h-11 items-center justify-center rounded-md bg-primary-600 px-6 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:ring-offset-2"
      >
        Send Message
      </button>
    </form>
  );
}

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-6 lg:px-8">
      {/* Hero */}
      <header className="mb-12">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground mb-4">
          Contact Us
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Have a question about toy safety, want to suggest a product for
          review, or just want to say hello? We&apos;d love to hear from you.
        </p>
      </header>

      <div className="grid gap-12 md:grid-cols-5">
        {/* Contact Form */}
        <section className="md:col-span-3" aria-labelledby="contact-form-heading">
          <h2
            id="contact-form-heading"
            className="text-2xl font-semibold text-foreground mb-6"
          >
            Send Us a Message
          </h2>
          <ContactForm />
        </section>

        {/* Sidebar Info */}
        <aside className="md:col-span-2 space-y-8">
          {/* Contact Info */}
          <section aria-labelledby="contact-info-heading">
            <h2
              id="contact-info-heading"
              className="text-lg font-semibold text-foreground mb-3"
            >
              Other Ways to Reach Us
            </h2>
            <dl className="space-y-3 text-sm text-muted-foreground">
              <div>
                <dt className="font-medium text-foreground">Email</dt>
                <dd>
                  <a
                    href="mailto:hello@safenesttoys.com"
                    className="text-primary-600 hover:text-primary-700 underline underline-offset-2"
                  >
                    hello@safenesttoys.com
                  </a>
                </dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Response Time</dt>
                <dd>We typically respond within 1–2 business days.</dd>
              </div>
            </dl>
          </section>

          {/* FAQ */}
          <section aria-labelledby="faq-heading">
            <h2
              id="faq-heading"
              className="text-lg font-semibold text-foreground mb-3"
            >
              Frequently Asked Questions
            </h2>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="font-medium text-foreground">
                  How do I suggest a toy for review?
                </dt>
                <dd className="text-muted-foreground mt-1">
                  Use the contact form above with &ldquo;Review Request&rdquo; in your
                  message. We prioritize toys popular with our community.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">
                  How do I report a safety concern?
                </dt>
                <dd className="text-muted-foreground mt-1">
                  Email us directly at hello@safenesttoys.com with &ldquo;Safety
                  Concern&rdquo; in the subject line. We treat these with urgency.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">
                  Do you accept sponsored content?
                </dt>
                <dd className="text-muted-foreground mt-1">
                  No. All reviews and editorial content are independently
                  produced. See our About page for our full editorial policy.
                </dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
