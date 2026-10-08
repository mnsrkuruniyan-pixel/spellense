"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface DesignIssue {
  id: string;
  category:
    | "data_integrity"
    | "compliance"
    | "layout"
    | "artifacts"
    | "typography"
    | "copy"
    | "contrast"
    | "margin"
    | "resolution";
  severity: "critical" | "warning" | "suggestion" | "error";
  title: string;
  description: string;
  impact?: string;
  specDetail?: string;
  originalText?: string;
  suggestedFix?: string;
  whyItMatters?: string;
  qaRole?: string;
  isHedged?: boolean;
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
  verdict?: "ready" | "needs_review" | "critical_issues";
  verdictTitle?: string;
  verdictSummary?: string;
  verdictCounts?: {
    critical: number;
    warning: number;
    suggestion: number;
    total: number;
  };
  positiveHighlights?: string[];
  dimensions: {
    width: number;
    height: number;
    aspectRatio: number;
  };
  categoryScores: {
    dataScore?: number;
    complianceScore?: number;
    layoutScore?: number;
    visualScore?: number;
    copyScore: number;
    contrastScore: number;
    marginScore: number;
    qualityScore: number;
  };
  issues: DesignIssue[];
  engine: "hybrid-gemini" | "local-deterministic";
  ocrEngine?: string;
  analysisNotice?: string;
  error?: string;
}

const ANALYSIS_STEPS = [
  "Scanning text & spelling...",
  "Checking contrast & colors...",
  "Verifying margins & bleed...",
  "Preparing design report...",
];

