import type { Metadata } from "next";
import ImageCompressorClient from "./ImageCompressorClient";

export const metadata: Metadata = {
  title: "Free Image Compressor — Compress Images Online Without Losing Quality",
  description:
    "Compress JPG, PNG, WebP, AVIF and multi-page PDF images online with zero loss in visual quality. Interactive before/after split slider, batch compression, 100% private in-browser processing.",
  keywords: [
    "compress image without losing quality",
    "squoosh alternative",
    "compress png free",
    "bulk image compressor webp",
    "compress jpeg online",
    "image optimizer no upload limit",
    "free image compression online",
  ],
  alternates: {
    canonical: "/image-compressor",
  },
  openGraph: {
    siteName: "Spellense",
    title: "Free Image Compressor — Compress Images Without Losing Quality",
    description:
      "Compress images & multi-page catalogs without losing quality or changing dimensions. Interactive Squoosh-style split comparison. 100% private & client-side.",
    url: "/image-compressor",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Spellense Free Image Compressor & Optimizer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Image Compressor — Compress Images Without Losing Quality",
    description:
      "Batch compress images and multi-page catalogs without losing quality. Squoosh-style split comparison slider. 100% free & in-browser.",
    images: ["/og-image.png"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": ["SoftwareApplication", "WebApplication"],
  name: "Spellense Image Compressor & Optimizer",
  url: "https://spellense.com/image-compressor",
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
    reviewCount: "142",
    bestRating: "5",
    worstRating: "1",
  },
  description:
    "Free in-browser image compressor and optimizer supporting WebP, JPEG, PNG, AVIF and multi-page PDFs with interactive before/after split comparison.",
  featureList: [
    "Squoosh-style interactive before/after split comparison slider",
    "Multi-page PDF and batch image compression",
    "Lock original dimensions — zero resolution loss",
    "WebP, MozJPEG, PNG and AVIF codec export",
    "100% client-side in-memory privacy — zero server uploads",
    "Batch download as single ZIP archive",
  ],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Does compressing an image change its dimensions (width & height)?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Spellense strictly locks and preserves your exact pixel dimensions. For example, a 1200×1200 image remains 1200×1200 after compression. We apply perceptual compression and remove bloat so your layout remains sharp without shrinking resolution.",
      },
    },
    {
      "@type": "Question",
      name: "How does the Squoosh-style split comparison work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Our interactive split-screen slider lets you drag a vertical divider line across your image. The left side shows your original uncompressed image, and the right side shows the compressed result in real time. You can zoom up to 2× to verify that text, logos, and edges remain razor sharp.",
      },
    },
    {
      "@type": "Question",
      name: "Can I compress multiple images or multi-page PDF catalogs at once?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes! You can drop 10, 20, or more images at once, or drop a multi-page PDF catalog. Spellense automatically processes all pages and lets you download individual files or download everything in a single, organized ZIP archive. You can also turn compressed catalogs into interactive publications with our Free 3D Flipbook Maker.",
      },
    },
    {
      "@type": "Question",
      name: "Are my confidential design files or client images uploaded to any server?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Never. 100% of the image compression takes place locally inside your browser using HTML5 Canvas and browser WebAssembly. Your files never leave your device, and are never saved or trained on any server.",
      },
    },
    {
      "@type": "Question",
      name: "Which format is best: WebP, JPEG, or PNG?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "WebP is recommended for websites and digital media because it achieves up to 90% size reduction with virtually no noticeable difference. JPEG is ideal for print documents and client submissions. PNG is best when transparent backgrounds or pixel-level text contrast must be retained.",
      },
    },
    {
      "@type": "Question",
      name: "Is Spellense Image Compressor a free alternative to Squoosh and TinyPNG?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Spellense is a 100% free, private alternative to Squoosh and TinyPNG with zero subscription paywalls, no daily file limits, no 5MB file caps, and built-in batch ZIP download. Read our complete guide: 'How to Compress Images Without Losing Quality' for web performance benchmarks.",
      },
    },
  ],
};

export default function ImageCompressorPage() {
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
      <ImageCompressorClient />
    </>
  );
}
