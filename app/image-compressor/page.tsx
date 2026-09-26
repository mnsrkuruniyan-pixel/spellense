import type { Metadata } from "next";
import ImageCompressorClient from "./ImageCompressorClient";

export const metadata: Metadata = {
  title: "Free Image Compressor & Optimizer — Squoosh Style | Spellense",
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

export default function ImageCompressorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ImageCompressorClient />
    </>
  );
}
