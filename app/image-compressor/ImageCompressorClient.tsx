"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import JSZip from "jszip";
import {
  trackFileUpload,
  trackImageCompressed,
  trackReportDownload,
} from "@/lib/analytics";

type OutputFormat = "webp" | "jpeg" | "png" | "avif" | "original";

interface CompressedItem {
  id: string;
  file: File;
  name: string;
  originalUrl: string;
  compressedUrl: string | null;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
  format: OutputFormat;
  quality: number; // 1 to 100
  scalePercent: number; // 100
  status: "idle" | "compressing" | "done" | "error";
  error?: string;
  blob: Blob | null;
}

const FORMAT_OPTIONS: { label: string; value: OutputFormat; desc: string }[] = [
  {
    label: "WebP (Recommended)",
    value: "webp",
    desc: "Smallest size, 90%+ savings, supported in all modern browsers",
  },
  {
    label: "MozJPEG / JPG",
    value: "jpeg",
    desc: "Universal standard for print, photos & legacy systems",
  },
  {
    label: "PNG (Lossless)",
    value: "png",
    desc: "Preserves transparent backgrounds and crisp sharp lines",
  },
  {
    label: "AVIF (Next-Gen)",
    value: "avif",
    desc: "Cutting-edge extreme compression for modern web",
  },
  {
    label: "Original Format",
    value: "original",
    desc: "Keeps identical extension as your uploaded file",
  },
];

const PRESETS = [
  { name: "Best for Web (~100 KB)", quality: 78, format: "webp" as OutputFormat },
  { name: "Balanced (~200 KB)", quality: 84, format: "webp" as OutputFormat },
  { name: "Ultra Fidelity (~400 KB)", quality: 92, format: "jpeg" as OutputFormat },
];

