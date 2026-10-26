import type { Metadata } from "next";
import FlipbookClient from "./FlipbookClient";

export const metadata: Metadata = {
  title: "Free 3D Flipbook Maker — Convert PDF & Images",
  description:
    "Convert multi-page PDFs and images into interactive 3D digital flipbooks. Realistic page turn animations, offline HTML download, and embed code. 100% private in-browser processing.",
  alternates: {
    canonical: "/flipbook",
  },
  openGraph: {
    siteName: "Spellense",
    title: "Free 3D Flipbook Maker — Turn PDFs into Interactive Flipbooks",
    description:
      "Transform PDFs, magazines, portfolios, and brochures into realistic 3D page-turning digital books. Download as standalone offline HTML. 100% free & client-side.",
    url: "/flipbook",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Spellense 3D Flipbook Maker",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free 3D Flipbook Maker — Turn PDFs into Interactive Flipbooks",
    description:
      "Turn PDFs and images into interactive 3D page-turning flipbooks. Download offline HTML or embed anywhere.",
    images: ["/og-image.png"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": ["SoftwareApplication", "WebApplication"],
  name: "Spellense 3D Flipbook Maker",
  url: "https://spellense.com/flipbook",
  applicationCategory: "DesignApplication",
  operatingSystem: "All",
  browserRequirements: "Requires JavaScript. Requires HTML5.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  description:
    "Free in-browser 3D flipbook creator converting multi-page PDFs and images into realistic page-flipping digital books with offline HTML export.",
  featureList: [
    "Interactive 3D page curl and flip animations",
    "Multi-page PDF to digital flipbook in seconds",
    "Download standalone offline HTML flipbook (no internet needed)",
    "Embed with an iframe after hosting the exported HTML file",
    "100% private client-side processing — zero server uploads",
  ],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How do visitors view or download the flipbook offline?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You can click 'Download Offline Flipbook (.html)' to get a single, self-contained HTML file. Open it in a modern browser (Chrome, Edge, Safari or Firefox) on a computer. On phones it depends on the app that opens the file, so for phones the most reliable way is to host the file online and share the link.",
      },
    },
    {
      "@type": "Question",
      name: "How do I share my flipbook?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Download the offline HTML and send it by email, WhatsApp or Drive, show it with Preview in New Tab, or upload the file to a free host such as Netlify Drop or GitHub Pages and share the link. Choose “Small file” in the export quality menu for books with many pages.",
      },
    },
    {
      "@type": "Question",
      name: "Are my confidential PDFs or catalog images uploaded to any server?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Spellense processes your PDF pages and images 100% locally in your browser's RAM memory using WebAssembly and HTML5 Canvas. Your documents never leave your device.",
      },
    },
    {
      "@type": "Question",
      name: "Can I embed the 3D flipbook on my own website or WordPress?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Host the exported HTML file on your own website, then paste its URL in the 'Embed flipbook on your website' box to copy an iframe snippet for WordPress, Webflow or Squarespace.",
      },
    },
    {
      "@type": "Question",
      name: "What file formats can I upload to make a flipbook?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You can upload multi-page PDF documents, as well as multiple images in JPG, PNG, or WebP format. You can also reorder and preview pages before generating your flipbook.",
      },
    },
    {
      "@type": "Question",
      name: "Is there a limit on the number of pages?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Because processing happens directly on your device, you can easily load brochures, lookbooks, and catalogs up to 50+ pages with smooth real-time performance.",
      },
    },
  ],
};

export default function FlipbookPage() {
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
      <FlipbookClient />
    </>
  );
}
