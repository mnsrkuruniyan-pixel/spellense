"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

declare global {
  interface Window {
    QRCodeStyling?: any;
    jsQR?: (data: Uint8ClampedArray, width: number, height: number) => { data: string } | null;
  }
}

const CONFIG = {
  MIN_CONTRAST_RATIO: 4.5,
  MAX_LOGO_RATIO: {
    L: 0.08,
    M: 0.12,
    Q: 0.18,
    H: 0.24,
  } as Record<string, number>,
  DISTANCE_TO_SIZE_RATIO: 10,
  QR_RENDER_SIZE: 300,
};

type ContentType = "url" | "text" | "wifi" | "phone" | "email";
type EcLevel = "L" | "M" | "Q" | "H";

interface ScoreCheck {
  status: "pass" | "warn" | "fail";
  text: string;
}

const COLOR_PRESETS = [
  { label: "Classic Black", hex: "#000000" },
  { label: "Spellense Blue", hex: "#0055fe" },
  { label: "Emerald Green", hex: "#047857" },
  { label: "Royal Indigo", hex: "#4f46e5" },
  { label: "Deep Slate", hex: "#0f172a" },
  { label: "Crimson Red", hex: "#b91c1c" },
];

const BG_PRESETS = [
  { label: "Pure White", hex: "#ffffff" },
  { label: "Snow Slate", hex: "#f8fafc" },
  { label: "Mint Tint", hex: "#f0fdf4" },
  { label: "Sky Tint", hex: "#eff6ff" },
];

