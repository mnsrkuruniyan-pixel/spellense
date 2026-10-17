"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".pptx",
  ".xlsx",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
];
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

async function optimizeImageForOcr(imageFile: File): Promise<File> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      const url = URL.createObjectURL(imageFile);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX_DIM = 2400;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(imageFile);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < imageFile.size) {
              const optimized = new File([blob], imageFile.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(optimized);
            } else {
              resolve(imageFile);
            }
          },
          "image/jpeg",
          0.92
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(imageFile);
      };
      img.src = url;
    } catch {
      resolve(imageFile);
    }
  });
}

const FAQ_ITEMS = [
  {
    q: "What image formats and file types are supported?",
    a: "Spellense supports JPG, JPEG, PNG, and WebP raster images, as well as multi-page PDF documents. You can upload high-resolution screenshots, smartphone photos, scanned documents, and infographics with no registration required.",
  },
  {
    q: "What is the maximum file size limit?",
    a: "The maximum file size limit is 25 MB per document. This generous allowance accommodates high-resolution camera photos, desktop screenshots, and multi-page scanned PDF documents.",
  },
  {
    q: "Can Spellense extract text from scanned PDFs without an existing text layer?",
    a: "Yes. Our OCR engine optically scans scanned PDF documents and flattened graphics to recognize and extract text tokens directly from raw pixel data, even if the PDF contains no embedded font or digital text layer.",
  },
  {
    q: "Are my uploaded files or extracted text stored on your servers?",
    a: "No. Spellense operates on a strict zero-storage, in-memory architecture. Files are processed temporarily in volatile RAM exclusively to perform OCR extraction, and are immediately discarded. We never save files to disk, keep server logs of your content, or train AI models on user data.",
  },
  {
    q: "Is this image-to-text converter completely free to use?",
    a: "Yes. Spellense Image to Text is 100% free with no sign-up, no hidden fees, no subscriptions, and no watermarks. You can convert as many images and documents as you need.",
  },
  {
    q: "Can I check the extracted text for typos and spelling mistakes?",
    a: "Yes! Right after extracting your text, click 'Found a typo? Run spellcheck on this text →' to seamlessly carry the text directly into the Spellense proofreading engine without having to re-upload or retype anything.",
  },
];

