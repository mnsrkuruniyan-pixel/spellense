"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
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
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [hoveredModeKey, setHoveredModeKey] = useState<string | null>(null);
  const [hoveredCleanerKey, setHoveredCleanerKey] = useState<string | null>(null);
  const [isDownloadHovered, setIsDownloadHovered] = useState(false);
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

    if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        copiedSuccessfully = true;
      } catch {
        copiedSuccessfully = false;
      }
    }

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
    <div
      style={{ backgroundColor: "#faf9f6" }}
      className="flex min-h-screen flex-col bg-[#faf9f6] font-sans text-slate-800 antialiased selection:bg-[#bcd5ff] selection:text-black relative z-10 text-[15px]"
    >
      {/* NAVBAR */}
      <Navbar onUploadClick={() => textareaRef.current?.focus()} />

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
                CASE CONVERTER &amp; TEXT FORMATTER
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
                  Any text format.
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
                  In one click.
                </span>
              </h1>

              {/* SUBTITLE */}
              <p
                style={{
                  color: "#70746d",
                  fontSize: "15px",
                  lineHeight: 1.5,
                  maxWidth: "520px",
                  margin: "12px auto 0",
                }}
                className="text-center font-normal"
              >
                Switch effortlessly between Title Case, sentence case, UPPERCASE, camelCase, snake_case, and clean formatting with live word counting.
              </p>
            </div>
          </div>
        </section>

        {/* WORKSPACE CONTAINER */}
        <section className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 pb-16 mt-3 sm:mt-5">
          <div className="mx-auto w-full">
            {/* MAIN TOOL CARD */}
            <div
              style={{
                borderColor: "#e5e5df",
                borderWidth: "1px",
                borderStyle: "solid",
                backgroundColor: "#ffffff",
                boxShadow: "none",
              }}
              className="relative w-full rounded-2xl sm:rounded-[24px] overflow-hidden shadow-xs"
            >
              {/* TOOLBAR HEADER (EXACT HOMEPAGE MATCH — SINGLE LINE ON MOBILE) */}
              <div
                style={{
                  borderBottom: "1px solid #e5e5df",
                  backgroundColor: "#faf9f6",
                }}
                className="flex items-center justify-between gap-2 sm:gap-3 px-3.5 sm:px-8 py-2.5 sm:py-4 overflow-x-auto sm:overflow-x-visible no-scrollbar"
              >
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <span className="hidden sm:inline-block w-2 h-2 rounded-full bg-[#3158d5]" />
                  <span className="hidden sm:inline-block text-[13px] font-bold text-[#1c201a] whitespace-nowrap">
                    Text Formatter
                  </span>
                  <button
                    type="button"
                    onClick={() => updateTextWithHistory(SAMPLE_TEXT)}
                    style={{
                      backgroundColor: "#efeee7",
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      color: "#3158d5",
                    }}
                    className="rounded-lg px-2.5 py-1.5 sm:py-1 text-xs font-bold transition hover:bg-[#e4e3dc] cursor-pointer whitespace-nowrap"
                  >
                    Load Sample
                  </button>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={history.length === 0}
                    style={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      color: "#1c201a",
                    }}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow-2xs transition hover:bg-[#efeee7] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                    title="Undo last conversion (Ctrl+Z / Cmd+Z)"
                  >
                    <svg width="12" height="12" className="sm:w-[13px] sm:h-[13px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 7v6h6" />
                      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                    </svg>
                    <span>Undo</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePaste}
                    style={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      color: "#1c201a",
                    }}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow-2xs transition hover:bg-[#efeee7] cursor-pointer whitespace-nowrap"
                    title="Paste from clipboard"
                  >
                    <svg width="12" height="12" className="sm:w-[13px] sm:h-[13px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                    </svg>
                    <span>Paste</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateTextWithHistory("")}
                    disabled={!text}
                    style={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      color: "#b85a46",
                    }}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow-2xs transition hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                    title="Clear text"
                  >
                    <svg width="12" height="12" className="sm:w-[13px] sm:h-[13px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    <span>Clear</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopy}
                    disabled={!text}
                    style={{
                      backgroundColor: copied ? "#059669" : "#3158d5",
                      borderColor: copied ? "#059669" : "#3158d5",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      color: "#ffffff",
                    }}
                    className="inline-flex items-center gap-1 sm:gap-1.5 rounded-lg px-3 sm:px-3.5 py-1.5 text-xs font-bold transition shadow-xs cursor-pointer hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {copied ? (
                      <>
                        <svg width="12" height="12" className="sm:w-[13px] sm:h-[13px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg width="12" height="12" className="sm:w-[13px] sm:h-[13px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* WORKSPACE BODY */}
              <div className="p-5 sm:p-7">

              {/* NOTIFICATION */}
              {notification && (
                <div
                  style={{
                    backgroundColor: "#f0f5ff",
                    borderColor: "#bcd5ff",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    color: "#1c201a",
                  }}
                  className="mb-4 flex items-center justify-between rounded-xl px-4 py-2.5 text-xs font-medium animate-in fade-in duration-200"
                >
                  <span className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[#3158d5]">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <span>{notification}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setNotification(null)}
                    className="ml-2 font-bold text-[#3158d5] hover:text-[#1c201a] cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* LIVE STATS BAR (ABOVE TEXT BOX) */}
              <div className="mb-3.5 sm:mb-4 grid grid-cols-2 gap-2 sm:grid-cols-6 text-center text-xs">
                <div
                  style={{
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    backgroundColor: "#faf9f6",
                  }}
                  className="rounded-xl p-2.5"
                >
                  <div className="text-[#8e928a] text-[10px] uppercase font-bold tracking-wider">Words</div>
                  <div className="mt-0.5 text-sm sm:text-base font-extrabold text-[#1c201a]">{stats.words}</div>
                </div>

                <div
                  style={{
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    backgroundColor: "#faf9f6",
                  }}
                  className="rounded-xl p-2.5"
                >
                  <div className="text-[#8e928a] text-[10px] uppercase font-bold tracking-wider">Characters</div>
                  <div className="mt-0.5 text-sm sm:text-base font-extrabold text-[#1c201a]">{stats.charsWithSpaces}</div>
                </div>

                <div
                  style={{
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    backgroundColor: "#faf9f6",
                  }}
                  className="rounded-xl p-2.5"
                >
                  <div className="text-[#8e928a] text-[10px] uppercase font-bold tracking-wider">No Spaces</div>
                  <div className="mt-0.5 text-sm sm:text-base font-extrabold text-[#1c201a]">{stats.charsNoSpaces}</div>
                </div>

                <div
                  style={{
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    backgroundColor: "#faf9f6",
                  }}
                  className="rounded-xl p-2.5"
                >
                  <div className="text-[#8e928a] text-[10px] uppercase font-bold tracking-wider">Sentences</div>
                  <div className="mt-0.5 text-sm sm:text-base font-extrabold text-[#1c201a]">{stats.sentences}</div>
                </div>

                <div
                  style={{
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    backgroundColor: "#faf9f6",
                  }}
                  className="rounded-xl p-2.5"
                >
                  <div className="text-[#8e928a] text-[10px] uppercase font-bold tracking-wider">Lines</div>
                  <div className="mt-0.5 text-sm sm:text-base font-extrabold text-[#1c201a]">{stats.lines}</div>
                </div>

                <div
                  style={{
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    backgroundColor: "#faf9f6",
                  }}
                  className="rounded-xl p-2.5"
                >
                  <div className="text-[#8e928a] text-[10px] uppercase font-bold tracking-wider">Reading Time</div>
                  <div className="mt-0.5 text-sm sm:text-base font-extrabold text-[#3158d5]">{stats.readingTime}</div>
                </div>
              </div>

              {/* TEXTAREA INPUT */}
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={9}
                  placeholder="Type, paste, or load sample text here to transform its case..."
                  style={{
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    backgroundColor: "#fdfcf9",
                    color: "#1c201a",
                  }}
                  className="w-full rounded-2xl p-4 sm:p-5 text-sm sm:text-[15px] leading-relaxed outline-none transition focus:border-[#3158d5] focus:bg-white focus:ring-2 focus:ring-[#3158d5]/15 font-mono sm:font-sans resize-y"
                />
              </div>

              {/* ACTION BUTTONS: CASE TRANSFORMATIONS */}
              <div style={{ borderTop: "1px solid #e5e5df" }} className="mt-6 pt-5">
                <div className="mb-3.5 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#8e928a]">
                    Case Conversion Modes
                  </h3>
                  <span className="text-[11px] font-semibold text-[#767a74]">Click any button to apply</span>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                  {[
                    { key: "sentence", label: "Sentence case", sub: "First letter capitalized" },
                    { key: "lower", label: "lower case", sub: "all letters small" },
                    { key: "upper", label: "UPPER CASE", sub: "ALL LETTERS CAPITAL" },
                    { key: "title", label: "Title Case", sub: "Smart Headings" },
                    { key: "capitalized", label: "Capitalized", sub: "Every Word Initial" },
                    { key: "alternating", label: "aLtErNaTiNg", sub: "mOcKiNg cAsE" },
                    { key: "camel", label: "camelCase", sub: "JavaScript / Swift", mono: true },
                    { key: "pascal", label: "PascalCase", sub: "Classes & Types", mono: true },
                    { key: "snake", label: "snake_case", sub: "Python / SQL", mono: true },
                    { key: "kebab", label: "kebab-case", sub: "URLs & CSS", mono: true },
                    { key: "constant", label: "CONSTANT", sub: "ENV_VARIABLES", mono: true },
                    { key: "inverse", label: "iNVERSE cASE", sub: "Invert Letter Case" },
                  ].map((mode) => {
                    const isActive = activeTransform === mode.key;
                    const isHovered = hoveredModeKey === mode.key;

                    return (
                      <button
                        key={mode.key}
                        type="button"
                        onClick={() => transform(mode.key)}
                        onMouseEnter={() => setHoveredModeKey(mode.key)}
                        onMouseLeave={() => setHoveredModeKey(null)}
                        disabled={!text}
                        style={{
                          backgroundColor: isActive ? "#3158d5" : "transparent",
                          borderColor: isActive ? "#3158d5" : isHovered ? "#b8d1fc" : "#ebeae4",
                          borderWidth: "1px",
                          borderStyle: "solid",
                          transform: isHovered && !isActive ? "translateY(-2px)" : "translateY(0)",
                          boxShadow: isHovered && !isActive ? "0 8px 18px -4px rgba(49, 88, 213, 0.12)" : "none",
                          transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
                        }}
                        className="group relative flex flex-col items-center justify-center rounded-xl sm:rounded-2xl px-2.5 sm:px-4 py-2.5 sm:py-3.5 text-center cursor-pointer active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <span
                          style={{
                            color: isActive ? "#ffffff" : isHovered ? "#3158d5" : "#1c201a",
                            transition: "color 0.15s ease",
                          }}
                          className={`text-xs sm:text-[13px] font-bold tracking-tight ${
                            mode.mono ? "font-mono" : ""
                          }`}
                        >
                          {mode.label}
                        </span>
                        <span
                          style={{
                            color: isActive ? "#dbeafe" : isHovered ? "#3158d5" : "#8e928a",
                            transition: "color 0.15s ease",
                          }}
                          className="text-[10px] sm:text-[11px] mt-0.5"
                        >
                          {mode.sub}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TEXT CLEANERS & EXPORT */}
              <div
                style={{ borderTop: "1px solid #e5e5df" }}
                className="mt-5 pt-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#8e928a] sm:mr-1">
                    Cleaners:
                  </span>
                  <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:flex-wrap sm:items-center">
                    {[
                      { type: "extra-spaces" as const, label: "Remove Extra Spaces" },
                      { type: "empty-lines" as const, label: "Remove Blank Lines" },
                      { type: "smart-quotes" as const, label: "Straighten Quotes" },
                      { type: "strip-html" as const, label: "Strip HTML Tags" },
                    ].map((cleaner) => {
                      const isHovered = hoveredCleanerKey === cleaner.type;
                      return (
                        <button
                          key={cleaner.type}
                          type="button"
                          onClick={() => cleanText(cleaner.type)}
                          onMouseEnter={() => setHoveredCleanerKey(cleaner.type)}
                          onMouseLeave={() => setHoveredCleanerKey(null)}
                          disabled={!text}
                          style={{
                            backgroundColor: "transparent",
                            borderColor: isHovered ? "#b8d1fc" : "#ebeae4",
                            borderWidth: "1px",
                            borderStyle: "solid",
                            color: isHovered ? "#3158d5" : "#1c201a",
                            transform: isHovered && text ? "translateY(-2px)" : "translateY(0)",
                            boxShadow: isHovered && text ? "0 8px 18px -4px rgba(49, 88, 213, 0.12)" : "none",
                            transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
                          }}
                          className="rounded-xl px-2.5 sm:px-3.5 py-2 sm:py-1.5 text-center text-xs font-semibold active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-none"
                        >
                          {cleaner.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDownload}
                  onMouseEnter={() => setIsDownloadHovered(true)}
                  onMouseLeave={() => setIsDownloadHovered(false)}
                  disabled={!text}
                  style={{
                    backgroundColor: "transparent",
                    borderColor: isDownloadHovered ? "#b8d1fc" : "#ebeae4",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    color: isDownloadHovered ? "#3158d5" : "#1c201a",
                    transform: isDownloadHovered && text ? "translateY(-2px)" : "translateY(0)",
                    boxShadow: isDownloadHovered && text ? "0 8px 18px -4px rgba(49, 88, 213, 0.12)" : "none",
                    transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 sm:py-2 text-xs font-bold active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-none"
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      color: isDownloadHovered ? "#3158d5" : "#767a74",
                      transition: "color 0.15s ease",
                    }}
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Download .txt</span>
                </button>
              </div>
              </div>
            </div>
          </div>
        </section>

        {/* EDUCATIONAL GUIDE & FAQ SECTIONS (EXACT HOMEPAGE MATCH) */}
        <section
          style={{
            marginTop: "16px",
            paddingTop: "16px",
          }}
          className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 w-full pb-16 sm:pb-20"
        >
          <div className="mx-auto max-w-[980px] w-full space-y-4 sm:space-y-6">
            {/* SECTION 1: STYLE GUIDELINES INTRO */}
            <ScrollReveal>
              <div
                style={{
                  borderColor: "#e5e5df",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  backgroundColor: "#ffffff",
                }}
                className="rounded-2xl sm:rounded-[24px] p-6 sm:p-8 shadow-2xs"
              >
                <div className="text-xs font-bold uppercase tracking-wider text-[#3158d5] mb-1">
                  Style Guidelines
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#1c201a] tracking-tight">
                  Guide to Letter Casing &amp; Naming Conventions
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-[#575a53] leading-relaxed font-normal">
                  Learn when to apply different capitalization styles across writing, UX design, and software engineering with zero guesswork.
                </p>
              </div>
            </ScrollReveal>

            {/* SECTION 2: 6 BENTO CARDS */}
            <ScrollReveal delay={50}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div
                  style={{
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    backgroundColor: "#ffffff",
                  }}
                  className="rounded-2xl sm:rounded-[24px] p-5 shadow-2xs"
                >
                  <div className="text-xs font-bold text-[#3158d5] uppercase tracking-wide">Title Case</div>
                  <h3 className="mt-1 text-sm sm:text-base font-bold text-[#1c201a]">Headlines &amp; Book Titles</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#575a53] font-normal">
                    Follows editorial guidelines (such as Chicago, APA, or AP). Capitalizes major words (nouns, pronouns, verbs, adjectives), while leaving articles (a, an, the) and short prepositions (in, on, of) lowercase.
                  </p>
                </div>

                <div
                  style={{
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    backgroundColor: "#ffffff",
                  }}
                  className="rounded-2xl sm:rounded-[24px] p-5 shadow-2xs"
                >
                  <div className="text-xs font-bold text-[#3158d5] uppercase tracking-wide">Sentence case</div>
                  <h3 className="mt-1 text-sm sm:text-base font-bold text-[#1c201a]">Modern UX &amp; Body Copy</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#575a53] font-normal">
                    Capitalizes only the first letter of each sentence and proper nouns. Recommended by Apple, Google Material Design, and Microsoft for modern digital interfaces and button labels.
                  </p>
                </div>

                <div
                  style={{
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    backgroundColor: "#ffffff",
                  }}
                  className="rounded-2xl sm:rounded-[24px] p-5 shadow-2xs"
                >
                  <div className="text-xs font-bold text-[#3158d5] uppercase tracking-wide">camelCase &amp; PascalCase</div>
                  <h3 className="mt-1 text-sm sm:text-base font-bold text-[#1c201a]">Programming Identifiers</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#575a53] font-normal">
                    Removes spaces and joins words. camelCase begins lowercase (<code className="rounded bg-[#efeee7] px-1 py-0.5 font-mono text-[11px] text-[#1c201a]">userProfile</code>) for functions and variables. PascalCase begins uppercase (<code className="rounded bg-[#efeee7] px-1 py-0.5 font-mono text-[11px] text-[#1c201a]">UserProfile</code>) for classes and React components.
                  </p>
                </div>

                <div
                  style={{
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    backgroundColor: "#ffffff",
                  }}
                  className="rounded-2xl sm:rounded-[24px] p-5 shadow-2xs"
                >
                  <div className="text-xs font-bold text-[#3158d5] uppercase tracking-wide">snake_case &amp; CONSTANT</div>
                  <h3 className="mt-1 text-sm sm:text-base font-bold text-[#1c201a]">Database &amp; Environment Keys</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#575a53] font-normal">
                    Separates words using underscores. Widely used in Python, SQL schemas, and database column names. CONSTANT_CASE is standard for environment variables and immutable configuration settings.
                  </p>
                </div>

                <div
                  style={{
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    backgroundColor: "#ffffff",
                  }}
                  className="rounded-2xl sm:rounded-[24px] p-5 shadow-2xs"
                >
                  <div className="text-xs font-bold text-[#3158d5] uppercase tracking-wide">kebab-case</div>
                  <h3 className="mt-1 text-sm sm:text-base font-bold text-[#1c201a]">SEO URLs &amp; CSS Classes</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#575a53] font-normal">
                    Separates words with hyphens (<code className="rounded bg-[#efeee7] px-1 py-0.5 font-mono text-[11px] text-[#1c201a]">page-title-header</code>). Favored by Google search crawlers for clean slug URLs and standard in HTML/CSS class naming.
                  </p>
                </div>

                <div
                  style={{
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    backgroundColor: "#ffffff",
                  }}
                  className="rounded-2xl sm:rounded-[24px] p-5 shadow-2xs"
                >
                  <div className="text-xs font-bold text-[#3158d5] uppercase tracking-wide">Cleaners</div>
                  <h3 className="mt-1 text-sm sm:text-base font-bold text-[#1c201a]">Space &amp; Line Formatter</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#575a53] font-normal">
                    Instantly sanitizes copied text by eliminating double spaces, excessive line breaks, and converting curly smart quotes into standard straight quotes for clean code pasting.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            {/* SECTION 3: FAQ ACCORDION */}
            <ScrollReveal delay={100}>
              <div
                style={{
                  borderColor: "#e5e5df",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  backgroundColor: "#ffffff",
                }}
                className="rounded-2xl sm:rounded-[24px] p-6 sm:p-8 shadow-2xs"
              >
                <div className="text-xs font-bold uppercase tracking-wider text-[#3158d5] mb-1">
                  Frequently Asked Questions
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#1c201a] tracking-tight">
                  Case Converter FAQ
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-[#575a53] leading-relaxed font-normal">
                  Everything you need to know about text conversions, formatting guidelines, and browser privacy.
                </p>

                <div className="mt-6 space-y-3">
                  {FAQ_ITEMS.map((faq, index) => {
                    const isOpen = openFaqIndex === index;
                    return (
                      <div
                        key={faq.q}
                        style={{
                          borderColor: "#e5e5df",
                          borderWidth: "1px",
                          borderStyle: "solid",
                          backgroundColor: "#faf9f6",
                        }}
                        className="overflow-hidden rounded-2xl transition"
                      >
                        <button
                          type="button"
                          id={`faq-btn-${index}`}
                          aria-expanded={isOpen}
                          aria-controls={`faq-answer-${index}`}
                          onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                          className="flex w-full items-center justify-between p-4 sm:p-5 text-left transition hover:bg-[#f6f5f3] cursor-pointer"
                        >
                          <span className="text-xs sm:text-sm font-bold text-[#1c201a] pr-2">
                            {faq.q}
                          </span>
                          <span
                            className={`ml-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[#767a74] transition-transform duration-200 ${
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
                              className="px-4 sm:px-5 pt-3 pb-5 text-xs sm:text-sm leading-relaxed text-[#575a53] font-normal"
                            >
                              {faq.a}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </ScrollReveal>

            {/* SECTION 4: RELATED CREATIVE TOOLS */}
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
                      OCR Text Extraction
                    </div>
                    <div className="font-bold text-[#1c201a] group-hover:text-[#3158d5] transition">
                      Image to Text
                    </div>
                    <p className="mt-1 text-xs text-[#70746d]">
                      Convert photos, scans, and PDFs into clean editable text with zero data retention.
                    </p>
                  </Link>

                  <Link
                    href="/"
                    style={{
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      backgroundColor: "#faf9f6",
                    }}
                    className="group p-5 rounded-2xl hover:border-[#3158d5] hover:bg-white shadow-2xs transition"
                  >
                    <div className="text-xs font-bold text-[#3158d5] uppercase mb-1">
                      Visual Proofreading
                    </div>
                    <div className="font-bold text-[#1c201a] group-hover:text-[#3158d5] transition">
                      Spellense Checker
                    </div>
                    <p className="mt-1 text-xs text-[#70746d]">
                      Proofread graphics, artwork, and marketing flyers for spelling mistakes in-place.
                    </p>
                  </Link>

                  <Link
                    href="/us-uk-converter"
                    style={{
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      backgroundColor: "#faf9f6",
                    }}
                    className="group p-5 rounded-2xl hover:border-[#3158d5] hover:bg-white shadow-2xs transition"
                  >
                    <div className="text-xs font-bold text-[#3158d5] uppercase mb-1">
                      Regional Dialect
                    </div>
                    <div className="font-bold text-[#1c201a] group-hover:text-[#3158d5] transition">
                      US ↔ UK Converter
                    </div>
                    <p className="mt-1 text-xs text-[#70746d]">
                      Switch between American and British English spelling and regional vocabulary.
                    </p>
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <Footer currentPath="/case-converter" />
    </div>
  );
}
