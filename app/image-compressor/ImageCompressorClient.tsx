"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
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
  origWidth: number;
  origHeight: number;
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
    a: "Never. 100% of the image compression takes place locally inside your browser using HTML5 Canvas and browser WebAssembly. Even faster than our spellchecker — your files never leave your device, and are never saved or trained on any server.",
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
  const [stripMetadata, setStripMetadata] = useState<boolean>(true);

  // Dimension Resizing State (Optional, 100% locked by default)
  const [enableResize, setEnableResize] = useState<boolean>(false);
  const [lockAspectRatio, setLockAspectRatio] = useState<boolean>(true);
  const [customWidth, setCustomWidth] = useState<number | "">("");
  const [customHeight, setCustomHeight] = useState<number | "">("");
  const [customScalePercent, setCustomScalePercent] = useState<number>(100);

  // Squoosh-Style Split Screen Slider State
  const [sliderPos, setSliderPos] = useState<number>(50); // 0 to 100 percent
  const [isDraggingHandle, setIsDraggingHandle] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1); // 1, 1.5, 2
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [isBatchQueueOpen, setIsBatchQueueOpen] = useState<boolean>(true);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const compareContainerRef = useRef<HTMLDivElement | null>(null);
  const imageWrapperRef = useRef<HTMLDivElement | null>(null);
  const filmstripRef = useRef<HTMLDivElement | null>(null);

  const scrollFilmstrip = useCallback((direction: "left" | "right") => {
    if (filmstripRef.current) {
      filmstripRef.current.scrollBy({
        left: direction === "left" ? -240 : 240,
        behavior: "smooth",
      });
    }
  }, []);

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
      overrideScale?: number,
      overrideTargetW?: number,
      overrideTargetH?: number
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

            // Dimension logic: custom target px or proportional scale
            const origW = item.origWidth || img.naturalWidth || img.width;
            const origH = item.origHeight || img.naturalHeight || img.height;
            const targetW = overrideTargetW
              ? Math.max(1, Math.round(overrideTargetW))
              : Math.max(1, Math.round(origW * scaleVal));
            const targetH = overrideTargetH
              ? Math.max(1, Math.round(overrideTargetH))
              : Math.max(1, Math.round(origH * scaleVal));

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
              origWidth: origW,
              origHeight: origH,
              quality: Math.round(qualityVal * 100),
              format: formatVal,
              scalePercent: origW > 0 ? Math.round((targetW / origW) * 100) : Math.round(scaleVal * 100),
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
                  origWidth: Math.round(viewport.width),
                  origHeight: Math.round(viewport.height),
                  format: globalFormat,
                  quality: globalQuality,
                  scalePercent: 100,
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
            origWidth: dims.w,
            origHeight: dims.h,
            format: globalFormat,
            quality: globalQuality,
            scalePercent: 100,
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
            compressSingleItem(item, globalQuality, globalFormat, 100)
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

      const targetW =
        enableResize && typeof customWidth === "number"
          ? customWidth
          : undefined;
      const targetH =
        enableResize && typeof customHeight === "number"
          ? customHeight
          : undefined;

      const updated = await compressSingleItem(
        activeItem,
        globalQuality,
        globalFormat,
        enableResize ? customScalePercent : 100,
        targetW,
        targetH
      );

      if (isMounted) {
        setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
      }
    }, 180); // Debounced 180ms

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [
    globalQuality,
    globalFormat,
    enableResize,
    customScalePercent,
    customWidth,
    customHeight,
    activeId,
    activeItem,
    compressSingleItem,
  ]);

  // Select active item and sync dimensions
  const handleSelectActiveItem = (id: string) => {
    setActiveId(id);
    const it = items.find((x) => x.id === id);
    if (it) {
      const origW = it.origWidth || it.width;
      const origH = it.origHeight || it.height;
      if (enableResize) {
        const scaledW = Math.max(1, Math.round((origW * customScalePercent) / 100));
        const scaledH = Math.max(1, Math.round((origH * customScalePercent) / 100));
        setCustomWidth(scaledW);
        setCustomHeight(scaledH);
      } else {
        setCustomWidth(origW);
        setCustomHeight(origH);
        setCustomScalePercent(100);
      }
    }
  };

  // Handle dimension resizing
  const triggerDimensionUpdate = useCallback(
    (targetW: number, targetH: number, scalePct: number) => {
      if (!activeItem) return;
      compressSingleItem(
        activeItem,
        globalQuality,
        globalFormat,
        scalePct,
        targetW,
        targetH
      ).then((updated) => {
        setItems((prev) =>
          prev.map((it) => (it.id === updated.id ? updated : it))
        );
      });
    },
    [activeItem, compressSingleItem, globalQuality, globalFormat]
  );

  const handleToggleResize = (enable: boolean) => {
    setEnableResize(enable);
    if (activeItem) {
      const origW = activeItem.origWidth || activeItem.width;
      const origH = activeItem.origHeight || activeItem.height;
      if (enable) {
        setCustomWidth(origW);
        setCustomHeight(origH);
        setCustomScalePercent(100);
      } else {
        setCustomWidth(origW);
        setCustomHeight(origH);
        setCustomScalePercent(100);
        triggerDimensionUpdate(origW, origH, 100);
      }
    }
  };

  const handlePercentChange = (pct: number) => {
    if (!activeItem) return;
    const origW = activeItem.origWidth || activeItem.width;
    const origH = activeItem.origHeight || activeItem.height;

    const newW = Math.max(1, Math.round((origW * pct) / 100));
    const newH = Math.max(1, Math.round((origH * pct) / 100));

    setCustomScalePercent(pct);
    setCustomWidth(newW);
    setCustomHeight(newH);
    triggerDimensionUpdate(newW, newH, pct);
  };

  const handleWidthChange = (valStr: string) => {
    if (!activeItem) return;
    const origW = activeItem.origWidth || activeItem.width;
    const origH = activeItem.origHeight || activeItem.height;

    if (valStr === "") {
      setCustomWidth("");
      return;
    }

    const newW = parseInt(valStr, 10);
    if (isNaN(newW) || newW <= 0) return;

    setCustomWidth(newW);

    let newH = typeof customHeight === "number" ? customHeight : origH;
    if (lockAspectRatio && origW > 0) {
      newH = Math.max(1, Math.round((newW * origH) / origW));
      setCustomHeight(newH);
    }
    const newPct = origW > 0 ? Math.round((newW / origW) * 100) : 100;
    setCustomScalePercent(newPct);

    triggerDimensionUpdate(newW, newH, newPct);
  };

  const handleHeightChange = (valStr: string) => {
    if (!activeItem) return;
    const origW = activeItem.origWidth || activeItem.width;
    const origH = activeItem.origHeight || activeItem.height;

    if (valStr === "") {
      setCustomHeight("");
      return;
    }

    const newH = parseInt(valStr, 10);
    if (isNaN(newH) || newH <= 0) return;

    setCustomHeight(newH);

    let newW = typeof customWidth === "number" ? customWidth : origW;
    if (lockAspectRatio && origH > 0) {
      newW = Math.max(1, Math.round((newH * origW) / origH));
      setCustomWidth(newW);
    }
    const newPct = origH > 0 ? Math.round((newH / origH) * 100) : 100;
    setCustomScalePercent(newPct);

    triggerDimensionUpdate(newW, newH, newPct);
  };

  const handleResetDimensions = () => {
    if (!activeItem) return;
    const origW = activeItem.origWidth || activeItem.width;
    const origH = activeItem.origHeight || activeItem.height;
    setCustomWidth(origW);
    setCustomHeight(origH);
    setCustomScalePercent(100);
    triggerDimensionUpdate(origW, origH, 100);
  };

  // Apply settings to all items in batch
  const handleApplyToAll = async () => {
    if (items.length === 0) return;
    setIsBatchCompressing(true);
    const updated = await Promise.all(
      items.map((it) => {
        const origW = it.origWidth || it.width;
        const origH = it.origHeight || it.height;
        const targetW = enableResize
          ? Math.max(1, Math.round((origW * customScalePercent) / 100))
          : origW;
        const targetH = enableResize
          ? Math.max(1, Math.round((origH * customScalePercent) / 100))
          : origH;

        return compressSingleItem(
          it,
          globalQuality,
          globalFormat,
          enableResize ? customScalePercent : 100,
          targetW,
          targetH
        );
      })
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
    const target = imageWrapperRef.current || compareContainerRef.current;
    if (!target) return;
    const rect = target.getBoundingClientRect();
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
            enableResize ? customScalePercent : 100
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
    <div style={{ backgroundColor: "#faf9f6" }} className="flex min-h-screen flex-col bg-[#faf9f6] font-sans text-[#1c201a] antialiased selection:bg-[#bcd5ff] selection:text-black relative z-10 text-[15px]">
      <Navbar />

      <main className="flex-1">
        {/* Responsive CSS guards ensuring desktop and mobile never leak into each other */}
        <style>{`
          @media (max-width: 639px) {
            .spellense-desktop-only {
              display: none !important;
            }
          }
          @media (min-width: 640px) {
            .spellense-mobile-only {
              display: none !important;
            }
          }
        `}</style>

        <section className="relative overflow-hidden">
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16 pt-3 sm:pt-6">
            {/* HERO TITLE — Matching Home Page Layout Style */}
            <div className="mx-auto max-w-5xl text-center pt-2 sm:pt-6 pb-2">
              {/* Eyebrow */}
              <div
                style={{
                  color: "#3158d5",
                  letterSpacing: "0.18em",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
                className="inline-flex items-center uppercase mb-3 sm:mb-4"
              >
                SMART IMAGE COMPRESSOR
              </div>

              {/* H1 Heading */}
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
                  Smaller images.
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
                  Without the blur.
                </span>
              </h1>

              {/* Subtitle */}
              <p
                style={{
                  color: "#70746d",
                  fontSize: "16px",
                  lineHeight: 1.55,
                  margin: "18px auto 0",
                }}
                className="text-center font-normal px-4 max-w-[540px] mx-auto"
              >
                Compress JPG, PNG, WebP, and multi-page PDFs with zero visual loss.
              </p>
            </div>

            {/* WORKSPACE & UPLOAD SECTION */}
            <div className="mt-2 sm:mt-4">
              {items.length === 0 ? (
                /* UPLOAD STAGE: SPLIT HERO CARD (EXACT MATCH TO HOME PAGE) */
                <div className="mx-auto mt-6 sm:mt-8 max-w-[980px]">
                  {uploadError && (
                    <div className="mx-auto mb-4 flex items-center justify-between rounded-2xl border border-rose-200/90 bg-rose-50/95 px-5 py-3.5 text-sm font-semibold text-rose-700 shadow-sm backdrop-blur-md">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                        </div>
                        <p>{uploadError}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUploadError(null)}
                        aria-label="Dismiss error message"
                        className="ml-3 rounded-lg p-1.5 text-rose-400 transition hover:bg-rose-100 hover:text-rose-700 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  )}

              <div
                style={{
                  borderColor: "#e5e5df",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  backgroundColor: "#ecebe4",
                  boxShadow: "none",
                }}
                className="relative w-full rounded-2xl sm:rounded-[24px] overflow-hidden transition-all duration-300"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
                  {/* LEFT COLUMN: UPLOAD BOX & CONTROLS */}
                  <div
                    style={{ borderRight: "1px solid #e5e5df" }}
                    className="lg:col-span-5 p-5 sm:p-7 flex flex-col justify-between bg-white"
                  >
                    <div>
                      {/* HEADER */}
                      <div
                        style={{ borderBottom: "1px solid #e5e5df" }}
                        className="flex items-center justify-between pb-3"
                      >
                        <span
                          style={{
                            backgroundColor: "#efeee7",
                            color: "#3158d5",
                            border: "1px solid #e5e5df",
                          }}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                            <circle cx="9" cy="9" r="2"/>
                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                          </svg>
                          <span>Images &amp; PDF</span>
                        </span>

                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8e928a]">
                          UP TO 90% SAVINGS
                        </span>
                      </div>

                      {/* DASHED DROPZONE */}
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          borderColor: isDragging ? "#3158d5" : "#deded6",
                          backgroundColor: isDragging ? "#eff6ff" : "#f6f5f3",
                        }}
                        className={`mt-4 rounded-2xl border-2 border-dashed p-5 sm:p-6 text-center transition-all cursor-pointer ${
                          isDragging
                            ? "border-[#3158d5] bg-blue-50/70"
                            : "hover:border-[#3158d5]/50"
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

                        <div
                          style={{ backgroundColor: "#ffffff", borderColor: "#e5e5df" }}
                          className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border shadow-2xs text-[#3158d5] transition-transform duration-200 group-hover:scale-105"
                        >
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                            <path d="M12 12v9" />
                            <path d="m16 16-4-4-4 4" />
                          </svg>
                        </div>

                        <h3 className="mt-3 text-sm sm:text-[15px] font-bold text-[#1c201a]">
                          Drop your images here
                        </h3>

                        <div className="mt-3.5">
                          <span
                            style={{ backgroundColor: "#3158d5", color: "#ffffff" }}
                            className="inline-flex items-center justify-center gap-2 rounded-lg px-7 py-2.5 text-sm font-bold shadow-xs transition hover:opacity-95 active:scale-[0.98] cursor-pointer min-w-[150px]"
                          >
                            <span>Choose file</span>
                            <span className="text-base font-bold">↗</span>
                          </span>
                        </div>

                        <p className="mt-2.5 text-[11px] text-[#767a74]">
                          JPG, PNG, WebP &amp; PDF · Up to 50+ files
                        </p>
                      </div>

                      <div className="mt-3.5 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLoadSample();
                          }}
                          disabled={loadingSample}
                          className="text-xs font-semibold text-[#3158d5] hover:underline inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <span>Try a sample image</span>
                          <span>→</span>
                        </button>
                      </div>

                      {isProcessingPdf && (
                        <div className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-[#3158d5]">
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#3158d5] border-t-transparent" />
                          {pdfProgressText}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT COLUMN: SAMPLE PREVIEW */}
                  <div
                    style={{ backgroundColor: "#ecebe4" }}
                    className="lg:col-span-7 p-3.5 sm:p-5 lg:p-7 flex flex-col justify-between"
                  >
                    <div>
                      {/* HEADER */}
                      <div
                        style={{ borderBottom: "1px solid #deded6" }}
                        className="flex items-center justify-between pb-3 sm:pb-3.5"
                      >
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
                            <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                            <circle cx="9" cy="9" r="2"/>
                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                          </svg>
                          <span>editorial-photo.jpg</span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8e928a]">
                          SAMPLE PREVIEW
                        </span>
                      </div>

                      {/* DESKTOP LAYOUT (>= 1024px) */}
                      <div className="hidden lg:flex mt-5 flex-row items-start gap-6">
                        {/* ARTWORK CARD */}
                        <div
                          onClick={handleLoadSample}
                          style={{ width: "240px", minWidth: "220px", maxWidth: "250px", flexShrink: 0 }}
                          className="rounded-xl overflow-hidden shadow-xs border border-[#deded6] bg-white cursor-pointer group/art transition hover:scale-[1.01]"
                          title="Click to test compression with this sample banner"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src="/compressor-sample-preview.webp"
                            alt="Sample High-Res Catalog Image"
                            className="w-full h-auto object-cover block"
                          />
                        </div>

                        {/* DETAILS & FEATURES LIST */}
                        <div className="flex-1 min-w-0 w-full flex flex-col justify-between self-stretch">
                          <div>
                            <div className="flex items-center gap-2 text-xs font-bold text-[#1c201a]">
                              <span style={{ backgroundColor: "#10b981" }} className="h-2 w-2 rounded-full inline-block" />
                              <span>Lossless Compression Preview</span>
                            </div>

                            {/* INTERACTIVE SAMPLE CARD 1 */}
                            <div
                              onClick={handleLoadSample}
                              style={{ border: "2px solid #365cd6", backgroundColor: "#ffffff" }}
                              className="mt-3 rounded-xl p-3.5 shadow-xs cursor-pointer hover:border-[#2546b8] transition"
                            >
                              <div className="text-[10px] font-bold uppercase tracking-wider text-[#3158d5]">
                                SPLIT COMPARISON
                              </div>
                              <div className="mt-1 flex items-center justify-between text-xs font-bold text-[#1c201a]">
                                <span>4.2 MB → 680 KB</span>
                                <span className="text-[#10b981] font-bold text-xs">-84%</span>
                              </div>
                              <p className="mt-1 text-[11px] text-[#767a74]">
                                Zero visual quality loss
                              </p>
                            </div>

                            {/* SAMPLE CARD 2 */}
                            <div
                              style={{ border: "1px solid #deded6", backgroundColor: "#ffffff" }}
                              className="mt-2.5 rounded-xl p-3.5 shadow-2xs"
                            >
                              <div className="text-[10px] font-bold uppercase tracking-wider text-[#8e928a]">
                                PIXEL FIDELITY
                              </div>
                              <div className="mt-1 flex items-center justify-between text-xs font-bold text-[#1c201a]">
                                <span>100% Original Sharpness</span>
                                <span className="text-slate-400 font-normal text-[11px]">Lossless WebP</span>
                              </div>
                            </div>
                          </div>

                          <p className="mt-4 text-[11px] leading-relaxed text-[#767a74] text-center">
                            Click image to test live split comparison slider
                          </p>
                        </div>
                      </div>

                      {/* MOBILE & TABLET LAYOUT (< 1024px) */}
                      <div className="block lg:hidden mt-3.5 sm:mt-5">
                        <div className="flex flex-row items-start gap-3 sm:gap-4">
                          {/* ARTWORK CARD */}
                          <div
                            onClick={handleLoadSample}
                            style={{ width: "38%", minWidth: "120px", maxWidth: "165px", flexShrink: 0 }}
                            className="rounded-xl overflow-hidden shadow-xs border border-[#deded6] bg-white cursor-pointer group/art transition hover:scale-[1.01]"
                            title="Click to test compression with this sample banner"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src="/compressor-sample-preview.webp"
                              alt="Sample High-Res Catalog Image"
                              className="w-full h-auto object-cover block"
                            />
                          </div>

                          {/* DETAILS LIST */}
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold text-[#1c201a]">
                                <span style={{ backgroundColor: "#10b981" }} className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full inline-block" />
                                <span>Lossless Compression</span>
                              </div>

                              <div
                                onClick={handleLoadSample}
                                style={{ border: "2px solid #3158d5", backgroundColor: "#ffffff" }}
                                className="mt-2 sm:mt-3 rounded-xl p-2.5 sm:p-3.5 shadow-xs cursor-pointer"
                              >
                                <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#3158d5]">
                                  SPLIT PREVIEW
                                </div>
                                <div className="mt-0.5 sm:mt-1 flex items-center justify-between text-[11px] sm:text-xs font-bold text-[#1c201a]">
                                  <span>4.2 MB → 680 KB</span>
                                  <span className="text-[#10b981] font-bold text-[11px]">-84%</span>
                                </div>
                              </div>

                              <div
                                style={{ border: "1px solid #deded6", backgroundColor: "#ffffff" }}
                                className="mt-2 sm:mt-2.5 rounded-xl p-2.5 sm:p-3.5 shadow-2xs"
                              >
                                <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#8e928a]">
                                  FIDELITY
                                </div>
                                <div className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs font-bold text-[#1c201a]">
                                  100% Original Sharpness
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <p className="mt-3 sm:mt-4 text-[10.5px] sm:text-[11px] leading-relaxed text-[#767a74] text-center">
                          Click image to test live split comparison slider
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3 TRUST PILLARS (HOMEPAGE MATCH) */}
              <ScrollReveal delay={100}>
                <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-xs sm:text-[13px] font-medium text-[#575a53] mx-auto text-center w-full">
                  <div className="flex items-center gap-2">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Free. No signup.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600">
                      <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z"/>
                    </svg>
                    <span>Private, in-memory compression</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <span>Zero server uploads • Offline engine</span>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          ) : (
            /* EDITOR WORKSPACE */
            <div className="space-y-6">
              {/* TOP ACTION & BATCH STATS BAR */}
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

              {/* Desktop Bar (>= 640px): EXACT PREVIOUS WORKING CODE (100% UNTOUCHED) */}
              <div style={{ backgroundColor: "#ffffff", borderColor: "#e5e5df" }} className="spellense-desktop-only flex flex-wrap items-center justify-between gap-4 rounded-2xl sm:rounded-3xl border p-4 sm:p-5 shadow-xs">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ borderColor: "#e5e5df", backgroundColor: "#ffffff" }}
                    className="inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold text-[#1c201a] shadow-2xs transition hover:bg-[#efeee7] cursor-pointer"
                  >
                    <span>+ Add More Files</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 transition cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>

                {/* Overall Batch Savings Badge */}
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div style={{ backgroundColor: "#edf7ed", borderColor: "#c8e6c9", color: "#1b5e20" }} className="flex items-center gap-2 rounded-2xl px-3.5 py-1.5 font-bold border">
                    <span>Total Saved: {totalStats.saved}%</span>
                    <span className="font-normal text-emerald-800">
                      ({formatBytes(totalStats.orig)} → {formatBytes(totalStats.comp)})
                    </span>
                  </div>

                  {items.length > 1 && (
                    <button
                      type="button"
                      disabled={isZipping || isBatchCompressing}
                      onClick={handleDownloadAllZip}
                      style={{ backgroundColor: "#3158d5" }}
                      className="inline-flex items-center gap-2 rounded-2xl px-5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#2546b8] disabled:opacity-50 cursor-pointer"
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

              {/* Mobile Bar (< 640px): + Add More on Left, Clear All on Right (No Saved % badge) */}
              <div style={{ backgroundColor: "#ffffff", borderColor: "#e5e5df" }} className="spellense-mobile-only flex items-center justify-between gap-2 rounded-2xl border px-3.5 py-2.5 shadow-xs">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ borderColor: "#e5e5df", backgroundColor: "#ffffff" }}
                  className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold text-[#1c201a] shadow-2xs active:bg-[#efeee7] cursor-pointer whitespace-nowrap"
                >
                  <span>+ Add More</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs font-semibold text-rose-600 active:text-rose-700 transition cursor-pointer whitespace-nowrap px-1 py-1"
                >
                  Clear All
                </button>
              </div>

              {/* MAIN LAYOUT: PREVIEW ON LEFT (7-8 COLS), COMPRESSION SETTINGS ON RIGHT (4-5 COLS) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT: PREVIEW BOX WITH INTERNAL MULTI-IMAGE THUMBNAIL REEL */}
                <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
                  {/* SQUOOSH-STYLE INTERACTIVE BEFORE/AFTER SLIDER STUDIO FRAME */}
                  <div
                    style={{ backgroundColor: "#ffffff", borderColor: "#e5e5df" }}
                    className="w-full overflow-hidden rounded-2xl sm:rounded-3xl border shadow-xs flex flex-col"
                  >
                    {/* 1. STUDIO PREVIEW HEADER (HOMEPAGE MATCH) */}
                    <div
                      style={{ borderBottom: "1px solid #e5e5df", backgroundColor: "#faf9f6" }}
                      className="flex items-center justify-between border-b px-4 py-3.5 sm:px-6"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span style={{ backgroundColor: "#3158d5" }} className="flex h-2.5 w-2.5 rounded-full shrink-0 animate-pulse" />
                        <div className="min-w-0">
                          <p style={{ color: "#1c201a" }} className="text-sm font-bold truncate">
                            Image Quality Inspector
                          </p>
                          <p style={{ color: "#70746d" }} className="text-[11px] truncate">
                            Interactive Squoosh-Style Split Comparison
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          style={{ borderColor: "#e5e5df", backgroundColor: "#efeee7" }}
                          className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold text-slate-600"
                        >
                          <svg className="h-3 w-3 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/>
                            <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/>
                            <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/>
                            <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
                          </svg>
                          Drag line to compare
                        </span>
                        {activeItem && activeItem.originalSize > 0 && activeItem.compressedSize > 0 ? (
                          <span
                            style={{ backgroundColor: "#ecfdf5", borderColor: "#a7f3d0", color: "#059669" }}
                            className="rounded-lg border px-2.5 py-1 text-[11px] font-bold"
                          >
                            -
                            {Math.round(
                              ((activeItem.originalSize - activeItem.compressedSize) /
                                activeItem.originalSize) *
                                100
                            )}
                            % SAVED
                          </span>
                        ) : (
                          <span
                            style={{ backgroundColor: "#eff6ff", borderColor: "#bfdbfe", color: "#2563eb" }}
                            className="rounded-lg border px-2.5 py-1 text-[11px] font-bold"
                          >
                            READY
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 2. SUB-BAR: REAL-TIME BEFORE & AFTER STATS + ZOOM DOCK */}
                    {/* Desktop Sub-Bar (sm and up): EXACT PREVIOUS WORKING CODE (100% UNTOUCHED) */}
                    <div
                      style={{ borderBottom: "1px solid #e5e5df", backgroundColor: "#fdfdfb" }}
                      className="spellense-desktop-only flex flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6 text-xs"
                    >
                      {/* Left: Original File Stats */}
                      <div className="flex flex-wrap items-center gap-2">
                        <div
                          style={{ borderColor: "#e5e5df", backgroundColor: "#ffffff" }}
                          className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold text-[#1c201a] shadow-2xs"
                        >
                          <span className="text-slate-400 font-semibold uppercase text-[10px]">Orig:</span>
                          <span>{activeItem ? formatBytes(activeItem.originalSize) : "0 KB"}</span>
                          {activeItem?.width && activeItem?.height && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-[#70746d] font-normal">{activeItem.width}×{activeItem.height}px</span>
                            </>
                          )}
                        </div>

                        <span className="text-slate-400 font-bold">→</span>

                        {/* Right: Compressed File Stats */}
                        <div
                          style={{ borderColor: "#bfdbfe", backgroundColor: "#eff6ff" }}
                          className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold text-[#3158d5] shadow-2xs"
                        >
                          <span className="uppercase text-[10px]">{activeItem?.format || "WebP"}:</span>
                          <span>{activeItem && activeItem.compressedSize > 0 ? formatBytes(activeItem.compressedSize) : "..."}</span>
                        </div>
                      </div>

                      {/* Right: Zoom Level Dock */}
                      <div
                        style={{ backgroundColor: "#f6f5f3", borderColor: "#e5e5df" }}
                        className="inline-flex items-center gap-1 rounded-xl p-1 border shadow-xs"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setZoomLevel(1);
                            setPanOffset({ x: 0, y: 0 });
                          }}
                          style={{
                            backgroundColor: zoomLevel === 1 ? "#3158d5" : "transparent",
                            color: zoomLevel === 1 ? "#ffffff" : "#575a53",
                          }}
                          className="px-3 py-1 text-xs font-bold rounded-lg transition hover:text-[#1c201a] cursor-pointer"
                        >
                          Fit
                        </button>
                        <button
                          type="button"
                          onClick={() => setZoomLevel(1.5)}
                          style={{
                            backgroundColor: zoomLevel === 1.5 ? "#3158d5" : "transparent",
                            color: zoomLevel === 1.5 ? "#ffffff" : "#575a53",
                          }}
                          className="px-3 py-1 text-xs font-bold rounded-lg transition hover:text-[#1c201a] cursor-pointer"
                        >
                          1.5×
                        </button>
                        <button
                          type="button"
                          onClick={() => setZoomLevel(2)}
                          style={{
                            backgroundColor: zoomLevel === 2 ? "#3158d5" : "transparent",
                            color: zoomLevel === 2 ? "#ffffff" : "#575a53",
                          }}
                          className="px-3 py-1 text-xs font-bold rounded-lg transition hover:text-[#1c201a] cursor-pointer"
                        >
                          2×
                        </button>
                      </div>
                    </div>

                    {/* Mobile Sub-Bar (< sm): All in one line */}
                    <div
                      style={{ borderBottom: "1px solid #e5e5df", backgroundColor: "#fdfdfb" }}
                      className="spellense-mobile-only flex items-center justify-between gap-1.5 px-3 py-2 text-xs overflow-x-auto"
                    >
                      <div className="flex items-center gap-1 shrink-0">
                        <div
                          style={{ borderColor: "#e5e5df", backgroundColor: "#ffffff" }}
                          className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold text-[#1c201a] shadow-2xs whitespace-nowrap"
                        >
                          <span className="text-slate-400 font-semibold uppercase text-[9px]">Orig:</span>
                          <span>{activeItem ? formatBytes(activeItem.originalSize) : "0 KB"}</span>
                        </div>

                        <span className="text-slate-400 font-bold text-[10px]">→</span>

                        <div
                          style={{ borderColor: "#bfdbfe", backgroundColor: "#eff6ff" }}
                          className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold text-[#3158d5] shadow-2xs whitespace-nowrap"
                        >
                          <span className="uppercase text-[9px]">{activeItem?.format || "WebP"}:</span>
                          <span>{activeItem && activeItem.compressedSize > 0 ? formatBytes(activeItem.compressedSize) : "..."}</span>
                        </div>
                      </div>

                      <div
                        style={{ backgroundColor: "#f6f5f3", borderColor: "#e5e5df" }}
                        className="inline-flex items-center gap-0.5 rounded-xl p-0.5 border shadow-xs shrink-0"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setZoomLevel(1);
                            setPanOffset({ x: 0, y: 0 });
                          }}
                          style={{
                            backgroundColor: zoomLevel === 1 ? "#3158d5" : "transparent",
                            color: zoomLevel === 1 ? "#ffffff" : "#575a53",
                          }}
                          className="px-2 py-0.5 text-[10px] font-bold rounded-lg transition hover:text-[#1c201a] cursor-pointer whitespace-nowrap"
                        >
                          Fit
                        </button>
                        <button
                          type="button"
                          onClick={() => setZoomLevel(1.5)}
                          style={{
                            backgroundColor: zoomLevel === 1.5 ? "#3158d5" : "transparent",
                            color: zoomLevel === 1.5 ? "#ffffff" : "#575a53",
                          }}
                          className="px-2 py-0.5 text-[10px] font-bold rounded-lg transition hover:text-[#1c201a] cursor-pointer whitespace-nowrap"
                        >
                          1.5×
                        </button>
                        <button
                          type="button"
                          onClick={() => setZoomLevel(2)}
                          style={{
                            backgroundColor: zoomLevel === 2 ? "#3158d5" : "transparent",
                            color: zoomLevel === 2 ? "#ffffff" : "#575a53",
                          }}
                          className="px-2 py-0.5 text-[10px] font-bold rounded-lg transition hover:text-[#1c201a] cursor-pointer whitespace-nowrap"
                        >
                          2×
                        </button>
                      </div>
                    </div>

                    {/* 3. SQUOOSH SPLIT SLIDER CANVAS VIEWPORT */}
                    <div
                      ref={compareContainerRef}
                      className="relative min-h-[460px] sm:min-h-[520px] flex items-center justify-center overflow-hidden cursor-ew-resize select-none"
                      style={{
                        backgroundColor: "#efeee7",
                        backgroundImage:
                          "repeating-conic-gradient(#e5e5df 0% 25%, #efeee7 0% 50%)",
                        backgroundSize: "20px 20px",
                      }}
                      onMouseDown={(e) => {
                        if (zoomLevel > 1 && (e.ctrlKey || e.metaKey || e.altKey)) {
                          setIsPanning(true);
                          panStartRef.current = {
                            x: e.clientX - panOffset.x,
                            y: e.clientY - panOffset.y,
                          };
                        } else {
                          handleSliderMove(e.clientX);
                          setIsDraggingHandle(true);
                        }
                      }}
                    >
                      {/* The Interactive Image & Split Line */}
                      {activeItem ? (
                        <div
                          ref={imageWrapperRef}
                          className="relative inline-block max-w-full transition-transform duration-75 select-none"
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
                            className="max-h-[460px] sm:max-h-[500px] w-auto max-w-full object-contain pointer-events-none block rounded-sm shadow-md"
                          />

                          {/* 2. Original Image (Clipped overlay) */}
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
                              className="h-full w-full object-contain pointer-events-none block rounded-sm"
                            />
                          </div>

                          {/* 3. High-Contrast Draggable Divider Handle Line */}
                          <div
                            className="absolute top-0 bottom-0 z-20 cursor-ew-resize pointer-events-auto select-none"
                            style={{
                              left: `${sliderPos}%`,
                              transform: "translateX(-50%)",
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              handleMouseDownSlider();
                            }}
                            onTouchStart={(e) => {
                              e.stopPropagation();
                              setIsDraggingHandle(true);
                            }}
                          >
                            {/* THE SEPARATION LINE: 3px Crisp Pure White Line with Deep Double Shadow */}
                            <div
                              style={{
                                width: "3px",
                                backgroundColor: "#ffffff",
                                boxShadow:
                                  "0 0 8px rgba(0,0,0,0.75), 0 0 2px rgba(0,0,0,0.95), inset 0 0 1px rgba(0,0,0,0.5)",
                              }}
                              className="h-full mx-auto"
                            />

                            {/* CIRCULAR DRAG HANDLE WITH AUTHENTIC LEFT & RIGHT ARROWS */}
                            <div
                              style={{
                                backgroundColor: "#3158d5",
                                borderColor: "#ffffff",
                                boxShadow:
                                  "0 4px 14px rgba(0,0,0,0.4), 0 0 0 1.5px rgba(49,88,213,0.35)",
                              }}
                              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full text-white border-2 transition-transform hover:scale-110 active:scale-95 cursor-ew-resize"
                            >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="8 17 3 12 8 7" />
                                <polyline points="16 7 21 12 16 17" />
                                <line x1="12" y1="5" x2="12" y2="19" strokeWidth="1.5" stroke="rgba(255,255,255,0.7)" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[#70746d] text-sm font-semibold">No image selected</div>
                      )}
                    </div>

                    {/* 4. MULTI-IMAGE FILMSTRIP REEL (Clean Horizontal Carousel at bottom of Studio Frame) */}
                    {items.length > 1 && (
                      isBatchQueueOpen ? (
                        <div
                          style={{ borderTop: "1px solid #e5e5df", backgroundColor: "#fdfdfb" }}
                          className="p-3 sm:p-3.5"
                        >
                          <div className="flex items-center justify-between gap-2 pb-2.5 px-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-[#1c201a]">
                                Batch Queue
                              </span>
                              <span
                                style={{ backgroundColor: "#edf7ed", color: "#1b5e20", borderColor: "#c8e6c9" }}
                                className="rounded-full border px-2 py-0.5 text-[10px] font-bold"
                              >
                                {items.length} Images
                              </span>
                              <span className="hidden sm:inline text-[11px] text-[#70746d]">
                                • Select to preview & fine-tune
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => scrollFilmstrip("left")}
                                style={{ borderColor: "#e5e5df", backgroundColor: "#ffffff" }}
                                className="h-7 w-7 rounded-lg border flex items-center justify-center text-[#575a53] hover:text-[#1c201a] hover:bg-[#efeee7] transition cursor-pointer shadow-2xs text-xs font-bold"
                                title="Previous images"
                              >
                                ‹
                              </button>
                              <button
                                type="button"
                                onClick={() => scrollFilmstrip("right")}
                                style={{ borderColor: "#e5e5df", backgroundColor: "#ffffff" }}
                                className="h-7 w-7 rounded-lg border flex items-center justify-center text-[#575a53] hover:text-[#1c201a] hover:bg-[#efeee7] transition cursor-pointer shadow-2xs text-xs font-bold"
                                title="Next images"
                              >
                                ›
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsBatchQueueOpen(false)}
                                style={{ borderColor: "#e5e5df", backgroundColor: "#ffffff" }}
                                className="h-7 w-7 rounded-lg border flex items-center justify-center text-[#575a53] hover:text-rose-600 hover:bg-[#fee2e2] transition cursor-pointer shadow-2xs text-sm font-bold ml-0.5"
                                title="Close Batch Queue"
                                aria-label="Close Batch Queue"
                              >
                                ×
                              </button>
                            </div>
                          </div>

                          {/* Horizontal Scrollable Thumbnails Track */}
                          <div
                            ref={filmstripRef}
                            className="flex items-center gap-2.5 overflow-x-auto py-1 scroll-smooth"
                            style={{ scrollbarWidth: "thin" }}
                          >
                            {items.map((it, idx) => {
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
                                  className="relative shrink-0 pt-1 pr-1"
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      handleSelectActiveItem(it.id);
                                      e.currentTarget.scrollIntoView({
                                        behavior: "smooth",
                                        block: "nearest",
                                        inline: "center",
                                      });
                                    }}
                                    title={`${it.name} • ${formatBytes(it.originalSize)} → ${
                                      it.compressedSize > 0
                                        ? formatBytes(it.compressedSize)
                                        : "..."
                                    }`}
                                    style={{
                                      borderColor: isSelected ? "#3158d5" : "#e5e5df",
                                      backgroundColor: isSelected ? "#e8effe" : "#ffffff",
                                    }}
                                    className={`relative flex flex-col items-center rounded-2xl p-1 transition-all cursor-pointer ${
                                      isSelected
                                        ? "ring-2 ring-[#3158d5] shadow-xs scale-[1.02]"
                                        : "border hover:border-slate-400 hover:shadow-2xs opacity-85 hover:opacity-100"
                                    }`}
                                  >
                                    <div
                                      style={{ borderColor: "#deded6", backgroundColor: "#efeee7" }}
                                      className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-xl overflow-hidden border"
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={it.compressedUrl || it.originalUrl}
                                        alt={it.name}
                                        className="h-full w-full object-cover"
                                      />
                                      {/* Image Index Pill (Bottom-Left) */}
                                      <span className="absolute bottom-1 left-1 rounded bg-black/75 px-1 py-0.2 text-[8px] font-mono font-bold text-white leading-none">
                                        #{idx + 1}
                                      </span>
                                      {/* Savings Pill (Bottom-Right) */}
                                      {savings > 0 && (
                                        <span className="absolute bottom-1 right-1 rounded-full bg-emerald-600 px-1.5 py-0.2 text-[8px] font-bold text-white leading-none shadow-xs">
                                          -{savings}%
                                        </span>
                                      )}
                                    </div>
                                  </button>

                                  {/* Delete / Close Button (Always visible on top-right corner of each image) */}
                                  <button
                                    type="button"
                                    title={`Remove ${it.name}`}
                                    aria-label={`Remove ${it.name}`}
                                    onClick={(e) => handleRemoveItem(it.id, e)}
                                    onTouchEnd={(e) => e.stopPropagation()}
                                    style={{
                                      backgroundColor: "#ef4444",
                                      borderColor: "#ffffff",
                                    }}
                                    className="absolute top-0 right-0 h-5 w-5 rounded-full border-2 text-white shadow-md flex items-center justify-center hover:bg-rose-700 active:scale-90 transition cursor-pointer z-20"
                                  >
                                    <svg
                                      width="9"
                                      height="9"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="3.2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <line x1="18" y1="6" x2="6" y2="18" />
                                      <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                  </button>
                                </div>
                              );
                            })}

                            {/* Quick "+ Add More" Button Card */}
                            <div className="shrink-0 pt-1 pr-1">
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                style={{ borderColor: "#deded6", backgroundColor: "#ffffff" }}
                                className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-0.5 text-[#70746d] hover:border-[#3158d5] hover:text-[#3158d5] hover:bg-[#eff6ff] transition cursor-pointer shadow-2xs group"
                                title="Add more files"
                              >
                                <span className="text-base font-bold leading-none group-hover:scale-110 transition-transform">+</span>
                                <span className="text-[9px] font-bold">Add</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{ borderTop: "1px solid #e5e5df", backgroundColor: "#fdfdfb" }}
                          className="px-3.5 py-2 flex items-center justify-between"
                        >
                          <button
                            type="button"
                            onClick={() => setIsBatchQueueOpen(true)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#3158d5] hover:text-[#2546b8] transition cursor-pointer"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                              <circle cx="8.5" cy="8.5" r="1.5"/>
                              <polyline points="21 15 16 10 5 21"/>
                            </svg>
                            <span>Show Batch Queue ({items.length} images)</span>
                          </button>
                          <span className="text-[11px] text-[#70746d] font-medium">
                            Viewing #{items.findIndex((it) => it.id === activeItem?.id) + 1} of {items.length}
                          </span>
                        </div>
                      )
                    )}
                  </div>

                  {/* CROSS-TOOL WORKFLOW BRIDGES (DESKTOP: Under preview canvas) */}
                  <div
                    style={{ backgroundColor: "#ffffff", borderColor: "#e5e5df" }}
                    className="spellense-desktop-only flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3.5 shadow-xs"
                  >
                    <div className="text-xs text-[#575a53] font-normal">
                      <span className="font-bold text-[#1c201a]">Compressed your image?</span>{" "}
                      Check the text inside it for typos too →
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSendToSpellcheck}
                        style={{ backgroundColor: "#3158d5", color: "#ffffff" }}
                        className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition hover:bg-[#2546b8] cursor-pointer shadow-xs"
                      >
                        <span>Run Spellcheck</span>
                        <span>→</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSendToImageToText}
                        style={{ backgroundColor: "#faf9f6", borderColor: "#e5e5df", color: "#1c201a" }}
                        className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition hover:bg-[#efeee7] cursor-pointer"
                      >
                        <span>Extract Text (OCR)</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* RIGHT: COMPRESSION SETTINGS CARD DIRECTLY ON RIGHT OF PREVIEW BOX */}
                <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4">
                  <div
                    style={{ backgroundColor: "#ffffff", borderColor: "#e5e5df" }}
                    className="rounded-2xl sm:rounded-3xl border p-5 sm:p-6 shadow-xs"
                  >
                    <div style={{ borderBottom: "1px solid #e5e5df" }} className="flex items-center justify-between pb-3">
                      <div>
                        <h3 className="text-base font-bold text-[#1c201a]">
                          Compression Settings
                        </h3>
                        <p className="text-xs text-[#70746d] mt-0.5 font-normal">
                          Fine-tune quality, format, and size for optimal clarity.
                        </p>
                      </div>
                      {isBatchCompressing && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#3158d5]">
                          <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-[#3158d5] border-t-transparent" />
                          Optimizing...
                        </span>
                      )}
                    </div>

                    {/* ACTIVE IMAGE INFO & DOWNLOAD (Desktop only; on mobile, frozen bottom download bar is used) */}
                    {activeItem && (
                      <div
                        style={{ backgroundColor: "#faf9f6", borderColor: "#e5e5df" }}
                        className="spellense-desktop-only mt-4 rounded-2xl border p-3.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[#1c201a] truncate">
                              {activeItem.name}
                            </div>
                            <div className="text-[11px] text-[#70746d] flex items-center gap-1.5 mt-0.5 font-normal">
                              <span>{formatBytes(activeItem.originalSize)}</span>
                              <span>→</span>
                              <span className="font-bold text-[#3158d5]">
                                {activeItem.compressedSize > 0
                                  ? formatBytes(activeItem.compressedSize)
                                  : "..."}
                              </span>
                              {activeItem.originalSize > 0 &&
                                activeItem.compressedSize > 0 && (
                                  <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
                                    -
                                    {Math.round(
                                      ((activeItem.originalSize -
                                        activeItem.compressedSize) /
                                        activeItem.originalSize) *
                                        100
                                    )}
                                    %
                                  </span>
                                )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDownloadItem(activeItem)}
                            style={{ backgroundColor: "#3158d5" }}
                            className="inline-flex items-center gap-1.5 rounded-xl text-white px-3.5 py-2 text-xs font-bold shadow-xs transition hover:bg-[#2546b8] active:scale-95 cursor-pointer shrink-0"
                          >
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                            >
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            <span>Download</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* FORMAT SELECTION */}
                    <div className="mt-5">
                      <label className="text-sm font-bold text-[#1c201a] block">
                        Output Format
                      </label>

                      {/* Mobile Only (< sm): Output Format Dropdown Menu */}
                      <div className="spellense-mobile-only mt-2">
                        <div className="relative">
                          <select
                            value={globalFormat}
                            onChange={(e) => setGlobalFormat(e.target.value as OutputFormat)}
                            style={{
                              backgroundColor: "#f8fafd",
                              borderColor: "#3158d5",
                              borderWidth: "1.5px",
                              borderStyle: "solid",
                              color: "#1c201a",
                            }}
                            className="w-full appearance-none rounded-xl px-3.5 py-2.5 pr-10 text-xs font-bold shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#3158d5]/20 cursor-pointer"
                          >
                            {FORMAT_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label} — {opt.value === "webp" ? "Best for Web" : opt.value === "jpeg" ? "Photos & Print" : opt.value === "png" ? "Transparency" : opt.value === "avif" ? "Next-gen" : "Keep Original"}
                              </option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#3158d5]">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Desktop Only (sm and up): EXACT PREVIOUS 2-Column Grid Cards */}
                      <div className="spellense-desktop-only grid grid-cols-2 gap-2.5 mt-2.5">
                        {FORMAT_OPTIONS.map((opt) => {
                          const isSelected = globalFormat === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setGlobalFormat(opt.value);
                              }}
                              style={{
                                backgroundColor: isSelected ? "#e8effe" : "#ffffff",
                                borderColor: isSelected ? "#3158d5" : "#e5e5df",
                                borderWidth: "1px",
                                borderStyle: "solid",
                              }}
                              className={`rounded-2xl p-2.5 sm:p-3 text-left transition-all cursor-pointer relative ${
                                isSelected
                                  ? "shadow-xs"
                                  : "hover:bg-[#f6f5f3] hover:border-[#deded6]"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <div
                                  style={{ color: isSelected ? "#3158d5" : "#1c201a" }}
                                  className="text-sm font-bold truncate"
                                >
                                  {opt.label.split(" ")[0]}
                                </div>
                                {isSelected && (
                                  <span
                                    style={{ backgroundColor: "#3158d5", color: "#ffffff" }}
                                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                                  >
                                    ✓
                                  </span>
                                )}
                              </div>
                              <div
                                style={{ color: isSelected ? "#3158d5" : "#70746d" }}
                                className="text-[11px] mt-0.5 truncate font-medium"
                              >
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
                          );
                        })}
                      </div>
                    </div>

                    {/* QUALITY SLIDER */}
                    <div className="mt-5">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-[#1c201a]">
                          Quality Level
                        </label>
                        <div className="flex items-center gap-1.5">
                          <span className="text-base font-mono font-bold text-[#3158d5]">
                            {globalQuality}%
                          </span>
                          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-[#3158d5]">
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
                        className="mt-3 w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#3158d5]"
                      />
                      <div className="mt-1.5 flex justify-between text-[11px] font-medium text-[#70746d]">
                        <span>Smallest (10%)</span>
                        <span>80% (Default)</span>
                        <span>Lossless (98%)</span>
                      </div>
                    </div>

                    {/* PRESETS (DESKTOP: BUTTONS) */}
                    <div className="spellense-desktop-only mt-3.5 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-[#70746d]">Presets:</span>
                      {PRESETS.map((p) => {
                        const isSelected = globalQuality === p.quality && globalFormat === p.format;
                        return (
                          <button
                            key={p.name}
                            type="button"
                            onClick={() => {
                              setGlobalQuality(p.quality);
                              setGlobalFormat(p.format);
                            }}
                            style={{
                              backgroundColor: isSelected ? "#e8effe" : "#ffffff",
                              borderColor: isSelected ? "#3158d5" : "#e5e5df",
                              borderWidth: "1px",
                              borderStyle: "solid",
                              color: isSelected ? "#3158d5" : "#575a53",
                            }}
                            className="rounded-xl px-2.5 py-1 text-xs font-semibold transition cursor-pointer hover:border-[#3158d5] hover:text-[#3158d5]"
                          >
                            {p.name}
                          </button>
                        );
                      })}
                    </div>

                    {/* PRESETS (MOBILE ONLY: DROPDOWN MENU) */}
                    <div className="spellense-mobile-only mt-3.5">
                      <label className="text-xs font-bold text-[#70746d] block mb-1.5">
                        Presets
                      </label>
                      <div className="relative">
                        <select
                          value={
                            PRESETS.find((p) => p.quality === globalQuality && p.format === globalFormat)?.name || "custom"
                          }
                          onChange={(e) => {
                            const found = PRESETS.find((p) => p.name === e.target.value);
                            if (found) {
                              setGlobalQuality(found.quality);
                              setGlobalFormat(found.format);
                            }
                          }}
                          style={{
                            backgroundColor: "#f8fafd",
                            borderColor: "#3158d5",
                            borderWidth: "1.5px",
                            borderStyle: "solid",
                            color: "#1c201a",
                          }}
                          className="w-full appearance-none rounded-xl px-3.5 py-2.5 pr-10 text-xs font-bold shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#3158d5]/20 cursor-pointer"
                        >
                          <option value="custom" disabled hidden>
                            Custom Quality ({globalQuality}%)
                          </option>
                          {PRESETS.map((p) => (
                            <option key={p.name} value={p.name}>
                              {p.name} ({p.quality}%)
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#3158d5]">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* DIMENSION & RESIZE CONTROLS (With % Presets and Width x Height Lock) */}
                    <div
                      style={{
                        borderColor: enableResize ? "#bfdbfe" : "#e5e5df",
                        backgroundColor: enableResize ? "#f8fafd" : "#faf9f6",
                        borderWidth: "1px",
                        borderStyle: "solid",
                      }}
                      className="mt-4 rounded-2xl p-3.5 shadow-2xs transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            style={{
                              backgroundColor: enableResize ? "#3158d5" : "#e8effe",
                              color: enableResize ? "#ffffff" : "#3158d5",
                              border: "1px solid",
                              borderColor: enableResize ? "#3158d5" : "#bfdbfe",
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-xl shrink-0 shadow-2xs transition-colors"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="15 3 21 3 21 9" />
                              <polyline points="9 21 3 21 3 15" />
                              <line x1="21" y1="3" x2="14" y2="10" />
                              <line x1="3" y1="21" x2="10" y2="14" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#1c201a]">
                              Resize Dimensions
                            </div>
                            <div className="text-[11px] text-[#70746d] font-normal">
                              {enableResize
                                ? `${activeItem?.width || 0}×${activeItem?.height || 0}px (${customScalePercent}%)`
                                : `100% Original Locked (${activeItem?.width || 0}×${activeItem?.height || 0}px)`}
                            </div>
                          </div>
                        </div>

                        {/* High-Contrast Modern Toggle Switch */}
                        <button
                          type="button"
                          role="switch"
                          aria-checked={enableResize}
                          onClick={() => handleToggleResize(!enableResize)}
                          style={{
                            backgroundColor: enableResize ? "#3158d5" : "#cbd5e1",
                            borderColor: enableResize ? "#3158d5" : "#94a3b8",
                          }}
                          className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none shadow-inner"
                          title={
                            enableResize
                              ? "Disable resize (Lock 100%)"
                              : "Enable custom resize"
                          }
                        >
                          <span
                            style={{
                              transform: enableResize ? "translateX(20px)" : "translateX(0px)",
                              backgroundColor: "#ffffff",
                              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.25)",
                            }}
                            className="pointer-events-none inline-block h-5 w-5 transform rounded-full ring-0 transition duration-200 ease-in-out"
                          />
                        </button>
                      </div>

                      {/* EXPANDED RESIZE CONTROLS */}
                      {enableResize && (
                        <div style={{ borderTop: "1px solid #e5e5df" }} className="mt-3.5 pt-3 space-y-3">
                          {/* QUICK PERCENTAGE PRESETS */}
                          <div>
                            <div className="flex items-center justify-between text-xs font-bold text-[#575a53]">
                              <span>Scale Percentage</span>
                              <span className="font-mono text-[#3158d5] font-bold">
                                {customScalePercent}%
                              </span>
                            </div>
                            <div className="mt-2 grid grid-cols-4 gap-2">
                              {[100, 75, 50, 25].map((pct) => {
                                const isSelected = customScalePercent === pct;
                                return (
                                  <button
                                    key={pct}
                                    type="button"
                                    onClick={() => handlePercentChange(pct)}
                                    style={{
                                      backgroundColor: isSelected ? "#3158d5" : "#ffffff",
                                      borderColor: isSelected ? "#3158d5" : "#e5e5df",
                                      borderWidth: "1.5px",
                                      borderStyle: "solid",
                                      color: isSelected ? "#ffffff" : "#1c201a",
                                    }}
                                    className="rounded-xl py-2 px-1 text-xs font-bold transition cursor-pointer text-center shadow-2xs hover:border-[#3158d5]"
                                  >
                                    {pct}%
                                  </button>
                                );
                              })}
                            </div>
                            <p className="mt-1.5 text-[11px] text-[#70746d]">
                              {customScalePercent === 100
                                ? "100% maintains original image dimensions."
                                : `Scale image to ${customScalePercent}% of original dimensions.`}
                            </p>
                          </div>

                          {/* CUSTOM WIDTH × HEIGHT WITH ASPECT RATIO LOCK */}
                          <div>
                            <div className="flex items-center justify-between text-xs font-bold text-[#575a53] mb-1.5">
                              <span>Exact Pixels (Width × Height)</span>
                              {customScalePercent !== 100 && (
                                <button
                                  type="button"
                                  onClick={handleResetDimensions}
                                  className="text-[11px] font-semibold text-[#3158d5] hover:underline cursor-pointer"
                                >
                                  Reset (100%)
                                </button>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Width Input */}
                              <div className="flex-1">
                                <input
                                  type="number"
                                  min="10"
                                  max="10000"
                                  value={customWidth}
                                  onChange={(e) =>
                                    handleWidthChange(e.target.value)
                                  }
                                  style={{
                                    backgroundColor: "#ffffff",
                                    borderColor: "#e5e5df",
                                    borderWidth: "1.5px",
                                    borderStyle: "solid",
                                    color: "#1c201a",
                                  }}
                                  className="w-full rounded-xl px-3 py-2 text-xs font-bold text-[#1c201a] focus:border-[#3158d5] focus:outline-none focus:ring-2 focus:ring-[#3158d5]/20 text-center shadow-2xs transition"
                                  placeholder="Width"
                                  title="Width in pixels"
                                />
                              </div>

                              {/* Aspect Ratio Lock Toggle */}
                              <button
                                type="button"
                                onClick={() =>
                                  setLockAspectRatio(!lockAspectRatio)
                                }
                                title={
                                  lockAspectRatio
                                    ? "Aspect ratio locked (proportional)"
                                    : "Aspect ratio unlocked (free resize)"
                                }
                                style={{
                                  backgroundColor: lockAspectRatio ? "#e8effe" : "#ffffff",
                                  borderColor: lockAspectRatio ? "#3158d5" : "#e5e5df",
                                  borderWidth: "1.5px",
                                  borderStyle: "solid",
                                  color: lockAspectRatio ? "#3158d5" : "#70746d",
                                }}
                                className="p-2 rounded-xl transition cursor-pointer shrink-0 shadow-2xs hover:border-[#3158d5]"
                              >
                                {lockAspectRatio ? (
                                  <svg
                                    width="15"
                                    height="15"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                  >
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                  </svg>
                                ) : (
                                  <svg
                                    width="15"
                                    height="15"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <rect
                                      x="3"
                                      y="11"
                                      width="18"
                                      height="11"
                                      rx="2"
                                      ry="2"
                                    />
                                    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                                  </svg>
                                )}
                              </button>

                              {/* Height Input */}
                              <div className="flex-1">
                                <input
                                  type="number"
                                  min="10"
                                  max="10000"
                                  value={customHeight}
                                  onChange={(e) =>
                                    handleHeightChange(e.target.value)
                                  }
                                  style={{
                                    backgroundColor: "#ffffff",
                                    borderColor: "#e5e5df",
                                    borderWidth: "1.5px",
                                    borderStyle: "solid",
                                    color: "#1c201a",
                                  }}
                                  className="w-full rounded-xl px-3 py-2 text-xs font-bold text-[#1c201a] focus:border-[#3158d5] focus:outline-none focus:ring-2 focus:ring-[#3158d5]/20 text-center shadow-2xs transition"
                                  placeholder="Height"
                                  title="Height in pixels"
                                />
                              </div>
                            </div>

                            <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 font-normal">
                              <span>
                                Orig:{" "}
                                {activeItem?.origWidth || activeItem?.width}×
                                {activeItem?.origHeight || activeItem?.height}
                                px
                              </span>
                              <span>
                                {lockAspectRatio
                                  ? "🔗 Ratio locked"
                                  : "🔓 Free scale"}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* STRIP METADATA */}
                    <div style={{ borderTop: "1px solid #e5e5df" }} className="mt-4 flex items-center justify-between pt-3">
                      <div>
                        <div className="text-xs font-bold text-[#1c201a]">
                          Strip EXIF &amp; Metadata
                        </div>
                        <div className="text-[11px] text-[#70746d] font-normal">
                          Removes GPS &amp; camera metadata.
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={stripMetadata}
                        onClick={() => setStripMetadata(!stripMetadata)}
                        style={{
                          backgroundColor: stripMetadata ? "#3158d5" : "#cbd5e1",
                          borderColor: stripMetadata ? "#3158d5" : "#94a3b8",
                        }}
                        className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none shadow-inner"
                      >
                        <span
                          style={{
                            transform: stripMetadata ? "translateX(20px)" : "translateX(0px)",
                            backgroundColor: "#ffffff",
                            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.25)",
                          }}
                          className="pointer-events-none inline-block h-5 w-5 transform rounded-full ring-0 transition duration-200 ease-in-out"
                        />
                      </button>
                    </div>

                    {/* APPLY TO ALL BUTTON */}
                    {items.length > 1 && (
                      <div style={{ borderTop: "1px solid #e5e5df" }} className="mt-5 pt-3">
                        <button
                          type="button"
                          onClick={handleApplyToAll}
                          disabled={isBatchCompressing}
                          style={{ backgroundColor: "#3158d5" }}
                          className="w-full rounded-2xl text-white font-bold py-3 px-4 text-xs sm:text-sm shadow-xs hover:bg-[#2546b8] transition cursor-pointer"
                        >
                          Apply Settings to All ({items.length}) Images
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* MOBILE ONLY (< sm): CROSS-TOOL WORKFLOW BRIDGES (At bottom before Fast & Simple) */}
              <div
                style={{ backgroundColor: "#ffffff", borderColor: "#e5e5df" }}
                className="spellense-mobile-only flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3.5 shadow-xs"
              >
                <div className="text-xs text-[#575a53] font-normal">
                  <span className="font-bold text-[#1c201a]">Compressed your image?</span>{" "}
                  Check the text inside it for typos too →
                </div>
                <div className="flex items-center justify-between w-full gap-2">
                  <button
                    type="button"
                    onClick={handleSendToSpellcheck}
                    style={{ backgroundColor: "#3158d5", color: "#ffffff" }}
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition hover:bg-[#2546b8] cursor-pointer shadow-xs"
                  >
                    <span>Run Spellcheck</span>
                    <span>→</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSendToImageToText}
                    style={{ backgroundColor: "#faf9f6", borderColor: "#e5e5df", color: "#1c201a" }}
                    className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition hover:bg-[#efeee7] cursor-pointer"
                  >
                    <span>Extract Text (OCR)</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3-STEP WORKFLOW CARDS (HOMEPAGE MATCH) */}
        <section style={{ borderTop: "1px solid #e5e5df" }} className="mt-12 sm:mt-16 pt-12 sm:pt-16">
          <ScrollReveal className="text-center max-w-4xl mx-auto">
            <div style={{ borderColor: "#e5e5df" }} className="inline-flex items-center gap-1.5 rounded-full border bg-[#faf9f6] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#3158d5] shadow-2xs">
              Fast &amp; Simple
            </div>
            <h3 className="mt-2.5 text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-[#1c201a] sm:whitespace-nowrap">
              How Spellense Compressor Works in 3 easy steps
            </h3>
          </ScrollReveal>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <ScrollReveal delay={0} className="h-full">
              <div style={{ borderColor: "#e5e5df" }} className="h-full rounded-3xl border bg-white p-6 shadow-xs backdrop-blur-md">
                <span style={{ backgroundColor: "#f6f5f3", border: "1px solid #e5e5df" }} className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black text-[#3158d5]">
                  01
                </span>
                <h4 className="mt-4 text-base font-bold text-[#1c201a]">
                  Drop Images or PDF Catalogs
                </h4>
                <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-[#575a53]">
                  Upload JPG, PNG, WebP, AVIF, or multi-page PDF catalogs. All compression happens safely in-memory with zero server uploads.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={120} className="h-full">
              <div style={{ borderColor: "#e5e5df" }} className="h-full rounded-3xl border bg-white p-6 shadow-xs backdrop-blur-md">
                <span style={{ backgroundColor: "#f6f5f3", border: "1px solid #e5e5df" }} className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black text-[#3158d5]">
                  02
                </span>
                <h4 className="mt-4 text-base font-bold text-[#1c201a]">
                  Realtime Squoosh Split Slider
                </h4>
                <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-[#575a53]">
                  Slide to visually inspect original vs compressed side-by-side. Zoom up to 2× to guarantee crisp logos, text, and edges.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={240} className="h-full">
              <div style={{ borderColor: "#e5e5df" }} className="h-full rounded-3xl border bg-white p-6 shadow-xs backdrop-blur-md">
                <span style={{ backgroundColor: "#f6f5f3", border: "1px solid #e5e5df" }} className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black text-[#3158d5]">
                  03
                </span>
                <h4 className="mt-4 text-base font-bold text-[#1c201a]">
                  Download Single or Batch ZIP
                </h4>
                <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-[#575a53]">
                  Save single optimized images instantly, or export 50+ compressed images and catalog pages in a neat, organized ZIP archive.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* FAQ SECTION (HOMEPAGE MATCH) */}
        <section style={{ borderTop: "1px solid #e5e5df" }} className="mt-12 sm:mt-16 pt-12 sm:pt-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <ScrollReveal className="lg:col-span-4 lg:sticky lg:top-8">
              <div style={{ borderColor: "#e5e5df" }} className="inline-flex items-center gap-1.5 rounded-full border bg-[#faf9f6] px-3 py-1 shadow-2xs backdrop-blur-md">
                <span className="flex h-1.5 w-1.5 rounded-full bg-[#3158d5] animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#3158d5]">
                  Frequently Asked Questions
                </span>
              </div>
              <h3 className="mt-3 text-2xl font-black tracking-tight text-[#1c201a] sm:text-3xl">
                Image Compressor FAQ
              </h3>
              <p className="mt-2 text-xs text-[#575a53] sm:text-sm leading-relaxed">
                Everything you need to know about compressing images and multi-page catalogs without losing quality.
              </p>
            </ScrollReveal>

            <div className="lg:col-span-8 space-y-3.5">
              {FAQ_ITEMS.map((faq, idx) => (
                <ScrollReveal key={idx} delay={idx * 60}>
                  <details
                    style={{ borderColor: "#e5e5df" }}
                    className="group rounded-2xl border bg-white p-5 shadow-2xs backdrop-blur-md transition-all open:border-[#3158d5]/40 open:shadow-xs"
                  >
                    <summary className="flex cursor-pointer items-center justify-between font-bold text-[#1c201a] text-sm sm:text-base list-none">
                      <span>{faq.q}</span>
                      <span className="ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f6f5f3] text-slate-600 transition-transform duration-200 group-open:rotate-180 group-open:bg-[#f6f5f3] group-open:text-[#3158d5]">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </span>
                    </summary>
                    <p className="mt-3 text-xs sm:text-sm leading-relaxed text-[#575a53]">
                      {faq.a}
                    </p>
                  </details>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* RELATED CREATIVE TOOLS SECTION (HOMEPAGE MATCH) */}
        <section style={{ borderTop: "1px solid #e5e5df" }} className="mt-12 sm:mt-16 pt-12 sm:pt-16 pb-20">
          <ScrollReveal className="text-center max-w-2xl mx-auto">
            <div style={{ borderColor: "#e5e5df" }} className="inline-flex items-center gap-1.5 rounded-full border bg-[#faf9f6] px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#3158d5] shadow-2xs backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3158d5] animate-pulse" />
              The Spellense Suite
            </div>
            <h3 className="mt-3 text-2xl font-black tracking-tight text-[#1c201a] sm:text-3xl">
              Explore More Free Creative Tools
            </h3>
            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#575a53]">
              Crafted for marketing teams, art directors, graphic designers, and founders who need flawless client deliverables.
            </p>
          </ScrollReveal>

          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            <ScrollReveal delay={0} className="h-full">
              <Link
                href="/"
                style={{ borderColor: "#e5e5df" }}
                className="group relative flex h-full flex-col justify-between rounded-3xl border bg-white p-7 shadow-xs backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-[#3158d5]/40 hover:shadow-md cursor-pointer"
              >
                <div>
                  <div style={{ backgroundColor: "#f6f5f3", border: "1px solid #e5e5df", color: "#3158d5" }} className="flex h-11 w-11 items-center justify-center rounded-2xl">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                      <line x1="8" y1="21" x2="16" y2="21"/>
                      <line x1="12" y1="17" x2="12" y2="21"/>
                    </svg>
                  </div>
                  <div className="mt-4 text-[11px] font-bold uppercase tracking-wider text-[#3158d5]">
                    Visual Quality Assurance
                  </div>
                  <h4 className="mt-1 text-xl font-black text-[#1c201a] group-hover:text-[#3158d5] transition">
                    Visual Spell Checker
                  </h4>
                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#575a53]">
                    Detect typos and spelling errors directly inside images, PDFs, and slide presentations with bounding box highlights.
                  </p>
                </div>
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400">OCR &amp; AI Proofreading</span>
                  <span className="text-xs font-bold text-[#3158d5] group-hover:underline inline-flex items-center gap-1">
                    <span>Use tool</span>
                    <span className="transition-transform group-hover:translate-x-0.5">→</span>
                  </span>
                </div>
              </Link>
            </ScrollReveal>

            <ScrollReveal delay={80} className="h-full">
              <Link
                href="/flipbook"
                style={{ borderColor: "#e5e5df" }}
                className="group relative flex h-full flex-col justify-between rounded-3xl border bg-white p-7 shadow-xs backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-[#3158d5]/40 hover:shadow-md cursor-pointer"
              >
                <div>
                  <div style={{ backgroundColor: "#f6f5f3", border: "1px solid #e5e5df", color: "#3158d5" }} className="flex h-11 w-11 items-center justify-center rounded-2xl">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                      <path d="M6 6h10" />
                      <path d="M6 10h10" />
                    </svg>
                  </div>
                  <div className="mt-4 text-[11px] font-bold uppercase tracking-wider text-[#3158d5]">
                    3D Publishing
                  </div>
                  <h4 className="mt-1 text-xl font-black text-[#1c201a] group-hover:text-[#3158d5] transition">
                    3D Digital Flipbook
                  </h4>
                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#575a53]">
                    Turn PDF catalogs, portfolios, and magazines into interactive 3D books with realistic page turns.
                  </p>
                </div>
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400">Offline HTML &amp; Embed</span>
                  <span className="text-xs font-bold text-[#3158d5] group-hover:underline inline-flex items-center gap-1">
                    <span>Use tool</span>
                    <span className="transition-transform group-hover:translate-x-0.5">→</span>
                  </span>
                </div>
              </Link>
            </ScrollReveal>

            <ScrollReveal delay={160} className="h-full">
              <Link
                href="/qr-code-generator"
                style={{ borderColor: "#e5e5df" }}
                className="group relative flex h-full flex-col justify-between rounded-3xl border bg-white p-7 shadow-xs backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-[#3158d5]/40 hover:shadow-md cursor-pointer"
              >
                <div>
                  <div style={{ backgroundColor: "#f6f5f3", border: "1px solid #e5e5df", color: "#3158d5" }} className="flex h-11 w-11 items-center justify-center rounded-2xl">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7"/>
                      <rect x="14" y="3" width="7" height="7"/>
                      <rect x="14" y="14" width="7" height="7"/>
                      <rect x="3" y="14" width="7" height="7"/>
                    </svg>
                  </div>
                  <div className="mt-4 text-[11px] font-bold uppercase tracking-wider text-[#3158d5]">
                    Print Scannability QA
                  </div>
                  <h4 className="mt-1 text-xl font-black text-[#1c201a] group-hover:text-[#3158d5] transition">
                    QR Code Generator
                  </h4>
                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#575a53]">
                    Create vector SVG &amp; high-res PNG QR codes with customizable color schemes and verify camera scannability before printing.
                  </p>
                </div>
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400">Vector SVG &amp; PNG</span>
                  <span className="text-xs font-bold text-[#3158d5] group-hover:underline inline-flex items-center gap-1">
                    <span>Use tool</span>
                    <span className="transition-transform group-hover:translate-x-0.5">→</span>
                  </span>
                </div>
              </Link>
            </ScrollReveal>
          </div>
        </section>
      </div>
    </section>

    {/* MOBILE ONLY (< sm): FLOATING STICKY DOWNLOAD BAR (FREEZE IN BOTTOM ALWAYS) */}
    {items.length > 0 && (
      <>
        <div className="spellense-mobile-only h-28" />
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.98)",
            borderColor: "#e5e5df",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            boxShadow: "0 -4px 24px rgba(0, 0, 0, 0.12)",
            minHeight: "82px",
            paddingTop: "16px",
            paddingBottom: "max(18px, env(safe-area-inset-bottom))",
          }}
          className="spellense-mobile-only fixed bottom-0 left-0 right-0 z-50 border-t px-4 flex items-center"
        >
          <div className="flex items-center justify-between gap-3 max-w-lg mx-auto w-full">
            {/* Left: Active File Info */}
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <div className="text-xs font-bold text-[#1c201a] truncate">
                {activeItem?.name || "Image"}
              </div>
              <div className="text-[11px] text-[#70746d] flex items-center gap-1.5 mt-0.5">
                <span className="font-bold text-[#3158d5]">
                  {activeItem && activeItem.compressedSize > 0
                    ? formatBytes(activeItem.compressedSize)
                    : "..."}
                </span>
                {activeItem && activeItem.originalSize > 0 && activeItem.compressedSize > 0 && (
                  <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800">
                    -{Math.round(((activeItem.originalSize - activeItem.compressedSize) / activeItem.originalSize) * 100)}%
                  </span>
                )}
              </div>
            </div>

            {/* Right: Download Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {items.length > 1 && (
                <button
                  type="button"
                  disabled={isZipping || isBatchCompressing}
                  onClick={handleDownloadAllZip}
                  style={{ borderColor: "#e5e5df", backgroundColor: "#faf9f6" }}
                  className="h-10 inline-flex items-center justify-center gap-1 rounded-xl border px-3.5 text-xs font-bold text-[#1c201a] shadow-xs active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <span>ZIP ({items.length})</span>
                </button>
              )}

              {activeItem && (
                <button
                  type="button"
                  onClick={() => handleDownloadItem(activeItem)}
                  style={{ backgroundColor: "#3158d5" }}
                  className="h-10 inline-flex items-center justify-center gap-2 rounded-xl text-white px-4 text-xs font-bold shadow-md active:scale-95 cursor-pointer whitespace-nowrap"
                >
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
                  <span>Download</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </>
    )}
  </main>

      {/* FOOTER */}
      <Footer currentPath="/image-compressor" />
    </div>
  );
}
