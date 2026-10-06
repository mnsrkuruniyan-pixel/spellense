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

type Mode = "digital" | "print";
type ContentType = "url" | "text" | "wifi" | "phone" | "email" | "vcard";
type DotStyle = "square" | "dots" | "rounded" | "classy" | "extra-rounded";
type CornerStyle = "square" | "dot" | "extra-rounded";
type EcLevel = "L" | "M" | "Q" | "H";
type Material = "matte" | "glossy" | "fabric";
type PrintUseCase = "business-card" | "flyer" | "poster" | "billboard";

interface StressTestResultItem {
  key: string;
  label: string;
  passed: boolean;
}

const FAQ_ITEMS = [
  {
    q: "What is the difference between Digital and Print mode?",
    a: "Digital mode is for QR codes shown on a screen, such as social media or a WhatsApp status, where scanning conditions are predictable, so it skips straight to download or share. Print mode is for anything that will be printed, where mistakes cannot be undone after the fact, so it includes a full stress test before the download unlocks.",
  },
  {
    q: "What does the stress test check?",
    a: "It re-decodes the generated QR code under four simulated real-world conditions: dim lighting, slight blur, a small print size, and an angled scan, the same way a phone camera might encounter it in practice.",
  },
  {
    q: "Can I add a contact card (vCard) QR code?",
    a: "Yes. Selecting the contact card option encodes a name, phone number, email, company and job title into a standard vCard format that saves directly to a phone's contacts when scanned.",
  },
  {
    q: "Why can't I download before running the stress test in Print mode?",
    a: "Print QR codes can't be edited once printed, so Spellense requires a passed stress test first to catch contrast, logo-size or size issues while they are still easy to fix.",
  },
  {
    q: "What resolution can I download the QR code at?",
    a: "PNG downloads are available at 1000px, 2000px or 3000px depending on how large the final print will be. SVG is also available and stays sharp at any size since it is vector-based.",
  },
];

