"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import { convertDialect } from "./dialectRules";
import { POPULAR_WORD_PAIRS, WordPair } from "./lookupData";

const SAMPLES = {
  general: {
    label: "Everyday Life",
    us: "The elevator in our apartment building broke down, so we took the stairs to the sidewalk. We stopped by the bakery for coffee and a cookie, then grabbed some french fries on our way to the subway.",
    uk: "The lift in our flat building broke down, so we took the stairs to the pavement. We stopped by the bakery for coffee and a biscuit, then grabbed some chips on our way to the underground.",
  },
  academic: {
    label: "Academic & Research",
    us: "The laboratory analyzed the behavioral responses of participants under varying lighting conditions. The specialized research center prioritized color perception and measured cognitive response times across multiple meters of distance.",
    uk: "The laboratory analysed the behavioural responses of participants under varying lighting conditions. The specialised research centre prioritised colour perception and measured cognitive response times across multiple metres of distance.",
  },
  business: {
    label: "Business & Corporate",
    us: "Our organization prioritized customer satisfaction while traveling across domestic harbors. Management honored the quarterly contract deadline and optimized the defense budget with favorable terms.",
    uk: "Our organisation prioritised customer satisfaction while travelling across domestic harbours. Management honoured the quarterly contract deadline and optimised the defence budget with favourable terms.",
  },
};

const FAQ_ITEMS = [
  {
    q: "How do I translate American English into British English?",
    a: "Simply paste or type your American (US) text into the input pane. The translator automatically detects American spellings (such as color, realize, center) and vocabulary (such as elevator, sidewalk) and translates them into standard British (UK) English in real-time.",
  },
  {
    q: "What are the biggest differences in UK English spelling?",
    a: "The primary differences include -our endings (flavour, honour), -ise verbs (organise, prioritise), -re endings (theatre, metre), and doubled consonants in inflected verbs (travelled, cancelling).",
  },
  {
    q: "Is -ize or -ise correct in British English?",
    a: "Both are technically acceptable in British English. The Oxford University Press (OUP) favors the -ize spelling (known as Oxford spelling) because of its ancient Greek etymology. However, modern British usage, government publications, and UK news outlets (such as the BBC and The Guardian) predominantly use the -ise form.",
  },
  {
    q: "Is this US to UK English translator free and private?",
    a: "Yes, 100% free with unlimited conversions. All translation and rule mapping occurs entirely in your local browser memory. Your text, articles, and assignments are never stored on any server.",
  },
];

