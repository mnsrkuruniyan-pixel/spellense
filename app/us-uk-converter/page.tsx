import type { Metadata } from "next";
import UsUkConverterClient from "./UsUkConverterClient";

export const metadata: Metadata = {
  title: "US to UK English Converter | American to British Spelling | Spellense",
  description:
    "Convert text instantly between American (US) and British (UK) English. Automatically adapts -or/-our, -ize/-ise, -er/-re, vocabulary, and double 'l' spellings while preserving letter casing.",
  alternates: { canonical: "/us-uk-converter" },
  openGraph: {
    title: "US ↔ UK English Dialect Converter | Spellense",
    description:
      "Transform American English text to British English or vice-versa with live diff highlighting, spelling rule breakdowns, and zero data storage.",
    url: "/us-uk-converter",
  },
};

export default function UsUkConverterPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Spellense US ↔ UK English Converter",
    applicationCategory: "UtilityApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript. Requires HTML5.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      "Free bidirectional American English to British English dialect and spelling converter with automatic suffix conversion, vocabulary mapping, and case preservation.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <UsUkConverterClient />
    </>
  );
}

