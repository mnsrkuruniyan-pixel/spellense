"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";

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
    a: "Spellense supports JPG, JPEG, PNG, and WebP raster images, as well as multi-page PDF documents and Office files (DOCX, PPTX, XLSX). You can upload high-resolution screenshots, smartphone photos, scanned documents, and infographics with no registration required.",
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
  const [showImagePreview, setShowImagePreview] = useState(true);

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

  // Test with sample document
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
    <div
      style={{ backgroundColor: "#faf9f6" }}
      className="flex min-h-screen flex-col bg-[#faf9f6] font-sans text-slate-800 antialiased selection:bg-[#bcd5ff] selection:text-black relative z-10 text-[15px]"
    >
      {/* NAVBAR */}
      <Navbar onUploadClick={() => fileInputRef.current?.click()} />

      <main id="main-content" className="flex-1 pb-16 sm:pb-24">
        {/* HERO TITLE — EXACT HOMEPAGE TYPOGRAPHY MATCH */}
        <section className="relative overflow-hidden pt-3 sm:pt-6 pb-2">
          <div className="relative mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl text-center pt-2 sm:pt-4 pb-2">
              {/* EYEBROW FROM HOMEPAGE */}
              <div
                style={{
                  color: "#3158d5",
                  letterSpacing: "0.18em",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
                className="inline-flex items-center uppercase mb-3 sm:mb-4"
              >
                IMAGE TO TEXT CONVERTER
              </div>

              {/* TWO-PART EXPRESSIVE HEADING */}
              <h1
                aria-live="polite"
                className="text-center tracking-tight text-[#1c201a] flex flex-col items-center justify-center"
                style={{ margin: "0 auto" }}
              >
                <span
                  style={{
                    fontSize: "clamp(38px, 5.2vw, 68px)",
                    fontWeight: 900,
                    lineHeight: 1.05,
                    letterSpacing: "-0.035em",
                    color: "#1c201a",
                    display: "block",
                    fontFamily:
                      "var(--font-plus-jakarta-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  }}
                >
                  Extract text.
                </span>
                <span
                  style={{
                    fontFamily:
                      "'ITC Modern No. 216', var(--font-itc-modern), 'Instrument Serif', Georgia, serif",
                    fontSize: "clamp(32px, 4.4vw, 58px)",
                    fontWeight: 400,
                    fontStyle: "italic",
                    lineHeight: 1.05,
                    letterSpacing: "-0.01em",
                    color: "#1c201a",
                    display: "block",
                    marginTop: "6px",
                  }}
                >
                  From any photo or PDF.
                </span>
              </h1>

              {/* SUBTITLE */}
              <p
                style={{
                  color: "#70746d",
                  fontSize: "16px",
                  lineHeight: 1.55,
                  maxWidth: "560px",
                  margin: "18px auto 0",
                }}
                className="text-center font-normal"
              >
                Fast, private OCR that pulls clean, editable text from screenshots, scanned documents, and images. Zero data retention.
              </p>

              {/* PRIVACY PILL BADGE */}
              <div className="mt-4 flex items-center justify-center">
                <div
                  style={{
                    backgroundColor: "#ecfdf5",
                    borderColor: "#a7f3d0",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    color: "#047857",
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-2xs"
                >
                  <svg
                    className="w-3.5 h-3.5 text-emerald-600 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                  <span>100% private — processed locally with zero server storage</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* INTERACTIVE WORKSPACE SECTION */}
        <section className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 pb-16 mt-3 sm:mt-5">
          <div className="mx-auto w-full">
            {/* UPLOAD ERROR ALERT */}
            {uploadError && (
              <div
                style={{
                  borderColor: "#fecaca",
                  backgroundColor: "#fef2f2",
                  color: "#b91c1c",
                }}
                className="mb-4 rounded-2xl border p-4 text-xs sm:text-sm font-semibold shadow-xs flex items-center justify-between gap-3 animate-in fade-in duration-200"
              >
                <div className="flex items-center gap-2.5">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0 text-red-600"
                  >
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
                  title="Dismiss error"
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
              <div
                style={{
                  borderColor: "#e5e5df",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  backgroundColor: "#ffffff",
                }}
                className="rounded-2xl sm:rounded-[24px] p-10 sm:p-14 text-center shadow-xs animate-in fade-in duration-200"
              >
                <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-[#3158d5]/15 blur-xl animate-pulse" />
                  <div
                    style={{ backgroundColor: "#3158d5" }}
                    className="relative flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-md shadow-[#3158d5]/30"
                  >
                    <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                  </div>
                </div>

                <h2 className="mt-6 text-xl sm:text-2xl font-bold text-[#1c201a]">
                  Extracting copyable text...
                </h2>
                <p className="mt-2 text-xs sm:text-sm font-medium text-[#70746d]">
                  {extractingStep}
                </p>
                <div
                  style={{ backgroundColor: "#efeee7" }}
                  className="mx-auto mt-6 max-w-xs h-1.5 w-full rounded-full overflow-hidden"
                >
                  <div
                    style={{ backgroundColor: "#3158d5" }}
                    className="h-full rounded-full animate-pulse w-3/4"
                  />
                </div>
              </div>
            )}

            {/* STATE 2: NO FILE UPLOADED OR WAITING (EXACT HOMEPAGE SIZE & COMPACT LAYOUT) */}
            {!extracting && !hasExtracted && (
              <div
                style={{
                  borderColor: "#e5e5df",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  backgroundColor: "#ecebe4",
                  boxShadow: "none",
                }}
                className="relative w-full rounded-2xl sm:rounded-[24px] overflow-hidden"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
                  {/* LEFT COLUMN: CONTROLS & DROPZONE */}
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
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#3158d5]" />
                          <h2 className="text-xs sm:text-[13px] font-bold text-[#1c201a]">
                            Upload Document
                          </h2>
                        </div>
                        <span
                          style={{
                            backgroundColor: "#efeee7",
                            borderColor: "#e5e5df",
                            borderWidth: "1px",
                            borderStyle: "solid",
                            color: "#555a52",
                          }}
                          className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
                        >
                          Max 25 MB
                        </span>
                      </div>

                      {/* DASHED DROP ZONE */}
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
                        style={{
                          borderColor: isDragging ? "#3158d5" : "#deded6",
                          backgroundColor: isDragging ? "#f0f4fe" : "#f6f5f3",
                        }}
                        className={`mt-4 rounded-2xl border-2 border-dashed p-5 sm:p-6 text-center transition-all cursor-pointer ${
                          isDragging
                            ? "border-[#3158d5] bg-blue-50/70"
                            : "hover:border-[#3158d5]/50"
                        }`}
                      >
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
                          Drop your image or PDF here
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
                          JPG, PNG, WebP, PDF &amp; Office files · Up to 25 MB
                        </p>
                      </div>

                      {/* SAMPLE DOCUMENT BUTTON */}
                      <div className="mt-3.5 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLoadSample();
                          }}
                          disabled={loadingSample}
                          className="text-xs font-semibold text-[#1c201a] hover:underline inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          {loadingSample ? (
                            <span>Loading sample...</span>
                          ) : (
                            <>
                              <span>Try a sample document</span>
                              <span>→</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: SAMPLE OCR PREVIEW */}
                  <div
                    style={{ backgroundColor: "#ecebe4" }}
                    className="lg:col-span-7 p-3.5 sm:p-5 lg:p-7 flex flex-col justify-between"
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
                          <span>sample-document.png</span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8e928a]">
                          SAMPLE OCR PREVIEW
                        </span>
                      </div>

                      {/* DESKTOP LAYOUT (>= 1024px): EXACT HOMEPAGE MATCH */}
                      <div className="hidden lg:flex mt-5 flex-row items-start gap-6">
                        {/* ARTWORK CARD */}
                        <div
                          onClick={handleLoadSample}
                          style={{
                            width: "240px",
                            minWidth: "220px",
                            maxWidth: "250px",
                            flexShrink: 0,
                            borderColor: "#deded6",
                            borderWidth: "1px",
                            borderStyle: "solid",
                          }}
                          className="rounded-xl overflow-hidden shadow-xs bg-white cursor-pointer group/art transition hover:scale-[1.01]"
                          title="Click to run OCR on this sample"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src="/sample-document.png"
                            alt="Sample document for OCR text extraction"
                            className="w-full h-auto object-cover block"
                          />
                        </div>

                        {/* EXTRACTED TEXT OCR OUTPUT PREVIEW */}
                        <div className="flex-1 min-w-0 w-full flex flex-col justify-between self-stretch">
                          <div>
                            <div className="flex items-center gap-2 text-xs font-bold text-[#1c201a]">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                              <span>OCR Output</span>
                            </div>

                            <div
                              style={{ border: "2px solid #3158d5", backgroundColor: "#ffffff" }}
                              className="mt-3 rounded-xl p-3.5 shadow-xs"
                            >
                              <div className="text-[10px] font-bold uppercase tracking-wider text-[#8e928a]">
                                EXTRACTED TEXT
                              </div>
                              <div className="mt-1 text-xs font-bold text-[#1c201a] truncate">
                                SPELLENSE DEMO DOCUMENT
                              </div>
                              <p className="mt-1 text-[11px] font-mono text-[#555a52] leading-relaxed line-clamp-3">
                                Annual Design &amp; Marketing Brief...<br />
                                Welcome to the official review copy of our launch flyer. This document demonstrates our layout standards.
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 pt-1">
                            <p className="text-[11.5px] font-medium text-[#767a74] text-center flex items-center justify-center gap-1.5">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                                <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z" />
                                <path d="m9 12 2 2 4-4" />
                              </svg>
                              <span>In-memory OCR &bull; Zero data retention</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* MOBILE & TABLET LAYOUT (< 1024px): EXACT HOMEPAGE MATCH */}
                      <div className="block lg:hidden mt-3.5 sm:mt-5">
                        <div className="flex flex-row items-start gap-3 sm:gap-4">
                          <div
                            onClick={handleLoadSample}
                            style={{
                              width: "38%",
                              minWidth: "120px",
                              maxWidth: "165px",
                              flexShrink: 0,
                              borderColor: "#deded6",
                              borderWidth: "1px",
                              borderStyle: "solid",
                            }}
                            className="rounded-xl overflow-hidden shadow-xs bg-white cursor-pointer group/art transition hover:scale-[1.01]"
                            title="Click to run OCR on this sample"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src="/sample-document.png"
                              alt="Sample document for OCR text extraction"
                              className="w-full h-auto object-cover block"
                            />
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
                            <div>
                              <div className="flex items-center gap-1.5 text-xs font-bold text-[#1c201a]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                <span>OCR Output</span>
                              </div>

                              <div
                                style={{ border: "2px solid #3158d5", backgroundColor: "#ffffff" }}
                                className="mt-2 rounded-xl p-2.5 sm:p-3 shadow-xs"
                              >
                                <div className="text-[9px] font-bold uppercase tracking-wider text-[#8e928a]">
                                  EXTRACTED TEXT
                                </div>
                                <div className="mt-0.5 text-xs font-bold text-[#1c201a] truncate">
                                  SPELLENSE DEMO
                                </div>
                                <p className="mt-0.5 text-[10px] font-mono text-[#555a52] leading-tight line-clamp-2">
                                  Annual Design Brief...
                                </p>
                              </div>
                            </div>

                            <div className="mt-2.5">
                              <p className="text-[10px] font-medium text-[#767a74] text-center flex items-center justify-center gap-1">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                                  <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z" />
                                  <path d="m9 12 2 2 4-4" />
                                </svg>
                                <span>In-memory OCR &bull; Zero data retention</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STATE 3: EXTRACTED OUTPUT PANEL */}
            {!extracting && hasExtracted && (
              <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
                {/* FILE STATUS BAR */}
                <div
                  style={{
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    backgroundColor: "#ffffff",
                  }}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      style={{
                        backgroundColor: "#e8effe",
                        borderColor: "#bcd5ff",
                        borderWidth: "1px",
                        borderStyle: "solid",
                        color: "#3158d5",
                      }}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    >
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
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-xs sm:text-sm font-bold text-[#1c201a]">
                          {file?.name || "Uploaded Document"}
                        </span>
                        {file && (
                          <span className="shrink-0 text-[10px] font-semibold text-[#70746d]">
                            ({(file.size / 1024).toFixed(0)} KB)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-medium text-emerald-600 flex items-center gap-1.5 mt-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span>OCR Extraction Complete</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {previewUrl && (
                      <button
                        type="button"
                        onClick={() => setShowImagePreview(!showImagePreview)}
                        style={{
                          backgroundColor: "#faf9f6",
                          borderColor: "#e5e5df",
                          borderWidth: "1px",
                          borderStyle: "solid",
                          color: "#1c201a",
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold shadow-2xs transition hover:bg-[#efeee7] cursor-pointer"
                      >
                        <span>{showImagePreview ? "Hide image" : "Show image"}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleReset}
                      style={{
                        backgroundColor: "#ffffff",
                        borderColor: "#e5e5df",
                        borderWidth: "1px",
                        borderStyle: "solid",
                        color: "#1c201a",
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold shadow-2xs transition hover:bg-[#efeee7] cursor-pointer"
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
                      >
                        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                      </svg>
                      <span>Extract another</span>
                    </button>
                  </div>
                </div>

                {/* NO TEXT DETECTED ALERT */}
                {noTextDetected ? (
                  <div
                    style={{
                      borderColor: "#fde68a",
                      backgroundColor: "#fffbeb",
                    }}
                    className="rounded-2xl sm:rounded-[24px] border p-8 text-center shadow-xs"
                  >
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
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
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-[#1c201a]">
                      No readable English text was detected
                    </h3>
                    <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm text-[#70746d] leading-relaxed font-normal">
                      We could not recognize clear letterforms in this document. Please ensure the document is clear, well-lit, has legible contrast, and is not blurred.
                    </p>
                    <div className="mt-5">
                      <button
                        type="button"
                        onClick={handleReset}
                        style={{ backgroundColor: "#3158d5", color: "#ffffff" }}
                        className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold shadow-md hover:bg-[#2546b8] transition cursor-pointer"
                      >
                        <span>Upload a different image</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* EXTRACTED TEXT PANEL */
                  <div
                    style={{
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      backgroundColor: "#ffffff",
                    }}
                    className="rounded-2xl sm:rounded-[24px] p-5 sm:p-7 shadow-xs"
                  >
                    {/* HEADER ROW */}
                    <div
                      style={{ borderBottom: "1px solid #e5e5df" }}
                      className="flex flex-wrap items-center justify-between gap-3 pt-1 pb-4 mb-4"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#3158d5]" />
                        <span className="text-xs font-bold uppercase tracking-wider text-[#1c201a]">
                          Extracted Text
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-medium text-[#70746d]">
                        <span>
                          <strong className="text-[#1c201a] font-bold">{stats.words}</strong> words
                        </span>
                        <span>•</span>
                        <span>
                          <strong className="text-[#1c201a] font-bold">{stats.chars}</strong> chars
                        </span>
                        <span>•</span>
                        <span>
                          <strong className="text-[#1c201a] font-bold">{stats.lines}</strong> lines
                        </span>
                      </div>
                    </div>

                    {/* MAIN WORKSPACE GRID: OPTIONAL IMAGE PREVIEW + TEXTAREA */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                      {previewUrl && showImagePreview && (
                        <div
                          style={{
                            borderColor: "#e5e5df",
                            borderWidth: "1px",
                            borderStyle: "solid",
                            backgroundColor: "#faf9f6",
                          }}
                          className="lg:col-span-5 rounded-xl overflow-hidden p-2.5 shadow-2xs"
                        >
                          <div className="text-[11px] font-bold text-[#70746d] mb-1.5 px-1 flex items-center justify-between">
                            <span>Original Document</span>
                            <span className="text-[10px] text-emerald-600 font-semibold">1:1 Reference</span>
                          </div>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={previewUrl}
                            alt="Original uploaded document preview"
                            className="w-full h-auto max-h-[340px] object-contain rounded-lg bg-white"
                          />
                        </div>
                      )}

                      <div className={previewUrl && showImagePreview ? "lg:col-span-7" : "lg:col-span-12"}>
                        <textarea
                          ref={outputTextareaRef}
                          value={extractedText}
                          onChange={(e) => setExtractedText(e.target.value)}
                          rows={14}
                          placeholder="Extracted text will appear here..."
                          style={{
                            borderColor: "#e5e5df",
                            borderWidth: "1px",
                            borderStyle: "solid",
                            backgroundColor: "#fdfcf9",
                            color: "#1c201a",
                          }}
                          className="w-full resize-y rounded-xl p-4 text-xs sm:text-sm leading-relaxed outline-none transition focus:border-[#3158d5] focus:bg-white focus:ring-2 focus:ring-[#3158d5]/15 font-mono sm:font-sans"
                        />
                      </div>
                    </div>

                    {/* ACTIONS BAR */}
                    <div
                      style={{ borderTop: "1px solid #efeee7" }}
                      className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        {/* COPY BUTTON */}
                        <button
                          type="button"
                          onClick={handleCopy}
                          style={{
                            backgroundColor: copied ? "#059669" : "#ffffff",
                            borderColor: copied ? "#059669" : "#e5e5df",
                            borderWidth: "1px",
                            borderStyle: "solid",
                            color: copied ? "#ffffff" : "#1c201a",
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer shadow-2xs hover:bg-[#faf9f6]"
                        >
                          {copied ? (
                            <>
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              <span>Copied to Clipboard!</span>
                            </>
                          ) : (
                            <>
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="text-[#70746d]"
                              >
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                              <span>Copy text</span>
                            </>
                          )}
                        </button>

                        {/* DOWNLOAD BUTTON */}
                        <button
                          type="button"
                          onClick={handleDownload}
                          style={{
                            backgroundColor: "#ffffff",
                            borderColor: "#e5e5df",
                            borderWidth: "1px",
                            borderStyle: "solid",
                            color: "#1c201a",
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold shadow-2xs hover:bg-[#faf9f6] transition-all cursor-pointer"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-[#70746d]"
                          >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          <span>Download .txt</span>
                        </button>
                      </div>

                      {/* SPELLCHECK CTA BUTTON */}
                      <button
                        type="button"
                        onClick={handleRunSpellcheck}
                        style={{
                          backgroundColor: "#3158d5",
                          color: "#ffffff",
                        }}
                        className="inline-flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold shadow-md shadow-[#3158d5]/20 hover:bg-[#2546b8] active:scale-95 transition-all cursor-pointer"
                      >
                        <span>Found a typo? Run spellcheck on this text</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                )}


              </div>
            )}
          </div>
        </section>

        {/* EXPLANATORY SEO & PRODUCT SECTIONS (HOMEPAGE MATCH - PERFECTLY ALIGNED) */}
        <section
          style={{
            marginTop: "32px",
            paddingTop: "16px",
          }}
          className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 w-full pb-28 sm:pb-32"
        >
          <div className="mx-auto max-w-[980px] w-full space-y-4 sm:space-y-6">
            {/* SECTION 1: INTRO */}
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
                <h2 className="text-xl sm:text-2xl font-black text-[#1c201a] tracking-tight">
                  Convert Photos, Scans, and PDFs into Clean Editable Text
                </h2>
                <p className="mt-2.5 text-xs sm:text-sm text-[#575a53] leading-relaxed font-normal">
                  Spellense Optical Character Recognition (OCR) converts flattened images, screenshots, smartphone pictures, and multi-page scanned PDF documents into selectable, copyable digital text with zero data retention and no sign-up required.
                </p>
              </div>
            </ScrollReveal>

            {/* SECTION 2: 3-STEP WORKFLOW */}
            <ScrollReveal delay={50}>
              <div
                style={{
                  borderColor: "#e5e5df",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  backgroundColor: "#ffffff",
                }}
                className="rounded-2xl sm:rounded-[24px] p-6 sm:p-8 shadow-2xs"
              >
                <h2 className="text-xl sm:text-2xl font-black text-[#1c201a] tracking-tight mb-2.5">
                  How to Extract Text in 3 Easy Steps
                </h2>
                <p className="text-xs sm:text-sm text-[#575a53] leading-relaxed mb-6 font-normal">
                  Effortlessly transform screenshots, photos, and scanned PDF documents into editable text in seconds:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
                  {/* Step 1 */}
                  <div
                    style={{
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      backgroundColor: "#faf9f6",
                      padding: "20px",
                    }}
                    className="rounded-2xl flex flex-col justify-between"
                  >
                    <div>
                      <div
                        style={{
                          backgroundColor: "#f6f5f3",
                          borderColor: "#e5e5df",
                          borderWidth: "1px",
                          borderStyle: "solid",
                          color: "#3158d5",
                        }}
                        className="flex h-10 w-10 items-center justify-center rounded-xl mb-3 shadow-2xs shrink-0 font-black text-sm"
                      >
                        1
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-[#1c201a] mb-1.5">
                        Upload Image or PDF
                      </h3>
                      <p className="text-xs sm:text-sm text-[#575a53] leading-relaxed font-normal">
                        Drop any JPG, PNG, WebP image, or multi-page scanned PDF up to 25MB. No account, registration, or credit card required.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div
                    style={{
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      backgroundColor: "#faf9f6",
                      padding: "20px",
                    }}
                    className="rounded-2xl flex flex-col justify-between"
                  >
                    <div>
                      <div
                        style={{
                          backgroundColor: "#f6f5f3",
                          borderColor: "#e5e5df",
                          borderWidth: "1px",
                          borderStyle: "solid",
                          color: "#3158d5",
                        }}
                        className="flex h-10 w-10 items-center justify-center rounded-xl mb-3 shadow-2xs shrink-0 font-black text-sm"
                      >
                        2
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-[#1c201a] mb-1.5">
                        In-Memory Optical Scan
                      </h3>
                      <p className="text-xs sm:text-sm text-[#575a53] leading-relaxed font-normal">
                        High-accuracy OCR scans letterforms and pixel matrices, extracting text tokens while preserving original paragraphs and line breaks.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div
                    style={{
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      backgroundColor: "#faf9f6",
                      padding: "20px",
                    }}
                    className="rounded-2xl flex flex-col justify-between"
                  >
                    <div>
                      <div
                        style={{
                          backgroundColor: "#f6f5f3",
                          borderColor: "#e5e5df",
                          borderWidth: "1px",
                          borderStyle: "solid",
                          color: "#3158d5",
                        }}
                        className="flex h-10 w-10 items-center justify-center rounded-xl mb-3 shadow-2xs shrink-0 font-black text-sm"
                      >
                        3
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-[#1c201a] mb-1.5">
                        Copy, Save, or Proofread
                      </h3>
                      <p className="text-xs sm:text-sm text-[#575a53] leading-relaxed font-normal">
                        Copy to clipboard with one click, save as a clean .txt file, or carry directly into our proofreading engine to catch hidden typos.
                      </p>
                    </div>
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
                <div className="max-w-2xl mb-6">
                  <div
                    style={{ color: "#3158d5" }}
                    className="text-xs font-bold uppercase tracking-wider mb-1"
                  >
                    Built for Speed &amp; Accuracy
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-[#1c201a] tracking-tight">
                    Why Use Spellense Image to Text Converter?
                  </h2>
                  <p className="mt-1.5 text-xs sm:text-sm text-[#575a53] leading-relaxed font-normal">
                    Engineered for graphic designers, researchers, students, and professionals who need accurate text extraction without privacy compromises.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div
                    style={{
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      backgroundColor: "#faf9f6",
                      padding: "18px",
                    }}
                    className="rounded-2xl space-y-1.5"
                  >
                    <div className="text-xs font-bold text-[#3158d5] uppercase tracking-wide">
                      Optical Precision
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[#1c201a]">
                      High-Resolution OCR
                    </h3>
                    <p className="text-xs text-[#575a53] leading-relaxed font-normal">
                      Recognizes text from varied font families, contrast ratios, and complex flyer layouts with state-of-the-art accuracy.
                    </p>
                  </div>

                  <div
                    style={{
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      backgroundColor: "#faf9f6",
                      padding: "18px",
                    }}
                    className="rounded-2xl space-y-1.5"
                  >
                    <div className="text-xs font-bold text-[#3158d5] uppercase tracking-wide">
                      Strict Privacy
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[#1c201a]">
                      Zero Server Storage
                    </h3>
                    <p className="text-xs text-[#575a53] leading-relaxed font-normal">
                      100% ephemeral in-memory RAM processing. Your confidential screenshots, receipts, or contracts are never stored to disk or used for AI training.
                    </p>
                  </div>

                  <div
                    style={{
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      backgroundColor: "#faf9f6",
                      padding: "18px",
                    }}
                    className="rounded-2xl space-y-1.5"
                  >
                    <div className="text-xs font-bold text-[#3158d5] uppercase tracking-wide">
                      Structure Retention
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[#1c201a]">
                      Paragraph &amp; Line Breaks
                    </h3>
                    <p className="text-xs text-[#575a53] leading-relaxed font-normal">
                      Unlike primitive OCR engines that bunch text into a single messy block, Spellense retains your original line breaks.
                    </p>
                  </div>

                  <div
                    style={{
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      backgroundColor: "#faf9f6",
                      padding: "18px",
                    }}
                    className="rounded-2xl space-y-1.5"
                  >
                    <div className="text-xs font-bold text-[#3158d5] uppercase tracking-wide">
                      PDF Support
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[#1c201a]">
                      Scanned PDFs Handled
                    </h3>
                    <p className="text-xs text-[#575a53] leading-relaxed font-normal">
                      Easily convert scanned multi-page PDF documents without native text layers directly into plain text without external software.
                    </p>
                  </div>

                  <div
                    style={{
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      backgroundColor: "#faf9f6",
                      padding: "18px",
                    }}
                    className="rounded-2xl space-y-1.5"
                  >
                    <div className="text-xs font-bold text-[#3158d5] uppercase tracking-wide">
                      Seamless Workflow
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[#1c201a]">
                      One-Click Proofreading
                    </h3>
                    <p className="text-xs text-[#575a53] leading-relaxed font-normal">
                      Extracted text can be immediately passed to our spell checking engine with one click to highlight and fix any typos.
                    </p>
                  </div>

                  <div
                    style={{
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      backgroundColor: "#faf9f6",
                      padding: "18px",
                    }}
                    className="rounded-2xl space-y-1.5"
                  >
                    <div className="text-xs font-bold text-[#3158d5] uppercase tracking-wide">
                      100% Free
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[#1c201a]">
                      No Signup, No Limits
                    </h3>
                    <p className="text-xs text-[#575a53] leading-relaxed font-normal">
                      No subscription gates, credit card requirements, or daily scan quotas. Enjoy generous 25MB file limits anytime.
                    </p>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* SECTION 4: FAQ SECTION — 2-Column Clean Layout (HOMEPAGE MATCH) */}
            <div
              style={{
                borderTop: "1px solid #e5e5df",
                marginTop: "48px",
                paddingTop: "48px",
                marginBottom: "48px",
              }}
              className="w-full pb-12 sm:pb-20"
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
                    Image to Text FAQ
                  </h2>
                  <p className="mt-2 text-xs sm:text-sm text-[#70746d] leading-relaxed font-normal">
                    Everything you need to know about extracting text from images, photos, and scanned documents with Spellense.
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
                            <span className="text-sm sm:text-base font-bold text-[#1c201a] pr-2">
                              {faq.q}
                            </span>
                            <span
                              className={`ml-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[#70746d] transition-transform duration-200 ${
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

            {/* SECTION 5: RELATED CREATIVE TOOLS */}
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
                    href="/print-sheet-maker"
                    style={{
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      backgroundColor: "#faf9f6",
                    }}
                    className="group p-5 rounded-2xl hover:border-[#3158d5] hover:bg-white shadow-2xs transition"
                  >
                    <div className="text-xs font-bold text-[#3158d5] uppercase mb-1">
                      ID &amp; Photo Layout
                    </div>
                    <div className="font-bold text-[#1c201a] group-hover:text-[#3158d5] transition">
                      ID Print Maker
                    </div>
                    <p className="mt-1 text-xs text-[#70746d]">
                      Fit photos and ID cards on one A4 or custom page at exact physical mm scale.
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
                      Visual Optimization
                    </div>
                    <div className="font-bold text-[#1c201a] group-hover:text-[#3158d5] transition">
                      Image Compressor
                    </div>
                    <p className="mt-1 text-xs text-[#70746d]">
                      Lossless &amp; lossy image compression with side-by-side comparison slider.
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
                </div>
              </div>
            </ScrollReveal>

            {/* FOOTER ACTION LINKS (MATCHES HOMEPAGE) */}
            <ScrollReveal delay={180} style={{ borderTop: "1px solid #e5e5df" }} className="mt-12 flex flex-wrap items-center justify-between gap-4 pt-8 text-xs text-slate-500">
              <div className="flex flex-wrap items-center gap-5 font-medium">
                <Link href="/faq" className="hover:text-[#3158d5] transition">
                  Frequently Asked Questions →
                </Link>
                <Link href="/privacy" className="hover:text-[#3158d5] transition">
                  Zero-Storage Privacy Policy →
                </Link>
                <Link href="/about" className="hover:text-[#3158d5] transition">
                  About Spellense →
                </Link>
              </div>

              <div className="text-slate-400">
                In-memory OCR &bull; High Precision
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <Footer currentPath="/image-to-text" />
    </div>
  );
}
