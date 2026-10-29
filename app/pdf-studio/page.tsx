import type { Metadata } from "next";
import PdfStudioClient from "./PdfStudioClient";

export const metadata: Metadata = {
  title: "Free PDF Studio — Visual PDF Fixer, Whiteout & Redact",
  description:
    "Organize pages, whiteout typos, patch text, sign documents, and permanently redact confidential data. 100% private in-browser PDF editor with zero server uploads.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/pdf-studio",
  },
  openGraph: {
    siteName: "Spellense",
    title: "Free PDF Studio — Visual PDF Fixer, Whiteout & Redact",
    description:
      "Patch typos, erase outdated prices, reorder pages with simple move buttons, sign, and permanently redact sensitive data with zero server uploads. 100% client-side privacy.",
    url: "/pdf-studio",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Spellense PDF Studio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free PDF Studio — Visual PDF Fixer, Whiteout & Redact",
    description:
      "Patch typos, whiteout prices, reorder pages with simple move buttons, sign, and permanently redact confidential data in your browser.",
    images: ["/og-image.png"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": ["SoftwareApplication", "WebApplication"],
  name: "Spellense PDF Studio",
  url: "https://spellense.com/pdf-studio",
  applicationCategory: "BusinessApplication",
  operatingSystem: "All",
  browserRequirements: "Requires JavaScript. Requires HTML5.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  description:
    "Free in-browser PDF editor to reorder pages with simple move buttons, whiteout typos, patch text, insert signatures, and permanently redact confidential data with zero server uploads.",
  featureList: [
    "Visual PDF page organizer (reorder with simple move buttons, delete, rotate, merge)",
    "Whiteout eraser for quick price, date, and typo patches",
    "Add customizable text overlays with typography styling",
    "Digital signature pad and official stamps (PAID, APPROVED, DRAFT)",
    "Permanent redaction (Blackout or Pixel Blur); original document metadata (author, title, tags) is not carried over",
    "100% client-side processing — documents never leave your device",
  ],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Are my confidential PDF documents uploaded to any server?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Spellense PDF Studio processes 100% locally in your web browser RAM using HTML5 Canvas and WebAssembly. Your documents, banking statements, and legal agreements are never uploaded or transmitted to any external server.",
      },
    },
    {
      "@type": "Question",
      name: "What happens to redacted pages when I export?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Edited or redacted pages are flattened into images when exported, so their original text is no longer selectable in the exported PDF; untouched pages keep their original selectable text. Pixel Blur may be partly recoverable, so use Blackout for sensitive data. The source document remains in this browser tab's memory while you are editing.",
      },
    },
    {
      "@type": "Question",
      name: "Can I patch outdated prices, dates, or typos?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes! Use the Whiteout tool to seamlessly cover the outdated price or text, then select the Text tool to type your updated information with matching font and size.",
      },
    },
    {
      "@type": "Question",
      name: "Can I combine multiple PDFs or reorder pages?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. In the Pages organizer mode, you can reorder pages with simple move buttons, rotate pages 90 degrees, delete unwanted pages, and click 'Add Pages' to merge pages from other PDF files or images.",
      },
    },
  ],
};

export default function PdfStudioPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <PdfStudioClient />
    </>
  );
}

