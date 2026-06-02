/**
 * OrganizationSchema - Renders Organization structured data as JSON-LD.
 *
 * Placed in the root layout or homepage to give search engines
 * context about the business entity behind the site.
 */

import { JsonLd } from "./JsonLd";
import { SITE_URL } from "@/lib/seo/site-config";

export function OrganizationSchema() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "SafeNest Toys",
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description:
      "Independent toy safety reviews and developmental play guides for parents",
    sameAs: [],
  };

  return <JsonLd data={data} />;
}
