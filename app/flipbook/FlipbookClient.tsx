"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import JSZip from "jszip";

interface FlipPage {
  id: string;
  dataUrl: string;
  width: number;
  height: number;
  pageNum: number;
}

export default function FlipbookClient() {
  const [pages, setPages] = useState<FlipPage[]>([]);
  const [currentPage, setCurrentPage] = useState(0); // 0 = Cover
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<"next" | "prev" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isDoublePage, setIsDoublePage] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Play realistic paper flip sound using Web Audio API
  const playFlipSound = useCallback(() => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
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
    if (isFlipping) return;
    const step = isDoublePage ? (currentPage === 0 ? 1 : 2) : 1;
    if (currentPage + step >= pages.length) return;

    playFlipSound();
    setIsFlipping(true);
    setFlipDirection("next");

    setTimeout(() => {
      setCurrentPage((prev) => Math.min(pages.length - 1, prev + step));
      setIsFlipping(false);
      setFlipDirection(null);
    }, 450);
  }, [currentPage, isDoublePage, isFlipping, pages.length, playFlipSound]);

  // Turn page backward
  const turnPrev = useCallback(() => {
    if (isFlipping || currentPage <= 0) return;
    const step = isDoublePage ? (currentPage <= 2 ? currentPage : 2) : 1;

    playFlipSound();
    setIsFlipping(true);
    setFlipDirection("prev");

    setTimeout(() => {
      setCurrentPage((prev) => Math.max(0, prev - step));
      setIsFlipping(false);
      setFlipDirection(null);
    }, 450);
  }, [currentPage, isDoublePage, isFlipping, playFlipSound]);

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
      setCurrentPage((curr) => {
        const step = isDoublePage ? (curr === 0 ? 1 : 2) : 1;
        if (curr + step >= pages.length) {
          setIsAutoPlaying(false);
          return curr;
        }
        playFlipSound();
        return curr + step;
      });
    }, 3200);

    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [isAutoPlaying, isDoublePage, pages.length, playFlipSound]);

  // Fullscreen toggle
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current) {
          await containerRef.current.requestFullscreen();
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

  // Process uploaded files (PDF or Images)
  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setProcessingStatus("Reading uploaded documents...");

    try {
      const fileList = Array.from(files);
      const isPdf = fileList[0].type === "application/pdf" || fileList[0].name.toLowerCase().endsWith(".pdf");

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
          const viewport = page.getViewport({ scale: 1.8 });

          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          // @ts-expect-error pdfjs typing
          await page.render({ canvasContext: ctx, viewport }).promise;
          const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

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

  // Generate Sample Demo Flipbook
  const loadDemoFlipbook = () => {
    setIsProcessing(true);
    setProcessingStatus("Generating high-fashion lookbook demo...");

    setTimeout(() => {
      const demoPages: FlipPage[] = [];
      const canvasWidth = 900;
      const canvasHeight = 1200;

      const pageConfigs = [
        {
          bg: "#0f172a",
          title: "AURA 2026",
          subtitle: "EDITORIAL LOOKBOOK & SPECIFICATIONS",
          body: "A curated visual monograph exploring architectural forms, typographic balance, and pre-flight print precision.",
          tag: "ISSUE NO. 04",
          isCover: true,
        },
        {
          bg: "#f8fafc",
          title: "TABLE OF CONTENTS",
          subtitle: "ARCHITECTURAL ESSAYS & CASE STUDIES",
          body: "01. Spatial Typography & Negative Space\n02. Minimalist Packaging & Sustainable Foil\n03. Digital Pre-Flight QA & Color Proofing\n04. Catalog Specifications & Paper Stocks",
          tag: "MANIFESTO",
        },
        {
          bg: "#ffffff",
          title: "01 / SPATIAL TYPOGRAPHY",
          subtitle: "DYNAMIC PROPORTIONS & GRID SYSTEMS",
          body: "Visual hierarchies should breathe. When type meets negative space with mathematical rigor, the reader's cognitive flow accelerates naturally.",
          tag: "CASE STUDY",
        },
        {
          bg: "#f1f5f9",
          title: "02 / SUSTAINABLE PACKAGING",
          subtitle: "TEXTURE, BLEED & EMBOSSED FINISHES",
          body: "High-contrast geometric compositions printed on 350gsm unbleached organic cotton cardstock. Designed to catch light and resist scuffs.",
          tag: "PRINT SPEC",
        },
        {
          bg: "#ffffff",
          title: "03 / COLOR ACCURACY",
          subtitle: "ZERO-STORAGE DIGITAL PRE-FLIGHT",
          body: "Every millimeter inspected before plates are struck. Catching typos, misaligned margins, and contrast drops saves thousands in costly reprint runs.",
          tag: "QUALITY QA",
        },
        {
          bg: "#0f172a",
          title: "SPELLENSE FLIPBOOK",
          subtitle: "FLAWLESS DESIGN • ZERO ERROR",
          body: "Published with 100% In-Browser Privacy.\nDesigned for modern creators, agencies & print masters.\n\nVisit spellense.com",
          tag: "BACK COVER",
          isCover: true,
        },
      ];

      pageConfigs.forEach((cfg, idx) => {
        const canvas = document.createElement("canvas");
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Background
        ctx.fillStyle = cfg.bg;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Subtle gradient accent
        if (cfg.isCover) {
          const grad = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
          grad.addColorStop(0, "rgba(59, 130, 246, 0.25)");
          grad.addColorStop(1, "rgba(147, 51, 234, 0.15)");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }

        // Inner page border
        ctx.strokeStyle = cfg.isCover ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.08)";
        ctx.lineWidth = 2;
        ctx.strokeRect(40, 40, canvasWidth - 80, canvasHeight - 80);

        // Tag pill
        ctx.fillStyle = cfg.isCover ? "#3b82f6" : "#2563eb";
        ctx.font = "bold 20px sans-serif";
        ctx.fillText(cfg.tag, 80, 110);

        // Title
        ctx.fillStyle = cfg.isCover ? "#ffffff" : "#0f172a";
        ctx.font = "bold 56px sans-serif";
        ctx.fillText(cfg.title, 80, 240);

        // Subtitle
        ctx.fillStyle = cfg.isCover ? "#94a3b8" : "#64748b";
        ctx.font = "bold 24px sans-serif";
        ctx.fillText(cfg.subtitle, 80, 300);

        // Decorative horizontal rule
        ctx.fillStyle = cfg.isCover ? "#38bdf8" : "#2563eb";
        ctx.fillRect(80, 340, 120, 4);

        // Body text (multi-line)
        ctx.fillStyle = cfg.isCover ? "#cbd5e1" : "#334155";
        ctx.font = "normal 28px sans-serif";
        const lines = cfg.body.split("\n");
        let startY = 440;
        for (const line of lines) {
          ctx.fillText(line, 80, startY);
          startY += 48;
        }

        // Page number bottom footer
        ctx.fillStyle = cfg.isCover ? "#64748b" : "#94a3b8";
        ctx.font = "bold 20px sans-serif";
        ctx.fillText(`PAGE ${idx + 1} / ${pageConfigs.length}`, 80, canvasHeight - 80);
        ctx.fillText("SPELLENSE 3D FLIPBOOK", canvasWidth - 360, canvasHeight - 80);

        demoPages.push({
          id: `demo-${idx + 1}`,
          dataUrl: canvas.toDataURL("image/jpeg", 0.95),
          width: canvasWidth,
          height: canvasHeight,
          pageNum: idx + 1,
        });
      });

      setPages(demoPages);
      setCurrentPage(0);
      setIsProcessing(false);
      setProcessingStatus("");
    }, 400);
  };

  // Generate Standalone Single-File Offline HTML Flipbook
  const downloadStandaloneHtml = () => {
    if (pages.length === 0) return;

    const pageImagesJson = JSON.stringify(pages.map((p) => p.dataUrl));

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline 3D Flipbook — Spellense</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0f172a;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      overflow-x: hidden;
      user-select: none;
    }
    header {
      width: 100%;
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(15, 23, 42, 0.8);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      z-index: 50;
    }
    .brand { font-size: 18px; font-weight: 800; letter-spacing: -0.5px; }
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
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: 24px 16px;
      perspective: 2500px;
    }
    .book-container {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      max-width: 1080px;
      width: 100%;
      height: 72vh;
      box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.7);
      border-radius: 12px;
      background: #1e293b;
      overflow: hidden;
    }
    .spread {
      display: flex;
      width: 100%;
      height: 100%;
      position: relative;
    }
    .page-pane {
      flex: 1;
      height: 100%;
      position: relative;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .page-pane img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: #ffffff;
    }
    .spine-shadow {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 36px;
      z-index: 10;
      pointer-events: none;
    }
    .spine-left {
      right: 0;
      background: linear-gradient(to left, rgba(0,0,0,0.25), transparent);
    }
    .spine-right {
      left: 0;
      background: linear-gradient(to right, rgba(0,0,0,0.25), transparent);
    }
    .nav-btn {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 30;
      transition: all 0.2s;
    }
    .nav-btn:hover { background: #2563eb; transform: translateY(-50%) scale(1.08); }
    .nav-prev { left: 16px; }
    .nav-next { right: 16px; }
    footer {
      width: 100%;
      padding: 14px 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      background: rgba(15, 23, 42, 0.8);
      backdrop-filter: blur(10px);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
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
    <div class="book-container" id="bookContainer">
      <button class="nav-btn nav-prev" id="prevBtn" onclick="turnPrev()">&#10094;</button>
      <div class="spread">
        <div class="page-pane" id="leftPane">
          <img id="leftImg" src="" alt="Left Page" />
          <div class="spine-shadow spine-left"></div>
        </div>
        <div class="page-pane" id="rightPane">
          <img id="rightImg" src="" alt="Right Page" />
          <div class="spine-shadow spine-right"></div>
        </div>
      </div>
      <button class="nav-btn nav-next" id="nextBtn" onclick="turnNext()">&#10095;</button>
    </div>
  </main>

  <footer>
    <button class="tool-btn" onclick="turnPrev()">Previous</button>
    <div class="page-indicator" id="pageIndicator">Loading pages...</div>
    <button class="tool-btn" onclick="turnNext()">Next</button>
    <button class="tool-btn" onclick="toggleFullscreen()">Fullscreen</button>
  </footer>

  <script>
    const PAGES = ${pageImagesJson};
    let currentIdx = 0;

    function renderPages() {
      const leftImg = document.getElementById("leftImg");
      const rightImg = document.getElementById("rightImg");
      const leftPane = document.getElementById("leftPane");
      const rightPane = document.getElementById("rightPane");
      const indicator = document.getElementById("pageIndicator");

      if (currentIdx === 0) {
        // Cover mode
        leftPane.style.visibility = "hidden";
        rightPane.style.visibility = "visible";
        rightImg.src = PAGES[0];
        indicator.textContent = "Cover (Page 1 of " + PAGES.length + ")";
      } else {
        leftPane.style.visibility = "visible";
        leftImg.src = PAGES[currentIdx] || "";
        
        if (currentIdx + 1 < PAGES.length) {
          rightPane.style.visibility = "visible";
          rightImg.src = PAGES[currentIdx + 1];
          indicator.textContent = "Pages " + (currentIdx + 1) + "–" + (currentIdx + 2) + " of " + PAGES.length;
        } else {
          rightPane.style.visibility = "hidden";
          indicator.textContent = "Page " + (currentIdx + 1) + " of " + PAGES.length + " (Back Cover)";
        }
      }
    }

    function turnNext() {
      const step = currentIdx === 0 ? 1 : 2;
      if (currentIdx + step < PAGES.length) {
        currentIdx += step;
        renderPages();
      }
    }

    function turnPrev() {
      const step = currentIdx <= 2 ? currentIdx : 2;
      if (currentIdx > 0) {
        currentIdx = Math.max(0, currentIdx - step);
        renderPages();
      }
    }

    function toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }

    window.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === " ") turnNext();
      if (e.key === "ArrowLeft") turnPrev();
    });

    renderPages();
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
  };

  // Generate ZIP Package with index.html and pages
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

      // index.html in zip referencing ./pages/page_XX.jpg
      const pagePaths = pages.map(
        (_, idx) => `./pages/page_${String(idx + 1).padStart(2, "0")}.jpg`
      );

      const zipHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>3D Digital Flipbook</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0f172a; color: #fff; font-family: sans-serif; display: flex; flex-direction: column; min-height: 100vh; justify-content: space-between; align-items: center; }
    header { padding: 16px; width: 100%; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; }
    main { flex: 1; display: flex; align-items: center; justify-content: center; width: 100%; padding: 20px; }
    .book { display: flex; width: 1000px; height: 700px; max-width: 95vw; max-height: 75vh; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.8); border-radius: 8px; overflow: hidden; background: #fff; }
    .pane { flex: 1; height: 100%; display: flex; align-items: center; justify-content: center; background: #fff; }
    .pane img { width: 100%; height: 100%; object-fit: contain; }
    footer { padding: 14px; width: 100%; display: flex; justify-content: center; gap: 14px; align-items: center; border-top: 1px solid #334155; }
    button { background: #2563eb; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; }
    button:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <header>
    <div><strong>Spellense</strong> 3D Flipbook</div>
    <div>Offline Web Package</div>
  </header>
  <main>
    <div class="book">
      <div class="pane"><img id="left" src="${pagePaths[0]}" /></div>
      <div class="pane"><img id="right" src="${pagePaths[1] || pagePaths[0]}" /></div>
    </div>
  </main>
  <footer>
    <button onclick="prev()">Previous</button>
    <span id="label">Pages 1–2</span>
    <button onclick="next()">Next</button>
  </footer>
  <script>
    const pages = ${JSON.stringify(pagePaths)};
    let cur = 0;
    function show() {
      document.getElementById('left').src = pages[cur] || '';
      document.getElementById('right').src = pages[cur+1] || pages[cur] || '';
      document.getElementById('label').textContent = 'Pages ' + (cur+1) + '–' + Math.min(pages.length, cur+2) + ' of ' + pages.length;
    }
    function next() { if (cur + 2 < pages.length) { cur += 2; show(); } }
    function prev() { if (cur - 2 >= 0) { cur -= 2; show(); } }
    show();
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
      q: "How do visitors view or download the flipbook offline?",
      a: "You can click 'Download Offline Flipbook (.html)' to receive a single, self-contained HTML file. Anyone can double-click this file on Mac, Windows, iPhone, or Android to open and read your catalog with realistic page turning and zero internet connection required.",
    },
    {
      q: "Are my confidential PDFs or catalog images uploaded to any server?",
      a: "No. Spellense operates on a strict zero-storage, in-memory architecture. Your PDF pages and images are rendered directly on your device using WebAssembly and HTML5 Canvas. No document data is ever stored or transmitted to external servers.",
    },
    {
      q: "Can I embed the 3D flipbook on my own website or WordPress?",
      a: "Yes. Click 'Embed Code' to copy an iframe snippet. You can paste this code into WordPress, Webflow, Squarespace, Shopify, or any HTML webpage to display a responsive interactive flipbook.",
    },
    {
      q: "What file formats can I upload?",
      a: "You can upload multi-page PDF documents (brochures, magazines, lookbooks, portfolios), or batch upload individual image files in JPG, PNG, or WebP format.",
    },
    {
      q: "How many pages can the flipbook hold?",
      a: "Because all rendering happens locally inside your browser's RAM, documents with 50+ pages run smoothly with high frame rates.",
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
          <div className="mx-auto max-w-3xl">
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
                Drop your brochure, catalog, or portfolio here. Convert it into a 3D digital flipbook with zero server storage.
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

            {/* DEMO BUTTON PROMPT */}
            <div className="mt-6 text-center">
              <span className="text-xs text-slate-500">Don&apos;t have a PDF ready? </span>
              <button
                type="button"
                onClick={loadDemoFlipbook}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 underline underline-offset-4 cursor-pointer"
              >
                <span>Try Sample Lookbook Flipbook</span>
                <span>&rarr;</span>
              </button>
            </div>
          </div>
        ) : (
          /* ACTIVE FLIPBOOK WORKSPACE */
          <div ref={containerRef} className="space-y-4">
            {/* TOP TOOLBAR */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-xs backdrop-blur-md">
              <div className="flex items-center gap-2">
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

                {/* Double / Single Page Toggle */}
                <button
                  type="button"
                  onClick={() => setIsDoublePage(!isDoublePage)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                    isDoublePage
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                  }`}
                  title="Toggle 2-page spread or single-page view"
                >
                  <span>{isDoublePage ? "Spread Mode" : "Single Page"}</span>
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={downloadStandaloneHtml}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 active:scale-95 cursor-pointer"
                  title="Download standalone single-file HTML that opens offline in any browser"
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

            {/* 3D FLIPBOOK STAGE */}
            <div className="relative flex min-h-[520px] sm:min-h-[620px] lg:min-h-[680px] w-full items-center justify-center rounded-3xl border border-slate-200/90 bg-slate-900 p-4 sm:p-8 shadow-2xl overflow-hidden select-none">
              {/* Previous Nav Arrow */}
              <button
                type="button"
                onClick={turnPrev}
                disabled={currentPage === 0 || isFlipping}
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800/80 text-white shadow-lg backdrop-blur-md transition hover:bg-blue-600 hover:scale-110 active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                aria-label="Previous page"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              </button>

              {/* BOOK SPREAD CONTAINER */}
              <div
                className="relative flex items-center justify-center transition-transform duration-300"
                style={{
                  transform: `scale(${zoomLevel})`,
                  perspective: "2600px",
                }}
              >
                {isDoublePage ? (
                  /* 2-PAGE SPREAD MODE */
                  <div className="flex h-[440px] sm:h-[540px] lg:h-[600px] shadow-2xl rounded-lg overflow-hidden bg-white">
                    {/* LEFT PAGE */}
                    <div
                      onClick={turnPrev}
                      className="relative w-[280px] sm:w-[380px] lg:w-[440px] h-full bg-white flex items-center justify-center overflow-hidden cursor-pointer group"
                    >
                      {currentPage === 0 ? (
                        /* When on cover, left side is dark/spine */
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-500 text-xs font-bold uppercase tracking-wider">
                          Book Cover Closed
                        </div>
                      ) : (
                        pages[currentPage] && (
                          <img
                            src={pages[currentPage].dataUrl}
                            alt={`Page ${currentPage + 1}`}
                            className="h-full w-full object-contain pointer-events-none"
                          />
                        )
                      )}

                      {/* Spine shadow on left page */}
                      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/25 to-transparent z-10" />

                      {/* Subtle hover page-curl indicator */}
                      <div className="pointer-events-none absolute left-0 bottom-0 h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-tr from-blue-500/20 to-transparent" />
                    </div>

                    {/* RIGHT PAGE */}
                    <div
                      onClick={turnNext}
                      className="relative w-[280px] sm:w-[380px] lg:w-[440px] h-full bg-white flex items-center justify-center overflow-hidden cursor-pointer group"
                    >
                      {currentPage === 0 ? (
                        /* Cover displays on right side */
                        pages[0] && (
                          <img
                            src={pages[0].dataUrl}
                            alt="Front Cover"
                            className="h-full w-full object-contain pointer-events-none"
                          />
                        )
                      ) : currentPage + 1 < pages.length ? (
                        <img
                          src={pages[currentPage + 1].dataUrl}
                          alt={`Page ${currentPage + 2}`}
                          className="h-full w-full object-contain pointer-events-none"
                        />
                      ) : (
                        /* Empty/Back cover inner */
                        <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold">
                          End of Document
                        </div>
                      )}

                      {/* Spine shadow on right page */}
                      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/25 to-transparent z-10" />

                      {/* Subtle hover page-curl indicator */}
                      <div className="pointer-events-none absolute right-0 bottom-0 h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-tl from-blue-500/20 to-transparent" />
                    </div>
                  </div>
                ) : (
                  /* SINGLE PAGE MODE (Mobile / Portrait) */
                  <div
                    onClick={turnNext}
                    className="h-[440px] sm:h-[560px] w-[320px] sm:w-[420px] shadow-2xl rounded-lg overflow-hidden bg-white cursor-pointer relative"
                  >
                    {pages[currentPage] && (
                      <img
                        src={pages[currentPage].dataUrl}
                        alt={`Page ${currentPage + 1}`}
                        className="h-full w-full object-contain pointer-events-none"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Next Nav Arrow */}
              <button
                type="button"
                onClick={turnNext}
                disabled={currentPage >= pages.length - 1 || isFlipping}
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800/80 text-white shadow-lg backdrop-blur-md transition hover:bg-blue-600 hover:scale-110 active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
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
                    ? `Cover (Page 1 of ${pages.length})`
                    : isDoublePage
                    ? `Pages ${currentPage + 1}–${Math.min(pages.length, currentPage + 2)} of ${pages.length}`
                    : `Page ${currentPage + 1} of ${pages.length}`}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => (z === 1 ? 1.25 : 1))}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    {zoomLevel === 1 ? "Zoom 125%" : "Zoom 100%"}
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
                      currentPage === idx || (isDoublePage && currentPage + 1 === idx && currentPage !== 0);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setCurrentPage(idx)}
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
                Want to reduce your catalog file size or check for hidden typos?
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
