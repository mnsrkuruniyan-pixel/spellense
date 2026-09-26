import type { Metadata } from "next";
import ImageCompressorClient from "./ImageCompressorClient";

export const metadata: Metadata = {
  title: "Free Image Compressor & Optimizer — Squoosh Style",
  description:
    "Compress JPG, PNG, WebP, AVIF and multi-page PDF images online with zero loss in visual quality. Interactive before/after split slider, batch compression, 100% private in-browser processing.",
  alternates: {
    canonical: "/image-compressor",
  },
  openGraph: {
    title: "Free Image Compressor & Optimizer | Spellense",
    description:
      "Compress images & multi-page catalogs without losing quality or changing dimensions. Interactive Squoosh-style split comparison. 100% private & client-side.",
    url: "/image-compressor",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Spellense Image Compressor & Optimizer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Image Compressor & Optimizer | Spellense",
    description:
      "Batch compress images and multi-page catalogs without losing quality. Squoosh-style split comparison slider. 100% free & in-browser.",
    images: ["/og-image.png"],
  },
};

const faqItems = [
  {
    question: "Does compressing an image change its dimensions (width & height)?",
    answer:
      "No. Spellense strictly locks and preserves your exact pixel dimensions by default. For example, a 1200×1200 image remains 1200×1200 after compression. We apply perceptual compression and remove bloat so your layout remains sharp without shrinking resolution. If needed, you can optionally enable custom dimension resizing with aspect ratio lock.",
  },
  {
    question: "How does the Squoosh-style split comparison work?",
    answer:
      "Our interactive split-screen slider lets you drag a vertical divider line across your image. The left side shows your original uncompressed image, and the right side shows the compressed result in real time. You can zoom up to 2× to verify that text, logos, and edges remain razor sharp.",
  },
  {
    question: "Can I compress multiple images or multi-page PDF catalogs at once?",
    answer:
      "Yes! You can drop 10, 20, or more images at once, or drop a multi-page PDF catalog. Spellense automatically processes all pages and lets you download individual files or download everything in a single, organized ZIP archive.",
  },
  {
    question: "Are my confidential design files or client images uploaded to any server?",
    answer:
      "Never. 100% of the image compression takes place locally inside your browser using HTML5 Canvas and browser WebAssembly. Even faster than our spellchecker — your files never leave your device, and are never saved or trained on any server.",
  },
  {
    question: "Which format is best: WebP, JPEG, or PNG?",
    answer:
      "WebP is recommended for websites and digital media because it achieves up to 90% size reduction with virtually no noticeable difference. JPEG is ideal for print documents and client submissions. PNG is best when transparent backgrounds or pixel-level text contrast must be retained.",
  },
];

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
  description:
    "Free in-browser image compressor and optimizer supporting WebP, JPEG, PNG, AVIF and multi-page PDFs with interactive before/after split comparison.",
  featureList: [
    "Squoosh-style interactive before/after split comparison slider",
    "Multi-page PDF and batch image compression",
    "Lock original dimensions — zero resolution loss",
    "WebP, MozJPEG, PNG and AVIF codec export",
    "100% client-side in-memory privacy",
    "Batch download as single ZIP archive",
  ],
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <ImageCompressorClient />
    </>
  );
}
