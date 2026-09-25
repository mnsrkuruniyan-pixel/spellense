import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Privacy Policy & Zero-Storage Commitment | Spellense",
  description:
    "Learn about Spellense's privacy-first architecture. We process images, PDFs, DOCX, PPTX, and XLSX files in memory with zero storage retention and no account required.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy | Spellense Visual Spell Checker",
    description:
      "Our zero-storage commitment: uploaded images and documents are processed in memory and never stored or used to train AI models.",
    url: "/privacy",
  },
};

export default function PrivacyPage() {
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
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 bg-clip-text text-[11px] font-bold uppercase tracking-wider text-transparent">
                Privacy-First Architecture
              </span>
            </div>

            <h1 className="mt-5 text-4xl font-extrabold tracking-[-1.5px] text-black sm:text-5xl lg:text-[54px]">
              Spellense Privacy Policy
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-600 sm:text-base">
              Last updated: September 17, 2026 • We believe your confidential documents, designs, and pitch decks belong strictly to you. Learn how our zero-storage spellchecker protects your data.
            </p>
          </div>

          {/* PRIVACY PILLARS SUMMARY CARDS */}
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/90 bg-white/80 p-5 shadow-xs backdrop-blur-md transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <h3 className="mt-3 font-bold text-slate-900">Zero File Storage</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">Files are processed ephemerally in RAM and wiped immediately after analysis completes.</p>
            </div>

            <div className="rounded-2xl border border-white/90 bg-white/80 p-5 shadow-xs backdrop-blur-md transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M4.93 4.93l4.24 4.24" />
                  <path d="M14.83 9.17l4.24-4.24" />
                  <path d="M14.83 14.83l4.24 4.24" />
                  <path d="M9.17 14.83L4.93 19.07" />
                  <circle cx="12" cy="12" r="4" />
                </svg>
              </div>
              <h3 className="mt-3 font-bold text-slate-900">No Account Required</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">We never collect your name, email, credentials, or personal tracking identifiers.</p>
            </div>

            <div className="rounded-2xl border border-white/90 bg-white/80 p-5 shadow-xs backdrop-blur-md transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h3 className="mt-3 font-bold text-slate-900">No AI Training</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">Your documents and proprietary intellectual property are never used to train machine learning models.</p>
            </div>
          </div>

          {/* DETAILED PRIVACY CLAUSES */}
          <div className="mt-12 space-y-6">

            {/* 1 */}
            <div className="rounded-3xl border border-white/90 bg-white/80 p-7 sm:p-8 shadow-xs backdrop-blur-md">
              <h2 className="text-xl font-bold text-slate-900">1. What Spellense Does &amp; Core Purpose</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Spellense provides an automated visual spelling inspection service. Users upload visual documents including images (JPEG, PNG, WebP), Portable Document Formats (PDF), Microsoft Word documents (DOCX), PowerPoint presentations (PPTX), and Excel spreadsheets (XLSX). The platform extracts English language text strings strictly to detect spelling irregularities and provide contextual suggestions.
              </p>
            </div>

            {/* 2 */}
            <div className="rounded-3xl border border-white/90 bg-white/80 p-7 sm:p-8 shadow-xs backdrop-blur-md">
              <h2 className="text-xl font-bold text-slate-900">2. In-Memory Processing &amp; Zero File Storage</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                When you submit a document for spelling verification, the file is held temporarily in random access memory (RAM) exclusively to execute Optical Character Recognition (OCR) and dictionary queries. 
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-600 list-disc list-inside">
                <li>Files are <strong className="text-slate-800">never written to permanent disk storage</strong> or uploaded to persistent databases.</li>
                <li>Once the check response is returned to your browser, server memory pointers for the file are immediately cleared.</li>
                <li>Spellense operates without a database of user files or document archives.</li>
              </ul>
            </div>

            {/* 3 */}
            <div className="rounded-3xl border border-white/90 bg-white/80 p-7 sm:p-8 shadow-xs backdrop-blur-md">
              <h2 className="text-xl font-bold text-slate-900">3. Optical Character Recognition (OCR) &amp; Text Parsing</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                For image assets and scanned PDFs without selectable text layers, OCR technology identifies visible English alphanumeric characters. The parsed tokens are matched against local dictionary engines (including American and British English lexicons). Document layouts and bounding box coordinates are mapped in the client browser session so you can visually review detected mistakes.
              </p>
            </div>

            {/* 4 */}
            <div className="rounded-3xl border border-white/90 bg-white/80 p-7 sm:p-8 shadow-xs backdrop-blur-md">
              <h2 className="text-xl font-bold text-slate-900">4. No Account, Registration, or Personal Profiles</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Spellense is deliberately designed as a friction-free utility. You do not need to register, create a username, verify an email address, or enter payment details. Consequently, Spellense does not maintain user account profiles, mailing lists, or marketing CRM records.
              </p>
            </div>

            {/* 5 */}
            <div className="rounded-3xl border border-white/90 bg-white/80 p-7 sm:p-8 shadow-xs backdrop-blur-md">
              <h2 className="text-xl font-bold text-slate-900">5. Data Security in Transit</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                All communications between your web browser and Spellense servers are encrypted using modern Transport Layer Security (TLS 1.3/HTTPS). This ensures that your files cannot be intercepted or modified by unauthorized third parties during upload.
              </p>
            </div>

            {/* 6 */}
            <div className="rounded-3xl border border-white/90 bg-white/80 p-7 sm:p-8 shadow-xs backdrop-blur-md">
              <h2 className="text-xl font-bold text-slate-900">6. Cookies &amp; Technical Analytics</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Spellense does not deploy tracking cookies for cross-site behavioral profiling. Our hosting infrastructure may collect standard, anonymized server access logs (such as IP address, browser user-agent, and response latency) solely for rate limiting, DDoS mitigation, and server stability monitoring.
              </p>
            </div>

            {/* 7 */}
            <div className="rounded-3xl border border-white/90 bg-white/80 p-7 sm:p-8 shadow-xs backdrop-blur-md">
              <h2 className="text-xl font-bold text-slate-900">7. Contact &amp; Inquiries</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                If you have questions regarding this Privacy Policy, our in-memory architecture, or data handling practices, please contact us directly via email at{" "}
                <a className="font-semibold text-blue-600 hover:underline" href="mailto:hello@spellense.com">
                  hello@spellense.com
                </a>.
              </p>
            </div>

          </div>

          {/* BOTTOM QUICK CALLOUT */}
          <div className="mt-12 rounded-3xl border border-blue-200/80 bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-white p-7 text-center shadow-xs backdrop-blur-md sm:flex sm:items-center sm:justify-between sm:text-left">
            <div>
              <h3 className="text-base font-bold text-slate-900">Ready to check your spelling privately?</h3>
              <p className="mt-1 text-xs text-slate-500">Scan any image, PDF, or Office file with zero signup.</p>
            </div>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-6 py-3 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-600/35 sm:mt-0"
            >
              <span>Launch Spell Checker</span>
              <span>→</span>
            </Link>
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
              <Link href="/faq" className="transition hover:text-gray-700">
                FAQ
              </Link>
              <Link href="/privacy" className="font-semibold text-blue-600">
                Privacy
              </Link>
              <Link href="/terms" className="transition hover:text-gray-700">
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
