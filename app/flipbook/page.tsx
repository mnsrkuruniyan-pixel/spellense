import type { Metadata } from "next";
import FlipbookClient from "./FlipbookClient";

export const metadata: Metadata = {
  title: "Free 3D Flipbook Maker — PDF to Flipbook (No Watermark)",
  description:
    "Convert PDFs and images into interactive 3D digital flipbooks for free with zero watermarks. Realistic page turn sounds, offline HTML download, and embed code. 100% private in-browser.",
  keywords: [
    "free 3d flipbook maker",
    "pdf to flipbook no watermark",
    "convert pdf to flipbook free",
    "interactive 3d flipbook online",
    "offline html flipbook maker",
    "flipbook creator free no sign up",
  ],
  alternates: {
    canonical: "/flipbook",
  },
  openGraph: {
    siteName: "Spellense",
    title: "Free 3D Flipbook Maker — PDF to 3D Flipbook (No Watermark)",
    description:
      "Transform PDFs, catalogs, and brochures into realistic 3D page-turning digital books for free with zero watermarks. Download standalone offline HTML or embed anywhere.",
    url: "/flipbook",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Spellense Free 3D Flipbook Maker No Watermark",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free 3D Flipbook Maker — PDF to Flipbook (No Watermark)",
    description:
      "Convert PDFs to interactive 3D page-turning flipbooks for free with zero watermarks. Download standalone offline HTML or embed anywhere.",
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
  isAccessibleForFree: true,
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    reviewCount: "138",
    bestRating: "5",
    worstRating: "1",
  },
  description:
    "Free in-browser 3D flipbook creator converting multi-page PDFs and images into realistic page-flipping digital books with offline HTML export and zero watermarks.",
  featureList: [
    "14 Interactive 3D display styles (Spread, Folio, Hardback, Classic, Glide, Deck, Arc, Fan, Carousel, Wall, etc.)",
    "12 Authentic hardcover editions (7 Classic cloth & leather, 4 Luxury gold & velvet foils, 1 Custom photo cover)",
    "Interactive 3D page curl and flip animations with realistic paper sounds",
    "Multi-page PDF to digital flipbook in seconds",
    "Zero watermarks and 100% free forever",
    "Download standalone offline HTML flipbook (no internet needed)",
    "Embed with an iframe on WordPress, Webflow, or custom sites",
    "100% private client-side processing — zero server uploads",
  ],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How many styles and editions does Spellense 3D Flipbook offer?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Spellense features 14 distinct 3D display styles: 4 page-turn styles (Spread, Folio, Hardback, Classic) and 10 dynamic browse modes (Glide, Deck, Arc, Single, Scroll, Wall, Fan, Carousel, Calendar, Fade). In addition, Hardback mode includes 12 authentic book editions: 7 Classic editions, 4 Luxury metallic foil editions, and your own bespoke custom photo cover.",
      },
    },
    {
      "@type": "Question",
      name: "Is Spellense 3D Flipbook Maker really free with no watermark?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, 100% free with zero watermarks or ads on your pages. You can convert unlimited PDFs, customize themes and sounds, download the complete standalone offline HTML file, and host or embed it anywhere without paying a subscription.",
      },
    },
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
        text: "Download the offline HTML and send it by email, WhatsApp or Drive, show it with Preview in New Tab, or upload the file to a free host such as Netlify Drop or GitHub Pages and share the link. Choose 'Small file' in the export quality menu for books with many pages. Read our complete guide: 'How to Convert PDF to 3D Flipbook' for step-by-step instructions on offline sharing and web embedding.",
      },
    },
    {
      "@type": "Question",
      name: "What if my PDF catalog or image file size is too large?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "If your source PDF has high-resolution print assets making the file too heavy, you can easily optimize and reduce its file size using our Free Image & PDF Compressor before generating your 3D flipbook.",
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