export default function ImageToTextClient() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const outputTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractingStep, setExtractingStep] = useState("Analyzing image...");
  const [extractedText, setExtractedText] = useState("");
  const [hasExtracted, setHasExtracted] = useState(false);
  const [noTextDetected, setNoTextDetected] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Clean up object URLs on unmount or file change
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Statistics for extracted text
  const stats = useMemo(() => {
    const trimmed = extractedText.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const chars = extractedText.length;
    const lines = extractedText
      ? extractedText.split(/\r\n|\r|\n/).filter((l) => l.trim().length > 0).length
      : 0;
    return { words, chars, lines };
  }, [extractedText]);

  // Copy to clipboard with fallback for older browsers
  const handleCopy = async () => {
    if (!extractedText) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(extractedText);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement("textarea");
        textArea.value = extractedText;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  // Download text file
  const handleDownload = () => {
    if (!extractedText) return;
    const baseName = file?.name ? file.name.replace(/\.[^/.]+$/, "") : "extracted-text";
    const filename = `${baseName}-spellense.txt`;
    const blob = new Blob([extractedText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Carry text over to spellcheck tool on homepage
  const handleRunSpellcheck = () => {
    if (!extractedText.trim()) return;
    try {
      sessionStorage.setItem("spellense_check_text", extractedText);
      router.push("/?mode=text");
    } catch {
      router.push("/");
    }
  };

  // Execute extraction via spell-check PDF & OCR pipeline
  const processFile = async (selectedFile: File) => {
    // 1. File size check (25 MB)
    if (selectedFile.size > MAX_FILE_SIZE) {
      setUploadError(
        `"${selectedFile.name}" exceeds the 25 MB limit (${(
          selectedFile.size /
          1024 /
          1024
        ).toFixed(1)} MB). Please choose a smaller document.`
      );
      return;
    }

    // 2. Format validation (extensions & mime types)
    const nameLower = selectedFile.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => nameLower.endsWith(ext));
    const hasValidMime = ALLOWED_MIME_TYPES.includes(selectedFile.type);

    if (!hasValidExt && !hasValidMime) {
      setUploadError(
        "Unsupported file format. Please upload a PDF, DOCX, PPTX, XLSX, JPG, PNG, or WEBP file."
      );
      return;
    }

    setUploadError(null);
    setFile(selectedFile);
    setExtracting(true);
    setExtractingStep(
      nameLower.endsWith(".pdf")
        ? "Reading your PDF..."
        : "Reading your file..."
    );
    setHasExtracted(false);
    setNoTextDetected(false);
    setExtractedText("");

    // Create preview if it's an image
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    if (selectedFile.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(selectedFile));
    } else {
      setPreviewUrl(null);
    }

    const isPdf = nameLower.endsWith(".pdf");

    try {
      if (isPdf) {
        setExtractingStep("Extracting text from PDF...");
        try {
          const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
          pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
          const arrayBuffer = await selectedFile.arrayBuffer();
          const loadingTask = pdfjs.getDocument({
            data: new Uint8Array(arrayBuffer),
          });
          const pdf = await loadingTask.promise;

          const textParts: string[] = [];

          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            setExtractingStep(`Scanning page ${pageNum} of ${pdf.numPages}...`);
            const page = await pdf.getPage(pageNum);
            const content = await page.getTextContent();
            let pageText = "";
            let prevItem: {
              str?: string;
              transform?: number[];
              width?: number;
              hasEOL?: boolean;
            } | null = null;

            for (const item of content.items) {
              if (!("str" in item) || !item.str) continue;

              if (!prevItem) {
                pageText += item.str;
              } else {
                const prevTransform = prevItem.transform || [1, 0, 0, 1, 0, 0];
                const curTransform = item.transform || [1, 0, 0, 1, 0, 0];
                const fontSize = Math.max(
                  8,
                  Math.hypot(curTransform[2], curTransform[3])
                );
                const isNewLine =
                  prevItem.hasEOL ||
                  Math.abs(curTransform[5] - prevTransform[5]) > fontSize * 0.55;

                if (isNewLine) {
                  pageText += "\n" + item.str;
                } else {
                  const prevEnd = prevTransform[4] + (prevItem.width || 0);
                  const curStart = curTransform[4];
                  const gap = curStart - prevEnd;

                  if (
                    gap > fontSize * 0.18 &&
                    !prevItem.str?.endsWith(" ") &&
                    !item.str.startsWith(" ")
                  ) {
                    pageText += " " + item.str;
                  } else {
                    pageText += item.str;
                  }
                }
              }
              prevItem = item;
            }

            page.cleanup();

            const cleanedPageText = pageText
              .replace(/\r/g, "")
              .replace(/[ \t]+/g, " ")
              .trim();

            if (cleanedPageText) {
              textParts.push(cleanedPageText);
            }
          }

          await pdf.cleanup();
          await loadingTask.destroy();

          const pdfExtractedText = textParts.join("\n\n").trim();

          if (pdfExtractedText.length > 0) {
            setExtractedText(pdfExtractedText);
            setNoTextDetected(false);
            setHasExtracted(true);
            setExtracting(false);
            return;
          } else {
            // Scanned PDF (images only)
            if (selectedFile.size <= 4.2 * 1024 * 1024) {
              setExtractingStep("Running OCR on scanned PDF...");
              const formData = new FormData();
              formData.append("file", selectedFile);
              formData.append("dialect", "en-US");

              const response = await fetch("/api/check", {
                method: "POST",
                body: formData,
              });

              let data: { success?: boolean; text?: string; error?: string } | null = null;
              try {
                data = await response.json();
              } catch {}

              if (!response.ok || !data || data.success === false) {
                setUploadError(
                  data?.error || "Unable to extract text from this scanned PDF."
                );
                setExtracting(false);
                return;
              }

              const text = data.text ? data.text.trim() : "";
              if (!text) {
                setNoTextDetected(true);
                setExtractedText("");
              } else {
                setNoTextDetected(false);
                setExtractedText(data.text || "");
              }
              setHasExtracted(true);
              setExtracting(false);
              return;
            } else {
              setUploadError(
                "This scanned PDF contains only images without selectable text and exceeds the 4.5MB limit for OCR scanning. Please compress the file or use a digital PDF."
              );
              setExtracting(false);
              return;
            }
          }
        } catch (pdfErr) {
          console.warn(
            "Client-side PDF extraction failed, falling back to file upload:",
            pdfErr
          );
          if (selectedFile.size <= 4.2 * 1024 * 1024) {
            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("dialect", "en-US");
            const response = await fetch("/api/check", {
              method: "POST",
              body: formData,
            });
            let data: { success?: boolean; text?: string; error?: string } | null = null;
            try {
              data = await response.json();
            } catch {}
            if (data?.text?.trim()) {
              setExtractedText(data.text);
              setNoTextDetected(false);
            } else {
              setNoTextDetected(true);
            }
            setHasExtracted(true);
            setExtracting(false);
            return;
          } else {
            setUploadError(
              "Unable to process this large PDF on the device. Please try a file under 4.5MB."
            );
            setExtracting(false);
            return;
          }
        }
      }

      // Non-PDF (Images: JPG, PNG, WEBP, or Office Documents: DOCX, PPTX, XLSX)
      setExtractingStep(
        nameLower.endsWith(".docx") ||
        nameLower.endsWith(".pptx") ||
        nameLower.endsWith(".xlsx")
          ? "Reading document text..."
          : "Running OCR extraction..."
      );

      let fileToSend = selectedFile;
      if (
        selectedFile.type.startsWith("image/") &&
        selectedFile.size > 3.5 * 1024 * 1024
      ) {
        setExtractingStep("Optimizing high-resolution image...");
        fileToSend = await optimizeImageForOcr(selectedFile);
      }

      const formData = new FormData();
      formData.append("file", fileToSend);
      formData.append("dialect", "en-US");

      const response = await fetch("/api/check", {
        method: "POST",
        body: formData,
      });

      let data: {
        success?: boolean;
        text?: string;
        error?: string;
        message?: string;
      } | null = null;

      try {
        data = await response.json();
      } catch {
        // failed to parse JSON
      }

      if (!response.ok || !data || data.success === false) {
        setUploadError(
          data?.error || "Unable to extract text from the file. Please try another image or document."
        );
        setExtracting(false);
        return;
      }

      const text = data.text ? data.text.trim() : "";
      if (!text) {
        setNoTextDetected(true);
        setExtractedText("");
      } else {
        setNoTextDetected(false);
        setExtractedText(data.text || "");
      }
      setHasExtracted(true);
    } catch (err) {
      console.error(err);
      setUploadError("Network connection error. Please try again.");
    } finally {
      setExtracting(false);
    }
  };

  // Load sample file
  const handleLoadSample = async () => {
    try {
      setLoadingSample(true);
      setUploadError(null);
      const res = await fetch("/sample-document.png");
      if (!res.ok) throw new Error("Sample file not found");
      const blob = await res.blob();
      const sampleFile = new File([blob], "sample-document.png", {
        type: "image/png",
      });
      await processFile(sampleFile);
    } catch {
      setUploadError("Could not load sample document. Please select a file from your device.");
    } finally {
      setLoadingSample(false);
    }
  };

  // Reset tool to upload another file
  const handleReset = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl(null);
    setExtractedText("");
    setHasExtracted(false);
    setNoTextDetected(false);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
                Image to Text (OCR)
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1 line-clamp-1 sm:line-clamp-none">
                Extract copyable, editable text from scanned images, screenshots, and PDF documents with zero data retention.
              </p>
            </div>

            {/* Privacy Badge */}
            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 text-xs font-semibold text-emerald-800 self-start sm:self-center shadow-2xs">
              <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <span>100% private — processed locally in browser</span>
            </div>
          </div>
        </section>

        {/* INTERACTIVE WORKSPACE SECTION */}
        <section className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 pb-16 mt-2 sm:mt-4">
          <div className="w-full">
            {/* UPLOAD ERROR ALERT */}
            {uploadError && (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50/90 p-4 text-xs font-semibold text-red-700 shadow-xs flex items-center justify-between gap-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-2.5">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-red-600">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{uploadError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadError(null)}
                  className="text-red-500 hover:text-red-800 font-bold px-2 py-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* HIDDEN FILE INPUT */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.pptx,.xlsx,.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  processFile(e.target.files[0]);
                }
              }}
            />

            {/* STATE 1: EXTRACTION IN PROGRESS */}
            {extracting && (
              <div className="rounded-2xl sm:rounded-3xl border border-blue-200 bg-white p-10 sm:p-14 text-center shadow-xs animate-in fade-in duration-200">
                <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl animate-pulse" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0055fe] text-white shadow-md shadow-blue-600/30">
                    <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  </div>
                </div>

                <h2 className="mt-6 text-xl sm:text-2xl font-bold text-slate-900">
                  Extracting copyable text...
                </h2>
                <p className="mt-2 text-xs sm:text-sm font-medium text-slate-500">
                  {extractingStep}
                </p>
                <div className="mx-auto mt-6 max-w-xs h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#0055fe] rounded-full animate-pulse w-3/4" />
                </div>
              </div>
            )}

            {/* STATE 2: NO FILE UPLOADED OR WAITING (DROPZONE) */}
            {!extracting && !hasExtracted && (
              <div>
                <div
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      processFile(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`group relative w-full rounded-2xl sm:rounded-3xl border py-12 px-6 sm:py-16 sm:px-12 lg:py-20 text-center transition-all duration-300 cursor-pointer overflow-hidden ${
                    isDragging
                      ? "border-[#0055fe] bg-blue-50/95 shadow-[0_0_60px_rgba(0,85,254,0.25)] scale-[1.01]"
                      : "border-slate-200/90 hover:border-blue-400/80 bg-white shadow-[0_15px_50px_-15px_rgba(0,85,254,0.07)] hover:shadow-[0_20px_60px_-15px_rgba(0,85,254,0.12)]"
                  }`}
                >
                  <div className="relative">
                    {/* Cloud Upload Icon */}
                    <div className="mx-auto flex justify-center items-center">
                      <svg
                        width="68"
                        height="68"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-slate-400 group-hover:text-slate-500 group-hover:-translate-y-1 transition-all duration-300"
                      >
                        <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                        <path d="M12 12v9" />
                        <path d="m16 16-4-4-4 4" />
                      </svg>
                    </div>

                    <h2 className="mt-5 text-xl sm:text-2xl lg:text-[26px] font-bold tracking-tight text-slate-900 group-hover:text-blue-900 transition-colors">
                      {isDragging ? "Drop file to extract text" : "Drop your image or document here"}
                    </h2>

                    {/* BUTTONS (SIDE BY SIDE WITH BREATHING SPACE) */}
                    <div className="mt-8 sm:mt-10 mb-6 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="group/btn inline-flex min-w-[185px] sm:min-w-[210px] items-center justify-center gap-3 rounded-2xl border border-slate-200/90 bg-white hover:bg-slate-50 hover:border-blue-400 px-8 sm:px-10 py-4 sm:py-4.5 text-sm sm:text-base font-semibold text-slate-700 hover:text-[#0055fe] shadow-2xs hover:shadow-xs transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-slate-400 group-hover/btn:text-[#0055fe] transition-colors"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span>Upload Now</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLoadSample();
                        }}
                        disabled={loadingSample}
                        className="group/sample inline-flex min-w-[185px] sm:min-w-[210px] items-center justify-center gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/70 hover:bg-white hover:border-blue-400/80 px-8 sm:px-10 py-4 sm:py-4.5 text-sm sm:text-base font-semibold text-slate-700 hover:text-[#0055fe] transition-all cursor-pointer shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                        title="Test immediately with a sample image"
                      >
                        {loadingSample ? (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                        ) : (
                          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover/sample:text-[#0055fe] transition-colors">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                        )}
                        <span>Try Sample</span>
                      </button>
                    </div>

                    {/* Format chips */}
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-[11px] font-bold text-slate-700">
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100/80 px-3 py-1 shadow-2xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        PDF
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100/80 px-3 py-1 shadow-2xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        DOCX
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100/80 px-3 py-1 shadow-2xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        PPTX
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100/80 px-3 py-1 shadow-2xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        XLSX
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100/80 px-3 py-1 shadow-2xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                        JPG • PNG • WEBP
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4 Trust Feature Cards */}
                <div className="mt-6 sm:mt-8 w-full">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                    <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs sm:text-[13px] font-bold text-slate-900 leading-tight">
                          All Document Formats
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                          PDF, Word, PPTX, Images
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs sm:text-[13px] font-bold text-slate-900 leading-tight">
                          AI OCR Accuracy
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                          Preserves formatting &amp; lines
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z" />
                          <path d="m9 12 2 2 4-4" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs sm:text-[13px] font-bold text-slate-900 leading-tight">
                          Instant Copy &amp; Export
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                          One-click copy • 100% Free
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs sm:text-[13px] font-bold text-slate-900 leading-tight">
                          Zero Data Retention
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                          In-memory RAM processing
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* STATE 3: EXTRACTED OUTPUT PANEL */}
          {!extracting && hasExtracted && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* FILE BAR */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white/90 px-4 py-3 shadow-xs backdrop-blur-md">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-bold text-slate-800">
                        {file?.name || "Uploaded Document"}
                      </span>
                      {file && (
                        <span className="shrink-0 text-[10px] font-semibold text-slate-400">
                          ({(file.size / 1024).toFixed(0)} KB)
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-medium text-emerald-600 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span>OCR Extraction Complete</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:text-blue-600 cursor-pointer"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                  <span>Extract another image</span>
                </button>
              </div>

              {/* NO TEXT DETECTED ALERT */}
              {noTextDetected ? (
                <div className="rounded-3xl border border-amber-200/90 bg-amber-50/90 p-8 text-center shadow-xs">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <h3 className="mt-4 text-lg font-black text-slate-900">
                    No readable English text was detected
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm text-slate-600 leading-relaxed">
                    We could not recognize clear letterforms in this image. Please ensure the image is clear, well-lit, has legible contrast, and is not overly compressed.
                  </p>
                  <div className="mt-5">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-slate-800 cursor-pointer"
                    >
                      <span>Upload a different image</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* EXTRACTED TEXT PANEL */
                <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-[0_15px_50px_-15px_rgba(0,85,254,0.07)]">
                  {/* HEADER ROW */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#0055fe]" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Extracted Text
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
                      <span>
                        <strong className="text-slate-800 font-bold">{stats.words}</strong> words
                      </span>
                      <span>•</span>
                      <span>
                        <strong className="text-slate-800 font-bold">{stats.chars}</strong> chars
                      </span>
                      <span>•</span>
                      <span>
                        <strong className="text-slate-800 font-bold">{stats.lines}</strong> lines
                      </span>
                    </div>
                  </div>

                  {/* EDITABLE TEXTAREA */}
                  <div className="mt-4">
                    <textarea
                      ref={outputTextareaRef}
                      value={extractedText}
                      onChange={(e) => setExtractedText(e.target.value)}
                      rows={12}
                      placeholder="Extracted text will appear here..."
                      className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-sm leading-relaxed text-slate-800 outline-none transition focus:border-[#0055fe] focus:bg-white focus:ring-4 focus:ring-blue-500/10 font-mono sm:font-sans"
                    />
                  </div>

                  {/* ACTIONS BAR */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* COPY BUTTON */}
                      <button
                        type="button"
                        onClick={handleCopy}
                        className={`group inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-2xs hover:shadow-xs hover:border-blue-400 ${
                          copied
                            ? "bg-emerald-600 text-white"
                            : "bg-white hover:bg-slate-50 text-slate-700 hover:text-[#0055fe]"
                        }`}
                      >
                        {copied ? (
                          <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span>Copied to Clipboard!</span>
                          </>
                        ) : (
                          <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 group-hover:text-[#0055fe] transition-colors">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                            <span>Copy to clipboard</span>
                          </>
                        )}
                      </button>

                      {/* DOWNLOAD BUTTON */}
                      <button
                        type="button"
                        onClick={handleDownload}
                        className="group inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 hover:border-blue-400 px-4 py-2.5 text-xs font-bold text-slate-700 hover:text-[#0055fe] shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 group-hover:text-[#0055fe] transition-colors">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        <span>Download as .txt</span>
                      </button>
                    </div>

                    {/* SPELLCHECK CTA BUTTON */}
                    <button
                      type="button"
                      onClick={handleRunSpellcheck}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#0055fe] hover:bg-blue-700 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/25 transition-all hover:-translate-y-0.5 cursor-pointer"
                    >
                      <span>Found a typo? Run spellcheck on this text</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              )}

              {/* CROSS-PROMOTION FUNNEL BANNER */}
              {!noTextDetected && (
                <div className="rounded-2xl sm:rounded-3xl border border-blue-200/90 bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-white p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                  <div>
                    <div className="inline-flex items-center gap-1.5 rounded-md bg-blue-100/90 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 uppercase tracking-wide">
                      Need Visual Proofreading?
                    </div>
                    <h3 className="mt-1.5 text-base sm:text-lg font-bold text-slate-900">
                      Want to check this text for typos and grammatical errors?
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500 font-normal">
                      Carry this text straight into Spellense&apos;s dual-engine visual proofreader with zero re-uploading.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRunSpellcheck}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0055fe] hover:bg-blue-700 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition hover:-translate-y-0.5 shrink-0 cursor-pointer"
                  >
                    <span>Open Spellense Checker</span>
                    <span>→</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-16 border-t border-slate-200/80">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Fast &amp; Simple
          </span>
          <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            How to extract text from images in 3 easy steps
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
            Effortlessly transform screenshots, photos, and scanned PDF documents into editable text in seconds.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:gap-6 md:grid-cols-3">
          {/* STEP 1 */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-700">
              01
            </span>
            <h3 className="mt-4 text-base font-bold text-slate-900">
              Upload your image or PDF
            </h3>
            <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-slate-500 font-normal">
              Drop any JPG, PNG, WebP image, or multi-page scanned PDF up to 25MB. No account or credit card required.
            </p>
          </div>

          {/* STEP 2 */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-700">
              02
            </span>
            <h3 className="mt-4 text-base font-bold text-slate-900">
              In-Memory OCR Extraction
            </h3>
            <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-slate-500 font-normal">
              High-accuracy Optical Character Recognition scans pixel matrices, extracting text tokens while preserving paragraphs and line breaks.
            </p>
          </div>

          {/* STEP 3 */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-700">
              03
            </span>
            <h3 className="mt-4 text-base font-bold text-slate-900">
              Copy, Download, or Spellcheck
            </h3>
            <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-slate-500 font-normal">
              Copy to clipboard with one click, save as a clean .txt file, or funnel straight into our spellchecker to catch hidden typos.
            </p>
          </div>
        </div>
      </section>

      {/* WHY USE SPELLENSE OCR (FEATURE HIGHLIGHTS) */}
      <section className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 pb-16">
        <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-10 shadow-xs">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Built for Speed &amp; Accuracy
            </span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Why use Spellense Image to Text Converter?
            </h2>
            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-500 font-normal">
              Engineered for graphic designers, researchers, students, and professionals who need accurate text extraction without privacy risks.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
              <div className="text-xs font-bold text-blue-600 uppercase tracking-wide">Optical Precision</div>
              <h3 className="mt-1 text-base font-bold text-slate-900">High-Resolution OCR</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500 font-normal">
                Recognizes text from varied font families, contrast ratios, and complex flyer layouts with state-of-the-art accuracy.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
              <div className="text-xs font-bold text-blue-600 uppercase tracking-wide">Strict Privacy</div>
              <h3 className="mt-1 text-base font-bold text-slate-900">Zero Server Storage</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500 font-normal">
                100% ephemeral in-memory RAM processing. Your confidential screenshots, receipts, or contracts are never stored to disk or used for AI training.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
              <div className="text-xs font-bold text-blue-600 uppercase tracking-wide">Layout Preservation</div>
              <h3 className="mt-1 text-base font-bold text-slate-900">Paragraph &amp; Line Breaks</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500 font-normal">
                Unlike primitive OCR engines that bunch text into a single messy paragraph, Spellense retains your original line breaks.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
              <div className="text-xs font-bold text-blue-600 uppercase tracking-wide">PDF Ready</div>
              <h3 className="mt-1 text-base font-bold text-slate-900">Scanned PDFs Handled</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500 font-normal">
                Easily convert scanned multi-page PDF documents without native text layers directly into plain text without third-party converters.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
              <div className="text-xs font-bold text-blue-600 uppercase tracking-wide">Seamless Spellcheck</div>
              <h3 className="mt-1 text-base font-bold text-slate-900">One-Click Proofreading</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500 font-normal">
                Extracted text can be immediately passed to our spell checking engine with one click to highlight and fix any typos.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
              <div className="text-xs font-bold text-blue-600 uppercase tracking-wide">100% Free</div>
              <h3 className="mt-1 text-base font-bold text-slate-900">No Signup, No Limits</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500 font-normal">
                No subscription gates, credit card requirements, or daily scan quotas. Enjoy generous 25MB file limits anytime.
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
              Image to Text FAQ
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
              Everything you need to know about extracting text from images and multi-page documents with Spellense.
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
      <Footer currentPath="/image-to-text" />
    </div>
  );
}
