import type { Metadata } from "next";
import Script from "next/script";
import QrCodeGeneratorClient from "./QrCodeGeneratorClient";

export const metadata: Metadata = {
  title: "Free QR Code Generator with Scannability Check",
  description:
    "Create a custom QR code for digital or print use. Spellense stress-tests print codes under dim light, blur, small size and angled scan before you download — free, no signup.",
  alternates: {
    canonical: "/qr-code-generator",
  },
  openGraph: {
    siteName: "Spellense",
    title: "Free QR Code Generator with Scannability Check | Spellense",
    description:
      "Create a custom QR code for digital or print use. Spellense stress-tests print codes under dim light, blur, small size and angled scan before you download — free, no signup.",
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
      "Create a custom QR code for digital or print use. Spellense stress-tests print codes under dim light, blur, small size and angled scan before you download — free, no signup.",
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
    "A free online QR code generator with separate digital and print modes. Print-mode codes are stress-tested under dim light, blur, small size and an angled scan before download, so they actually work once printed.",
  featureList: [
    "Separate Digital and Print modes",
    "QR codes for URLs, text, WiFi, phone, email and vCard contact cards",
    "Custom dot and corner styles (square, dots, rounded, classy, extra-rounded)",
    "Logo overlay with safety checks against error-correction level",
    "Four-condition stress test: dim lighting, blur, small print size, and angled scan",
    "One-click direct sharing via Web Share API or Clipboard",
    "High-resolution PNG export up to 3000px and crisp SVG export",
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
      name: "What is the difference between Digital and Print mode?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Digital mode is for QR codes shown on a screen, such as social media or a WhatsApp status, where scanning conditions are predictable, so it skips straight to download or share. Print mode is for anything that will be printed, where mistakes cannot be undone after the fact, so it includes a full stress test before the download unlocks.",
      },
    },
    {
      "@type": "Question",
      name: "What does the stress test check?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "It re-decodes the generated QR code under four simulated real-world conditions: dim lighting, slight blur, a small print size, and an angled scan, the same way a phone camera might encounter it in practice.",
      },
    },
    {
      "@type": "Question",
      name: "Can I add a contact card (vCard) QR code?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Selecting the contact card option encodes a name, phone number, email, company and job title into a standard vCard format that saves directly to a phone's contacts when scanned.",
      },
    },
    {
      "@type": "Question",
      name: "Why can't I download before running the stress test in Print mode?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Print QR codes can't be edited once printed, so Spellense requires a passed stress test first to catch contrast, logo-size or size issues while they are still easy to fix.",
      },
    },
    {
      "@type": "Question",
      name: "What resolution can I download the QR code at?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "PNG downloads are available at 1000px, 2000px or 3000px depending on how large the final print will be. SVG is also available and stays sharp at any size since it is vector-based.",
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
