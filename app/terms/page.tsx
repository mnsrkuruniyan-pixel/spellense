import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Terms of Use | Spellense",
  description:
    "Review the terms and conditions for using Spellense's online English spelling and visual document checking service.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#f0f6fe] text-black">

      {/* NAVBAR */}
      <Navbar />

      {/* HERO & CONTENT SECTION */}
      <section className="relative overflow-hidden pb-24 pt-12 sm:pt-16">
        {/* Ambient background glows */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[560px] w-[920px] rounded-full bg-gradient-to-tr from-blue-400/20 via-indigo-400/20 to-purple-400/15 blur-[120px] opacity-80 animate-pulse-glow" />
        <div className="pointer-events-none absolute top-40 -left-28 h-[400px] w-[400px] rounded-full bg-blue-200/40 blur-[100px]" />
        <div className="pointer-events-none absolute top-36 -right-28 h-[420px] w-[420px] rounded-full bg-indigo-200/40 blur-[110px]" />

        <div className="relative mx-auto max-w-4xl px-5 sm:px-6 lg:px-8">

          {/* PAGE HEADER */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-white/80 px-3.5 py-1.5 shadow-xs shadow-blue-500/5 backdrop-blur-md">
              <span className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 bg-clip-text text-[11px] font-bold uppercase tracking-wider text-transparent">
                Legal &amp; Agreement
              </span>
            </div>

            <h1 className="mt-5 text-4xl font-extrabold tracking-[-1.5px] text-black sm:text-5xl lg:text-[54px]">
              Terms of Use
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-600 sm:text-base">
              Last updated: September 17, 2026 • Please read these terms carefully before using the Spellense online spell checking service.
            </p>
          </div>

          {/* CLAUSES */}
          <div className="mt-12 space-y-6">

            <div className="rounded-3xl border border-white/90 bg-white/80 p-7 sm:p-8 shadow-xs backdrop-blur-md">
              <h2 className="text-xl font-bold text-black">1. Acceptance of Terms &amp; Permitted Use</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                By accessing Spellense and submitting files for spell checking, you agree to comply with these Terms of Use. You warrant that you hold all rights, permissions, and authorizations necessary to submit your documents, graphics, and spreadsheets for processing. You may not use the service for any unlawful purpose or to process malicious content.
              </p>
            </div>

            <div className="rounded-3xl border border-white/90 bg-white/80 p-7 sm:p-8 shadow-xs backdrop-blur-md">
              <h2 className="text-xl font-bold text-slate-900">2. Nature of Automated Suggestions</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Spellense provides algorithmic and OCR-assisted spelling suggestions for informational and assistive purposes only. While our engines strive for high accuracy, automated spell checking is not a substitute for human editorial proofreading. Proper nouns, branded typography, technical formulas, and stylized graphics may generate false positives or missed errors.
              </p>
            </div>

            <div className="rounded-3xl border border-white/90 bg-white/80 p-7 sm:p-8 shadow-xs backdrop-blur-md">
              <h2 className="text-xl font-bold text-slate-900">3. User Responsibility &amp; Backups</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                You retain sole responsibility for verifying detected mistakes, making editorial decisions, and maintaining independent backups of your master files. Spellense does not store user files and cannot recover uploaded documents.
              </p>
            </div>

            <div className="rounded-3xl border border-white/90 bg-white/80 p-7 sm:p-8 shadow-xs backdrop-blur-md">
              <h2 className="text-xl font-bold text-slate-900">4. Service Availability &amp; Modifications</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Spellense is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. We reserve the right to modify, refine, or temporarily suspend features, dictionary lexicons, or supported file formats without prior notice.
              </p>
            </div>

            <div className="rounded-3xl border border-white/90 bg-white/80 p-7 sm:p-8 shadow-xs backdrop-blur-md">
              <h2 className="text-xl font-bold text-slate-900">5. Privacy &amp; Data Inquiries</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Our handling of files and in-memory processing is governed by our{" "}
                <Link href="/privacy" className="font-semibold text-blue-600 hover:underline">
                  Privacy Policy
                </Link>. For any legal or operational questions, please reach out to{" "}
                <a className="font-semibold text-blue-600 hover:underline" href="mailto:hello@spellense.com">
                  hello@spellense.com
                </a>.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200/70 bg-white px-5 py-8 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
            <div>
              <div className="text-lg font-bold">
                Spel<span className="text-blue-600">lense</span>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Simple English spell checking for visual content.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs text-gray-400">
              <Link href="/" className="transition hover:text-gray-700">
                Home
              </Link>
              <Link href="/about" className="transition hover:text-gray-700">
                About
              </Link>
              <Link href="/blog" className="transition hover:text-gray-700">
                Blog
              </Link>
              <Link href="/case-converter" className="transition hover:text-gray-700">
                Case Converter
              </Link>
              <Link href="/us-uk-converter" className="transition hover:text-gray-700">
                US ↔ UK Dialect
              </Link>
              <Link href="/image-to-text" className="transition hover:text-gray-700">
                Image to Text
              </Link>
              <Link href="/image-compressor" className="transition hover:text-gray-700">
                Image Compressor
              </Link>
              <Link href="/faq" className="transition hover:text-gray-700">
                FAQ
              </Link>
              <Link href="/privacy" className="transition hover:text-gray-700">
                Privacy
              </Link>
              <Link href="/terms" className="font-semibold text-blue-600">
                Terms
              </Link>
              <a href="mailto:hello@spellense.com" className="transition hover:text-gray-700">
                Contact
              </a>
            </div>
          </div>

          <div className="mt-6 border-t border-gray-100 pt-5 text-center text-[11px] text-gray-300">
            © 2026 Spellense. All rights reserved.
          </div>
        </div>
      </footer>

    </main>
  );
}
