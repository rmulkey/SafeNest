/**
 * FAQSchema - Renders FAQ structured data (schema.org/FAQPage) as JSON-LD.
 *
 * Accepts an array of question/answer pairs and outputs a script tag
 * for search engine rich results.
 */

import { JsonLd } from "./JsonLd";

export interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSchemaProps {
  items: FAQItem[];
}

export function FAQSchema({ items }: FAQSchemaProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return <JsonLd data={data} />;
}
