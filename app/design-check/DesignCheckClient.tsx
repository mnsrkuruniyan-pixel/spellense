"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";

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

const FAQ_ITEMS = [
  {
    q: "What types of designs and files can I audit with Design Check?",
    a: "You can audit graphic image files (PNG, JPG, WebP, SVG) and multi-page PDF documents up to 25 MB. This includes Canva graphics, Figma exports, marketing flyers, posters, promotional banners, brochures, business cards, and print layouts.",
  },
  {
    q: "How does Design Check find spelling errors and typos in graphics?",
    a: "Design Check extracts all visible typography using high-precision optical character recognition (OCR) and multimodal vision AI. It inspects headlines, body copy, pricing labels, and disclaimers to identify typos, misspelled words, repeated terms, and broken phrasing.",
  },
  {
    q: "What is WCAG contrast checking and why does it matter for creatives?",
    a: "WCAG (Web Content Accessibility Guidelines) mandates a minimum 4.5:1 luminance contrast ratio between foreground text and underlying background for standard copy. Design Check analyzes pixel luminance across text regions to flag low-contrast text that will look washed out in sunlight or on low-brightness phone screens.",
  },
  {
    q: "How does the Bleed and Safe-Zone margin check protect print and ads?",
    a: "Physical print trimmers and social media UI overlays (like Instagram, TikTok, or YouTube buttons and captions) can crop elements placed too close to the borders. Design Check flags any critical copy, logos, or discount badges placed within 3.5% to 5% of canvas edges.",
  },
  {
    q: "Can I audit multi-page PDF documents and catalogues?",
    a: "Yes! Multi-page PDF documents are rendered page-by-page. You can review and audit each page individually, navigate through pages, and export a consolidated multi-page QA pre-flight audit report.",
  },
  {
    q: "Are my uploaded designs and documents kept private?",
    a: "Yes, completely private. All processing occurs in-memory with zero disk persistence and no AI model training retention. Once your browser session ends, your uploaded artwork is completely cleared.",
  },
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
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

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
      let res = await fetch("/design-check-poster.webp");
      let fileName = "design-check-poster.webp";
      let fileType = "image/webp";

      if (!res.ok) {
        res = await fetch("/spellense-launch-banner.jpg");
        fileName = "sample-ad-creative.jpg";
        fileType = "image/jpeg";
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
    <div
      style={{ backgroundColor: "#faf9f6" }}
      className="flex min-h-screen flex-col bg-[#faf9f6] font-sans text-slate-800 antialiased selection:bg-[#bcd5ff] selection:text-black relative z-10 text-[15px]"
    >
      <Navbar onUploadClick={() => fileInputRef.current?.click()} />

      <main id="main-content" className="flex-1 pb-16 sm:pb-24">
        {/* HOMEPAGE-MATCHED HERO */}
        {!result && (
          <section className="relative overflow-hidden pt-3 sm:pt-6 pb-2">
            <div className="relative mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-5xl text-center pt-2 sm:pt-4 pb-2">
                <div
                  style={{
                    color: "#3158d5",
                    letterSpacing: "0.18em",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                  className="inline-flex items-center uppercase mb-3 sm:mb-4"
                >
                  VISUAL PRE-FLIGHT QUALITY CHECK
                </div>
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
                    Design boldly.
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
                    Publish confidently.
                  </span>
                </h1>
                <p
                  style={{
                    color: "#70746d",
                    fontSize: "15px",
                    lineHeight: 1.5,
                    maxWidth: "none",
                    margin: "12px auto 0",
                  }}
                  className="text-center font-normal sm:whitespace-nowrap"
                >
                  Catch copy, contrast and margin issues before you publish.
                </p>
              </div>
            </div>
          </section>
        )}

        <section className={`mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 ${result ? "mt-0 pb-0" : "pb-16 mt-3 sm:mt-5"}`}>
          <div className="mx-auto w-full">
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

            {/* UPLOAD ZONE (WHEN NO FILE OR WHEN CHANGING) */}
            {!result && (
              <div>
                <div
                  style={{
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    backgroundColor: "#ecebe4",
                    boxShadow: "none",
                  }}
                  className={`relative w-full overflow-hidden rounded-2xl sm:rounded-[24px] transition-all duration-300 ${
                    isDragging ? "ring-2 ring-[#3158d5]/20" : ""
                  }`}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
                    {/* LEFT COLUMN: TABS, CONTROLS & DROPZONE */}
                    <div
                      style={{ borderRight: "1px solid #e5e5df" }}
                      className="flex flex-col justify-between bg-white p-5 sm:p-7 lg:col-span-5"
                    >
                      <div>
                        {/* HEADER */}
                        <div
                          style={{ borderBottom: "1px solid #e5e5df" }}
                          className="flex items-center justify-between pb-3 sm:pb-3.5"
                        >
                          <div className="flex items-center gap-2 text-xs font-bold text-[#1c201a]">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#3158d5"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                            <span className="uppercase text-[11px] tracking-wider text-[#70746d]">
                              design-check
                            </span>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#3158d5] bg-[#f0f5ff] border border-[#bcd5ff] px-2 py-0.5 rounded-full">
                            PRE-FLIGHT QA
                          </span>
                        </div>

                        {/* DASHED DROP ZONE */}
                        <div
                          onDragEnter={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                          }}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onClick={() => {
                            if (!loading) fileInputRef.current?.click();
                          }}
                          aria-busy={loading}
                          style={{ borderColor: "#e5e5df", backgroundColor: "#ffffff" }}
                          className={`mt-5 rounded-xl border border-dashed p-6 text-center transition-all sm:p-7 ${
                            loading ? "cursor-progress" : "cursor-pointer"
                          } ${
                            isDragging
                              ? "border-[#3158d5] bg-blue-50/70"
                              : "hover:border-[#3158d5]/50"
                          }`}
                        >
                          {loading ? (
                            <div className="mx-auto max-w-sm" aria-live="polite">
                              <h3 className="text-sm font-bold text-[#1c201a]">
                                Checking your design...
                              </h3>
                              <button
                                type="button"
                                disabled
                                style={{ backgroundColor: "#3158d5", color: "#ffffff" }}
                                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-3 text-xs sm:text-sm font-bold shadow-xs disabled:cursor-not-allowed disabled:opacity-75"
                              >
                                <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                                <span>{ANALYSIS_STEPS[currentStepIndex]}</span>
                              </button>
                            </div>
                          ) : (
                            <>
                          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg text-[#3158d5]">
                            <svg
                              width="26"
                              height="26"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                              <path d="M12 18v-6" />
                              <path d="m9 15 3-3 3 3" />
                            </svg>
                          </div>

                          <h3 className="mt-2.5 text-sm sm:text-[15px] font-bold text-[#1c201a]">
                            Drop your artwork here
                          </h3>

                          <div className="mt-3.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                fileInputRef.current?.click();
                              }}
                              style={{ backgroundColor: "#3158d5", color: "#ffffff" }}
                              className="inline-flex items-center justify-center gap-2 rounded-lg px-7 py-2.5 text-sm font-bold shadow-xs transition hover:opacity-95 active:scale-[0.98] cursor-pointer min-w-[150px]"
                            >
                              <span>Choose file</span>
                              <span className="text-base font-bold">↗</span>
                            </button>
                          </div>

                          <p className="mt-2.5 text-[11px] text-[#767a74]">
                            Images, PDFs &amp; SVG · Up to 25 MB
                          </p>
                            </>
                          )}
                        </div>

                        <div className="mt-3.5 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLoadSample();
                            }}
                            disabled={loadingSample}
                            className="text-xs font-semibold text-[#1c201a] hover:underline inline-flex items-center gap-1 cursor-pointer disabled:opacity-60"
                          >
                            <span>{loadingSample ? "Loading sample..." : "Try a sample document"}</span>
                            <span>→</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: DESIGN CHECK SAMPLE AUDIT */}
                    <div
                      style={{ backgroundColor: "#ecebe4" }}
                      className="flex flex-col justify-between p-3.5 sm:p-5 lg:p-7 lg:col-span-7"
                    >
                      <div>
                        <div
                          style={{ borderBottom: "1px solid #deded6" }}
                          className="flex items-center justify-between pb-3 sm:pb-3.5"
                        >
                          <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                            <svg
                              width="15"
                              height="15"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="text-slate-500"
                            >
                              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                              <circle cx="9" cy="9" r="2" />
                              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                            </svg>
                            <span>design-check-poster.webp</span>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8e928a]">
                            DESIGN AUDIT PREVIEW
                          </span>
                        </div>

                        {/* DESKTOP DESIGN AUDIT PREVIEW */}
                        <div className="hidden lg:flex mt-5 flex-row items-start gap-6">
                          {/* ARTWORK CARD */}
                          <div
                            onClick={handleLoadSample}
                            style={{ width: "240px", minWidth: "220px", maxWidth: "250px", flexShrink: 0 }}
                            className="rounded-xl overflow-hidden shadow-xs border border-[#deded6] bg-white cursor-pointer group/art transition hover:scale-[1.01]"
                            title="Click to inspect this sample document"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src="/design-check-poster.webp"
                              alt="Creative QA poster sample with spelling, contrast, and safe-margin findings"
                              className="w-full h-auto object-cover"
                            />
                          </div>

                          {/* ISSUES LIST */}
                          <div className="flex-1 min-w-0 w-full flex flex-col justify-between self-stretch">
                            <div>
                              <div className="flex items-center gap-2 text-xs font-bold text-[#1c201a]">
                                <span style={{ backgroundColor: "#b85a46" }} className="h-2 w-2 rounded-full inline-block" />
                                <span>3 design issues detected</span>
                              </div>

                              {/* ISSUE 1: headline typo */}
                              <div
                                style={{ border: "2px solid #365cd6", backgroundColor: "#ffffff" }}
                                className="mt-3 rounded-xl p-3.5 shadow-xs"
                              >
                                <div className="text-[10px] font-bold uppercase tracking-wider text-[#8e928a]">
                                  TYPOGRAPHY · MISSPELLING
                                </div>
                                <div className="mt-1 flex items-center gap-2 text-xs font-bold">
                                  <span style={{ color: "#b85a46" }} className="line-through">DESGIN</span>
                                  <span className="text-slate-400 font-normal">→</span>
                                  <span className="text-[#1c201a]">DESIGN</span>
                                </div>
                                <p className="mt-1 text-[11px] text-[#767a74]">
                                  Misspelled poster headline
                                </p>
                              </div>

                              {/* ISSUE 2: low contrast copy */}
                              <div
                                style={{ border: "1px solid #deded6", backgroundColor: "#ffffff" }}
                                className="mt-2.5 rounded-xl p-3.5 shadow-2xs"
                              >
                                <div className="text-[10px] font-bold uppercase tracking-wider text-[#8e928a]">
                                  ACCESSIBILITY · LOW CONTRAST
                                </div>
                                <div className="mt-1 flex items-center gap-2 text-xs font-bold">
                                  <span className="text-[#767a74]">TYPE • CONTRAST • MARGINS</span>
                                  <span className="text-slate-400 font-normal">→</span>
                                  <span className="text-[#1c201a]">Increase contrast</span>
                                </div>
                                <p className="mt-1 text-[11px] text-[#767a74]">Pale text on a cream background</p>
                              </div>

                              {/* ISSUE 3: text too close to trim edge */}
                              <div
                                style={{ border: "1px solid #deded6", backgroundColor: "#ffffff" }}
                                className="mt-2.5 rounded-xl p-3.5 shadow-2xs"
                              >
                                <div className="text-[10px] font-bold uppercase tracking-wider text-[#8e928a]">
                                  PRINT · SAFE MARGIN
                                </div>
                                <div className="mt-1 flex items-center gap-2 text-xs font-bold">
                                  <span style={{ color: "#b85a46" }} className="line-through">OCT 28 — 10 AM</span>
                                  <span className="text-slate-400 font-normal">→</span>
                                  <span className="text-[#1c201a]">Move inside trim area</span>
                                </div>
                              </div>
                            </div>

                          </div>
                        </div>

                        {/* MOBILE & TABLET DESIGN AUDIT PREVIEW */}
                        <div className="block lg:hidden mt-3.5 sm:mt-5">
                          <div className="flex flex-row items-start gap-3 sm:gap-4">
                            {/* ARTWORK CARD */}
                            <div
                              onClick={handleLoadSample}
                              style={{ width: "38%", minWidth: "120px", maxWidth: "165px", flexShrink: 0 }}
                              className="rounded-xl overflow-hidden shadow-xs border border-[#deded6] bg-white cursor-pointer group/art transition hover:scale-[1.01]"
                              title="Click to inspect this sample document"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                              src="/design-check-poster.webp"
                              alt="Creative QA poster sample with spelling, contrast, and safe-margin findings"
                                className="w-full h-auto object-cover block"
                              />
                            </div>

                            {/* ISSUES LIST */}
                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold text-[#1c201a]">
                                  <span style={{ backgroundColor: "#b85a46" }} className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full inline-block" />
                                  <span>3 design issues detected</span>
                                </div>

                                {/* ISSUE 1: headline typo */}
                                <div
                                  style={{ border: "2px solid #3158d5", backgroundColor: "#ffffff" }}
                                  className="mt-2 sm:mt-3 rounded-xl p-2.5 sm:p-3.5 shadow-xs"
                                >
                                  <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#8e928a]">
                                    TYPOGRAPHY · MISSPELLING
                                  </div>
                                  <div className="mt-0.5 sm:mt-1 flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold">
                                    <span style={{ color: "#b85a46" }} className="line-through">DESGIN</span>
                                    <span className="text-slate-400 font-normal">→</span>
                                    <span className="text-[#1c201a]">DESIGN</span>
                                  </div>
                                  <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] text-[#767a74]">
                                    Misspelled poster headline
                                  </p>
                                </div>

                                {/* ISSUE 2: low contrast copy */}
                                <div
                                  style={{ border: "1px solid #deded6", backgroundColor: "#ffffff" }}
                                  className="mt-2 sm:mt-2.5 rounded-xl p-2.5 sm:p-3.5 shadow-2xs"
                                >
                                  <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#8e928a]">
                                    ACCESSIBILITY · LOW CONTRAST
                                  </div>
                                  <div className="mt-0.5 sm:mt-1 flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold">
                                    <span className="text-[#767a74]">TYPE • CONTRAST • MARGINS</span>
                                    <span className="text-slate-400 font-normal">→</span>
                                    <span className="text-[#1c201a]">Increase contrast</span>
                                  </div>
                                <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] text-[#767a74]">Pale text on cream</p>
                              </div>

                              {/* ISSUE 3: text too close to trim edge */}
                              <div
                                style={{ border: "1px solid #deded6", backgroundColor: "#ffffff" }}
                                className="mt-2 sm:mt-2.5 rounded-xl p-2.5 sm:p-3.5 shadow-2xs"
                              >
                                <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#8e928a]">
                                  PRINT · SAFE MARGIN
                                </div>
                                <div className="mt-0.5 sm:mt-1 flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold">
                                  <span style={{ color: "#b85a46" }} className="line-through">OCT 28 — 10 AM</span>
                                  <span className="text-slate-400 font-normal">→</span>
                                  <span className="text-[#1c201a]">Move inside trim area</span>
                                </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs leading-relaxed text-rose-800 sm:text-sm">
                          <span className="font-bold">Development notice:</span>{" "}
                          This page is still under development, so results may not be fully accurate.
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* 4 Trust Feature Cards */}
                <div className="mt-6">
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div
                      style={{
                        borderColor: "#e5e5df",
                        borderWidth: "1px",
                        borderStyle: "solid",
                        backgroundColor: "#ffffff",
                      }}
                      className="flex items-center gap-3 p-3.5 rounded-2xl shadow-2xs"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f0f5ff] text-[#3158d5]">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#1c201a]">
                          High-Res Pre-Flight
                        </div>
                        <div className="text-[11px] text-[#70746d] mt-0.5">
                          PNG, JPG, WebP, SVG, PDF
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        borderColor: "#e5e5df",
                        borderWidth: "1px",
                        borderStyle: "solid",
                        backgroundColor: "#ffffff",
                      }}
                      className="flex items-center gap-3 p-3.5 rounded-2xl shadow-2xs"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f0f5ff] text-[#3158d5]">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#1c201a]">
                          Comprehensive QA
                        </div>
                        <div className="text-[11px] text-[#70746d] mt-0.5">
                          Contrast, bleed &amp; layout
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        borderColor: "#e5e5df",
                        borderWidth: "1px",
                        borderStyle: "solid",
                        backgroundColor: "#ffffff",
                      }}
                      className="flex items-center gap-3 p-3.5 rounded-2xl shadow-2xs"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f0f5ff] text-[#3158d5]">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z" />
                          <path d="m9 12 2 2 4-4" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#1c201a]">
                          No Signup Required
                        </div>
                        <div className="text-[11px] text-[#70746d] mt-0.5">
                          Instant check • 100% Free
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        borderColor: "#e5e5df",
                        borderWidth: "1px",
                        borderStyle: "solid",
                        backgroundColor: "#ffffff",
                      }}
                      className="flex items-center gap-3 p-3.5 rounded-2xl shadow-2xs"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f0f5ff] text-[#3158d5]">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#1c201a]">
                          Strictly Private
                        </div>
                        <div className="text-[11px] text-[#70746d] mt-0.5">
                          In-memory • Zero storage
                        </div>
                      </div>
                    </div>
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
              <div className="mt-14 sm:mt-16 space-y-8 sm:space-y-12">
                {/* SECTION 1: INTRO BENTO CARD */}
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
                    <span className="text-xs font-bold uppercase tracking-wider text-[#3158d5]">
                      Automated Creative QA
                    </span>
                    <h2 className="mt-1 text-xl sm:text-2xl font-black text-[#1c201a]">
                      Catch Costly Design Mistakes Before Publishing or Printing
                    </h2>
                    <p className="mt-2.5 text-xs sm:text-sm text-[#575a53] leading-relaxed font-normal">
                      Spellense AI Design Check acts as an automated visual pre-flight inspector for Canva graphics, Figma exports, social media ads, flyers, and multi-page PDFs. Combining multimodal vision AI and mathematical pixel analysis, it audits spelling typos, WCAG contrast ratios, and bleed margin safe-zones in seconds.
                    </p>
                  </div>
                </ScrollReveal>

                {/* SECTION 2: 3-STEP PROCESS CARD */}
                <ScrollReveal delay={50}>
                  <div
                    style={{
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      backgroundColor: "#faf9f6",
                    }}
                    className="rounded-2xl sm:rounded-[24px] p-6 sm:p-8 shadow-2xs"
                  >
                    <div className="text-center mb-8">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#3158d5]">
                        Step-by-Step Workflow
                      </span>
                      <h3 className="mt-1 text-xl sm:text-2xl font-black text-[#1c201a]">
                        How Design Check Works
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div
                        style={{
                          borderColor: "#e5e5df",
                          borderWidth: "1px",
                          borderStyle: "solid",
                          backgroundColor: "#ffffff",
                        }}
                        className="flex flex-col items-center text-center p-5 rounded-2xl shadow-2xs"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3158d5] text-white font-bold text-sm shadow-xs">
                          1
                        </div>
                        <h4 className="mt-3 text-sm font-bold text-[#1c201a]">Upload Artwork</h4>
                        <p className="mt-1 text-xs text-[#70746d] leading-relaxed">
                          Drop high-res PNG, JPG, WebP images, or multi-page PDF documents up to 25 MB.
                        </p>
                      </div>

                      <div
                        style={{
                          borderColor: "#e5e5df",
                          borderWidth: "1px",
                          borderStyle: "solid",
                          backgroundColor: "#ffffff",
                        }}
                        className="flex flex-col items-center text-center p-5 rounded-2xl shadow-2xs"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3158d5] text-white font-bold text-sm shadow-xs">
                          2
                        </div>
                        <h4 className="mt-3 text-sm font-bold text-[#1c201a]">Automated Inspection</h4>
                        <p className="mt-1 text-xs text-[#70746d] leading-relaxed">
                          Parallel algorithms compute WCAG contrast ratios, bleed safe-zones, and multimodal copy proofreading.
                        </p>
                      </div>

                      <div
                        style={{
                          borderColor: "#e5e5df",
                          borderWidth: "1px",
                          borderStyle: "solid",
                          backgroundColor: "#ffffff",
                        }}
                        className="flex flex-col items-center text-center p-5 rounded-2xl shadow-2xs"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3158d5] text-white font-bold text-sm shadow-xs">
                          3
                        </div>
                        <h4 className="mt-3 text-sm font-bold text-[#1c201a]">Interactive Fixes</h4>
                        <p className="mt-1 text-xs text-[#70746d] leading-relaxed">
                          Click squiggly markers directly on the canvas to inspect, whitelist, or copy recommended fixes.
                        </p>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>

                {/* SECTION 3: 6-GRID FEATURE HIGHLIGHTS */}
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
                    <div className="text-center mb-8">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#3158d5]">
                        Comprehensive QA Pillars
                      </span>
                      <h3 className="mt-1 text-xl sm:text-2xl font-black text-[#1c201a]">
                        Engineered for Agency &amp; Print Precision
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Card 1 */}
                      <div
                        style={{
                          borderColor: "#e5e5df",
                          borderWidth: "1px",
                          borderStyle: "solid",
                          backgroundColor: "#faf9f6",
                        }}
                        className="p-5 rounded-2xl shadow-2xs transition hover:bg-white hover:border-[#b8d1fc]"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0f5ff] text-[#3158d5]">
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 2a10 10 0 0 1 0 20z" fill="currentColor" />
                          </svg>
                        </div>
                        <h4 className="mt-3.5 text-sm font-bold text-[#1c201a]">WCAG Contrast Math</h4>
                        <p className="mt-1 text-xs text-[#70746d] leading-relaxed">
                          Measures pixel luminance ratio between text and its underlying background to guarantee 4.5:1 AA readability under harsh sunlight.
                        </p>
                      </div>

                      {/* Card 2 */}
                      <div
                        style={{
                          borderColor: "#e5e5df",
                          borderWidth: "1px",
                          borderStyle: "solid",
                          backgroundColor: "#faf9f6",
                        }}
                        className="p-5 rounded-2xl shadow-2xs transition hover:bg-white hover:border-[#b8d1fc]"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0f5ff] text-[#3158d5]">
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M6 2v14a2 2 0 0 0 2 2h14" />
                            <path d="M18 22V8a2 2 0 0 0-2-2H2" />
                          </svg>
                        </div>
                        <h4 className="mt-3.5 text-sm font-bold text-[#1c201a]">Margin &amp; Bleed Safe-Zones</h4>
                        <p className="mt-1 text-xs text-[#70746d] leading-relaxed">
                          Identifies critical copy, discount codes, or logos placed within 3.5% of canvas borders, preventing print cutting or social app UI cropping.
                        </p>
                      </div>

                      {/* Card 3 */}
                      <div
                        style={{
                          borderColor: "#e5e5df",
                          borderWidth: "1px",
                          borderStyle: "solid",
                          backgroundColor: "#faf9f6",
                        }}
                        className="p-5 rounded-2xl shadow-2xs transition hover:bg-white hover:border-[#b8d1fc]"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0f5ff] text-[#3158d5]">
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="m3 16 4.5-9 4.5 9" />
                            <path d="M5 12h5" />
                            <path d="m15 11 3 3 5-5" />
                          </svg>
                        </div>
                        <h4 className="mt-3.5 text-sm font-bold text-[#1c201a]">AI Copy &amp; Headline QA</h4>
                        <p className="mt-1 text-xs text-[#70746d] leading-relaxed">
                          Multimodal vision AI proofreads visible slogans, body text, and banners to catch grammar errors, typos, and repeated words.
                        </p>
                      </div>

                      {/* Card 4 */}
                      <div
                        style={{
                          borderColor: "#e5e5df",
                          borderWidth: "1px",
                          borderStyle: "solid",
                          backgroundColor: "#faf9f6",
                        }}
                        className="p-5 rounded-2xl shadow-2xs transition hover:bg-white hover:border-[#b8d1fc]"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0f5ff] text-[#3158d5]">
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <polyline points="10 9 9 9 8 9" />
                          </svg>
                        </div>
                        <h4 className="mt-3.5 text-sm font-bold text-[#1c201a]">Multi-Page PDF Support</h4>
                        <p className="mt-1 text-xs text-[#70746d] leading-relaxed">
                          Render multi-page catalogs, brochures, or slide decks page-by-page with full pagination and consolidated multi-page audit scoring.
                        </p>
                      </div>

                      {/* Card 5 */}
                      <div
                        style={{
                          borderColor: "#e5e5df",
                          borderWidth: "1px",
                          borderStyle: "solid",
                          backgroundColor: "#faf9f6",
                        }}
                        className="p-5 rounded-2xl shadow-2xs transition hover:bg-white hover:border-[#b8d1fc]"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0f5ff] text-[#3158d5]">
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                        </div>
                        <h4 className="mt-3.5 text-sm font-bold text-[#1c201a]">100% In-Memory Privacy</h4>
                        <p className="mt-1 text-xs text-[#70746d] leading-relaxed">
                          No disk retention, no permanent database storage, and no AI model training on your artwork. Ephemeral and strictly private.
                        </p>
                      </div>

                      {/* Card 6 */}
                      <div
                        style={{
                          borderColor: "#e5e5df",
                          borderWidth: "1px",
                          borderStyle: "solid",
                          backgroundColor: "#faf9f6",
                        }}
                        className="p-5 rounded-2xl shadow-2xs transition hover:bg-white hover:border-[#b8d1fc]"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0f5ff] text-[#3158d5]">
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                        </div>
                        <h4 className="mt-3.5 text-sm font-bold text-[#1c201a]">Exportable QA Reports</h4>
                        <p className="mt-1 text-xs text-[#70746d] leading-relaxed">
                          Download agency-grade pre-flight quality reports formatted with line-by-line findings, severity rankings, and actionable fixes.
                        </p>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>

                {/* SECTION 4: FAQ SECTION — 2-Column Clean Layout (HOMEPAGE MATCH) */}
                <div
                  style={{
                    borderTop: "1px solid #e5e5df",
                    paddingTop: "48px",
                  }}
                  className="w-full pb-12 sm:pb-16"
                >
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
                        Design Check FAQ
                      </h2>
                      <p className="mt-2 text-xs sm:text-sm text-[#70746d] leading-relaxed font-normal">
                        Everything you need to know about pre-flight quality checks, Canva &amp; Figma designs, WCAG contrast, and PDF print margins.
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
                                <span className="text-xs sm:text-sm font-bold text-[#1c201a] pr-4">
                                  {faq.q}
                                </span>
                                <div
                                  style={{
                                    borderColor: "#e5e5df",
                                    borderWidth: "1px",
                                    borderStyle: "solid",
                                    backgroundColor: isOpen ? "#f0f5ff" : "#faf9f6",
                                    color: isOpen ? "#3158d5" : "#70746d",
                                  }}
                                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition"
                                >
                                  <span
                                    className={`transform transition-transform duration-200 ${
                                      isOpen ? "rotate-180" : ""
                                    }`}
                                  >
                                    ↓
                                  </span>
                                </div>
                              </button>

                              <div
                                id={`faq-answer-${index}`}
                                role="region"
                                aria-labelledby={`faq-btn-${index}`}
                                className={`grid transition-all duration-200 ease-in-out ${
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
                </div>

                {/* SECTION 5: RELATED CREATIVE TOOLS SECTION — Matching Image to Text Bento Card */}
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
                            Extract editable text from images, photos, and scanned PDFs instantly with OCR.
                          </p>
                        </Link>

                        <Link
                          href="/qr-code-generator"
                          style={{
                            borderColor: "#e5e5df",
                            borderWidth: "1px",
                            borderStyle: "solid",
                            backgroundColor: "#faf9f6",
                          }}
                          className="group p-5 rounded-2xl hover:border-[#3158d5] hover:bg-white shadow-2xs transition"
                        >
                          <div className="text-xs font-bold text-[#3158d5] uppercase mb-1">
                            Print Scannability QA
                          </div>
                          <div className="font-bold text-[#1c201a] group-hover:text-[#3158d5] transition">
                            QR Code Generator
                          </div>
                          <p className="mt-1 text-xs text-[#70746d]">
                            Create custom QR codes and verify camera scannability before printing.
                          </p>
                        </Link>

                        <Link
                          href="/image-compressor"
                          style={{
                            borderColor: "#e5e5df",
                            borderWidth: "1px",
                            borderStyle: "solid",
                            backgroundColor: "#faf9f6",
                          }}
                          className="group p-5 rounded-2xl hover:border-[#3158d5] hover:bg-white shadow-2xs transition"
                        >
                          <div className="text-xs font-bold text-[#3158d5] uppercase mb-1">
                            Optimizer
                          </div>
                          <div className="font-bold text-[#1c201a] group-hover:text-[#3158d5] transition">
                            Image Compressor
                          </div>
                          <p className="mt-1 text-xs text-[#70746d]">
                            Compress JPG, PNG &amp; PDFs with live split comparison and no quality loss.
                          </p>
                        </Link>
                      </div>
                    </div>
                  </ScrollReveal>
                </div>

                {/* SECTION 6: FOOTER ACTION LINKS */}
                <ScrollReveal
                  delay={180}
                  style={{ borderTop: "1px solid #e5e5df" }}
                  className="mt-12 flex flex-wrap items-center justify-between gap-4 pt-8 text-xs text-slate-500"
                >
                  <div className="flex flex-wrap items-center gap-5 font-medium">
                    <Link href="/faq" className="hover:text-[#3158d5] transition">
                      Frequently Asked Questions →
                    </Link>
                    <Link href="/privacy" className="hover:text-[#3158d5] transition">
                      Privacy Policy →
                    </Link>
                    <Link href="/terms" className="hover:text-[#3158d5] transition">
                      Terms of Service →
                    </Link>
                  </div>

                  <div className="text-slate-400">
                    In-memory Pre-Flight &bull; Zero Disk Storage
                  </div>
                </ScrollReveal>
              </div>
            )}
          </div>
        </section>

        {/* RESULT DASHBOARD */}
        {result && imageUrl && (
          <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 pb-20">
            <div className="mt-3 space-y-6 sm:mt-4">
            <div className="text-center">
              <div style={{ borderColor: "#e5e5df" }} className="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-1.5 shadow-2xs">
                <span className={`h-2 w-2 rounded-full ${result.verdict === "ready" ? "bg-emerald-500" : result.verdict === "critical_issues" ? "bg-rose-500" : "bg-amber-500"}`} />
                <span className={`text-[11px] font-bold uppercase tracking-wider ${result.verdict === "ready" ? "text-emerald-600" : result.verdict === "critical_issues" ? "text-rose-600" : "text-amber-700"}`}>
                  DESIGN CHECK COMPLETE · {activeIssues.length} FINDING{activeIssues.length === 1 ? "" : "S"}
                </span>
              </div>
              <h1 className="mt-4 text-3xl font-extrabold tracking-[-1.2px] text-[#1c201a] sm:text-4xl lg:text-[42px]">
                {result.engine === "local-deterministic"
                  ? "Design check complete"
                  : result.verdictTitle || "Your design check is complete"}
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-relaxed text-[#70746d] sm:text-base">
                {result.engine === "local-deterministic"
                  ? "Review the findings below and verify key details manually."
                  : result.verdictSummary || "Review the findings and marked positions in your artwork below."}
              </p>
            </div>

            {/* PDF PAGE NAVIGATOR */}
            {pdfTotalPages > 1 && (
              <div style={{ borderColor: "#e5e5df" }} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-3.5 shadow-xs sm:px-5">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-[#3158d5] animate-pulse" />
                  <span className="text-xs font-bold text-[#1c201a] sm:text-sm">
                    PDF Page <span className="text-[#3158d5] font-extrabold">{pdfPage}</span> of {pdfTotalPages}
                  </span>
                  <span className="ml-1 rounded-full bg-[#efeee7] px-2 py-0.5 text-[10px] font-semibold text-[#70746d] hidden sm:inline">
                    Click Next to audit subsequent pages
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => goToPdfPage(pdfPage - 1)}
                    disabled={pdfPage <= 1 || loadingPage}
                    style={{ borderColor: "#e5e5df" }}
                    className="flex items-center gap-1 rounded-xl border bg-white px-3 py-1.5 text-xs font-bold text-[#1c201a] transition hover:bg-[#f6f5f3] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span>‹</span> <span>Previous</span>
                  </button>
                  <select
                    value={pdfPage}
                    onChange={(e) => goToPdfPage(Number(e.target.value))}
                    disabled={loadingPage}
                    aria-label="Select PDF page"
                    style={{ borderColor: "#e5e5df" }}
                    className="rounded-xl border bg-white px-2.5 py-1.5 text-xs font-bold text-[#1c201a] cursor-pointer"
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
                    className="flex items-center gap-1.5 rounded-xl bg-[#3158d5] px-3.5 py-1.5 text-xs font-bold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
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

              const verdictTitle = result.engine === "local-deterministic"
                ? "Manual review recommended"
                : result.verdictTitle || defaultTitle;
              const verdictSummary = result.engine === "local-deterministic"
                ? "Automated checks covered spelling, contrast, margins and image size. Other details need your review."
                : result.verdictSummary || defaultSummary;

              return (
                <div
                  style={{ borderColor: "#e5e5df" }}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-4 shadow-xs transition-all sm:p-5"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl font-bold shadow-xs ${
                        isReady
                          ? "bg-emerald-600 text-white"
                          : isCritical
                          ? "bg-[#e11d48] text-white"
                          : "bg-amber-500 text-white"
                      }`}
                    >
                      <span className="text-xl leading-none font-extrabold">{result.score}</span>
                      <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider opacity-85">Score</span>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          style={{
                            borderColor: isReady ? "#a7f3d0" : isCritical ? "#fecdd3" : "#ece4cb",
                          }}
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            isReady
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : isCritical
                              ? "bg-[#fef2f2] text-[#e11d48] border border-[#fecdd3]"
                              : "bg-amber-100 text-amber-900 border border-amber-200"
                          }`}
                        >
                          {isReady ? "Passed" : isCritical ? "Action Required" : "Needs Review"}
                        </span>
                        <h2 className="text-base font-extrabold text-[#1c201a]">
                          {verdictTitle}
                        </h2>
                        <span style={{ borderColor: "#e5e5df" }} className="rounded-full bg-white/90 border px-2 py-0.5 text-[10px] font-bold text-[#70746d] uppercase">
                          {result.engine === "hybrid-gemini" ? "AI + Automated Checks" : "Limited Automated Checks"}
                        </span>
                        {result.ocrEngine && (
                          <span style={{ borderColor: "#d1fae5" }} className="rounded-full bg-emerald-50 border px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase flex items-center gap-1 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            {result.ocrEngine}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-[#70746d] max-w-2xl leading-relaxed">
                        {verdictSummary}
                      </p>
                      {/* Severity-Weighted Summary Counts */}
                      {result.verdictCounts && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                          {result.verdictCounts.critical > 0 && (
                          <span style={{ borderColor: "#fecdd3" }} className="inline-flex items-center rounded-full bg-[#fef2f2] text-[#e11d48] px-2.5 py-0.5 border">
                              {result.verdictCounts.critical} Critical Blockers
                            </span>
                          )}
                          {result.verdictCounts.warning > 0 && (
                            <span style={{ borderColor: "#ece4cb" }} className="inline-flex items-center rounded-full bg-[#fff8e6] text-amber-800 px-2.5 py-0.5 border">
                              {result.verdictCounts.warning} Warnings to Verify
                            </span>
                          )}
                          {result.verdictCounts.suggestion > 0 && (
                          <span style={{ borderColor: "#e5e5df" }} className="inline-flex items-center rounded-full bg-[#efeee7] text-[#3158d5] px-2.5 py-0.5 border">
                              {result.verdictCounts.suggestion} Polish Suggestions
                            </span>
                          )}
                          {result.verdictCounts.total === 0 && (
                            <span style={{ borderColor: "#d1fae5" }} className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-800 px-2.5 py-0.5 border">
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
                      style={{ borderColor: "#e5e5df" }}
                      className="inline-flex items-center gap-1.5 rounded-xl border bg-white px-3.5 py-2 text-xs font-semibold text-[#1c201a] shadow-xs transition hover:bg-[#f6f5f3] active:scale-95"
                    >
                      <svg className="h-4 w-4 text-[#70746d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Export QA Audit
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ backgroundColor: "#3158d5", color: "#ffffff" }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#3158d5] px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:opacity-95 active:scale-95"
                    >
                      Audit Another Design
                    </button>
                  </div>
                </div>
              );
            })()}

            {result.analysisNotice && (
              <div style={{ borderColor: "#e5e5df" }} className="rounded-xl border bg-[#fffdf4] p-4 text-sm text-amber-950" role="status">
                <p className="font-bold">Not checked automatically</p>
                <p className="mt-1 leading-relaxed">
                  {result.engine === "local-deterministic"
                    ? "Prices, dates, contact details, legal requirements and overall design quality."
                    : result.analysisNotice}
                </p>
              </div>
            )}

            {/* POSITIVE HIGHLIGHTS: WHAT'S WORKING WELL (RULE 5) */}
            {result.positiveHighlights && result.positiveHighlights.length > 0 && (
              <div style={{ borderColor: "#e5e5df" }} className="rounded-2xl border bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-white p-4 sm:p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[11px] font-bold">✓</span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                      What&apos;s Working Well
                    </h3>
                    <span style={{ borderColor: "#d1fae5" }} className="rounded-full bg-emerald-100/90 border px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      Creative QA Strengths
                    </span>
                  </div>
                  <span className="text-[11px] text-[#888d84] font-medium hidden sm:inline">
                    Pre-Flight Observations
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {result.positiveHighlights.map((highlight, idx) => (
                    <div
                      key={idx}
                      style={{ borderColor: "#e5e5df" }}
                      className="flex items-start gap-2.5 rounded-xl border bg-white/95 p-3 shadow-2xs transition hover:border-emerald-200"
                    >
                      <span className="mt-0.5 text-xs text-emerald-600 font-bold">✓</span>
                      <p className="text-xs font-medium leading-relaxed text-[#1c201a]">{highlight}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <section style={{ borderColor: "#e5e5df" }} className="overflow-hidden rounded-2xl border bg-white shadow-xs">
              <div style={{ borderBottom: "1px solid #e5e5df", backgroundColor: "#faf9f6" }} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 sm:px-6">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#3158d5]" />
                  <h2 className="text-xs font-bold text-[#1c201a] sm:text-sm">Design Check Overview &amp; Insights</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-[#efeee7] px-2 py-0.5 text-[10px] font-bold text-[#3158d5]">
                    {result.engine === "hybrid-gemini" ? "AI + Automated Checks" : "Limited Automated Checks"}
                  </span>
                  {result.ocrEngine && (
                    <span style={{ borderColor: "#d1fae5" }} className="rounded-md border bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      {result.ocrEngine}
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 p-5 text-center sm:grid-cols-4 sm:p-6">
                <div style={{ borderColor: "#e5e5df" }} className="rounded-xl border bg-white p-4">
                  <p className="text-2xl font-extrabold tracking-tight text-[#1c201a]">{result.categoryScores.dataScore ?? result.categoryScores.copyScore}%</p>
                  <p className="mt-0.5 text-xs font-semibold text-[#70746d]">Data &amp; Copy</p>
                </div>
                <div style={{ borderColor: "#e5e5df" }} className="rounded-xl border bg-white p-4">
                  <p className="text-2xl font-extrabold tracking-tight text-[#1c201a]">{result.categoryScores.complianceScore ?? result.categoryScores.qualityScore}%</p>
                  <p className="mt-0.5 text-xs font-semibold text-[#70746d]">Legal &amp; Asterisk</p>
                </div>
                <div style={{ borderColor: "#e5e5df" }} className="rounded-xl border bg-white p-4">
                  <p className="text-2xl font-extrabold tracking-tight text-[#1c201a]">{result.categoryScores.layoutScore ?? result.categoryScores.marginScore}%</p>
                  <p className="mt-0.5 text-xs font-semibold text-[#70746d]">Layout &amp; Bleed</p>
                </div>
                <div style={{ borderColor: "#e5e5df" }} className="rounded-xl border bg-white p-4">
                  <p className="text-2xl font-extrabold tracking-tight text-[#3158d5]">{result.categoryScores.visualScore ?? result.categoryScores.contrastScore}%</p>
                  <p className="mt-0.5 text-xs font-semibold text-[#70746d]">Visual &amp; Contrast</p>
                </div>
              </div>
            </section>

            {/* TWO COLUMN INSPECTOR */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* LEFT COLUMN: INTERACTIVE VISUAL CANVAS (7 COLS) */}
              <div style={{ borderColor: "#e5e5df" }} className="overflow-hidden rounded-2xl border bg-white shadow-xs lg:col-span-7">
                <div style={{ borderBottom: "1px solid #e5e5df", backgroundColor: "#faf9f6" }} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-[#3158d5] animate-pulse" />
                    <p className="text-xs font-bold uppercase tracking-wider text-[#1c201a]">
                      {isPdfDoc && pdfTotalPages > 1
                        ? `Visual Pre-Flight Canvas (Page ${pdfPage} of ${pdfTotalPages})`
                        : "Visual Pre-Flight Canvas"}
                    </p>
                  </div>
                  <span style={{ borderColor: "#e5e5df" }} className="hidden sm:inline-flex items-center gap-1.5 rounded-full border bg-[#efeee7] px-2.5 py-1 text-[10px] font-medium text-[#70746d]">
                    <svg className="h-3 w-3 text-[#888d84]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>
                    Drag to pan • Click markers to inspect
                  </span>
                </div>

                <div className="bg-[#f6f5f3] p-4">
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
                        let color = "#3158d5"; // brand blue
                        let bgTint = "rgba(0, 85, 254, 0.12)";
                        let borderTint = "rgba(49, 88, 213, 0.24)";

                        if (isCritical || issue.category === "copy") {
                          color = "#e11d48"; // rose-600 / red
                          bgTint = "rgba(225, 29, 72, 0.14)";
                          borderTint = "rgba(225, 29, 72, 0.28)";
                        } else if (issue.category === "contrast" || isWarning) {
                          color = "#d97706"; // amber-600
                          bgTint = "rgba(217, 119, 6, 0.14)";
                          borderTint = "rgba(217, 119, 6, 0.28)";
                        } else if (issue.category === "margin" || issue.category === "layout") {
                          color = "#7c3aed"; // violet-600
                          bgTint = "rgba(124, 58, 237, 0.14)";
                          borderTint = "rgba(124, 58, 237, 0.28)";
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
                                ? "ring-2 ring-[#bcd5ff] shadow-md z-30"
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
                          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#3158d5] border-t-transparent" />
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
                  <div style={{ borderColor: "#e5e5df" }} className="mt-3 flex flex-nowrap items-center justify-between gap-1 overflow-x-auto rounded-xl border bg-white px-1.5 py-2 text-xs font-semibold text-[#70746d] sm:flex-wrap sm:overflow-visible sm:gap-2 sm:px-3">
                    {/* Horizontal Pan */}
                    <div className="order-1 flex shrink-0 items-center gap-1 sm:order-none sm:gap-1.5">
                      <button
                        type="button"
                        onClick={() => panHorizontal("left")}
                        style={{ borderColor: "#e5e5df" }}
                        className="flex min-w-[48px] items-center justify-center gap-1 whitespace-nowrap rounded-lg border bg-[#f6f5f3] px-1.5 py-1.5 text-[9px] font-medium text-[#1c201a] transition hover:bg-[#efeee7] active:scale-95 sm:min-w-0 sm:justify-start sm:gap-1 sm:px-2.5 sm:text-[11px]"
                        title="Move Left"
                      >
                        <span>◂</span> <span>Left</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => panHorizontal("right")}
                        style={{ borderColor: "#e5e5df" }}
                        className="flex min-w-[54px] items-center justify-center gap-1 whitespace-nowrap rounded-lg border bg-[#f6f5f3] px-1.5 py-1.5 text-[9px] font-medium text-[#1c201a] transition hover:bg-[#efeee7] active:scale-95 sm:min-w-0 sm:justify-start sm:gap-1 sm:px-2.5 sm:text-[11px]"
                        title="Move Right"
                      >
                        <span>Right</span> <span>▸</span>
                      </button>
                    </div>

                    {/* Zoom Controls */}
                    <div className="order-2 flex shrink-0 items-center gap-0 sm:order-none sm:gap-1">
                      <button
                        type="button"
                        aria-label="Zoom out"
                        disabled={zoom <= 0.25}
                        onClick={() => setZoom((v) => Math.max(0.25, Math.round((v - 0.25) * 100) / 100))}
                        className="rounded-lg px-1 py-1 text-sm leading-none transition hover:bg-[#efeee7] disabled:opacity-30 sm:px-2.5 sm:text-base"
                      >
                        −
                      </button>
                      <button
                        type="button"
                        aria-label="Reset zoom"
                        onClick={handleResetView}
                        className="min-w-9 rounded-lg px-1 py-1 text-[9px] font-bold text-[#1c201a] transition hover:bg-[#efeee7] sm:min-w-12 sm:px-2 sm:text-[11px]"
                        title="Reset zoom"
                      >
                        {Math.round(zoom * 100)}%
                      </button>
                      <button
                        type="button"
                        aria-label="Zoom in"
                        disabled={zoom >= 3}
                        onClick={() => setZoom((v) => Math.min(3, Math.round((v + 0.25) * 100) / 100))}
                        className="rounded-lg px-1 py-1 text-sm leading-none transition hover:bg-[#efeee7] disabled:opacity-30 sm:px-2.5 sm:text-base"
                      >
                        +
                      </button>
                    </div>

                    {/* Fit & Reset */}
                    <div className="order-3 flex shrink-0 items-center gap-1 sm:order-none sm:gap-1.5">
                      <button
                        type="button"
                        onClick={handleFitWidth}
                        style={{ borderColor: "#dce7ff" }}
                        className="flex items-center gap-0.5 whitespace-nowrap rounded-lg border bg-[#f0f5ff] px-1 py-1.5 text-[9px] font-medium text-[#3158d5] transition hover:bg-[#e7efff] active:scale-95 sm:gap-1 sm:px-2.5 sm:text-[11px]"
                        title="Fit design width to screen"
                      >
                        <span>⤢</span> <span>Fit Width</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleResetView}
                        style={{ borderColor: "#e5e5df" }}
                        className="whitespace-nowrap rounded-lg border bg-white px-1 py-1.5 text-[9px] text-[#70746d] transition hover:bg-[#f6f5f3] active:scale-95 sm:px-2.5 sm:text-[11px]"
                        title="Reset position"
                      >
                        Reset
                      </button>

                      {/* Multi-Page Canvas Page Nav */}
                      {pdfTotalPages > 1 && (
                        <div style={{ borderLeft: "1px solid #e5e5df" }} className="flex items-center gap-1 pl-2">
                          <button
                            type="button"
                            onClick={() => goToPdfPage(pdfPage - 1)}
                            disabled={pdfPage <= 1 || loadingPage}
                            style={{ borderColor: "#e5e5df" }}
                            className="rounded-lg border bg-white px-2 py-1 text-[11px] font-bold text-[#1c201a] transition hover:bg-[#f6f5f3] disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Previous PDF Page"
                          >
                            ‹ Prev
                          </button>
                          <span className="text-[11px] font-bold text-[#1c201a] px-1">
                            {pdfPage}/{pdfTotalPages}
                          </span>
                          <button
                            type="button"
                            onClick={() => goToPdfPage(pdfPage + 1)}
                            disabled={pdfPage >= pdfTotalPages || loadingPage}
                            style={{ borderColor: "#e5e5df" }}
                            className="rounded-lg border bg-white px-2 py-1 text-[11px] font-bold text-[#1c201a] transition hover:bg-[#f6f5f3] disabled:opacity-30 disabled:cursor-not-allowed"
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
              <div style={{ borderColor: "#e5e5df" }} className="flex flex-col overflow-hidden rounded-2xl border bg-white p-5 shadow-xs lg:col-span-5">
                <div style={{ borderBottom: "1px solid #e5e5df" }} className="flex items-center justify-between gap-3 pb-3.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    <div>
                      <h2 className="text-sm font-bold text-[#1c201a]">Suggested Corrections</h2>
                      <p className="text-[11px] text-[#70746d]">Click a finding to inspect its location</p>
                    </div>
                  </div>
                  <span style={{ borderColor: "#e5e5df" }} className="rounded-lg border bg-[#efeee7] px-2.5 py-1 text-[11px] font-bold text-[#3158d5]">
                    {activeIssues.length} TO REVIEW
                  </span>
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
                    <div style={{ borderBottom: "1px solid #e5e5df" }} className="mt-4 flex flex-wrap gap-1.5 pb-3 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setActiveFilter("all")}
                        className={`rounded-lg px-3 py-1.5 transition ${
                          activeFilter === "all" ? "bg-[#3158d5] text-white" : "bg-[#efeee7] text-[#70746d] hover:bg-[#ecebe6]"
                        }`}
                      >
                        All ({activeIssues.length})
                      </button>
                      {criticalCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setActiveFilter("critical")}
                          className={`rounded-lg px-3 py-1.5 transition ${
                          activeFilter === "critical" ? "bg-[#e11d48] text-white" : "bg-[#fef2f2] text-[#e11d48] hover:bg-[#ffe4e6]"
                          }`}
                        >
                          Critical ({criticalCount})
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveFilter("data")}
                        className={`rounded-lg px-3 py-1.5 transition ${
                          activeFilter === "data" ? "bg-[#3158d5] text-white" : "bg-[#efeee7] text-[#1c201a] hover:bg-[#ecebe6]"
                        }`}
                      >
                        Data &amp; Legal ({dataCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveFilter("layout")}
                        className={`rounded-lg px-3 py-1.5 transition ${
                          activeFilter === "layout" ? "bg-[#3158d5] text-white" : "bg-[#efeee7] text-[#1c201a] hover:bg-[#ecebe6]"
                        }`}
                      >
                        Layout &amp; Bleed ({layoutCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveFilter("contrast")}
                        className={`rounded-lg px-3 py-1.5 transition ${
                          activeFilter === "contrast" ? "bg-[#3158d5] text-white" : "bg-[#efeee7] text-[#1c201a] hover:bg-[#ecebe6]"
                        }`}
                      >
                        Contrast ({contrastCount})
                      </button>
                      {typographyCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setActiveFilter("typography")}
                          className={`rounded-lg px-3 py-1.5 transition ${
                            activeFilter === "typography" ? "bg-[#3158d5] text-white" : "bg-[#efeee7] text-[#1c201a] hover:bg-[#ecebe6]"
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
                    <div className="flex flex-col items-center justify-center p-8 text-center text-[#888d84]">
                      <p className="text-sm font-semibold text-[#1c201a]">No issues in this category</p>
                      <p className="text-xs text-[#70746d] mt-0.5">Your design passed all audit checks in this area cleanly.</p>
                    </div>
                  ) : (
                    filteredIssues.map((issue) => {
                      const isSelected = selectedIssueId === issue.id;
                      const isCritical =
                        issue.severity === "critical" ||
                        (issue.severity as string) === "error";
                      const isWarning = issue.severity === "warning";

                      const borderClass = isSelected
                        ? "border-l-4 border-l-[#e11d48] border-y-[#fecdd3] border-r-[#fecdd3] bg-[#fff8f8] shadow-2xs"
                        : isCritical
                        ? "border-[#fecdd3] hover:border-[#fda4af] bg-[#fef2f2]"
                        : "border-[#ecebe6] hover:border-[#e5e5df] bg-white";

                      const sevBadgeClass = isCritical
                        ? "bg-[#fef2f2] text-[#e11d48] border border-[#fecdd3]"
                        : isWarning
                        ? "bg-[#fff8e6] text-amber-800 border border-[#f7d98b]"
                        : "bg-[#efeee7] text-[#3158d5] border border-[#ecebe6]";

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
                          style={{
                            borderColor: isSelected || isCritical ? "#fecdd3" : "#e5e5df",
                            backgroundColor: isSelected ? "#fff8f8" : isCritical ? "#fef2f2" : "#ffffff",
                          }}
                          className={`rounded-xl border p-3.5 sm:p-4 transition-all cursor-pointer ${borderClass}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                style={{ borderColor: isCritical ? "#fecdd3" : isWarning ? "#ece4cb" : "#e5e5df" }}
                                className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-bold ${sevBadgeClass}`}
                              >
                                {sevLabel}
                              </span>
                              <span className="text-[11px] font-semibold text-[#70746d]">
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
                                  className="text-[11px] font-semibold text-[#3158d5] hover:opacity-80 transition cursor-pointer"
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
                                className="text-[11px] font-medium text-[#888d84] hover:text-[#1c201a] transition cursor-pointer"
                                title="Dismiss notice"
                              >
                                Dismiss
                              </button>
                            </div>
                          </div>

                          <h3 className="mt-1.5 text-sm font-bold text-[#1c201a] leading-snug">
                            {issue.originalText
                              ? issue.category === "copy"
                                ? `Misspelled: "${issue.originalText}"`
                                : issue.category === "contrast"
                                ? `Low Contrast: "${issue.originalText}"`
                                : `${issue.title}: "${issue.originalText}"`
                              : issue.title}
                          </h3>
                          <p className="mt-0.5 text-xs text-[#70746d] leading-relaxed">
                            {issue.description}
                          </p>

                          {/* Concise Fix Action */}
                          {issue.suggestedFix && (() => {
                            const typoMatch = issue.suggestedFix.match(/change to "([^"]+)"/i);
                            const cleanFix = typoMatch ? `Change to "${typoMatch[1]}"` : issue.suggestedFix;
                            const copyValue = typoMatch ? typoMatch[1] : issue.suggestedFix;

                            return (
                              <div style={{ borderTop: "1px solid #e5e5df" }} className="mt-2 pt-2 flex items-center justify-between gap-2">
                                <p className="text-xs text-[#1c201a] truncate">
                                  <span className="font-bold text-[#1c201a]">Fix: </span>
                                  <span>{cleanFix}</span>
                                </p>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyFix(issue.id, copyValue);
                                  }}
                                  className="shrink-0 text-[11px] font-bold text-[#3158d5] hover:opacity-80 transition cursor-pointer"
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
              <div
                style={{
                  borderColor: "#ecebe6",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  backgroundColor: "#ffffff",
                }}
                className="rounded-2xl p-4 text-xs text-[#70746d] shadow-2xs"
              >
                <p className="leading-relaxed">
                  <span className="font-bold text-[#1c201a]">Checked automatically:</span> spelling and copy, contrast, margins, placeholder text, expired dates, stock watermarks, page size, links.{" "}
                  <span className="font-bold text-[#1c201a]">Needs manual review in a PDF:</span> bleed and crop marks, color mode (RGB/CMYK), rich black, image DPI, font embedding.
                </p>
              </div>
            )}

            {/* RELATED CREATIVE TOOLS SECTION WHEN RESULT IS SHOWN */}
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
                        Extract editable text from images, photos, and scanned PDFs instantly with OCR.
                      </p>
                    </Link>

                    <Link
                      href="/qr-code-generator"
                      style={{
                        borderColor: "#e5e5df",
                        borderWidth: "1px",
                        borderStyle: "solid",
                        backgroundColor: "#faf9f6",
                      }}
                      className="group p-5 rounded-2xl hover:border-[#3158d5] hover:bg-white shadow-2xs transition"
                    >
                      <div className="text-xs font-bold text-[#3158d5] uppercase mb-1">
                        Print Scannability QA
                      </div>
                      <div className="font-bold text-[#1c201a] group-hover:text-[#3158d5] transition">
                        QR Code Generator
                      </div>
                      <p className="mt-1 text-xs text-[#70746d]">
                        Create custom QR codes and verify camera scannability before printing.
                      </p>
                    </Link>

                    <Link
                      href="/image-compressor"
                      style={{
                        borderColor: "#e5e5df",
                        borderWidth: "1px",
                        borderStyle: "solid",
                        backgroundColor: "#faf9f6",
                      }}
                      className="group p-5 rounded-2xl hover:border-[#3158d5] hover:bg-white shadow-2xs transition"
                    >
                      <div className="text-xs font-bold text-[#3158d5] uppercase mb-1">
                        Optimizer
                      </div>
                      <div className="font-bold text-[#1c201a] group-hover:text-[#3158d5] transition">
                        Image Compressor
                      </div>
                      <p className="mt-1 text-xs text-[#70746d]">
                        Compress JPG, PNG &amp; PDFs with live split comparison and no quality loss.
                      </p>
                    </Link>
                  </div>
                </div>
              </ScrollReveal>
            </div>

          </div>
        </div>
      )}
    </main>

    {/* FOOTER */}
    <Footer currentPath="/design-check" />
  </div>
);
}

