"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import JSZip from "jszip";
import {
  BOOK_STYLES,
  STAGE_BACKGROUNDS,
  generateSampleDocumentPages,
  FlipPage,
  BookStyleId,
  StageBgId,
} from "./bookStyles";

// Type definitions for PageFlip instance
interface PageFlipInstance {
  destroy: () => void;
  loadFromHTML: (items: HTMLElement[] | NodeListOf<HTMLElement>) => void;
  flipNext: (corner?: "top" | "bottom") => void;
  flipPrev: (corner?: "top" | "bottom") => void;
  flip: (page: number, corner?: "top" | "bottom") => void;
  turnToPage: (page: number) => void;
  getCurrentPageIndex: () => number;
  getPageCount: () => number;
  getOrientation: () => "portrait" | "landscape";
  update: () => void;
  on: (
    event: "flip" | "changeState" | "changeOrientation" | "init",
    callback: (e: { data: unknown }) => void
  ) => void;
}

export default function FlipbookClient() {
  const [pages, setPages] = useState<FlipPage[]>([]);
  const [currentPage, setCurrentPage] = useState(0); // 0 = Cover
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [orientationMode, setOrientationMode] = useState<"portrait" | "landscape">("landscape");

  // User-customizable book styles
  const [selectedStyleId, setSelectedStyleId] = useState<BookStyleId>("hardcover");
  const [selectedBgId, setSelectedBgId] = useState<StageBgId>("dark-studio");
  const [customCoverDensity, setCustomCoverDensity] = useState<"hard" | "soft">("hard");

  const stageWrapperRef = useRef<HTMLDivElement>(null);
  const bookHolderRef = useRef<HTMLDivElement>(null);
  const pageFlipRef = useRef<PageFlipInstance | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const shelfScrollRef = useRef<HTMLDivElement>(null);

  const scrollShelf = (direction: "left" | "right") => {
    if (shelfScrollRef.current) {
      shelfScrollRef.current.scrollBy({
        left: direction === "left" ? -280 : 280,
        behavior: "smooth",
      });
    }
  };

  const activeStyle = BOOK_STYLES.find((s) => s.id === selectedStyleId) || BOOK_STYLES[0];
  const activeBg = STAGE_BACKGROUNDS.find((b) => b.id === selectedBgId) || STAGE_BACKGROUNDS[0];

  // Sync custom cover density whenever style changes
  useEffect(() => {
    setCustomCoverDensity(activeStyle.coverDensity);
  }, [activeStyle]);

  // Play realistic paper flip sound using Web Audio API
  const playFlipSound = useCallback(() => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const bufferSize = ctx.sampleRate * 0.16;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(850, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(250, ctx.currentTime + 0.16);
      filter.Q.value = 2.5;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.28, ctx.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
      noise.stop(ctx.currentTime + 0.18);
    } catch {
      // AudioContext muted/unsupported
    }
  }, [soundEnabled]);

  // Turn page forward
  const turnNext = useCallback(() => {
    if (!pageFlipRef.current) return;
    pageFlipRef.current.flipNext("bottom");
  }, []);

  // Turn page backward
  const turnPrev = useCallback(() => {
    if (!pageFlipRef.current) return;
    pageFlipRef.current.flipPrev("bottom");
  }, []);

  // Jump or flip to specific page index
  const goToPage = useCallback((index: number) => {
    if (!pageFlipRef.current) return;
    pageFlipRef.current.flip(index);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (pages.length === 0) return;
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        turnNext();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        turnPrev();
      } else if (e.key === "Escape" && isFullscreen) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pages.length, turnNext, turnPrev, isFullscreen]);

  // Auto-play mode
  useEffect(() => {
    if (!isAutoPlaying || pages.length === 0) {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
      return;
    }

    autoPlayTimerRef.current = setInterval(() => {
      if (!pageFlipRef.current) return;
      const cur = pageFlipRef.current.getCurrentPageIndex();
      const total = pageFlipRef.current.getPageCount();

      if (cur >= total - 1) {
        setIsAutoPlaying(false);
      } else {
        pageFlipRef.current.flipNext("bottom");
      }
    }, 3400);

    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [isAutoPlaying, pages.length]);

  // Fullscreen toggle
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (stageWrapperRef.current) {
          await stageWrapperRef.current.requestFullscreen();
          setIsFullscreen(true);
        }
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      setIsFullscreen(!isFullscreen);
    }
  };

  // Initialize PageFlip instance when pages or selected style changes
  useEffect(() => {
    if (pages.length === 0 || !bookHolderRef.current) return;

    let isMounted = true;

    const initBook = async () => {
      try {
        const holder = bookHolderRef.current;
        if (!holder) return;

        // Clean up previous instance
        if (pageFlipRef.current) {
          try {
            pageFlipRef.current.destroy();
          } catch {
            // ignore
          }
          pageFlipRef.current = null;
        }

        holder.innerHTML = "";

        // Dynamically import PageFlip to prevent SSR errors
        const { PageFlip } = await import("page-flip");
        if (!isMounted) return;

        // Create book target div inside holder
        const bookEl = document.createElement("div");
        bookEl.className = "spellense-flipbook-root";
        holder.appendChild(bookEl);

        // Build HTML page elements for StPageFlip
        const pageElements: HTMLElement[] = [];
        pages.forEach((p, idx) => {
          const pageDiv = document.createElement("div");
          pageDiv.className = "stf__item page-sheet";

          // Density depends on chosen style (hardcover vs soft magazine)
          const isCoverSheet = idx === 0 || idx === pages.length - 1;
          const isHardCover = customCoverDensity === "hard" && isCoverSheet;
          pageDiv.setAttribute("data-density", isHardCover ? "hard" : "soft");

          const innerWrap = document.createElement("div");
          innerWrap.className =
            "relative w-full h-full bg-white overflow-hidden flex items-center justify-center select-none shadow-xs";

          // Apply selected style filter (e.g. vintage sepia, comic contrast)
          if (activeStyle.pageFilter !== "none") {
            innerWrap.style.filter = activeStyle.pageFilter;
          }

          const img = document.createElement("img");
          img.src = p.dataUrl;
          img.alt = `Page ${idx + 1}`;
          img.className = "w-full h-full object-contain pointer-events-none select-none";
          img.loading = "eager";

          innerWrap.appendChild(img);

          // Realistic spine styling based on spineType
          if (activeStyle.spineType === "spiral") {
            const spiralOverlay = document.createElement("div");
            spiralOverlay.className = `spine-spiral ${idx % 2 === 0 ? "right-0" : "left-0"}`;
            innerWrap.appendChild(spiralOverlay);
          } else if (activeStyle.spineType === "vintage-stitch") {
            const stitchOverlay = document.createElement("div");
            stitchOverlay.className = `spine-stitch ${idx % 2 === 0 ? "right-1" : "left-1"}`;
            innerWrap.appendChild(stitchOverlay);
          } else if (activeStyle.spineType === "heavy-crease") {
            const creaseLine = document.createElement("div");
            creaseLine.className = `absolute top-0 bottom-0 pointer-events-none z-10 w-[2px] bg-black/25 ${
              idx % 2 === 0 ? "right-1" : "left-1"
            }`;
            innerWrap.appendChild(creaseLine);
          }

          // Subtle gradient spine shadow
          const spineShadow = document.createElement("div");
          const shadowWidth = activeStyle.spineType === "heavy-crease" ? "w-10" : "w-8";
          const opacityClass =
            activeStyle.shadowOpacity > 0.5 ? "from-black/25" : "from-black/16";
          spineShadow.className = `absolute top-0 bottom-0 pointer-events-none z-10 ${shadowWidth} ${
            idx % 2 === 0
              ? `right-0 bg-gradient-to-l ${opacityClass} to-transparent`
              : `left-0 bg-gradient-to-r ${opacityClass} to-transparent`
          }`;
          innerWrap.appendChild(spineShadow);

          pageDiv.appendChild(innerWrap);
          pageElements.push(pageDiv);
        });

        // Calculate aspect ratio
        const firstPage = pages[0];
        const pageRatio =
          firstPage && firstPage.width > 0 ? firstPage.height / firstPage.width : 1.4;
        const baseWidth = 520;
        const baseHeight = Math.round(baseWidth * pageRatio);

        // Instantiate PageFlip with physics settings
        const pf = new PageFlip(bookEl, {
          width: baseWidth,
          height: baseHeight,
          size: "stretch",
          minWidth: 280,
          maxWidth: 900,
          minHeight: 380,
          maxHeight: 1250,
          maxShadowOpacity: activeStyle.shadowOpacity,
          showCover: customCoverDensity === "hard",
          mobileScrollSupport: false,
          showPageCorners: true, // Realistic corner lift on hover
          useMouseEvents: true, // Real-time mouse & touch dragging
          flippingTime: 750, // Realistic turn velocity
          usePortrait: true, // Auto switch to single page on mobile
          startPage: currentPage < pages.length ? currentPage : 0,
          disableFlipByClick: false,
        });

        pf.loadFromHTML(pageElements);

        pf.on("flip", (e: { data: unknown }) => {
          if (typeof e.data === "number") {
            setCurrentPage(e.data);
            playFlipSound();
          }
        });

        pf.on("changeOrientation", (e: { data: unknown }) => {
          if (e.data === "portrait" || e.data === "landscape") {
            setOrientationMode(e.data);
          }
        });

        pageFlipRef.current = pf as unknown as PageFlipInstance;
      } catch (err) {
        console.error("Failed to initialize PageFlip:", err);
      }
    };

    initBook();

    return () => {
      isMounted = false;
      if (pageFlipRef.current) {
        try {
          pageFlipRef.current.destroy();
        } catch {
          // ignore
        }
        pageFlipRef.current = null;
      }
    };
  }, [pages, activeStyle, customCoverDensity, playFlipSound]);

  // Load clean sample document
  const loadSampleDocument = () => {
    setIsProcessing(true);
    setProcessingStatus("Loading sample document...");
    setTimeout(() => {
      const samplePages = generateSampleDocumentPages();
      setPages(samplePages);
      setCurrentPage(0);
      setIsProcessing(false);
      setProcessingStatus("");
    }, 200);
  };

  // Process uploaded files (PDF or Images)
  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setProcessingStatus("Reading uploaded documents...");

    try {
      const fileList = Array.from(files);
      const isPdf =
        fileList[0].type === "application/pdf" || fileList[0].name.toLowerCase().endsWith(".pdf");

      if (isPdf) {
        const pdfFile = fileList[0];
        setProcessingStatus(`Rendering PDF pages: ${pdfFile.name}...`);

        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const arrayBuffer = await pdfFile.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({
          data: arrayBuffer,
          disableRange: true,
          disableStream: true,
        });

        const pdf = await loadingTask.promise;
        const totalPages = pdf.numPages;
        const newPages: FlipPage[] = [];

        for (let i = 1; i <= totalPages; i++) {
          setProcessingStatus(`Rendering page ${i} of ${totalPages}...`);
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2.0 }); // High-DPI crispness

          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
          const dataUrl = canvas.toDataURL("image/jpeg", 0.94);

          newPages.push({
            id: `pdf-page-${i}-${Date.now()}`,
            dataUrl,
            width: viewport.width,
            height: viewport.height,
            pageNum: i,
          });
        }

        setPages(newPages);
        setCurrentPage(0);
      } else {
        // Image files
        setProcessingStatus(`Processing ${fileList.length} images...`);
        const newPages: FlipPage[] = [];

        // Sort naturally by filename
        const sortedImages = fileList.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
        );

        for (let i = 0; i < sortedImages.length; i++) {
          const imgFile = sortedImages[i];
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(imgFile);
          });

          // Get dimensions
          const dimensions = await new Promise<{ w: number; h: number }>((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
            img.src = dataUrl;
          });

          newPages.push({
            id: `img-page-${i + 1}-${Date.now()}`,
            dataUrl,
            width: dimensions.w,
            height: dimensions.h,
            pageNum: i + 1,
          });
        }

        setPages(newPages);
        setCurrentPage(0);
      }
    } catch (err) {
      console.error("Flipbook processing error:", err);
      alert("Failed to render flipbook pages. Please ensure your PDF or image files are valid.");
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  // Generate Standalone Single-File Offline HTML Flipbook (with inlined page-flip engine & selected style)
  const downloadStandaloneHtml = async () => {
    if (pages.length === 0) return;
    setIsProcessing(true);
    setProcessingStatus("Packaging standalone offline HTML reader...");

    try {
      // Fetch the standalone page-flip engine script
      let engineScript = "";
      try {
        const res = await fetch("/page-flip.browser.js");
        if (res.ok) {
          engineScript = await res.text();
        }
      } catch {
        // fallback
      }

      const isHardCover = customCoverDensity === "hard";
      const filterStyle =
        activeStyle.pageFilter !== "none" ? `filter: ${activeStyle.pageFilter};` : "";

      const pageItemsHtml = pages
        .map((p, idx) => {
          const isHard = isHardCover && (idx === 0 || idx === pages.length - 1);
          let extraSpine = "";
          if (activeStyle.spineType === "spiral") {
            extraSpine = `<div class="spine-spiral ${idx % 2 === 0 ? "spine-right" : "spine-left"}"></div>`;
          } else if (activeStyle.spineType === "vintage-stitch") {
            extraSpine = `<div class="spine-stitch ${idx % 2 === 0 ? "spine-right" : "spine-left"}"></div>`;
          }
          return `
      <div class="stf__item page-pane" data-density="${isHard ? "hard" : "soft"}">
        <div class="page-content" style="${filterStyle}">
          <img src="${p.dataUrl}" alt="Page ${idx + 1}" />
          ${extraSpine}
          <div class="spine-shadow ${idx % 2 === 0 ? "spine-right" : "spine-left"}"></div>
        </div>
      </div>`;
        })
        .join("");

      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline 3D Flipbook — Spellense</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: ${activeBg.bgStyle};
      color: ${activeBg.theme === "light" ? "#0f172a" : "#f8fafc"};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow-x: hidden;
      user-select: none;
    }
    header {
      width: 100%;
      padding: 14px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      z-index: 50;
      color: #fff;
    }
    .brand { font-size: 16px; font-weight: 800; letter-spacing: -0.5px; }
    .brand span { color: #3b82f6; }
    .badge {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      padding: 4px 10px;
      border-radius: 9999px;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }
    main {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: 16px;
      position: relative;
    }
    .hint-pill {
      font-size: 11px;
      font-weight: 600;
      color: #94a3b8;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 4px 14px;
      border-radius: 9999px;
      margin-bottom: 12px;
    }
    .book-stage {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      max-width: 1100px;
      width: 100%;
      min-height: 540px;
    }
    /* StPageFlip Styles */
    .stf__parent {
      position: relative;
      display: block;
      box-sizing: border-box;
      transform: translateZ(0);
      touch-action: pan-y;
      margin: 0 auto;
    }
    .stf__wrapper {
      position: relative;
      width: 100%;
      box-sizing: border-box;
    }
    .stf__block {
      position: absolute;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      perspective: 2400px;
    }
    .stf__item {
      display: none;
      position: absolute;
      transform-style: preserve-3d;
      box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.5);
      cursor: grab;
    }
    .stf__item:active { cursor: grabbing; }
    .stf__outerShadow, .stf__innerShadow, .stf__hardShadow, .stf__hardInnerShadow {
      position: absolute;
      left: 0;
      top: 0;
      pointer-events: none;
    }
    .page-content {
      position: relative;
      width: 100%;
      height: 100%;
      background: #ffffff;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .page-content img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      pointer-events: none;
    }
    .spine-shadow {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 32px;
      pointer-events: none;
      z-index: 10;
    }
    .spine-left { left: 0; background: linear-gradient(to right, rgba(0,0,0,0.22), transparent); }
    .spine-right { right: 0; background: linear-gradient(to left, rgba(0,0,0,0.22), transparent); }
    .spine-spiral {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 18px;
      pointer-events: none;
      z-index: 25;
      background-image: repeating-linear-gradient(
        to bottom,
        transparent 0px,
        transparent 14px,
        #94a3b8 14px,
        #475569 16px,
        #cbd5e1 18px,
        transparent 18px,
        transparent 28px
      );
    }
    .spine-stitch {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 4px;
      pointer-events: none;
      z-index: 25;
      border-left: 2px dashed rgba(180, 83, 9, 0.7);
    }

    .nav-btn {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 40;
      transition: all 0.2s;
    }
    .nav-btn:hover { background: #2563eb; transform: translateY(-50%) scale(1.08); }
    .nav-prev { left: 10px; }
    .nav-next { right: 10px; }

    footer {
      width: 100%;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(12px);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      color: #fff;
    }
    .page-indicator { font-size: 13px; font-weight: 700; color: #94a3b8; }
    .tool-btn {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #f8fafc;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    .tool-btn:hover { background: rgba(255, 255, 255, 0.2); }
  </style>
</head>
<body>
  <header>
    <div class="brand">Spel<span>lense</span> • 3D Flipbook</div>
    <div class="badge">Offline Reader • Zero Server</div>
  </header>

  <main>
    <div class="hint-pill">💡 Grab &amp; Drag any page corner with mouse or finger to turn</div>
    <div class="book-stage">
      <button class="nav-btn nav-prev" onclick="pageFlip && pageFlip.flipPrev('bottom')">&#10094;</button>
      <div id="flipbook">${pageItemsHtml}</div>
      <button class="nav-btn nav-next" onclick="pageFlip && pageFlip.flipNext('bottom')">&#10095;</button>
    </div>
  </main>

  <footer>
    <button class="tool-btn" onclick="pageFlip && pageFlip.flipPrev('bottom')">Previous</button>
    <div class="page-indicator" id="pageIndicator">Cover (Page 1 of ${pages.length})</div>
    <button class="tool-btn" onclick="pageFlip && pageFlip.flipNext('bottom')">Next</button>
    <button class="tool-btn" onclick="toggleFullscreen()">Fullscreen</button>
  </footer>

  <script>${engineScript}</script>
  <script>
    let pageFlip = null;
    const totalPages = ${pages.length};

    function initFlipbook() {
      const bookEl = document.getElementById("flipbook");
      if (!window.St || !window.St.PageFlip) return;

      pageFlip = new window.St.PageFlip(bookEl, {
        width: 520,
        height: 728,
        size: "stretch",
        minWidth: 280,
        maxWidth: 900,
        minHeight: 380,
        maxHeight: 1250,
        maxShadowOpacity: ${activeStyle.shadowOpacity},
        showCover: ${isHardCover},
        showPageCorners: true,
        useMouseEvents: true,
        flippingTime: 750,
        usePortrait: true
      });

      pageFlip.loadFromHTML(document.querySelectorAll(".page-pane"));

      pageFlip.on("flip", function(e) {
        const idx = e.data;
        const ind = document.getElementById("pageIndicator");
        if (idx === 0) ind.textContent = "Cover (Page 1 of " + totalPages + ")";
        else if (idx >= totalPages - 1) ind.textContent = "Back Cover (Page " + totalPages + " of " + totalPages + ")";
        else ind.textContent = "Pages " + (idx + 1) + "–" + Math.min(totalPages, idx + 2) + " of " + totalPages;
      });
    }

    function toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(function(){});
      } else {
        document.exitFullscreen().catch(function(){});
      }
    }

    window.addEventListener("keydown", function(e) {
      if (e.key === "ArrowRight" || e.key === " ") pageFlip && pageFlip.flipNext("bottom");
      if (e.key === "ArrowLeft") pageFlip && pageFlip.flipPrev("bottom");
    });

    window.addEventListener("DOMContentLoaded", initFlipbook);
  </script>
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "spellense-flipbook.html";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Offline HTML download error:", err);
      alert("Failed to export offline HTML.");
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  // Generate ZIP Package with index.html, page-flip.browser.js and images
  const downloadZipPackage = async () => {
    if (pages.length === 0) return;
    setIsProcessing(true);
    setProcessingStatus("Packaging offline ZIP flipbook...");

    try {
      const zip = new JSZip();
      const pagesFolder = zip.folder("pages");

      // Save each page image
      pages.forEach((p, idx) => {
        const base64Data = p.dataUrl.split(",")[1];
        const pageFileName = `page_${String(idx + 1).padStart(2, "0")}.jpg`;
        pagesFolder?.file(pageFileName, base64Data, { base64: true });
      });

      // Include page-flip.browser.js in zip
      try {
        const scriptRes = await fetch("/page-flip.browser.js");
        if (scriptRes.ok) {
          const scriptText = await scriptRes.text();
          zip.file("page-flip.browser.js", scriptText);
        }
      } catch {
        // ignore
      }

      const isHardCover = customCoverDensity === "hard";
      const pageItemsZipHtml = pages
        .map((_, idx) => {
          const pageFileName = `./pages/page_${String(idx + 1).padStart(2, "0")}.jpg`;
          const isHard = isHardCover && (idx === 0 || idx === pages.length - 1);
          return `
      <div class="stf__item page-pane" data-density="${isHard ? "hard" : "soft"}">
        <div class="page-content">
          <img src="${pageFileName}" alt="Page ${idx + 1}" />
        </div>
      </div>`;
        })
        .join("");

      const zipHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline 3D Digital Flipbook</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: ${activeBg.bgStyle}; color: #fff; font-family: sans-serif; display: flex; flex-direction: column; min-height: 100vh; justify-content: space-between; align-items: center; }
    header { padding: 14px 20px; width: 100%; border-bottom: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center; background: #0f172a; }
    main { flex: 1; display: flex; align-items: center; justify-content: center; width: 100%; padding: 20px; }
    .book-stage { width: 100%; max-width: 1050px; min-height: 520px; position: relative; }
    .page-content { width: 100%; height: 100%; background: #fff; display: flex; align-items: center; justify-content: center; }
    .page-content img { width: 100%; height: 100%; object-fit: contain; }
    footer { padding: 12px 20px; width: 100%; display: flex; justify-content: center; gap: 14px; align-items: center; border-top: 1px solid #1e293b; background: #0f172a; }
    button { background: #2563eb; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; }
    button:hover { background: #1d4ed8; }
  </style>
  <script src="./page-flip.browser.js"></script>
</head>
<body>
  <header>
    <div><strong>Spellense</strong> 3D Flipbook</div>
    <div>Offline Web Package</div>
  </header>
  <main>
    <div class="book-stage">
      <div id="flipbook">${pageItemsZipHtml}</div>
    </div>
  </main>
  <footer>
    <button onclick="pf && pf.flipPrev()">Previous</button>
    <span id="label">Cover</span>
    <button onclick="pf && pf.flipNext()">Next</button>
  </footer>
  <script>
    let pf = null;
    window.addEventListener("DOMContentLoaded", function() {
      if (!window.St || !window.St.PageFlip) return;
      pf = new window.St.PageFlip(document.getElementById("flipbook"), {
        width: 520, height: 728, size: "stretch",
        showCover: ${isHardCover}, showPageCorners: true, useMouseEvents: true, flippingTime: 750
      });
      pf.loadFromHTML(document.querySelectorAll(".page-pane"));
      pf.on("flip", function(e) {
        document.getElementById("label").textContent = "Page " + (e.data + 1);
      });
    });
  </script>
</body>
</html>`;

      zip.file("index.html", zipHtml);

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "spellense-flipbook-web-package.zip";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("ZIP creation error:", err);
      alert("Failed to export ZIP package.");
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  // Copy iframe embed code
  const copyEmbedCode = () => {
    const embedSnippet = `<iframe src="https://spellense.com/flipbook" width="100%" height="650" frameborder="0" allowfullscreen allow="autoplay"></iframe>`;
    navigator.clipboard.writeText(embedSnippet);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2500);
  };

  // FAQ items data
  const faqs = [
    {
      q: "How does the drag-to-turn physics work?",
      a: "Our flipbook runs on StPageFlip, a zero-dependency real-time 3D physics engine. You can hover over any corner to see the paper peel up, then click and drag across the screen to bend the page dynamically. Releasing with momentum will smoothly flip the page, while letting go early snaps it back.",
    },
    {
      q: "Can I customize the book style (e.g. Hardcover, Magazine, Spiral, or Vintage)?",
      a: "Yes! Choose from 20 distinct binding finishes (Classic Hardcover, Glossy Magazine, Vintage Parchment, Graphic Comic, Spiral Notebook, Leather Folio, Newsprint, Cyberpunk, Paperback, Blueprint, Album, Gold Foil, Eco Kraft, Board Book, Manga, Commercial Catalog, Notebook, Pastel, and Film Noir) and 8 ambient reading backgrounds.",
    },
    {
      q: "How do visitors view or download the flipbook offline?",
      a: "Click 'Download HTML' to get a single, 100% self-contained HTML file with embedded high-resolution pages and the 3D physics engine. Double-click the file on Mac, Windows, iOS, or Android to read your catalog offline with realistic draggable page turns and zero internet connection required.",
    },
    {
      q: "Are my confidential PDFs or catalog images uploaded to any server?",
      a: "No. Spellense operates on a strict zero-storage, in-memory client-side architecture. Your PDF pages and images are rendered directly on your device using WebAssembly and HTML5 Canvas. No document data is ever stored or transmitted to external servers.",
    },
    {
      q: "Can I embed the 3D flipbook on my own website or WordPress?",
      a: "Yes. Click 'Embed Code' to copy an iframe snippet. You can paste this code into WordPress, Webflow, Squarespace, Shopify, or any HTML webpage to display a responsive interactive flipbook.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f0f6fe] text-slate-800 flex flex-col justify-between">
      {/* NAVBAR */}
      <Navbar />

      {/* HERO SECTION — Strictly 1 line, identical styling to compressor */}
      <section className="relative overflow-hidden px-4 pt-12 pb-10 sm:px-6 sm:pt-16 sm:pb-14 lg:pt-20 lg:pb-16">
        <div className="mx-auto max-w-7xl text-center">
          <h1 className="text-[17px] xs:text-[21px] sm:text-[28px] md:text-[36px] lg:text-[42px] xl:text-[48px] font-extrabold leading-tight tracking-tight text-black text-center whitespace-nowrap">
            Turn PDFs &amp; Images into 3D Flipbooks
          </h1>
        </div>
      </section>

      {/* WORKSPACE SECTION */}
      <main className="flex-1 mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 w-full">
        {pages.length === 0 ? (
          /* EMPTY STATE / UPLOAD DROPZONE */
          <div className="mx-auto max-w-3xl space-y-6">
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
              }}
              className="group relative flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-blue-200 bg-white/80 p-8 sm:p-12 text-center shadow-lg shadow-blue-500/5 backdrop-blur-xl transition hover:border-blue-400 hover:bg-white hover:shadow-xl"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) processFiles(e.target.files);
                }}
              />

              {/* Upload Icon */}
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-8 ring-blue-50/50 transition group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                  <path d="M6 6h10" />
                  <path d="M6 10h10" />
                  <path d="m9 16 3-3 3 3" />
                  <path d="M12 13v6" />
                </svg>
              </div>

              <h2 className="mt-5 text-xl font-bold text-slate-900 sm:text-2xl">
                Upload Multi-Page PDF or Images
              </h2>
              <p className="mt-2 text-sm text-slate-500 max-w-md">
                Drop your brochure, catalog, or portfolio here. Convert it into a realistic draggable
                3D flipbook with zero server storage.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50/70 px-3 py-1 text-xs font-semibold text-blue-700">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Multi-Page PDF
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50/70 px-3 py-1 text-xs font-semibold text-blue-700">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  JPG, PNG &amp; WebP
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50/70 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  100% In-Browser Private
                </span>
              </div>

              <div className="mt-8 flex items-center gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="rounded-full bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition hover:bg-blue-700 active:scale-95"
                >
                  Select File from Device
                </button>
              </div>
            </div>

            {/* Quick Sample Document Link */}
            <div className="text-center">
              <span className="text-xs text-slate-500">Don&apos;t have a document ready? </span>
              <button
                type="button"
                onClick={loadSampleDocument}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 underline underline-offset-4 cursor-pointer"
              >
                <span>Try Sample Document</span>
                <span>&rarr;</span>
              </button>
            </div>
          </div>
        ) : (
          /* ACTIVE 3D FLIPBOOK WORKSPACE */
          <div ref={stageWrapperRef} className="space-y-4">
            {/* TOP TOOLBAR */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-xs backdrop-blur-md">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPages([]);
                    setCurrentPage(0);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:scale-95 cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                  <span>New File</span>
                </button>

                <div className="h-4 w-px bg-slate-200" />

                {/* Cover Board Stiffness Toggle */}
                <button
                  type="button"
                  onClick={() => setCustomCoverDensity((d) => (d === "hard" ? "soft" : "hard"))}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:scale-95 cursor-pointer"
                  title="Toggle Cover Stiffness between Hardcover and Soft Paperback"
                >
                  <span>{customCoverDensity === "hard" ? "📖 Hardcover" : "📕 Softcover"}</span>
                </button>

                {/* Sound Toggle */}
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                    soundEnabled
                      ? "bg-slate-100 text-slate-800"
                      : "bg-white text-slate-400 border border-slate-200"
                  }`}
                  title={soundEnabled ? "Mute paper flip sound" : "Enable paper flip sound"}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {soundEnabled ? (
                      <>
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                      </>
                    ) : (
                      <>
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <line x1="23" y1="9" x2="17" y2="15" />
                        <line x1="17" y1="9" x2="23" y2="15" />
                      </>
                    )}
                  </svg>
                </button>

                {/* Auto Play */}
                <button
                  type="button"
                  onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                    isAutoPlaying
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span>{isAutoPlaying ? "Auto-Play On" : "Auto-Play"}</span>
                </button>
              </div>

              {/* DOWNLOAD & EMBED ACTIONS */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={downloadStandaloneHtml}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 active:scale-95 cursor-pointer"
                  title="Download standalone single-file HTML that opens offline in any browser with full draggable 3D turning"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  <span>Download HTML</span>
                </button>

                <button
                  type="button"
                  onClick={downloadZipPackage}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:scale-95 cursor-pointer"
                  title="Download full ZIP web package"
                >
                  <span>ZIP Package</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowEmbedModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:scale-95 cursor-pointer"
                >
                  <span>Embed</span>
                </button>

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                  title="Fullscreen"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                </button>
              </div>
            </div>

            {/* QUICK CUSTOMIZATION DOCK (Simple, Catchy & Instant Background Picker) */}
            <div className="rounded-2xl border border-slate-200/90 bg-white/95 p-3 sm:p-3.5 shadow-sm backdrop-blur-md space-y-2.5">
              {/* ROW 1: BOOK STYLE */}
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">
                  Style:
                </span>

                {/* Left scroll arrow */}
                <button
                  type="button"
                  onClick={() => scrollShelf("left")}
                  className="hidden sm:flex h-6 w-6 shrink-0 rounded-full border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-100 items-center justify-center transition active:scale-90 cursor-pointer shadow-2xs"
                  title="Scroll styles left"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15 18 9 12 15 6"/></svg>
                </button>

                {/* Scrollable Style Pills Strip */}
                <div
                  ref={shelfScrollRef}
                  className="flex flex-1 items-center gap-2 overflow-x-auto py-1 px-0.5 scrollbar-none scroll-smooth"
                >
                  {BOOK_STYLES.map((style) => {
                    const isActive = selectedStyleId === style.id;
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setSelectedStyleId(style.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 active:scale-95 ${
                          isActive
                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-500/20 scale-102"
                            : "bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border border-slate-200/60"
                        }`}
                      >
                        <span className="text-xs">{style.icon}</span>
                        <span>{style.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Right scroll arrow */}
                <button
                  type="button"
                  onClick={() => scrollShelf("right")}
                  className="hidden sm:flex h-6 w-6 shrink-0 rounded-full border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-100 items-center justify-center transition active:scale-90 cursor-pointer shadow-2xs"
                  title="Scroll styles right"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>

              <div className="h-px w-full bg-slate-100" />

              {/* ROW 2: STAGE BACKGROUND (Instant 1-Click Catchy Swatches) */}
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 shrink-0 text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">
                  <span>Background:</span>
                  <span className="text-slate-800 font-extrabold normal-case text-xs tracking-normal">
                    {activeBg.name}
                  </span>
                </div>

                {/* 8 Catchy Gradient Color Circles */}
                <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
                  {STAGE_BACKGROUNDS.map((bg) => {
                    const isSelected = selectedBgId === bg.id;
                    return (
                      <button
                        key={bg.id}
                        type="button"
                        onClick={() => setSelectedBgId(bg.id)}
                        className={`group relative h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 transition-all duration-200 cursor-pointer shrink-0 ${
                          isSelected
                            ? "border-blue-600 ring-2 ring-blue-500/40 ring-offset-2 scale-110 shadow-md shadow-blue-500/20"
                            : "border-white shadow-xs ring-1 ring-slate-200 hover:scale-115 hover:shadow-sm"
                        }`}
                        style={{ background: bg.bgStyle }}
                        title={bg.name}
                        aria-label={`Change background to ${bg.name}`}
                      >
                        {isSelected && (
                          <span className="flex items-center justify-center w-full h-full text-white drop-shadow-md">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3D FLIPBOOK STAGE (Customizable background) */}
            <div
              className="relative flex min-h-[560px] sm:min-h-[660px] lg:min-h-[720px] w-full items-center justify-center rounded-3xl border border-slate-200/90 p-4 sm:p-8 shadow-2xl overflow-hidden select-none transition-colors duration-300"
              style={{ background: activeBg.bgStyle }}
            >
              {/* Previous Nav Arrow */}
              <button
                type="button"
                onClick={turnPrev}
                disabled={currentPage === 0}
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/70 text-white shadow-lg backdrop-blur-md transition hover:bg-blue-600 hover:scale-110 active:scale-95 disabled:opacity-25 disabled:pointer-events-none cursor-pointer"
                aria-label="Previous page"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              </button>

              {/* BOOK HOLDER CONTAINER (StPageFlip mounts here) */}
              <div
                className="relative flex items-center justify-center w-full transition-transform duration-300"
                style={{ transform: `scale(${zoomLevel})` }}
              >
                <div
                  ref={bookHolderRef}
                  className="w-full flex items-center justify-center max-w-[1080px]"
                />
              </div>

              {/* Next Nav Arrow */}
              <button
                type="button"
                onClick={turnNext}
                disabled={currentPage >= pages.length - 1}
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/70 text-white shadow-lg backdrop-blur-md transition hover:bg-blue-600 hover:scale-110 active:scale-95 disabled:opacity-25 disabled:pointer-events-none cursor-pointer"
                aria-label="Next page"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>

            {/* BOTTOM CONTROLS & THUMBNAILS STRIP */}
            <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-xs backdrop-blur-md space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-800">
                  {currentPage === 0
                    ? `Front Cover (Page 1 of ${pages.length})`
                    : currentPage >= pages.length - 1
                    ? `Back Cover (Page ${pages.length} of ${pages.length})`
                    : orientationMode === "portrait"
                    ? `Page ${currentPage + 1} of ${pages.length}`
                    : `Pages ${currentPage + 1}–${Math.min(pages.length, currentPage + 2)} of ${pages.length}`}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => (z === 1 ? 1.2 : 1))}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    {zoomLevel === 1 ? "Zoom 120%" : "Zoom 100%"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowThumbnails(!showThumbnails)}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    {showThumbnails ? "Hide Thumbnails" : "Show Thumbnails"}
                  </button>
                </div>
              </div>

              {/* HORIZONTAL THUMBNAIL PREVIEW STRIP */}
              {showThumbnails && (
                <div className="flex gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                  {pages.map((p, idx) => {
                    const isSelected =
                      currentPage === idx ||
                      (orientationMode === "landscape" &&
                        currentPage !== 0 &&
                        currentPage + 1 === idx);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => goToPage(idx)}
                        className={`relative h-20 w-16 shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                          isSelected
                            ? "border-blue-600 ring-2 ring-blue-500/30 scale-105"
                            : "border-slate-200 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={p.dataUrl}
                          alt={`Thumbnail ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <span className="absolute bottom-0 right-0 rounded-tl bg-slate-900/80 px-1 text-[9px] font-bold text-white">
                          {idx + 1}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* READING ENVIRONMENT MODAL */}
        {showStyleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Reading Environment &amp; Cover</h3>
                  <p className="text-xs text-slate-500">
                    Choose background ambiance and cover board stiffness:
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStyleModal(false)}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {/* 1. Reading Stage Environment (8 Options) */}
              <div className="mt-5 space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Reading Background
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {STAGE_BACKGROUNDS.map((bg) => (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() => setSelectedBgId(bg.id)}
                      className={`h-16 rounded-xl p-2.5 flex flex-col justify-end text-left border-2 transition cursor-pointer relative overflow-hidden ${
                        selectedBgId === bg.id
                          ? "border-blue-600 ring-2 ring-blue-500/30 scale-102"
                          : "border-slate-200 opacity-85 hover:opacity-100"
                      }`}
                      style={{ background: bg.bgStyle }}
                    >
                      <span
                        className={`text-xs font-bold drop-shadow-sm leading-tight ${
                          bg.theme === "light" ? "text-slate-900" : "text-white"
                        }`}
                      >
                        {bg.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Cover Hardness */}
              <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Cover Stiffness
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomCoverDensity("hard")}
                    className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer border ${
                      customCoverDensity === "hard"
                        ? "border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Hardcover Board
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomCoverDensity("soft")}
                    className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer border ${
                      customCoverDensity === "soft"
                        ? "border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Soft Paperback
                  </button>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setShowStyleModal(false)}
                  className="rounded-xl bg-blue-600 px-6 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LOADING OVERLAY */}
        {isProcessing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="flex flex-col items-center gap-4 rounded-3xl bg-white p-8 text-center shadow-2xl max-w-sm mx-4">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              <div>
                <h3 className="text-base font-bold text-slate-900">Processing Flipbook</h3>
                <p className="mt-1 text-xs text-slate-500">{processingStatus}</p>
              </div>
            </div>
          </div>
        )}

        {/* EMBED CODE MODAL */}
        {showEmbedModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Embed 3D Flipbook on Website</h3>
                <button
                  type="button"
                  onClick={() => setShowEmbedModal(false)}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                Copy and paste this HTML code directly into your WordPress post, Webflow embed, Squarespace block, or custom website:
              </p>

              <div className="mt-3 relative rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-[11px] text-slate-800 break-all">
                {`<iframe src="https://spellense.com/flipbook" width="100%" height="650" frameborder="0" allowfullscreen allow="autoplay"></iframe>`}
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmbedModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={copyEmbedCode}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 cursor-pointer"
                >
                  {copiedEmbed ? "Copied to Clipboard!" : "Copy Embed Code"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CROSS-TOOL FUNNEL CTA */}
        <section className="mt-16 rounded-3xl border border-blue-200/80 bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/60 p-6 sm:p-8 shadow-xs backdrop-blur-md">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-600/10 px-3 py-1 text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-2">
                Pre-Flight QA &amp; Compression
              </span>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
                Want to reduce catalog size or check for hidden typos?
              </h3>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-600 max-w-xl">
                Run your pages through our Image Compressor to reduce size by up to 90%, or use Visual Spellchecker to catch mistakes before publishing.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5 shrink-0">
              <Link
                href="/image-compressor"
                className="inline-flex items-center gap-1.5 rounded-2xl bg-white border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
              >
                <span>Image Compressor</span>
                <span>&rarr;</span>
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 rounded-2xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition"
              >
                <span>Spell Check Pages</span>
                <span>&rarr;</span>
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ ACCORDION SECTION */}
        <section className="mt-16 border-t border-slate-200/80 pt-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Frequently Asked Questions
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-500">
              Everything you need to know about creating, sharing, and downloading 3D digital flipbooks.
            </p>
          </div>

          <div className="mt-8 mx-auto max-w-3xl space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <div
                  key={faq.q}
                  className="rounded-2xl border border-slate-200/80 bg-white/80 overflow-hidden shadow-2xs backdrop-blur-sm transition"
                >
                  <button
                    type="button"
                    onClick={() => setActiveFaq(isOpen ? null : index)}
                    className="flex w-full items-center justify-between p-4 sm:p-5 text-left text-sm font-bold text-slate-800 hover:text-blue-600 transition cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <span
                      className={`ml-4 shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-blue-600" : "text-slate-400"
                      }`}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-5 sm:px-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="mt-16 border-t border-slate-200/70 bg-white px-5 py-8 sm:px-6">
        <div className="mx-auto max-w-7xl flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <div>
            <div className="text-base font-bold text-slate-900">
              Spel<span className="text-blue-600">lense</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              100% Free In-Browser 3D Flipbook Maker &amp; Visual Design Pre-Flight QA.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-500">
            <Link href="/" className="hover:text-slate-900">Spell Checker</Link>
            <Link href="/design-check" className="hover:text-slate-900">Design Check</Link>
            <Link href="/image-compressor" className="hover:text-slate-900">Compressor</Link>
            <Link href="/image-to-text" className="hover:text-slate-900">Image to Text</Link>
            <Link href="/privacy" className="hover:text-slate-900">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-900">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