export default function DesignCheckClient() {
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [result, setResult] = useState<DesignCheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<
    "all" | "critical" | "data" | "layout" | "contrast" | "typography"
  >("all");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [dismissedIssueIds, setDismissedIssueIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);

  // PDF support: renders the requested page to an image, audits it, and caches results
  const [pdfTotalPages, setPdfTotalPages] = useState(0);
  const [pdfPage, setPdfPage] = useState(1);
  const [loadingPage, setLoadingPage] = useState(false);
  const pageCacheRef = useRef<Record<number, { result: DesignCheckResponse; imageUrl: string }>>({});
  const pdfBufferRef = useRef<ArrayBuffer | null>(null);
  const pdfFileRef = useRef<File | null>(null);

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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) handleFileSelect(droppedFile);
  };

  const handleLoadSample = async () => {
    try {
      setLoadingSample(true);
      setError(null);
      let res = await fetch("/spellense-launch-banner.jpg");
      let fileName = "sample-ad-creative.jpg";
      let fileType = "image/jpeg";

      if (!res.ok) {
        res = await fetch("/sample-document.png");
        fileName = "sample-document.png";
        fileType = "image/png";
      }

      if (!res.ok) throw new Error("Sample file not found");

      const blob = await res.blob();
      const sampleFile = new File([blob], fileName, {
        type: blob.type || fileType,
      });

      handleFileSelect(sampleFile);
    } catch (err) {
      console.error("Error loading sample design:", err);
      setError("Could not load sample design. Please upload an image from your device.");
    } finally {
      setLoadingSample(false);
    }
  };

  const isPdfFile = (f: File) =>
    f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");

  const renderPdfPage = async (buffer: ArrayBuffer, pageNum: number) => {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

    // Pass a copy: pdf.js transfers the buffer to its worker, and we reuse it for other pages.
    const loadingTask = pdfjsLib.getDocument({
      data: buffer.slice(0),
      disableRange: true,
      disableStream: true,
    });
    const pdf = await loadingTask.promise;
    try {
      const total = pdf.numPages;
      const safePage = Math.min(Math.max(pageNum, 1), total);
      const page = await pdf.getPage(safePage);

      // Target 2600px on the longest side: crisp resolution for OCR so small text is never garbled
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(6, 2600 / Math.max(base.width, base.height, 1));
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not render this PDF page in your browser.");
      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));

      // PDFs can be transparent; paint white so text contrast is measured correctly.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport, canvas }).promise;

      // Use PNG to prevent lossy JPEG ringing artifacts from corrupting small typography
      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png")
      );
      if (!blob) throw new Error("Could not convert this PDF page to an image.");

      return { blob, total, page: safePage };
    } finally {
      try {
        await loadingTask.destroy();
      } catch {
        // ignore cleanup error
      }
    }
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
        if (sourceFile.size <= 3 * 1024 * 1024 && originalWidth <= 2600 && originalHeight <= 2600) {
          resolve({ file: sourceFile, originalWidth, originalHeight });
          return;
        }

        // Proportional scale to fit within 2600px max dimension (small text needs the extra pixels for OCR) (bypasses 4.5MB server limit)
        const maxDim = 2600;
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

  const checkSingleImageFile = async (
    uploadFile: File
  ): Promise<DesignCheckResponse> => {
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
    return data;
  };

  const runDesignCheck = async (uploadFile: File) => {
    setLoading(true);
    setCurrentStepIndex(0);
    setError(null);

    try {
      const data = await checkSingleImageFile(uploadFile);
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

  const analyzeSinglePdfPage = async (
    pdfFile: File,
    buffer: ArrayBuffer,
    pageNum: number
  ): Promise<{ result: DesignCheckResponse; imageUrl: string; totalPages: number }> => {
    const rendered = await renderPdfPage(buffer, pageNum);
    const baseName = pdfFile.name.replace(/\.[^/.]+$/, "");
    const pageFile = new File([rendered.blob], `${baseName}-page-${rendered.page}.jpg`, {
      type: "image/jpeg",
    });
    const pageUrl = URL.createObjectURL(pageFile);
    const data = await checkSingleImageFile(pageFile);
    return { result: data, imageUrl: pageUrl, totalPages: rendered.total };
  };

  const goToPdfPage = async (targetPage: number) => {
    const buffer = pdfBufferRef.current;
    const pdfFile = pdfFileRef.current;
    if (!buffer || !pdfFile || loadingPage || loading) return;
    if (targetPage < 1 || targetPage > pdfTotalPages || targetPage === pdfPage) return;

    setPdfPage(targetPage);
    setSelectedIssueId(null);
    setDismissedIssueIds(new Set());
    setError(null);
    setZoom(1);
    setNaturalDims(null);
    initialFittedRef.current = false;

    // If this page was already audited, load it instantly from cache!
    const cached = pageCacheRef.current[targetPage];
    if (cached) {
      setResult(cached.result);
      setImageUrl(cached.imageUrl);
      return;
    }

    // Otherwise, audit this page on demand
    setLoadingPage(true);
    try {
      const rendered = await renderPdfPage(buffer, targetPage);
      const baseName = pdfFile.name.replace(/\.[^/.]+$/, "");
      const pageFile = new File([rendered.blob], `${baseName}-page-${rendered.page}.jpg`, {
        type: "image/jpeg",
      });
      const pageUrl = URL.createObjectURL(pageFile);
      setImageUrl(pageUrl);

      const auditedResult = await checkSingleImageFile(pageFile);
      pageCacheRef.current[targetPage] = {
        result: auditedResult,
        imageUrl: pageUrl,
      };
      setResult(auditedResult);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      setError(
        /password/i.test(msg)
          ? "This PDF is password-protected. Remove the password and try again."
          : msg || `Failed to audit page ${targetPage}.`
      );
    } finally {
      setLoadingPage(false);
    }
  };

  const handleFileSelect = async (selectedFile: File) => {
    const isPdf = isPdfFile(selectedFile);

    if (!isPdf && !selectedFile.type.startsWith("image/")) {
      setError("Please upload an image or PDF file (PNG, JPG, WebP, SVG, or PDF).");
      return;
    }

    if (isPdf && selectedFile.size > 25 * 1024 * 1024) {
      setError("This PDF is larger than 25MB. Please compress it or upload a smaller file.");
      return;
    }

    setDismissedIssueIds(new Set());
    setSelectedIssueId(null);
    setZoom(1);
    setNaturalDims(null);
    initialFittedRef.current = false;

    if (isPdf) {
      setFile(selectedFile);
      pdfFileRef.current = selectedFile;
      pageCacheRef.current = {};
      setPdfTotalPages(0);
      setPdfPage(1);
      setResult(null);
      setError(null);

      let buffer: ArrayBuffer;
      try {
        buffer = await selectedFile.arrayBuffer();
      } catch {
        setError("Could not read this file. Please try again.");
        return;
      }
      pdfBufferRef.current = buffer;

      setLoading(true);
      setCurrentStepIndex(0);

      try {
        const audited = await analyzeSinglePdfPage(selectedFile, buffer, 1);
        setPdfTotalPages(audited.totalPages);
        setPdfPage(1);
        pageCacheRef.current[1] = {
          result: audited.result,
          imageUrl: audited.imageUrl,
        };
        setImageUrl(audited.imageUrl);
        setResult(audited.result);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "";
        setError(
          /password/i.test(msg)
            ? "This PDF is password-protected. Remove the password and try again."
            : /^Could not/.test(msg)
            ? msg
            : "Could not read this PDF. It may be damaged or not a real PDF file."
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    // Image upload: clear any previous PDF state
    pdfBufferRef.current = null;
    pdfFileRef.current = null;
    pageCacheRef.current = {};
    setPdfTotalPages(0);
    setPdfPage(1);

    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }

    setFile(selectedFile);
    setImageUrl(URL.createObjectURL(selectedFile));
    setError(null);
    setResult(null);

    // Trigger analysis
    runDesignCheck(selectedFile);
  };

  // Canvas Display Dimensions
  const displayDims = useMemo(() => {
    if (!naturalDims) return null;
    const baseHeight = 560;
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

  const isPdfDoc = Boolean(pdfTotalPages > 0 || (file && isPdfFile(file)));

  const documentMetrics = useMemo(() => {
    if (pdfTotalPages <= 1) return null;
    const cachedEntries = Object.entries(pageCacheRef.current);
    if (cachedEntries.length === 0) return null;

    let totalCritical = 0;
    let totalWarning = 0;
    let totalSuggestion = 0;
    let totalIssuesCount = 0;
    let scoreSum = 0;

    cachedEntries.forEach(([, cached]) => {
      if (cached.result) {
        scoreSum += cached.result.score;
        if (cached.result.verdictCounts) {
          totalCritical += cached.result.verdictCounts.critical;
          totalWarning += cached.result.verdictCounts.warning;
          totalSuggestion += cached.result.verdictCounts.suggestion;
          totalIssuesCount += cached.result.verdictCounts.total;
        } else {
          totalIssuesCount += cached.result.issues.length;
        }
      }
    });

    const avgScore = Math.round(scoreSum / cachedEntries.length);
    return {
      auditedCount: cachedEntries.length,
      totalPages: pdfTotalPages,
      avgScore,
      totalCritical,
      totalWarning,
      totalSuggestion,
      totalIssuesCount,
      allComplete: cachedEntries.length === pdfTotalPages,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, pdfTotalPages]);

  const [whitelistedTerms, setWhitelistedTerms] = useState<Set<string>>(new Set());

  const handleAddToDictionary = (word: string) => {
    const cleaned = word.trim().toLowerCase();
    setWhitelistedTerms((prev) => new Set([...prev, cleaned]));
    if (result) {
      const matchingIds = result.issues
        .filter((i) => (i.originalText || "").trim().toLowerCase() === cleaned)
        .map((i) => i.id);
      setDismissedIssueIds((prev) => new Set([...prev, ...matchingIds]));
    }
  };

  const activeIssues = useMemo(() => {
    if (!result) return [];
    return result.issues.filter((i) => {
      if (dismissedIssueIds.has(i.id)) return false;
      if (i.originalText && whitelistedTerms.has(i.originalText.trim().toLowerCase())) return false;
      return true;
    });
  }, [result, dismissedIssueIds, whitelistedTerms]);

  const filteredIssues = useMemo(() => {
    if (activeFilter === "all") return activeIssues;
    if (activeFilter === "critical") {
      return activeIssues.filter(
        (i) => i.severity === "critical" || (i.severity as string) === "error"
      );
    }
    if (activeFilter === "data") {
      return activeIssues.filter(
        (i) =>
          i.category === "data_integrity" ||
          i.category === "compliance" ||
          i.category === "copy"
      );
    }
    if (activeFilter === "layout") {
      return activeIssues.filter(
        (i) =>
          i.category === "layout" ||
          i.category === "margin" ||
          i.category === "artifacts" ||
          i.category === "resolution"
      );
    }
    if (activeFilter === "contrast") {
      return activeIssues.filter((i) => i.category === "contrast");
    }
    if (activeFilter === "typography") {
      return activeIssues.filter((i) => i.category === "typography");
    }
    return activeIssues;
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

    let lines: (string | null)[] = [];

    if (pdfTotalPages > 1) {
      const auditedEntries = Object.entries(pageCacheRef.current)
        .map(([pageNum, cached]) => ({ pageNumber: Number(pageNum), result: cached.result }))
        .filter((e) => e.result)
        .sort((a, b) => a.pageNumber - b.pageNumber);

      lines = [
        "===========================================================",
        "   SPELLENSE AI CREATIVE QA FULL MULTI-PAGE AUDIT REPORT   ",
        "===========================================================",
        `Document Name: ${file.name}`,
        `Total Document Pages: ${pdfTotalPages}`,
        `Pages Audited: ${auditedEntries.length} of ${pdfTotalPages}`,
        `Document Overall Score: ${documentMetrics?.avgScore ?? result.score}/100`,
        documentMetrics
          ? `Total Document Issues: ${documentMetrics.totalCritical} Critical, ${documentMetrics.totalWarning} Warnings, ${documentMetrics.totalSuggestion} Suggestions`
          : null,
        `Date & Time: ${new Date().toLocaleString()}`,
        "===========================================================",
        "",
      ];

      auditedEntries.forEach((entry) => {
        const pRes = entry.result!;
        lines.push(
          "-----------------------------------------------------------",
          `PAGE ${entry.pageNumber} OF ${pdfTotalPages} (QA Score: ${pRes.score}/100)`,
          `Dimensions: ${pRes.dimensions.width} x ${pRes.dimensions.height} px`,
          `Verdict: ${(pRes.verdict || "reviewed").toUpperCase()} - ${pRes.verdictTitle || ""}`,
          `Summary: ${pRes.verdictSummary || ""}`,
          pRes.verdictCounts
            ? `Page Issues: ${pRes.verdictCounts.critical} Critical, ${pRes.verdictCounts.warning} Warnings, ${pRes.verdictCounts.suggestion} Suggestions`
            : null,
          "",
          `Pillar Scores: Data & Copy ${pRes.categoryScores.dataScore ?? pRes.categoryScores.copyScore}/100 | Legal ${pRes.categoryScores.complianceScore ?? pRes.categoryScores.qualityScore}/100 | Layout ${pRes.categoryScores.layoutScore ?? pRes.categoryScores.marginScore}/100 | Contrast ${pRes.categoryScores.visualScore ?? pRes.categoryScores.contrastScore}/100`,
          "",
          `Page ${entry.pageNumber} Detected Findings (${pRes.issues.length}):`,
          ...pRes.issues.map((issue, idx) => {
            return [
              `  [${idx + 1}] [${issue.severity.toUpperCase()}] ${issue.title}`,
              `      Category: ${issue.category.toUpperCase()} | Role: ${issue.qaRole || "Creative QA"}`,
              `      Observation: ${issue.description}`,
              issue.impact ? `      Real-World Impact: ${issue.impact}` : issue.whyItMatters ? `      Why It Matters: ${issue.whyItMatters}` : null,
              issue.specDetail ? `      Technical Spec: ${issue.specDetail}` : null,
              issue.originalText ? `      Original Text: "${issue.originalText}"` : null,
              issue.suggestedFix ? `      Recommended Fix: ${issue.suggestedFix}` : null,
            ]
              .filter(Boolean)
              .join("\n");
          }),
          ""
        );
      });

      lines.push(
        "===========================================================",
        "Generated by Spellense AI Creative QA (https://spellense.com/design-check)"
      );
    } else {
      lines = [
        "===========================================================",
        "       SPELLENSE AI CREATIVE QA PRE-FLIGHT AUDIT REPORT    ",
        "===========================================================",
        `File Name: ${file.name}`,
        pdfTotalPages === 1 ? "Document Type: Single-Page PDF" : null,
        `Dimensions: ${result.dimensions.width} x ${result.dimensions.height} px (Aspect: ${result.dimensions.aspectRatio})`,
        `Overall QA Score: ${result.score}/100`,
        `Pre-Flight Verdict: ${(result.verdict || "reviewed").toUpperCase()} - ${result.verdictTitle || ""}`,
        `Verdict Summary: ${result.verdictSummary || ""}`,
        result.verdictCounts
          ? `Severity Breakdown: ${result.verdictCounts.critical} Critical, ${result.verdictCounts.warning} Warnings, ${result.verdictCounts.suggestion} Suggestions`
          : null,
        `Audit Engine: ${result.engine}`,
        `Date & Time: ${new Date().toLocaleString()}`,
        "",
        ...(result.positiveHighlights && result.positiveHighlights.length > 0
          ? [
              "--- WHAT'S WORKING WELL (CREATIVE QA STRENGTHS) ---",
              ...result.positiveHighlights.map((h) => `[+] ${h}`),
              "",
            ]
          : []),
        "--- QA PILLAR SCORES ---",
        `1. Data & Copy Integrity: ${result.categoryScores.dataScore ?? result.categoryScores.copyScore}/100`,
        `2. Legal & Asterisk (*): ${result.categoryScores.complianceScore ?? result.categoryScores.qualityScore}/100`,
        `3. Layout & Bleed Margins: ${result.categoryScores.layoutScore ?? result.categoryScores.marginScore}/100`,
        `4. Visual & WCAG Contrast: ${result.categoryScores.visualScore ?? result.categoryScores.contrastScore}/100`,
        "",
        `--- DETECTED AUDIT FINDINGS (${activeIssues.length}) ---`,
        ...activeIssues.map((issue, idx) => {
          return [
            `\n[${idx + 1}] [${issue.severity.toUpperCase()}] ${issue.title.toUpperCase()}`,
            `Category: ${issue.category.toUpperCase()} | Auditor Role: ${issue.qaRole || "Creative QA"}`,
            `Observation: ${issue.description}`,
            issue.impact ? `Real-World Impact: ${issue.impact}` : issue.whyItMatters ? `Impact / Why It Matters: ${issue.whyItMatters}` : null,
            issue.specDetail ? `Technical Spec: ${issue.specDetail}` : null,
            issue.originalText ? `Original Text: "${issue.originalText}"` : null,
            issue.suggestedFix ? `Recommended Action: ${issue.suggestedFix}` : null,
          ]
            .filter(Boolean)
            .join("\n");
        }),
        "\n===========================================================",
        "Generated by Spellense AI Creative QA (https://spellense.com/design-check)",
      ];
    }

    const filteredText = lines.filter((l): l is string => l !== null).join("\n");
    const blob = new Blob([filteredText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `creative-qa-audit-${file.name.replace(/\.[^/.]+$/, "")}${pdfTotalPages > 1 ? "-full-document" : ""}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-transparent text-black font-sans selection:bg-blue-500/10 selection:text-blue-600 relative z-10 overflow-x-hidden">
      {/* Ambient background glows / mesh across full page */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[560px] w-[920px] rounded-full bg-gradient-to-tr from-blue-400/20 via-indigo-400/20 to-purple-400/15 blur-[120px] opacity-80 animate-pulse-glow" />
      <div className="pointer-events-none absolute top-40 -left-28 h-[420px] w-[420px] rounded-full bg-blue-200/40 blur-[100px]" />
      <div className="pointer-events-none absolute top-36 -right-28 h-[440px] w-[440px] rounded-full bg-indigo-200/40 blur-[110px]" />
      <div className="pointer-events-none absolute top-[700px] left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-blue-100/35 blur-[130px]" />
      <div className="pointer-events-none absolute top-[1200px] -right-20 h-[500px] w-[500px] rounded-full bg-indigo-100/30 blur-[120px]" />

      <Navbar />

      {/* HERO SECTION — Strictly 1 line, identical styling to homepage / compressor, only black text */}
      {!result && (
        <section className="relative overflow-hidden px-4 pt-12 pb-10 sm:px-6 sm:pt-16 sm:pb-14 lg:pt-20 lg:pb-16">
          <div className="mx-auto max-w-7xl text-center">
            <h1 className="text-[34px] xs:text-[44px] sm:text-[56px] md:text-[64px] lg:text-[72px] font-black leading-[1.12] tracking-[-1.5px] sm:tracking-[-2.5px] text-[#0f172a] text-center max-w-5xl mx-auto">
              Catch the mistake before your client does.
            </h1>
          </div>
        </section>
      )}

      <main className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        {/* Always-mounted hidden file input so "Audit Another Design" works from results view */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            const selected = e.target.files?.[0];
            if (selected) handleFileSelect(selected);
            e.target.value = "";
          }}
        />

        {/* UPLOAD ZONE (WHEN NO FILE OR WHEN CHANGING) — Identical size & place as Image Compressor */}
        {!result && !loading && (
          <div>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`group relative mx-auto max-w-[920px] cursor-pointer rounded-[28px] border p-8 sm:p-14 text-center transition-all duration-300 overflow-hidden ${
                isDragging
                  ? "border-[#0055fe] bg-blue-50/95 shadow-[0_0_60px_rgba(0,85,254,0.25)] scale-[1.01]"
                  : "border-slate-200/90 hover:border-blue-400/80 bg-white shadow-[0_15px_50px_-15px_rgba(0,85,254,0.07)] hover:shadow-[0_20px_60px_-15px_rgba(0,85,254,0.12)]"
              }`}
            >
              {/* Cloud Upload Icon matching Flipbook reference */}
              <div className="mx-auto flex justify-center items-center">
                <svg
                  width="68"
                  height="68"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0055fe"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="group-hover:-translate-y-1 transition-transform duration-300"
                >
                  <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                  <path d="M12 12v9" />
                  <path d="m16 16-4-4-4 4" />
                </svg>
              </div>

              <h2 className="mt-4 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 group-hover:text-blue-900 transition-colors">
                Drop your design here
              </h2>
              <p className="mx-auto mt-1 max-w-md text-xs sm:text-sm text-slate-500 font-medium">
                or click to choose a design file
              </p>

              {/* Action Button */}
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="inline-flex items-center gap-2.5 rounded-xl bg-[#0055fe] hover:bg-[#0047d9] px-8 py-3.5 text-sm sm:text-base font-semibold text-white shadow-md shadow-blue-600/25 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 19V5" />
                    <path d="m5 12 7-7 7 7" />
                  </svg>
                  <span>Choose Design File</span>
                </button>
              </div>

              {/* Sample link */}
              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLoadSample();
                  }}
                  disabled={loadingSample}
                  className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#0055fe] hover:underline cursor-pointer"
                  title="Test immediately with a sample design"
                >
                  {loadingSample ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  )}
                  <span>Try a sample design</span>
                </button>
              </div>

              {/* Workflow Compatibility */}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-slate-400">
                <span>Optimized for exports from</span>
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-600">Canva</span>
                <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-600">Figma</span>
                <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-600">Adobe PDF</span>
              </div>
            </div>

            {/* 4 Trust Feature Cards */}
            <div className="mt-8 max-w-[920px] mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/70 border border-slate-100/90 shadow-2xs backdrop-blur-sm">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100/70 text-[#0055fe]">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs sm:text-[13px] font-bold text-slate-900 leading-tight">
                      High-Res Pre-Flight
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                      PNG, JPG, WebP, SVG, PDF
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/70 border border-slate-100/90 shadow-2xs backdrop-blur-sm">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-100/70 text-purple-600">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs sm:text-[13px] font-bold text-slate-900 leading-tight">
                      Comprehensive QA
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                      Contrast, bleed &amp; layout
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/70 border border-slate-100/90 shadow-2xs backdrop-blur-sm">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100/70 text-emerald-600">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs sm:text-[13px] font-bold text-slate-900 leading-tight">
                      No signup required
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                      Instant check • 100% Free
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/70 border border-slate-100/90 shadow-2xs backdrop-blur-sm">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100/70 text-amber-600">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs sm:text-[13px] font-bold text-slate-900 leading-tight">
                      Strictly Private
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                      In-memory • Zero storage
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="mx-auto mt-4 max-w-4xl rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-sm font-medium text-rose-700">
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
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 2a10 10 0 0 1 0 20z" fill="currentColor" />
                    </svg>
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
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2v14a2 2 0 0 0 2 2h14" />
                      <path d="M18 22V8a2 2 0 0 0-2-2H2" />
                    </svg>
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
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m3 16 4.5-9 4.5 9" />
                      <path d="M5 12h5" />
                      <path d="m15 11 3 3 5-5" />
                    </svg>
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
          <div className="relative mx-auto mt-12 max-w-lg overflow-hidden rounded-3xl border border-slate-100 bg-white/95 p-8 text-center shadow-2xl shadow-blue-500/10 backdrop-blur-xl sm:p-10">
            {/* Ambient background glows */}
            <div className="pointer-events-none absolute -top-20 -left-20 h-44 w-44 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -right-20 h-44 w-44 rounded-full bg-indigo-500/10 blur-3xl" />

            {/* Glowing multi-ring scanner animation */}
            <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
              {/* Soft ambient blur halo */}
              <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl animate-pulse" />

              {/* Outer gradient spinner ring */}
              <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-blue-600 border-r-indigo-500 animate-spin" />

              {/* Inner counter-rotating accent ring */}
              <div className="absolute inset-2.5 rounded-full border-2 border-transparent border-b-violet-500 border-l-blue-400 animate-[spin_2s_linear_infinite_reverse]" />

              {/* Central icon badge */}
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30">
                <svg
                  className="h-6 w-6 animate-pulse"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                  <circle cx="11.5" cy="14.5" r="2.5" />
                  <path d="m13.5 16.5 2 2" />
                </svg>
              </div>
            </div>

            {/* Title & dynamic status */}
            <h2 className="mt-5 text-xl font-extrabold tracking-tight text-slate-900">
              Checking your design...
            </h2>
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-ping" />
              <p className="text-sm font-semibold text-blue-600 transition-all duration-300">
                {ANALYSIS_STEPS[currentStepIndex]}
              </p>
            </div>

            {/* Progress bar & percentage */}
            <div className="mt-6">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-2">
                <span>ANALYSIS IN PROGRESS</span>
                <span className="text-blue-600 font-extrabold">
                  {Math.round(((currentStepIndex + 1) / ANALYSIS_STEPS.length) * 100)}%
                </span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 transition-all duration-500 ease-out shadow-xs"
                  style={{ width: `${((currentStepIndex + 1) / ANALYSIS_STEPS.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Clean category pills */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 pt-3 border-t border-slate-100">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                Typos &amp; Text
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Contrast
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                Margins &amp; Bleed
              </span>
            </div>
          </div>
        )}

        {/* RESULT DASHBOARD */}
        {result && imageUrl && (
          <div className="mt-8 space-y-6">
            {/* PDF PAGE NAVIGATOR */}
            {pdfTotalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs sm:px-5">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse" />
                  <span className="text-xs font-bold text-slate-700 sm:text-sm">
                    PDF Page <span className="text-blue-600 font-extrabold">{pdfPage}</span> of {pdfTotalPages}
                  </span>
                  <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 hidden sm:inline">
                    Click Next to audit subsequent pages
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => goToPdfPage(pdfPage - 1)}
                    disabled={pdfPage <= 1 || loadingPage}
                    className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span>‹</span> <span>Previous</span>
                  </button>
                  <select
                    value={pdfPage}
                    onChange={(e) => goToPdfPage(Number(e.target.value))}
                    disabled={loadingPage}
                    aria-label="Select PDF page"
                    className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    {Array.from({ length: pdfTotalPages }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        Page {n} of {pdfTotalPages}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => goToPdfPage(pdfPage + 1)}
                    disabled={pdfPage >= pdfTotalPages || loadingPage}
                    className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span>Next</span> <span>›</span>
                  </button>
                </div>
              </div>
            )}

            {/* TOP SUMMARY BAR: QA PRE-FLIGHT VERDICT */}
            {(() => {
              const isCritical = result.verdict === "critical_issues";
              const isReady = result.verdict === "ready";
              const defaultTitle = isReady
                ? "Artwork Ready for Release"
                : isCritical
                ? "Critical QA Blockers Detected"
                : "Needs Review Before Release";
              const defaultSummary = isReady
                ? "Zero deal-breaking errors detected. Design meets professional agency quality standards."
                : isCritical
                ? "Contains deal-breaking issues (price mismatch, missing disclaimers, or cutoffs) that must be fixed before going live."
                : "Overall solid, but contains warnings that should be verified before publication.";

              const verdictTitle = result.verdictTitle || defaultTitle;
              const verdictSummary = result.verdictSummary || defaultSummary;

              return (
                <div
                  className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4 shadow-sm sm:p-5 transition-all ${
                    isReady
                      ? "border-emerald-200 bg-emerald-50/50"
                      : isCritical
                      ? "border-rose-200 bg-rose-50/50"
                      : "border-amber-200 bg-amber-50/50"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl font-bold shadow-xs ${
                        isReady
                          ? "bg-emerald-600 text-white"
                          : isCritical
                          ? "bg-rose-600 text-white"
                          : "bg-amber-500 text-white"
                      }`}
                    >
                      <span className="text-xl leading-none font-extrabold">{result.score}</span>
                      <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider opacity-85">Score</span>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            isReady
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : isCritical
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : "bg-amber-100 text-amber-900 border border-amber-200"
                          }`}
                        >
                          {isReady ? "Passed" : isCritical ? "Action Required" : "Needs Review"}
                        </span>
                        <h2 className="text-base font-extrabold text-slate-900">
                          {verdictTitle}
                        </h2>
                        <span className="rounded-full bg-white/90 border border-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-600 uppercase">
                          {result.engine === "hybrid-gemini" ? "AI + Automated Checks" : "Limited Automated Checks"}
                        </span>
                        {result.ocrEngine && (
                          <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase flex items-center gap-1 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            {result.ocrEngine}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-600 max-w-2xl leading-relaxed">
                        {verdictSummary}
                      </p>
                      {/* Severity-Weighted Summary Counts */}
                      {result.verdictCounts && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                          {result.verdictCounts.critical > 0 && (
                            <span className="inline-flex items-center rounded-full bg-rose-50 text-rose-700 px-2.5 py-0.5 border border-rose-200/80">
                              {result.verdictCounts.critical} Critical Blockers
                            </span>
                          )}
                          {result.verdictCounts.warning > 0 && (
                            <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-800 px-2.5 py-0.5 border border-amber-200/80">
                              {result.verdictCounts.warning} Warnings to Verify
                            </span>
                          )}
                          {result.verdictCounts.suggestion > 0 && (
                            <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-2.5 py-0.5 border border-slate-200/80">
                              {result.verdictCounts.suggestion} Polish Suggestions
                            </span>
                          )}
                          {result.verdictCounts.total === 0 && (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-800 px-2.5 py-0.5 border border-emerald-200/80">
                              0 Issues Detected
                            </span>
                          )}
                        </div>
                      )}
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
                      Export QA Audit
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 active:scale-95"
                    >
                      Audit Another Design
                    </button>
                  </div>
                </div>
              );
            })()}

            {result.analysisNotice && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950" role="status">
                <p className="font-bold">Manual review required</p>
                <p className="mt-1 leading-relaxed">{result.analysisNotice}</p>
              </div>
            )}

            {/* POSITIVE HIGHLIGHTS: WHAT'S WORKING WELL (RULE 5) */}
            {result.positiveHighlights && result.positiveHighlights.length > 0 && (
              <div className="rounded-2xl border border-emerald-200/90 bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-white p-4 sm:p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[11px] font-bold">✓</span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                      What&apos;s Working Well
                    </h3>
                    <span className="rounded-full bg-emerald-100/90 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      Creative QA Strengths
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                    Pre-Flight Observations
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {result.positiveHighlights.map((highlight, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 rounded-xl border border-emerald-100/90 bg-white/95 p-3 shadow-2xs transition hover:border-emerald-200"
                    >
                      <span className="mt-0.5 text-xs text-emerald-600 font-bold">✓</span>
                      <p className="text-xs font-medium leading-relaxed text-slate-700">{highlight}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TWO COLUMN INSPECTOR */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* LEFT COLUMN: INTERACTIVE VISUAL CANVAS (7 COLS) */}
              <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/40 lg:col-span-7">
                <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse" />
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      {isPdfDoc && pdfTotalPages > 1
                        ? `Visual Pre-Flight Canvas (Page ${pdfPage} of ${pdfTotalPages})`
                        : "Visual Pre-Flight Canvas"}
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
                    className={`relative flex h-[380px] sm:h-[480px] lg:h-[588px] items-start justify-start overflow-auto select-none touch-pan-x touch-pan-y overscroll-contain ${
                      panning ? "cursor-grabbing" : "cursor-grab"
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
                      if (event.pointerType !== "mouse" || event.button !== 0) return;
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
                      if (event.pointerType !== "mouse") return;
                      const start = panStartRef.current;
                      if (!start || !viewportRef.current) return;
                      viewportRef.current.scrollLeft = start.left - (event.clientX - start.x);
                      viewportRef.current.scrollTop = start.top - (event.clientY - start.y);
                    }}
                    onPointerUp={(event) => {
                      if (event.pointerType !== "mouse") return;
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

                      {/* VISUAL MARKERS OVERLAY — Prominent Error Underline Markings */}
                      {activeIssues.map((issue) => {
                        const isSelected = selectedIssueId === issue.id;
                        const isCritical =
                          issue.severity === "critical" ||
                          (issue.severity as string) === "error";
                        const isWarning = issue.severity === "warning";
                        const isFilteredOut =
                          activeFilter !== "all" &&
                          !filteredIssues.some((f) => f.id === issue.id);

                        if (isFilteredOut) return null;

                        // Color theme per category
                        let color = "#0055fe"; // blue
                        let bgTint = "rgba(0, 85, 254, 0.12)";
                        let borderTint = "rgba(0, 85, 254, 0.4)";

                        if (isCritical || issue.category === "copy") {
                          color = "#e11d48"; // rose-600 / red
                          bgTint = "rgba(225, 29, 72, 0.14)";
                          borderTint = "rgba(225, 29, 72, 0.45)";
                        } else if (issue.category === "contrast" || isWarning) {
                          color = "#d97706"; // amber-600
                          bgTint = "rgba(217, 119, 6, 0.14)";
                          borderTint = "rgba(217, 119, 6, 0.45)";
                        } else if (issue.category === "margin" || issue.category === "layout") {
                          color = "#7c3aed"; // violet-600
                          bgTint = "rgba(124, 58, 237, 0.14)";
                          borderTint = "rgba(124, 58, 237, 0.45)";
                        }

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
                            className={`group absolute cursor-pointer transition-all duration-150 rounded-[2px] ${
                              isSelected
                                ? "ring-2 ring-blue-500 shadow-md z-30"
                                : "hover:z-20 z-10"
                            }`}
                            style={{
                              left: `${issue.bbox.left * 100}%`,
                              top: `${issue.bbox.top * 100}%`,
                              width: `${Math.max(issue.bbox.width * 100, 1.2)}%`,
                              height: `${Math.max(issue.bbox.height * 100, 1.2)}%`,
                              backgroundColor: isSelected ? bgTint.replace("0.14", "0.28") : bgTint,
                              border: `1px solid ${borderTint}`,
                            }}
                            title={`${issue.title}: ${issue.description}`}
                          >
                            {/* Solid Underline Bar */}
                            <span
                              className="absolute -bottom-[3px] left-0 right-0 h-[3px] rounded-full pointer-events-none"
                              style={{
                                backgroundColor: color,
                                boxShadow: `0 1px 3px ${color}66`,
                              }}
                            />

                            {/* Wavy Squiggly Underline SVG for authentic proofreading mark */}
                            <svg
                              className="absolute -bottom-[6px] left-0 w-full h-[6px] pointer-events-none overflow-visible"
                              style={{ color }}
                              preserveAspectRatio="none"
                              viewBox="0 0 100 6"
                            >
                              <path
                                d="M0,3 Q2.5,0 5,3 T10,3 T15,3 T20,3 T25,3 T30,3 T35,3 T40,3 T45,3 T50,3 T55,3 T60,3 T65,3 T70,3 T75,3 T80,3 T85,3 T90,3 T95,3 T100,3"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                              />
                            </svg>

                            {/* Floating hover/selected label badge */}
                            <div
                              className={`pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-bold text-white shadow-md transition-opacity duration-150 ${
                                isSelected ? "opacity-100 scale-100" : "opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100"
                              }`}
                              style={{ backgroundColor: color }}
                            >
                              {issue.originalText || issue.title}
                              <div
                                className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent"
                                style={{ borderTopColor: color }}
                              />
                            </div>
                          </div>
                        );
                      })}

                      {/* Loading Page Overlay */}
                      {loadingPage && (
                        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-xs">
                          <div className="flex flex-col items-center gap-2.5 rounded-2xl bg-white px-6 py-5 shadow-2xl border border-slate-100">
                            <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
                            <p className="text-sm font-bold text-slate-800">
                              Auditing PDF Page {pdfPage} of {pdfTotalPages}...
                            </p>
                            <p className="text-[11px] text-slate-500">
                              Detecting typos, margins &amp; error marks
                            </p>
                          </div>
                        </div>
                      )}
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

                      {/* Multi-Page Canvas Page Nav */}
                      {pdfTotalPages > 1 && (
                        <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                          <button
                            type="button"
                            onClick={() => goToPdfPage(pdfPage - 1)}
                            disabled={pdfPage <= 1 || loadingPage}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Previous PDF Page"
                          >
                            ‹ Prev
                          </button>
                          <span className="text-[11px] font-bold text-slate-700 px-1">
                            {pdfPage}/{pdfTotalPages}
                          </span>
                          <button
                            type="button"
                            onClick={() => goToPdfPage(pdfPage + 1)}
                            disabled={pdfPage >= pdfTotalPages || loadingPage}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Next PDF Page"
                          >
                            Next ›
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: PRE-FLIGHT AUDIT INSPECTOR (5 COLS) */}
              <div className="flex flex-col rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xl shadow-slate-200/40 lg:col-span-5">
                {/* CATEGORY SCORES PILLS */}
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold sm:grid-cols-4">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-center transition hover:border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data &amp; Copy</p>
                    <p className="mt-0.5 text-base font-extrabold text-slate-800">
                      {result.categoryScores.dataScore ?? result.categoryScores.copyScore}%
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-center transition hover:border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Legal &amp; Asterisk</p>
                    <p className="mt-0.5 text-base font-extrabold text-slate-800">
                      {result.categoryScores.complianceScore ?? result.categoryScores.qualityScore}%
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-center transition hover:border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Layout &amp; Bleed</p>
                    <p className="mt-0.5 text-base font-extrabold text-slate-800">
                      {result.categoryScores.layoutScore ?? result.categoryScores.marginScore}%
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-center transition hover:border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Visual &amp; Contrast</p>
                    <p className="mt-0.5 text-base font-extrabold text-slate-800">
                      {result.categoryScores.visualScore ?? result.categoryScores.contrastScore}%
                    </p>
                  </div>
                </div>

                {/* FILTER TABS */}
                {(() => {
                  const criticalCount = activeIssues.filter(
                    (i) => i.severity === "critical" || (i.severity as string) === "error"
                  ).length;
                  const dataCount = activeIssues.filter(
                    (i) =>
                      i.category === "data_integrity" ||
                      i.category === "compliance" ||
                      i.category === "copy"
                  ).length;
                  const layoutCount = activeIssues.filter(
                    (i) =>
                      i.category === "layout" ||
                      i.category === "margin" ||
                      i.category === "artifacts" ||
                      i.category === "resolution"
                  ).length;
                  const contrastCount = activeIssues.filter((i) => i.category === "contrast").length;
                  const typographyCount = activeIssues.filter((i) => i.category === "typography").length;

                  return (
                    <div className="mt-4 flex flex-wrap gap-1.5 border-b border-slate-100 pb-3 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setActiveFilter("all")}
                        className={`rounded-lg px-3 py-1.5 transition ${
                          activeFilter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        All ({activeIssues.length})
                      </button>
                      {criticalCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setActiveFilter("critical")}
                          className={`rounded-lg px-3 py-1.5 transition ${
                            activeFilter === "critical" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                          }`}
                        >
                          Critical ({criticalCount})
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveFilter("data")}
                        className={`rounded-lg px-3 py-1.5 transition ${
                          activeFilter === "data" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        Data &amp; Legal ({dataCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveFilter("layout")}
                        className={`rounded-lg px-3 py-1.5 transition ${
                          activeFilter === "layout" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        Layout &amp; Bleed ({layoutCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveFilter("contrast")}
                        className={`rounded-lg px-3 py-1.5 transition ${
                          activeFilter === "contrast" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        Contrast ({contrastCount})
                      </button>
                      {typographyCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setActiveFilter("typography")}
                          className={`rounded-lg px-3 py-1.5 transition ${
                            activeFilter === "typography" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          Typography ({typographyCount})
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* ISSUES LIST */}
                <div className="mt-4 flex-1 space-y-3 overflow-y-auto max-h-[520px] pr-1">
                  {filteredIssues.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
                      <p className="text-sm font-semibold text-slate-700">No issues in this category</p>
                      <p className="text-xs text-slate-500 mt-0.5">Your design passed all audit checks in this area cleanly.</p>
                    </div>
                  ) : (
                    filteredIssues.map((issue) => {
                      const isSelected = selectedIssueId === issue.id;
                      const isCritical =
                        issue.severity === "critical" ||
                        (issue.severity as string) === "error";
                      const isWarning = issue.severity === "warning";

                      const borderClass = isSelected
                        ? "border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
                        : isCritical
                        ? "border-rose-200/90 hover:border-rose-300 bg-rose-50/15"
                        : "border-slate-200/80 hover:border-slate-300 bg-white";

                      const sevBadgeClass = isCritical
                        ? "bg-rose-50 text-rose-700 border border-rose-200/80"
                        : isWarning
                        ? "bg-amber-50 text-amber-800 border border-amber-200/80"
                        : "bg-slate-100 text-slate-700 border border-slate-200/80";

                      const sevLabel = isCritical ? "Critical" : isWarning ? "Warning" : "Suggestion";

                      const catLabel = (() => {
                        switch (issue.category) {
                          case "data_integrity": return "Data & Math";
                          case "compliance": return "Compliance";
                          case "copy": return "Copy & Spelling";
                          case "contrast": return "Contrast";
                          case "typography": return "Typography";
                          case "artifacts": return "Watermark / Logo";
                          case "margin":
                          case "layout": return "Layout & Bleed";
                          default: return "Quality";
                        }
                      })();

                      return (
                        <div
                          key={issue.id}
                          id={`issue-card-${issue.id}`}
                          onClick={() => setSelectedIssueId(issue.id)}
                          className={`rounded-xl border p-3.5 sm:p-4 transition-all cursor-pointer ${borderClass}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold ${sevBadgeClass}`}>
                                {sevLabel}
                              </span>
                              <span className="text-[11px] font-semibold text-slate-500">
                                {catLabel}
                              </span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              {issue.category === "copy" && issue.originalText && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddToDictionary(issue.originalText || "");
                                  }}
                                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                                  title="Add word to dictionary whitelist"
                                >
                                  + Whitelist
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDismiss(issue.id);
                                }}
                                className="text-[11px] font-medium text-slate-400 hover:text-slate-600 transition cursor-pointer"
                                title="Dismiss notice"
                              >
                                Dismiss
                              </button>
                            </div>
                          </div>

                          <h3 className="mt-1.5 text-sm font-bold text-slate-900 leading-snug">
                            {issue.originalText
                              ? issue.category === "copy"
                                ? `Misspelled: "${issue.originalText}"`
                                : issue.category === "contrast"
                                ? `Low Contrast: "${issue.originalText}"`
                                : `${issue.title}: "${issue.originalText}"`
                              : issue.title}
                          </h3>
                          <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                            {issue.description}
                          </p>

                          {/* Concise Fix Action */}
                          {issue.suggestedFix && (() => {
                            const typoMatch = issue.suggestedFix.match(/change to "([^"]+)"/i);
                            const cleanFix = typoMatch ? `Change to "${typoMatch[1]}"` : issue.suggestedFix;
                            const copyValue = typoMatch ? typoMatch[1] : issue.suggestedFix;

                            return (
                              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                                <p className="text-xs text-slate-800 truncate">
                                  <span className="font-bold text-slate-900">Fix: </span>
                                  <span>{cleanFix}</span>
                                </p>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyFix(issue.id, copyValue);
                                  }}
                                  className="shrink-0 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                                >
                                  {copiedId === issue.id ? "Copied" : "Copy"}
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* ADVISORY NOTE FOR PDF RESULTS */}
            {isPdfDoc && (
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/90 p-4 text-xs text-slate-500 shadow-xs">
                <p className="leading-relaxed">
                  <span className="font-semibold text-slate-700">Checked automatically:</span> spelling and copy, contrast, margins, placeholder text, expired dates, stock watermarks, page size, links.{" "}
                  <span className="font-semibold text-slate-700">Needs manual review in a PDF:</span> bleed and crop marks, color mode (RGB/CMYK), rich black, image DPI, font embedding.
                </p>
              </div>
            )}
          </div>
        )}
        {/* RELATED CREATIVE TOOLS SECTION */}
        <section className="mt-20 border-t border-slate-200/80 pt-14">
          <div className="text-center mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Cross-Tool Workflows</span>
            <h2 className="mt-1 text-xl sm:text-2xl font-black text-slate-900">Explore More Free Creative Tools</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/qr-code-generator"
              className="group p-5 rounded-2xl border border-slate-200/80 bg-white hover:border-blue-400/80 hover:shadow-md transition"
            >
              <div className="text-xs font-bold text-blue-600 uppercase mb-1">Print Scannability QA</div>
              <div className="font-bold text-slate-900 group-hover:text-blue-600 transition">QR Code Generator</div>
              <p className="mt-1 text-xs text-slate-500">Create custom QR codes and verify camera scannability before printing.</p>
            </Link>

            <Link
              href="/image-compressor"
              className="group p-5 rounded-2xl border border-slate-200/80 bg-white hover:border-blue-400/80 hover:shadow-md transition"
            >
              <div className="text-xs font-bold text-blue-600 uppercase mb-1">Optimizer</div>
              <div className="font-bold text-slate-900 group-hover:text-blue-600 transition">Image Compressor</div>
              <p className="mt-1 text-xs text-slate-500">Compress JPG, PNG &amp; PDFs with live split comparison.</p>
            </Link>

            <Link
              href="/flipbook"
              className="group p-5 rounded-2xl border border-slate-200/80 bg-white hover:border-blue-400/80 hover:shadow-md transition"
            >
              <div className="text-xs font-bold text-blue-600 uppercase mb-1">3D Publishing</div>
              <div className="font-bold text-slate-900 group-hover:text-blue-600 transition">3D Digital Flipbook</div>
              <p className="mt-1 text-xs text-slate-500">Turn PDFs into interactive 3D books with page-turn effects.</p>
            </Link>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <Footer currentPath="/design-check" />
    </div>
  );
}

