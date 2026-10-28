import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with the Spellense team for questions, feedback, or support.",
  alternates: { canonical: "/contact" },
  openGraph: {
    siteName: "Spellense",
    title: "Contact Spellense",
    description:
      "Get in touch with the Spellense team for questions, feedback, or support.",
    url: "/contact",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Contact Spellense",
      },
    ],
  },
};

export default function ContactPage() {
  return (
    <main
      id="main-content"
      style={{ backgroundColor: "#faf9f6" }}
      className="relative z-10 min-h-screen bg-[#faf9f6] font-sans text-[15px] text-[#1c201a] antialiased selection:bg-[#bcd5ff] selection:text-black"
    >
      <Navbar />

      <section className="relative px-4 pb-20 pt-3 sm:px-6 sm:pb-24 sm:pt-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <header className="mx-auto max-w-4xl pb-2 pt-2 text-center sm:pt-6">
            <div
              style={{
                color: "#3158d5",
                letterSpacing: "0.18em",
                fontSize: "12px",
                fontWeight: 700,
              }}
              className="mb-3 inline-flex items-center uppercase sm:mb-4"
            >
              Get in Touch
            </div>
            <h1 className="mx-auto flex flex-col items-center text-center text-[34px] font-black leading-[1.12] tracking-[-0.035em] text-[#1c201a] sm:text-[56px] md:text-[64px] lg:text-[72px]">
              <span>Let&apos;s talk.</span>
              <span
                style={{
                  fontFamily:
                    "'ITC Modern No. 216', var(--font-itc-modern), 'Instrument Serif', Georgia, serif",
                  fontSize: "clamp(38px, 4.8vw, 64px)",
                  fontWeight: 400,
                  fontStyle: "italic",
                  lineHeight: 1.05,
                  letterSpacing: "-0.01em",
                  display: "block",
                  marginTop: "6px",
                }}
                className="text-[#1c201a]"
              >
                We&apos;re listening.
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-[#70746d] sm:text-base">
              Questions, feedback, or ideas? Send a note to our team and we&apos;ll
              be glad to hear from you.
            </p>
          </header>

          <div className="mx-auto mt-8 grid max-w-4xl gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-5">
            <section
              style={{ borderColor: "#e5e5df" }}
              className="rounded-[24px] border bg-white p-6 shadow-2xs sm:p-8"
            >
              <div
                style={{ backgroundColor: "#efeee7", color: "#3158d5" }}
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                aria-hidden="true"
              >
                <svg
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 7 9 6 9-6" />
                </svg>
              </div>
              <h2 className="mt-5 text-xl font-bold text-[#1c201a]">
                Email our team
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#70746d]">
                For support, feedback, or anything else, write to us directly.
              </p>
              <a
                href="mailto:hello@spellense.com"
                style={{ backgroundColor: "#3158d5", color: "#ffffff" }}
                className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-bold shadow-xs shadow-[#3158d5]/20 transition hover:-translate-y-0.5 hover:opacity-90"
              >
                hello@spellense.com <span aria-hidden="true">→</span>
              </a>
            </section>

            <section
              style={{ borderColor: "#e5e5df", backgroundColor: "#efeee7" }}
              className="rounded-[24px] border p-6 shadow-2xs sm:p-8"
            >
              <div
                style={{ backgroundColor: "#ffffff", color: "#3158d5" }}
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                aria-hidden="true"
              >
                <svg
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M9.6 9a2.5 2.5 0 1 1 4.1 1.9c-1.1.9-1.7 1.3-1.7 2.6" />
                  <path d="M12 17h.01" />
                </svg>
              </div>
              <h2 className="mt-5 text-xl font-bold text-[#1c201a]">
                Looking for an answer?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#70746d]">
                Our FAQ covers supported files, privacy, and how Spellense
                checks your designs.
              </p>
              <Link
                href="/faq"
                className="mt-5 inline-flex items-center gap-2 rounded-xl border bg-white px-5 py-3 text-xs font-bold text-[#3158d5] shadow-2xs transition hover:border-[#3158d5]"
                style={{ borderColor: "#e5e5df" }}
              >
                Visit the FAQ <span aria-hidden="true">→</span>
              </Link>
            </section>
          </div>
        </div>
      </section>

      <Footer currentPath="/contact" />
    </main>
  );
}
