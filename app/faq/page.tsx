import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Frequently Asked Questions (FAQ)",
  description:
    "Find answers about checking spelling in images, PDFs, DOCX, PPTX, and XLSX files with Spellense. Learn how our OCR, privacy, and visual proofreader work.",
  alternates: { canonical: "/faq" },
  openGraph: {
    siteName: "Spellense",
    title: "Frequently Asked Questions (FAQ)",
    description:
      "Answers to common questions about visual OCR spell checking for images, documents, slides, and spreadsheets.",
    url: "/faq",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Spellense FAQ",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Frequently Asked Questions (FAQ)",
    description:
      "Answers to common questions about visual OCR spell checking for images, documents, slides, and spreadsheets.",
    images: ["/og-image.png"],
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
    <main style={{ backgroundColor: "#faf9f6" }} className="relative z-10 min-h-screen bg-[#faf9f6] font-sans text-[15px] text-[#1c201a] antialiased selection:bg-[#bcd5ff] selection:text-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* NAVBAR */}
      <Navbar />

      {/* HERO & CONTENT SECTION */}
      <section className="relative overflow-hidden pb-20 pt-3 sm:pb-24 sm:pt-6">
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

          {/* PAGE HEADER */}
          <div className="pb-2 pt-2 text-center sm:pb-4 sm:pt-6">
            <div style={{ color: "#3158d5", letterSpacing: "0.18em", fontSize: "12px", fontWeight: 700 }} className="mb-3 inline-flex items-center uppercase sm:mb-4">
              Help Center
            </div>
            <h1 className="mx-auto max-w-5xl text-center text-[34px] font-black leading-[1.12] tracking-[-0.035em] text-[#1c201a] sm:text-[56px] md:text-[64px] lg:text-[72px]">
              Frequently Asked Questions
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-[#70746d] sm:text-base">
              Quick answers about file formats, privacy, and how Spellense works.
            </p>
          </div>

          {/* FAQ ITEMS LIST */}
          <div className="mt-8 space-y-3 sm:mt-10 sm:space-y-4">
            {faqItems.map((item, index) => (
              <div
                key={item.question}
                style={{ borderColor: "#e5e5df" }}
                className="group rounded-2xl border bg-white p-5 shadow-2xs transition-all duration-200 hover:border-[#3158d5]/40 hover:shadow-xs sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span style={{ backgroundColor: "#efeee7", color: "#3158d5" }} className="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider">
                        {item.category}
                      </span>
                      <span className="text-xs text-[#92958f]">Q{index + 1}</span>
                    </div>
                    <h2 className="mt-2.5 text-lg font-bold text-[#1c201a] sm:text-xl">
                      {item.question}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-[#70746d] sm:text-[15px]">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* BOTTOM QUICK CALLOUT */}
          <div style={{ borderColor: "#e5e5df", backgroundColor: "#efeee7" }} className="mt-10 rounded-[24px] border p-6 text-center shadow-2xs sm:flex sm:items-center sm:justify-between sm:p-8 sm:text-left">
            <div>
              <h3 className="text-base font-bold text-[#1c201a]">Have a document to check right now?</h3>
              <p className="mt-1 text-xs text-[#70746d]">Upload your file and receive instant OCR spelling results.</p>
            </div>
            <Link
              href="/"
              style={{ backgroundColor: "#3158d5", color: "#ffffff" }}
              className="mt-4 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-xs font-bold text-white shadow-xs shadow-[#3158d5]/20 transition hover:-translate-y-0.5 hover:opacity-90 sm:mt-0"
            >
              <span>Check your file now</span>
              <span>→</span>
            </Link>
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <Footer currentPath="/faq" />

    </main>
  );
}
