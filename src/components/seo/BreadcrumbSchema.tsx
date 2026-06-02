/**
 * BreadcrumbSchema - Renders BreadcrumbList structured data as JSON-LD.
 *
 * Accepts an array of breadcrumb items (name + url) and outputs schema.org
 * BreadcrumbList markup for search engine rich results.
 */

import { JsonLd } from "./JsonLd";

export interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbSchemaProps {
  items: BreadcrumbItem[];
}

export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return <JsonLd data={data} />;
}
