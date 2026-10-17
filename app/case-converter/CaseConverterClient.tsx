"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  toSentenceCase,
  toLowerCase,
  toUpperCase,
  toTitleCase,
  toCapitalizedCase,
  toAlternatingCase,
  toCamelCase,
  toPascalCase,
  toSnakeCase,
  toKebabCase,
  toConstantCase,
  toInverseCase,
  removeExtraSpaces,
  removeBlankLines,
  straightenQuotes,
  stripHtmlTags,
} from "@/lib/caseConverter";

const SAMPLE_TEXT = `the quick BROWN fox jumps OVER the lazy dog! this interactive text formatter by spellense allows creators, copywriters, and developers to switch between various casing styles effortlessly. whether you need clean "camelCase" for javascript variables, standard Title Case for marketing headlines, or sentence case for blog posts, spellense gets it done in real-time.`;

const FAQ_ITEMS = [
  {
    q: "How does Title Case determine which words to capitalize?",
    a: "Spellense follows standard editorial capitalization rules (similar to AP and Chicago style). Major words like nouns, verbs, adjectives, and adverbs are capitalized, while minor conjunctions, prepositions, and articles (like 'a', 'an', 'the', 'and', 'in', 'of') remain lowercase unless they are the first word of a sentence or headline.",
  },
  {
    q: "Is my text saved or sent to an external server?",
    a: "No. All text transformations, character counts, and sanitization cleaners run 100% locally in your web browser using client-side JavaScript. None of your text, personal notes, or confidential code is ever logged, stored, or transmitted to any server.",
  },
  {
    q: "What is the difference between camelCase and PascalCase?",
    a: "Both styles remove spaces between words and capitalize each word's first letter. However, camelCase begins with a lowercase letter (e.g., userAccountBalance), commonly used for functions and variables in JavaScript and Swift. PascalCase begins with an uppercase letter (e.g., UserAccountBalance), standard for classes and types in TypeScript, C#, and React.",
  },
  {
    q: "Can I undo a conversion if I make a mistake?",
    a: "Yes! Spellense tracks your recent transformation history. You can press Ctrl+Z (or Cmd+Z on macOS) or click the Undo button in the toolbar to restore your previous text state at any time.",
  },
  {
    q: "Are there any character or word limits?",
    a: "There are no artificial limits. You can paste and convert essays, full-length articles, source code, or lengthy markdown files without restriction, completely free with no registration required.",
  },
];

