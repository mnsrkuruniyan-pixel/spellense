import type { Metadata } from "next";
import UsUkConverterClient from "./UsUkConverterClient";

export const metadata: Metadata = {
  title: "US to UK English Translator & Converter — American ↔ British Spelling",
  description:
    "Free American to British (US to UK) English translator and dialect converter. Instantly translate text, spelling rules (-or/-our, -ize/-ise, -er/-re), and vocabulary with live diff highlighting and instant word lookup.",
  alternates: { canonical: "/us-uk-converter" },
  openGraph: {
    siteName: "Spellense",
    title: "US to UK English Translator & Converter — American ↔ British Spelling",
    description:
      "Translate American English text to British English or vice-versa with live diff highlighting, instant word lookup, and zero data storage.",
    url: "/us-uk-converter",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Spellense US to UK English Translator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "US to UK English Translator & Converter — American ↔ British Spelling",
    description:
      "Translate American English text to British English or vice-versa with live diff highlighting and spelling rule breakdowns.",
    images: ["/og-image.png"],
  },
};

export default function UsUkConverterPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Spellense US to UK English Translator & Converter",
    url: "https://spellense.com/us-uk-converter",
    applicationCategory: "UtilityApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript. Requires HTML5.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      "Free bidirectional American English to British English translator and spelling converter with automatic suffix adaptation, vocabulary mapping, and live diff preview.",
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How do I translate American English into British English?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Paste or type your American (US) text into the Spellense US to UK Translator. The tool instantly identifies US-specific spellings (like -or, -ize, -er) and vocabulary (like elevator, apartment) and translates them into standard British (UK) English with real-time diff highlighting.",
        },
      },
      {
        "@type": "Question",
        name: "What are the main differences between US and UK English spelling?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The main differences include suffix patterns: -or vs -our (color/colour), -ize vs -ise (organize/organise), -er vs -re (center/centre), -ense vs -ence (defense/defence), double consonants in inflected verbs (traveled/travelled), and vocabulary pairs (sidewalk/pavement, trunk/boot).",
        },
      },
      {
        "@type": "Question",
        name: "Is this US to UK English translator free and private?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, 100% free with unlimited conversions. All translations run instantly in your web browser memory with strict zero-storage privacy. Your essays, articles, and emails are never logged or stored on any server.",
        },
      },
      {
        "@type": "Question",
        name: "Can I translate British English back to American English?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, you can toggle between 'US to UK' and 'UK to US' at any time using the directional swap button.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <UsUkConverterClient />
    </>
  );
}