export default function QrCodeGeneratorClient() {
  // Mode: digital vs print
  const [mode, setMode] = useState<Mode>("digital");

  // Content type
  const [contentType, setContentType] = useState<ContentType>("url");

  // Form Fields
  const [urlVal, setUrlVal] = useState("https://spellense.com");
  const [textVal, setTextVal] = useState("");
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPass, setWifiPass] = useState("");
  const [wifiEnc, setWifiEnc] = useState("WPA");
  const [phoneVal, setPhoneVal] = useState("");
  const [emailVal, setEmailVal] = useState("");

  // vCard fields
  const [vcName, setVcName] = useState("");
  const [vcPhone, setVcPhone] = useState("");
  const [vcEmail, setVcEmail] = useState("");
  const [vcCompany, setVcCompany] = useState("");
  const [vcTitle, setVcTitle] = useState("");

  // Styling
  const [fgColor, setFgColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [dotStyle, setDotStyle] = useState<DotStyle>("square");
  const [cornerStyle, setCornerStyle] = useState<CornerStyle>("square");

  // Logo
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState<number>(22);

  // Print settings
  const [ecLevel, setEcLevel] = useState<EcLevel>("M");
  const [material, setMaterial] = useState<Material>("matte");
  const [printUseCase, setPrintUseCase] = useState<PrintUseCase>("flyer");

  // Accordion state (Print mode)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    content: true,
    design: false,
    logo: false,
    settings: false,
  });

  // Export resolution (Print mode)
  const [exportResolution, setExportResolution] = useState<number>(3000);

  // Instances & testing
  const [digitalQr, setDigitalQr] = useState<any>(null);
  const [printQr, setPrintQr] = useState<any>(null);

  const [isStressTesting, setIsStressTesting] = useState(false);
  const [stressTested, setStressTested] = useState(false);
  const [stressResults, setStressResults] = useState<StressTestResultItem[]>([]);
  const [stressPassCount, setStressPassCount] = useState<number>(0);
  const [gateNotice, setGateNotice] = useState<string>("Run the stress test to unlock download");
  const [gateNoticeType, setGateNoticeType] = useState<"normal" | "warn" | "ok">("normal");

  // Share & download status states
  const [isDownloadingPng, setIsDownloadingPng] = useState(false);
  const [isDownloadingSvg, setIsDownloadingSvg] = useState(false);
  const [shareSuccessMsg, setShareSuccessMsg] = useState<string | null>(null);

  // Custom Share Modal State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareTitle, setShareTitle] = useState("My QR Code — Spellense");
  const [shareDescription, setShareDescription] = useState("Create, test and download verified QR codes online with Spellense.");
  const [isLinkCopied, setIsLinkCopied] = useState(false);

  // FAQ accordion
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Refs
  const digitalPreviewRef = useRef<HTMLDivElement | null>(null);
  const printPreviewRef = useRef<HTMLDivElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  // Toggle Accordion section
  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Build Payload
  const buildPayload = useCallback(() => {
    if (contentType === "url") return urlVal.trim() || "https://spellense.com";
    if (contentType === "text") return textVal.trim() || " ";
    if (contentType === "wifi") {
      return `WIFI:T:${wifiEnc};S:${wifiSsid.trim()};P:${wifiPass.trim()};;`;
    }
    if (contentType === "phone") return `tel:${phoneVal.trim()}`;
    if (contentType === "email") return `mailto:${emailVal.trim()}`;
    if (contentType === "vcard") {
      return [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${vcName.trim()}`,
        vcCompany.trim() ? `ORG:${vcCompany.trim()}` : "",
        vcTitle.trim() ? `TITLE:${vcTitle.trim()}` : "",
        vcPhone.trim() ? `TEL:${vcPhone.trim()}` : "",
        vcEmail.trim() ? `EMAIL:${vcEmail.trim()}` : "",
        "END:VCARD",
      ]
        .filter(Boolean)
        .join("\n");
    }
    return "https://spellense.com";
  }, [contentType, urlVal, textVal, wifiEnc, wifiSsid, wifiPass, phoneVal, emailVal, vcName, vcCompany, vcTitle, vcPhone, vcEmail]);

  // Load external scripts if missing
  const ensureLibraries = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;
    const loadScript = (src: string) => {
      return new Promise<void>((resolve, reject) => {
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

    try {
      if (!window.QRCodeStyling) {
        await loadScript("https://cdn.jsdelivr.net/npm/qr-code-styling@1.6.0-rc.1/lib/qr-code-styling.js");
      }
      if (!window.jsQR) {
        await loadScript("https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js");
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  // Generate Digital QR
  const handleGenerateDigital = useCallback(async () => {
    await ensureLibraries();
    if (!window.QRCodeStyling || !digitalPreviewRef.current) return;

    const payload = buildPayload();
    const options: any = {
      width: 280,
      height: 280,
      data: payload,
      margin: 10,
      qrOptions: { errorCorrectionLevel: "M" },
      dotsOptions: { color: fgColor, type: "square" },
      backgroundOptions: { color: bgColor },
      cornersSquareOptions: { color: fgColor, type: "square" },
    };

    digitalPreviewRef.current.innerHTML = "";
    const instance = new window.QRCodeStyling(options);
    instance.append(digitalPreviewRef.current);
    setDigitalQr(instance);
  }, [buildPayload, fgColor, bgColor, ensureLibraries]);

  // Generate Print QR
  const handleGeneratePrint = useCallback(async () => {
    await ensureLibraries();
    if (!window.QRCodeStyling || !printPreviewRef.current) return;

    const payload = buildPayload();
    const options: any = {
      width: 280,
      height: 280,
      data: payload,
      margin: 10,
      qrOptions: { errorCorrectionLevel: ecLevel },
      dotsOptions: { color: fgColor, type: dotStyle },
      backgroundOptions: { color: bgColor },
      cornersSquareOptions: {
        color: fgColor,
        type: cornerStyle === "square" ? "square" : cornerStyle,
      },
    };

    if (logoDataUrl) {
      options.image = logoDataUrl;
      options.imageOptions = {
        crossOrigin: "anonymous",
        imageSize: logoSize / 100,
        margin: 4,
      };
    }

    printPreviewRef.current.innerHTML = "";
    const instance = new window.QRCodeStyling(options);
    instance.append(printPreviewRef.current);
    setPrintQr(instance);

    // Reset stress test gate
    setStressTested(false);
    setStressResults([]);
    setStressPassCount(0);
    setGateNotice("Run the stress test to unlock download");
    setGateNoticeType("normal");
  }, [buildPayload, ecLevel, fgColor, dotStyle, bgColor, cornerStyle, logoDataUrl, logoSize, ensureLibraries]);

  // Initial generation on mount
  useEffect(() => {
    handleGenerateDigital();
    handleGeneratePrint();
  }, [handleGenerateDigital, handleGeneratePrint]);

  // Logo file upload handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogoDataUrl(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleClearLogo = () => {
    setLogoDataUrl(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  // Decode helper for canvas filter stress testing
  const decodeWithEffect = useCallback((qrInstance: any, effect: "dim" | "blur" | "small" | "angle"): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!qrInstance || !window.jsQR) return resolve(false);

      qrInstance
        .getRawData("png")
        .then((blob: Blob | null) => {
          if (!blob) return resolve(false);
          const url = URL.createObjectURL(blob);
          const img = new Image();
          img.onload = () => {
            const pad = effect === "angle" ? 40 : 0;
            const canvas = document.createElement("canvas");
            canvas.width = img.width + pad;
            canvas.height = img.height + pad;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              URL.revokeObjectURL(url);
              return resolve(false);
            }

            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            if (effect === "dim") ctx.filter = "brightness(0.55)";
            if (effect === "blur") ctx.filter = "blur(2.5px)";

            if (effect === "angle") {
              ctx.setTransform(1, 0.12, -0.18, 0.95, pad / 2, pad / 4);
              ctx.drawImage(img, 0, 0);
              ctx.setTransform(1, 0, 0, 1, 0, 0);
            } else if (effect === "small") {
              const scale = 0.35;
              const w = img.width * scale;
              const h = img.height * scale;
              ctx.drawImage(img, 0, 0, w, h);
              ctx.drawImage(canvas, 0, 0, w, h, 0, 0, canvas.width, canvas.height);
            } else {
              ctx.drawImage(img, pad / 2, pad / 2);
            }

            ctx.filter = "none";
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const decoded = window.jsQR!(imgData.data, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
            resolve(!!decoded);
          };
          img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(false);
          };
          img.src = url;
        })
        .catch(() => resolve(false));
    });
  }, []);

  // Run Print Stress Test
  const runStressTest = async () => {
    if (!printQr || isStressTesting) return;
    setIsStressTesting(true);

    const testDefs: { key: "dim" | "blur" | "small" | "angle"; label: string }[] = [
      { key: "dim", label: "Dim lighting" },
      { key: "blur", label: "Blur" },
      { key: "small", label: "Small print size" },
      { key: "angle", label: "Angled scan" },
    ];

    const results: StressTestResultItem[] = [];
    for (const def of testDefs) {
      const passed = await decodeWithEffect(printQr, def.key);
      results.push({ key: def.key, label: def.label, passed });
    }

    const passCount = results.filter((r) => r.passed).length;
    setStressResults(results);
    setStressPassCount(passCount);

    const allPassed = passCount === testDefs.length;
    setStressTested(allPassed);

    if (allPassed) {
      setGateNotice("Verified — ready to download");
      setGateNoticeType("ok");
    } else {
      setGateNotice(`${passCount}/${testDefs.length} passed — fix the issues above, then re-run the test`);
      setGateNoticeType("warn");
    }

    setIsStressTesting(false);
  };

  // High-res Download helper
  const handleDownload = async (format: "png" | "svg") => {
    const isDigital = mode === "digital";
    const currentInstance = isDigital ? digitalQr : printQr;

    if (!currentInstance) return;

    if (!isDigital && !stressTested) {
      setGateNotice('Scan it first — tap "Stress test this QR code" above');
      setGateNoticeType("warn");
      return;
    }

    if (format === "png") {
      setIsDownloadingPng(true);
      try {
        const size = isDigital ? 1200 : exportResolution;
        await currentInstance.download({
          name: "spellense-qr-code",
          extension: "png",
          width: size,
          height: size,
        });
      } finally {
        setIsDownloadingPng(false);
      }
    } else {
      setIsDownloadingSvg(true);
      try {
        await currentInstance.download({
          name: "spellense-qr-code",
          extension: "svg",
        });
      } finally {
        setIsDownloadingSvg(false);
      }
    }
  };

  // Open Custom Share Modal
  const handleOpenShareModal = () => {
    setIsLinkCopied(false);
    setIsShareModalOpen(true);
  };

  // Copy shareable link to clipboard
  const handleCopyShareLink = async () => {
    const shareUrl = typeof window !== "undefined" ? window.location.href : "https://spellense.com/qr-code-generator";
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setIsLinkCopied(true);
        setTimeout(() => setIsLinkCopied(false), 3000);
      }
    } catch {
      // ignore
    }
  };

  // Social share triggers
  const handleSocialShare = (platform: "whatsapp" | "facebook" | "instagram" | "linkedin" | "twitter" | "more") => {
    const rawUrl = typeof window !== "undefined" ? window.location.href : "https://spellense.com/qr-code-generator";
    // For social sharing APIs, use public canonical URL if running on localhost to avoid API errors
    const shareUrl = rawUrl.includes("localhost") || rawUrl.includes("127.0.0.1")
      ? "https://spellense.com/qr-code-generator"
      : rawUrl;
    const text = `${shareTitle} — ${shareDescription}`;

    if (platform === "whatsapp") {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`${text}\n${shareUrl}`)}`, "_blank");
    } else if (platform === "facebook") {
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(text)}`,
        "_blank",
        "width=600,height=500,menubar=no,toolbar=no,resizable=yes"
      );
    } else if (platform === "instagram") {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(`${text}\n${shareUrl}`).catch(() => {});
      }
      setShareSuccessMsg("Link copied! Opening Instagram...");
      setTimeout(() => setShareSuccessMsg(null), 3000);
      window.open("https://www.instagram.com/", "_blank");
    } else if (platform === "linkedin") {
      window.open(
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
        "_blank",
        "width=600,height=600,menubar=no,toolbar=no,resizable=yes"
      );
    } else if (platform === "twitter") {
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`,
        "_blank",
        "width=600,height=500,menubar=no,toolbar=no,resizable=yes"
      );
    } else if (platform === "more") {
      if (navigator.share) {
        navigator.share({
          title: shareTitle,
          text: shareDescription,
          url: shareUrl,
        }).catch(() => {});
      } else {
        handleCopyShareLink();
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f0f6fe] font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* NAVBAR */}
      <Navbar />

      <main id="main-content" className="flex-1">
        {/* HERO SECTION — Matching exact standard tool style */}
        <section className="relative overflow-hidden px-4 pt-12 pb-10 sm:px-6 sm:pt-16 sm:pb-14 lg:pt-20 lg:pb-16 text-center">
          <div className="mx-auto max-w-7xl">
            <h1 className="text-[34px] xs:text-[44px] sm:text-[56px] md:text-[64px] lg:text-[72px] font-black leading-[1.12] tracking-[-1.5px] sm:tracking-[-2.5px] text-[#0f172a] text-center max-w-5xl mx-auto">
              QR codes that are built to actually scan.
            </h1>
          </div>
        </section>

        {/* WORKSPACE CONTAINER */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
          
          {/* MODE SWITCHER TABS */}
          <div className="mx-auto max-w-xs mb-8">
            <div className="bg-slate-200/80 p-1 rounded-2xl flex items-center border border-slate-300/70 shadow-inner">
              <button
                type="button"
                onClick={() => setMode("digital")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                  mode === "digital"
                    ? "bg-white text-emerald-800 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {/* Digital / Screen SVG Icon */}
                <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="14" x="2" y="3" rx="2" />
                  <line x1="8" x2="16" y1="21" y2="21" />
                  <line x1="12" x2="12" y1="17" y2="21" />
                </svg>
                <span>Digital</span>
              </button>

              <button
                type="button"
                onClick={() => setMode("print")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                  mode === "print"
                    ? "bg-white text-emerald-800 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {/* Print / Printer SVG Icon */}
                <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect width="12" height="8" x="6" y="14" />
                </svg>
                <span>Print</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN: CONTROLS (7 COLS) */}
            <div className="lg:col-span-7 bg-white rounded-[28px] border border-slate-200/90 p-6 sm:p-8 shadow-[0_20px_60px_-15px_rgba(0,85,254,0.06)]">
              
              {/* DIGITAL MODE: FLAT MINIMAL FORM */}
              {mode === "digital" && (
                <div className="space-y-6">
                  {/* Content Type Selector */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                      Content Type
                    </label>
                    <div className="relative">
                      <select
                        value={contentType}
                        onChange={(e) => setContentType(e.target.value as ContentType)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 pr-10 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 appearance-none cursor-pointer"
                      >
                        <option value="url">Website link (URL)</option>
                        <option value="text">Plain text</option>
                        <option value="wifi">WiFi network</option>
                        <option value="phone">Phone number</option>
                        <option value="email">Email address</option>
                        <option value="vcard">Contact card (vCard)</option>
                      </select>
                      <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 flex items-center text-slate-400">
                        <svg className="w-4 h-4 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Fields */}
                  {renderFieldsGroup()}

                  {/* Colors Row */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                        QR Color
                      </label>
                      <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <input
                          type="color"
                          value={fgColor}
                          onChange={(e) => setFgColor(e.target.value)}
                          className="h-9 w-9 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
                        />
                        <span className="text-xs font-mono font-bold text-slate-700 uppercase">
                          {fgColor}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                        Background
                      </label>
                      <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <input
                          type="color"
                          value={bgColor}
                          onChange={(e) => setBgColor(e.target.value)}
                          className="h-9 w-9 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
                        />
                        <span className="text-xs font-mono font-bold text-slate-700 uppercase">
                          {bgColor}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PRINT MODE: ACCORDION BASED FORM */}
              {mode === "print" && (
                <div className="space-y-4">
                  
                  {/* ACCORDION 1: CONTENT */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden transition-all">
                    <button
                      type="button"
                      onClick={() => toggleSection("content")}
                      className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 text-left font-black text-sm text-slate-800 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <svg className="w-4 h-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" x2="8" y1="13" y2="13" />
                          <line x1="16" x2="8" y1="17" y2="17" />
                        </svg>
                        <span>1. Content Details</span>
                      </div>
                      <svg
                        className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                          openSections.content ? "rotate-180" : ""
                        }`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {openSections.content && (
                      <div className="p-5 bg-white space-y-4 border-t border-slate-200">
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                            Content Type
                          </label>
                          <div className="relative">
                            <select
                              value={contentType}
                              onChange={(e) => setContentType(e.target.value as ContentType)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 pr-10 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 appearance-none cursor-pointer"
                            >
                              <option value="url">Website link (URL)</option>
                              <option value="text">Plain text</option>
                              <option value="wifi">WiFi network</option>
                              <option value="phone">Phone number</option>
                              <option value="email">Email address</option>
                              <option value="vcard">Contact card (vCard)</option>
                            </select>
                            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 flex items-center text-slate-400">
                              <svg className="w-4 h-4 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        {renderFieldsGroup()}
                      </div>
                    )}
                  </div>

                  {/* ACCORDION 2: DESIGN & STYLES */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden transition-all">
                    <button
                      type="button"
                      onClick={() => toggleSection("design")}
                      className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 text-left font-black text-sm text-slate-800 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <svg className="w-4 h-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <path d="m4.93 4.93 4.24 4.24" />
                          <path d="m14.83 9.17 4.24-4.24" />
                          <path d="m14.83 14.83 4.24 4.24" />
                          <path d="m9.17 14.83-4.24 4.24" />
                        </svg>
                        <span>2. Design & Styling</span>
                      </div>
                      <svg
                        className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                          openSections.design ? "rotate-180" : ""
                        }`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {openSections.design && (
                      <div className="p-5 bg-white space-y-5 border-t border-slate-200">
                        {/* Dot Style — Compact Horizontal Icon Grid */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                              Dot Style
                            </label>
                            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded capitalize">
                              {dotStyle === "extra-rounded" ? "Extra Rounded" : dotStyle}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {[
                              {
                                id: "square",
                                title: "Square",
                                icon: (
                                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                    <rect x="4" y="4" width="16" height="16" rx="1" />
                                  </svg>
                                ),
                              },
                              {
                                id: "dots",
                                title: "Dots",
                                icon: (
                                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="8" />
                                  </svg>
                                ),
                              },
                              {
                                id: "rounded",
                                title: "Rounded",
                                icon: (
                                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                    <rect x="4" y="4" width="16" height="16" rx="5" />
                                  </svg>
                                ),
                              },
                              {
                                id: "classy",
                                title: "Classy",
                                icon: (
                                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                    <path d="M12 3 L21 12 L12 21 L3 12 Z" />
                                  </svg>
                                ),
                              },
                              {
                                id: "extra-rounded",
                                title: "Extra Rounded",
                                icon: (
                                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                    <rect x="4" y="4" width="16" height="16" rx="8" />
                                  </svg>
                                ),
                              },
                            ].map((item) => {
                              const isSel = dotStyle === item.id;
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  title={item.title}
                                  aria-label={item.title}
                                  onClick={() => setDotStyle(item.id as DotStyle)}
                                  className={`w-11 h-11 shrink-0 rounded-xl border flex items-center justify-center transition-all cursor-pointer relative group ${
                                    isSel
                                      ? "bg-emerald-50 border-emerald-600 text-emerald-700 ring-2 ring-emerald-600/20 shadow-xs"
                                      : "border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:border-slate-300 hover:bg-slate-50"
                                  }`}
                                >
                                  {item.icon}
                                  {/* Tooltip */}
                                  <span className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900 text-white text-[10px] font-bold py-0.5 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-sm">
                                    {item.title}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Corner Style — Compact Horizontal Icon Grid */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                              Corner Style
                            </label>
                            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded capitalize">
                              {cornerStyle === "extra-rounded" ? "Extra Rounded" : cornerStyle === "dot" ? "Circle Dot" : "Square"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {[
                              {
                                id: "square",
                                title: "Square",
                                icon: (
                                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <rect x="3" y="3" width="18" height="18" rx="1" />
                                    <rect x="8" y="8" width="8" height="8" fill="currentColor" />
                                  </svg>
                                ),
                              },
                              {
                                id: "dot",
                                title: "Circle Dot",
                                icon: (
                                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <circle cx="12" cy="12" r="9" />
                                    <circle cx="12" cy="12" r="4" fill="currentColor" />
                                  </svg>
                                ),
                              },
                              {
                                id: "extra-rounded",
                                title: "Extra Rounded",
                                icon: (
                                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <rect x="3" y="3" width="18" height="18" rx="6" />
                                    <rect x="8" y="8" width="8" height="8" rx="3" fill="currentColor" />
                                  </svg>
                                ),
                              },
                            ].map((item) => {
                              const isSel = cornerStyle === item.id;
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  title={item.title}
                                  aria-label={item.title}
                                  onClick={() => setCornerStyle(item.id as CornerStyle)}
                                  className={`w-11 h-11 shrink-0 rounded-xl border flex items-center justify-center transition-all cursor-pointer relative group ${
                                    isSel
                                      ? "bg-emerald-50 border-emerald-600 text-emerald-700 ring-2 ring-emerald-600/20 shadow-xs"
                                      : "border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:border-slate-300 hover:bg-slate-50"
                                  }`}
                                >
                                  {item.icon}
                                  {/* Tooltip */}
                                  <span className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900 text-white text-[10px] font-bold py-0.5 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-sm">
                                    {item.title}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Colors */}
                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div>
                            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                              QR Color
                            </label>
                            <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
                              <input
                                type="color"
                                value={fgColor}
                                onChange={(e) => setFgColor(e.target.value)}
                                className="h-9 w-9 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
                              />
                              <span className="text-xs font-mono font-bold text-slate-700 uppercase">
                                {fgColor}
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                              Background
                            </label>
                            <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
                              <input
                                type="color"
                                value={bgColor}
                                onChange={(e) => setBgColor(e.target.value)}
                                className="h-9 w-9 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
                              />
                              <span className="text-xs font-mono font-bold text-slate-700 uppercase">
                                {bgColor}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ACCORDION 3: LOGO */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden transition-all">
                    <button
                      type="button"
                      onClick={() => toggleSection("logo")}
                      className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 text-left font-black text-sm text-slate-800 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <svg className="w-4 h-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                          <circle cx="9" cy="9" r="2" />
                          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                        </svg>
                        <span>3. Logo & Watermark</span>
                      </div>
                      <svg
                        className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                          openSections.logo ? "rotate-180" : ""
                        }`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {openSections.logo && (
                      <div className="p-5 bg-white space-y-4 border-t border-slate-200">
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                            Upload Logo (Optional)
                          </label>
                          <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />

                          {!logoDataUrl ? (
                            <div
                              onClick={() => logoInputRef.current?.click()}
                              className="border-2 border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
                            >
                              <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-emerald-100 text-slate-500 group-hover:text-emerald-700 flex items-center justify-center transition-colors mb-2.5 shadow-xs">
                                <svg className="w-6 h-6 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                  <polyline points="17 8 12 3 7 8" />
                                  <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                              </div>
                              <span className="text-xs font-black text-slate-700 group-hover:text-emerald-900 transition-colors">
                                Click to upload logo (SVG / PNG / JPG)
                              </span>
                              <span className="text-[11px] font-semibold text-slate-400 mt-0.5">
                                Center brand icon on your QR code
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                              <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center overflow-hidden shadow-xs shrink-0">
                                  <img src={logoDataUrl} alt="Logo preview" className="max-w-full max-h-full object-contain" />
                                </div>
                                <div className="text-left">
                                  <span className="block text-xs font-black text-slate-800">Brand Logo Active</span>
                                  <span className="block text-[11px] font-semibold text-emerald-600">Centered on QR code</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => logoInputRef.current?.click()}
                                  className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                                >
                                  Change
                                </button>
                                <button
                                  type="button"
                                  onClick={handleClearLogo}
                                  className="text-xs font-bold text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                  </svg>
                                  <span>Remove</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {logoDataUrl && (
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                                Logo Scale
                              </label>
                              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                {logoSize}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min="10"
                              max="40"
                              value={logoSize}
                              onChange={(e) => setLogoSize(parseInt(e.target.value, 10))}
                              className="w-full accent-emerald-600 cursor-pointer"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ACCORDION 4: PRINT SETTINGS */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden transition-all">
                    <button
                      type="button"
                      onClick={() => toggleSection("settings")}
                      className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 text-left font-black text-sm text-slate-800 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <svg className="w-4 h-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="3" />
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                        <span>4. Print Settings & Capacity</span>
                      </div>
                      <svg
                        className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                          openSections.settings ? "rotate-180" : ""
                        }`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {openSections.settings && (
                      <div className="p-5 bg-white space-y-4 border-t border-slate-200">
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                            Error Correction Level
                          </label>
                          <div className="relative">
                            <select
                              value={ecLevel}
                              onChange={(e) => setEcLevel(e.target.value as EcLevel)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 pr-10 text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 appearance-none cursor-pointer"
                            >
                              <option value="L">L - Low (7% recovery, high capacity)</option>
                              <option value="M">M - Medium (15% recovery, standard)</option>
                              <option value="Q">Q - Quartile (25% recovery, logo safe)</option>
                              <option value="H">H - High (30% recovery, maximum safety)</option>
                            </select>
                            <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center text-slate-400">
                              <svg className="w-4 h-4 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                            Print Material
                          </label>
                          <div className="relative">
                            <select
                              value={material}
                              onChange={(e) => setMaterial(e.target.value as Material)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 pr-10 text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 appearance-none cursor-pointer"
                            >
                              <option value="matte">Matte paper</option>
                              <option value="glossy">Glossy coated</option>
                              <option value="fabric">Fabric / Apparel</option>
                            </select>
                            <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center text-slate-400">
                              <svg className="w-4 h-4 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                            Where will this be printed?
                          </label>
                          <div className="relative">
                            <select
                              value={printUseCase}
                              onChange={(e) => setPrintUseCase(e.target.value as PrintUseCase)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 pr-10 text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 appearance-none cursor-pointer"
                            >
                              <option value="business-card">Business card (close-up ~15 cm)</option>
                              <option value="flyer">Flyer / Menu (arm's length ~40 cm)</option>
                              <option value="poster">Poster (across a room ~150 cm)</option>
                              <option value="billboard">Billboard / Signage (far away ~500 cm)</option>
                            </select>
                            <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center text-slate-400">
                              <svg className="w-4 h-4 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: PREVIEW & ACTIONS (5 COLS) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* QR Preview Card */}
              <div className="bg-white rounded-[28px] border border-slate-200/90 p-6 sm:p-7 shadow-[0_20px_60px_-15px_rgba(0,85,254,0.06)] flex flex-col items-center justify-center text-center">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 mb-4">
                  {mode === "digital" ? "Digital Preview" : "Print Ready Preview"}
                </span>

                {/* Preview Box */}
                <div className="w-[280px] h-[280px] rounded-2xl bg-slate-50 border border-slate-200/90 flex items-center justify-center overflow-hidden shadow-inner relative">
                  {mode === "digital" ? (
                    <div ref={digitalPreviewRef} className="w-full h-full flex items-center justify-center" />
                  ) : (
                    <div ref={printPreviewRef} className="w-full h-full flex items-center justify-center" />
                  )}
                </div>

                {/* PRINT MODE: STRESS TEST BUTTON & CARD */}
                {mode === "print" && (
                  <div className="w-full mt-6 space-y-4">
                    <button
                      type="button"
                      onClick={runStressTest}
                      disabled={isStressTesting}
                      className={`w-full py-3 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                        stressTested
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                          : "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20"
                      }`}
                    >
                      {isStressTesting ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          <span>Testing Conditions…</span>
                        </>
                      ) : stressTested ? (
                        <>
                          <svg className="w-4 h-4 text-emerald-600 stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>✓ Verified — 4/4 Tests Passed</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 text-white stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                          </svg>
                          <span>Stress test this QR code</span>
                        </>
                      )}
                    </button>

                    {/* Stress Test Results Box */}
                    {stressResults.length > 0 && (
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-2.5">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                          <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                            Stress Test Results
                          </span>
                          <span
                            className={`text-xs font-black px-2 py-0.5 rounded-md ${
                              stressPassCount === 4
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {stressPassCount}/4 Passed
                          </span>
                        </div>

                        <ul className="space-y-1.5 text-xs font-bold">
                          {stressResults.map((item) => (
                            <li key={item.key} className="flex items-center justify-between">
                              <span className="text-slate-600">{item.label}</span>
                              <span
                                className={`inline-flex items-center gap-1 font-black ${
                                  item.passed ? "text-emerald-600" : "text-red-500"
                                }`}
                              >
                                {item.passed ? (
                                  <>
                                    <svg className="w-3.5 h-3.5 stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    <span>Scans fine</span>
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-3.5 h-3.5 stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                                      <line x1="18" y1="6" x2="6" y2="18" />
                                      <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                    <span>Failed</span>
                                  </>
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Gate Message */}
                    <div
                      className={`p-2.5 rounded-xl text-xs font-bold text-center border ${
                        gateNoticeType === "ok"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : gateNoticeType === "warn"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-slate-50 text-slate-600 border-slate-200"
                      }`}
                    >
                      {gateNotice}
                    </div>

                    {/* Resolution selector (strictly 1 single horizontal row) */}
                    <div className="pt-2 text-left">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700">PNG Resolution</span>
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          {exportResolution} × {exportResolution} px
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3 py-2 px-1 mb-2">
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
                              className="group inline-flex items-center gap-2.5 cursor-pointer select-none transition-all focus:outline-none"
                            >
                              <div
                                style={{
                                  backgroundColor: isSel ? "#10b981" : "#ffffff",
                                  borderColor: isSel ? "#10b981" : "#cbd5e1",
                                }}
                                className={`h-5 w-5 sm:h-5.5 sm:w-5.5 shrink-0 rounded-[7px] border-2 flex items-center justify-center transition-all ${
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
                              <span className="text-xs sm:text-[13px] font-black text-[#0f172a]">
                                {opt.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ACTION BUTTONS: PNG, SVG, SHARE */}
                <div className="w-full mt-6 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* PNG Download */}
                    <button
                      type="button"
                      onClick={() => handleDownload("png")}
                      disabled={isDownloadingPng || (mode === "print" && !stressTested)}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 px-4 py-3 text-xs sm:text-sm font-bold text-slate-800 shadow-sm transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isDownloadingPng ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-emerald-600" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          <span>Exporting…</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          <span>Download PNG</span>
                        </>
                      )}
                    </button>

                    {/* SVG Download */}
                    <button
                      type="button"
                      onClick={() => handleDownload("svg")}
                      disabled={isDownloadingSvg || (mode === "print" && !stressTested)}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 px-4 py-3 text-xs sm:text-sm font-bold text-slate-800 shadow-sm transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isDownloadingSvg ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-emerald-600" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          <span>Exporting…</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 2 7 12 12 22 7 12 2" />
                            <polyline points="2 17 12 22 22 17" />
                            <polyline points="2 12 12 17 22 12" />
                          </svg>
                          <span>Download SVG</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Share Button (PNG, SVG and Share requirement) */}
                  <button
                    type="button"
                    onClick={handleOpenShareModal}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-slate-50 hover:bg-slate-100 px-4 py-3 text-xs sm:text-sm font-bold text-slate-800 shadow-xs transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                    <span>Share QR Code</span>
                  </button>

                  {/* Share feedback alert */}
                  {shareSuccessMsg && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 text-center animate-fadeIn">
                      {shareSuccessMsg}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section className="mx-auto max-w-4xl px-4 pb-24 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600">
              Everything you need to know about QR scannability and print requirements.
            </p>
          </div>

          <div className="space-y-3.5">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200/90 bg-white transition-all overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between p-5 text-left text-sm sm:text-base font-bold text-slate-900 hover:text-emerald-700 transition-colors cursor-pointer"
                  >
                    <span>{item.q}</span>
                    <svg
                      className={`h-4 w-4 text-slate-400 transition-transform duration-200 shrink-0 ml-4 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* CUSTOM SHARE MODAL */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-7 shadow-2xl text-left">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Share QR Code</h3>
                  <p className="text-xs text-slate-500">Share or copy link to your generated QR code</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 pt-4">
              {/* Title input */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Share Title
                </label>
                <input
                  type="text"
                  value={shareTitle}
                  onChange={(e) => setShareTitle(e.target.value)}
                  placeholder="Title..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              {/* Description input */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Share Description
                </label>
                <textarea
                  rows={2}
                  value={shareDescription}
                  onChange={(e) => setShareDescription(e.target.value)}
                  placeholder="Description..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3.5 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              {/* Copy link field */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Page Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={typeof window !== "undefined" ? window.location.href : "https://spellense.com/qr-code-generator"}
                    className="flex-1 bg-slate-100 border border-slate-200 rounded-xl py-2 px-3 text-xs font-mono text-slate-700 select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
                  >
                    {isLinkCopied ? (
                      <>
                        <svg className="w-3.5 h-3.5 stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                        </svg>
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Social Platform Icon Buttons */}
              <div className="pt-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                  Share directly to
                </label>
                <div className="flex items-center justify-between gap-2">
                  {/* WhatsApp */}
                  <button
                    type="button"
                    title="Share on WhatsApp"
                    aria-label="Share on WhatsApp"
                    onClick={() => handleSocialShare("whatsapp")}
                    className="flex-1 h-11 rounded-xl border border-slate-200 hover:border-emerald-500 bg-white hover:bg-emerald-50/50 flex items-center justify-center transition-all cursor-pointer group shadow-xs"
                  >
                    <svg className="w-5 h-5 text-[#25D366] fill-current" viewBox="0 0 24 24">
                      <path d="M12.004 2C6.48 2 2 6.48 2 12.004c0 1.83.5 3.55 1.37 5.03L2 22l5.12-1.34c1.44.82 3.1 1.34 4.884 1.34 5.524 0 10.004-4.48 10.004-10.004C22.008 6.48 17.528 2 12.004 2zm5.83 14.37c-.24.68-1.4 1.25-1.94 1.32-.51.07-1.17.1-3.38-.81-2.83-1.16-4.64-4.04-4.78-4.23-.14-.19-1.14-1.52-1.14-2.9 0-1.38.72-2.06.98-2.34.25-.28.56-.35.75-.35.19 0 .37 0 .54.01.17.01.4-.07.63.48.24.57.81 1.98.88 2.13.07.14.12.31.02.5-.1.19-.15.31-.29.48-.15.17-.31.37-.44.5-.15.14-.3.3-.13.6.17.29.76 1.25 1.63 2.03 1.12 1 2.07 1.31 2.36 1.45.29.15.46.12.63-.07.17-.19.73-.85.92-1.14.19-.29.38-.24.64-.15.26.1 1.65.78 1.93.92.29.15.48.22.55.34.07.13.07.75-.17 1.43z" />
                    </svg>
                  </button>

                  {/* Instagram */}
                  <button
                    type="button"
                    title="Share on Instagram"
                    aria-label="Share on Instagram"
                    onClick={() => handleSocialShare("instagram")}
                    className="flex-1 h-11 rounded-xl border border-slate-200 hover:border-[#E1306C] bg-white hover:bg-pink-50/50 flex items-center justify-center transition-all cursor-pointer group shadow-xs"
                  >
                    <svg className="w-5 h-5 text-[#E1306C] fill-current" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </button>

                  {/* LinkedIn */}
                  <button
                    type="button"
                    title="Share on LinkedIn"
                    aria-label="Share on LinkedIn"
                    onClick={() => handleSocialShare("linkedin")}
                    className="flex-1 h-11 rounded-xl border border-slate-200 hover:border-[#0A66C2] bg-white hover:bg-sky-50/50 flex items-center justify-center transition-all cursor-pointer group shadow-xs"
                  >
                    <svg className="w-5 h-5 text-[#0A66C2] fill-current" viewBox="0 0 24 24">
                      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.73a1.65 1.65 0 1 0 0 3.3 1.65 1.65 0 0 0 0-3.3z" />
                    </svg>
                  </button>

                  {/* Facebook */}
                  <button
                    type="button"
                    title="Share on Facebook"
                    aria-label="Share on Facebook"
                    onClick={() => handleSocialShare("facebook")}
                    className="flex-1 h-11 rounded-xl border border-slate-200 hover:border-[#1877F2] bg-white hover:bg-blue-50/50 flex items-center justify-center transition-all cursor-pointer group shadow-xs"
                  >
                    <svg className="w-5 h-5 text-[#1877F2] fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </button>

                  {/* X / Twitter */}
                  <button
                    type="button"
                    title="Share on X"
                    aria-label="Share on X"
                    onClick={() => handleSocialShare("twitter")}
                    className="flex-1 h-11 rounded-xl border border-slate-200 hover:border-slate-800 bg-white hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer group shadow-xs"
                  >
                    <svg className="w-5 h-5 text-slate-900 fill-current" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </button>

                  {/* More / Native */}
                  <button
                    type="button"
                    title="More sharing options"
                    aria-label="More sharing options"
                    onClick={() => handleSocialShare("more")}
                    className="flex-1 h-11 rounded-xl border border-slate-200 hover:border-purple-500 bg-white hover:bg-purple-50/50 flex items-center justify-center transition-all cursor-pointer group shadow-xs"
                  >
                    <svg className="w-5 h-5 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="1" />
                      <circle cx="19" cy="12" r="1" />
                      <circle cx="5" cy="12" r="1" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <Footer />
    </div>
  );

  // Helper renderer for dynamic content fields
  function renderFieldsGroup() {
    if (contentType === "url") {
      return (
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
            Target URL
          </label>
          <div className="relative">
            <input
              type="url"
              value={urlVal}
              onChange={(e) => setUrlVal(e.target.value)}
              placeholder="https://example.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>
          </div>
        </div>
      );
    }

    if (contentType === "text") {
      return (
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
            Text Content
          </label>
          <textarea
            rows={3}
            value={textVal}
            onChange={(e) => setTextVal(e.target.value)}
            placeholder="Type any message, note, or raw code..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
        </div>
      );
    }

    if (contentType === "wifi") {
      return (
        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Network Name (SSID)
            </label>
            <input
              type="text"
              value={wifiSsid}
              onChange={(e) => setWifiSsid(e.target.value)}
              placeholder="e.g. Office_WiFi_5G"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Password
            </label>
            <input
              type="text"
              value={wifiPass}
              onChange={(e) => setWifiPass(e.target.value)}
              placeholder="WiFi Password"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Security Protocol
            </label>
            <div className="relative">
              <select
                value={wifiEnc}
                onChange={(e) => setWifiEnc(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 pr-10 text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 appearance-none cursor-pointer"
              >
                <option value="WPA">WPA / WPA2 / WPA3 (Recommended)</option>
                <option value="WEP">WEP</option>
                <option value="nopass">None (Open Network)</option>
              </select>
              <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center text-slate-400">
                <svg className="w-4 h-4 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (contentType === "phone") {
      return (
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            value={phoneVal}
            onChange={(e) => setPhoneVal(e.target.value)}
            placeholder="+1 (555) 000-0000"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
        </div>
      );
    }

    if (contentType === "email") {
      return (
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={emailVal}
            onChange={(e) => setEmailVal(e.target.value)}
            placeholder="hello@example.com"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
        </div>
      );
    }

    if (contentType === "vcard") {
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={vcName}
              onChange={(e) => setVcName(e.target.value)}
              placeholder="e.g. Sarah Jenkins"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={vcPhone}
                onChange={(e) => setVcPhone(e.target.value)}
                placeholder="+1 555 123 4567"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
                Email
              </label>
              <input
                type="email"
                value={vcEmail}
                onChange={(e) => setVcEmail(e.target.value)}
                placeholder="sarah@company.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
                Company (Optional)
              </label>
              <input
                type="text"
                value={vcCompany}
                onChange={(e) => setVcCompany(e.target.value)}
                placeholder="Company Inc."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">
                Job Title (Optional)
              </label>
              <input
                type="text"
                value={vcTitle}
                onChange={(e) => setVcTitle(e.target.value)}
                placeholder="Product Lead"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
          </div>
        </div>
      );
    }

    return null;
  }
}
