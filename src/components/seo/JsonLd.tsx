/**
 * JsonLd - Server component that renders JSON-LD structured data.
 *
 * Accepts a JSON-LD data object and renders it as a <script type="application/ld+json">
 * tag for search engine consumption.
 *
 * Requirements: 4.1, 4.2
 */

interface JsonLdProps {
  data: object;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
