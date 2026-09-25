"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

const LOWERCASE_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "en", "for", "if", "in", "nor",
  "of", "on", "or", "per", "the", "to", "via", "vs", "vs.", "v.", "with"
]);

const SAMPLE_TEXT = `the quick BROWN fox jumps OVER the lazy dog! this interactive text formatter by spellense allows creators, copywriters, and developers to switch between various casing styles effortlessly. whether you need clean "camelCase" for javascript variables, standard Title Case for marketing headlines, or sentence case for blog posts, spellense gets it done in real-time.`;

export default function CaseConverterClient() {
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeTransform, setActiveTransform] = useState<string | null>(null);

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

  // Conversion functions
  const transform = (type: string) => {
    if (!text) return;
    setActiveTransform(type);
    setTimeout(() => setActiveTransform(null), 700);

    switch (type) {
      case "sentence": {
        // Capitalize first letter of each sentence and after newlines
        const result = text.toLowerCase().replace(/(^\s*|[.!?]\s+|\n\s*)([a-z])/g, (_, prefix, char) => {
          return prefix + char.toUpperCase();
        });
        setText(result);
        break;
      }

      case "lower":
        setText(text.toLowerCase());
        break;

      case "upper":
        setText(text.toUpperCase());
        break;

      case "title": {
        // Smart title case: capitalize major words, keep articles/prepositions lowercase unless first/last word
        const lines = text.split("\n");
        const transformedLines = lines.map((line) => {
          const words = line.split(" ");
          return words
            .map((word, index) => {
              if (!word) return word;
              const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, "");
              const isFirstOrLast = index === 0 || index === words.length - 1;
              if (!isFirstOrLast && LOWERCASE_WORDS.has(cleanWord)) {
                return word.toLowerCase();
              }
              return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            })
            .join(" ");
        });
        setText(transformedLines.join("\n"));
        break;
      }

      case "capitalized": {
        // Capitalize every word
        const result = text.replace(/\b([a-zA-Z])/g, (char) => char.toUpperCase());
        setText(result);
        break;
      }

      case "alternating": {
        let capitalize = false;
        let result = "";
        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          if (/[a-zA-Z]/.test(char)) {
            result += capitalize ? char.toUpperCase() : char.toLowerCase();
            capitalize = !capitalize;
          } else {
            result += char;
          }
        }
        setText(result);
        break;
      }

      case "inverse": {
        let result = "";
        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          if (char === char.toUpperCase()) {
            result += char.toLowerCase();
          } else {
            result += char.toUpperCase();
          }
        }
        setText(result);
        break;
      }

      case "camel": {
        const words = text
          .replace(/[^a-zA-Z0-9\s_-]/g, "")
          .split(/[\s_-]+/)
          .filter(Boolean);
        if (words.length === 0) return;
        const camel = words
          .map((w, i) =>
            i === 0
              ? w.toLowerCase()
              : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
          )
          .join("");
        setText(camel);
        break;
      }

      case "pascal": {
        const words = text
          .replace(/[^a-zA-Z0-9\s_-]/g, "")
          .split(/[\s_-]+/)
          .filter(Boolean);
        if (words.length === 0) return;
        const pascal = words
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join("");
        setText(pascal);
        break;
      }

      case "snake": {
        const words = text
          .replace(/[^a-zA-Z0-9\s_-]/g, "")
          .trim()
          .split(/[\s_-]+/)
          .filter(Boolean);
        setText(words.map((w) => w.toLowerCase()).join("_"));
        break;
      }

      case "kebab": {
        const words = text
          .replace(/[^a-zA-Z0-9\s_-]/g, "")
          .trim()
          .split(/[\s_-]+/)
          .filter(Boolean);
        setText(words.map((w) => w.toLowerCase()).join("-"));
        break;
      }

      case "constant": {
        const words = text
          .replace(/[^a-zA-Z0-9\s_-]/g, "")
          .trim()
          .split(/[\s_-]+/)
          .filter(Boolean);
        setText(words.map((w) => w.toUpperCase()).join("_"));
        break;
      }

      default:
        break;
    }
  };

  // Text cleaners
  const cleanText = (type: "extra-spaces" | "empty-lines" | "smart-quotes" | "strip-html") => {
    if (!text) return;
    switch (type) {
      case "extra-spaces": {
        // Collapse multiple spaces into one and trim each line
        const result = text
          .split("\n")
          .map((line) => line.replace(/[ \t]+/g, " ").trim())
          .join("\n");
        setText(result);
        break;
      }
      case "empty-lines": {
        const result = text
          .split("\n")
          .filter((line) => line.trim().length > 0)
          .join("\n");
        setText(result);
        break;
      }
      case "smart-quotes": {
        const result = text
          .replace(/[\u2018\u2019]/g, "'")
          .replace(/[\u201C\u201D]/g, '"')
          .replace(/[\u00AB\u00BB]/g, '"');
        setText(result);
        break;
      }
      case "strip-html": {
        const result = text.replace(/<[^>]*>?/gm, "");
        setText(result);
        break;
      }
    }
  };

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
    <main className="min-h-screen bg-[#f0f6fe] text-black">
      {/* NAVBAR */}
      <Navbar />

      {/* HERO & TOOL SECTION */}
      <section className="relative overflow-hidden pb-20 pt-8 sm:pt-12">
        {/* Ambient background glows */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[560px] w-[920px] rounded-full bg-gradient-to-tr from-blue-400/20 via-indigo-400/20 to-purple-400/15 blur-[120px] opacity-80 animate-pulse-glow" />
        <div className="pointer-events-none absolute top-40 -left-28 h-[400px] w-[400px] rounded-full bg-blue-200/40 blur-[100px]" />
        <div className="pointer-events-none absolute top-36 -right-28 h-[420px] w-[420px] rounded-full bg-indigo-200/40 blur-[110px]" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* HEADER */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-white/80 px-3.5 py-1.5 shadow-xs shadow-blue-500/5 backdrop-blur-md">
              <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              <span className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 bg-clip-text text-[11px] font-bold uppercase tracking-wider text-transparent">
                Free Text Utility
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-extrabold tracking-[-1.5px] text-black sm:text-5xl lg:text-[52px]">
              Case Converter &amp; Text Formatter
            </h1>

            <p className="mx-auto mt-3 max-w-2xl text-[14px] leading-relaxed text-slate-600 sm:text-base">
              Convert words and sentences into any letter case instantly. Transform text into Title Case, UPPERCASE, lowercase, camelCase, snake_case, and more with 100% private in-browser processing.
            </p>
          </div>

          {/* MAIN TOOL CARD */}
          <div className="mt-8 rounded-3xl border border-white/90 bg-white/85 p-4 sm:p-7 shadow-xl shadow-blue-500/5 backdrop-blur-xl">
            {/* TOOLBAR */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 7 4 4 20 4 20 7" />
                    <line x1="9" y1="20" x2="15" y2="20" />
                    <line x1="12" y1="4" x2="12" y2="20" />
                  </svg>
                  Text Editor
                </span>
                <button
                  type="button"
                  onClick={() => setText(SAMPLE_TEXT)}
                  className="rounded-lg border border-slate-200/80 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-blue-600 cursor-pointer"
                >
                  Load Sample
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const clipText = await navigator.clipboard.readText();
                      if (clipText) setText(clipText);
                    } catch {}
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
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
                  onClick={() => setText("")}
                  disabled={!text}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition shadow-xs cursor-pointer ${
                    copied
                      ? "bg-emerald-600 text-white"
                      : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
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

            {/* TEXTAREA INPUT */}
            <div className="relative">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={9}
                placeholder="Type, paste, or load sample text here to transform its case..."
                className="w-full rounded-2xl border border-slate-200/90 bg-white/70 p-4 text-[15px] leading-relaxed text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 font-mono sm:font-sans"
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
                      ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.02]"
                      : "border-slate-200/90 bg-white hover:border-blue-300 hover:bg-blue-50/40 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                >
                  <span className="text-xs font-bold">Sentence case</span>
                  <span className={`text-[10px] ${activeTransform === "sentence" ? "text-blue-100" : "text-slate-400 group-hover:text-blue-600"}`}>
                    First letter capitalized
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => transform("lower")}
                  disabled={!text}
                  className={`group flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all cursor-pointer ${
                    activeTransform === "lower"
                      ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.02]"
                      : "border-slate-200/90 bg-white hover:border-blue-300 hover:bg-blue-50/40 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                >
                  <span className="text-xs font-bold">lower case</span>
                  <span className={`text-[10px] ${activeTransform === "lower" ? "text-blue-100" : "text-slate-400 group-hover:text-blue-600"}`}>
                    all letters small
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => transform("upper")}
                  disabled={!text}
                  className={`group flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all cursor-pointer ${
                    activeTransform === "upper"
                      ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.02]"
                      : "border-slate-200/90 bg-white hover:border-blue-300 hover:bg-blue-50/40 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                >
                  <span className="text-xs font-bold uppercase">UPPER CASE</span>
                  <span className={`text-[10px] ${activeTransform === "upper" ? "text-blue-100" : "text-slate-400 group-hover:text-blue-600"}`}>
                    ALL LETTERS CAPITAL
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => transform("title")}
                  disabled={!text}
                  className={`group flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all cursor-pointer ${
                    activeTransform === "title"
                      ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.02]"
                      : "border-slate-200/90 bg-white hover:border-blue-300 hover:bg-blue-50/40 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                >
                  <span className="text-xs font-bold">Title Case</span>
                  <span className={`text-[10px] ${activeTransform === "title" ? "text-blue-100" : "text-slate-400 group-hover:text-blue-600"}`}>
                    Smart Headings
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => transform("capitalized")}
                  disabled={!text}
                  className={`group flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all cursor-pointer ${
                    activeTransform === "capitalized"
                      ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.02]"
                      : "border-slate-200/90 bg-white hover:border-blue-300 hover:bg-blue-50/40 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                >
                  <span className="text-xs font-bold">Capitalized</span>
                  <span className={`text-[10px] ${activeTransform === "capitalized" ? "text-blue-100" : "text-slate-400 group-hover:text-blue-600"}`}>
                    Every Word Initial
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => transform("alternating")}
                  disabled={!text}
                  className={`group flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all cursor-pointer ${
                    activeTransform === "alternating"
                      ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.02]"
                      : "border-slate-200/90 bg-white hover:border-blue-300 hover:bg-blue-50/40 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                >
                  <span className="text-xs font-bold">aLtErNaTiNg</span>
                  <span className={`text-[10px] ${activeTransform === "alternating" ? "text-blue-100" : "text-slate-400 group-hover:text-blue-600"}`}>
                    mOcKiNg cAsE
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => transform("camel")}
                  disabled={!text}
                  className={`group flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all cursor-pointer ${
                    activeTransform === "camel"
                      ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.02]"
                      : "border-slate-200/90 bg-white hover:border-blue-300 hover:bg-blue-50/40 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                >
                  <span className="text-xs font-bold font-mono">camelCase</span>
                  <span className={`text-[10px] ${activeTransform === "camel" ? "text-blue-100" : "text-slate-400 group-hover:text-blue-600"}`}>
                    JavaScript / Swift
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => transform("pascal")}
                  disabled={!text}
                  className={`group flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all cursor-pointer ${
                    activeTransform === "pascal"
                      ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.02]"
                      : "border-slate-200/90 bg-white hover:border-blue-300 hover:bg-blue-50/40 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                >
                  <span className="text-xs font-bold font-mono">PascalCase</span>
                  <span className={`text-[10px] ${activeTransform === "pascal" ? "text-blue-100" : "text-slate-400 group-hover:text-blue-600"}`}>
                    Classes &amp; Types
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => transform("snake")}
                  disabled={!text}
                  className={`group flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all cursor-pointer ${
                    activeTransform === "snake"
                      ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.02]"
                      : "border-slate-200/90 bg-white hover:border-blue-300 hover:bg-blue-50/40 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                >
                  <span className="text-xs font-bold font-mono">snake_case</span>
                  <span className={`text-[10px] ${activeTransform === "snake" ? "text-blue-100" : "text-slate-400 group-hover:text-blue-600"}`}>
                    Python / SQL
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => transform("kebab")}
                  disabled={!text}
                  className={`group flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all cursor-pointer ${
                    activeTransform === "kebab"
                      ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.02]"
                      : "border-slate-200/90 bg-white hover:border-blue-300 hover:bg-blue-50/40 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                >
                  <span className="text-xs font-bold font-mono">kebab-case</span>
                  <span className={`text-[10px] ${activeTransform === "kebab" ? "text-blue-100" : "text-slate-400 group-hover:text-blue-600"}`}>
                    URLs &amp; CSS
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => transform("constant")}
                  disabled={!text}
                  className={`group flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all cursor-pointer ${
                    activeTransform === "constant"
                      ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.02]"
                      : "border-slate-200/90 bg-white hover:border-blue-300 hover:bg-blue-50/40 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                >
                  <span className="text-xs font-bold font-mono">CONSTANT</span>
                  <span className={`text-[10px] ${activeTransform === "constant" ? "text-blue-100" : "text-slate-400 group-hover:text-blue-600"}`}>
                    ENV_VARIABLES
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => transform("inverse")}
                  disabled={!text}
                  className={`group flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all cursor-pointer ${
                    activeTransform === "inverse"
                      ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.02]"
                      : "border-slate-200/90 bg-white hover:border-blue-300 hover:bg-blue-50/40 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                >
                  <span className="text-xs font-bold">iNVERSE cASE</span>
                  <span className={`text-[10px] ${activeTransform === "inverse" ? "text-blue-100" : "text-slate-400 group-hover:text-blue-600"}`}>
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
                  className="rounded-xl border border-slate-200/80 bg-slate-50/60 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-white hover:text-blue-600 hover:border-blue-200 disabled:opacity-40 cursor-pointer"
                >
                  Remove Extra Spaces
                </button>
                <button
                  type="button"
                  onClick={() => cleanText("empty-lines")}
                  disabled={!text}
                  className="rounded-xl border border-slate-200/80 bg-slate-50/60 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-white hover:text-blue-600 hover:border-blue-200 disabled:opacity-40 cursor-pointer"
                >
                  Remove Blank Lines
                </button>
                <button
                  type="button"
                  onClick={() => cleanText("smart-quotes")}
                  disabled={!text}
                  className="rounded-xl border border-slate-200/80 bg-slate-50/60 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-white hover:text-blue-600 hover:border-blue-200 disabled:opacity-40 cursor-pointer"
                >
                  Straighten Quotes (&quot; &apos;)
                </button>
                <button
                  type="button"
                  onClick={() => cleanText("strip-html")}
                  disabled={!text}
                  className="rounded-xl border border-slate-200/80 bg-slate-50/60 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-white hover:text-blue-600 hover:border-blue-200 disabled:opacity-40 cursor-pointer"
                >
                  Strip HTML Tags
                </button>
              </div>

              <button
                type="button"
                onClick={handleDownload}
                disabled={!text}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 hover:text-blue-600 disabled:opacity-40 cursor-pointer"
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

          {/* CROSS-PROMO CTA CARD */}
          <div className="mt-8 rounded-3xl border border-blue-200/80 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-white p-6 sm:p-7 shadow-xs backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-md bg-blue-100/80 px-2 py-0.5 text-[11px] font-bold text-blue-700 uppercase tracking-wide">
                Need to check spelling?
              </div>
              <h3 className="mt-1.5 text-base sm:text-lg font-bold text-slate-900">
                Catch typos in images, slides, DOCX, or PDFs
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Run Spellense visual OCR &amp; grammar proofreader with zero sign-up.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-6 py-3 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-600/35 shrink-0"
            >
              <span>Open Spellense Checker</span>
              <span>→</span>
            </Link>
          </div>

          {/* EDUCATIONAL GUIDE SECTION */}
          <div className="mt-14 space-y-6">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Guide to Letter Casing &amp; Naming Conventions
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-500">
                Learn when to apply different capitalization styles across writing, design, and software engineering.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-xs backdrop-blur-sm">
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wide">Title Case</div>
                <h3 className="mt-1 text-base font-bold text-slate-900">Headlines &amp; Book Titles</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  Follows editorial guidelines (such as Chicago, APA, or AP). Capitalizes major words (nouns, pronouns, verbs, adjectives), while leaving articles (a, an, the) and short prepositions (in, on, of) lowercase.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-xs backdrop-blur-sm">
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wide">Sentence case</div>
                <h3 className="mt-1 text-base font-bold text-slate-900">Modern UX &amp; Body Copy</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  Capitalizes only the first letter of each sentence and proper nouns. Recommended by Apple, Google Material Design, and Microsoft for modern digital interfaces and button labels.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-xs backdrop-blur-sm">
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wide">camelCase &amp; PascalCase</div>
                <h3 className="mt-1 text-base font-bold text-slate-900">Programming Identifiers</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  Removes spaces and joins words. camelCase begins lowercase (<code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">userProfile</code>) for functions and variables. PascalCase begins uppercase (<code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">UserProfile</code>) for classes and React components.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-xs backdrop-blur-sm">
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wide">snake_case &amp; CONSTANT</div>
                <h3 className="mt-1 text-base font-bold text-slate-900">Database &amp; Environment Keys</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  Separates words using underscores. Widely used in Python, SQL schemas, and database column names. CONSTANT_CASE is standard for environment variables and immutable configuration settings.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-xs backdrop-blur-sm">
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wide">kebab-case</div>
                <h3 className="mt-1 text-base font-bold text-slate-900">SEO URLs &amp; CSS Classes</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  Separates words with hyphens (<code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">page-title-header</code>). Favored by Google search crawlers for clean slug URLs and standard in HTML/CSS class naming.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-xs backdrop-blur-sm">
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wide">Cleaners</div>
                <h3 className="mt-1 text-base font-bold text-slate-900">Space &amp; Line Formatter</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  Instantly sanitizes copied text by eliminating double spaces, excessive line breaks, and converting curly smart quotes into standard straight quotes for clean code pasting.
                </p>
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
              <Link href="/case-converter" className="font-semibold text-blue-600">
                Case Converter
              </Link>
              <Link href="/us-uk-converter" className="transition hover:text-gray-700">
                US ↔ UK Dialect
              </Link>
              <Link href="/image-to-text" className="transition hover:text-gray-700">
                Image to Text
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

