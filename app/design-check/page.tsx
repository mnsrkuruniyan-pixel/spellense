import type { Metadata } from "next";
import DesignCheckClient from "./DesignCheckClient";

export const metadata: Metadata = {
  title: "AI Design Check — Pre-Flight Graphic & PDF Audit",
  description:
    "Free AI Design Pre-Flight Quality Checker. Detect spelling typos, low WCAG contrast, and bleed margin cutoffs in Canva designs, Figma exports, flyers, and PDF documents before publishing or printing.",
  alternates: {
    canonical: "/design-check",
  },
  openGraph: {
    siteName: "Spellense",
    title: "AI Design Check — Pre-Flight Graphic & PDF Quality Audit",
    description:
      "Automated visual pre-flight quality checker for Canva designs, graphics, ads, posters, flyers, and PDF pages.",
    url: "/design-check",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Spellense AI Design Check",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Design Check — Pre-Flight Graphic & PDF Quality Audit",
    description:
      "Automated visual pre-flight quality checker for graphic designs, ads, posters, and flyers.",
    images: ["/og-image.png"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": ["SoftwareApplication", "WebApplication"],
  name: "Spellense AI Design Check",
  url: "https://spellense.com/design-check",
  applicationCategory: "DesignApplication",
  operatingSystem: "All",
  browserRequirements: "Requires JavaScript. Requires HTML5.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  description:
    "Free AI design pre-flight quality checker. Audit flyers, posters, social ads, and PDF pages for typos, WCAG contrast, and bleed margins.",
  featureList: [
    "Visual typo and grammar inspection",
    "WCAG contrast and readability checking",
    "Bleed and margin safe-zone verification",
    "Multi-page PDF and image support",
    "100% private in-memory processing",
  ],
};

export default function DesignCheckPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DesignCheckClient />
    </>
  );
}

