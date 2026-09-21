import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Us | Spellense — Visual Spell Checker & Writing Tools",
  description:
    "Learn about Spellense, our privacy-first visual spell checking technology, and our mission to help creators and teams catch typos across images, PDFs, and presentations.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Spellense — Visual Spell Checking & Text Tools",
    description:
      "Why we built Spellense: a 100% in-memory, privacy-first proofreading engine for graphic designers, marketers, and professionals.",
    url: "/about",
  },
};

export default function AboutPage() {
  const aboutSchema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About Spellense",
    url: "https://spellense.com/about",
    description:
      "Spellense provides in-memory visual spell checking for images, documents, presentations, and spreadsheets with zero data retention.",
    mainEntity: {
      "@type": "Organization",
      name: "Spellense",
      url: "https://spellense.com",
      logo: "https://spellense.com/icon-192.png",
      email: "hello@spellense.com",
      foundingDate: "2026",
      description:
        "Privacy-first visual proofreader and copywriting utility suite.",
      sameAs: [
        "https://github.com/mnsrkuruniyan-pixel/spellense",
      ],
    },
  };

  return (
    <main id="main-content" className="min-h-screen bg-[#f8fafc] text-[#101828]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }}
      />

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

      {/* HERO & ABOUT CONTENT */}
      <section className="relative overflow-hidden bg-dot-pattern pb-24 pt-12 sm:pt-16">
        {/* Ambient background glows */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[560px] w-[920px] rounded-full bg-gradient-to-tr from-blue-400/20 via-indigo-400/20 to-purple-400/15 blur-[120px] opacity-80 animate-pulse-glow" />
        <div className="pointer-events-none absolute top-40 -left-28 h-[400px] w-[400px] rounded-full bg-blue-200/40 blur-[100px]" />
        <div className="pointer-events-none absolute top-36 -right-28 h-[420px] w-[420px] rounded-full bg-indigo-200/40 blur-[110px]" />

        <div className="relative mx-auto max-w-4xl px-5 sm:px-6 lg:px-8">
          {/* HEADER */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-white/80 px-3.5 py-1.5 shadow-xs shadow-blue-500/5 backdrop-blur-md">
              <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              <span className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 bg-clip-text text-[11px] font-bold uppercase tracking-wider text-transparent">
                About Spellense
              </span>
            </div>

            <h1 className="mt-5 text-4xl font-extrabold tracking-[-1.5px] text-slate-900 sm:text-5xl lg:text-[54px]">
              Built for great design and flawless words.
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-600 sm:text-base">
              Spellense is an AI &amp; OCR-powered proofreading platform built to bridge the gap between creative visual design and grammatical precision.
            </p>
          </div>

          {/* MISSION & ORIGIN STORY */}
          <div className="mt-12 space-y-8">
            <div className="rounded-3xl border border-white/90 bg-white/85 p-7 sm:p-9 shadow-xs backdrop-blur-md">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-2">
                The Origin Story
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Born From a Real Workplace Problem
              </h2>
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-600 sm:text-[15px]">
                <p>
                  In my daily professional work, nearly <strong className="text-slate-900 font-bold">30% of all quality review issues and revision cycles</strong> were caused by subtle English spelling mistakes hidden across creative banners, presentation decks, and exported documents.
                </p>
                <p>
                  Designers and marketing teammates spend hours perfecting visual hierarchies in Figma, Photoshop, and Canva. But once artwork is exported as a PNG, JPG, or PDF, words become locked into pixels. Traditional spell checkers and browser extensions only inspect plain text input fields—they cannot read pixels or slide layouts. Even a single overlooked typo on a promotional banner, contract, or investor deck meant costly reprint delays, client embarrassment, and hours wasted on re-exports.
                </p>
                <p>
                  Frustrated by the lack of a modern tool that could actually read words inside visual files, I built <strong className="text-slate-900 font-semibold">Spellense</strong>. It was created from the ground up to solve this exact problem: an intelligent, in-memory OCR proofreading engine that reads text directly off graphics and multi-page documents, draws visual red highlights over typos in place, and suggests corrections without forcing you to re-type a single word.
                </p>
              </div>
            </div>

            {/* THREE PILLARS */}
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/90 bg-white/80 p-6 shadow-xs backdrop-blur-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">
                  Visual OCR Precision
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  We map precise pixel coordinates to every detected word token, drawing red bounding boxes over suspected typos directly on your original design.
                </p>
              </div>

              <div className="rounded-3xl border border-white/90 bg-white/80 p-6 shadow-xs backdrop-blur-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">
                  100% In-Memory Privacy
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  Your confidential pitch decks, resumes, and legal contracts are processed ephemerally in RAM and wiped immediately. We never store files or train AI models on your data.
                </p>
              </div>

              <div className="rounded-3xl border border-white/90 bg-white/80 p-6 shadow-xs backdrop-blur-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="m4.93 4.93 4.24 4.24" />
                    <path d="m14.83 9.17 4.24-4.24" />
                    <path d="m14.83 14.83 4.24 4.24" />
                    <path d="m9.17 14.83-4.24 4.24" />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">
                  Multi-Format Freedom
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  Support for PNG, JPG, WebP, multi-page PDFs, Microsoft Word (DOCX), PowerPoint (PPTX), and Excel (XLSX) with zero installation or account required.
                </p>
              </div>
            </div>

            {/* EDITORIAL PRINCIPLES & VALUES */}
            <div className="rounded-3xl border border-white/90 bg-white/85 p-7 sm:p-9 shadow-xs backdrop-blur-md">
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Our Core Principles
              </h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-600 sm:text-[15px]">
                <li className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs font-bold mt-0.5">✓</span>
                  <span><strong className="text-slate-800">Zero Friction:</strong> No paywalls, no forced account registration, and no credit card required. Anyone can upload and verify in seconds.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs font-bold mt-0.5">✓</span>
                  <span><strong className="text-slate-800">Dialect Inclusivity:</strong> Full support for both American English (en-US) and British English (en-GB) spelling standards.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs font-bold mt-0.5">✓</span>
                  <span><strong className="text-slate-800">Creator Privacy:</strong> We believe utility tools should respect user sovereignty. Your content is strictly yours.</span>
                </li>
              </ul>
            </div>

            {/* CONTACT & GET IN TOUCH */}
            <div className="rounded-3xl border border-blue-200/80 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-white p-7 sm:p-9 shadow-xs backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Have feedback, questions, or ideas?
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-slate-600">
                  We would love to hear from you. Reach out to our team directly.
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-blue-700">
                  <span>Email:</span>
                  <a href="mailto:hello@spellense.com" className="underline hover:text-blue-900">
                    hello@spellense.com
                  </a>
                </div>
              </div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-6 py-3.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-600/35 shrink-0"
              >
                <span>Try Spellense Now</span>
                <span>→</span>
              </Link>
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
              <Link href="/about" className="font-semibold text-blue-600">
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

