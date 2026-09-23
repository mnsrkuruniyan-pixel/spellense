"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

interface DesignIssue {
  id: string;
  category: "copy" | "contrast" | "margin" | "typography" | "resolution";
  severity: "error" | "warning" | "suggestion";
  title: string;
  description: string;
  originalText?: string;
  suggestedFix?: string;
  bbox: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

interface DesignCheckResponse {
  success: boolean;
  score: number;
  dimensions: {
    width: number;
    height: number;
    aspectRatio: number;
  };
  categoryScores: {
    copyScore: number;
    contrastScore: number;
    marginScore: number;
    qualityScore: number;
  };
  issues: DesignIssue[];
  engine: "hybrid-gemini" | "local-deterministic";
  error?: string;
}

const ANALYSIS_STEPS = [
  "Extracting typography & spatial bounds...",
  "Calculating WCAG contrast & readability ratios...",
  "Inspecting print bleed & safe-zone margins...",
  "Analyzing grammar, phrasing & copy hierarchy...",
  "Finalizing design pre-flight readiness score...",
];

export default function DesignCheckClient() {
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [result, setResult] = useState<DesignCheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "copy" | "contrast" | "margin" | "other">("all");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [dismissedIssueIds, setDismissedIssueIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Canvas Viewport State
  const [zoom, setZoom] = useState(1);
  const [panning, setPanning] = useState(false);
  const [naturalDims, setNaturalDims] = useState<{ width: number; height: number } | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const panStartRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const initialFittedRef = useRef(false);

  // Animate multi-step loading message
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev + 1) % ANALYSIS_STEPS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [loading]);

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.type.startsWith("image/")) {
      setError("Please upload an image file (PNG, JPG, WebP, or SVG).");
      return;
    }

    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }

    setFile(selectedFile);
    setImageUrl(URL.createObjectURL(selectedFile));
    setError(null);
    setResult(null);
    setDismissedIssueIds(new Set());
    setSelectedIssueId(null);
    setZoom(1);
    setNaturalDims(null);
    initialFittedRef.current = false;

    // Trigger analysis
    runDesignCheck(selectedFile);
  };

  const prepareOptimizedImage = async (
    sourceFile: File
  ): Promise<{ file: File; originalWidth: number; originalHeight: number }> => {
    return new Promise((resolve) => {
      if (!sourceFile.type.startsWith("image/") || sourceFile.type.includes("svg")) {
        resolve({ file: sourceFile, originalWidth: 0, originalHeight: 0 });
        return;
      }

      const img = new Image();
      const objectUrl = URL.createObjectURL(sourceFile);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const originalWidth = img.naturalWidth || img.width;
        const originalHeight = img.naturalHeight || img.height;

        // If file is already under 3MB and dimensions are reasonable, upload directly
        if (sourceFile.size <= 3 * 1024 * 1024 && originalWidth <= 2200 && originalHeight <= 2200) {
          resolve({ file: sourceFile, originalWidth, originalHeight });
          return;
        }

        // Proportional scale to fit within 2200px max dimension (bypasses 4.5MB server limit)
        const maxDim = 2200;
        let targetWidth = originalWidth;
        let targetHeight = originalHeight;

        if (targetWidth > maxDim || targetHeight > maxDim) {
          if (targetWidth > targetHeight) {
            targetHeight = Math.round((targetHeight * maxDim) / targetWidth);
            targetWidth = maxDim;
          } else {
            targetWidth = Math.round((targetWidth * maxDim) / targetHeight);
            targetHeight = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          resolve({ file: sourceFile, originalWidth, originalHeight });
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const optimized = new File(
                [blob],
                sourceFile.name.replace(/\.[^/.]+$/, ".jpg"),
                { type: "image/jpeg" }
              );
              resolve({ file: optimized, originalWidth, originalHeight });
            } else {
              resolve({ file: sourceFile, originalWidth, originalHeight });
            }
          },
          "image/jpeg",
          0.88
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({ file: sourceFile, originalWidth: 0, originalHeight: 0 });
      };

      img.src = objectUrl;
    });
  };

  const runDesignCheck = async (uploadFile: File) => {
    setLoading(true);
    setCurrentStepIndex(0);
    setError(null);

    try {
      const { file: processedFile, originalWidth, originalHeight } =
        await prepareOptimizedImage(uploadFile);

      const formData = new FormData();
      formData.append("file", processedFile);
      if (originalWidth && originalHeight) {
        formData.append("originalWidth", String(originalWidth));
        formData.append("originalHeight", String(originalHeight));
      }

      const res = await fetch("/api/design-check", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        if (res.status === 413) {
          throw new Error(
            "The design file is too large for the server to process. Please try an image under 15MB."
          );
        }
        let errorMsg = `Server error (${res.status})`;
        try {
          const errorJson = await res.json();
          if (errorJson.error) errorMsg = errorJson.error;
        } catch {
          const errorText = await res.text();
          if (errorText && errorText.length < 200) errorMsg = errorText;
        }
        throw new Error(errorMsg);
      }

      const data: DesignCheckResponse = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to analyze design file.");
      }

      setResult(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during design inspection."
      );
    } finally {
      setLoading(false);
    }
  };

  // Canvas Display Dimensions
  const displayDims = useMemo(() => {
    if (!naturalDims) return null;
    const baseHeight = 440;
    const aspectRatio = naturalDims.width / Math.max(naturalDims.height, 1);
    const width = baseHeight * aspectRatio * zoom;
    const height = baseHeight * zoom;
    return { width, height };
  }, [naturalDims, zoom]);

  const panHorizontal = (direction: "left" | "right") => {
    if (!viewportRef.current) return;
    const delta = direction === "left" ? -280 : 280;
    viewportRef.current.scrollBy({ left: delta, behavior: "smooth" });
  };

  const handleFitWidth = () => {
    if (!viewportRef.current || !naturalDims) return;
    const availableWidth = viewportRef.current.clientWidth - 48;
    const baseHeight = 440;
    const baseWidth = baseHeight * (naturalDims.width / Math.max(naturalDims.height, 1));
    if (baseWidth <= 0 || availableWidth <= 0) return;
    const fitScale = Math.max(0.15, Math.min(2.5, availableWidth / baseWidth));
    setZoom(Math.round(fitScale * 100) / 100);
    setTimeout(() => {
      if (viewportRef.current) {
        viewportRef.current.scrollLeft = 0;
      }
    }, 50);
  };

  const handleResetView = () => {
    setZoom(1);
    if (viewportRef.current) {
      viewportRef.current.scrollLeft = 0;
      viewportRef.current.scrollTop = 0;
    }
  };

  const activeIssues = useMemo(() => {
    if (!result) return [];
    return result.issues.filter((i) => !dismissedIssueIds.has(i.id));
  }, [result, dismissedIssueIds]);

  const filteredIssues = useMemo(() => {
    if (activeFilter === "all") return activeIssues;
    if (activeFilter === "copy") return activeIssues.filter((i) => i.category === "copy");
    if (activeFilter === "contrast") return activeIssues.filter((i) => i.category === "contrast");
    if (activeFilter === "margin") return activeIssues.filter((i) => i.category === "margin");
    return activeIssues.filter((i) => i.category !== "copy" && i.category !== "contrast" && i.category !== "margin");
  }, [activeIssues, activeFilter]);

  const handleDismiss = (id: string) => {
    setDismissedIssueIds((prev) => new Set([...prev, id]));
    if (selectedIssueId === id) {
      setSelectedIssueId(null);
    }
  };

  const handleCopyFix = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadReport = () => {
    if (!result || !file) return;
    const lines = [
      "===========================================================",
      "           SPELLENSE DESIGN PRE-FLIGHT AUDIT REPORT        ",
      "===========================================================",
      `File Name: ${file.name}`,
      `Dimensions: ${result.dimensions.width} x ${result.dimensions.height} px (Aspect: ${result.dimensions.aspectRatio})`,
      `Overall Readiness Score: ${result.score}/100`,
      `Inspection Engine: ${result.engine}`,
      `Date: ${new Date().toLocaleString()}`,
      "",
      "--- CATEGORY SCORES ---",
      `Copy & Grammar: ${result.categoryScores.copyScore}/100`,
      `Readability & Contrast: ${result.categoryScores.contrastScore}/100`,
      `Margins & Safe Zone: ${result.categoryScores.marginScore}/100`,
      `Resolution Quality: ${result.categoryScores.qualityScore}/100`,
      "",
      `--- DETECTED ISSUES (${activeIssues.length}) ---`,
      ...activeIssues.map((issue, idx) => {
        return [
          `\n[${idx + 1}] ${issue.title.toUpperCase()} (${issue.category.toUpperCase()} - ${issue.severity.toUpperCase()})`,
          `Problem: ${issue.description}`,
          issue.originalText ? `Original Text: "${issue.originalText}"` : null,
          issue.suggestedFix ? `Recommendation: ${issue.suggestedFix}` : null,
        ]
          .filter(Boolean)
          .join("\n");
      }),
      "\n===========================================================",
      "Generated by Spellense Design Check (https://spellense.com/design-check)",
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `design-audit-${file.name.replace(/\.[^/.]+$/, "")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] bg-dot-pattern text-slate-800 font-sans selection:bg-blue-500/10 selection:text-blue-600 relative overflow-x-hidden">
      {/* Ambient background glows / mesh across full page */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[560px] w-[920px] rounded-full bg-gradient-to-tr from-blue-400/20 via-indigo-400/20 to-purple-400/15 blur-[120px] opacity-80 animate-pulse-glow" />
      <div className="pointer-events-none absolute top-40 -left-28 h-[420px] w-[420px] rounded-full bg-blue-200/40 blur-[100px]" />
      <div className="pointer-events-none absolute top-36 -right-28 h-[440px] w-[440px] rounded-full bg-indigo-200/40 blur-[110px]" />
      <div className="pointer-events-none absolute top-[700px] left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-blue-100/35 blur-[130px]" />
      <div className="pointer-events-none absolute top-[1200px] -right-20 h-[500px] w-[500px] rounded-full bg-indigo-100/30 blur-[120px]" />

      <Navbar />

      {/* HERO SECTION */}
      <section className="relative">
        <div className="relative mx-auto max-w-7xl px-5 pb-10 pt-4 sm:px-6 sm:pt-6 lg:px-10 lg:pt-7">
          {/* HERO TEXT */}
          <div className="mx-auto max-w-4xl text-center">
            {/* TOP ANNOUNCEMENT PILL */}
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-white/80 px-3.5 py-1.5 shadow-xs shadow-blue-500/5 backdrop-blur-md transition-all hover:border-blue-300">
              <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              <span className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 bg-clip-text text-[11px] font-bold uppercase tracking-wider text-transparent">
                AI Design Pre-Flight Quality Check
              </span>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                v1.0
              </span>
            </div>

            <h1 className="mt-3 text-[32px] font-extrabold leading-[1.12] tracking-[-1.8px] text-slate-900 sm:text-[46px] lg:text-[54px]">
              Catch Design, Copy &amp; Print Errors{" "}
              <br />
              <span className="inline-block whitespace-nowrap bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                before you publish.
              </span>
            </h1>

            <p className="mx-auto mt-2.5 max-w-[640px] text-[14px] leading-relaxed text-slate-600 sm:text-[15px]">
              Automated visual inspection for posters, ads, flyers, and banners.
              <br className="hidden sm:inline" />
              Detect typos, grammar issues, low WCAG contrast, and bleed cutoffs directly on your canvas.
            </p>

            {/* QUICK HIGHLIGHT PILLS */}
            <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-slate-500">
              <div className="flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/70 px-3 py-1 shadow-2xs backdrop-blur-xs">
                <svg className="h-3.5 w-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                <span>WCAG Contrast Math</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/70 px-3 py-1 shadow-2xs backdrop-blur-xs">
                <svg className="h-3.5 w-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                <span>Bleed &amp; Margin Safe-Zones</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/70 px-3 py-1 shadow-2xs backdrop-blur-xs">
                <svg className="h-3.5 w-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                <span>AI Copy &amp; Grammar Proofing</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">

        {/* UPLOAD ZONE (WHEN NO FILE OR WHEN CHANGING) */}
        {!result && !loading && (
          <div className="mx-auto mt-10 max-w-3xl">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const droppedFile = e.dataTransfer.files[0];
                if (droppedFile) handleFileSelect(droppedFile);
              }}
              onClick={() => fileInputRef.current?.click()}
              className="group relative flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300/90 bg-white/95 backdrop-blur-md p-10 text-center shadow-xl shadow-slate-200/40 transition hover:border-blue-500 hover:bg-blue-50/20 hover:shadow-2xl sm:p-14"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (selected) handleFileSelect(selected);
                }}
              />

              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>

              <h2 className="mt-5 text-lg font-bold text-slate-800">
                Drop your design here, or <span className="text-blue-600 underline underline-offset-4">browse files</span>
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Supports high-res PNG, JPG, WebP, SVG • Up to 25MB
              </p>

              {/* Supported types chips */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-slate-600">
                <span className="rounded-lg bg-slate-100 px-2.5 py-1">🖼️ Posters &amp; Flyers</span>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1">📱 Social Media Ads</span>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1">🏷️ Banners &amp; Signage</span>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1">📊 Slide Creatives</span>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-sm font-medium text-rose-700">
                {error}
              </div>
            )}
          </div>
        )}

        {/* HOW IT WORKS / FEATURE HIGHLIGHTS (WHEN NO FILE UPLOADED) */}
        {!result && !loading && (
          <div className="mx-auto mt-16 max-w-5xl space-y-16">
            {/* 3 CORE PRE-FLIGHT CHECKS */}
            <div>
              <div className="text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                  Pre-Flight Automated QA
                </span>
                <h3 className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                  Catch Costly Design Mistakes Before Publishing
                </h3>
                <p className="mx-auto mt-2 max-w-2xl text-xs text-slate-500 sm:text-sm">
                  Spellense runs visual, mathematical, and AI audits across your graphic creatives to ensure print and social media readiness.
                </p>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
                {/* Card 1: WCAG Contrast */}
                <div className="group rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">
                    👁️
                  </div>
                  <h4 className="mt-4 text-base font-bold text-slate-900">
                    WCAG Contrast Math
                  </h4>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    Measures pixel luminance ratio between text and its underlying background to guarantee readability under harsh sunlight and low-brightness phone screens.
                  </p>
                  <div className="mt-4 flex items-center gap-1.5 text-[11px] font-semibold text-blue-600">
                    <span>4.5:1 AA Standard</span>
                    <span>•</span>
                    <span>Instant Math</span>
                  </div>
                </div>

                {/* Card 2: Margins & Bleed */}
                <div className="group rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-2xl">
                    📐
                  </div>
                  <h4 className="mt-4 text-base font-bold text-slate-900">
                    Margin &amp; Bleed Safe-Zones
                  </h4>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    Identifies critical copy, discount codes, or brand logos placed within 3.5% of canvas borders, preventing accidental cutting or social app UI cropping.
                  </p>
                  <div className="mt-4 flex items-center gap-1.5 text-[11px] font-semibold text-amber-700">
                    <span>Safe-Zone Guard</span>
                    <span>•</span>
                    <span>Print Ready</span>
                  </div>
                </div>

                {/* Card 3: AI Copy & Grammar */}
                <div className="group rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-2xl">
                    ✍️
                  </div>
                  <h4 className="mt-4 text-base font-bold text-slate-900">
                    AI Copy &amp; Headline QA
                  </h4>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    Multimodal vision AI proofreads visible slogans, body paragraphs, and promo banners to catch embarrassing grammar errors, typos, and missing articles.
                  </p>
                  <div className="mt-4 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                    <span>Gemini AI Vision</span>
                    <span>•</span>
                    <span>Zero Storage</span>
                  </div>
                </div>
              </div>
            </div>

            {/* HOW IT WORKS 3-STEP PROCESS */}
            <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-50/80 via-white to-blue-50/40 p-8 sm:p-10 shadow-xs">
              <div className="text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                  Step-by-Step Workflow
                </span>
                <h3 className="mt-1 text-xl font-extrabold text-slate-900 sm:text-2xl">
                  How Design Check Works
                </h3>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-md shadow-blue-500/20">
                    1
                  </div>
                  <h5 className="mt-3 text-sm font-bold text-slate-900">Upload Your Artwork</h5>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    Drop high-res PNG, JPG, or WebP posters, flyers, or ad creatives.
                  </p>
                </div>

                <div className="flex flex-col items-center text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white shadow-md shadow-indigo-500/20">
                    2
                  </div>
                  <h5 className="mt-3 text-sm font-bold text-slate-900">Automated Inspection</h5>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    Parallel algorithms compute WCAG contrast ratios, safe zones, and AI copy analysis.
                  </p>
                </div>

                <div className="flex flex-col items-center text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white shadow-md shadow-violet-500/20">
                    3
                  </div>
                  <h5 className="mt-3 text-sm font-bold text-slate-900">Interactive Canvas Fixes</h5>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    Click color-coded markers directly on the design to inspect and copy recommendations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LOADING PROGRESS STATE */}
        {loading && (
          <div className="mx-auto mt-12 max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl sm:p-12">
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-blue-100 animate-ping" />
              <div className="h-16 w-16 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
              <span className="absolute text-xl">🎨</span>
            </div>

            <h2 className="mt-6 text-xl font-bold text-slate-900">
              Running Pre-Flight Inspection...
            </h2>
            <p className="mt-2 text-sm font-medium text-blue-600 animate-pulse">
              {ANALYSIS_STEPS[currentStepIndex]}
            </p>

            <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-linear-to-r from-blue-500 to-indigo-600 transition-all duration-500" style={{ width: `${((currentStepIndex + 1) / ANALYSIS_STEPS.length) * 100}%` }} />
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Scanning typography, WCAG contrast, edge bleed margins &amp; spelling
            </p>
          </div>
        )}

        {/* RESULT DASHBOARD */}
        {result && imageUrl && (
          <div className="mt-8 space-y-6">
            {/* TOP SUMMARY BAR */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${
                  result.score >= 90
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : result.score >= 70
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}>
                  {result.score}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">
                      {result.score >= 90
                        ? "Publication Ready"
                        : result.score >= 70
                        ? "Good with Minor Notices"
                        : "Review Recommended"}
                    </h2>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 uppercase">
                      {result.engine === "hybrid-gemini" ? "AI Vision" : "Deterministic"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {activeIssues.length === 0
                      ? "Zero errors or warnings detected. Artwork is ready to print or publish."
                      : `${activeIssues.length} item${activeIssues.length === 1 ? "" : "s"} flagged on this design canvas.`}
                  </p>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadReport}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 active:scale-95"
                >
                  <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export Audit Report
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 active:scale-95"
                >
                  Check Another Design
                </button>
              </div>
            </div>

            {/* TWO COLUMN INSPECTOR */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* LEFT COLUMN: INTERACTIVE VISUAL CANVAS (7 COLS) */}
              <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/40 lg:col-span-7">
                <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse" />
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Visual Pre-Flight Canvas
                    </p>
                  </div>
                  <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-500">
                    <svg className="h-3 w-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>
                    Drag to pan • Click markers to inspect
                  </span>
                </div>

                <div className="bg-slate-200 p-4">
                  <div
                    ref={viewportRef}
                    className={`relative flex h-[380px] sm:h-[480px] lg:h-[588px] items-start justify-start overflow-auto select-none ${
                      panning ? "cursor-grabbing touch-none" : "cursor-grab"
                    }`}
                    onWheel={(event) => {
                      if (event.ctrlKey || event.metaKey) {
                        event.preventDefault();
                        const delta = event.deltaY > 0 ? -0.15 : 0.15;
                        setZoom((value) =>
                          Math.max(0.2, Math.min(3, Math.round((value + delta) * 100) / 100))
                        );
                      }
                    }}
                    onPointerDown={(event) => {
                      if (event.button !== 0 && event.pointerType === "mouse") return;
                      if (!viewportRef.current) return;
                      panStartRef.current = {
                        x: event.clientX,
                        y: event.clientY,
                        left: viewportRef.current.scrollLeft,
                        top: viewportRef.current.scrollTop,
                      };
                      setPanning(true);
                      try {
                        event.currentTarget.setPointerCapture(event.pointerId);
                      } catch {}
                    }}
                    onPointerMove={(event) => {
                      const start = panStartRef.current;
                      if (!start || !viewportRef.current) return;
                      viewportRef.current.scrollLeft = start.left - (event.clientX - start.x);
                      viewportRef.current.scrollTop = start.top - (event.clientY - start.y);
                    }}
                    onPointerUp={(event) => {
                      panStartRef.current = null;
                      setPanning(false);
                      try {
                        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                          event.currentTarget.releasePointerCapture(event.pointerId);
                        }
                      } catch {}
                    }}
                    onPointerCancel={() => {
                      panStartRef.current = null;
                      setPanning(false);
                    }}
                  >
                    <div
                      className="relative m-auto shrink-0 bg-white shadow-md"
                      style={
                        displayDims
                          ? { width: `${displayDims.width}px`, height: `${displayDims.height}px` }
                          : undefined
                      }
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt="Uploaded design preview"
                        onLoad={(e) => {
                          const { naturalWidth, naturalHeight } = e.currentTarget;
                          if (naturalWidth && naturalHeight) {
                            setNaturalDims({ width: naturalWidth, height: naturalHeight });
                            if (!initialFittedRef.current && viewportRef.current) {
                              initialFittedRef.current = true;
                              const aspect = naturalWidth / naturalHeight;
                              if (aspect > 2.0) {
                                const availableWidth = viewportRef.current.clientWidth - 48;
                                const baseWidth = 440 * aspect;
                                if (baseWidth > availableWidth && availableWidth > 0) {
                                  const fitScale = Math.max(0.15, Math.min(1, availableWidth / baseWidth));
                                  setZoom(Math.round(fitScale * 100) / 100);
                                }
                              }
                            }
                          }
                        }}
                        className={
                          displayDims
                            ? "block h-full w-full object-contain pointer-events-none select-none"
                            : "block max-h-[380px] sm:max-h-[480px] lg:max-h-[588px] max-w-none object-contain pointer-events-none select-none"
                        }
                        draggable={false}
                      />

                      {/* VISUAL MARKERS OVERLAY */}
                      {activeIssues.map((issue) => {
                        const isSelected = selectedIssueId === issue.id;
                        const isRed = issue.category === "copy";
                        const isOrange = issue.category === "contrast";
                        const isYellow = issue.category === "margin";

                        const borderColor = isRed
                          ? "border-rose-500"
                          : isOrange
                          ? "border-amber-500"
                          : isYellow
                          ? "border-yellow-500"
                          : "border-blue-500";

                        const bgColor = isRed
                          ? "bg-rose-500/20"
                          : isOrange
                          ? "bg-amber-500/20"
                          : isYellow
                          ? "bg-yellow-500/20"
                          : "bg-blue-500/20";

                        const badgeBg = isRed
                          ? "bg-rose-600"
                          : isOrange
                          ? "bg-amber-600"
                          : isYellow
                          ? "bg-yellow-600"
                          : "bg-blue-600";

                        return (
                          <div
                            key={issue.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedIssueId(issue.id);
                              // Smooth scroll right card into view
                              document.getElementById(`issue-card-${issue.id}`)?.scrollIntoView({
                                behavior: "smooth",
                                block: "nearest",
                              });
                            }}
                            className={`absolute cursor-pointer rounded border-2 transition-all ${borderColor} ${bgColor} ${
                              isSelected ? "ring-4 ring-blue-500/50 scale-[1.02] z-20" : "hover:ring-2 hover:ring-slate-400/50 z-10"
                            }`}
                            style={{
                              left: `${issue.bbox.left * 100}%`,
                              top: `${issue.bbox.top * 100}%`,
                              width: `${issue.bbox.width * 100}%`,
                              height: `${issue.bbox.height * 100}%`,
                            }}
                            title={`${issue.title}: ${issue.description}`}
                          >
                            {/* Pin Badge */}
                            <span
                              className={`absolute -top-3 -left-3 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-md ${badgeBg} ${
                                isSelected ? "scale-125" : ""
                              }`}
                            >
                              {isRed ? "✍️" : isOrange ? "👁️" : isYellow ? "📐" : "💡"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* BOTTOM CANVAS TOOLBAR */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-xs">
                    {/* Horizontal Pan */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => panHorizontal("left")}
                        className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 transition hover:bg-slate-100 active:scale-95"
                        title="Move Left"
                      >
                        <span>◂</span> <span>Left</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => panHorizontal("right")}
                        className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 transition hover:bg-slate-100 active:scale-95"
                        title="Move Right"
                      >
                        <span>Right</span> <span>▸</span>
                      </button>
                    </div>

                    {/* Zoom Controls */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Zoom out"
                        disabled={zoom <= 0.25}
                        onClick={() => setZoom((v) => Math.max(0.25, Math.round((v - 0.25) * 100) / 100))}
                        className="rounded-lg px-2.5 py-1 text-base leading-none transition hover:bg-slate-100 disabled:opacity-30"
                      >
                        −
                      </button>
                      <button
                        type="button"
                        aria-label="Reset zoom"
                        onClick={handleResetView}
                        className="min-w-12 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 transition hover:bg-slate-100"
                        title="Reset zoom"
                      >
                        {Math.round(zoom * 100)}%
                      </button>
                      <button
                        type="button"
                        aria-label="Zoom in"
                        disabled={zoom >= 3}
                        onClick={() => setZoom((v) => Math.min(3, Math.round((v + 0.25) * 100) / 100))}
                        className="rounded-lg px-2.5 py-1 text-base leading-none transition hover:bg-slate-100 disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>

                    {/* Fit & Reset */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleFitWidth}
                        className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50/70 px-2.5 py-1.5 text-[11px] font-medium text-indigo-700 transition hover:bg-indigo-100 active:scale-95"
                        title="Fit design width to screen"
                      >
                        <span>⤢</span> <span>Fit Width</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleResetView}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-600 transition hover:bg-slate-100 active:scale-95"
                        title="Reset position"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: PRE-FLIGHT AUDIT INSPECTOR (5 COLS) */}
              <div className="flex flex-col rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xl shadow-slate-200/40 lg:col-span-5">
                {/* CATEGORY SCORES PILLS */}
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold sm:grid-cols-4">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-center">
                    <p className="text-[10px] text-slate-400 uppercase">Copy</p>
                    <p className="text-sm font-bold text-slate-800">{result.categoryScores.copyScore}%</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-center">
                    <p className="text-[10px] text-slate-400 uppercase">Contrast</p>
                    <p className="text-sm font-bold text-slate-800">{result.categoryScores.contrastScore}%</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-center">
                    <p className="text-[10px] text-slate-400 uppercase">Margins</p>
                    <p className="text-sm font-bold text-slate-800">{result.categoryScores.marginScore}%</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-center">
                    <p className="text-[10px] text-slate-400 uppercase">Quality</p>
                    <p className="text-sm font-bold text-slate-800">{result.categoryScores.qualityScore}%</p>
                  </div>
                </div>

                {/* FILTER TABS */}
                <div className="mt-4 flex flex-wrap gap-1.5 border-b border-slate-100 pb-3 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setActiveFilter("all")}
                    className={`rounded-lg px-2.5 py-1 transition ${
                      activeFilter === "all" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    All ({activeIssues.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter("copy")}
                    className={`rounded-lg px-2.5 py-1 transition ${
                      activeFilter === "copy" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                    }`}
                  >
                    ✍️ Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter("contrast")}
                    className={`rounded-lg px-2.5 py-1 transition ${
                      activeFilter === "contrast" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                    }`}
                  >
                    👁️ Contrast
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter("margin")}
                    className={`rounded-lg px-2.5 py-1 transition ${
                      activeFilter === "margin" ? "bg-yellow-600 text-white" : "bg-yellow-50 text-yellow-800 hover:bg-yellow-100"
                    }`}
                  >
                    📐 Margins
                  </button>
                </div>

                {/* ISSUES LIST */}
                <div className="mt-4 flex-1 space-y-3 overflow-y-auto max-h-[520px] pr-1">
                  {filteredIssues.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
                      <span className="text-3xl">🎉</span>
                      <p className="mt-2 text-sm font-semibold text-slate-600">No issues in this category</p>
                      <p className="text-xs">Your design passed all checks here cleanly.</p>
                    </div>
                  ) : (
                    filteredIssues.map((issue) => {
                      const isSelected = selectedIssueId === issue.id;
                      const isRed = issue.category === "copy";
                      const isOrange = issue.category === "contrast";
                      const isYellow = issue.category === "margin";

                      const borderClass = isSelected
                        ? "border-blue-500 ring-2 ring-blue-500/20"
                        : "border-slate-200 hover:border-slate-300";

                      const badgeClass = isRed
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : isOrange
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : isYellow
                        ? "bg-yellow-50 text-yellow-800 border-yellow-200"
                        : "bg-blue-50 text-blue-700 border-blue-200";

                      return (
                        <div
                          key={issue.id}
                          id={`issue-card-${issue.id}`}
                          onClick={() => setSelectedIssueId(issue.id)}
                          className={`rounded-2xl border bg-white p-4 transition-all ${borderClass}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${badgeClass}`}>
                              {isRed ? "✍️ COPY" : isOrange ? "👁️ CONTRAST" : isYellow ? "📐 MARGIN" : "💡 QUALITY"}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDismiss(issue.id);
                              }}
                              className="text-[11px] font-medium text-slate-400 hover:text-slate-600"
                              title="Ignore this notice"
                            >
                              Dismiss
                            </button>
                          </div>

                          <h3 className="mt-2 text-sm font-bold text-slate-900">{issue.title}</h3>
                          <p className="mt-1 text-xs leading-relaxed text-slate-600">{issue.description}</p>

                          {/* SUGGESTION / ACTION */}
                          {issue.suggestedFix && (
                            <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Recommended Fix
                              </p>
                              <p className="mt-0.5 text-xs font-medium text-slate-800">{issue.suggestedFix}</p>

                              {issue.originalText && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyFix(issue.id, issue.suggestedFix || "");
                                  }}
                                  className="mt-2 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 shadow-xs transition hover:bg-slate-100 active:scale-95"
                                >
                                  {copiedId === issue.id ? (
                                    <>
                                      <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                      <span className="text-emerald-700">Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                      </svg>
                                      <span>Copy Correction</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="mt-20 border-t border-slate-200/70 bg-white px-5 py-8 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
            <div>
              <div className="text-lg font-bold">
                Spel<span className="text-blue-600">lense</span>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Simple English spell checking &amp; design pre-flight QA for visual content.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs text-gray-400">
              <Link href="/" className="transition hover:text-gray-700">
                Home
              </Link>
              <Link href="/design-check" className="font-semibold text-blue-600">
                Design Check (New)
              </Link>
              <Link href="/case-converter" className="transition hover:text-gray-700">
                Case Converter
              </Link>
              <Link href="/us-uk-converter" className="transition hover:text-gray-700">
                US ↔ UK Dialect
              </Link>
              <Link href="/about" className="transition hover:text-gray-700">
                About
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
    </div>
  );
}

