import type { Metadata } from "next";
import Script from "next/script";
import QrCodeGeneratorClient from "./QrCodeGeneratorClient";

export const metadata: Metadata = {
  title: "Free QR Code Generator with Scannability Check",
  description:
    "Create free QR codes online with Spellense. Customize, test scannability, and download high-quality PNG or SVG QR codes for digital and print use.",
  alternates: {
    canonical: "/qr-code-generator",
  },
  openGraph: {
    siteName: "Spellense",
    title: "Free QR Code Generator with Scannability Check | Spellense",
    description:
      "Create free QR codes online with Spellense. Customize, test scannability, and download high-quality PNG or SVG QR codes for digital and print use.",
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
      "Create free QR codes online with Spellense. Customize, test scannability, and download high-quality PNG or SVG QR codes for digital and print use.",
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
      name: "What is a QR code generator?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A QR code generator is an online tool that converts data—such as website URLs, text, Wi-Fi credentials, contact cards, emails, or phone numbers—into a two-dimensional scannable barcode matrix.",
      },
    },
    {
      "@type": "Question",
      name: "Is the Spellense QR Code Generator free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Spellense is 100% free with no subscription, no hidden trial paywall, and no sign-up required. You can generate unlimited custom QR codes with high-res PNG and vector SVG downloads.",
      },
    },
    {
      "@type": "Question",
      name: "Can I create a QR code online without signup?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. You can create, customize, test, and download your QR codes immediately in your browser without creating an account or providing an email address.",
      },
    },
    {
      "@type": "Question",
      name: "What is the difference between Digital and Print mode?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Digital mode is designed for screens, websites, and social media where scanning conditions are predictable, allowing instant download or sharing. Print mode is built for physical printing—such as business cards, packaging, and flyers—and includes our 4-condition scannability stress test to verify your code before you print.",
      },
    },
    {
      "@type": "Question",
      name: "What does the stress test check?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The stress test simulates four real-world scanning challenges: dim lighting (underexposure), camera blur, small print sizes (distance scanning), and angled scanning perspective using client-side image decoding to ensure readability.",
      },
    },
    {
      "@type": "Question",
      name: "Can I create a QR code for a website?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Select the URL option, enter your website address (starting with https://), and Spellense will instantly generate a clean, scannable QR code that directs users straight to your site.",
      },
    },
    {
      "@type": "Question",
      name: "Can I add a contact card (vCard) QR code?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Choosing vCard encodes your name, phone, email, organization, and job title into standard vCard 3.0 format so mobile cameras can save contact details with one tap.",
      },
    },
    {
      "@type": "Question",
      name: "How do I make a printable QR code?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Switch to Print mode, choose high contrast colors (such as black dots on a white background), select your desired dot and corner style, run the scannability stress test, and download at 3000px PNG or vector SVG.",
      },
    },
    {
      "@type": "Question",
      name: "Why is QR code contrast important?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "QR code scanners require high contrast between foreground dots and the background to detect the matrix alignment markers. Dark dots on a clean light background ensure quick camera detection even in poor lighting.",
      },
    },
    {
      "@type": "Question",
      name: "How can I make sure my QR code scans after printing?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Always maintain high color contrast, avoid placing large logos that block more than 20% of the center, choose high error correction (Level H), and run the built-in scannability test before sending files to the print shop.",
      },
    },
    {
      "@type": "Question",
      name: "Why is scannability testing recommended before printing?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Once printed on physical paper or merchandise, QR codes cannot be edited. Running a scannability check catches contrast problems, dense payloads, and oversized logos before spending money on printing.",
      },
    },
    {
      "@type": "Question",
      name: "What resolution can I download the QR code at?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "In Print mode, PNG downloads can be exported at 1000px, 2000px, or 3000px resolution. Digital mode exports high-resolution PNG at 2000px. Crisp vector SVG export is available in both modes for infinite scaling.",
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
