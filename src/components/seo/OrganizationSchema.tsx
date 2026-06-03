/**
 * OrganizationSchema - Renders Organization structured data as JSON-LD.
 *
 * Gives search engines context about the family-run business behind the site.
 * The founder + location signals reinforce E-E-A-T (experience/authority/trust),
 * which matters for a child-safety/YMYL topic.
 */

import { JsonLd } from "./JsonLd";
import { SITE_URL } from "@/lib/seo/site-config";

export function OrganizationSchema() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "SafeNest Toys",
    url: SITE_URL,
    // Use the SVG logo that actually exists in /public.
    logo: `${SITE_URL}/logo.svg`,
    image: `${SITE_URL}/opengraph-image`,
    description:
      "Independent, family-run toy safety reviews and developmental play guides. SafeNest was built by Rodrigo and Vanessa, homeschooling parents of three in Kennesaw, Georgia, to help families choose safer, smarter toys with confidence.",
    foundingLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Kennesaw",
        addressRegion: "GA",
        addressCountry: "US",
      },
    },
    founder: [
      { "@type": "Person", name: "Rodrigo Mulkey" },
      { "@type": "Person", name: "Vanessa Mulkey" },
    ],
    knowsAbout: [
      "toy safety",
      "child development",
      "developmental play",
      "toy recalls",
      "ASTM F963",
      "CPSIA",
    ],
    sameAs: [],
  };

  return <JsonLd data={data} />;
}
