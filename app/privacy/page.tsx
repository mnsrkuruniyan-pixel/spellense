import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy & Zero-Storage Commitment",
  description:
    "Learn about Spellense's privacy-first architecture. We process images, PDFs, DOCX, PPTX, and XLSX files in memory with zero storage retention and no account required.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    siteName: "Spellense",
    title: "Privacy Policy & Zero-Storage Commitment",
    description:
      "Our zero-storage commitment: uploaded images and documents are processed in memory and never stored or used to train AI models.",
    url: "/privacy",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Spellense Privacy Policy",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy & Zero-Storage Commitment",
    description:
      "Our zero-storage commitment: uploaded images and documents are processed in memory and never stored or used to train AI models.",
    images: ["/og-image.png"],
  },
};

export default function PrivacyPage() {
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
              Privacy &amp; Security
            </div>
            <h1 className="mx-auto max-w-5xl text-center text-[34px] font-black leading-[1.12] tracking-[-0.035em] text-[#1c201a] sm:text-[56px] md:text-[64px] lg:text-[72px]">
              Privacy Policy
            </h1>
          </div>

          {/* PRIVACY PILLARS SUMMARY CARDS */}
          <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-3">
            <div style={{ borderColor: "#e5e5df" }} className="rounded-2xl border bg-white p-5 shadow-2xs transition hover:-translate-y-0.5 hover:shadow-md">
              <div style={{ backgroundColor: "#efeee7", color: "#3158d5" }} className="flex h-10 w-10 items-center justify-center rounded-xl">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <h3 className="mt-3 font-bold text-[#1c201a]">Zero File Storage</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#70746d]">Files are processed ephemerally in RAM and wiped immediately after analysis completes.</p>
            </div>

            <div style={{ borderColor: "#e5e5df" }} className="rounded-2xl border bg-white p-5 shadow-2xs transition hover:-translate-y-0.5 hover:shadow-md">
              <div style={{ backgroundColor: "#efeee7", color: "#3158d5" }} className="flex h-10 w-10 items-center justify-center rounded-xl">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M4.93 4.93l4.24 4.24" />
                  <path d="M14.83 9.17l4.24-4.24" />
                  <path d="M14.83 14.83l4.24 4.24" />
                  <path d="M9.17 14.83L4.93 19.07" />
                  <circle cx="12" cy="12" r="4" />
                </svg>
              </div>
              <h3 className="mt-3 font-bold text-[#1c201a]">No Account Required</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#70746d]">We never collect your name, email, credentials, or personal tracking identifiers.</p>
            </div>

            <div style={{ borderColor: "#e5e5df" }} className="rounded-2xl border bg-white p-5 shadow-2xs transition hover:-translate-y-0.5 hover:shadow-md">
              <div style={{ backgroundColor: "#efeee7", color: "#3158d5" }} className="flex h-10 w-10 items-center justify-center rounded-xl">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h3 className="mt-3 font-bold text-[#1c201a]">No AI Training</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#70746d]">Your documents and proprietary intellectual property are never used to train machine learning models.</p>
            </div>
          </div>

          {/* DETAILED PRIVACY CLAUSES */}
          <div className="mt-8 space-y-4 sm:mt-10 sm:space-y-5">

            {/* 1 */}
            <div style={{ borderColor: "#e5e5df" }} className="rounded-2xl border bg-white p-6 shadow-2xs sm:p-8">
              <h2 className="text-xl font-bold text-[#1c201a]">1. What Spellense Does &amp; Core Purpose</h2>
              <p className="mt-3 text-sm leading-7 text-[#70746d]">
                Spellense provides an automated visual spelling inspection service. Users upload visual documents including images (JPEG, PNG, WebP), Portable Document Formats (PDF), Microsoft Word documents (DOCX), PowerPoint presentations (PPTX), and Excel spreadsheets (XLSX). The platform extracts English language text strings strictly to detect spelling irregularities and provide contextual suggestions.
              </p>
            </div>

            {/* 2 */}
            <div style={{ borderColor: "#e5e5df" }} className="rounded-2xl border bg-white p-6 shadow-2xs sm:p-8">
              <h2 className="text-xl font-bold text-[#1c201a]">2. In-Memory Processing &amp; Zero File Storage</h2>
              <p className="mt-3 text-sm leading-7 text-[#70746d]">
                When you submit a document for spelling verification, the file is held temporarily in random access memory (RAM) exclusively to execute Optical Character Recognition (OCR) and dictionary queries. 
              </p>
              <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-[#70746d]">
                <li>Files are <strong className="text-[#1c201a]">never written to permanent disk storage</strong> or uploaded to persistent databases.</li>
                <li>Once the check response is returned to your browser, server memory pointers for the file are immediately cleared.</li>
                <li>Spellense operates without a database of user files or document archives.</li>
              </ul>
            </div>

            {/* 3 */}
            <div style={{ borderColor: "#e5e5df" }} className="rounded-2xl border bg-white p-6 shadow-2xs sm:p-8">
              <h2 className="text-xl font-bold text-[#1c201a]">3. Optical Character Recognition (OCR) &amp; Text Parsing</h2>
              <p className="mt-3 text-sm leading-7 text-[#70746d]">
                For image assets and scanned PDFs without selectable text layers, OCR technology identifies visible English alphanumeric characters. The parsed tokens are matched against local dictionary engines (including American and British English lexicons). Document layouts and bounding box coordinates are mapped in the client browser session so you can visually review detected mistakes.
              </p>
            </div>

            {/* 4 */}
            <div style={{ borderColor: "#e5e5df" }} className="rounded-2xl border bg-white p-6 shadow-2xs sm:p-8">
              <h2 className="text-xl font-bold text-[#1c201a]">4. No Account, Registration, or Personal Profiles</h2>
              <p className="mt-3 text-sm leading-7 text-[#70746d]">
                Spellense is deliberately designed as a friction-free utility. You do not need to register, create a username, verify an email address, or enter payment details. Consequently, Spellense does not maintain user account profiles, mailing lists, or marketing CRM records.
              </p>
            </div>

            {/* 5 */}
            <div style={{ borderColor: "#e5e5df" }} className="rounded-2xl border bg-white p-6 shadow-2xs sm:p-8">
              <h2 className="text-xl font-bold text-[#1c201a]">5. Data Security in Transit</h2>
              <p className="mt-3 text-sm leading-7 text-[#70746d]">
                All communications between your web browser and Spellense servers are encrypted using modern Transport Layer Security (TLS 1.3/HTTPS). This ensures that your files cannot be intercepted or modified by unauthorized third parties during upload.
              </p>
            </div>

            {/* 6 */}
            <div style={{ borderColor: "#e5e5df" }} className="rounded-2xl border bg-white p-6 shadow-2xs sm:p-8">
              <h2 className="text-xl font-bold text-[#1c201a]">6. Cookies &amp; Technical Analytics</h2>
              <p className="mt-3 text-sm leading-7 text-[#70746d]">
                Spellense does not deploy tracking cookies for cross-site behavioral profiling. Our hosting infrastructure may collect standard, anonymized server access logs (such as IP address, browser user-agent, and response latency) solely for rate limiting, DDoS mitigation, and server stability monitoring.
              </p>
            </div>

            {/* 7 */}
            <div style={{ borderColor: "#e5e5df" }} className="rounded-2xl border bg-white p-6 shadow-2xs sm:p-8">
              <h2 className="text-xl font-bold text-[#1c201a]">7. Contact &amp; Inquiries</h2>
              <p className="mt-3 text-sm leading-7 text-[#70746d]">
                If you have questions regarding this Privacy Policy, our in-memory architecture, or data handling practices, please contact us directly via email at{" "}
                <a className="font-semibold text-[#3158d5] underline-offset-2 hover:underline" href="mailto:hello@spellense.com">
                  hello@spellense.com
                </a>.
              </p>
            </div>

          </div>

          {/* BOTTOM QUICK CALLOUT */}
          <div style={{ borderColor: "#e5e5df", backgroundColor: "#efeee7" }} className="mt-10 rounded-[24px] border p-6 text-center shadow-2xs sm:flex sm:items-center sm:justify-between sm:p-8 sm:text-left">
            <div>
              <h3 className="text-base font-bold text-[#1c201a]">Ready to check your spelling privately?</h3>
              <p className="mt-1 text-xs text-[#70746d]">Scan any image, PDF, or Office file with zero signup.</p>
            </div>
            <Link
              href="/"
              style={{ backgroundColor: "#3158d5", color: "#ffffff" }}
              className="mt-4 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-xs font-bold text-white shadow-xs shadow-[#3158d5]/20 transition hover:-translate-y-0.5 hover:opacity-90 sm:mt-0"
            >
              <span>Launch Spell Checker</span>
              <span>→</span>
            </Link>
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <Footer currentPath="/privacy" />

    </main>
  );
}
