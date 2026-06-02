/**
 * WebSiteSchema - Renders WebSite structured data with SearchAction as JSON-LD.
 *
 * Enables the sitelinks search box in Google search results.
 */

import { JsonLd } from "./JsonLd";
import { SITE_URL } from "@/lib/seo/site-config";

export function WebSiteSchema() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "SafeNest Toys",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return <JsonLd data={data} />;
}
