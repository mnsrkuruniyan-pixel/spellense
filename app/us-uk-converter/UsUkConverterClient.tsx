"use client";

import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
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

export default function UsUkConverterClient() {
  const [direction, setDirection] = useState<"us-to-uk" | "uk-to-us">("us-to-uk");
  const [input, setInput] = useState("");
  const [outputViewMode, setOutputViewMode] = useState<"plain" | "diff">("plain");
  const [copied, setCopied] = useState(false);
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupCategory, setLookupCategory] = useState<string>("All");
  const [copiedWordIdx, setCopiedWordIdx] = useState<number | null>(null);

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
        <div className="flex h-full min-h-[220px] items-center justify-center text-xs text-slate-400">
          Converted text with highlighted changes will appear here...
        </div>
      );
    }
    if (result.changes.length === 0) {
      return (
        <div className="min-h-[220px] whitespace-pre-wrap leading-relaxed text-[14px] text-slate-800">
          {result.text}
          <div className="mt-4 rounded-xl border border-slate-200/80 bg-white/80 p-3 text-xs text-slate-500">
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
      <div className="min-h-[220px] whitespace-pre-wrap leading-relaxed text-[14px] text-slate-800">
        {tokens.map((token, i) => {
          const lower = token.toLowerCase();
          const orig = changesMap.get(lower);
          if (orig) {
            return (
              <span
                key={i}
                className="group relative inline-flex items-center rounded-lg border border-emerald-300 bg-emerald-100/90 px-1.5 py-0.5 text-emerald-950 font-bold shadow-2xs mx-0.5 transition hover:bg-emerald-200 cursor-help"
                title={`Original: "${orig}"`}
              >
                <span>{token}</span>
                <span className="hidden sm:inline-block ml-1 text-[11px] font-normal text-emerald-700/85 line-through">
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
    <main className="min-h-screen bg-[#f0f6fe] text-black font-sans selection:bg-blue-500/10 selection:text-blue-600">
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
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/80 px-3.5 py-1.5 shadow-2xs backdrop-blur-md mb-4">
              <span className="flex h-2 w-2 rounded-full bg-blue-600" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                Free American ↔ British English Translator
              </span>
            </div>

            <h1 className="text-[34px] xs:text-[44px] sm:text-[56px] md:text-[64px] lg:text-[72px] font-black leading-[1.12] tracking-[-1.5px] sm:tracking-[-2.5px] text-[#0f172a] text-center max-w-5xl mx-auto">
              US to UK English Translator
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-[15px] sm:text-base leading-relaxed text-slate-600">
              Translate text instantly between American and British English. Compare spelling variations, view live highlighted diffs, and look up vocabulary differences.
            </p>
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

          {/* TWO-PANE WORKSPACE */}
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* INPUT PANE */}
            <div className="flex flex-col rounded-3xl border border-white/90 bg-white/85 p-5 shadow-xl shadow-blue-500/5 backdrop-blur-xl">
              {/* Toolbar */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                    {direction === "us-to-uk" ? "🇺🇸 American English (Input)" : "🇬🇧 British English (Input)"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,text/plain"
                    className="hidden"
                    onChange={handleFileUpload}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-blue-600 cursor-pointer"
                    title="Upload .txt document"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

              {/* Textarea Input */}
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={11}
                placeholder={`Type or paste ${direction === "us-to-uk" ? "American (US)" : "British (UK)"} text here to translate...`}
                className="w-full flex-1 rounded-2xl border border-slate-200/90 bg-white/70 p-4 text-[14px] leading-relaxed text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />

              {/* Sample Presets Bar */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                  <span className="font-semibold text-slate-400">Try Sample:</span>
                  {(Object.keys(SAMPLES) as (keyof typeof SAMPLES)[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => loadPreset(key)}
                      className="rounded-lg bg-slate-100 px-2 py-0.5 font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
                    >
                      {SAMPLES[key].label}
                    </button>
                  ))}
                </div>

                <div className="text-[11px] text-slate-400">
                  <span>{input.trim() ? input.trim().split(/\s+/).length : 0} words • {input.length} chars</span>
                </div>
              </div>
            </div>

            {/* OUTPUT PANE */}
            <div className="flex flex-col rounded-3xl border border-white/90 bg-white/85 p-5 shadow-xl shadow-blue-500/5 backdrop-blur-xl">
              {/* Toolbar */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    {direction === "us-to-uk" ? "🇬🇧 British English (Output)" : "🇺🇸 American English (Output)"}
                  </span>
                  {result.changeCount > 0 && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                      {result.changeCount} {result.changeCount === 1 ? "word" : "words"} translated
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {/* View Mode Toggle: Plain vs Diff */}
                  <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setOutputViewMode("plain")}
                      className={`rounded-md px-2 py-1 font-semibold transition cursor-pointer ${
                        outputViewMode === "plain"
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Plain
                    </button>
                    <button
                      type="button"
                      onClick={() => setOutputViewMode("diff")}
                      className={`flex items-center gap-1 rounded-md px-2 py-1 font-semibold transition cursor-pointer ${
                        outputViewMode === "diff"
                          ? "bg-white text-emerald-800 shadow-2xs font-bold"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <span>Highlight Diff</span>
                      {result.changeCount > 0 && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      )}
                    </button>
                  </div>

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
                    title="Download output as .txt"
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

              {/* Output Content: Textarea or Highlighted Diff */}
              <div className="flex-1">
                {outputViewMode === "plain" ? (
                  <textarea
                    value={result.text}
                    readOnly
                    rows={11}
                    placeholder="Translated text will appear here in real-time..."
                    className="w-full h-full min-h-[240px] rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 text-[14px] leading-relaxed text-slate-800 outline-none"
                  />
                ) : (
                  <div className="w-full h-full min-h-[240px] max-h-[380px] overflow-y-auto rounded-2xl border border-emerald-200/80 bg-emerald-50/20 p-4">
                    {renderHighlightedDiff()}
                  </div>
                )}
              </div>

              <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                <span>{result.text.trim() ? result.text.trim().split(/\s+/).length : 0} words • {result.text.length} chars</span>
                {result.changeCount > 0 && outputViewMode === "plain" && (
                  <button
                    type="button"
                    onClick={() => setOutputViewMode("diff")}
                    className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Show highlighted diff →
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* TRANSFORMED WORDS PILL BADGES */}
          {uniqueChanges.length > 0 && (
            <div className="mt-5 rounded-2xl border border-blue-200/80 bg-white/90 p-4 shadow-xs backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Detected Translations:
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

          {/* NEW FEATURE: INSTANT US ↔ UK WORD LOOKUP CHEAT SHEET */}
          <div className="mt-12 rounded-3xl border border-slate-200/90 bg-white/95 p-6 sm:p-8 shadow-sm backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 uppercase tracking-wide">
                  Instant Dictionary Lookup
                </div>
                <h3 className="mt-1 text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  UK &amp; US English Spelling &amp; Vocabulary Cheat Sheet
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                  Type any word to look up its British or American counterpart instantly.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative min-w-[260px] sm:w-72">
                <input
                  type="text"
                  value={lookupQuery}
                  onChange={(e) => setLookupQuery(e.target.value)}
                  placeholder="Search a word (e.g. elevator, color)..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2 pl-9 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
                />
                <svg
                  className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"
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
                    className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="mt-5 flex flex-wrap gap-1.5 border-b border-slate-100 pb-4">
              {(["All", "Vocabulary", "Spelling", "Travel & Transport", "Food & Dining", "Clothing & Home"] as const).map(
                (cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setLookupCategory(cat)}
                    className={`rounded-xl px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                      lookupCategory === cat
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                    }`}
                  >
                    {cat}
                  </button>
                )
              )}
            </div>

            {/* Word Pairs Grid */}
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 max-h-[380px] overflow-y-auto pr-1">
              {filteredWords.length > 0 ? (
                filteredWords.map((item, idx) => (
                  <div
                    key={`${item.us}-${idx}`}
                    className="group rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 transition hover:border-blue-300 hover:bg-white hover:shadow-xs"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                      <span className="font-semibold uppercase tracking-wider text-blue-600">
                        {item.category}
                      </span>
                      {item.note && <span className="truncate max-w-[140px]">{item.note}</span>}
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-1">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <span>🇺🇸</span>
                          <span className="font-semibold">{item.us}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-900 mt-1">
                          <span>🇬🇧</span>
                          <span className="font-bold text-blue-700">{item.uk}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => copyWordPair(item, idx)}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
                          title="Copy word"
                        >
                          {copiedWordIdx === idx ? "Copied!" : "Copy"}
                        </button>
                        <button
                          type="button"
                          onClick={() => insertWordToInput(direction === "us-to-uk" ? item.us : item.uk)}
                          className="rounded-lg bg-slate-200/70 px-2 py-0.5 text-[10px] font-medium text-slate-700 transition hover:bg-slate-300 cursor-pointer"
                          title="Append to translator input"
                        >
                          + Use
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-8 text-center text-xs text-slate-400">
                  No matching words found for &quot;{lookupQuery}&quot;. Try searching another common term!
                </div>
              )}
            </div>
          </div>

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

          {/* FAQ SECTION */}
          <section className="mt-16 rounded-3xl border border-slate-200/90 bg-white/95 p-6 sm:p-8 shadow-xs">
            <div className="text-center sm:text-left mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Frequently Asked Questions
              </span>
              <h3 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
                US to UK English Translation &amp; Spelling FAQ
              </h3>
            </div>

            <div className="divide-y divide-slate-100">
              <div className="py-4 first:pt-0">
                <h4 className="text-sm sm:text-base font-bold text-slate-900">
                  How do I translate American English into British English?
                </h4>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Simply paste or type your American (US) text into the input pane. The translator automatically detects American spellings (such as <code className="text-blue-600 font-mono">color</code>, <code className="text-blue-600 font-mono">realize</code>, <code className="text-blue-600 font-mono">center</code>) and vocabulary (such as <code className="text-blue-600 font-mono">elevator</code>, <code className="text-blue-600 font-mono">sidewalk</code>) and translates them into standard British (UK) English in real-time.
                </p>
              </div>

              <div className="py-4">
                <h4 className="text-sm sm:text-base font-bold text-slate-900">
                  What are the biggest differences in UK English spelling?
                </h4>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  The primary differences include <code className="text-blue-600 font-mono">-our</code> endings (<code className="text-blue-600 font-mono">flavour</code>, <code className="text-blue-600 font-mono">honour</code>), <code className="text-blue-600 font-mono">-ise</code> verbs (<code className="text-blue-600 font-mono">organise</code>, <code className="text-blue-600 font-mono">prioritise</code>), <code className="text-blue-600 font-mono">-re</code> endings (<code className="text-blue-600 font-mono">theatre</code>, <code className="text-blue-600 font-mono">metre</code>), and doubled consonants in inflected verbs (<code className="text-blue-600 font-mono">travelled</code>, <code className="text-blue-600 font-mono">cancelling</code>).
                </p>
              </div>

              <div className="py-4">
                <h4 className="text-sm sm:text-base font-bold text-slate-900">
                  Is -ize or -ise correct in British English?
                </h4>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Both are technically acceptable in British English. The Oxford University Press (OUP) favors the <code className="text-blue-600 font-mono">-ize</code> spelling (known as Oxford spelling) because of its ancient Greek etymology. However, modern British usage, government publications, and UK news outlets (such as the BBC and The Guardian) predominantly use the <code className="text-blue-600 font-mono">-ise</code> form.
                </p>
              </div>

              <div className="py-4 last:pb-0">
                <h4 className="text-sm sm:text-base font-bold text-slate-900">
                  Is this US to UK English translator free and private?
                </h4>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Yes, 100% free with unlimited conversions. All translation and rule mapping occurs entirely in your local browser memory. Your text, articles, and assignments are never stored on any server.
                </p>
              </div>
            </div>
          </section>
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
