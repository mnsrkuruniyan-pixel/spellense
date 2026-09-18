import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

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
  openGraph: {
    type: "website",
    siteName: "Spellense",
    title: "Spellense — Free English Spell Checker",
    description:
      "Find spelling mistakes in images and documents before your content goes live.",
    url: "/",
  },
  twitter: {
    card: "summary",
    title: "Spellense — Free English Spell Checker",
    description:
      "Check spelling in images, PDFs, DOCX, PPTX and XLSX files online.",
  },
  keywords: [
    "spell checker",
    "free spell checker",
    "English spell checker",
    "image spell checker",
    "check spelling in image",
    "online spelling checker",
    "spelling mistakes checker",
    "proofreading tool",
    "PDF spell checker",
    "DOCX spell checker",
    "PowerPoint spell checker",
    "Excel spell checker",
    "OCR spelling checker",
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
