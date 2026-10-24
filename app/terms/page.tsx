import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "Review the terms and conditions for using Spellense's online English spelling and visual document checking service.",
  alternates: { canonical: "/terms" },
  openGraph: {
    siteName: "Spellense",
    title: "Terms of Use",
    description:
      "Review the terms and conditions for using Spellense's online English spelling and visual document checking service.",
    url: "/terms",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Spellense Terms of Use",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms of Use",
    description:
      "Review the terms and conditions for using Spellense's online English spelling and visual document checking service.",
    images: ["/og-image.png"],
  },
};

export default function TermsPage() {
  return (
    <main style={{ backgroundColor: "#faf9f6" }} className="relative z-10 min-h-screen bg-[#faf9f6] font-sans text-[15px] text-[#1c201a] antialiased selection:bg-[#bcd5ff] selection:text-black">

      {/* NAVBAR */}
      <Navbar />

      {/* HERO & CONTENT SECTION */}
      <section className="relative overflow-hidden pb-20 pt-3 sm:pb-24 sm:pt-6">
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

          {/* PAGE HEADER */}
          <div className="pb-2 pt-2 text-center sm:pb-4 sm:pt-6">
            <div style={{ color: "#3158d5", letterSpacing: "0.18em", fontSize: "12px", fontWeight: 700 }} className="mb-3 inline-flex items-center uppercase sm:mb-4">
              Legal
            </div>
            <h1 className="mx-auto max-w-5xl text-center text-[34px] font-black leading-[1.12] tracking-[-0.035em] text-[#1c201a] sm:text-[56px] md:text-[64px] lg:text-[72px]">
              Terms of Use
            </h1>
          </div>

          {/* CLAUSES */}
          <div className="mt-8 space-y-4 sm:mt-10 sm:space-y-5">

            <div style={{ borderColor: "#e5e5df" }} className="rounded-2xl border bg-white p-6 shadow-2xs sm:p-8">
              <h2 className="text-xl font-bold text-[#1c201a]">1. Acceptance of Terms &amp; Permitted Use</h2>
              <p className="mt-3 text-sm leading-7 text-[#70746d]">
                By accessing Spellense and submitting files for spell checking, you agree to comply with these Terms of Use. You warrant that you hold all rights, permissions, and authorizations necessary to submit your documents, graphics, and spreadsheets for processing. You may not use the service for any unlawful purpose or to process malicious content.
              </p>
            </div>

            <div style={{ borderColor: "#e5e5df" }} className="rounded-2xl border bg-white p-6 shadow-2xs sm:p-8">
              <h2 className="text-xl font-bold text-[#1c201a]">2. Nature of Automated Suggestions</h2>
              <p className="mt-3 text-sm leading-7 text-[#70746d]">
                Spellense provides algorithmic and OCR-assisted spelling suggestions for informational and assistive purposes only. While our engines strive for high accuracy, automated spell checking is not a substitute for human editorial proofreading. Proper nouns, branded typography, technical formulas, and stylized graphics may generate false positives or missed errors.
              </p>
            </div>

            <div style={{ borderColor: "#e5e5df" }} className="rounded-2xl border bg-white p-6 shadow-2xs sm:p-8">
              <h2 className="text-xl font-bold text-[#1c201a]">3. User Responsibility &amp; Backups</h2>
              <p className="mt-3 text-sm leading-7 text-[#70746d]">
                You retain sole responsibility for verifying detected mistakes, making editorial decisions, and maintaining independent backups of your master files. Spellense does not store user files and cannot recover uploaded documents.
              </p>
            </div>

            <div style={{ borderColor: "#e5e5df" }} className="rounded-2xl border bg-white p-6 shadow-2xs sm:p-8">
              <h2 className="text-xl font-bold text-[#1c201a]">4. Service Availability &amp; Modifications</h2>
              <p className="mt-3 text-sm leading-7 text-[#70746d]">
                Spellense is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. We reserve the right to modify, refine, or temporarily suspend features, dictionary lexicons, or supported file formats without prior notice.
              </p>
            </div>

            <div style={{ borderColor: "#e5e5df" }} className="rounded-2xl border bg-white p-6 shadow-2xs sm:p-8">
              <h2 className="text-xl font-bold text-[#1c201a]">5. Privacy &amp; Data Inquiries</h2>
              <p className="mt-3 text-sm leading-7 text-[#70746d]">
                Our handling of files and in-memory processing is governed by our{" "}
                <Link href="/privacy" className="font-semibold text-[#3158d5] underline-offset-2 hover:underline">
                  Privacy Policy
                </Link>. For any legal or operational questions, please reach out to{" "}
                <a className="font-semibold text-[#3158d5] underline-offset-2 hover:underline" href="mailto:hello@spellense.com">
                  hello@spellense.com
                </a>.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* FOOTER */}
      <Footer currentPath="/terms" />

    </main>
  );
}