export default function UsUkConverterClient() {
  const [direction, setDirection] = useState<"us-to-uk" | "uk-to-us">("us-to-uk");
  const [input, setInput] = useState("");
  const [outputViewMode, setOutputViewMode] = useState<"plain" | "diff">("plain");
  const [copied, setCopied] = useState(false);
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupCategory, setLookupCategory] = useState<string>("All");
  const [copiedWordIdx, setCopiedWordIdx] = useState<number | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Conversion result
  const result = useMemo(() => {
    return convertDialect(input, direction);
  }, [input, direction]);

  const toggleDirection = () => {
    if (result.text && result.changeCount > 0) {
      setInput(result.text);
    }
    setDirection((prev) => (prev === "us-to-uk" ? "uk-to-us" : "us-to-uk"));
  };

  const loadPreset = (key: keyof typeof SAMPLES) => {
    setInput(direction === "us-to-uk" ? SAMPLES[key].us : SAMPLES[key].uk);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        setInput(content);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
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
    link.download = direction === "us-to-uk" ? "translated-uk-english.txt" : "translated-us-english.txt";
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

  // Lookup filtering
  const filteredWords = useMemo(() => {
    const q = lookupQuery.trim().toLowerCase();
    return POPULAR_WORD_PAIRS.filter((item) => {
      const matchesCategory = lookupCategory === "All" || item.category === lookupCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        item.us.toLowerCase().includes(q) ||
        item.uk.toLowerCase().includes(q) ||
        (item.note && item.note.toLowerCase().includes(q))
      );
    });
  }, [lookupQuery, lookupCategory]);

  const copyWordPair = async (item: WordPair, idx: number) => {
    const textToCopy = direction === "us-to-uk" ? item.uk : item.us;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedWordIdx(idx);
      setTimeout(() => setCopiedWordIdx(null), 1500);
    } catch {}
  };

  const insertWordToInput = (word: string) => {
    setInput((prev) => (prev ? `${prev} ${word}` : word));
  };

  // Render Highlighted Diff view
  const renderHighlightedDiff = () => {
    if (!result.text) {
      return (
        <div className="flex h-full min-h-[220px] items-center justify-center text-xs text-[#8e928a]">
          Converted text with highlighted changes will appear here...
        </div>
      );
    }
    if (result.changes.length === 0) {
      return (
        <div className="min-h-[220px] whitespace-pre-wrap leading-relaxed text-[14px] text-[#1c201a]">
          {result.text}
          <div className="mt-4 rounded-xl border border-[#e5e5df] bg-[#faf9f6] p-3 text-xs text-[#70746d]">
            ℹ️ No dialect-specific words or spelling variations were detected in your text.
          </div>
        </div>
      );
    }

    const changesMap = new Map<string, string>();
    for (const ch of result.changes) {
      changesMap.set(ch.converted.toLowerCase(), ch.original);
    }

    const tokens = result.text.split(/(\b[\w'-]+\b)/);

    return (
      <div className="min-h-[220px] whitespace-pre-wrap leading-relaxed text-[14px] text-[#1c201a]">
        {tokens.map((token, i) => {
          const lower = token.toLowerCase();
          const orig = changesMap.get(lower);
          if (orig) {
            return (
              <span
                key={i}
                className="group relative inline-flex items-center rounded-lg border border-[#bcd5ff] bg-[#f0f5ff] px-1.5 py-0.5 text-[#3158d5] font-bold shadow-2xs mx-0.5 transition hover:bg-[#e0edff] cursor-help"
                title={`Original: "${orig}"`}
              >
                <span>{token}</span>
                <span className="hidden sm:inline-block ml-1 text-[11px] font-normal text-[#70746d] line-through">
                  ({orig})
                </span>
              </span>
            );
          }
          return <span key={i}>{token}</span>;
        })}
      </div>
    );
  };

  return (
    <div
      style={{ backgroundColor: "#faf9f6" }}
      className="flex min-h-screen flex-col bg-[#faf9f6] font-sans text-slate-800 antialiased selection:bg-[#bcd5ff] selection:text-black relative z-10 text-[15px]"
    >
      <style>{`
        @media (max-width: 639px) {
          .usuk-mobile { display: flex !important; }
          .usuk-desktop { display: none !important; }
        }
        @media (min-width: 640px) {
          .usuk-mobile { display: none !important; }
          .usuk-desktop { display: flex !important; }
        }
      `}</style>
      {/* NAVBAR */}
      <Navbar onUploadClick={() => fileInputRef.current?.click()} />

      <main id="main-content" className="flex-1 pb-16 sm:pb-24">
        {/* HERO TITLE — EXACT HOMEPAGE TYPOGRAPHY MATCH */}
        <section className="relative overflow-hidden pt-3 sm:pt-6 pb-2">
          <div className="relative mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl text-center pt-2 sm:pt-4 pb-2">
              {/* EYEBROW */}
              <div
                style={{
                  color: "#3158d5",
                  letterSpacing: "0.18em",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
                className="inline-flex items-center uppercase mb-3 sm:mb-4"
              >
                US &amp; UK ENGLISH CONVERTER
              </div>

              {/* TWO-PART EXPRESSIVE HEADING */}
              <h1
                aria-live="polite"
                className="text-center tracking-tight text-[#1c201a] flex flex-col items-center justify-center"
                style={{ margin: "0 auto" }}
              >
                <span
                  style={{
                    fontSize: "clamp(44px, 5.8vw, 72px)",
                    fontWeight: 900,
                    lineHeight: 1.04,
                    letterSpacing: "-0.035em",
                    color: "#1c201a",
                    display: "block",
                    fontFamily:
                      "var(--font-plus-jakarta-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  }}
                >
                  Two dialects.
                </span>
                <span
                  style={{
                    fontFamily:
                      "'ITC Modern No. 216', var(--font-itc-modern), 'Instrument Serif', Georgia, serif",
                    fontSize: "clamp(38px, 4.8vw, 64px)",
                    fontWeight: 400,
                    fontStyle: "italic",
                    lineHeight: 1.05,
                    letterSpacing: "-0.01em",
                    color: "#1c201a",
                    display: "block",
                    marginTop: "6px",
                  }}
                >
                  Flawlessly aligned.
                </span>
              </h1>

              {/* SUBTITLE */}
              <p
                style={{
                  color: "#70746d",
                  fontSize: "16px",
                  lineHeight: 1.55,
                  maxWidth: "540px",
                  margin: "18px auto 0",
                }}
                className="text-center font-normal"
              >
                Translate spelling, vocabulary, and phrases between American and British English instantly in your browser with zero data retention.
              </p>
            </div>
          </div>
        </section>

        {/* WORKSPACE SECTION */}
        <section className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 pb-16 mt-3 sm:mt-5">
          {/* DIRECTION SELECTOR SWITCH */}
          <div className="mb-6 flex items-center justify-center">
            <div
              style={{
                backgroundColor: "#ffffff",
                borderColor: "#e5e5df",
                borderWidth: "1px",
                borderStyle: "solid",
              }}
              className="inline-flex items-center gap-1.5 rounded-2xl p-1.5 shadow-2xs"
            >
              <button
                type="button"
                onClick={() => setDirection("us-to-uk")}
                style={
                  direction === "us-to-uk"
                    ? {
                        backgroundColor: "#3158d5",
                        borderColor: "#3158d5",
                        color: "#ffffff",
                      }
                    : {
                        backgroundColor: "transparent",
                        borderColor: "transparent",
                        color: "#1c201a",
                      }
                }
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer hover:opacity-95"
              >
                <span>🇺🇸 American (US)</span>
                <span className={direction === "us-to-uk" ? "text-blue-100" : "text-[#8e928a]"}>→</span>
                <span>🇬🇧 British (UK)</span>
              </button>

              <button
                type="button"
                onClick={toggleDirection}
                style={{
                  color: "#8e928a",
                }}
                className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-[#f0f5ff] hover:text-[#3158d5] transition cursor-pointer"
                title="Swap translation direction"
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
                style={
                  direction === "uk-to-us"
                    ? {
                        backgroundColor: "#3158d5",
                        borderColor: "#3158d5",
                        color: "#ffffff",
                      }
                    : {
                        backgroundColor: "transparent",
                        borderColor: "transparent",
                        color: "#1c201a",
                      }
                }
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer hover:opacity-95"
              >
                <span>🇬🇧 British (UK)</span>
                <span className={direction === "uk-to-us" ? "text-blue-100" : "text-[#8e928a]"}>→</span>
                <span>🇺🇸 American (US)</span>
              </button>
            </div>
          </div>

          {/* TWO-PANE WORKSPACE */}
          <div className="grid gap-5 lg:grid-cols-2">
            {/* INPUT PANE */}
            <div
              style={{
                borderColor: "#e5e5df",
                borderWidth: "1px",
                borderStyle: "solid",
                backgroundColor: "#ffffff",
              }}
              className="flex flex-col rounded-2xl sm:rounded-[24px] overflow-hidden shadow-xs"
            >
              {/* Hidden File Input for .txt */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,text/plain"
                className="hidden"
                onChange={handleFileUpload}
              />

              {/* Toolbar */}
              <div
                style={{
                  borderBottom: "1px solid #e5e5df",
                  backgroundColor: "#faf9f6",
                }}
                className="flex items-center justify-between gap-2 px-3.5 sm:px-5 py-2.5 sm:py-3.5 overflow-x-auto sm:overflow-x-visible no-scrollbar"
              >
                <div
                  style={{ transform: "translateX(-6px)" }}
                  className="flex items-center gap-2 shrink-0"
                >
                  <span className="w-2 h-2 rounded-full bg-[#3158d5] shrink-0" />
                  <span className="text-xs font-bold text-[#1c201a] whitespace-nowrap">
                    {direction === "us-to-uk" ? "🇺🇸 American English (Input)" : "🇬🇧 British English (Input)"}
                  </span>
                </div>

                {/* MOBILE ONLY: Top right action buttons */}
                <div
                  style={{ marginRight: "4px", transform: "translateX(-4px)" }}
                  className="usuk-mobile converter-mobile-input-actions items-center gap-1 ml-auto shrink-0"
                >
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ height: "34px", minHeight: "34px", borderColor: "#dfe2d8", backgroundColor: "#ffffff", color: "#1c201a" }}
                      className="inline-flex items-center justify-center gap-0.5 rounded-lg border px-1.5 text-[11px] font-bold whitespace-nowrap shadow-xs cursor-pointer"
                    >
                      <span>Upload .txt</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const clipText = await navigator.clipboard.readText();
                          if (clipText) setInput(clipText);
                        } catch {}
                      }}
                      style={{ height: "34px", minHeight: "34px", borderColor: "#dfe2d8", backgroundColor: "#ffffff", color: "#1c201a" }}
                      className="inline-flex items-center justify-center gap-0.5 rounded-lg border px-1.5 text-[11px] font-bold whitespace-nowrap shadow-xs cursor-pointer"
                    >
                      <span>Paste</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInput("")}
                      disabled={!input}
                      style={{ height: "34px", minHeight: "34px", borderColor: "transparent", backgroundColor: "#ffffff", color: "#b85a46" }}
                      className="inline-flex items-center justify-center rounded-lg border px-1.5 text-[11px] font-bold whitespace-nowrap disabled:opacity-40 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>

                {/* DESKTOP ONLY: Top right action buttons */}
                <div className="usuk-desktop items-center gap-1.5 shrink-0 ml-auto">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      color: "#1c201a",
                    }}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow-2xs transition hover:bg-[#f0f5ff] hover:text-[#3158d5] hover:border-[#b8d1fc] cursor-pointer"
                    title="Upload .txt document"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span>Upload .txt</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const clipText = await navigator.clipboard.readText();
                        if (clipText) setInput(clipText);
                      } catch {}
                    }}
                    style={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      color: "#1c201a",
                    }}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow-2xs transition hover:bg-[#f0f5ff] hover:text-[#3158d5] hover:border-[#b8d1fc] cursor-pointer"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                    </svg>
                    <span>Paste</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInput("")}
                    disabled={!input}
                    style={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      color: "#b85a46",
                    }}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow-2xs transition hover:bg-rose-50 disabled:opacity-40 cursor-pointer"
                  >
                    <span>Clear</span>
                  </button>
                </div>
              </div>

              {/* Textarea Input */}
              <div className="p-5 flex-1 flex flex-col">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={10}
                  placeholder={`Type or paste ${direction === "us-to-uk" ? "American (US)" : "British (UK)"} text here to translate...`}
                  style={{
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    backgroundColor: "#fdfcf9",
                    color: "#1c201a",
                  }}
                  className="w-full flex-1 rounded-2xl p-4 text-[14px] leading-relaxed outline-none transition focus:border-[#3158d5] focus:bg-white focus:ring-2 focus:ring-[#3158d5]/15 font-mono sm:font-sans resize-y min-h-[220px]"
                />

                {/* DESKTOP ONLY: Presets Bar (Exact original design) */}
                <div
                  style={{ borderTop: "1px solid #e5e5df" }}
                  className="usuk-desktop mt-3.5 flex-wrap items-center justify-between gap-2 pt-3"
                >
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#70746d]">
                    <span className="font-bold text-[#8e928a] uppercase text-[10px] tracking-wider mr-1">Try Sample:</span>
                    {(Object.keys(SAMPLES) as (keyof typeof SAMPLES)[]).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => loadPreset(key)}
                        style={{
                          backgroundColor: "#faf9f6",
                          borderColor: "#e5e5df",
                          borderWidth: "1px",
                          borderStyle: "solid",
                          color: "#1c201a",
                        }}
                        className="rounded-lg px-2.5 py-1 text-xs font-semibold transition hover:bg-[#f0f5ff] hover:border-[#b8d1fc] hover:text-[#3158d5] cursor-pointer shadow-2xs"
                      >
                        {SAMPLES[key].label}
                      </button>
                    ))}
                  </div>

                  <div className="text-[11px] text-[#8e928a] font-medium">
                    <span>{input.trim() ? input.trim().split(/\s+/).length : 0} words • {input.length} chars</span>
                  </div>
                </div>

                {/* MOBILE ONLY: Presets & Action Buttons */}
                <div className="converter-mobile-presets usuk-mobile items-center justify-between gap-2 w-full mt-2.5 pt-2.5">
                  <div className="flex items-center gap-1.5 text-xs text-[#70746d]">
                    <span className="font-bold text-[#8e928a] uppercase text-[10px] tracking-wider mr-1">Try Sample:</span>
                    <button
                      type="button"
                      onClick={() => loadPreset("general")}
                      style={{
                        backgroundColor: "#faf9f6",
                        borderColor: "#e5e5df",
                        borderWidth: "1px",
                        borderStyle: "solid",
                        color: "#1c201a",
                      }}
                      className="rounded-lg px-2.5 py-1 text-xs font-semibold transition hover:bg-[#f0f5ff] hover:border-[#b8d1fc] hover:text-[#3158d5] cursor-pointer shadow-2xs"
                    >
                      {SAMPLES.general.label}
                    </button>
                  </div>
                  <div className="text-[11px] text-[#8e928a] font-medium ml-auto">
                    <span>{input.trim() ? input.trim().split(/\s+/).length : 0} words • {input.length} chars</span>
                  </div>
                </div>
              </div>
            </div>

            {/* OUTPUT PANE */}
            <div
              style={{
                borderColor: "#e5e5df",
                borderWidth: "1px",
                borderStyle: "solid",
                backgroundColor: "#ffffff",
              }}
              className="flex flex-col rounded-2xl sm:rounded-[24px] overflow-hidden shadow-xs"
            >
              {/* Toolbar */}
              <div
                style={{
                  borderBottom: "1px solid #e5e5df",
                  backgroundColor: "#faf9f6",
                }}
                className="flex items-center justify-between gap-2 px-3.5 sm:px-5 py-2.5 sm:py-3.5 overflow-x-auto sm:overflow-x-visible no-scrollbar"
              >
                <div
                  style={{ transform: "translateX(-6px)" }}
                  className="flex items-center gap-1.5 sm:gap-2 shrink-0"
                >
                  <span className="w-2 h-2 rounded-full bg-[#10b981] shrink-0" />
                  <span className="text-xs font-bold text-[#1c201a] whitespace-nowrap">
                    {direction === "us-to-uk" ? "🇬🇧 British English (Output)" : "🇺🇸 American English (Output)"}
                  </span>
                  {result.changeCount > 0 && (
                    <span
                      style={{
                        backgroundColor: "#f0f5ff",
                        borderColor: "#bcd5ff",
                        borderWidth: "1px",
                        borderStyle: "solid",
                        color: "#3158d5",
                      }}
                      className="rounded-full px-2 py-0.5 text-[10px] sm:text-[11px] font-bold whitespace-nowrap"
                    >
                      {result.changeCount} {result.changeCount === 1 ? "word" : "words"} translated
                    </span>
                  )}
                </div>

                {/* DESKTOP ONLY: Top right action buttons */}
                <div className="usuk-desktop items-center gap-1 sm:gap-1.5 shrink-0 ml-auto">
                  {/* View Mode Toggle: Plain vs Diff */}
                  <div
                    style={{
                      backgroundColor: "#efeee7",
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                    }}
                    className="inline-flex rounded-lg p-0.5 text-xs shrink-0"
                  >
                    <button
                      type="button"
                      onClick={() => setOutputViewMode("plain")}
                      style={{
                        backgroundColor: outputViewMode === "plain" ? "#ffffff" : "transparent",
                        color: outputViewMode === "plain" ? "#1c201a" : "#70746d",
                        boxShadow: outputViewMode === "plain" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                      }}
                      className="rounded-md px-2 sm:px-2.5 py-1 text-xs font-bold transition cursor-pointer whitespace-nowrap"
                    >
                      Plain
                    </button>
                    <button
                      type="button"
                      onClick={() => setOutputViewMode("diff")}
                      style={{
                        backgroundColor: outputViewMode === "diff" ? "#ffffff" : "transparent",
                        color: outputViewMode === "diff" ? "#3158d5" : "#70746d",
                        boxShadow: outputViewMode === "diff" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                      }}
                      className="flex items-center gap-1 rounded-md px-2 sm:px-2.5 py-1 text-xs font-bold transition cursor-pointer whitespace-nowrap"
                    >
                      <span>Highlight Diff</span>
                      {result.changeCount > 0 && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#3158d5]" />
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopy}
                    disabled={!result.text}
                    style={{
                      backgroundColor: copied ? "#059669" : "#3158d5",
                      borderColor: copied ? "#059669" : "#3158d5",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      color: "#ffffff",
                    }}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow-2xs transition hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {copied ? (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={!result.text}
                    style={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      color: "#1c201a",
                    }}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow-2xs transition hover:bg-[#f0f5ff] hover:text-[#3158d5] hover:border-[#b8d1fc] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap shrink-0"
                    title="Download output as .txt"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span>.txt</span>
                  </button>
                </div>
              </div>

              {/* Output Content: Textarea or Highlighted Diff */}
              <div className="p-5 flex-1 flex flex-col">
                {outputViewMode === "plain" ? (
                  <textarea
                    value={result.text}
                    readOnly
                    rows={10}
                    placeholder="Translated text will appear here in real-time..."
                    style={{
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      backgroundColor: "#fdfcf9",
                      color: "#1c201a",
                    }}
                    className="w-full flex-1 rounded-2xl p-4 text-[14px] leading-relaxed outline-none font-mono sm:font-sans resize-y min-h-[220px]"
                  />
                ) : (
                  <div
                    style={{
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      backgroundColor: "#fdfcf9",
                    }}
                    className="w-full flex-1 min-h-[220px] max-h-[380px] overflow-y-auto rounded-2xl p-4"
                  >
                    {renderHighlightedDiff()}
                  </div>
                )}

                {/* DESKTOP ONLY: Exact original bottom bar */}
                <div
                  style={{ borderTop: "1px solid #e5e5df" }}
                  className="usuk-desktop mt-3.5 flex-wrap items-center justify-between gap-2 pt-3 text-[11px] text-[#8e928a] font-medium"
                >
                  <span>{result.text.trim() ? result.text.trim().split(/\s+/).length : 0} words • {result.text.length} chars</span>
                  {result.changeCount > 0 && outputViewMode === "plain" && (
                    <button
                      type="button"
                      onClick={() => setOutputViewMode("diff")}
                      className="text-xs font-semibold text-[#3158d5] hover:underline cursor-pointer"
                    >
                      Show highlighted diff →
                    </button>
                  )}
                </div>

                {/* MOBILE ONLY: Output action buttons aligned to the right */}
                <div
                  className="converter-mobile-output-actions usuk-mobile mt-3.5 items-center justify-between gap-1.5 pt-2.5 text-[11px] text-[#8e928a] font-medium"
                >
                  <span className="shrink-0 text-left">
                    {result.text.trim() ? result.text.trim().split(/\s+/).length : 0} words • {result.text.length} chars
                  </span>
                  <div className="flex items-center gap-1 shrink-0 ml-auto">
                    {/* View Mode Toggle: Plain vs Diff */}
                    <div
                      style={{
                        backgroundColor: "#efeee7",
                        borderColor: "#e5e5df",
                        borderWidth: "1px",
                        borderStyle: "solid",
                      }}
                      className="inline-flex rounded-lg p-0.5 text-xs shrink-0"
                    >
                      <button
                        type="button"
                        onClick={() => setOutputViewMode("plain")}
                        style={{
                          backgroundColor: outputViewMode === "plain" ? "#ffffff" : "transparent",
                          color: outputViewMode === "plain" ? "#1c201a" : "#70746d",
                          boxShadow: outputViewMode === "plain" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                        }}
                        className="rounded-md px-2 py-1 text-xs font-bold transition cursor-pointer whitespace-nowrap"
                      >
                        Plain
                      </button>
                      <button
                        type="button"
                        onClick={() => setOutputViewMode("diff")}
                        style={{
                          backgroundColor: outputViewMode === "diff" ? "#ffffff" : "transparent",
                          color: outputViewMode === "diff" ? "#3158d5" : "#70746d",
                          boxShadow: outputViewMode === "diff" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                        }}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold transition cursor-pointer whitespace-nowrap"
                      >
                        <span>Highlight Diff</span>
                        {result.changeCount > 0 && (
                          <span className="h-1.5 w-1.5 rounded-full bg-[#3158d5]" />
                        )}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopy}
                      disabled={!result.text}
                      style={{
                        backgroundColor: copied ? "#059669" : "#3158d5",
                        borderColor: copied ? "#059669" : "#3158d5",
                        borderWidth: "1px",
                        borderStyle: "solid",
                        color: "#ffffff",
                      }}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow-2xs transition hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {copied ? (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TRANSFORMED WORDS PILL BADGES */}
          {uniqueChanges.length > 0 && (
            <div
              style={{
                borderColor: "#e5e5df",
                borderWidth: "1px",
                borderStyle: "solid",
                backgroundColor: "#ffffff",
              }}
              className="mt-6 rounded-2xl sm:rounded-[24px] p-5 shadow-xs"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#8e928a]">
                  Detected Translations:
                </span>
                <span className="text-xs text-[#70746d]">
                  ({uniqueChanges.length} unique terms)
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {uniqueChanges.map((item, idx) => (
                  <span
                    key={`${item.original}-${idx}`}
                    style={{
                      backgroundColor: "#faf9f6",
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-medium text-[#1c201a]"
                  >
                    <span className="text-[#8e928a] line-through decoration-[#b85a46]">{item.original}</span>
                    <span className="text-[#3158d5] font-bold">→</span>
                    <span className="font-bold text-[#3158d5]">{item.converted}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* INSTANT US ↔ UK WORD LOOKUP CHEAT SHEET */}
          <div
            style={{
              borderColor: "#e5e5df",
              borderWidth: "1px",
              borderStyle: "solid",
              backgroundColor: "#ffffff",
            }}
            className="mt-10 rounded-2xl sm:rounded-[24px] p-5 sm:p-7 shadow-xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span
                  style={{
                    color: "#3158d5",
                    letterSpacing: "0.14em",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                  className="uppercase block"
                >
                  Instant Dictionary Lookup
                </span>
                <h3 className="mt-1 text-xl sm:text-2xl font-black text-[#1c201a] tracking-tight">
                  UK &amp; US English Spelling &amp; Vocabulary Cheat Sheet
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-[#70746d]">
                  Type any word to look up its British or American counterpart instantly.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  value={lookupQuery}
                  onChange={(e) => setLookupQuery(e.target.value)}
                  placeholder="Search a word (e.g. elevator, color)..."
                  style={{
                    backgroundColor: "#faf9f6",
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    color: "#1c201a",
                  }}
                  className="w-full rounded-xl px-3.5 py-2 pr-9 text-xs placeholder-[#8e928a] outline-none transition focus:border-[#3158d5] focus:bg-white focus:ring-2 focus:ring-[#3158d5]/15"
                />
                <svg
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8e928a]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                {lookupQuery && (
                  <button
                    type="button"
                    onClick={() => setLookupQuery("")}
                    className="absolute left-2.5 top-2 text-xs text-[#8e928a] hover:text-[#1c201a] cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div
              style={{ borderBottom: "1px solid #e5e5df" }}
              className="mt-5 flex flex-wrap gap-1.5 pb-4"
            >
              {(["All", "Vocabulary", "Spelling", "Travel & Transport", "Food & Dining", "Clothing & Home"] as const).map(
                (cat) => {
                  const isActive = lookupCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setLookupCategory(cat)}
                      style={{
                        backgroundColor: isActive ? "#3158d5" : "#faf9f6",
                        borderColor: isActive ? "#3158d5" : "#e5e5df",
                        borderWidth: "1px",
                        borderStyle: "solid",
                        color: isActive ? "#ffffff" : "#70746d",
                      }}
                      className="rounded-xl px-3 py-1.5 text-xs font-semibold transition hover:text-[#3158d5] hover:border-[#b8d1fc] cursor-pointer"
                    >
                      {cat}
                    </button>
                  );
                }
              )}
            </div>

            {/* Word Pairs Grid */}
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 max-h-[380px] overflow-y-auto pr-1">
              {filteredWords.length > 0 ? (
                filteredWords.map((item, idx) => (
                  <div
                    key={`${item.us}-${idx}`}
                    style={{
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      backgroundColor: "#faf9f6",
                    }}
                    className="group rounded-2xl p-3.5 transition hover:border-[#b8d1fc] hover:bg-white hover:shadow-xs"
                  >
                    <div className="flex items-center justify-between text-[11px] text-[#8e928a] mb-1.5">
                      <span className="font-semibold uppercase tracking-wider text-[#3158d5]">
                        {item.category}
                      </span>
                      {item.note && <span className="truncate max-w-[140px] text-[#70746d]">{item.note}</span>}
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-1">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 text-xs text-[#70746d]">
                          <span>🇺🇸</span>
                          <span className="font-semibold text-[#1c201a]">{item.us}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs mt-1">
                          <span>🇬🇧</span>
                          <span className="font-bold text-[#3158d5]">{item.uk}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => copyWordPair(item, idx)}
                          style={{
                            backgroundColor: "#ffffff",
                            borderColor: "#e5e5df",
                            borderWidth: "1px",
                            borderStyle: "solid",
                            color: "#1c201a",
                          }}
                          className="rounded-lg px-2 py-1 text-[11px] font-semibold transition hover:border-[#b8d1fc] hover:text-[#3158d5] cursor-pointer"
                          title="Copy word"
                        >
                          {copiedWordIdx === idx ? "Copied!" : "Copy"}
                        </button>
                        <button
                          type="button"
                          onClick={() => insertWordToInput(direction === "us-to-uk" ? item.us : item.uk)}
                          style={{
                            backgroundColor: "#efeee7",
                            color: "#1c201a",
                          }}
                          className="rounded-lg px-2 py-0.5 text-[10px] font-medium transition hover:bg-[#f0f5ff] hover:text-[#3158d5] cursor-pointer"
                          title="Append to translator input"
                        >
                          + Use
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-8 text-center text-xs text-[#8e928a]">
                  No matching words found for &quot;{lookupQuery}&quot;. Try searching another common term!
                </div>
              )}
            </div>
          </div>

          {/* EDUCATIONAL GUIDE SECTION */}
          <ScrollReveal>
            <div className="mt-14 space-y-6">
              <div className="text-center">
                <span
                  style={{
                    color: "#3158d5",
                    letterSpacing: "0.14em",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                  className="uppercase block"
                >
                  Linguistic Reference
                </span>
                <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1c201a]">
                  Key Differences Between American &amp; British English
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-[#70746d] max-w-xl mx-auto">
                  American and British spelling divergence was largely popularized by lexicographer Noah Webster in 1828 to simplify English spelling phonetically.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div
                  style={{
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    backgroundColor: "#ffffff",
                  }}
                  className="rounded-2xl sm:rounded-[22px] p-5 shadow-xs transition hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <div className="text-xs font-bold text-[#3158d5] uppercase tracking-wide">1. -or vs. -our</div>
                  <h3 className="mt-1 text-base font-bold text-[#1c201a]">Color ↔ Colour</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#70746d] font-normal">
                    American English drops the &apos;u&apos; from Latinate words ending in <code className="font-mono text-[#3158d5]">-our</code>.
                  </p>
                  <div
                    style={{
                      backgroundColor: "#faf9f6",
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      color: "#1c201a",
                    }}
                    className="mt-3 rounded-lg p-2.5 text-xs font-mono"
                  >
                    US: honor, labor, harbor<br />
                    UK: honour, labour, harbour
                  </div>
                </div>

                <div
                  style={{
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    backgroundColor: "#ffffff",
                  }}
                  className="rounded-2xl sm:rounded-[22px] p-5 shadow-xs transition hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <div className="text-xs font-bold text-[#3158d5] uppercase tracking-wide">2. -ize vs. -ise</div>
                  <h3 className="mt-1 text-base font-bold text-[#1c201a]">Organize ↔ Organise</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#70746d] font-normal">
                    US English uses <code className="font-mono text-[#3158d5]">-ize</code> exclusively, whereas British English traditionally favors <code className="font-mono text-[#3158d5]">-ise</code> for verbs derived from Greek.
                  </p>
                  <div
                    style={{
                      backgroundColor: "#faf9f6",
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      color: "#1c201a",
                    }}
                    className="mt-3 rounded-lg p-2.5 text-xs font-mono"
                  >
                    US: realize, prioritize, analyze<br />
                    UK: realise, prioritise, analyse
                  </div>
                </div>

                <div
                  style={{
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    backgroundColor: "#ffffff",
                  }}
                  className="rounded-2xl sm:rounded-[22px] p-5 shadow-xs transition hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <div className="text-xs font-bold text-[#3158d5] uppercase tracking-wide">3. -er vs. -re</div>
                  <h3 className="mt-1 text-base font-bold text-[#1c201a]">Center ↔ Centre</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#70746d] font-normal">
                    Words borrowed from French ending in <code className="font-mono text-[#3158d5]">-re</code> were phoneticized in US English to end in <code className="font-mono text-[#3158d5]">-er</code>.
                  </p>
                  <div
                    style={{
                      backgroundColor: "#faf9f6",
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      color: "#1c201a",
                    }}
                    className="mt-3 rounded-lg p-2.5 text-xs font-mono"
                  >
                    US: theater, meter, fiber<br />
                    UK: theatre, metre, fibre
                  </div>
                </div>

                <div
                  style={{
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    backgroundColor: "#ffffff",
                  }}
                  className="rounded-2xl sm:rounded-[22px] p-5 shadow-xs transition hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <div className="text-xs font-bold text-[#3158d5] uppercase tracking-wide">4. -ense vs. -ence</div>
                  <h3 className="mt-1 text-base font-bold text-[#1c201a]">Defense ↔ Defence</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#70746d] font-normal">
                    US English spells noun forms with an &apos;s&apos; (<code className="font-mono text-[#3158d5]">defense</code>, <code className="font-mono text-[#3158d5]">offense</code>), while British English preserves the &apos;c&apos;.
                  </p>
                  <div
                    style={{
                      backgroundColor: "#faf9f6",
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      color: "#1c201a",
                    }}
                    className="mt-3 rounded-lg p-2.5 text-xs font-mono"
                  >
                    US: license, pretense<br />
                    UK: licence, pretence
                  </div>
                </div>

                <div
                  style={{
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    backgroundColor: "#ffffff",
                  }}
                  className="rounded-2xl sm:rounded-[22px] p-5 shadow-xs transition hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <div className="text-xs font-bold text-[#3158d5] uppercase tracking-wide">5. Single vs. Double &apos;L&apos;</div>
                  <h3 className="mt-1 text-base font-bold text-[#1c201a]">Traveled ↔ Travelled</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#70746d] font-normal">
                    When adding suffixes to verbs ending in a single &apos;l&apos;, British English doubles the &apos;l&apos; regardless of stress, whereas American English keeps a single &apos;l&apos; unless stressed.
                  </p>
                  <div
                    style={{
                      backgroundColor: "#faf9f6",
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      color: "#1c201a",
                    }}
                    className="mt-3 rounded-lg p-2.5 text-xs font-mono"
                  >
                    US: canceling, signaling<br />
                    UK: cancelling, signalling
                  </div>
                </div>

                <div
                  style={{
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    backgroundColor: "#ffffff",
                  }}
                  className="rounded-2xl sm:rounded-[22px] p-5 shadow-xs transition hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <div className="text-xs font-bold text-[#3158d5] uppercase tracking-wide">6. Everyday Vocabulary</div>
                  <h3 className="mt-1 text-base font-bold text-[#1c201a]">Apartment ↔ Flat</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#70746d] font-normal">
                    Entirely different words are used for common objects, transport, food, and clothing between American and British dialects.
                  </p>
                  <div
                    style={{
                      backgroundColor: "#faf9f6",
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      color: "#1c201a",
                    }}
                    className="mt-3 rounded-lg p-2.5 text-xs font-mono"
                  >
                    US: elevator, cookie, trunk, sidewalk<br />
                    UK: lift, biscuit, boot, pavement
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* FAQ SECTION — Matching Image to Text Page */}
        <section className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-12 sm:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left 4 Columns */}
            <ScrollReveal className="lg:col-span-4 lg:sticky lg:top-8">
              <div
                style={{
                  borderColor: "#e5e5df",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  backgroundColor: "#ffffff",
                }}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 shadow-2xs"
              >
                <span className="flex h-1.5 w-1.5 rounded-full bg-[#3158d5] animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#3158d5]">
                  FREQUENTLY ASKED QUESTIONS
                </span>
              </div>
              <h2 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-[#1c201a]">
                US to UK English FAQ
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-[#70746d] leading-relaxed font-normal">
                Everything you need to know about US and UK dialect rules, Oxford spelling, and accuracy.
              </p>
            </ScrollReveal>

            {/* Right 8 Columns */}
            <div className="lg:col-span-8 space-y-3.5">
              {FAQ_ITEMS.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <ScrollReveal key={faq.q} delay={index * 30}>
                    <div
                      style={{
                        borderColor: "#e5e5df",
                        borderWidth: "1px",
                        borderStyle: "solid",
                        backgroundColor: "#ffffff",
                      }}
                      className="rounded-2xl overflow-hidden shadow-2xs transition"
                    >
                      <button
                        type="button"
                        id={`faq-btn-${index}`}
                        aria-expanded={isOpen}
                        aria-controls={`faq-answer-${index}`}
                        onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                        className="flex w-full items-center justify-between p-4 sm:p-5 text-left transition hover:bg-[#faf9f6] cursor-pointer"
                      >
                        <span className="text-sm sm:text-base font-bold text-[#1c201a] pr-2">
                          {faq.q}
                        </span>
                        <span
                          className={`ml-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[#70746d] transition-transform duration-200 ${
                            isOpen ? "rotate-180 text-[#3158d5]" : ""
                          }`}
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </span>
                      </button>

                      <div
                        id={`faq-answer-${index}`}
                        role="region"
                        aria-labelledby={`faq-btn-${index}`}
                        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-in-out ${
                          isOpen
                            ? "grid-rows-[1fr] opacity-100"
                            : "grid-rows-[0fr] opacity-0 pointer-events-none"
                        }`}
                      >
                        <div className="overflow-hidden">
                          <div
                            style={{ borderTop: "1px solid #efeee7" }}
                            className="px-4 sm:px-5 pt-3 pb-5 text-xs sm:text-sm leading-relaxed text-[#555a52] font-normal"
                          >
                            {faq.a}
                          </div>
                        </div>
                      </div>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>
          </div>

          {/* RELATED CREATIVE TOOLS SECTION — Matching Image to Text Bento Card */}
          <div className="mt-14 sm:mt-16">
            <ScrollReveal delay={150}>
              <div
                style={{
                  borderColor: "#e5e5df",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  backgroundColor: "#ffffff",
                }}
                className="rounded-2xl sm:rounded-[24px] p-6 sm:p-8 shadow-2xs"
              >
                <div className="text-center mb-6">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#3158d5]">
                    Cross-Tool Workflows
                  </span>
                  <h2 className="mt-1 text-xl sm:text-2xl font-black text-[#1c201a]">
                    Explore More Free Creative Tools
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Link
                    href="/case-converter"
                    style={{
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      backgroundColor: "#faf9f6",
                    }}
                    className="group p-5 rounded-2xl hover:border-[#3158d5] hover:bg-white shadow-2xs transition"
                  >
                    <div className="text-xs font-bold text-[#3158d5] uppercase mb-1">
                      Text Casing &amp; Cleanup
                    </div>
                    <div className="font-bold text-[#1c201a] group-hover:text-[#3158d5] transition">
                      Case Converter
                    </div>
                    <p className="mt-1 text-xs text-[#70746d]">
                      Convert between Title Case, sentence case, camelCase, snake_case, and clean spaces.
                    </p>
                  </Link>

                  <Link
                    href="/print-sheet-maker"
                    style={{
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      backgroundColor: "#faf9f6",
                    }}
                    className="group p-5 rounded-2xl hover:border-[#3158d5] hover:bg-white shadow-2xs transition"
                  >
                    <div className="text-xs font-bold text-[#3158d5] uppercase mb-1">
                      ID &amp; Photo Layout
                    </div>
                    <div className="font-bold text-[#1c201a] group-hover:text-[#3158d5] transition">
                      ID Print Maker
                    </div>
                    <p className="mt-1 text-xs text-[#70746d]">
                      Fit photos and ID cards on one A4 or custom page at exact physical mm scale.
                    </p>
                  </Link>

                  <Link
                    href="/image-to-text"
                    style={{
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      backgroundColor: "#faf9f6",
                    }}
                    className="group p-5 rounded-2xl hover:border-[#3158d5] hover:bg-white shadow-2xs transition"
                  >
                    <div className="text-xs font-bold text-[#3158d5] uppercase mb-1">
                      OCR Document Extraction
                    </div>
                    <div className="font-bold text-[#1c201a] group-hover:text-[#3158d5] transition">
                      Image to Text (OCR)
                    </div>
                    <p className="mt-1 text-xs text-[#70746d]">
                      Extract editable text from images, photos, and scanned PDFs instantly.
                    </p>
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <Footer currentPath="/us-uk-converter" />
    </div>
  );
}
