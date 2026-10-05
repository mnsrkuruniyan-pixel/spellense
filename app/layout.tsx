import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import FeedbackWidget from "@/components/FeedbackWidget";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#0055fe",
};

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://spellense.com"
  ),
  title: {
    default: "Spellense — Free English Spell Checker & Visual Proofreader",
    template: "%s | Spellense",
  },
  description:
    "Check English spelling in images, PDFs, DOCX, PPTX and XLSX files online. Free in-memory OCR proofreading with zero sign-up.",
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
    title: "Spellense — Free English Spell Checker & Visual Proofreader",
    description:
      "Check English spelling in images, PDFs, DOCX, PPTX and XLSX files online with in-memory OCR. 100% private and free.",
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
    title: "Spellense — Free English Spell Checker & Visual Proofreader",
    description:
      "Check English spelling in images, PDFs, DOCX, PPTX and XLSX files online with in-memory OCR.",
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
      className={`${plusJakartaSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f0f6fe]">
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
        <Script
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=G-VZ4LWT81D3"
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
        >
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-VZ4LWT81D3');
          `}
        </Script>
        <Script
          id="yandex-metrika"
          strategy="afterInteractive"
        >
          {`
            (function(m,e,t,r,i,k,a){
                m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
                m[i].l=1*new Date();
                for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
                k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
            })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=113419121', 'ym');

            ym(113419121, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
          `}
        </Script>
        <noscript>
          <div>
            <img
              src="https://mc.yandex.ru/watch/113419121"
              style={{ position: "absolute", left: "-9999px" }}
              alt=""
            />
          </div>
        </noscript>
        {children}
        <PwaInstallPrompt />
        <FeedbackWidget />
      </body>
    </html>
  );
}
