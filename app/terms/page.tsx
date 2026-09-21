import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use | Spellense",
  description:
    "Review the terms and conditions for using Spellense's online English spelling and visual document checking service.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#101828]">

      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6 lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-600/25">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M8 13h5" />
                <path d="M8 17h3" />
                <circle cx="17.5" cy="16.5" r="2.7" />
                <path d="m19.5 18.5 1.8 1.8" />
              </svg>
            </div>
            <div>
              <div className="text-[21px] font-bold tracking-[-0.8px]">
                Spel<span className="text-blue-600">lense</span>
              </div>
              <div className="text-[9px] font-medium tracking-[1.5px] text-gray-400">
                SMART SPELL CHECKING
              </div>
            </div>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-1 rounded-full border border-slate-100 bg-slate-50/70 p-1 text-xs sm:text-[13px] font-semibold text-slate-500">
            <Link
              href="/"
              className="rounded-full px-2.5 sm:px-4 py-1.5 sm:py-2 transition hover:bg-white hover:text-blue-600"
            >
              Home
            </Link>
            <Link
              href="/case-converter"
              className="rounded-full px-2.5 sm:px-4 py-1.5 sm:py-2 transition hover:bg-white hover:text-blue-600"
            >
              <span className="sm:hidden">Case</span>
              <span className="hidden sm:inline">Case Converter</span>
            </Link>
            <Link
              href="/us-uk-converter"
              className="rounded-full px-2.5 sm:px-4 py-1.5 sm:py-2 transition hover:bg-white hover:text-blue-600"
            >
              <span className="sm:hidden">US/UK</span>
              <span className="hidden sm:inline">US ↔ UK</span>
            </Link>
            <Link
              href="/faq"
              className="rounded-full px-2.5 sm:px-4 py-1.5 sm:py-2 transition hover:bg-white hover:text-blue-600"
            >
              FAQ
            </Link>
          </div>
        </nav>
      </header>

      {/* HERO & CONTENT SECTION */}
      <section className="relative overflow-hidden bg-dot-pattern pb-24 pt-12 sm:pt-16">
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

            <h1 className="mt-5 text-4xl font-extrabold tracking-[-1.5px] text-slate-900 sm:text-5xl lg:text-[54px]">
              Terms of Use
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-600 sm:text-base">
              Last updated: September 17, 2026 • Please read these terms carefully before using the Spellense online spell checking service.
            </p>
          </div>

          {/* CLAUSES */}
          <div className="mt-12 space-y-6">

            <div className="rounded-3xl border border-white/90 bg-white/80 p-7 sm:p-8 shadow-xs backdrop-blur-md">
              <h2 className="text-xl font-bold text-slate-900">1. Acceptance of Terms &amp; Permitted Use</h2>
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
              <Link href="/case-converter" className="transition hover:text-gray-700">
                Case Converter
              </Link>
              <Link href="/us-uk-converter" className="transition hover:text-gray-700">
                US ↔ UK Dialect
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
