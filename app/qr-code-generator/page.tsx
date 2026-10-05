import type { Metadata } from "next";
import Script from "next/script";
import QrCodeGeneratorClient from "./QrCodeGeneratorClient";

export const metadata: Metadata = {
  title: "Free QR Code Generator with Scannability Check",
  description:
    "Create a custom QR code and instantly test if it will actually scan. Spellense checks contrast, logo size and print size before you download — free, no signup.",
  alternates: {
    canonical: "/qr-code-generator",
  },
  openGraph: {
    siteName: "Spellense",
    title: "Free QR Code Generator with Scannability Check | Spellense",
    description:
      "Create a custom QR code and instantly test if it will actually scan. Spellense checks contrast, logo size and print size before you download — free, no signup.",
    url: "/qr-code-generator",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Free QR Code Generator with Scannability Check | Spellense",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free QR Code Generator with Scannability Check | Spellense",
    description:
      "Create a custom QR code and instantly test if it will actually scan. Spellense checks contrast, logo size and print size before you download — free, no signup.",
    images: ["/og-image.png"],
  },
};

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Spellense QR Code Generator",
  url: "https://spellense.com/qr-code-generator",
  applicationCategory: "DesignApplication",
  operatingSystem: "Any (Web Browser)",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  description:
    "A free online QR code generator that checks contrast, logo size and minimum print size before you download, so the QR code actually scans when printed.",
  featureList: [
    "Custom QR code generation for URLs, text, WiFi, phone and email",
    "Automatic scannability test using real decode simulation",
    "Contrast ratio check between QR code and background",
    "Logo overlay safety check against error-correction level",
    "Minimum recommended print size estimate",
    "PNG and SVG download",
  ],
  publisher: {
    "@type": "Organization",
    name: "Spellense",
    url: "https://spellense.com",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Why won't my QR code scan after printing?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The most common reasons are low contrast between the QR code and its background, a logo placed in the middle that is too large for the error-correction level used, or the code being printed smaller than its minimum readable size. Spellense checks all three before you download.",
      },
    },
    {
      "@type": "Question",
      name: "What is a QR code scannability test?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "It is a check that simulates how a phone camera reads a QR code. Spellense decodes the QR code it just generated, the same way a scanner app would, and reports whether it was read successfully along with specific issues like contrast or logo size.",
      },
    },
    {
      "@type": "Question",
      name: "Can I add a logo to my QR code without breaking it?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, as long as the logo stays small relative to the code and a higher error-correction level (Q or H) is used, which allows part of the QR code to be covered and still scan correctly. Spellense warns you if your logo is too large for the selected error-correction level.",
      },
    },
    {
      "@type": "Question",
      name: "What is the minimum size to print a QR code?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A common rule of thumb is that a QR code should be printed at roughly one tenth of its expected scanning distance. Spellense gives a size estimate based on how much data is encoded and the selected use case, such as a business card versus a poster.",
      },
    },
    {
      "@type": "Question",
      name: "Is this QR code generator really free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. There is no signup, no watermark and no limit on how many QR codes you can create and download as PNG or SVG.",
      },
    },
  ],
};

export default function QrCodeGeneratorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd),
        }}
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/qr-code-styling@1.6.0-rc.1/lib/qr-code-styling.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js"
        strategy="beforeInteractive"
      />
      <QrCodeGeneratorClient />
    </>
  );
}