export default function CaseConverterClient() {
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeTransform, setActiveTransform] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Statistics calculation
  const stats = useMemo(() => {
    const trimmed = text.trim();
    const charsWithSpaces = text.length;
    const charsNoSpaces = text.replace(/\s+/g, "").length;
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const lines = text ? text.split(/\r\n|\r|\n/).filter((l) => l.trim().length > 0).length : 0;
    const sentences = trimmed
      ? (text.match(/[^.!?]+[.!?]+(\s|$)/g) || [trimmed]).length
      : 0;
    const readingTimeMinutes = Math.max(1, Math.ceil(words / 220));

    return {
      charsWithSpaces,
      charsNoSpaces,
      words,
      lines,
      sentences,
      readingTime: words > 0 ? `~${readingTimeMinutes} min` : "0 min",
    };
  }, [text]);

  const updateTextWithHistory = (newText: string) => {
    if (newText === text) return;
    setHistory((prev) => [...prev.slice(-49), text]);
    setText(newText);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setText(previous);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        if (history.length > 0) {
          e.preventDefault();
          handleUndo();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [history]);

  // Conversion functions using shared tokenizer & robust library
  const transform = (type: string) => {
    if (!text) return;
    setActiveTransform(type);
    setTimeout(() => setActiveTransform(null), 700);

    let result = text;
    switch (type) {
      case "sentence":
        result = toSentenceCase(text);
        break;
      case "lower":
        result = toLowerCase(text);
        break;
      case "upper":
        result = toUpperCase(text);
        break;
      case "title":
        result = toTitleCase(text);
        break;
      case "capitalized":
        result = toCapitalizedCase(text);
        break;
      case "alternating":
        result = toAlternatingCase(text);
        break;
      case "camel":
        result = toCamelCase(text);
        break;
      case "pascal":
        result = toPascalCase(text);
        break;
      case "snake":
        result = toSnakeCase(text);
        break;
      case "kebab":
        result = toKebabCase(text);
        break;
      case "constant":
        result = toConstantCase(text);
        break;
      case "inverse":
        result = toInverseCase(text);
        break;
      default:
        return;
    }
    updateTextWithHistory(result);
  };

  // Text cleaners
  const cleanText = (type: "extra-spaces" | "empty-lines" | "smart-quotes" | "strip-html") => {
    if (!text) return;
    let result = text;
    switch (type) {
      case "extra-spaces":
        result = removeExtraSpaces(text);
        break;
      case "empty-lines":
        result = removeBlankLines(text);
        break;
      case "smart-quotes":
        result = straightenQuotes(text);
        break;
      case "strip-html":
        result = stripHtmlTags(text);
        break;
    }
    updateTextWithHistory(result);
  };

  const handlePaste = async () => {
    let pastedSuccessfully = false;
    if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
      try {
        const clipText = await navigator.clipboard.readText();
        if (clipText) {
          updateTextWithHistory(clipText);
          pastedSuccessfully = true;
          return;
        }
      } catch {
        pastedSuccessfully = false;
      }
    }

    if (!pastedSuccessfully) {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
      setNotification("Tap and hold the text box to paste directly.");
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleCopy = async () => {
    if (!text) return;
    let copiedSuccessfully = false;

    // 1. Try modern async Clipboard API if supported and in secure context
    if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        copiedSuccessfully = true;
      } catch {
        copiedSuccessfully = false;
      }
    }

    // 2. Fallback using existing textarea element (proven reliability on mobile Safari & Android)
    if (!copiedSuccessfully && textareaRef.current) {
      try {
        textareaRef.current.focus();
        textareaRef.current.select();
        textareaRef.current.setSelectionRange(0, textareaRef.current.value.length);
        copiedSuccessfully = document.execCommand("copy");
        window.getSelection()?.removeAllRanges();
      } catch {
        copiedSuccessfully = false;
      }
    }

    // 3. Fallback using temporary off-screen textarea with iOS Range selection
    if (!copiedSuccessfully) {
      try {
        const tempArea = document.createElement("textarea");
        tempArea.value = text;
        tempArea.contentEditable = "true";
        tempArea.readOnly = false;
        tempArea.style.position = "fixed";
        tempArea.style.left = "-9999px";
        tempArea.style.top = "-9999px";
        tempArea.style.opacity = "0";
        tempArea.style.fontSize = "16px";
        document.body.appendChild(tempArea);

        const range = document.createRange();
        range.selectNodeContents(tempArea);
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
        tempArea.setSelectionRange(0, text.length);

        copiedSuccessfully = document.execCommand("copy");
        document.body.removeChild(tempArea);
        if (sel) sel.removeAllRanges();
      } catch {
        copiedSuccessfully = false;
      }
    }

    if (copiedSuccessfully) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      // If browser security strictly restricts automated copy, select text for easy device copy
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.select();
      }
      setNotification("Text selected! Tap Copy on your device popup menu.");
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleDownload = () => {
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "converted-text.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white relative z-10 text-[15px]">
      {/* NAVBAR */}
      <Navbar />

      <main id="main-content" className="flex-1">
        {/* HERO TITLE — Matching Figma Layout Style */}
        <section className="px-4 max-w-7xl mx-auto pt-3 sm:pt-6 pb-1.5 sm:pb-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
            <div>
              <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#0f172a]">
                Case Converter &amp; Text Formatter
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1 line-clamp-1 sm:line-clamp-none">
                Transform text between Title Case, sentence case, UPPERCASE, camelCase, snake_case, and clean formatting.
              </p>
            </div>

            {/* Fast / Local Badge */}
            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 text-xs font-semibold text-emerald-800 self-start sm:self-center shadow-2xs">
              <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <span>Instant real-time formatting in browser</span>
            </div>
          </div>
        </section>

        {/* WORKSPACE CONTAINER */}
        <section className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 pb-16 mt-2 sm:mt-4">
          {/* MAIN TOOL CARD */}
          <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-[0_15px_50px_-15px_rgba(0,85,254,0.07)]">
            {/* TOOLBAR */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 7 4 4 20 4 20 7" />
                    <line x1="9" y1="20" x2="15" y2="20" />
                    <line x1="12" y1="4" x2="12" y2="20" />
                  </svg>
                  Text Editor
                </span>
                <button
                  type="button"
                  onClick={() => updateTextWithHistory(SAMPLE_TEXT)}
                  className="rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 hover:border-blue-400 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-[#0055fe] shadow-2xs transition cursor-pointer"
                >
                  Load Sample
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={history.length === 0}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 hover:border-blue-400 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-[#0055fe] shadow-2xs transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Undo last conversion (Ctrl+Z / Cmd+Z)"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7v6h6" />
                    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                  </svg>
                  Undo
                </button>

                <button
                  type="button"
                  onClick={handlePaste}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 hover:border-blue-400 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-[#0055fe] shadow-2xs transition cursor-pointer"
                  title="Paste from clipboard"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                  </svg>
                  Paste
                </button>

                <button
                  type="button"
                  onClick={() => updateTextWithHistory("")}
                  disabled={!text}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200/90 bg-white hover:bg-rose-50 hover:border-rose-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-rose-600 shadow-2xs transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Clear text"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Clear
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!text}
                  className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200/90 px-3 py-1 text-xs font-bold transition shadow-2xs cursor-pointer ${
                    copied
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white hover:bg-slate-50 hover:border-blue-400 text-slate-700 hover:text-[#0055fe] disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                >
                  {copied ? (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* NOTIFICATION */}
            {notification && (
              <div className="mb-3 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/90 px-3.5 py-2 text-xs font-medium text-blue-800 animate-in fade-in duration-200">
                <span className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-blue-600">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  {notification}
                </span>
                <button
                  type="button"
                  onClick={() => setNotification(null)}
                  className="ml-2 font-bold hover:text-blue-950 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* TEXTAREA INPUT */}
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={9}
                placeholder="Type, paste, or load sample text here to transform its case..."
                className="w-full rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4 text-[15px] leading-relaxed text-slate-800 placeholder-slate-400 outline-none transition focus:border-[#0055fe] focus:bg-white focus:ring-4 focus:ring-blue-500/10 font-mono sm:font-sans"
              />
            </div>

            {/* LIVE STATS BAR */}
            <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-6 text-center text-xs">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Words</div>
                <div className="mt-0.5 text-base font-extrabold text-slate-800">{stats.words}</div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Characters</div>
                <div className="mt-0.5 text-base font-extrabold text-slate-800">{stats.charsWithSpaces}</div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">No Spaces</div>
                <div className="mt-0.5 text-base font-extrabold text-slate-800">{stats.charsNoSpaces}</div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Sentences</div>
                <div className="mt-0.5 text-base font-extrabold text-slate-800">{stats.sentences}</div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Lines</div>
                <div className="mt-0.5 text-base font-extrabold text-slate-800">{stats.lines}</div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Reading Time</div>
                <div className="mt-0.5 text-base font-extrabold text-blue-600">{stats.readingTime}</div>
              </div>
            </div>

            {/* ACTION BUTTONS: CASE TRANSFORMATIONS */}
            <div className="mt-6 border-t border-slate-100 pt-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Case Conversion Modes
                </h3>
                <span className="text-[11px] text-slate-400">Click any button to apply</span>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
                <button
                  type="button"
                  onClick={() => transform("sentence")}
                  disabled={!text}
                  className={`group flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all cursor-pointer ${
                    activeTransform === "sentence"
                      ? "border-[#0055fe] bg-[#0055fe] text-white shadow-sm scale-[1.02]"
                      : "border-slate-200/90 bg-white hover:border-blue-400 hover:bg-slate-50 text-slate-700 hover:text-[#0055fe] disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                >
                  <span className="text-xs font-bold">Sentence case</span>
                  <span className={`text-[10px] ${activeTransform === "sentence" ? "text-blue-100" : "text-slate-400 group-hover:text-[#0055fe]"}`}>
                    First letter capitalized
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => transform("lower")}
                  disabled={!text}
                  className={`group flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all cursor-pointer ${
                    activeTransform === "lower"
                      ? "border-[#0055fe] bg-[#0055fe] text-white shadow-sm scale-[1.02]"
                      : "border-slate-200/90 bg-white hover:border-blue-400 hover:bg-slate-50 text-slate-700 hover:text-[#0055fe] disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                >
                  <span className="text-xs font-bold">lower case</span>
                  <span className={`text-[10px] ${activeTransform === "lower" ? "text-blue-100" : "text-slate-400 group-hover:text-[#0055fe]"}`}>
                    all letters small
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => transform("upper")}
                  disabled={!text}
                  className={`group flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all cursor-pointer ${
                    activeTransform === "upper"
                      ? "border-[#0055fe] bg-[#0055fe] text-white shadow-sm scale-[1.02]"
                      : "border-slate-200/90 bg-white hover:border-blue-400 hover:bg-slate-50 text-slate-700 hover:text-[#0055fe] disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                >
                  <span className="text-xs font-bold uppercase">UPPER CASE</span>
                  <span className={`text-[10px] ${activeTransform === "upper" ? "text-blue-100" : "text-slate-400 group-hover:text-[#0055fe]"}`}>
                    ALL LETTERS CAPITAL
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => transform("title")}
                  disabled={!text}
                  className={`group flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all cursor-pointer ${
                    activeTransform === "title"
                      ? "border-[#0055fe] bg-[#0055fe] text-white shadow-sm scale-[1.02]"
                      : "border-slate-200/90 bg-white hover:border-blue-400 hover:bg-slate-50 text-slate-700 hover:text-[#0055fe] disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                >
                  <span className="text-xs font-bold">Title Case</span>
                  <span className={`text-[10px] ${activeTransform === "title" ? "text-blue-100" : "text-slate-400 group-hover:text-[#0055fe]"}`}>
                    Smart Headings
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => transform("capitalized")}
                  disabled={!text}
                  className={`group flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all cursor-pointer ${
                    activeTransform === "capitalized"
                      ? "border-[#0055fe] bg-[#0055fe] text-white shadow-sm scale-[1.02]"
                      : "border-slate-200/90 bg-white hover:border-blue-400 hover:bg-slate-50 text-slate-700 hover:text-[#0055fe] disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                >
                  <span className="text-xs font-bold">Capitalized</span>
                  <span className={`text-[10px] ${activeTransform === "capitalized" ? "text-blue-100" : "text-slate-400 group-hover:text-[#0055fe]"}`}>
                    Every Word Initial
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => transform("alternating")}
                  disabled={!text}
                  className={`group flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all cursor-pointer ${
                    activeTransform === "alternating"
                      ? "border-[#0055fe] bg-[#0055fe] text-white shadow-sm scale-[1.02]"
                      : "border-slate-200/90 bg-white hover:border-blue-400 hover:bg-slate-50 text-slate-700 hover:text-[#0055fe] disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                >
                  <span className="text-xs font-bold">aLtErNaTiNg</span>
                  <span className={`text-[10px] ${activeTransform === "alternating" ? "text-blue-100" : "text-slate-400 group-hover:text-[#0055fe]"}`}>
                    mOcKiNg cAsE
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => transform("camel")}
                  disabled={!text}
                  className={`group flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all cursor-pointer ${
                    activeTransform === "camel"
                      ? "border-[#0055fe] bg-[#0055fe] text-white shadow-sm scale-[1.02]"
                      : "border-slate-200/90 bg-white hover:border-blue-400 hover:bg-slate-50 text-slate-700 hover:text-[#0055fe] disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                >
                  <span className="text-xs font-bold font-mono">camelCase</span>
                  <span className={`text-[10px] ${activeTransform === "camel" ? "text-blue-100" : "text-slate-400 group-hover:text-[#0055fe]"}`}>
                    JavaScript / Swift
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => transform("pascal")}
                  disabled={!text}
                  className={`group flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all cursor-pointer ${
                    activeTransform === "pascal"
                      ? "border-[#0055fe] bg-[#0055fe] text-white shadow-sm scale-[1.02]"
                      : "border-slate-200/90 bg-white hover:border-blue-400 hover:bg-slate-50 text-slate-700 hover:text-[#0055fe] disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                >
                  <span className="text-xs font-bold font-mono">PascalCase</span>
                  <span className={`text-[10px] ${activeTransform === "pascal" ? "text-blue-100" : "text-slate-400 group-hover:text-[#0055fe]"}`}>
                    Classes &amp; Types
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => transform("snake")}
                  disabled={!text}
                  className={`group flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all cursor-pointer ${
                    activeTransform === "snake"
                      ? "border-[#0055fe] bg-[#0055fe] text-white shadow-sm scale-[1.02]"
                      : "border-slate-200/90 bg-white hover:border-blue-400 hover:bg-slate-50 text-slate-700 hover:text-[#0055fe] disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                >
                  <span className="text-xs font-bold font-mono">snake_case</span>
                  <span className={`text-[10px] ${activeTransform === "snake" ? "text-blue-100" : "text-slate-400 group-hover:text-[#0055fe]"}`}>
                    Python / SQL
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => transform("kebab")}
                  disabled={!text}
                  className={`group flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all cursor-pointer ${
                    activeTransform === "kebab"
                      ? "border-[#0055fe] bg-[#0055fe] text-white shadow-sm scale-[1.02]"
                      : "border-slate-200/90 bg-white hover:border-blue-400 hover:bg-slate-50 text-slate-700 hover:text-[#0055fe] disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                >
                  <span className="text-xs font-bold font-mono">kebab-case</span>
                  <span className={`text-[10px] ${activeTransform === "kebab" ? "text-blue-100" : "text-slate-400 group-hover:text-[#0055fe]"}`}>
                    URLs &amp; CSS
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => transform("constant")}
                  disabled={!text}
                  className={`group flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all cursor-pointer ${
                    activeTransform === "constant"
                      ? "border-[#0055fe] bg-[#0055fe] text-white shadow-sm scale-[1.02]"
                      : "border-slate-200/90 bg-white hover:border-blue-400 hover:bg-slate-50 text-slate-700 hover:text-[#0055fe] disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                >
                  <span className="text-xs font-bold font-mono">CONSTANT</span>
                  <span className={`text-[10px] ${activeTransform === "constant" ? "text-blue-100" : "text-slate-400 group-hover:text-[#0055fe]"}`}>
                    ENV_VARIABLES
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => transform("inverse")}
                  disabled={!text}
                  className={`group flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all cursor-pointer ${
                    activeTransform === "inverse"
                      ? "border-[#0055fe] bg-[#0055fe] text-white shadow-sm scale-[1.02]"
                      : "border-slate-200/90 bg-white hover:border-blue-400 hover:bg-slate-50 text-slate-700 hover:text-[#0055fe] disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                >
                  <span className="text-xs font-bold">iNVERSE cASE</span>
                  <span className={`text-[10px] ${activeTransform === "inverse" ? "text-blue-100" : "text-slate-400 group-hover:text-[#0055fe]"}`}>
                    Invert Letter Case
                  </span>
                </button>
              </div>
            </div>

            {/* TEXT CLEANERS & EXPORT */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1">
                  Cleaners:
                </span>
                <button
                  type="button"
                  onClick={() => cleanText("extra-spaces")}
                  disabled={!text}
                  className="rounded-xl border border-slate-200/80 bg-slate-50/60 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white hover:text-[#0055fe] hover:border-blue-300 disabled:opacity-40 cursor-pointer"
                >
                  Remove Extra Spaces
                </button>
                <button
                  type="button"
                  onClick={() => cleanText("empty-lines")}
                  disabled={!text}
                  className="rounded-xl border border-slate-200/80 bg-slate-50/60 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white hover:text-[#0055fe] hover:border-blue-300 disabled:opacity-40 cursor-pointer"
                >
                  Remove Blank Lines
                </button>
                <button
                  type="button"
                  onClick={() => cleanText("smart-quotes")}
                  disabled={!text}
                  className="rounded-xl border border-slate-200/80 bg-slate-50/60 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white hover:text-[#0055fe] hover:border-blue-300 disabled:opacity-40 cursor-pointer"
                >
                  Straighten Quotes (&quot; &apos;)
                </button>
                <button
                  type="button"
                  onClick={() => cleanText("strip-html")}
                  disabled={!text}
                  className="rounded-xl border border-slate-200/80 bg-slate-50/60 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white hover:text-[#0055fe] hover:border-blue-300 disabled:opacity-40 cursor-pointer"
                >
                  Strip HTML Tags
                </button>
              </div>

              <button
                type="button"
                onClick={handleDownload}
                disabled={!text}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 hover:text-[#0055fe] hover:border-blue-300 disabled:opacity-40 cursor-pointer"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download .txt
              </button>
            </div>
          </div>

          {/* EDUCATIONAL GUIDE SECTION */}
          <div className="mt-14 space-y-6">
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Style Guidelines</span>
              <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Guide to Letter Casing &amp; Naming Conventions
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-2xl mx-auto">
                Learn when to apply different capitalization styles across writing, UX design, and software engineering.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wide">Title Case</div>
                <h3 className="mt-1 text-base font-bold text-slate-900">Headlines &amp; Book Titles</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 font-normal">
                  Follows editorial guidelines (such as Chicago, APA, or AP). Capitalizes major words (nouns, pronouns, verbs, adjectives), while leaving articles (a, an, the) and short prepositions (in, on, of) lowercase.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wide">Sentence case</div>
                <h3 className="mt-1 text-base font-bold text-slate-900">Modern UX &amp; Body Copy</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 font-normal">
                  Capitalizes only the first letter of each sentence and proper nouns. Recommended by Apple, Google Material Design, and Microsoft for modern digital interfaces and button labels.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wide">camelCase &amp; PascalCase</div>
                <h3 className="mt-1 text-base font-bold text-slate-900">Programming Identifiers</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 font-normal">
                  Removes spaces and joins words. camelCase begins lowercase (<code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">userProfile</code>) for functions and variables. PascalCase begins uppercase (<code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">UserProfile</code>) for classes and React components.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wide">snake_case &amp; CONSTANT</div>
                <h3 className="mt-1 text-base font-bold text-slate-900">Database &amp; Environment Keys</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 font-normal">
                  Separates words using underscores. Widely used in Python, SQL schemas, and database column names. CONSTANT_CASE is standard for environment variables and immutable configuration settings.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wide">kebab-case</div>
                <h3 className="mt-1 text-base font-bold text-slate-900">SEO URLs &amp; CSS Classes</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 font-normal">
                  Separates words with hyphens (<code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">page-title-header</code>). Favored by Google search crawlers for clean slug URLs and standard in HTML/CSS class naming.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wide">Cleaners</div>
                <h3 className="mt-1 text-base font-bold text-slate-900">Space &amp; Line Formatter</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 font-normal">
                  Instantly sanitizes copied text by eliminating double spaces, excessive line breaks, and converting curly smart quotes into standard straight quotes for clean code pasting.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ SECTION — 2-Column Clean Figma Layout */}
        <section className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-16 border-t border-slate-200/80">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Left 4 Columns */}
            <div className="md:col-span-4 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block">
                FREQUENTLY ASKED QUESTIONS
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Case Converter FAQ
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
                Everything you need to know about text conversions, formatting guidelines, and privacy.
              </p>
            </div>

            {/* Right 8 Columns */}
            <div className="md:col-span-8 space-y-3">
              {FAQ_ITEMS.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={faq.q}
                    className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs transition"
                  >
                    <button
                      type="button"
                      id={`faq-btn-${index}`}
                      aria-expanded={isOpen}
                      aria-controls={`faq-answer-${index}`}
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      className="flex w-full items-center justify-between p-4 sm:p-5 text-left transition hover:bg-slate-50/60 cursor-pointer"
                    >
                      <span className="text-sm font-bold text-slate-900 pr-2">
                        {faq.q}
                      </span>
                      <span
                        className={`ml-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-slate-400 transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-blue-600" : ""
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
                        <div className="border-t border-slate-100 px-4 sm:px-5 pt-3 pb-5 text-xs sm:text-sm leading-relaxed text-slate-600 font-normal">
                          {faq.a}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* RELATED CREATIVE TOOLS SECTION */}
        <section className="border-t border-slate-200/80 bg-white/60 py-14 px-3 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="text-center mb-8">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Cross-Tool Workflows</span>
              <h2 className="mt-1 text-xl sm:text-2xl font-black text-slate-900">Explore More Free Creative Tools</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link
                href="/print-sheet-maker"
                className="group p-5 rounded-2xl border border-slate-200/80 bg-white hover:border-[#0055fe] hover:shadow-xs transition"
              >
                <div className="text-xs font-bold text-blue-600 uppercase mb-1">ID &amp; Photo Layout</div>
                <div className="font-bold text-slate-900 group-hover:text-blue-600 transition">ID Print Maker</div>
                <p className="mt-1 text-xs text-slate-500">Fit photos and ID cards on one A4 or custom page at exact physical mm.</p>
              </Link>

              <Link
                href="/image-compressor"
                className="group p-5 rounded-2xl border border-slate-200/80 bg-white hover:border-[#0055fe] hover:shadow-xs transition"
              >
                <div className="text-xs font-bold text-blue-600 uppercase mb-1">Visual Optimization</div>
                <div className="font-bold text-slate-900 group-hover:text-blue-600 transition">Image Compressor</div>
                <p className="mt-1 text-xs text-slate-500">Lossless &amp; lossy image compression with side-by-side comparison slider.</p>
              </Link>

              <Link
                href="/qr-code-generator"
                className="group p-5 rounded-2xl border border-slate-200/80 bg-white hover:border-[#0055fe] hover:shadow-xs transition"
              >
                <div className="text-xs font-bold text-blue-600 uppercase mb-1">Print Scannability QA</div>
                <div className="font-bold text-slate-900 group-hover:text-blue-600 transition">QR Code Generator</div>
                <p className="mt-1 text-xs text-slate-500">Create custom QR codes and verify camera scannability before printing.</p>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <Footer currentPath="/case-converter" />
    </div>
  );
}

