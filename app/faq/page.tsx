import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Frequently Asked Questions (FAQ) | Spellense Spell Checker",
  description:
    "Find answers about checking spelling in images, PDFs, DOCX, PPTX, and XLSX files with Spellense. Learn how our OCR, privacy, and visual proofreader work.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "Frequently Asked Questions | Spellense",
    description:
      "Answers to common questions about visual OCR spell checking for images, documents, slides, and spreadsheets.",
    url: "/faq",
  },
};

const faqItems = [
  {
    category: "File Formats",
    question: "What file types and document formats can Spellense check?",
    answer:
      "Spellense supports raster images (JPG, JPEG, PNG, WebP), Portable Document Format (PDF, both native text and scanned images), Microsoft Word documents (DOCX), PowerPoint presentations (PPTX), and Excel spreadsheets (XLSX). All files are analyzed with no account or sign-up required.",
  },
  {
    category: "File Limits",
    question: "What is the maximum file size I can upload?",
    answer:
      "The maximum file size limit is 25 MB per document. This generous limit allows checking high-resolution design banners, multi-page presentation decks, and complex spreadsheets quickly and securely in-memory.",
  },
  {
    category: "OCR & Technology",
    question: "How does Spellense check spelling in images and scanned PDFs?",
    answer:
      "Spellense utilizes high-accuracy Optical Character Recognition (OCR) to detect readable English letterforms across banners, flyers, posters, and scanned pages. Bounding coordinates are mapped to each word token so you can visually see red outlines around suspected typos directly over your original graphic.",
  },
  {
    category: "Office Documents",
    question: "Can I proofread Microsoft Word (DOCX) files with Spellense?",
    answer:
      "Yes. Spellense extracts document text while maintaining paragraph structure, highlights detected spelling mistakes, and renders an interactive multi-page document preview where you can pan, zoom, and verify words in context.",
  },
  {
    category: "Office Documents",
    question: "Can Spellense check PowerPoint (PPTX) pitch decks and slides?",
    answer:
      "Yes. Spellense scans slide titles, bullet points, text boxes, and table cells inside PPTX presentations. You can navigate through slides in the previewer to inspect highlighted errors before executive presentations.",
  },
  {
    category: "Office Documents",
    question: "Does Spellense check Excel (XLSX) spreadsheets?",
    answer:
      "Yes. Spellense parses string cells across workbook sheets while intelligently ignoring numbers, formulas, dates, and currency symbols. You can review typos sheet-by-sheet.",
  },
  {
    category: "Privacy & Security",
    question: "Are my uploaded files, contracts, or presentations stored on your servers?",
    answer:
      "No. Spellense operates on a strict zero-storage, in-memory architecture. Uploaded files are processed ephemerally in RAM exclusively to run OCR and dictionary checks, and are immediately discarded after results are returned. Files are never stored to disk or used to train AI models.",
  },
  {
    category: "Accuracy & Lexicons",
    question: "How does Spellense avoid falsely flagging brand names, countries, and technical terms?",
    answer:
      "Spellense incorporates extensive whitelists covering recognized brand names, country and city names, months, days, technical abbreviations, and common industry acronyms. If an uncommon or custom term is flagged, you can click 'Ignore' to exclude it from your report.",
  },
  {
    category: "Pricing & Access",
    question: "Is Spellense completely free to use?",
    answer:
      "Yes. Spellense is 100% free to use. There are no paywalls, credit card requirements, file size subscription gates, or forced registration steps.",
  },
  {
    category: "Reporting",
    question: "Can I download or export a summary report of spelling mistakes?",
    answer:
      "Yes. After analysis completes, you can click 'Download Report' to save a clean text file (.txt) detailing the file name, total word count, mistake count, and a list of all flagged words with their suggested corrections and page numbers.",
  },
  {
    category: "Accuracy & Lexicons",
    question: "Which English dialects and dictionaries are supported?",
    answer:
      "Spellense leverages comprehensive English dictionaries supporting standard American English (en-US) and British English (en-GB) spelling variations (such as color/colour, organize/organise).",
  },
];

export default function FaqPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <main className="min-h-screen bg-[#f0f6fe] text-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

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
              <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              <span className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 bg-clip-text text-[11px] font-bold uppercase tracking-wider text-transparent">
                Help Center &amp; Knowledge Base
              </span>
            </div>

            <h1 className="mt-5 text-4xl font-extrabold tracking-[-1.5px] text-black sm:text-5xl lg:text-[54px]">
              Frequently Asked Questions
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-600 sm:text-base">
              Got questions about Spellense? Learn how our in-memory visual proofreader extracts text, processes OCR, and checks spelling across all your documents.
            </p>
          </div>

          {/* FAQ ITEMS LIST */}
          <div className="mt-12 space-y-4">
            {faqItems.map((item, index) => (
              <div
                key={item.question}
                className="group rounded-3xl border border-white/90 bg-white/80 p-6 sm:p-7 shadow-xs backdrop-blur-md transition-all duration-300 hover:border-blue-200 hover:bg-white hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                        {item.category}
                      </span>
                      <span className="text-xs text-slate-400">Q{index + 1}</span>
                    </div>
                    <h2 className="mt-2.5 text-lg font-bold text-black sm:text-xl">
                      {item.question}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-[15px]">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* BOTTOM QUICK CALLOUT */}
          <div className="mt-12 rounded-3xl border border-blue-200/80 bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-white p-7 text-center shadow-xs backdrop-blur-md sm:flex sm:items-center sm:justify-between sm:text-left">
            <div>
              <h3 className="text-base font-bold text-slate-900">Have a document to check right now?</h3>
              <p className="mt-1 text-xs text-slate-500">Upload your file and receive instant OCR spelling results.</p>
            </div>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-6 py-3 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-600/35 sm:mt-0"
            >
              <span>Check your file now</span>
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
              <Link href="/faq" className="font-semibold text-blue-600">
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