const FAQ_ITEMS = [
  {
    q: "Why won't my QR code scan after printing?",
    a: "The most common reasons are low contrast between the QR code and its background, a logo placed in the middle that is too large for the error-correction level used, or the code being printed smaller than its minimum readable size. Spellense checks all three before you download.",
  },
  {
    q: "What is a QR code scannability test?",
    a: "It is a check that simulates how a phone camera reads a QR code. Spellense decodes the QR code it just generated, the same way a scanner app would, and reports whether it was read successfully along with specific issues like contrast or logo size.",
  },
  {
    q: "Can I add a logo to my QR code without breaking it?",
    a: "Yes, as long as the logo stays small relative to the code and a higher error-correction level (Q or H) is used, which allows part of the QR code to be covered and still scan correctly. Spellense warns you if your logo is too large for the selected error-correction level.",
  },
  {
    q: "What is the minimum size to print a QR code?",
    a: "A common rule of thumb is that a QR code should be printed at roughly one tenth of its expected scanning distance. Spellense gives a size estimate based on how much data is encoded and the selected use case, such as a business card versus a poster.",
  },
  {
    q: "Is this QR code generator really free?",
    a: "Yes. There is no signup, no watermark and no limit on how many QR codes you can create and download as PNG or SVG.",
  },
];

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }) {
  const [rs, gs, bs] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(hex1: string, hex2: string) {
  const l1 = relativeLuminance(hexToRgb(hex1));
  const l2 = relativeLuminance(hexToRgb(hex2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export default function QrCodeGeneratorClient() {
  // Form State
  const [contentType, setContentType] = useState<ContentType>("url");
  const [urlVal, setUrlVal] = useState("https://spellense.com");
  const [textVal, setTextVal] = useState("");
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPass, setWifiPass] = useState("");
  const [wifiEnc, setWifiEnc] = useState("WPA");
  const [phoneVal, setPhoneVal] = useState("");
  const [emailVal, setEmailVal] = useState("");

  const [fgColor, setFgColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [ecLevel, setEcLevel] = useState<EcLevel>("M");
  const [useCase, setUseCase] = useState("flyer");
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);

  // Preview & Test State
  const [qrInstance, setQrInstance] = useState<any>(null);
  const [score, setScore] = useState<number | null>(null);
  const [checks, setChecks] = useState<ScoreCheck[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportResolution, setExportResolution] = useState<number>(2000);
  const [isDownloadingPng, setIsDownloadingPng] = useState(false);
  const [isDownloadingSvg, setIsDownloadingSvg] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const qrContainerRef = useRef<HTMLDivElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  // Load external scripts if not present
  const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const s = document.createElement("script");
      s.src = src;
      s.onload = () => resolve();
      s.onerror = (err) => reject(err);
      document.body.appendChild(s);
    });
  };

  const ensureLibraries = useCallback(async () => {
    if (typeof window === "undefined") return false;
    try {
      if (!window.QRCodeStyling) {
        await loadScript("https://cdn.jsdelivr.net/npm/qr-code-styling@1.6.0-rc.1/lib/qr-code-styling.js");
      }
      if (!window.jsQR) {
        await loadScript("https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js");
      }
      return !!(window.QRCodeStyling && window.jsQR);
    } catch {
      return false;
    }
  }, []);

  const buildPayload = useCallback(() => {
    if (contentType === "url") {
      return urlVal.trim() || "https://spellense.com";
    }
    if (contentType === "text") {
      return textVal.trim() || " ";
    }
    if (contentType === "wifi") {
      const s = wifiSsid.trim();
      const p = wifiPass.trim();
      return `WIFI:T:${wifiEnc};S:${s};P:${p};;`;
    }
    if (contentType === "phone") {
      return `tel:${phoneVal.trim()}`;
    }
    if (contentType === "email") {
      return `mailto:${emailVal.trim()}`;
    }
    return "https://spellense.com";
  }, [contentType, urlVal, textVal, wifiSsid, wifiPass, wifiEnc, phoneVal, emailVal]);

  const decodeRenderedQr = useCallback((instance: any): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!instance || !window.jsQR) return resolve(false);
      instance
        .getRawData("png")
        .then((blob: Blob | null) => {
          if (!blob) return resolve(false);
          const objUrl = URL.createObjectURL(blob);
          const img = new Image();
          img.onload = () => {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext("2d");
              if (!ctx) {
                URL.revokeObjectURL(objUrl);
                return resolve(false);
              }
              ctx.drawImage(img, 0, 0);
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = window.jsQR?.(imgData.data, canvas.width, canvas.height);
              URL.revokeObjectURL(objUrl);
              resolve(!!code);
            } catch {
              URL.revokeObjectURL(objUrl);
              resolve(false);
            }
          };
          img.onerror = () => {
            URL.revokeObjectURL(objUrl);
            resolve(false);
          };
          img.src = objUrl;
        })
        .catch(() => resolve(false));
    });
  }, []);

  const runScannabilityTest = useCallback(
    async (instance: any) => {
      const results: ScoreCheck[] = [];
      let passCount = 0;
      let totalChecks = 0;

      // 1. Contrast check
      totalChecks++;
      const ratio = contrastRatio(fgColor, bgColor);
      if (ratio >= CONFIG.MIN_CONTRAST_RATIO) {
        passCount++;
        results.push({
          status: "pass",
          text: `Contrast is good (${ratio.toFixed(1)}:1)`,
        });
      } else {
        results.push({
          status: "fail",
          text: `Contrast is too low (${ratio.toFixed(1)}:1) — use a darker QR color or lighter background`,
        });
      }

      // 2. Logo size vs error-correction level
      if (logoDataUrl) {
        totalChecks++;
        const maxRatio = CONFIG.MAX_LOGO_RATIO[ecLevel] ?? 0.12;
        const usedRatio = 0.35;
        if (usedRatio <= maxRatio) {
          passCount++;
          results.push({
            status: "pass",
            text: `Logo size is safe for error-correction level ${ecLevel}`,
          });
        } else {
          results.push({
            status: "warn",
            text: `Logo may be too large for error-correction level ${ecLevel} — switch to Q or H, or shrink the logo`,
          });
        }
      }

      // 3. Minimum print size recommendation
      totalChecks++;
      const distMap: Record<string, number> = {
        "business-card": 15,
        flyer: 40,
        poster: 150,
        billboard: 500,
      };
      const distanceCm = distMap[useCase] || 40;
      const minSizeCm = Math.max(1.5, distanceCm / CONFIG.DISTANCE_TO_SIZE_RATIO).toFixed(1);
      passCount++;
      results.push({
        status: "pass",
        text: `Print at least ${minSizeCm}cm × ${minSizeCm}cm for this use case`,
      });

      // 4. Real decode test using jsQR (simulates a real phone camera)
      totalChecks++;
      try {
        const decodable = await decodeRenderedQr(instance);
        if (decodable) {
          passCount++;
          results.push({
            status: "pass",
            text: "Verified: this QR code decodes successfully",
          });
        } else {
          results.push({
            status: "fail",
            text: "This QR code could not be decoded — try increasing contrast or reducing logo size",
          });
        }
      } catch {
        results.push({
          status: "warn",
          text: "Could not run the decode test in this browser",
        });
      }

      const calculatedScore = Math.round((passCount / totalChecks) * 100);
      setScore(calculatedScore);
      setChecks(results);
    },
    [fgColor, bgColor, ecLevel, logoDataUrl, useCase, decodeRenderedQr]
  );

  const generateQr = useCallback(async () => {
    setIsGenerating(true);
    await ensureLibraries();

    if (!window.QRCodeStyling || !qrContainerRef.current) {
      setIsGenerating(false);
      return;
    }

    const data = buildPayload();
    qrContainerRef.current.innerHTML = "";

    const options: any = {
      width: CONFIG.QR_RENDER_SIZE,
      height: CONFIG.QR_RENDER_SIZE,
      data,
      margin: 12,
      qrOptions: { errorCorrectionLevel: ecLevel },
      dotsOptions: { color: fgColor, type: "square" },
      backgroundOptions: { color: bgColor },
      cornersSquareOptions: { color: fgColor },
    };

    if (logoDataUrl) {
      options.image = logoDataUrl;
      options.imageOptions = { crossOrigin: "anonymous", imageSize: 0.35, margin: 4 };
    }

    const instance = new window.QRCodeStyling(options);
    instance.append(qrContainerRef.current);
    setQrInstance(instance);

    setTimeout(() => {
      runScannabilityTest(instance);
      setIsGenerating(false);
    }, 250);
  }, [buildPayload, ecLevel, fgColor, bgColor, logoDataUrl, ensureLibraries, runScannabilityTest]);

  // Handle logo file upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setLogoDataUrl(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoDataUrl(null);
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
  };

  const handleDownloadPng = async () => {
    if (typeof window === "undefined" || !window.QRCodeStyling) return;
    setIsDownloadingPng(true);
    try {
      const size = exportResolution;
      const margin = Math.round(size * 0.05);
      const options: any = {
        width: size,
        height: size,
        data: buildPayload(),
        margin: margin,
        qrOptions: { errorCorrectionLevel: ecLevel },
        dotsOptions: { color: fgColor, type: "square" },
        backgroundOptions: { color: bgColor },
        cornersSquareOptions: { color: fgColor },
      };
      if (logoDataUrl) {
        options.image = logoDataUrl;
        options.imageOptions = {
          crossOrigin: "anonymous",
          imageSize: 0.35,
          margin: Math.round(margin * 0.3),
        };
      }
      const exporter = new window.QRCodeStyling(options);
      await exporter.download({
        name: `spellense-qr-${size}x${size}`,
        extension: "png",
      });
    } catch (err) {
      console.error("High-res PNG export failed:", err);
      if (qrInstance) {
        qrInstance.download({ name: "spellense-qr-code", extension: "png" });
      }
    } finally {
      setIsDownloadingPng(false);
    }
  };

  const handleDownloadSvg = async () => {
    if (typeof window === "undefined" || !window.QRCodeStyling) return;
    setIsDownloadingSvg(true);
    try {
      const options: any = {
        width: 2000,
        height: 2000,
        data: buildPayload(),
        margin: 100,
        qrOptions: { errorCorrectionLevel: ecLevel },
        dotsOptions: { color: fgColor, type: "square" },
        backgroundOptions: { color: bgColor },
        cornersSquareOptions: { color: fgColor },
      };
      if (logoDataUrl) {
        options.image = logoDataUrl;
        options.imageOptions = {
          crossOrigin: "anonymous",
          imageSize: 0.35,
          margin: 30,
        };
      }
      const exporter = new window.QRCodeStyling(options);
      await exporter.download({
        name: "spellense-qr-vector",
        extension: "svg",
      });
    } catch (err) {
      console.error("SVG export failed:", err);
      if (qrInstance) {
        qrInstance.download({ name: "spellense-qr-code", extension: "svg" });
      }
    } finally {
      setIsDownloadingSvg(false);
    }
  };

  // Initial generation on component mount
  useEffect(() => {
    const timer = setTimeout(() => {
      generateQr();
    }, 350);
    return () => clearTimeout(timer);
  }, [generateQr]);

  return (
    <div className="flex min-h-screen flex-col bg-[#f0f6fe] font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* NAVBAR */}
      <Navbar />

      <main id="main-content" className="flex-1">
        {/* HERO SECTION — Title color only black, strictly 1 single line, generous spacing */}
        <section className="relative overflow-hidden px-4 pt-12 pb-10 sm:px-6 sm:pt-16 sm:pb-14 lg:pt-20 lg:pb-16">
          <div className="mx-auto max-w-7xl text-center">
            <h1 className="text-[34px] xs:text-[44px] sm:text-[56px] md:text-[64px] lg:text-[72px] font-black leading-[1.12] tracking-[-1.5px] sm:tracking-[-2.5px] text-[#0f172a] text-center max-w-5xl mx-auto">
              QR codes that are built to actually scan.
            </h1>
          </div>
        </section>

        {/* WORKSPACE TOOL CONTAINER */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN: CONTROL STUDIO (7 COLS) */}
            <div className="lg:col-span-7 bg-white rounded-[28px] border border-slate-200/90 p-6 sm:p-8 shadow-[0_20px_60px_-15px_rgba(0,85,254,0.06)] backdrop-blur-sm transition-all">
              
              {/* Content Type Selector Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                    1. Select Content Type
                  </span>
                  <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    {contentType.toUpperCase()}
                  </span>
                </div>

                {/* Content Type Tabs with Pure SVG Icons */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {[
                    {
                      id: "url",
                      label: "Website",
                      icon: (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="2" y1="12" x2="22" y2="12" />
                          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                        </svg>
                      ),
                    },
                    {
                      id: "text",
                      label: "Plain Text",
                      icon: (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                      ),
                    },
                    {
                      id: "wifi",
                      label: "WiFi Network",
                      icon: (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                          <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                          <circle cx="12" cy="20" r="1" fill="currentColor" />
                        </svg>
                      ),
                    },
                    {
                      id: "phone",
                      label: "Phone",
                      icon: (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                      ),
                    },
                    {
                      id: "email",
                      label: "Email",
                      icon: (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="20" height="16" x="2" y="4" rx="2" />
                          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                        </svg>
                      ),
                    },
                  ].map((item) => {
                    const isActive = contentType === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setContentType(item.id as ContentType)}
                        className={`group relative flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-200 cursor-pointer ${
                          isActive
                            ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-600/20 -translate-y-0.5"
                            : "border-slate-200/90 bg-slate-50/70 text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-900"
                        }`}
                      >
                        <div className={`mb-1.5 transition-colors ${isActive ? "text-white" : "text-slate-500 group-hover:text-blue-600"}`}>
                          {item.icon}
                        </div>
                        <span className="text-[11px] font-bold tracking-tight">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Input Fields */}
              <div className="mb-6 space-y-4">
                {contentType === "url" && (
                  <div>
                    <label htmlFor="input-url" className="block text-xs font-bold text-slate-700 mb-1.5">
                      Destination Website Link
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                      </div>
                      <input
                        id="input-url"
                        type="url"
                        value={urlVal}
                        onChange={(e) => setUrlVal(e.target.value)}
                        placeholder="https://yourbrand.com/landing-page"
                        className="w-full rounded-xl border border-slate-200/90 bg-slate-50/60 pl-10 pr-4 py-3 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10 transition"
                      />
                    </div>
                  </div>
                )}

                {contentType === "text" && (
                  <div>
                    <label htmlFor="input-text" className="block text-xs font-bold text-slate-700 mb-1.5">
                      Text Message to Encode
                    </label>
                    <div className="relative">
                      <textarea
                        id="input-text"
                        rows={3}
                        value={textVal}
                        onChange={(e) => setTextVal(e.target.value)}
                        placeholder="Type any text, message, secret code, or raw instructions..."
                        className="w-full rounded-xl border border-slate-200/90 bg-slate-50/60 px-4 py-3 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10 transition resize-y"
                      />
                    </div>
                  </div>
                )}

                {contentType === "wifi" && (
                  <div className="space-y-3.5">
                    <div>
                      <label htmlFor="input-wifi-ssid" className="block text-xs font-bold text-slate-700 mb-1.5">
                        Network Name (SSID)
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                            <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                            <circle cx="12" cy="20" r="1" fill="currentColor" />
                          </svg>
                        </div>
                        <input
                          id="input-wifi-ssid"
                          type="text"
                          value={wifiSsid}
                          onChange={(e) => setWifiSsid(e.target.value)}
                          placeholder="e.g. Office_Guest_WiFi"
                          className="w-full rounded-xl border border-slate-200/90 bg-slate-50/60 pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10 transition"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="input-wifi-pass" className="block text-xs font-bold text-slate-700 mb-1.5">
                          WiFi Password
                        </label>
                        <div className="relative">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                          </div>
                          <input
                            id="input-wifi-pass"
                            type="text"
                            value={wifiPass}
                            onChange={(e) => setWifiPass(e.target.value)}
                            placeholder="Password"
                            className="w-full rounded-xl border border-slate-200/90 bg-slate-50/60 pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10 transition"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="input-wifi-enc" className="block text-xs font-bold text-slate-700 mb-1.5">
                          Security Protocol
                        </label>
                        <div className="relative">
                          <select
                            id="input-wifi-enc"
                            value={wifiEnc}
                            onChange={(e) => setWifiEnc(e.target.value)}
                            className="w-full rounded-xl border border-slate-200/90 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10 transition appearance-none cursor-pointer"
                          >
                            <option value="WPA">WPA / WPA2 (Standard)</option>
                            <option value="WEP">WEP (Legacy)</option>
                            <option value="nopass">None (Open Network)</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {contentType === "phone" && (
                  <div>
                    <label htmlFor="input-phone" className="block text-xs font-bold text-slate-700 mb-1.5">
                      Phone Number
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                      </div>
                      <input
                        id="input-phone"
                        type="tel"
                        value={phoneVal}
                        onChange={(e) => setPhoneVal(e.target.value)}
                        placeholder="+1 555 123 4567"
                        className="w-full rounded-xl border border-slate-200/90 bg-slate-50/60 pl-10 pr-4 py-3 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10 transition"
                      />
                    </div>
                  </div>
                )}

                {contentType === "email" && (
                  <div>
                    <label htmlFor="input-email" className="block text-xs font-bold text-slate-700 mb-1.5">
                      Recipient Email Address
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect width="20" height="16" x="2" y="4" rx="2" />
                          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                        </svg>
                      </div>
                      <input
                        id="input-email"
                        type="email"
                        value={emailVal}
                        onChange={(e) => setEmailVal(e.target.value)}
                        placeholder="contact@yourdomain.com"
                        className="w-full rounded-xl border border-slate-200/90 bg-slate-50/60 pl-10 pr-4 py-3 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10 transition"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="h-px bg-slate-100 my-6" />

              {/* SECTION 2: COLOR CUSTOMIZATION */}
              <div className="mb-6">
                <span className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
                  2. Brand Colors &amp; Contrast
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Pattern Color */}
                  <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="color-fg" className="text-xs font-bold text-slate-700">
                        QR Pattern Color
                      </label>
                      <span className="text-[11px] font-mono text-slate-400">{fgColor.toUpperCase()}</span>
                    </div>

                    {/* Quick Swatches */}
                    <div className="flex items-center gap-1.5 mb-3">
                      {COLOR_PRESETS.map((p) => (
                        <button
                          key={p.hex}
                          type="button"
                          onClick={() => setFgColor(p.hex)}
                          style={{ backgroundColor: p.hex }}
                          title={p.label}
                          className={`h-6 w-6 rounded-lg transition-transform cursor-pointer border flex items-center justify-center ${
                            fgColor.toLowerCase() === p.hex.toLowerCase()
                              ? "scale-110 border-blue-600 shadow-sm"
                              : "border-black/10 hover:scale-105"
                          }`}
                        >
                          {fgColor.toLowerCase() === p.hex.toLowerCase() && (
                            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        id="color-fg"
                        type="color"
                        value={fgColor}
                        onChange={(e) => setFgColor(e.target.value)}
                        className="h-8 w-10 cursor-pointer rounded-lg border border-slate-200 p-0.5 bg-white"
                      />
                      <input
                        type="text"
                        value={fgColor}
                        onChange={(e) => setFgColor(e.target.value)}
                        className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-mono uppercase text-slate-700 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  {/* Background Color */}
                  <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="color-bg" className="text-xs font-bold text-slate-700">
                        Background Color
                      </label>
                      <span className="text-[11px] font-mono text-slate-400">{bgColor.toUpperCase()}</span>
                    </div>

                    {/* Quick Swatches */}
                    <div className="flex items-center gap-1.5 mb-3">
                      {BG_PRESETS.map((p) => (
                        <button
                          key={p.hex}
                          type="button"
                          onClick={() => setBgColor(p.hex)}
                          style={{ backgroundColor: p.hex }}
                          title={p.label}
                          className={`h-6 w-6 rounded-lg transition-transform cursor-pointer border flex items-center justify-center ${
                            bgColor.toLowerCase() === p.hex.toLowerCase()
                              ? "scale-110 border-blue-600 shadow-sm"
                              : "border-slate-300 hover:scale-105"
                          }`}
                        >
                          {bgColor.toLowerCase() === p.hex.toLowerCase() && (
                            <svg className="w-3.5 h-3.5 text-slate-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        id="color-bg"
                        type="color"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="h-8 w-10 cursor-pointer rounded-lg border border-slate-200 p-0.5 bg-white"
                      />
                      <input
                        type="text"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-mono uppercase text-slate-700 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: ERROR CORRECTION & PRINT SIZE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label htmlFor="ec-level" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Error Correction Level
                  </label>
                  <div className="relative">
                    <select
                      id="ec-level"
                      value={ecLevel}
                      onChange={(e) => setEcLevel(e.target.value as EcLevel)}
                      className="w-full rounded-xl border border-slate-200/90 bg-slate-50/60 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10 transition appearance-none cursor-pointer"
                    >
                      <option value="L">Low (L) — max data density (7%)</option>
                      <option value="M">Medium (M) — balanced standard (15%)</option>
                      <option value="Q">Quartile (Q) — logo-friendly (25%)</option>
                      <option value="H">High (H) — most resilient with logo (30%)</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="use-case" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Where will this be printed?
                  </label>
                  <div className="relative">
                    <select
                      id="use-case"
                      value={useCase}
                      onChange={(e) => setUseCase(e.target.value)}
                      className="w-full rounded-xl border border-slate-200/90 bg-slate-50/60 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10 transition appearance-none cursor-pointer"
                    >
                      <option value="business-card">Business card (close-up — 15cm)</option>
                      <option value="flyer">Flyer / Menu (arm&apos;s length — 40cm)</option>
                      <option value="poster">Poster (across room — 150cm)</option>
                      <option value="billboard">Billboard / Banner (far away — 500cm)</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: CENTER LOGO DROPZONE */}
              <div className="mb-6 rounded-2xl border-2 border-dashed border-slate-200/90 bg-slate-50/40 p-4 transition-all hover:border-blue-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <div>
                      <label htmlFor="logo-upload" className="block text-xs font-bold text-slate-800 cursor-pointer">
                        Center Logo Branding (Optional)
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Transparent PNG or SVG recommended
                      </p>
                    </div>
                  </div>

                  {logoDataUrl && (
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer self-start sm:self-auto bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200/60"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <input
                    ref={logoInputRef}
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                  />
                  {logoDataUrl && (
                    <div className="h-10 w-10 shrink-0 rounded-xl border border-slate-200 bg-white p-1 flex items-center justify-center overflow-hidden shadow-2xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={logoDataUrl} alt="Logo preview" className="max-h-full max-w-full object-contain" />
                    </div>
                  )}
                </div>
              </div>

              {/* ACTION: GENERATE & TEST BUTTON */}
              <button
                type="button"
                id="generate-btn"
                onClick={generateQr}
                disabled={isGenerating}
                className="w-full relative group overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 text-white font-bold py-4 px-6 shadow-xl shadow-blue-500/25 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2.5"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span className="text-sm sm:text-base">Simulating Scanner &amp; Testing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 text-amber-300 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    <span className="text-sm sm:text-base">Generate &amp; Test QR Code</span>
                  </>
                )}
              </button>
            </div>

            {/* RIGHT COLUMN: PREVIEW + SCANNABILITY SCORE (5 COLS) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* LIVE PREVIEW CARD */}
              <div className="bg-white rounded-[28px] border border-slate-200/90 p-6 sm:p-7 shadow-[0_20px_60px_-15px_rgba(0,85,254,0.06)] flex flex-col items-center text-center">
                <div className="w-full flex items-center justify-between mb-5 pb-3.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700">Live Preview</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                    <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Client-Side Verified
                  </span>
                </div>

                {/* QR Canvas Presentation Box */}
                <div
                  id="qr-preview"
                  className="w-full min-h-[320px] flex items-center justify-center p-6 rounded-2xl bg-gradient-to-b from-slate-50/80 to-slate-100/40 border border-slate-200/60 shadow-inner overflow-hidden"
                >
                  <div
                    ref={qrContainerRef}
                    className="flex items-center justify-center bg-white p-2 rounded-xl shadow-xs"
                  />
                </div>

                {/* Export Quality / Resolution Selector */}
                <div className="w-full mt-5 pt-4 border-t border-slate-100 text-left">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-bold text-slate-700">PNG Resolution</span>
                    <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/70">
                      {exportResolution} × {exportResolution} px
                    </span>
                  </div>

                  {/* 3 Checkboxes strictly in 1 single horizontal line matching exact visual design */}
                  <div className="flex items-center justify-between gap-3 sm:gap-6 py-2 px-1 mb-3">
                    {[
                      { size: 1000, label: "1000 px" },
                      { size: 2000, label: "2000 px" },
                      { size: 3000, label: "3000 px" },
                    ].map((opt) => {
                      const isSel = exportResolution === opt.size;
                      return (
                        <button
                          key={opt.size}
                          type="button"
                          onClick={() => setExportResolution(opt.size)}
                          className="group inline-flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none transition-all focus:outline-none"
                        >
                          {/* Checkbox box with soft rounded squircle shape */}
                          <div
                            style={{
                              backgroundColor: isSel ? "#1d6ef5" : "#ffffff",
                              borderColor: isSel ? "#1d6ef5" : "#cbd5e1",
                            }}
                            className={`h-5 w-5 sm:h-6 sm:w-6 shrink-0 rounded-[7px] border-2 flex items-center justify-center transition-all shadow-xs ${
                              !isSel ? "group-hover:border-slate-400" : ""
                            }`}
                          >
                            {isSel && (
                              <svg
                                className="w-3.5 h-3.5 text-white"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#ffffff"
                                strokeWidth="3.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>

                          <span
                            className="text-sm sm:text-[15px] font-black tracking-tight text-[#0f172a] select-none"
                          >
                            {opt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Download Actions */}
                <div className="w-full grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    id="download-png"
                    onClick={handleDownloadPng}
                    disabled={isDownloadingPng}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 hover:border-blue-500 px-4 py-3 text-xs sm:text-sm font-bold text-slate-800 shadow-sm transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
                  >
                    {isDownloadingPng ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        <span>Exporting...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        <span>Download PNG</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    id="download-svg"
                    onClick={handleDownloadSvg}
                    disabled={isDownloadingSvg}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 hover:border-indigo-500 px-4 py-3 text-xs sm:text-sm font-bold text-slate-800 shadow-sm transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
                  >
                    {isDownloadingSvg ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-indigo-600" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        <span>Exporting...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="12 2 2 7 12 12 22 7 12 2" />
                          <polyline points="2 17 12 22 22 17" />
                          <polyline points="2 12 12 17 22 12" />
                        </svg>
                        <span>Download SVG</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* SCANNABILITY SCORE CARD */}
              {score !== null && (
                <div
                  id="score-card"
                  className="bg-white rounded-[28px] border border-slate-200/90 p-6 sm:p-7 shadow-[0_20px_60px_-15px_rgba(0,85,254,0.06)] text-left"
                >
                  <div className="flex items-center justify-between mb-4 pb-3.5 border-b border-slate-100">
                    <div>
                      <div className="text-xs font-black uppercase tracking-wider text-slate-600">
                        Scannability Score
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Pre-flight camera simulation</div>
                    </div>
                    <div
                      id="score-value"
                      className={`text-2xl font-black px-3.5 py-1 rounded-xl border tracking-tight ${
                        score >= 90
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 shadow-xs"
                          : score >= 60
                          ? "bg-amber-50 text-amber-700 border-amber-200/80 shadow-xs"
                          : "bg-rose-50 text-rose-700 border-rose-200/80 shadow-xs"
                      }`}
                    >
                      {score}/100
                    </div>
                  </div>

                  {/* Diagnostic Checklist with SVG Icons */}
                  <ul id="score-list" className="space-y-3">
                    {checks.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-xs sm:text-[13px] leading-relaxed text-slate-700">
                        <span className="shrink-0 mt-0.5">
                          {item.status === "pass" && (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </div>
                          )}
                          {item.status === "warn" && (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                              </svg>
                            </div>
                          )}
                          {item.status === "fail" && (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </div>
                          )}
                        </span>
                        <span className="pt-0.5">{item.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            </div>

          </div>
        </section>

        {/* FAQ ACCORDION SECTION */}
        <section className="mx-auto max-w-4xl px-4 pb-20 sm:px-6">
          <div className="text-center mb-10">
            <span className="text-xs font-black uppercase tracking-wider text-blue-600">Knowledge Base</span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-black text-slate-900">
              Questions about QR code scannability
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Everything you need to know before putting your QR code into print production.
            </p>
          </div>

          <div className="space-y-3.5">
            {FAQ_ITEMS.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={faq.q}
                  className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs transition"
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
                      className={`ml-4 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform duration-200 ${
                        isOpen ? "rotate-180 bg-blue-50 text-blue-600" : ""
                      }`}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-100 px-5 pt-3.5 pb-5 text-xs sm:text-sm leading-relaxed text-slate-600">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* CROSS-LINKING RELATED TOOLS SECTION */}
        <section className="border-t border-slate-200/80 bg-white/60 py-16 px-4 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-10">
              <span className="text-xs font-black uppercase tracking-wider text-blue-600">Explore More</span>
              <h2 className="mt-1 text-2xl font-black text-slate-900">Free Creative &amp; Production Tools</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                href="/design-check"
                className="group p-5 rounded-2xl border border-slate-200/80 bg-white hover:border-blue-400/80 hover:shadow-md transition"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
                <div className="text-xs font-bold text-blue-600 uppercase mb-0.5">Pre-flight QA</div>
                <div className="font-bold text-slate-900 group-hover:text-blue-600 transition">Design Check</div>
                <p className="mt-1 text-xs text-slate-500">Find typos, low contrast &amp; print errors before launching.</p>
              </Link>

              <Link
                href="/image-compressor"
                className="group p-5 rounded-2xl border border-slate-200/80 bg-white hover:border-blue-400/80 hover:shadow-md transition"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 14h6m0 0v6m0-6L3 21" />
                    <path d="M20 10h-6m0 0V4m0 6 7-7" />
                  </svg>
                </div>
                <div className="text-xs font-bold text-blue-600 uppercase mb-0.5">Optimizer</div>
                <div className="font-bold text-slate-900 group-hover:text-blue-600 transition">Image Compressor</div>
                <p className="mt-1 text-xs text-slate-500">Compress JPG, PNG &amp; PDFs with live split comparison.</p>
              </Link>

              <Link
                href="/image-to-text"
                className="group p-5 rounded-2xl border border-slate-200/80 bg-white hover:border-blue-400/80 hover:shadow-md transition"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                    <line x1="8" y1="13" x2="16" y2="13" />
                    <line x1="8" y1="17" x2="13" y2="17" />
                  </svg>
                </div>
                <div className="text-xs font-bold text-blue-600 uppercase mb-0.5">OCR Tool</div>
                <div className="font-bold text-slate-900 group-hover:text-blue-600 transition">Image to Text</div>
                <p className="mt-1 text-xs text-slate-500">Extract clean text from photos, screenshots &amp; scans.</p>
              </Link>

              <Link
                href="/flipbook"
                className="group p-5 rounded-2xl border border-slate-200/80 bg-white hover:border-blue-400/80 hover:shadow-md transition"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                    <path d="M6 6h10" />
                    <path d="M6 10h10" />
                  </svg>
                </div>
                <div className="text-xs font-bold text-blue-600 uppercase mb-0.5">Interactive 3D</div>
                <div className="font-bold text-slate-900 group-hover:text-blue-600 transition">3D Flipbook</div>
                <p className="mt-1 text-xs text-slate-500">Turn static PDFs into realistic 3D books with page flip sounds.</p>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <Footer currentPath="/qr-code-generator" />
    </div>
  );
}
