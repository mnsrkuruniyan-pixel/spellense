"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { convertDialect } from "./dialectRules";

const US_SAMPLE = `The company decided to prioritize color harmony in the new theater design. Our team analyzed the customer feedback while traveling across three cities to finalize the modern center layout. We also noticed that the elevator in the apartment building needed an urgent check, and we stopped for coffee and a cookie on the sidewalk.`;

const UK_SAMPLE = `The company decided to prioritise colour harmony in the new theatre design. Our team analysed the customer feedback while travelling across three cities to finalise the modern centre layout. We also noticed that the lift in the flat needed an urgent cheque, and we stopped for coffee and a biscuit on the pavement.`;

export default function UsUkConverterClient() {
  const [direction, setDirection] = useState<"us-to-uk" | "uk-to-us">("us-to-uk");
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);

  // Conversion result
  const result = useMemo(() => {
    return convertDialect(input, direction);
  }, [input, direction]);

  const toggleDirection = () => {
    // If there is existing converted text, flip and use it as input
    if (result.text && result.changeCount > 0) {
      setInput(result.text);
    }
    setDirection((prev) => (prev === "us-to-uk" ? "uk-to-us" : "us-to-uk"));
  };

  const loadSample = () => {
    setInput(direction === "us-to-uk" ? US_SAMPLE : UK_SAMPLE);
  };

  const handleCopy = async () => {
    if (!result.text) return;
    try {
      await navigator.clipboard.writeText(result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = result.text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!result.text) return;
    const blob = new Blob([result.text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = direction === "us-to-uk" ? "converted-uk-english.txt" : "converted-us-english.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  // Distinct transformed pairs for badges
  const uniqueChanges = useMemo(() => {
    const seen = new Set<string>();
    const list: { original: string; converted: string }[] = [];
    for (const ch of result.changes) {
      const key = `${ch.original.toLowerCase()}->${ch.converted.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({ original: ch.original, converted: ch.converted });
      }
    }
    return list;
  }, [result.changes]);

  return (
    <main className="min-h-screen bg-[#f0f6fe] text-black">
      {/* NAVBAR */}
      <Navbar />

      {/* HERO & TOOL SECTION */}
      <section className="relative overflow-hidden pb-20 pt-8 sm:pt-12">
        {/* Ambient background glows */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[560px] w-[920px] rounded-full bg-gradient-to-tr from-blue-400/20 via-indigo-400/20 to-purple-400/15 blur-[120px] opacity-80 animate-pulse-glow" />
        <div className="pointer-events-none absolute top-40 -left-28 h-[400px] w-[400px] rounded-full bg-blue-200/40 blur-[100px]" />
        <div className="pointer-events-none absolute top-36 -right-28 h-[420px] w-[420px] rounded-full bg-indigo-200/40 blur-[110px]" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* HEADER */}
          <div className="text-center pt-2 pb-2 sm:pt-4 sm:pb-4">
            <h1 className="text-[17px] xs:text-[21px] sm:text-[28px] md:text-[36px] lg:text-[42px] xl:text-[48px] font-extrabold leading-tight tracking-tight text-black text-center whitespace-nowrap">
              US ↔ UK English Converter
            </h1>
          </div>

          {/* DIRECTION SELECTOR SWITCH */}
          <div className="mt-8 flex items-center justify-center">
            <div className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200/90 bg-white/90 p-1.5 shadow-sm backdrop-blur-md">
              <button
                type="button"
                onClick={() => setDirection("us-to-uk")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                  direction === "us-to-uk"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
                }`}
              >
                <span>🇺🇸 American (US)</span>
                <span className="text-slate-300">→</span>
                <span>🇬🇧 British (UK)</span>
              </button>

              <button
                type="button"
                onClick={toggleDirection}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                title="Swap conversion direction"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="17 1 21 5 17 9" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <polyline points="7 23 3 19 7 15" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => setDirection("uk-to-us")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                  direction === "uk-to-us"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
                }`}
              >
                <span>🇬🇧 British (UK)</span>
                <span className="text-slate-300">→</span>
                <span>🇺🇸 American (US)</span>
              </button>
            </div>
          </div>

          {/* TWO-PANE CONVERTER WORKSPACE */}
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* INPUT PANE */}
            <div className="flex flex-col rounded-3xl border border-white/90 bg-white/85 p-5 shadow-xl shadow-blue-500/5 backdrop-blur-xl">
              {/* Toolbar */}
              <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                    {direction === "us-to-uk" ? "🇺🇸 American English (Input)" : "🇬🇧 British English (Input)"}
                  </span>
                  <button
                    type="button"
                    onClick={loadSample}
                    className="rounded-lg border border-slate-200/80 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-blue-600 cursor-pointer"
                  >
                    Sample
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const clipText = await navigator.clipboard.readText();
                        if (clipText) setInput(clipText);
                      } catch {}
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 cursor-pointer"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                    </svg>
                    Paste
                  </button>
                  <button
                    type="button"
                    onClick={() => setInput("")}
                    disabled={!input}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Textarea */}
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={11}
                placeholder={`Type or paste ${direction === "us-to-uk" ? "American (US)" : "British (UK)"} text here...`}
                className="w-full flex-1 rounded-2xl border border-slate-200/90 bg-white/70 p-4 text-[14px] leading-relaxed text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />

              <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                <span>{input.trim() ? input.trim().split(/\s+/).length : 0} words</span>
                <span>{input.length} characters</span>
              </div>
            </div>

            {/* OUTPUT PANE */}
            <div className="flex flex-col rounded-3xl border border-white/90 bg-white/85 p-5 shadow-xl shadow-blue-500/5 backdrop-blur-xl">
              {/* Toolbar */}
              <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    {direction === "us-to-uk" ? "🇬🇧 British English (Output)" : "🇺🇸 American English (Output)"}
                  </span>
                  {result.changeCount > 0 && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                      {result.changeCount} {result.changeCount === 1 ? "word" : "words"} changed
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopy}
                    disabled={!result.text}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition shadow-xs cursor-pointer ${
                      copied
                        ? "bg-emerald-600 text-white"
                        : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    }`}
                  >
                    {copied ? (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={!result.text}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                    title="Download output file"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    .txt
                  </button>
                </div>
              </div>

              {/* Textarea Output */}
              <textarea
                value={result.text}
                readOnly
                rows={11}
                placeholder="Converted text will appear here in real-time..."
                className="w-full flex-1 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 text-[14px] leading-relaxed text-slate-800 outline-none"
              />

              <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                <span>{result.text.trim() ? result.text.trim().split(/\s+/).length : 0} words</span>
                <span>{result.text.length} characters</span>
              </div>
            </div>
          </div>

          {/* TRANSFORMED WORDS PILL BADGES */}
          {uniqueChanges.length > 0 && (
            <div className="mt-5 rounded-2xl border border-blue-200/80 bg-white/90 p-4 shadow-xs backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Detected Transformations:
                </span>
                <span className="text-xs text-slate-400">
                  ({uniqueChanges.length} unique terms)
                </span>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {uniqueChanges.map((item, idx) => (
                  <span
                    key={`${item.original}-${idx}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-blue-100 bg-blue-50/70 px-2.5 py-1 text-xs font-medium text-slate-700"
                  >
                    <span className="text-slate-500 line-through decoration-rose-400">{item.original}</span>
                    <span className="text-blue-500 font-bold">→</span>
                    <span className="font-bold text-blue-700">{item.converted}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* CROSS-PROMO CTA */}
          <div className="mt-8 rounded-3xl border border-blue-200/80 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-white p-6 sm:p-7 shadow-xs backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-md bg-blue-100/80 px-2 py-0.5 text-[11px] font-bold text-blue-700 uppercase tracking-wide">
                Visual OCR Spell Checker
              </div>
              <h3 className="mt-1.5 text-base sm:text-lg font-bold text-slate-900">
                Check banners, presentations, contracts, and PDFs
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Upload graphics or office docs to highlight spelling mistakes right over the visual layout.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-6 py-3 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-600/35 shrink-0"
            >
              <span>Scan File with Spellense</span>
              <span>→</span>
            </Link>
          </div>

          {/* EDUCATIONAL GUIDE SECTION */}
          <div className="mt-14 space-y-6">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Key Differences Between American &amp; British English
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
                American and British spelling divergence was largely popularized by lexicographer Noah Webster in 1828 to simplify English spelling phonetically.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-xs backdrop-blur-sm">
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wide">1. -or vs. -our</div>
                <h3 className="mt-1 text-base font-bold text-slate-900">Color ↔ Colour</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  American English drops the &apos;u&apos; from Latinate words ending in <code className="font-mono text-blue-600">-our</code>.
                </p>
                <div className="mt-3 rounded-lg bg-slate-50 p-2 text-xs font-mono text-slate-700">
                  US: honor, labor, harbor<br />
                  UK: honour, labour, harbour
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-xs backdrop-blur-sm">
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wide">2. -ize vs. -ise</div>
                <h3 className="mt-1 text-base font-bold text-slate-900">Organize ↔ Organise</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  US English uses <code className="font-mono text-blue-600">-ize</code> exclusively, whereas British English traditionally favors <code className="font-mono text-blue-600">-ise</code> for verbs derived from Greek.
                </p>
                <div className="mt-3 rounded-lg bg-slate-50 p-2 text-xs font-mono text-slate-700">
                  US: realize, prioritize, analyze<br />
                  UK: realise, prioritise, analyse
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-xs backdrop-blur-sm">
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wide">3. -er vs. -re</div>
                <h3 className="mt-1 text-base font-bold text-slate-900">Center ↔ Centre</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  Words borrowed from French ending in <code className="font-mono text-blue-600">-re</code> were phoneticized in US English to end in <code className="font-mono text-blue-600">-er</code>.
                </p>
                <div className="mt-3 rounded-lg bg-slate-50 p-2 text-xs font-mono text-slate-700">
                  US: theater, meter, fiber<br />
                  UK: theatre, metre, fibre
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-xs backdrop-blur-sm">
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wide">4. -ense vs. -ence</div>
                <h3 className="mt-1 text-base font-bold text-slate-900">Defense ↔ Defence</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  US English spells noun forms with an &apos;s&apos; (<code className="font-mono text-blue-600">defense</code>, <code className="font-mono text-blue-600">offense</code>), while British English preserves the &apos;c&apos;.
                </p>
                <div className="mt-3 rounded-lg bg-slate-50 p-2 text-xs font-mono text-slate-700">
                  US: license, pretense<br />
                  UK: licence, pretence
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-xs backdrop-blur-sm">
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wide">5. Single vs. Double &apos;L&apos;</div>
                <h3 className="mt-1 text-base font-bold text-slate-900">Traveled ↔ Travelled</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  When adding suffixes to verbs ending in a single &apos;l&apos;, British English doubles the &apos;l&apos; regardless of stress, whereas American English keeps a single &apos;l&apos; unless stressed.
                </p>
                <div className="mt-3 rounded-lg bg-slate-50 p-2 text-xs font-mono text-slate-700">
                  US: canceling, signaling<br />
                  UK: cancelling, signalling
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-xs backdrop-blur-sm">
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wide">6. Everyday Vocabulary</div>
                <h3 className="mt-1 text-base font-bold text-slate-900">Apartment ↔ Flat</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  Entirely different words are used for common objects, transport, food, and clothing between American and British dialects.
                </p>
                <div className="mt-3 rounded-lg bg-slate-50 p-2 text-xs font-mono text-slate-700">
                  US: elevator, cookie, trunk, sidewalk<br />
                  UK: lift, biscuit, boot, pavement
                </div>
              </div>
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
                Simple English spell checking and text tools.
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
              <Link href="/us-uk-converter" className="font-semibold text-blue-600">
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

