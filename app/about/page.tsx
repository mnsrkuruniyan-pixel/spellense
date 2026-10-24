import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "About Us — Creative Pre-Flight & Production Utility Suite",
  description:
    "Learn about Spellense, our privacy-first creative pre-flight suite, and our mission to help designers, marketers, and print professionals deliver flawless visual work.",
  alternates: { canonical: "/about" },
  openGraph: {
    siteName: "Spellense",
    title: "About Us — Creative Pre-Flight & Production Utility Suite",
    description:
      "Why we built Spellense: a 100% in-memory, privacy-first pre-flight and production toolkit for designers, marketers, and teams.",
    url: "/about",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Spellense About Page",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "About Us — Creative Pre-Flight & Production Utility Suite",
    description:
      "Why we built Spellense: a privacy-first pre-flight and production utility suite for creators, marketers, and teams.",
    images: ["/og-image.png"],
  },
};

export default function AboutPage() {
  const aboutSchema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About Spellense",
    url: "https://spellense.com/about",
    description:
      "Spellense provides privacy-first creative pre-flight tools, visual spell checking, image compression, OCR extraction, print sheet layouts, and 3D digital flipbooks with zero data retention.",
    mainEntity: {
      "@type": "Organization",
      name: "Spellense",
      url: "https://spellense.com",
      logo: "https://spellense.com/icon-192.png",
      email: "hello@spellense.com",
      foundingDate: "2026",
      description:
        "Privacy-first visual pre-flight and creative production utility suite.",
      sameAs: [
        "https://github.com/mnsrkuruniyan-pixel/spellense",
      ],
    },
  };

  return (
    <main id="main-content" style={{ backgroundColor: "#faf9f6" }} className="relative z-10 min-h-screen bg-[#faf9f6] font-sans text-[15px] text-[#1c201a] antialiased selection:bg-[#bcd5ff] selection:text-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }}
      />

      {/* NAVBAR */}
      <Navbar />

      {/* HERO & ABOUT CONTENT */}
      <section className="relative overflow-hidden pb-20 pt-3 sm:pb-24 sm:pt-6">
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* HEADER */}
          <div className="pb-2 pt-2 text-center sm:pb-4 sm:pt-6">
            <div style={{ color: "#3158d5", letterSpacing: "0.18em", fontSize: "12px", fontWeight: 700 }} className="mb-3 inline-flex items-center uppercase sm:mb-4">
              Our Story &amp; Purpose
            </div>
            <h1 className="mx-auto max-w-5xl text-center text-[34px] font-black leading-[1.12] tracking-[-0.035em] text-[#1c201a] sm:text-[56px] md:text-[64px] lg:text-[72px]">
              About Spellense
            </h1>
            <p style={{ color: "#70746d" }} className="mx-auto mt-4 max-w-2xl text-center text-sm sm:text-base">
              From a visual typo detector to a complete creative pre-flight suite — built by designers and developers to catch costly errors before artwork goes live.
            </p>
          </div>

          {/* MISSION & ORIGIN STORY */}
          <div className="mt-8 space-y-6 sm:mt-10 sm:space-y-8">
            <div style={{ borderColor: "#e5e5df" }} className="rounded-[24px] border bg-white p-6 shadow-2xs sm:p-9">
              <div style={{ backgroundColor: "#efeee7", color: "#3158d5" }} className="mb-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
                The Origin Story
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-[#1c201a] sm:text-3xl">
                Born From a Real Workplace Problem
              </h2>
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-[#70746d] sm:text-[15px]">
                <p>
                  In our daily professional work across marketing and creative production, nearly <strong className="font-bold text-[#1c201a]">30% of all quality review issues and revision cycles</strong> were caused by subtle English spelling mistakes hidden across creative banners, presentation decks, and exported documents.
                </p>
                <p>
                  Designers and marketing teammates spend hours perfecting visual hierarchies in Figma, Photoshop, and Canva. But once artwork is exported as a PNG, JPG, or PDF, words become locked into pixels. Traditional spell checkers and browser extensions only inspect plain text input fields—they cannot read pixels or slide layouts. Even a single overlooked typo on a promotional banner, contract, or investor deck meant costly reprint delays, client embarrassment, and hours wasted on re-exports.
                </p>
                <p>
                  Frustrated by the lack of a modern tool that could read words inside visual files, we built <strong className="font-semibold text-[#1c201a]">Spellense</strong>. We created it from the ground up to solve this exact bottleneck: an intelligent, in-memory OCR proofreading engine that reads text directly off graphics and multi-page documents, draws visual red highlights over typos in place, and suggests corrections without forcing you to re-type a single word.
                </p>
              </div>
            </div>

            {/* WHY WE EXPANDED INTO A FULL SUITE */}
            <div style={{ borderColor: "#e5e5df" }} className="rounded-[24px] border bg-white p-6 shadow-2xs sm:p-9">
              <div style={{ backgroundColor: "#efeee7", color: "#3158d5" }} className="mb-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
                Beyond Spell Checking
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-[#1c201a] sm:text-3xl">
                Why We Built the Entire Tool Suite
              </h2>
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-[#70746d] sm:text-[15px]">
                <p>
                  Once our proofreading engine was active, we observed something crucial: <strong className="font-semibold text-[#1c201a]">a typo is never the only obstacle standing between a finished design and final delivery.</strong>
                </p>
                <p>
                  Real creative production involves an entire chain of repetitive friction points that slow teams down right before client sign-off or print dispatch. We built each additional Spellense tool to solve one specific, high-friction production headache:
                </p>
              </div>

              {/* TOOLS GRID EXPLANATION */}
              <div className="mt-6 grid gap-4 sm:grid-cols-2 sm:gap-5">
                <div style={{ borderColor: "#e5e5df", backgroundColor: "#faf9f6" }} className="rounded-2xl border p-5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#3158d5] uppercase tracking-wider">
                    <span>Pre-Flight Quality Assurance</span>
                  </div>
                  <h3 className="mt-1 font-bold text-[#1c201a]">Design Check (QA)</h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#70746d]">
                    Print shops often reject artwork for trimmer bleed violations or safe-zone cuts, while accessibility laws require strict WCAG contrast ratios. Design Check audits typography, bleed safety margins, and luminance contrast before physical printing or ad publishing.
                  </p>
                </div>

                <div style={{ borderColor: "#e5e5df", backgroundColor: "#faf9f6" }} className="rounded-2xl border p-5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#3158d5] uppercase tracking-wider">
                    <span>Asset Delivery &amp; Speed</span>
                  </div>
                  <h3 className="mt-1 font-bold text-[#1c201a]">Image Compressor</h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#70746d]">
                    Raw exports from design apps often exceed email attachment limits and slow down web page load speeds. We built a client-side lossless optimizer with a live split slider to shrink file sizes by up to 85% without sacrificing pixel sharpness.
                  </p>
                </div>

                <div style={{ borderColor: "#e5e5df", backgroundColor: "#faf9f6" }} className="rounded-2xl border p-5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#3158d5] uppercase tracking-wider">
                    <span>Asset Recovery &amp; Copy Re-use</span>
                  </div>
                  <h3 className="mt-1 font-bold text-[#1c201a]">Image to Text (OCR)</h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#70746d]">
                    Clients frequently send flat JPG screenshots or scanned PDFs instead of editable copy documents. Our high-precision OCR extracts all visible body text and tables in seconds, eliminating tedious manual retyping.
                  </p>
                </div>

                <div style={{ borderColor: "#e5e5df", backgroundColor: "#faf9f6" }} className="rounded-2xl border p-5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#3158d5] uppercase tracking-wider">
                    <span>Interactive Presentation</span>
                  </div>
                  <h3 className="mt-1 font-bold text-[#1c201a]">3D Digital Flipbook Studio</h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#70746d]">
                    Sending static PDF brochures and lookbooks feels flat and uninspired. We created an in-browser WebGL 3D flipbook that turns any multi-page PDF into an engaging, page-turning digital publication with realistic physics and sound.
                  </p>
                </div>

                <div style={{ borderColor: "#e5e5df", backgroundColor: "#faf9f6" }} className="rounded-2xl border p-5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#3158d5] uppercase tracking-wider">
                    <span>Physical Print Production</span>
                  </div>
                  <h3 className="mt-1 font-bold text-[#1c201a]">Print Sheet Maker</h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#70746d]">
                    Print operators and studio teams spend hours manually tiling ID cards, passport photos, and badges onto A4 or custom sheets. Our sheet maker automatically lays out items at exact physical millimeter scales with cut marks and trimmer margins.
                  </p>
                </div>

                <div style={{ borderColor: "#e5e5df", backgroundColor: "#faf9f6" }} className="rounded-2xl border p-5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#3158d5] uppercase tracking-wider">
                    <span>Global Copy &amp; Scannability</span>
                  </div>
                  <h3 className="mt-1 font-bold text-[#1c201a]">US/UK Translator &amp; QR Scannability</h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#70746d]">
                    Cross-border marketing requires seamless dialect translation between American and British English. Along with custom QR codes tested for physical camera scannability, every asset is verified ready for deployment.
                  </p>
                </div>
              </div>
            </div>

            {/* THREE PILLARS */}
            <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
              <div style={{ borderColor: "#e5e5df" }} className="rounded-2xl border bg-white p-6 shadow-2xs">
                <div style={{ backgroundColor: "#efeee7", color: "#3158d5" }} className="flex h-10 w-10 items-center justify-center rounded-xl">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-bold text-[#1c201a]">
                  Visual Precision First
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[#70746d]">
                  We map pixel coordinates to detected issues, overlaying visual highlights on original canvas designs rather than detaching copy into sterile text boxes.
                </p>
              </div>

              <div style={{ borderColor: "#e5e5df" }} className="rounded-2xl border bg-white p-6 shadow-2xs">
                <div style={{ backgroundColor: "#efeee7", color: "#3158d5" }} className="flex h-10 w-10 items-center justify-center rounded-xl">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-bold text-[#1c201a]">
                  100% In-Memory Privacy
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[#70746d]">
                  Confidential client pitch decks, financial audits, and contracts are processed in temporary RAM and wiped immediately. We never store files or train AI models on user data.
                </p>
              </div>

              <div style={{ borderColor: "#e5e5df" }} className="rounded-2xl border bg-white p-6 shadow-2xs">
                <div style={{ backgroundColor: "#efeee7", color: "#3158d5" }} className="flex h-10 w-10 items-center justify-center rounded-xl">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="m4.93 4.93 4.24 4.24" />
                    <path d="m14.83 9.17 4.24-4.24" />
                    <path d="m14.83 14.83 4.24 4.24" />
                    <path d="m9.17 14.83-4.24 4.24" />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-bold text-[#1c201a]">
                  Zero Friction Utility
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[#70746d]">
                  No paywalls, no forced registrations, no cookies, and no credit card gates. Open, upload, verify, and export immediately.
                </p>
              </div>
            </div>

            {/* EDITORIAL PRINCIPLES & VALUES */}
            <div style={{ borderColor: "#e5e5df" }} className="rounded-[24px] border bg-white p-6 shadow-2xs sm:p-9">
              <h2 className="text-xl font-bold tracking-tight text-[#1c201a]">
                Our Core Principles
              </h2>
              <ul className="mt-4 space-y-3 text-sm text-[#70746d] sm:text-[15px]">
                <li className="flex items-start gap-3">
                  <span style={{ backgroundColor: "#efeee7", color: "#3158d5" }} className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold">✓</span>
                  <span><strong className="text-[#1c201a]">Built for Speed:</strong> No paywalls, no software installation, and no account hurdles. Designed to save creators time before critical deadlines.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span style={{ backgroundColor: "#efeee7", color: "#3158d5" }} className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold">✓</span>
                  <span><strong className="text-[#1c201a]">Dialect Inclusivity:</strong> Full support for both American English (en-US) and British English (en-GB) standards across spelling and vocabulary.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span style={{ backgroundColor: "#efeee7", color: "#3158d5" }} className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold">✓</span>
                  <span><strong className="text-[#1c201a]">Creator Sovereignty:</strong> We believe utility tools should respect user privacy above all else. Your designs and documents belong strictly to you.</span>
                </li>
              </ul>
            </div>

            {/* CONTACT & GET IN TOUCH */}
            <div style={{ borderColor: "#e5e5df", backgroundColor: "#efeee7" }} className="flex flex-col items-center justify-between gap-6 rounded-[24px] border p-6 shadow-2xs sm:flex-row sm:p-9">
              <div>
                <h3 className="text-lg font-bold text-[#1c201a]">
                  Have feedback, questions, or ideas?
                </h3>
                <p className="mt-1 text-xs text-[#70746d] sm:text-sm">
                  We would love to hear from you. Reach out to our team directly.
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-[#3158d5]">
                  <span>Email:</span>
                  <a href="mailto:hello@spellense.com" className="underline underline-offset-2 hover:text-[#1c201a]">
                    hello@spellense.com
                  </a>
                </div>
              </div>
              <Link
                href="/"
                style={{ backgroundColor: "#3158d5", color: "#ffffff" }}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl px-6 py-3.5 text-xs font-bold text-white shadow-xs shadow-[#3158d5]/20 transition hover:-translate-y-0.5 hover:opacity-90"
              >
                <span>Try Spellense Now</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <Footer currentPath="/about" />
    </main>
  );
}

