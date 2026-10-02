import type { Metadata } from "next";
import CaseConverterClient from "./CaseConverterClient";

export const metadata: Metadata = {
  title: "Case Converter & Text Formatter",
  description:
    "Convert text between UPPERCASE, lowercase, Title Case, Sentence case, Capitalized Case, camelCase, snake_case, kebab-case, and aLtErNaTiNg CaSe instantly. 100% free and private.",
  alternates: { canonical: "/case-converter" },
  openGraph: {
    siteName: "Spellense",
    title: "Case Converter & Text Formatter",
    description:
      "Transform text formatting, capitalization, and naming conventions in one click. Features live word, character, and sentence counts with zero tracking.",
    url: "/case-converter",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Spellense Case Converter",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Case Converter & Text Formatter",
    description:
      "Transform text formatting, capitalization, and naming conventions in one click.",
    images: ["/og-image.png"],
  },
};

export default function CaseConverterPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Spellense Case Converter",
    applicationCategory: "UtilityApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript. Requires HTML5.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      "Free online text case converter supporting UPPERCASE, lowercase, Title Case, Sentence case, camelCase, snake_case, and kebab-case with live word and character counters.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CaseConverterClient />
    </>
  );
}
