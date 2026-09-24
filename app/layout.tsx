import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://spellense.com"
  ),
  title: {
    default: "Spellense — Free English Spell Checker",
    template: "%s | Spellense",
  },
  description:
    "Check English spelling in images, PDFs, DOCX, PPTX and XLSX files online. Free OCR-powered spelling checker with no signup required.",
  alternates: {
    canonical: "/",
  },
  verification: {
    google: "97113ee971683ad4",
    other: {
      "naver-site-verification": "a6f71e8bc6be2a49fa849b2cbf78d068",
    },
  },
  icons: {
    icon: [
      { url: "/icon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon.ico", sizes: "48x48 32x32 16x16" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    siteName: "Spellense",
    title: "Spellense — Free English Spell Checker",
    description:
      "Find spelling mistakes in images and documents before your content goes live.",
    url: "/",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Spellense — Free English Spell Checker for Visual Content",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Spellense — Free English Spell Checker",
    description:
      "Check spelling in images, PDFs, DOCX, PPTX and XLSX files online.",
    images: ["/og-image.png"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": ["SoftwareApplication", "WebApplication"],
  name: "Spellense",
  url: "https://spellense.com",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "All",
  browserRequirements: "Requires JavaScript. Requires HTML5.",
  datePublished: "2026-01-01",
  dateModified: "2026-09-24",
  author: {
    "@type": "Organization",
    name: "Spellense Team",
    url: "https://spellense.com",
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    ratingCount: "128",
    bestRating: "5",
    worstRating: "1",
  },
  description:
    "Free online English spell checker for images, PDFs, DOCX, PPTX, and XLSX files using in-memory OCR.",
  featureList: [
    "Image OCR spell check",
    "PDF multi-page spell check",
    "DOCX, PPTX, XLSX support",
    "Zero data retention / privacy-first in-memory processing",
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:bg-blue-600 focus:px-4 focus:py-2.5 focus:text-xs focus:font-bold focus:text-white focus:shadow-xl focus:outline-none"
        >
          Skip to main content
        </a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