const FAQ_ITEMS = [
  {
    q: "Does compressing an image change its dimensions (width & height)?",
    a: "No. Spellense strictly locks and preserves your exact pixel dimensions. For example, a 1200×1200 image remains 1200×1200 after compression. We apply perceptual compression and remove bloat so your layout remains sharp without shrinking resolution.",
  },
  {
    q: "How does the Squoosh-style split comparison work?",
    a: "Our interactive split-screen slider lets you drag a vertical divider line across your image. The left side shows your original uncompressed image, and the right side shows the compressed result in real time. You can zoom up to 2× to verify that text, logos, and edges remain razor sharp.",
  },
  {
    q: "Can I compress multiple images or multi-page PDF catalogs at once?",
    a: "Yes! You can drop 10, 20, or more images at once, or drop a multi-page PDF catalog. Spellense automatically processes all pages and lets you download individual files or download everything in a single, organized ZIP archive.",
  },
  {
    q: "Are my confidential design files or client images uploaded to any server?",
    a: "Never. 100% of the image compression takes place locally inside your browser using HTML5 Canvas and browser WebAssembly. Your files never leave your computer and are never saved or trained on any server.",
  },
  {
    q: "Which format is best: WebP, JPEG, or PNG?",
    a: "WebP is recommended for websites and digital media because it achieves up to 90% size reduction with virtually no noticeable difference. JPEG is ideal for print documents and client submissions. PNG is best when transparent backgrounds or pixel-level text contrast must be retained.",
  },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ImageCompressorClient() {
  const router = useRouter();

  // State
  const [items, setItems] = useState<CompressedItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [pdfProgressText, setPdfProgressText] = useState("");
  const [isZipping, setIsZipping] = useState(false);
  const [isBatchCompressing, setIsBatchCompressing] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [loadingSample, setLoadingSample] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Global Settings for active or batch
  const [globalFormat, setGlobalFormat] = useState<OutputFormat>("webp");
  const [globalQuality, setGlobalQuality] = useState<number>(80);
  const globalScale = 100; // Strictly preserves original dimensions (1200x1200 stays 1200x1200)
  const [stripMetadata, setStripMetadata] = useState<boolean>(true);

  // Squoosh-Style Split Screen Slider State
  const [sliderPos, setSliderPos] = useState<number>(50); // 0 to 100 percent
  const [isDraggingHandle, setIsDraggingHandle] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1); // 1, 1.5, 2
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const compareContainerRef = useRef<HTMLDivElement | null>(null);

  // Active item
  const activeItem = useMemo(() => {
    return items.find((it) => it.id === activeId) || items[0] || null;
  }, [items, activeId]);

  // Handle client-side canvas compression for a single item
  const compressSingleItem = useCallback(
    async (
      item: CompressedItem,
      overrideQuality?: number,
      overrideFormat?: OutputFormat,
      overrideScale?: number
    ): Promise<CompressedItem> => {
      return new Promise((resolve) => {
        const qualityVal = (overrideQuality ?? item.quality) / 100;
        const formatVal = overrideFormat ?? item.format;
        const scaleVal = (overrideScale ?? item.scalePercent) / 100;

        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = async () => {
          try {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d", { willReadFrequently: true });

            if (!ctx) {
              resolve({ ...item, status: "error", error: "Canvas context unavailable" });
              return;
            }

            // Dimension logic: strictly preserve original dimension
            const origW = img.naturalWidth || img.width;
            const origH = img.naturalHeight || img.height;
            const targetW = Math.max(1, Math.round(origW * scaleVal));
            const targetH = Math.max(1, Math.round(origH * scaleVal));

            canvas.width = targetW;
            canvas.height = targetH;

            // Highest fidelity smoothing
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";

            // If format is JPEG, draw white background for transparent images
            let effectiveMime = "image/webp";
            if (formatVal === "jpeg") {
              effectiveMime = "image/jpeg";
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(0, 0, targetW, targetH);
            } else if (formatVal === "png") {
              effectiveMime = "image/png";
            } else if (formatVal === "avif") {
              effectiveMime = "image/avif";
            } else if (formatVal === "original") {
              effectiveMime = item.file.type || "image/jpeg";
              if (effectiveMime === "image/jpeg") {
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, targetW, targetH);
              }
            }

            ctx.drawImage(img, 0, 0, targetW, targetH);

            const getBlob = (mime: string, q: number): Promise<Blob | null> => {
              return new Promise((res) => {
                canvas.toBlob(
                  (blob) => res(blob),
                  mime,
                  mime === "image/png" ? undefined : q
                );
              });
            };

            let finalBlob = await getBlob(effectiveMime, qualityVal);

            // Fallback if browser does not support AVIF encoding
            if (!finalBlob && effectiveMime === "image/avif") {
              effectiveMime = "image/webp";
              finalBlob = await getBlob(effectiveMime, qualityVal);
            }

            if (!finalBlob) {
              finalBlob = await getBlob("image/jpeg", qualityVal);
            }

            if (!finalBlob) {
              resolve({ ...item, status: "error", error: "Compression failed" });
              return;
            }

            // Revoke old compressed URL if present
            if (item.compressedUrl) {
              URL.revokeObjectURL(item.compressedUrl);
            }

            const newUrl = URL.createObjectURL(finalBlob);

            const savings =
              item.originalSize > 0
                ? Math.round(
                    ((item.originalSize - finalBlob.size) / item.originalSize) * 100
                  )
                : 0;

            trackImageCompressed({
              format: effectiveMime,
              quality: Math.round(qualityVal * 100),
              original_size_kb: Math.round(item.originalSize / 1024),
              compressed_size_kb: Math.round(finalBlob.size / 1024),
              savings_percent: savings,
            });

            resolve({
              ...item,
              compressedUrl: newUrl,
              compressedSize: finalBlob.size,
              width: targetW,
              height: targetH,
              quality: Math.round(qualityVal * 100),
              format: formatVal,
              scalePercent: Math.round(scaleVal * 100),
              status: "done",
              error: undefined,
              blob: finalBlob,
            });
          } catch (err: unknown) {
            console.error("Compression error:", err);
            resolve({
              ...item,
              status: "error",
              error: err instanceof Error ? err.message : "Error compressing image",
            });
          }
        };

        img.onerror = () => {
          resolve({ ...item, status: "error", error: "Failed to load original image" });
        };

        img.src = item.originalUrl;
      });
    },
    []
  );

  // Load and ingest files (supports multiple images AND multi-page PDF!)
  const processIncomingFiles = useCallback(
    async (fileList: File[]) => {
      if (fileList.length === 0) return;

      const newItems: CompressedItem[] = [];

      for (const file of fileList) {
        const isPdf =
          file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

        if (isPdf) {
          // Multi-page PDF extraction
          try {
            setIsProcessingPdf(true);
            setPdfProgressText(`Reading catalog PDF: ${file.name}...`);

            const pdfjsLib = await import("pdfjs-dist");
            pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({
              data: arrayBuffer,
              disableRange: true,
              disableStream: true,
            });

            const pdf = await loadingTask.promise;
            const totalPages = pdf.numPages;

            for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
              setPdfProgressText(
                `Rendering page ${pageNum} of ${totalPages} from ${file.name}...`
              );
              const page = await pdf.getPage(pageNum);
              // High-resolution scale 2.0 to preserve pixel clarity
              const viewport = page.getViewport({ scale: 2.0 });

              const canvas = document.createElement("canvas");
              const ctx = canvas.getContext("2d");
              if (!ctx) continue;

              canvas.width = viewport.width;
              canvas.height = viewport.height;

              // @ts-expect-error pdfjs typing
              await page.render({ canvasContext: ctx, viewport }).promise;

              const pageBlob: Blob | null = await new Promise((res) =>
                canvas.toBlob((b) => res(b), "image/jpeg", 0.95)
              );

              if (pageBlob) {
                const baseDocName = file.name.replace(/\.[^/.]+$/, "");
                const pageFile = new File(
                  [pageBlob],
                  `${baseDocName}-page-${pageNum}.jpg`,
                  { type: "image/jpeg" }
                );

                const itemUrl = URL.createObjectURL(pageFile);
                newItems.push({
                  id: `pdf-${Date.now()}-${pageNum}-${Math.random().toString(36).substring(2, 7)}`,
                  file: pageFile,
                  name: `${baseDocName}-page-${pageNum}.jpg`,
                  originalUrl: itemUrl,
                  compressedUrl: null,
                  originalSize: pageBlob.size,
                  compressedSize: 0,
                  width: Math.round(viewport.width),
                  height: Math.round(viewport.height),
                  format: globalFormat,
                  quality: globalQuality,
                  scalePercent: globalScale,
                  status: "idle",
                  blob: null,
                });
              }
            }

            await pdf.cleanup();
            await loadingTask.destroy();
          } catch (pdfErr) {
            console.error("PDF extraction error:", pdfErr);
          } finally {
            setIsProcessingPdf(false);
            setPdfProgressText("");
          }
        } else if (file.type.startsWith("image/") || /\.(png|jpe?g|webp|avif|svg)$/i.test(file.name)) {
          // Regular Image
          const objectUrl = URL.createObjectURL(file);

          // Read natural dimensions
          const dims: { w: number; h: number } = await new Promise((res) => {
            const tempImg = new Image();
            tempImg.onload = () =>
              res({ w: tempImg.naturalWidth, h: tempImg.naturalHeight });
            tempImg.onerror = () => res({ w: 1200, h: 1200 });
            tempImg.src = objectUrl;
          });

          newItems.push({
            id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            file,
            name: file.name,
            originalUrl: objectUrl,
            compressedUrl: null,
            originalSize: file.size,
            compressedSize: 0,
            width: dims.w,
            height: dims.h,
            format: globalFormat,
            quality: globalQuality,
            scalePercent: globalScale,
            status: "idle",
            blob: null,
          });

          trackFileUpload("image_compressor", file);
        }
      }

      if (newItems.length > 0) {
        setItems((prev) => {
          const updated = [...prev, ...newItems];
          if (!activeId) {
            setActiveId(newItems[0].id);
          }
          return updated;
        });

        // Trigger compression on new items
        setIsBatchCompressing(true);
        const compressedResults = await Promise.all(
          newItems.map((item) =>
            compressSingleItem(item, globalQuality, globalFormat, globalScale)
          )
        );

        setItems((prev) =>
          prev.map((item) => {
            const found = compressedResults.find((c) => c.id === item.id);
            return found || item;
          })
        );
        setIsBatchCompressing(false);
      }
    },
    [
      activeId,
      compressSingleItem,
      globalFormat,
      globalQuality,
      globalScale,
    ]
  );

  // Load sample image to let users test compression with 1 click
  const handleLoadSample = async () => {
    try {
      setLoadingSample(true);
      setUploadError(null);

      // Prioritize high-resolution catalog banner (~570KB) to showcase compression power, or fallback to sample-document.png
      let res = await fetch("/spellense-launch-banner.jpg");
      let fileName = "sample-catalog-banner.jpg";
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

      await processIncomingFiles([sampleFile]);
    } catch (err) {
      console.error("Error loading sample image:", err);
      setUploadError("Could not load sample image. Please select an image from your device.");
    } finally {
      setLoadingSample(false);
    }
  };

  // Trigger re-compression on active item when quality or format changes
  useEffect(() => {
    if (!activeItem) return;

    let isMounted = true;
    const timer = setTimeout(async () => {
      if (activeItem.status === "compressing") return;

      const updated = await compressSingleItem(
        activeItem,
        globalQuality,
        globalFormat,
        globalScale
      );

      if (isMounted) {
        setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
      }
    }, 180); // Debounced 180ms

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [globalQuality, globalFormat, globalScale, activeId, activeItem, compressSingleItem]);

  // Apply settings to all items in batch
  const handleApplyToAll = async () => {
    if (items.length === 0) return;
    setIsBatchCompressing(true);
    const updated = await Promise.all(
      items.map((it) =>
        compressSingleItem(it, globalQuality, globalFormat, globalScale)
      )
    );
    setItems(updated);
    setIsBatchCompressing(false);
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processIncomingFiles(Array.from(e.dataTransfer.files));
    }
  };

  // Squoosh split-screen slider pointer events
  const handleSliderMove = useCallback((clientX: number) => {
    if (!compareContainerRef.current) return;
    const rect = compareContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pct);
  }, []);

  const handleMouseDownSlider = () => {
    setIsDraggingHandle(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingHandle) {
        handleSliderMove(e.clientX);
      } else if (isPanning) {
        setPanOffset({
          x: e.clientX - panStartRef.current.x,
          y: e.clientY - panStartRef.current.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDraggingHandle(false);
      setIsPanning(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingHandle && e.touches.length > 0) {
        handleSliderMove(e.touches[0].clientX);
      }
    };

    const handleTouchEnd = () => {
      setIsDraggingHandle(false);
    };

    if (isDraggingHandle || isPanning) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleTouchEnd);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDraggingHandle, isPanning, handleSliderMove]);

  // Download single item
  const handleDownloadItem = (item: CompressedItem) => {
    if (!item.compressedUrl) return;

    const baseName = item.name.replace(/\.[^/.]+$/, "");
    let ext = "webp";
    if (item.format === "jpeg") ext = "jpg";
    else if (item.format === "png") ext = "png";
    else if (item.format === "avif") ext = "avif";
    else if (item.format === "original") {
      ext = item.name.split(".").pop() || "jpg";
    }

    const downloadName = `${baseName}-spellense.${ext}`;
    const link = document.createElement("a");
    link.href = item.compressedUrl;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    trackReportDownload({
      tool: "image_compressor",
      format: ext as "webp" | "jpg" | "png" | "avif",
      error_count: 0,
      file_count: 1,
    });
  };

  // Download all as ZIP
  const handleDownloadAllZip = async () => {
    if (items.length === 0) return;
    setIsZipping(true);

    try {
      const zip = new JSZip();

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.blob) {
          const res = await compressSingleItem(
            item,
            globalQuality,
            globalFormat,
            globalScale
          );
          if (res.blob) {
            const baseName = res.name.replace(/\.[^/.]+$/, "");
            let ext = "webp";
            if (res.format === "jpeg") ext = "jpg";
            else if (res.format === "png") ext = "png";
            else if (res.format === "avif") ext = "avif";
            zip.file(`${baseName}-spellense.${ext}`, res.blob);
          }
        } else {
          const baseName = item.name.replace(/\.[^/.]+$/, "");
          let ext = "webp";
          if (item.format === "jpeg") ext = "jpg";
          else if (item.format === "png") ext = "png";
          else if (item.format === "avif") ext = "avif";
          zip.file(`${baseName}-spellense.${ext}`, item.blob);
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      const zipUrl = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = zipUrl;
      link.download = `spellense-compressed-images-${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(zipUrl);

      trackReportDownload({
        tool: "image_compressor",
        format: "zip",
        error_count: 0,
        file_count: items.length,
      });
    } catch (err) {
      console.error("ZIP creation error:", err);
    } finally {
      setIsZipping(false);
    }
  };

  // Carry active image to Spellense home for OCR proofreading
  const handleSendToSpellcheck = () => {
    if (!activeItem) return;
    try {
      sessionStorage.setItem("spellense_source_image_name", activeItem.name);
      router.push("/");
    } catch {
      router.push("/");
    }
  };

  // Carry active image to Image-to-Text tool
  const handleSendToImageToText = () => {
    if (!activeItem) return;
    try {
      sessionStorage.setItem("spellense_source_image_name", activeItem.name);
      router.push("/image-to-text");
    } catch {
      router.push("/image-to-text");
    }
  };

  // Remove item
  const handleRemoveItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setItems((prev) => {
      const remaining = prev.filter((it) => it.id !== id);
      if (activeId === id) {
        setActiveId(remaining[0]?.id || null);
      }
      return remaining;
    });
  };

  // Clear all
  const handleClearAll = () => {
    items.forEach((it) => {
      if (it.originalUrl) URL.revokeObjectURL(it.originalUrl);
      if (it.compressedUrl) URL.revokeObjectURL(it.compressedUrl);
    });
    setItems([]);
    setActiveId(null);
  };

  // Total savings calculation across all items
  const totalStats = useMemo(() => {
    let orig = 0;
    let comp = 0;
    items.forEach((it) => {
      orig += it.originalSize;
      comp += it.compressedSize > 0 ? it.compressedSize : it.originalSize;
    });
    const saved = orig > 0 ? Math.round(((orig - comp) / orig) * 100) : 0;
    return { orig, comp, saved };
  }, [items]);

  return (
    <div className="flex min-h-screen flex-col bg-[#f0f6fe] font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      <Navbar />

      <main className="flex-1">
        {/* HERO SECTION — Title color only black, strictly 1 single line, generous spacing */}
        <section className="relative overflow-hidden px-4 pt-12 pb-10 sm:px-6 sm:pt-16 sm:pb-14 lg:pt-20 lg:pb-16">
          <div className="mx-auto max-w-7xl text-center">
            <h1 className="text-[17px] xs:text-[21px] sm:text-[28px] md:text-[36px] lg:text-[42px] xl:text-[48px] font-extrabold leading-tight tracking-tight text-black text-center whitespace-nowrap">
              Compress Images Without Losing Quality
            </h1>
          </div>
        </section>

        {/* WORKSPACE SECTION */}
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          {items.length === 0 ? (
            /* UPLOAD DROPZONE */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative mx-auto max-w-4xl cursor-pointer rounded-3xl border-2 border-dashed p-10 sm:p-16 text-center transition-all duration-300 shadow-xl backdrop-blur-xl ${
                isDragging
                  ? "border-blue-500 bg-blue-50/80 scale-[1.01]"
                  : "border-slate-300/80 bg-white/85 hover:border-blue-400 hover:bg-white"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    processIncomingFiles(Array.from(e.target.files));
                  }
                }}
              />

              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-500 via-indigo-600 to-blue-700 text-white shadow-lg shadow-blue-500/25">
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>

              <h2 className="mt-5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                Drop your images or multi-page catalogs here
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-md mx-auto font-normal">
                Supports multiple files: JPG, PNG, WebP, AVIF or PDF. 100% private in-browser compression.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-6 py-3.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-600/25 transition hover:shadow-lg hover:shadow-blue-600/35 active:scale-95 cursor-pointer"
                >
                  Choose Images or PDF Catalog
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLoadSample();
                  }}
                  disabled={loadingSample}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-100/90 hover:bg-blue-50/70 px-5 py-3.5 text-xs sm:text-sm font-bold text-slate-700 shadow-2xs backdrop-blur-xs transition hover:text-blue-600 disabled:opacity-60 cursor-pointer"
                  title="Test immediately with a sample image"
                >
                  {loadingSample ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  ) : (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-blue-500"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  )}
                  <span>Try sample image</span>
                </button>
              </div>

              {uploadError && (
                <div className="mt-4 text-xs font-semibold text-rose-600">
                  {uploadError}
                </div>
              )}

              {isProcessingPdf && (
                <div className="mt-6 flex items-center justify-center gap-2 text-xs font-semibold text-blue-600">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  {pdfProgressText}
                </div>
              )}
            </div>
          ) : (
            /* EDITOR WORKSPACE */
            <div className="space-y-6">
              {/* TOP ACTION & BATCH STATS BAR */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/80 bg-white/80 p-4 sm:p-5 shadow-xl shadow-blue-500/5 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 cursor-pointer"
                  >
                    <span>+ Add More Files</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        processIncomingFiles(Array.from(e.target.files));
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-700 transition cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>

                {/* Overall Batch Savings Badge */}
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-3.5 py-1.5 font-bold text-emerald-700 border border-emerald-200/80">
                    <span>Total Saved: {totalStats.saved}%</span>
                    <span className="font-normal text-emerald-600">
                      ({formatBytes(totalStats.orig)} → {formatBytes(totalStats.comp)})
                    </span>
                  </div>

                  {items.length > 1 && (
                    <button
                      type="button"
                      disabled={isZipping || isBatchCompressing}
                      onClick={handleDownloadAllZip}
                      className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition hover:shadow-lg hover:shadow-blue-600/35 disabled:opacity-50 cursor-pointer"
                    >
                      {isZipping ? (
                        <>
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Creating ZIP...
                        </>
                      ) : (
                        <>
                          <span>Download All ({items.length}) as ZIP</span>
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* MAIN LAYOUT: PREVIEW & CONTROLS ON LEFT (8 COLS), BATCH QUEUE ON RIGHT (4 COLS) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT & CENTER: PREVIEW BOX + COMPRESSION CONTROLS (8 COLS) */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                  {/* SQUOOSH-STYLE INTERACTIVE BEFORE/AFTER SLIDER */}
                  <div className="relative rounded-3xl border border-slate-200/80 bg-slate-900/95 overflow-hidden shadow-2xl backdrop-blur-xl">
                    {/* Viewport Top Toolbar */}
                    <div className="absolute top-3.5 left-3.5 right-3.5 z-30 flex items-center justify-between pointer-events-none">
                      {/* Left Badge: Original */}
                      <div className="pointer-events-auto rounded-xl bg-slate-900/85 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md border border-white/10 shadow-xs">
                        ORIGINAL • {activeItem?.width}×{activeItem?.height} •{" "}
                        {activeItem ? formatBytes(activeItem.originalSize) : "0 KB"}
                      </div>

                      {/* Right Badge: Compressed */}
                      <div className="pointer-events-auto flex items-center gap-1.5 rounded-xl bg-blue-600/90 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md border border-blue-400/30 shadow-xs">
                        <span>
                          {activeItem?.format.toUpperCase()} •{" "}
                          {activeItem ? formatBytes(activeItem.compressedSize) : "..."}
                        </span>
                        {activeItem && activeItem.compressedSize > 0 && (
                          <span className="rounded-full bg-emerald-400/30 px-2 py-0.5 text-[11px] font-bold text-emerald-200">
                            -
                            {Math.round(
                              ((activeItem.originalSize - activeItem.compressedSize) /
                                activeItem.originalSize) *
                                100
                            )}
                            %
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Zoom / Pan Controls (Bottom Left of Canvas) */}
                    <div className="absolute bottom-3.5 left-3.5 z-30 flex items-center gap-1 rounded-xl bg-slate-900/85 p-1 border border-white/10 backdrop-blur-md">
                      <button
                        type="button"
                        onClick={() => {
                          setZoomLevel(1);
                          setPanOffset({ x: 0, y: 0 });
                        }}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                          zoomLevel === 1
                            ? "bg-blue-600 text-white"
                            : "text-slate-300 hover:text-white"
                        }`}
                      >
                        Fit
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoomLevel(1.5)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                          zoomLevel === 1.5
                            ? "bg-blue-600 text-white"
                            : "text-slate-300 hover:text-white"
                        }`}
                      >
                        1.5×
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoomLevel(2)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                          zoomLevel === 2
                            ? "bg-blue-600 text-white"
                            : "text-slate-300 hover:text-white"
                        }`}
                      >
                        2×
                      </button>
                    </div>

                    {/* Download Button on Bottom Right of Canvas */}
                    <div className="absolute bottom-3.5 right-3.5 z-30">
                      {activeItem && (
                        <button
                          type="button"
                          onClick={() => handleDownloadItem(activeItem)}
                          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/40 transition cursor-pointer"
                        >
                          <span>Download ({formatBytes(activeItem.compressedSize)})</span>
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* SQUOOSH SPLIT SLIDER CANVAS */}
                    <div
                      ref={compareContainerRef}
                      className="relative min-h-[460px] sm:min-h-[520px] flex items-center justify-center overflow-hidden cursor-crosshair select-none"
                      style={{
                        background:
                          "repeating-conic-gradient(#1e293b 0% 25%, #0f172a 0% 50%) 50% / 20px 20px",
                      }}
                      onMouseDown={(e) => {
                        if (zoomLevel > 1) {
                          setIsPanning(true);
                          panStartRef.current = {
                            x: e.clientX - panOffset.x,
                            y: e.clientY - panOffset.y,
                          };
                        }
                      }}
                    >
                      {activeItem ? (
                        <div
                          className="relative flex items-center justify-center transition-transform duration-75"
                          style={{
                            transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
                            transformOrigin: "center center",
                          }}
                        >
                          {/* 1. Compressed Image (Full Background) */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={activeItem.compressedUrl || activeItem.originalUrl}
                            alt="Compressed preview"
                            className="max-h-[500px] w-auto object-contain pointer-events-none block"
                          />

                          {/* 2. Original Image (Clipped to Slider Left) */}
                          <div
                            className="absolute inset-0 overflow-hidden pointer-events-none"
                            style={{
                              clipPath: `inset(0 ${100 - sliderPos}% 0 0)`,
                            }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={activeItem.originalUrl}
                              alt="Original preview"
                              className="max-h-[500px] w-auto object-contain block"
                            />
                          </div>

                          {/* 3. Draggable Divider Handle Line */}
                          <div
                            className="absolute top-0 bottom-0 z-20 w-0.5 bg-blue-400 cursor-ew-resize pointer-events-auto shadow-[0_0_12px_rgba(37,99,235,0.8)]"
                            style={{ left: `${sliderPos}%` }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              handleMouseDownSlider();
                            }}
                            onTouchStart={(e) => {
                              e.stopPropagation();
                              setIsDraggingHandle(true);
                            }}
                          >
                            {/* BLUE Circular Handle with White Left/Right Arrows */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/50 border-2 border-white transition-transform hover:scale-110 active:scale-95 cursor-ew-resize">
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                              >
                                <polyline points="15 18 9 12 15 6" />
                                <polyline points="9 18 3 12 9 6" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-slate-500 text-sm">No image selected</div>
                      )}
                    </div>
                  </div>

                  {/* COMPRESSION CONTROLS CARD — High Typography Readability */}
                  <div className="rounded-3xl border border-white/90 bg-white/90 p-6 sm:p-7 shadow-xl shadow-blue-500/5 backdrop-blur-xl">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          Compression Settings
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5 font-normal">
                          Fine-tune quality, format, and size for optimal clarity.
                        </p>
                      </div>
                      {isBatchCompressing && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600">
                          <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                          Optimizing...
                        </span>
                      )}
                    </div>

                    {/* FORMAT SELECTION */}
                    <div className="mt-5">
                      <label className="text-sm font-bold text-slate-800 block">
                        Output Format
                      </label>
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {FORMAT_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setGlobalFormat(opt.value);
                            }}
                            className={`rounded-2xl border p-3 text-left transition cursor-pointer ${
                              globalFormat === opt.value
                                ? "border-blue-600 bg-blue-50/80 text-blue-900 shadow-2xs"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <div className="text-sm font-bold text-slate-900 truncate">
                              {opt.label.split(" ")[0]}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 truncate font-normal">
                              {opt.value === "webp"
                                ? "Best for Web"
                                : opt.value === "jpeg"
                                ? "Photos & Print"
                                : opt.value === "png"
                                ? "Transparency"
                                : opt.value === "avif"
                                ? "Next-gen"
                                : "Keep Original"}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* QUALITY SLIDER — Highly Readable */}
                    <div className="mt-6">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-slate-800">
                          Quality Level
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-mono font-bold text-blue-600">
                            {globalQuality}%
                          </span>
                          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
                            {globalQuality >= 85
                              ? "High Fidelity"
                              : globalQuality >= 70
                              ? "Balanced"
                              : "Ultra Small"}
                          </span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="98"
                        value={globalQuality}
                        onChange={(e) => setGlobalQuality(Number(e.target.value))}
                        className="mt-3 w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <div className="mt-1.5 flex justify-between text-xs font-medium text-slate-500">
                        <span>Smallest File (10%)</span>
                        <span>80% (Default)</span>
                        <span>Near Lossless (98%)</span>
                      </div>
                    </div>

                    {/* QUICK PRESETS */}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">Presets:</span>
                      {PRESETS.map((p) => (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => {
                            setGlobalQuality(p.quality);
                            setGlobalFormat(p.format);
                          }}
                          className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white hover:text-blue-600 transition cursor-pointer"
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>

                    {/* DIMENSION LOCK NOTICE */}
                    <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-3.5 text-xs text-blue-900">
                      <div className="flex items-center gap-2 font-bold text-sm">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <span>Dimensions 100% Locked</span>
                      </div>
                      <p className="mt-1 text-xs text-blue-800/80 leading-relaxed font-normal">
                        Your image retains its exact resolution ({activeItem ? `${activeItem.width}×${activeItem.height}px` : "original resolution"}). Only redundant color data is optimized.
                      </p>
                    </div>

                    {/* STRIP METADATA TOGGLE */}
                    <div className="mt-5 flex items-center justify-between pt-4 border-t border-slate-100">
                      <div>
                        <div className="text-sm font-bold text-slate-800">
                          Strip EXIF &amp; Metadata
                        </div>
                        <div className="text-xs text-slate-500 font-normal">
                          Removes camera and GPS info to save extra KB and protect privacy.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStripMetadata(!stripMetadata)}
                        className={`h-6 w-11 rounded-full transition-colors cursor-pointer relative ${
                          stripMetadata ? "bg-blue-600" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
                            stripMetadata ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* APPLY TO ALL BUTTON — VIBRANT BLUE BUTTON */}
                    {items.length > 1 && (
                      <div className="mt-6 pt-4 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={handleApplyToAll}
                          disabled={isBatchCompressing}
                          className="w-full rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 px-5 text-sm shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/35 transition cursor-pointer"
                        >
                          Apply Settings to All ({items.length}) Images
                        </button>
                      </div>
                    )}
                  </div>

                  {/* CROSS-TOOL WORKFLOW BRIDGES */}
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200/80 bg-white/90 p-4 shadow-xs backdrop-blur-md">
                    <div className="text-xs text-slate-600 font-normal">
                      <span className="font-bold text-slate-900">Want to inspect this design?</span>{" "}
                      Check spelling or extract text without re-uploading.
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSendToSpellcheck}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100 cursor-pointer"
                      >
                        <span>Check for Typos</span>
                        <span>→</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSendToImageToText}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                      >
                        <span>Extract Text (OCR)</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* RIGHT SIDEBAR: BATCH QUEUE DIRECTLY ON THE RIGHT OF PREVIEW BOX (4 COLS) */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                  <div className="rounded-3xl border border-white/90 bg-white/90 p-5 sm:p-6 shadow-xl shadow-blue-500/5 backdrop-blur-xl">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                          Batch Queue
                        </h3>
                        <span className="text-xs text-slate-500 font-normal">
                          {items.length} file{items.length !== 1 ? "s" : ""} • Click any to preview
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700 hover:bg-white transition"
                      >
                        + Add
                      </button>
                    </div>

                    {/* Scrollable List of Files */}
                    <div className="mt-4 max-h-[580px] overflow-y-auto space-y-2.5 pr-1">
                      {items.map((it) => {
                        const isSelected = it.id === (activeItem?.id || "");
                        const savings =
                          it.originalSize > 0 && it.compressedSize > 0
                            ? Math.round(
                                ((it.originalSize - it.compressedSize) /
                                  it.originalSize) *
                                  100
                              )
                            : 0;

                        return (
                          <div
                            key={it.id}
                            onClick={() => setActiveId(it.id)}
                            className={`flex items-center justify-between gap-3 rounded-2xl p-3 transition border cursor-pointer ${
                              isSelected
                                ? "border-blue-500 bg-blue-50/80 shadow-2xs ring-1 ring-blue-500/20"
                                : "border-slate-200/80 bg-white hover:bg-slate-50/80"
                            }`}
                          >
                            {/* Thumbnail */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={it.compressedUrl || it.originalUrl}
                              alt={it.name}
                              className="h-12 w-12 rounded-xl object-cover shrink-0 border border-slate-200"
                            />

                            {/* Name & Stats */}
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-slate-900 truncate">
                                {it.name}
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 font-normal">
                                <span>{formatBytes(it.originalSize)}</span>
                                <span>→</span>
                                <span className="font-bold text-blue-700">
                                  {it.compressedSize > 0
                                    ? formatBytes(it.compressedSize)
                                    : "..."}
                                </span>
                              </div>
                            </div>

                            {/* Savings Badge & Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              {savings > 0 && (
                                <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700">
                                  -{savings}%
                                </span>
                              )}
                              <button
                                type="button"
                                title="Download"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadItem(it);
                                }}
                                className="p-1.5 text-slate-400 hover:text-blue-600 transition"
                              >
                                <svg
                                  width="15"
                                  height="15"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                >
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                  <polyline points="7 10 12 15 17 10" />
                                  <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                title="Remove"
                                onClick={(e) => handleRemoveItem(it.id, e)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                              >
                                <svg
                                  width="15"
                                  height="15"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Batch ZIP Download in Sidebar */}
                    {items.length > 1 && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <button
                          type="button"
                          disabled={isZipping || isBatchCompressing}
                          onClick={handleDownloadAllZip}
                          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-4 py-3 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition hover:shadow-lg hover:shadow-blue-600/35 disabled:opacity-50 cursor-pointer"
                        >
                          {isZipping ? (
                            <>
                              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              Creating ZIP...
                            </>
                          ) : (
                            <>
                              <span>Download All ({items.length}) as ZIP</span>
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                              >
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                              </svg>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* BENTO GRID: WHY USE SPELLENSE IMAGE COMPRESSOR */}
        <section className="mx-auto max-w-6xl px-5 pt-12 pb-16 border-t border-slate-200/80">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              High-Fidelity Visual Optimization Built for Creators
            </h2>
            <p className="mt-2.5 text-xs sm:text-sm text-slate-600 font-normal">
              Everything you love about Google Squoosh, tailored for design catalogs, marketing decks, and high-res print files.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-3xl border border-white/90 bg-white/80 p-6 shadow-sm">
              <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold mb-4">
                📐
              </div>
              <h3 className="font-bold text-slate-900 text-base">Locked Dimensions</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 font-normal">
                1200×1200 stays exactly 1200×1200. Only unneeded color bloat and invisible metadata are removed so your design layout remains crisp.
              </p>
            </div>

            <div className="rounded-3xl border border-white/90 bg-white/80 p-6 shadow-sm">
              <div className="h-10 w-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold mb-4">
                🔍
              </div>
              <h3 className="font-bold text-slate-900 text-base">Squoosh Split Screen</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 font-normal">
                Inspect before and after side-by-side with an interactive drag divider and up to 2× zoom to guarantee no text or line blur.
              </p>
            </div>

            <div className="rounded-3xl border border-white/90 bg-white/80 p-6 shadow-sm">
              <div className="h-10 w-10 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 font-bold mb-4">
                📚
              </div>
              <h3 className="font-bold text-slate-900 text-base">Multi-Page &amp; ZIP Export</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 font-normal">
                Drop entire product catalogs or 50 images at once. Compress them simultaneously and download a single tidy ZIP archive.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ SECTION — Exact Design from Image to Text Page */}
        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <div className="text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/70 bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-700 shadow-2xs">
              Frequently Asked Questions
            </div>
            <h2 className="mt-2.5 text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Image Compressor FAQ
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-500 font-normal">
              Everything you need to know about compressing images without losing quality.
            </p>
          </div>

          <div className="mt-10 space-y-3.5">
            {FAQ_ITEMS.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={faq.q}
                  className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-2xs backdrop-blur-sm transition"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="flex w-full items-center justify-between p-5 text-left transition hover:bg-slate-50/60 cursor-pointer"
                  >
                    <span className="text-sm sm:text-base font-bold text-slate-900">
                      {faq.q}
                    </span>
                    <span
                      className={`ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform duration-200 ${
                        isOpen ? "rotate-180 bg-blue-50 text-blue-600" : ""
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

                  {isOpen && (
                    <div className="border-t border-slate-100 px-5 pt-3 pb-5 text-xs sm:text-sm leading-relaxed text-slate-600 font-normal animate-in fade-in duration-150">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* FOOTER — Exact Design matching Image to Text page */}
      <footer className="border-t border-slate-200/70 bg-white px-5 py-8 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
            <div>
              <div className="text-lg font-bold">
                Spel<span className="text-blue-600">lense</span>
              </div>
              <p className="mt-1 text-xs text-gray-400 font-normal">
                Simple English spell checking and text tools.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs text-gray-400 font-normal">
              <Link href="/" className="transition hover:text-gray-700">
                Home
              </Link>
              <Link href="/about" className="transition hover:text-gray-700">
                About
              </Link>
              <Link href="/blog" className="transition hover:text-gray-700">
                Blog
              </Link>
              <Link href="/design-check" className="transition hover:text-gray-700">
                Design Check
              </Link>
              <Link href="/case-converter" className="transition hover:text-gray-700">
                Case Converter
              </Link>
              <Link href="/us-uk-converter" className="transition hover:text-gray-700">
                US ↔ UK Dialect
              </Link>
              <Link href="/image-to-text" className="transition hover:text-gray-700">
                Image to Text
              </Link>
              <Link href="/image-compressor" className="font-semibold text-blue-600">
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
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
