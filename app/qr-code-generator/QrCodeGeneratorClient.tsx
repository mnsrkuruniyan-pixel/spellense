"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";

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

const FAQ_ITEMS: { q: string; a: React.ReactNode }[] = [
  {
    q: "What is a QR code generator?",
    a: "A QR code generator is an online tool that converts data—such as website URLs, text, Wi-Fi credentials, contact cards, emails, or phone numbers—into a two-dimensional scannable barcode matrix.",
  },
  {
    q: "Is the Spellense QR Code Generator free?",
    a: "Yes. Spellense is 100% free with no subscription, no hidden trial paywall, and no sign-up required. You can generate unlimited custom QR codes with high-res PNG and vector SVG downloads.",
  },
  {
    q: "Can I create a QR code online without signup?",
    a: "Yes. You can create, customize, test, and download your QR codes immediately in your browser without creating an account or providing an email address.",
  },
  {
    q: "What is the difference between Digital and Print mode?",
    a: "Digital mode is designed for screens, websites, and social media where scanning conditions are predictable, allowing instant download or sharing. Print mode is built for physical printing—such as business cards, packaging, and flyers—and includes our 4-condition scannability stress test to verify your code before you print.",
  },
  {
    q: "What does the stress test check?",
    a: "The stress test simulates four real-world scanning challenges: dim lighting (underexposure), camera blur, small print sizes (distance scanning), and angled scanning perspective using client-side image decoding to ensure readability.",
  },
  {
    q: "Can I create a QR code for a website?",
    a: "Yes. Select the URL option, enter your website address (starting with https://), and Spellense will instantly generate a clean, scannable QR code that directs users straight to your site.",
  },
  {
    q: "Can I add a contact card (vCard) QR code?",
    a: "Yes. Choosing vCard encodes your name, phone, email, organization, and job title into standard vCard 3.0 format so mobile cameras can save contact details with one tap.",
  },
  {
    q: "How do I make a printable QR code?",
    a: "Switch to Print mode, choose high contrast colors (such as black dots on a white background), select your desired dot and corner style, run the scannability stress test, and download at 3000px PNG or vector SVG.",
  },
  {
    q: "Why is QR code contrast important?",
    a: "QR code scanners require high contrast between foreground dots and the background to detect the matrix alignment markers. Dark dots on a clean light background ensure quick camera detection even in poor lighting.",
  },
  {
    q: "How can I make sure my QR code scans after printing?",
    a: (
      <>
        Always maintain high color contrast, avoid placing large logos that block more than 20% of the center, choose high error correction (Level H), and run the built-in scannability test before printing. You can also proofread your brochure copy using our{" "}
        <Link href="/" className="font-bold text-[#3158d5] hover:underline">
          Visual Spell Checker
        </Link>{" "}
        or optimize embedded graphic assets with our{" "}
        <Link href="/image-compressor" className="font-bold text-[#3158d5] hover:underline">
          Free Image Compressor
        </Link>.
      </>
    ),
  },
  {
    q: "Why is scannability testing recommended before printing?",
    a: "Once printed on physical paper or merchandise, QR codes cannot be edited. Running a scannability check catches contrast problems, dense payloads, and oversized logos before spending money on printing.",
  },
  {
    q: "What resolution can I download the QR code at?",
    a: "In Print mode, PNG downloads can be exported at 1000px, 2000px, or 3000px resolution. Digital mode exports high-resolution PNG at 2000px. Crisp vector SVG export is available in both modes for infinite scaling.",
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
  const [gateNotice, setGateNotice] = useState<string>("Tip: Run stress test to verify print scannability");
  const [gateNoticeType, setGateNoticeType] = useState<"normal" | "warn" | "ok">("normal");

  // Share & download status states
  const [isDownloadingPng, setIsDownloadingPng] = useState(false);
  const [isDownloadingSvg, setIsDownloadingSvg] = useState(false);
  const [shareSuccessMsg, setShareSuccessMsg] = useState<string | null>(null);

  // Custom Share Modal State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareTitle, setShareTitle] = useState("My QR Code");
  const [shareDescription, setShareDescription] = useState("Scan to view contents or connect.");
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [sharePreviewUrl, setSharePreviewUrl] = useState<string | null>(null);
  const [isImageCopied, setIsImageCopied] = useState(false);
  const [isSharingImage, setIsSharingImage] = useState(false);

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
    if (contentType === "text") return textVal.trim() || "Spellense QR Code";
    if (contentType === "wifi") {
      const ssid = wifiSsid.trim() || "MyWiFiNetwork";
      return `WIFI:T:${wifiEnc};S:${ssid};P:${wifiPass.trim()};;`;
    }
    if (contentType === "phone") return `tel:${phoneVal.trim() || "+1234567890"}`;
    if (contentType === "email") return `mailto:${emailVal.trim() || "hello@spellense.com"}`;
    if (contentType === "vcard") {
      const fn = vcName.trim() || "Spellense Contact";
      return [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${fn}`,
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
      margin: 26,
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
      margin: 26,
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
    setGateNotice("Tip: Run stress test to verify print scannability");
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
      setGateNotice(`${passCount}/${testDefs.length} passed — downloads remain active; adjust contrast or size if needed`);
      setGateNoticeType("warn");
    }

    setIsStressTesting(false);
  };

  // High-res Download helper
  const handleDownload = async (format: "png" | "svg") => {
    await ensureLibraries();
    if (!window.QRCodeStyling) return;

    const isDigital = mode === "digital";
    const payload = buildPayload();
    const size = isDigital ? 2000 : exportResolution;

    if (format === "png") {
      setIsDownloadingPng(true);
      try {
        const exportOptions: any = {
          width: size,
          height: size,
          data: payload,
          margin: Math.max(36, Math.round(size * 0.08)),
          qrOptions: { errorCorrectionLevel: isDigital ? "M" : ecLevel },
          dotsOptions: {
            color: fgColor,
            type: isDigital ? "square" : dotStyle,
          },
          backgroundOptions: { color: bgColor },
          cornersSquareOptions: {
            color: fgColor,
            type: isDigital ? "square" : (cornerStyle === "square" ? "square" : cornerStyle),
          },
        };

        if (!isDigital && logoDataUrl) {
          exportOptions.image = logoDataUrl;
          exportOptions.imageOptions = {
            crossOrigin: "anonymous",
            imageSize: logoSize / 100,
            margin: Math.round(size * 0.015),
          };
        }

        const exportInstance = new window.QRCodeStyling(exportOptions);

        let downloaded = false;
        try {
          const blob = await exportInstance.getRawData("png");
          if (blob) {
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = `spellense-qr-code-${size}px.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
            downloaded = true;
          }
        } catch {
          // fallback to built-in download
        }

        if (!downloaded) {
          await exportInstance.download({
            name: `spellense-qr-code-${size}px`,
            extension: "png",
          });
        }
      } catch (err) {
        console.error("PNG export failed:", err);
      } finally {
        setIsDownloadingPng(false);
      }
    } else {
      setIsDownloadingSvg(true);
      try {
        const exportOptions: any = {
          type: "svg",
          width: 2000,
          height: 2000,
          data: payload,
          margin: 160,
          qrOptions: { errorCorrectionLevel: isDigital ? "M" : ecLevel },
          dotsOptions: {
            color: fgColor,
            type: isDigital ? "square" : dotStyle,
          },
          backgroundOptions: { color: bgColor },
          cornersSquareOptions: {
            color: fgColor,
            type: isDigital ? "square" : (cornerStyle === "square" ? "square" : cornerStyle),
          },
        };

        if (!isDigital && logoDataUrl) {
          exportOptions.image = logoDataUrl;
          exportOptions.imageOptions = {
            crossOrigin: "anonymous",
            imageSize: logoSize / 100,
            margin: 30,
          };
        }

        const exportInstance = new window.QRCodeStyling(exportOptions);

        let downloaded = false;
        try {
          const blob = await exportInstance.getRawData("svg");
          if (blob) {
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = "spellense-qr-code-vector.svg";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
            downloaded = true;
          }
        } catch {
          // fallback to built-in download
        }

        if (!downloaded) {
          await exportInstance.download({
            name: "spellense-qr-code-vector",
            extension: "svg",
          });
        }
      } catch (err) {
        console.error("SVG export failed:", err);
      } finally {
        setIsDownloadingSvg(false);
      }
    }
  };

  // Helper to extract a high-res PNG blob of current QR
  const getQrBlob = useCallback(async (res = 1000): Promise<Blob | null> => {
    await ensureLibraries();
    if (!window.QRCodeStyling) return null;

    const isDigital = mode === "digital";
    const payload = buildPayload();
    const size = res;

    const exportOptions: any = {
      width: size,
      height: size,
      data: payload,
      margin: Math.max(36, Math.round(size * 0.08)),
      qrOptions: { errorCorrectionLevel: isDigital ? "M" : ecLevel },
      dotsOptions: {
        color: fgColor,
        type: isDigital ? "square" : dotStyle,
      },
      backgroundOptions: { color: bgColor || "#ffffff" },
      cornersSquareOptions: {
        color: fgColor,
        type: isDigital ? "square" : (cornerStyle === "square" ? "square" : cornerStyle),
      },
    };

    if (!isDigital && logoDataUrl) {
      exportOptions.image = logoDataUrl;
      exportOptions.imageOptions = {
        crossOrigin: "anonymous",
        imageSize: logoSize / 100,
        margin: Math.round(size * 0.015),
      };
    }

    const exportInstance = new window.QRCodeStyling(exportOptions);
    try {
      const blob = await exportInstance.getRawData("png");
      return blob || null;
    } catch {
      return null;
    }
  }, [mode, buildPayload, ecLevel, fgColor, dotStyle, bgColor, cornerStyle, logoDataUrl, logoSize, ensureLibraries]);

  // Open Custom Share Modal
  const handleOpenShareModal = async () => {
    setIsLinkCopied(false);
    setIsImageCopied(false);
    setIsShareModalOpen(true);
    try {
      const blob = await getQrBlob(600);
      if (blob) {
        const url = URL.createObjectURL(blob);
        setSharePreviewUrl(url);
      }
    } catch {
      // ignore
    }
  };

  // Close Custom Share Modal
  const handleCloseShareModal = () => {
    setIsShareModalOpen(false);
    if (sharePreviewUrl) {
      URL.revokeObjectURL(sharePreviewUrl);
      setSharePreviewUrl(null);
    }
  };

  // Copy QR Image to clipboard
  const handleCopyQrImage = async () => {
    try {
      const blob = await getQrBlob(1000);
      if (blob && typeof navigator !== "undefined" && navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setIsImageCopied(true);
        setShareSuccessMsg("QR Image copied to clipboard! Paste it directly into your post or chat.");
        setTimeout(() => {
          setIsImageCopied(false);
          setShareSuccessMsg(null);
        }, 4000);
        return;
      }
    } catch {
      // ignore
    }
    // Fallback if ClipboardItem not supported: download PNG
    handleDownload("png");
  };

  // Share QR Image file via native OS share
  const handleShareQrImageFile = async () => {
    setIsSharingImage(true);
    try {
      const blob = await getQrBlob(1000);
      if (blob) {
        const file = new File([blob], "qr-code.png", { type: "image/png" });
        if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: shareTitle || "My QR Code",
            text: shareDescription || "",
            files: [file],
          });
          setIsSharingImage(false);
          return;
        }
      }
    } catch {
      // cancelled or failed
    }
    setIsSharingImage(false);
    await handleCopyQrImage();
  };

  // Copy QR Content / Destination to clipboard
  const handleCopyShareLink = async () => {
    const payload = buildPayload();
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(payload);
        setIsLinkCopied(true);
        setShareSuccessMsg("QR Content copied to clipboard!");
        setTimeout(() => {
          setIsLinkCopied(false);
          setShareSuccessMsg(null);
        }, 3000);
      }
    } catch {
      // ignore
    }
  };

  // Social share triggers (User's QR Card: image + title + description)
  const handleSocialShare = async (platform: "whatsapp" | "facebook" | "instagram" | "linkedin" | "twitter" | "more") => {
    const payload = buildPayload();
    const origin = typeof window !== "undefined" && window.location.origin
      ? window.location.origin.replace("localhost:3000", "spellense.com").replace("127.0.0.1:3000", "spellense.com")
      : "https://spellense.com";
    const shareUrl = `${origin}/qr/card?data=${encodeURIComponent(payload)}&title=${encodeURIComponent(shareTitle || "My QR Code")}${shareDescription ? `&desc=${encodeURIComponent(shareDescription)}` : ""}`;
    const text = `${shareTitle || "My QR Code"}${shareDescription ? ` — ${shareDescription}` : ""}\n${shareUrl}`;

    if (platform === "whatsapp") {
      const waText = `${shareTitle || "My QR Code"}${shareDescription ? `\n${shareDescription}` : ""}\n\n${shareUrl}`;
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`, "_blank");
    } else if (platform === "facebook") {
      // Copy the QR Code Image to clipboard first so user can also paste the image directly if creating a photo post!
      try {
        const blob = await getQrBlob(1000);
        if (blob && typeof navigator !== "undefined" && navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          setShareSuccessMsg("QR Image copied! You can paste (Ctrl+V / Cmd+V) it directly into Facebook.");
          setTimeout(() => setShareSuccessMsg(null), 4000);
        }
      } catch {}

      // Open Facebook share dialog pointing to the QR Card URL (which displays QR code image, title, and description)
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
        "_blank",
        "width=600,height=500,menubar=no,toolbar=no,resizable=yes"
      );
    } else if (platform === "instagram") {
      try {
        const blob = await getQrBlob(1000);
        if (blob && typeof navigator !== "undefined" && navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        }
      } catch {}
      setShareSuccessMsg("QR Image copied! Opening Instagram...");
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
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
        "_blank",
        "width=600,height=500,menubar=no,toolbar=no,resizable=yes"
      );
    } else if (platform === "more") {
      await handleShareQrImageFile();
    }
  };

  return (
    <div
      style={{ backgroundColor: "#faf9f6" }}
      className="flex min-h-screen flex-col font-sans text-[#1c201a] antialiased selection:bg-[#bcd5ff] selection:text-black relative z-10 text-[15px]"
    >
      {/* NAVBAR */}
      <Navbar />

      <main id="main-content" style={{ backgroundColor: "#faf9f6" }} className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden">
          <div className="relative mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 pb-16 pt-6 sm:pt-10">
            
            {/* HERO TITLE & BADGES */}
            <div className="mx-auto max-w-5xl text-center pb-2">
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
                  Sharp QR codes.
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
                  Scannable everywhere.
                </span>
              </h1>

              {/* 3 Trust Badges (Replaced Subtitle) */}
              <div
                style={{ marginTop: "20px", marginBottom: "8px" }}
                className="inline-flex flex-nowrap items-center justify-center gap-1.5 sm:gap-3 max-w-full"
              >
                <span
                  style={{ backgroundColor: "#e8effe", borderColor: "#bcd5ff", color: "#3158d5" }}
                  className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full border px-2 py-0.5 sm:px-3.5 sm:py-1.5 shadow-2xs font-bold text-[10px] sm:text-xs shrink-0 whitespace-nowrap"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-[#3158d5] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                  <span className="sm:hidden">100% Private</span>
                  <span className="hidden sm:inline">100% Client-Side Privacy</span>
                </span>
                <span
                  style={{ backgroundColor: "#e8effe", borderColor: "#bcd5ff", color: "#3158d5" }}
                  className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full border px-2 py-0.5 sm:px-3.5 sm:py-1.5 shadow-2xs font-bold text-[10px] sm:text-xs shrink-0 whitespace-nowrap"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-[#3158d5] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="sm:hidden">Print-Tested</span>
                  <span className="hidden sm:inline">Stress-Tested for Print</span>
                </span>
                <span
                  style={{ backgroundColor: "#e8effe", borderColor: "#bcd5ff", color: "#3158d5" }}
                  className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full border px-2 py-0.5 sm:px-3.5 sm:py-1.5 shadow-2xs font-bold text-[10px] sm:text-xs shrink-0 whitespace-nowrap"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-[#3158d5] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                  </svg>
                  <span className="sm:hidden">Vector SVG &amp; PNG</span>
                  <span className="hidden sm:inline">Vector SVG &amp; 3000px PNG</span>
                </span>
              </div>
            </div>

            {/* WORKSPACE & TOOL SECTION */}
            <div
              className="mx-auto mt-6 sm:mt-8 w-full"
            >
              {/* MODE SWITCHER TABS: Digital vs Print */}
              <div className="mx-auto max-w-xs mb-6 sm:mb-8">
                <div
                  style={{
                    backgroundColor: "#efeee7",
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                  }}
                  className="p-1 rounded-2xl flex items-center shadow-2xs"
                >
                  <button
                    type="button"
                    onClick={() => setMode("digital")}
                    style={{
                      backgroundColor: mode === "digital" ? "#3158d5" : "transparent",
                      color: mode === "digital" ? "#ffffff" : "#575a53",
                      boxShadow: mode === "digital" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer"
                  >
                    {/* Digital / Screen SVG Icon */}
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="14" x="2" y="3" rx="2" />
                      <line x1="8" x2="16" y1="21" y2="21" />
                      <line x1="12" x2="12" y1="17" y2="21" />
                    </svg>
                    <span>Digital</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode("print")}
                    style={{
                      backgroundColor: mode === "print" ? "#3158d5" : "transparent",
                      color: mode === "print" ? "#ffffff" : "#575a53",
                      boxShadow: mode === "print" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer"
                  >
                    {/* Print / Printer SVG Icon */}
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 6 2 18 2 18 9" />
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                      <rect width="12" height="8" x="6" y="14" />
                    </svg>
                    <span>Print</span>
                  </button>
                </div>
              </div>

              {/* UNIFIED SPLIT CARD CONTAINER */}
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
                <div className="flex flex-col lg:flex-row items-stretch w-full">
                  
                  {/* LEFT COLUMN: CONTROLS (38% ON DESKTOP, MATCHING HOMEPAGE) */}
                  <div
                    style={{
                      borderRight: "1px solid #e5e5df",
                      backgroundColor: "#ffffff",
                    }}
                    className="w-full qr-card-left-col p-5 sm:p-6 lg:p-7 flex flex-col justify-between"
                  >
                <div>
                  {/* Left Header */}
                  <div
                    style={{
                      borderBottom: "1px solid #e5e5df",
                      paddingBottom: "14px",
                      marginBottom: "20px",
                    }}
                    className="flex items-center justify-between"
                  >
                    <span
                      style={{
                        backgroundColor: "#efeee7",
                        color: "#3158d5",
                        border: "1px solid #e5e5df",
                      }}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                    >
                      {mode === "digital" ? (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="20" height="14" x="2" y="3" rx="2" />
                            <line x1="8" x2="16" y1="21" y2="21" />
                            <line x1="12" x2="12" y1="17" y2="21" />
                          </svg>
                          <span>Digital QR Matrix</span>
                        </>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 6 2 18 2 18 9" />
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                            <rect width="12" height="8" x="6" y="14" />
                          </svg>
                          <span>Print Press Vector</span>
                        </>
                      )}
                    </span>

                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8e928a]">
                      {mode === "digital" ? "INSTANT WEBSHARE" : "3000PX / VECTOR SVG"}
                    </span>
                  </div>

                  {/* DIGITAL MODE: FLAT MINIMAL FORM */}
                  {mode === "digital" && (
                    <div className="space-y-6 sm:space-y-7">
                      {/* Content Type Selector */}
                      <div className="pt-1">
                        <label
                          style={{
                            display: "block",
                            fontSize: "12px",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            color: "#70746d",
                            marginBottom: "10px",
                          }}
                        >
                          Content Type
                        </label>
                        <div style={{ position: "relative", marginTop: "4px" }} className="relative w-full">
                          <select
                            value={contentType}
                            onChange={(e) => setContentType(e.target.value as ContentType)}
                            style={{
                              backgroundColor: "#faf9f6",
                              borderColor: "#e5e5df",
                              borderWidth: "1px",
                              borderStyle: "solid",
                              color: "#1c201a",
                              height: "46px",
                              lineHeight: "46px",
                              paddingLeft: "16px",
                              paddingRight: "40px",
                              paddingTop: "0px",
                              paddingBottom: "0px",
                              fontSize: "14px",
                              fontWeight: 600,
                              boxSizing: "border-box",
                              outline: "none",
                              width: "100%",
                            }}
                            className="w-full rounded-xl appearance-none cursor-pointer shadow-2xs focus:ring-2 focus:ring-[#3158d5]/20 focus:border-[#3158d5]"
                          >
                            <option value="url">Website link (URL)</option>
                            <option value="text">Plain text</option>
                            <option value="wifi">WiFi network</option>
                            <option value="phone">Phone number</option>
                            <option value="email">Email address</option>
                            <option value="vcard">Contact card (vCard)</option>
                          </select>
                          <div
                            style={{
                              position: "absolute",
                              right: "16px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              pointerEvents: "none",
                            }}
                            className="flex items-center text-[#70746d]"
                          >
                            <svg className="w-4 h-4 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Dynamic Fields */}
                      <div className="mt-5">
                        {renderFieldsGroup()}
                      </div>

                      {/* Colors Row */}
                      <div className="grid grid-cols-2 gap-4 sm:gap-5" style={{ marginTop: "24px" }}>
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: "12px",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              color: "#70746d",
                              marginBottom: "10px",
                            }}
                          >
                            QR Color
                          </label>
                          <div
                            style={{
                              backgroundColor: "#faf9f6",
                              borderColor: "#e5e5df",
                              borderWidth: "1px",
                              borderStyle: "solid",
                              height: "46px",
                              boxSizing: "border-box",
                            }}
                            className="flex items-center gap-3 px-3.5 rounded-xl"
                          >
                            <input
                              type="color"
                              value={fgColor}
                              onChange={(e) => setFgColor(e.target.value)}
                              className="h-7 w-7 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
                            />
                            <span className="text-xs font-mono font-bold text-[#1c201a] uppercase">
                              {fgColor}
                            </span>
                          </div>
                        </div>

                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: "12px",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              color: "#70746d",
                              marginBottom: "10px",
                            }}
                          >
                            Background
                          </label>
                          <div
                            style={{
                              backgroundColor: "#faf9f6",
                              borderColor: "#e5e5df",
                              borderWidth: "1px",
                              borderStyle: "solid",
                              height: "46px",
                              boxSizing: "border-box",
                            }}
                            className="flex items-center gap-3 px-3.5 rounded-xl"
                          >
                            <input
                              type="color"
                              value={bgColor}
                              onChange={(e) => setBgColor(e.target.value)}
                              className="h-7 w-7 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
                            />
                            <span className="text-xs font-mono font-bold text-[#1c201a] uppercase">
                              {bgColor}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PRINT MODE: ACCORDION BASED FORM */}
                  {mode === "print" && (
                    <div className="space-y-3.5">
                      
                      {/* ACCORDION 1: CONTENT */}
                      <div
                        style={{
                          borderColor: "#e5e5df",
                          borderWidth: "1px",
                          borderStyle: "solid",
                          backgroundColor: "#ffffff",
                        }}
                        className="rounded-2xl overflow-hidden transition-all bg-white"
                      >
                        <button
                          type="button"
                          onClick={() => toggleSection("content")}
                          style={{
                            backgroundColor: "#faf9f6",
                            color: "#1c201a",
                          }}
                          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#f6f5f3] text-left font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <svg className="w-4 h-4 text-[#3158d5] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                              <line x1="16" x2="8" y1="13" y2="13" />
                              <line x1="16" x2="8" y1="17" y2="17" />
                            </svg>
                            <span>1. Content Details</span>
                          </div>
                          <svg
                            className={`w-4 h-4 text-[#70746d] transition-transform duration-200 ${
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
                          <div
                            style={{
                              borderTopColor: "#e5e5df",
                              borderTopWidth: "1px",
                              borderTopStyle: "solid",
                              backgroundColor: "#ffffff",
                            }}
                            className="p-5 space-y-4"
                          >
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-[#70746d] mb-2">
                                Content Type
                              </label>
                              <div className="relative">
                                <select
                                  value={contentType}
                                  onChange={(e) => setContentType(e.target.value as ContentType)}
                                  style={{
                                    backgroundColor: "#faf9f6",
                                    borderColor: "#e5e5df",
                                    borderWidth: "1px",
                                    borderStyle: "solid",
                                    color: "#1c201a",
                                  }}
                                  className="w-full rounded-xl py-2.5 px-3.5 pr-10 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#3158d5]/20 focus:border-[#3158d5] appearance-none cursor-pointer shadow-2xs"
                                >
                                  <option value="url">Website link (URL)</option>
                                  <option value="text">Plain text</option>
                                  <option value="wifi">WiFi network</option>
                                  <option value="phone">Phone number</option>
                                  <option value="email">Email address</option>
                                  <option value="vcard">Contact card (vCard)</option>
                                </select>
                                <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center text-[#70746d]">
                                  <svg className="w-4 h-4 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="6 9 12 15 18 9" />
                                  </svg>
                                </div>
                              </div>
                            </div>

                            {/* Dynamic Fields */}
                            <div className="mt-5">
                              {renderFieldsGroup()}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ACCORDION 2: DESIGN & STYLES */}
                      <div
                        style={{
                          borderColor: "#e5e5df",
                          borderWidth: "1px",
                          borderStyle: "solid",
                          backgroundColor: "#ffffff",
                        }}
                        className="rounded-2xl overflow-hidden transition-all bg-white"
                      >
                        <button
                          type="button"
                          onClick={() => toggleSection("design")}
                          style={{
                            backgroundColor: "#faf9f6",
                            color: "#1c201a",
                          }}
                          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#f6f5f3] text-left font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <svg className="w-4 h-4 text-[#3158d5] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <path d="m4.93 4.93 4.24 4.24" />
                              <path d="m14.83 9.17 4.24-4.24" />
                              <path d="m14.83 14.83 4.24 4.24" />
                              <path d="m9.17 14.83-4.24 4.24" />
                            </svg>
                            <span>2. Design &amp; Styling</span>
                          </div>
                          <svg
                            className={`w-4 h-4 text-[#70746d] transition-transform duration-200 ${
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
                          <div
                            style={{
                              borderTopColor: "#e5e5df",
                              borderTopWidth: "1px",
                              borderTopStyle: "solid",
                              backgroundColor: "#ffffff",
                            }}
                            className="p-5 space-y-5"
                          >
                            {/* Dot Style */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-[#70746d]">
                                  Dot Style
                                </label>
                                <span className="text-[11px] font-bold text-[#3158d5] bg-[#e8effe] px-2 py-0.5 rounded capitalize">
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
                                      style={{
                                        backgroundColor: isSel ? "#e8effe" : "#ffffff",
                                        borderColor: isSel ? "#3158d5" : "#e5e5df",
                                        borderWidth: isSel ? "2px" : "1px",
                                        borderStyle: "solid",
                                        color: isSel ? "#3158d5" : "#575a53",
                                      }}
                                      className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center transition-all cursor-pointer relative group"
                                    >
                                      {item.icon}
                                      <span className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#1c201a] text-white text-[10px] font-bold py-0.5 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-sm">
                                        {item.title}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Corner Style */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-[#70746d]">
                                  Corner Style
                                </label>
                                <span className="text-[11px] font-bold text-[#3158d5] bg-[#e8effe] px-2 py-0.5 rounded capitalize">
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
                                      style={{
                                        backgroundColor: isSel ? "#e8effe" : "#ffffff",
                                        borderColor: isSel ? "#3158d5" : "#e5e5df",
                                        borderWidth: isSel ? "2px" : "1px",
                                        borderStyle: "solid",
                                        color: isSel ? "#3158d5" : "#575a53",
                                      }}
                                      className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center transition-all cursor-pointer relative group"
                                    >
                                      {item.icon}
                                      <span className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#1c201a] text-white text-[10px] font-bold py-0.5 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-sm">
                                        {item.title}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Colors */}
                            <div className="grid grid-cols-2 gap-4 pt-1">
                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[#70746d] mb-2">
                                  QR Color
                                </label>
                                <div
                                  style={{
                                    backgroundColor: "#faf9f6",
                                    borderColor: "#e5e5df",
                                    borderWidth: "1px",
                                    borderStyle: "solid",
                                  }}
                                  className="flex items-center gap-3 p-2 rounded-xl"
                                >
                                  <input
                                    type="color"
                                    value={fgColor}
                                    onChange={(e) => setFgColor(e.target.value)}
                                    className="h-9 w-9 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
                                  />
                                  <span className="text-xs font-mono font-bold text-[#1c201a] uppercase">
                                    {fgColor}
                                  </span>
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[#70746d] mb-2">
                                  Background
                                </label>
                                <div
                                  style={{
                                    backgroundColor: "#faf9f6",
                                    borderColor: "#e5e5df",
                                    borderWidth: "1px",
                                    borderStyle: "solid",
                                  }}
                                  className="flex items-center gap-3 p-2 rounded-xl"
                                >
                                  <input
                                    type="color"
                                    value={bgColor}
                                    onChange={(e) => setBgColor(e.target.value)}
                                    className="h-9 w-9 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
                                  />
                                  <span className="text-xs font-mono font-bold text-[#1c201a] uppercase">
                                    {bgColor}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ACCORDION 3: LOGO */}
                      <div
                        style={{
                          borderColor: "#e5e5df",
                          borderWidth: "1px",
                          borderStyle: "solid",
                          backgroundColor: "#ffffff",
                        }}
                        className="rounded-2xl overflow-hidden transition-all bg-white"
                      >
                        <button
                          type="button"
                          onClick={() => toggleSection("logo")}
                          style={{
                            backgroundColor: "#faf9f6",
                            color: "#1c201a",
                          }}
                          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#f6f5f3] text-left font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <svg className="w-4 h-4 text-[#3158d5] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                              <circle cx="9" cy="9" r="2" />
                              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                            </svg>
                            <span>3. Logo &amp; Watermark</span>
                          </div>
                          <svg
                            className={`w-4 h-4 text-[#70746d] transition-transform duration-200 ${
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
                          <div
                            style={{
                              borderTopColor: "#e5e5df",
                              borderTopWidth: "1px",
                              borderTopStyle: "solid",
                              backgroundColor: "#ffffff",
                            }}
                            className="p-5 space-y-4"
                          >
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-[#70746d] mb-2">
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
                                  style={{
                                    borderColor: "#deded6",
                                    borderWidth: "2px",
                                    borderStyle: "dashed",
                                    backgroundColor: "#faf9f6",
                                  }}
                                  className="hover:border-[#3158d5] hover:bg-[#3158d5]/5 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
                                >
                                  <div
                                    style={{ backgroundColor: "#f6f5f3" }}
                                    className="w-12 h-12 rounded-xl group-hover:bg-[#e8effe] text-[#575a53] group-hover:text-[#3158d5] flex items-center justify-center transition-colors mb-2.5 shadow-2xs"
                                  >
                                    <svg className="w-6 h-6 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                      <polyline points="17 8 12 3 7 8" />
                                      <line x1="12" y1="3" x2="12" y2="15" />
                                    </svg>
                                  </div>
                                  <span className="text-xs font-bold text-[#1c201a] group-hover:text-[#3158d5] transition-colors">
                                    Click to upload logo (SVG / PNG / JPG)
                                  </span>
                                  <span className="text-[11px] font-semibold text-[#70746d] mt-0.5">
                                    Center brand icon on your QR code
                                  </span>
                                </div>
                              ) : (
                                <div
                                  style={{
                                    backgroundColor: "#faf9f6",
                                    borderColor: "#e5e5df",
                                    borderWidth: "1px",
                                    borderStyle: "solid",
                                  }}
                                  className="flex items-center justify-between p-3.5 rounded-2xl"
                                >
                                  <div className="flex items-center gap-3">
                                    <div
                                      style={{ backgroundColor: "#ffffff", borderColor: "#e5e5df" }}
                                      className="w-11 h-11 rounded-xl border p-1 flex items-center justify-center overflow-hidden shadow-2xs shrink-0"
                                    >
                                      <img src={logoDataUrl} alt="Logo preview" className="max-w-full max-h-full object-contain" />
                                    </div>
                                    <div className="text-left">
                                      <span className="block text-xs font-bold text-[#1c201a]">Brand Logo Active</span>
                                      <span className="block text-[11px] font-semibold text-[#70746d]">Centered on QR code</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => logoInputRef.current?.click()}
                                      style={{
                                        borderColor: "#e5e5df",
                                        backgroundColor: "#ffffff",
                                        color: "#575a53",
                                      }}
                                      className="text-xs font-bold hover:text-[#1c201a] px-3 py-1.5 rounded-lg border hover:bg-[#f6f5f3] transition-colors cursor-pointer"
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
                                  <label className="text-xs font-bold uppercase tracking-wider text-[#70746d]">
                                    Logo Scale
                                  </label>
                                  <span className="text-xs font-bold text-[#3158d5] bg-[#e8effe] px-2 py-0.5 rounded-md">
                                    {logoSize}%
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min="10"
                                  max="40"
                                  value={logoSize}
                                  onChange={(e) => setLogoSize(parseInt(e.target.value, 10))}
                                  className="w-full accent-[#3158d5] cursor-pointer"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* ACCORDION 4: PRINT SETTINGS */}
                      <div
                        style={{
                          borderColor: "#e5e5df",
                          borderWidth: "1px",
                          borderStyle: "solid",
                          backgroundColor: "#ffffff",
                        }}
                        className="rounded-2xl overflow-hidden transition-all bg-white"
                      >
                        <button
                          type="button"
                          onClick={() => toggleSection("settings")}
                          style={{
                            backgroundColor: "#faf9f6",
                            color: "#1c201a",
                          }}
                          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#f6f5f3] text-left font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <svg className="w-4 h-4 text-[#3158d5] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="3" />
                              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                            </svg>
                            <span>4. Print Settings &amp; Capacity</span>
                          </div>
                          <svg
                            className={`w-4 h-4 text-[#70746d] transition-transform duration-200 ${
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
                          <div
                            style={{
                              borderTopColor: "#e5e5df",
                              borderTopWidth: "1px",
                              borderTopStyle: "solid",
                              backgroundColor: "#ffffff",
                            }}
                            className="p-5 space-y-4"
                          >
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-[#70746d] mb-2">
                                Error Correction Level
                              </label>
                              <div className="relative">
                                <select
                                  value={ecLevel}
                                  onChange={(e) => setEcLevel(e.target.value as EcLevel)}
                                  style={{
                                    backgroundColor: "#faf9f6",
                                    borderColor: "#e5e5df",
                                    borderWidth: "1px",
                                    borderStyle: "solid",
                                    color: "#1c201a",
                                  }}
                                  className="w-full rounded-xl py-2.5 px-3.5 pr-10 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#3158d5]/20 focus:border-[#3158d5] appearance-none cursor-pointer shadow-2xs"
                                >
                                  <option value="L">L - Low (7% recovery, high capacity)</option>
                                  <option value="M">M - Medium (15% recovery, standard)</option>
                                  <option value="Q">Q - Quartile (25% recovery, logo safe)</option>
                                  <option value="H">H - High (30% recovery, maximum safety)</option>
                                </select>
                                <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center text-[#70746d]">
                                  <svg className="w-4 h-4 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="6 9 12 15 18 9" />
                                  </svg>
                                </div>
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-[#70746d] mb-2">
                                Print Material
                              </label>
                              <div className="relative">
                                <select
                                  value={material}
                                  onChange={(e) => setMaterial(e.target.value as Material)}
                                  style={{
                                    backgroundColor: "#faf9f6",
                                    borderColor: "#e5e5df",
                                    borderWidth: "1px",
                                    borderStyle: "solid",
                                    color: "#1c201a",
                                  }}
                                  className="w-full rounded-xl py-2.5 px-3.5 pr-10 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#3158d5]/20 focus:border-[#3158d5] appearance-none cursor-pointer shadow-2xs"
                                >
                                  <option value="matte">Matte paper</option>
                                  <option value="glossy">Glossy coated</option>
                                  <option value="fabric">Fabric / Apparel</option>
                                </select>
                                <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center text-[#70746d]">
                                  <svg className="w-4 h-4 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="6 9 12 15 18 9" />
                                  </svg>
                                </div>
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-[#70746d] mb-2">
                                Where will this be printed?
                              </label>
                              <div className="relative">
                                <select
                                  value={printUseCase}
                                  onChange={(e) => setPrintUseCase(e.target.value as PrintUseCase)}
                                  style={{
                                    backgroundColor: "#faf9f6",
                                    borderColor: "#e5e5df",
                                    borderWidth: "1px",
                                    borderStyle: "solid",
                                    color: "#1c201a",
                                  }}
                                  className="w-full rounded-xl py-2.5 px-3.5 pr-10 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#3158d5]/20 focus:border-[#3158d5] appearance-none cursor-pointer shadow-2xs"
                                >
                                  <option value="business-card">Business card (close-up ~15 cm)</option>
                                  <option value="flyer">Flyer / Menu (arm&apos;s length ~40 cm)</option>
                                  <option value="poster">Poster (across a room ~150 cm)</option>
                                  <option value="billboard">Billboard / Signage (far away ~500 cm)</option>
                                </select>
                                <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center text-[#70746d]">
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
              </div>

              {/* RIGHT COLUMN: PREVIEW & ACTIONS (62% ON DESKTOP, MATCHING HOMEPAGE) */}
              <div
                style={{ backgroundColor: "#ecebe4" }}
                className="w-full qr-card-right-col p-5 sm:p-7 flex flex-col items-center justify-between text-center"
              >
                <div className="w-full flex flex-col items-center">
                  {/* Right Header */}
                  <div
                    style={{
                      borderBottom: "1px solid #deded6",
                      paddingBottom: "14px",
                      marginBottom: "20px",
                    }}
                    className="w-full flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-[#1c201a]">
                      <span style={{ backgroundColor: "#3158d5" }} className="flex h-2 w-2 rounded-full animate-pulse" />
                      <span>{mode === "digital" ? "Digital Preview" : "Print Ready Preview"}</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8e928a]">
                      Client-Side Render
                    </span>
                  </div>

                  {/* QR Preview Box */}
                  <div
                    style={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      width: "270px",
                      height: "270px",
                      maxWidth: "100%",
                    }}
                    className="mx-auto rounded-2xl flex items-center justify-center overflow-hidden shadow-2xs relative p-3 sm:p-4 my-4 sm:my-5"
                  >
                    {mode === "digital" ? (
                      <div ref={digitalPreviewRef} className="w-full h-full flex items-center justify-center [&_svg]:max-w-full [&_svg]:max-h-full [&_canvas]:max-w-full [&_canvas]:max-h-full" />
                    ) : (
                      <div ref={printPreviewRef} className="w-full h-full flex items-center justify-center [&_svg]:max-w-full [&_svg]:max-h-full [&_canvas]:max-w-full [&_canvas]:max-h-full" />
                    )}
                  </div>

                  {/* PRINT MODE: STRESS TEST BUTTON & CARD */}
                  {mode === "print" && (
                    <div className="w-full mt-4 space-y-3">
                      <button
                        type="button"
                        onClick={runStressTest}
                        disabled={isStressTesting}
                        style={{
                          backgroundColor: isStressTesting
                            ? "#efeee7"
                            : stressTested
                            ? "#ecfdf5"
                            : stressResults.length > 0
                            ? "#fffbeb"
                            : "#3158d5",
                          color: isStressTesting
                            ? "#70746d"
                            : stressTested
                            ? "#065f46"
                            : stressResults.length > 0
                            ? "#78350f"
                            : "#ffffff",
                          borderColor: stressTested
                            ? "#a7f3d0"
                            : stressResults.length > 0
                            ? "#fde68a"
                            : "#3158d5",
                          borderWidth: "1px",
                          borderStyle: "solid",
                        }}
                        className="w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs hover:opacity-95"
                      >
                        {isStressTesting ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-[#3158d5]" viewBox="0 0 24 24" fill="none">
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
                        ) : stressResults.length > 0 ? (
                          <>
                            <svg className="w-4 h-4 text-amber-600 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                              <line x1="12" y1="9" x2="12" y2="13" />
                              <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            <span>Re-test Scannability ({stressPassCount}/4 Passed)</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 text-white stroke-[2.2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                            </svg>
                            <span>Stress test this QR code</span>
                          </>
                        )}
                      </button>

                      {/* Stress Test Results Box */}
                      {stressResults.length > 0 && (
                        <div
                          style={{
                            borderColor: "#e5e5df",
                            borderWidth: "1px",
                            borderStyle: "solid",
                            backgroundColor: "#ffffff",
                          }}
                          className="p-3.5 rounded-xl text-left space-y-2 shadow-2xs"
                        >
                          <div style={{ borderColor: "#e5e5df" }} className="flex items-center justify-between pb-1.5 border-b">
                            <span className="text-[11px] font-bold text-[#1c201a] uppercase tracking-wider">
                              Stress Test Results
                            </span>
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                                stressPassCount === 4
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {stressPassCount}/4 Passed
                            </span>
                          </div>

                          <ul className="space-y-1 text-xs font-semibold">
                            {stressResults.map((item) => (
                              <li key={item.key} className="flex items-center justify-between">
                                <span className="text-[#575a53]">{item.label}</span>
                                <span
                                  className={`inline-flex items-center gap-1 font-bold ${
                                    item.passed ? "text-emerald-600" : "text-rose-500"
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

                      {/* Verification / Attention Notice */}
                      <div
                        style={{
                          backgroundColor: stressTested
                            ? "#ecfdf5"
                            : stressResults.length > 0
                            ? "#fffbeb"
                            : "#ffffff",
                          borderColor: stressTested
                            ? "#a7f3d0"
                            : stressResults.length > 0
                            ? "#fde68a"
                            : "#e5e5df",
                          borderWidth: "1px",
                          borderStyle: "solid",
                        }}
                        className={`p-2.5 rounded-xl text-xs text-center transition-all ${
                          stressTested
                            ? "text-emerald-800 font-bold"
                            : stressResults.length > 0
                            ? "text-amber-900 font-bold"
                            : "text-[#70746d] font-medium"
                        }`}
                      >
                        {stressTested
                          ? "✓ Verified — 4/4 conditions passed, ready for print"
                          : stressResults.length > 0
                          ? `⚠️ Scan check: ${stressPassCount}/4 passed. Downloads remain active, but check contrast/size for optimal scanning.`
                          : "💡 Tip: Run stress test to verify scannability under dim, blur, and angled conditions"}
                      </div>

                      {/* Resolution selector (strictly 1 single horizontal row) */}
                      <div className="pt-1 text-left">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-[#1c201a]">PNG Resolution</span>
                          <span className="text-[11px] font-bold text-[#3158d5] bg-[#e8effe] px-2.5 py-0.5 rounded-full border border-[#3158d5]/20">
                            {exportResolution} × {exportResolution} px
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 py-1.5 px-1">
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
                                className="group inline-flex items-center gap-2 cursor-pointer select-none transition-all focus:outline-none"
                              >
                                <div
                                  style={{
                                    backgroundColor: isSel ? "#3158d5" : "#ffffff",
                                    borderColor: isSel ? "#3158d5" : "#deded6",
                                  }}
                                  className={`h-5 w-5 shrink-0 rounded-[7px] border-2 flex items-center justify-center transition-all ${
                                    !isSel ? "group-hover:border-[#70746d]" : ""
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
                                <span className="text-xs font-bold text-[#1c201a]">
                                  {opt.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ACTION BUTTONS: PNG, SVG, SHARE — ALL EXACT SAME SIZE (GRID-COLS-3) */}
                <div className="w-full mt-5 grid grid-cols-3 gap-2 sm:gap-2.5">
                  {/* PNG Download */}
                  <button
                    type="button"
                    onClick={() => handleDownload("png")}
                    disabled={isDownloadingPng}
                    style={{
                      backgroundColor: "#3158d5",
                      color: "#ffffff",
                      height: "44px",
                      boxSizing: "border-box",
                    }}
                    className="group inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-1.5 sm:px-2.5 text-xs sm:text-[13px] font-bold shadow-xs hover:opacity-95 active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full truncate"
                  >
                    {isDownloadingPng ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white shrink-0" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        <span className="truncate">Exporting…</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 text-white/90 group-hover:text-white shrink-0 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        <span className="truncate">Download PNG</span>
                      </>
                    )}
                  </button>

                  {/* SVG Download */}
                  <button
                    type="button"
                    onClick={() => handleDownload("svg")}
                    disabled={isDownloadingSvg}
                    style={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      color: "#1c201a",
                      height: "44px",
                      boxSizing: "border-box",
                    }}
                    className="group inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl border px-1.5 sm:px-2.5 text-xs sm:text-[13px] font-bold hover:bg-[#faf9f6] hover:border-[#deded6] hover:text-[#3158d5] shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full truncate"
                  >
                    {isDownloadingSvg ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-[#3158d5] shrink-0" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        <span className="truncate">Exporting…</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 text-[#70746d] group-hover:text-[#3158d5] shrink-0 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="12 2 2 7 12 12 22 7 12 2" />
                          <polyline points="2 17 12 22 22 17" />
                          <polyline points="2 12 12 17 22 12" />
                        </svg>
                        <span className="truncate">Download SVG</span>
                      </>
                    )}
                  </button>

                  {/* Share Button */}
                  <button
                    type="button"
                    onClick={handleOpenShareModal}
                    style={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      color: "#1c201a",
                      height: "44px",
                      boxSizing: "border-box",
                    }}
                    className="group inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl border px-1.5 sm:px-2.5 text-xs sm:text-[13px] font-bold hover:bg-[#faf9f6] hover:border-[#deded6] hover:text-[#3158d5] shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer w-full truncate"
                  >
                    <svg className="w-4 h-4 text-[#70746d] group-hover:text-[#3158d5] shrink-0 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                    <span className="truncate">Share QR Code</span>
                  </button>
                </div>

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

        {/* 3 TRUST PILLARS (HOMEPAGE MATCH) */}
        <ScrollReveal delay={100}>
          <div
            style={{ marginTop: "36px", marginBottom: "0px" }}
            className="flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-xs sm:text-[13px] font-medium text-[#575a53] mx-auto text-center w-full"
          >
            <div className="flex items-center gap-2">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Free. No signup.</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600">
                <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z"/>
              </svg>
              <span>Private, in-browser engine</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span>Zero permanent file storage</span>
            </div>
          </div>
        </ScrollReveal>

        {/* EXPLANATORY SEO & PRODUCT SECTIONS (HOMEPAGE MATCH - PERFECTLY ALIGNED) */}
        <div
          style={{
            borderTop: "1px solid #e5e5df",
            marginTop: "48px",
            paddingTop: "48px",
          }}
          className="w-full"
        >
          <div className="mx-auto w-full space-y-4 sm:space-y-6">
          
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
                Free QR Code Generator
              </h2>
              <p className="mt-2.5 text-xs sm:text-sm text-[#575a53] leading-relaxed font-normal">
                Create a free QR code online for websites, text, Wi-Fi, email, phone numbers, and contact information. Customize your QR code, test its scannability, and download it as a high-quality PNG or SVG for immediate digital or print publishing.
              </p>
            </div>
          </ScrollReveal>

          {/* SECTION 2: DIGITAL & PRINT (MOVED UP FOR IMMEDIATE RELEVANCE) */}
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
              <h2
                style={{
                  display: "block",
                  marginBottom: "24px",
                }}
                className="text-xl sm:text-2xl font-black text-[#1c201a] tracking-tight"
              >
                QR Codes for Digital and Print
              </h2>
              <div
                style={{ marginTop: "24px" }}
                className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6"
              >
                <div
                  style={{
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    backgroundColor: "#faf9f6",
                  }}
                  className="rounded-2xl p-5"
                >
                  <div className="flex items-center gap-3.5 mb-3">
                    <div
                      style={{
                        backgroundColor: "#f6f5f3",
                        borderColor: "#e5e5df",
                        borderWidth: "1px",
                        borderStyle: "solid",
                        color: "#3158d5",
                      }}
                      className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl shrink-0 shadow-2xs"
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="14" x="2" y="3" rx="2" />
                        <line x1="8" x2="16" y1="21" y2="21" />
                        <line x1="12" x2="12" y1="17" y2="21" />
                      </svg>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-[#1c201a]">Digital QR Codes</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-[#575a53] leading-relaxed font-normal">
                    Digital QR codes are optimized for screens where lighting and pixels are predictable. Perfect for websites, social media channels, email signatures, presentation decks, video overlays, and mobile content, digital mode produces clean, high-contrast QR codes ready for instant download or one-click sharing.
                  </p>
                </div>

                <div
                  style={{
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    backgroundColor: "#faf9f6",
                  }}
                  className="rounded-2xl p-5"
                >
                  <div className="flex items-center gap-3.5 mb-3">
                    <div
                      style={{
                        backgroundColor: "#f6f5f3",
                        borderColor: "#e5e5df",
                        borderWidth: "1px",
                        borderStyle: "solid",
                        color: "#3158d5",
                      }}
                      className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl shrink-0 shadow-2xs"
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 6 2 18 2 18 9" />
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                        <rect width="12" height="8" x="6" y="14" />
                      </svg>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-[#1c201a]">Print QR Codes</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-[#575a53] leading-relaxed font-normal">
                    Print QR codes require special care because ink, paper textures, and lighting cannot be edited after printing. Engineered for business cards, flyers, posters, restaurant menus, product packaging, brochures, and banners, print mode includes our 4-point scannability stress test to ensure reliable scanning under any condition.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* SECTION 3: DIFFERENTIATOR */}
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
              <div
                style={{
                  borderColor: "#e5e5df",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  backgroundColor: "#f6f5f3",
                  color: "#3158d5",
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3"
              >
                <span className="w-2 h-2 rounded-full bg-[#3158d5] animate-pulse" />
                Scannability Verification
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[#1c201a] tracking-tight">
                Create a QR Code That Actually Scans
              </h2>
              <p className="mt-2.5 text-xs sm:text-sm text-[#575a53] leading-relaxed font-normal">
                A QR code is only useful when people can scan it successfully. Spellense helps you check your QR code before you publish or print it, so you can catch potential readability and scannability problems early.
              </p>
              <p className="mt-2.5 text-xs sm:text-sm text-[#575a53] leading-relaxed font-normal">
                Our built-in stress test simulates real-world conditions right inside your browser: dim lighting, motion blur, small print sizes, and angled camera perspectives. By verifying contrast, error correction levels, and logo safety margins upfront, you prevent unreadable codes and costly reprinting.
              </p>
            </div>
          </ScrollReveal>

          {/* SECTION 4: SUPPORTED TYPES */}
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
              <h2 className="text-xl sm:text-2xl font-black text-[#1c201a] tracking-tight mb-2">
                What Can You Create With Our QR Code Generator?
              </h2>
              <p className="text-xs sm:text-sm text-[#70746d] mb-6 font-normal">
                Generate six genuinely supported QR code content types tailored for business and personal workflows:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div
                  style={{
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    backgroundColor: "#faf9f6",
                    padding: "20px",
                  }}
                  className="rounded-2xl p-5 flex flex-col justify-between"
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
                      className="flex h-10 w-10 items-center justify-center rounded-xl mb-3 shadow-2xs shrink-0"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[#1c201a] mb-1.5">
                      URL QR Codes
                    </h3>
                    <p className="text-xs sm:text-sm text-[#575a53] leading-relaxed font-normal">
                      Direct users straight to any website address, online store, landing page, or digital portfolio.
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    backgroundColor: "#faf9f6",
                    padding: "20px",
                  }}
                  className="rounded-2xl p-5 flex flex-col justify-between"
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
                      className="flex h-10 w-10 items-center justify-center rounded-xl mb-3 shadow-2xs shrink-0"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[#1c201a] mb-1.5">
                      Text QR Codes
                    </h3>
                    <p className="text-xs sm:text-sm text-[#575a53] leading-relaxed font-normal">
                      Encode plain text messages, product SKU details, serial numbers, event notices, or instructions.
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    backgroundColor: "#faf9f6",
                    padding: "20px",
                  }}
                  className="rounded-2xl p-5 flex flex-col justify-between"
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
                      className="flex h-10 w-10 items-center justify-center rounded-xl mb-3 shadow-2xs shrink-0"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                        <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                        <line x1="12" y1="20" x2="12.01" y2="20" />
                      </svg>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[#1c201a] mb-1.5">
                      Wi-Fi QR Codes
                    </h3>
                    <p className="text-xs sm:text-sm text-[#575a53] leading-relaxed font-normal">
                      Allow guests, clients, and customers to join your Wi-Fi network instantly without manually typing passwords.
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    backgroundColor: "#faf9f6",
                    padding: "20px",
                  }}
                  className="rounded-2xl p-5 flex flex-col justify-between"
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
                      className="flex h-10 w-10 items-center justify-center rounded-xl mb-3 shadow-2xs shrink-0"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="16" x="2" y="4" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[#1c201a] mb-1.5">
                      Email QR Codes
                    </h3>
                    <p className="text-xs sm:text-sm text-[#575a53] leading-relaxed font-normal">
                      Open a pre-filled email draft to customer support, inquiries, or direct feedback with a single scan.
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    backgroundColor: "#faf9f6",
                    padding: "20px",
                  }}
                  className="rounded-2xl p-5 flex flex-col justify-between"
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
                      className="flex h-10 w-10 items-center justify-center rounded-xl mb-3 shadow-2xs shrink-0"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[#1c201a] mb-1.5">
                      Phone QR Codes
                    </h3>
                    <p className="text-xs sm:text-sm text-[#575a53] leading-relaxed font-normal">
                      Trigger an immediate phone call to your office, emergency line, or booking hotline when scanned.
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    backgroundColor: "#faf9f6",
                    padding: "20px",
                  }}
                  className="rounded-2xl p-5 flex flex-col justify-between"
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
                      className="flex h-10 w-10 items-center justify-center rounded-xl mb-3 shadow-2xs shrink-0"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[#1c201a] mb-1.5">
                      vCard QR Codes
                    </h3>
                    <p className="text-xs sm:text-sm text-[#575a53] leading-relaxed font-normal">
                      Share comprehensive contact cards with name, phone number, email, company, and job title saved directly to phone contacts.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* SECTION 5: DOWNLOAD EXPLAINER */}
          <ScrollReveal delay={200}>
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
                Download Your QR Code
              </h2>
              <p className="text-xs sm:text-sm text-[#575a53] leading-relaxed mb-6 font-normal">
                Export your custom QR code in standard image formats built for modern digital workflows and commercial press:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                <div
                  style={{
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    backgroundColor: "#faf9f6",
                  }}
                  className="rounded-2xl p-5"
                >
                  <div className="flex items-center gap-3 mb-2.5">
                    <div
                      style={{
                        backgroundColor: "#f6f5f3",
                        borderColor: "#e5e5df",
                        borderWidth: "1px",
                        borderStyle: "solid",
                        color: "#3158d5",
                      }}
                      className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0 shadow-2xs"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                        <circle cx="9" cy="9" r="2" />
                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                      </svg>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[#1c201a]">High-Resolution PNG</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-[#575a53] leading-relaxed font-normal">
                    In Print mode, choose from 1000px, 2000px, or 3000px export resolutions to match small stickers or large promotional posters. In Digital mode, export a crisp 2000px PNG ready for web pages, presentations, and social media.
                  </p>
                </div>

                <div
                  style={{
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    backgroundColor: "#faf9f6",
                  }}
                  className="rounded-2xl p-5"
                >
                  <div className="flex items-center gap-3 mb-2.5">
                    <div
                      style={{
                        backgroundColor: "#f6f5f3",
                        borderColor: "#e5e5df",
                        borderWidth: "1px",
                        borderStyle: "solid",
                        color: "#3158d5",
                      }}
                      className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0 shadow-2xs"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="6" cy="6" r="3" />
                        <circle cx="18" cy="18" r="3" />
                        <path d="M6 9a9 9 0 0 0 9 9" />
                      </svg>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[#1c201a]">Vector SVG Format</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-[#575a53] leading-relaxed font-normal">
                    Available in both Digital and Print modes, scalable vector SVG files remain pixel-perfect at any size. Essential for graphic designers, commercial printers, laser engravers, and large-format banners.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>

      {/* FAQ SECTION — 2-Column Clean Layout (HOMEPAGE MATCH) */}
      <div
        style={{
          borderTop: "1px solid #e5e5df",
          marginTop: "48px",
          paddingTop: "48px",
        }}
        className="w-full"
      >
        <div className="mx-auto w-full">
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
                QR Code FAQ
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-[#70746d] leading-relaxed font-normal">
                Everything you need to know about generating, customizing, and verifying scannable QR codes for digital and physical print use.
              </p>
            </ScrollReveal>

            {/* Right 8 Columns */}
            <div className="lg:col-span-8 space-y-3.5">
              {FAQ_ITEMS.map((faq, index) => (
                <ScrollReveal key={faq.q} delay={index * 30}>
                  <details
                    style={{
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      backgroundColor: "#ffffff",
                    }}
                    className="group rounded-2xl p-5 shadow-2xs transition-all open:border-[#3158d5]/40 open:shadow-xs"
                  >
                    <summary className="flex cursor-pointer items-center justify-between font-bold text-[#1c201a] text-sm sm:text-base list-none">
                      <span>{faq.q}</span>
                      <span className="ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f6f5f3] text-[#70746d] transition-transform duration-200 group-open:rotate-180 group-open:bg-[#e8effe] group-open:text-[#3158d5]">
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
        </div>
      </div>

      {/* RELATED CREATIVE TOOLS SECTION */}
      <div style={{ borderTop: "1px solid #e5e5df", marginTop: "48px", paddingTop: "48px", paddingBottom: "64px" }} className="w-full">
        <ScrollReveal className="text-center max-w-2xl mx-auto">
          <div style={{ borderColor: "#e5e5df" }} className="inline-flex items-center gap-1.5 rounded-full border bg-[#faf9f6] px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#3158d5] shadow-2xs backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-[#3158d5] animate-pulse" />
            The Spellense Suite
          </div>
          <h3 className="mt-3 text-2xl font-black tracking-tight text-[#1c201a] sm:text-3xl">
            Explore More Free Creative Tools
          </h3>
          <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#70746d]">
            Crafted for designers, founders, and marketers who require print-ready precision and client deliverables.
          </p>
        </ScrollReveal>

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          <ScrollReveal delay={0} className="h-full">
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
                  <span>Create 3D Flipbook Free</span>
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </span>
              </div>
            </Link>
          </ScrollReveal>

          <ScrollReveal delay={80} className="h-full">
            <Link
              href="/image-compressor"
              style={{ borderColor: "#e5e5df" }}
              className="group relative flex h-full flex-col justify-between rounded-3xl border bg-white p-7 shadow-xs backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-[#3158d5]/40 hover:shadow-md cursor-pointer"
            >
              <div>
                <div style={{ backgroundColor: "#f6f5f3", border: "1px solid #e5e5df", color: "#3158d5" }} className="flex h-11 w-11 items-center justify-center rounded-2xl">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 14h6m0 0v6m0-6L3 21" />
                    <path d="M20 10h-6m0 0V4m0 6 7-7" />
                  </svg>
                </div>
                <div className="mt-4 text-[11px] font-bold uppercase tracking-wider text-[#3158d5]">
                  Image Optimizer
                </div>
                <h4 className="mt-1 text-xl font-black text-[#1c201a] group-hover:text-[#3158d5] transition">
                  Image Compressor
                </h4>
                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#575a53]">
                  Compress logos, PNG graphics, and WebP assets before embedding in your QR codes and print collateral.
                </p>
              </div>
              <div className="mt-5 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400">Lossless &amp; Lossy</span>
                <span className="text-xs font-bold text-[#3158d5] group-hover:underline inline-flex items-center gap-1">
                  <span>Compress Images Free</span>
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </span>
              </div>
            </Link>
          </ScrollReveal>

          <ScrollReveal delay={160} className="h-full">
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
                  Detect typos and text errors directly inside print posters, marketing banners, and flyers before printing.
                </p>
              </div>
              <div className="mt-5 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400">OCR &amp; AI Proofreading</span>
                <span className="text-xs font-bold text-[#3158d5] group-hover:underline inline-flex items-center gap-1">
                  <span>Proofread Artwork Free</span>
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </span>
              </div>
            </Link>
          </ScrollReveal>
        </div>
      </div>

    </div>
  </section>
</main>

      {/* CUSTOM SHARE MODAL */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1c201a]/40 backdrop-blur-xs animate-fadeIn">
          <div
            style={{
              borderColor: "#e5e5df",
              borderWidth: "1px",
              borderStyle: "solid",
              backgroundColor: "#ffffff",
            }}
            className="relative w-full max-w-lg rounded-2xl sm:rounded-[24px] p-5 sm:p-7 shadow-2xl text-left max-h-[92vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div style={{ borderColor: "#e5e5df" }} className="flex items-center justify-between pb-3.5 border-b">
              <div className="flex items-center gap-2.5">
                <div
                  style={{
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    backgroundColor: "#f6f5f3",
                  }}
                  className="w-8 h-8 rounded-xl text-[#3158d5] flex items-center justify-center"
                >
                  <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1c201a]">Share Your QR Code</h3>
                  <p className="text-xs text-[#70746d]">Share or copy your generated QR code image</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseShareModal}
                className="w-8 h-8 rounded-xl bg-[#f6f5f3] hover:bg-[#e5e5df] text-[#1c201a] flex items-center justify-center transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Notification / Toast Banner */}
            {shareSuccessMsg && (
              <div style={{ borderColor: "#e5e5df" }} className="mt-3 py-2 px-3.5 bg-[#f6f5f3] border rounded-xl flex items-center gap-2 text-xs font-bold text-[#1c201a] animate-fadeIn">
                <svg className="w-4 h-4 text-[#3158d5] shrink-0 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{shareSuccessMsg}</span>
              </div>
            )}

            {/* Modal Body */}
            <div className="space-y-4 pt-3.5">
              {/* QR Image Preview Card & Action Buttons */}
              <div
                style={{
                  borderColor: "#e5e5df",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  backgroundColor: "#faf9f6",
                }}
                className="p-3 rounded-2xl flex flex-row items-center gap-3"
              >
                {/* Visual Thumbnail */}
                <div
                  style={{
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    width: "84px",
                    height: "84px",
                    minWidth: "84px",
                    minHeight: "84px",
                    maxWidth: "84px",
                    maxHeight: "84px",
                  }}
                  className="rounded-xl bg-white p-1.5 shadow-2xs shrink-0 flex items-center justify-center overflow-hidden"
                >
                  {sharePreviewUrl ? (
                    <img
                      src={sharePreviewUrl}
                      alt="Your QR Code"
                      style={{ width: "100%", height: "100%", maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }}
                    />
                  ) : (
                    <div className="text-[11px] font-bold text-[#70746d] text-center">Loading...</div>
                  )}
                </div>

                {/* Direct Image Share/Copy Buttons */}
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleShareQrImageFile}
                    disabled={isSharingImage}
                    style={{
                      backgroundColor: "#3158d5",
                      color: "#ffffff",
                    }}
                    className="w-full py-2 px-3 rounded-xl hover:bg-[#2546b8] font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <svg className="w-3.5 h-3.5 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                    <span>{isSharingImage ? "Preparing..." : "Share QR Image (AirDrop / Apps)"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyQrImage}
                    style={{
                      borderColor: isImageCopied ? "#3158d5" : "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      backgroundColor: isImageCopied ? "#e8effe" : "#ffffff",
                      color: isImageCopied ? "#3158d5" : "#1c201a",
                    }}
                    className="w-full py-2 px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs hover:bg-[#faf9f6]"
                  >
                    {isImageCopied ? (
                      <>
                        <svg className="w-3.5 h-3.5 text-[#3158d5] stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>QR Image Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5 text-[#70746d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                        </svg>
                        <span>Copy Image to Clipboard</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Title input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#70746d] mb-1">
                  QR Title
                </label>
                <input
                  type="text"
                  value={shareTitle}
                  onChange={(e) => setShareTitle(e.target.value)}
                  placeholder="e.g. My QR Code"
                  style={{
                    backgroundColor: "#faf9f6",
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    color: "#1c201a",
                  }}
                  className="w-full rounded-xl py-2 px-3 text-xs sm:text-sm font-semibold outline-none focus:outline-none focus:ring-2 focus:ring-[#3158d5]/20 focus:border-[#3158d5] shadow-2xs"
                />
              </div>

              {/* Description input (Optional) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#70746d] mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={shareDescription}
                  onChange={(e) => setShareDescription(e.target.value)}
                  placeholder="e.g. Scan to view our menu or website"
                  style={{
                    backgroundColor: "#faf9f6",
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    color: "#1c201a",
                  }}
                  className="w-full rounded-xl py-2 px-3 text-xs sm:text-sm font-semibold outline-none focus:outline-none focus:ring-2 focus:ring-[#3158d5]/20 focus:border-[#3158d5] shadow-2xs"
                />
              </div>

              {/* QR Content / Destination field */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#70746d] mb-1">
                  QR Destination / Content
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={buildPayload()}
                    style={{
                      backgroundColor: "#faf9f6",
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      color: "#575a53",
                    }}
                    className="flex-1 rounded-xl py-2 px-3 text-xs font-mono select-all outline-none focus:outline-none truncate shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    style={{
                      backgroundColor: "#3158d5",
                      color: "#ffffff",
                    }}
                    className="px-4 py-2 rounded-xl hover:bg-[#2546b8] font-bold text-xs transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 shadow-xs"
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
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Social Platform Icon Buttons */}
              <div className="pt-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#70746d] mb-2">
                  Share directly to
                </label>
                <div className="flex items-center justify-between gap-2">
                  {/* WhatsApp */}
                  <button
                    type="button"
                    title="Share on WhatsApp"
                    aria-label="Share on WhatsApp"
                    onClick={() => handleSocialShare("whatsapp")}
                    className="flex-1 h-11 rounded-xl border border-[#e5e5df] hover:border-emerald-500 bg-white hover:bg-emerald-50/50 flex items-center justify-center transition-all cursor-pointer group shadow-2xs"
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
                    className="flex-1 h-11 rounded-xl border border-[#e5e5df] hover:border-[#E1306C] bg-white hover:bg-pink-50/50 flex items-center justify-center transition-all cursor-pointer group shadow-2xs"
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
                    className="flex-1 h-11 rounded-xl border border-[#e5e5df] hover:border-[#0A66C2] bg-white hover:bg-sky-50/50 flex items-center justify-center transition-all cursor-pointer group shadow-2xs"
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
                    className="flex-1 h-11 rounded-xl border border-[#e5e5df] hover:border-[#1877F2] bg-white hover:bg-blue-50/50 flex items-center justify-center transition-all cursor-pointer group shadow-2xs"
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
                    className="flex-1 h-11 rounded-xl border border-[#e5e5df] hover:border-[#1c201a] bg-white hover:bg-[#faf9f6] flex items-center justify-center transition-all cursor-pointer group shadow-2xs"
                  >
                    <svg className="w-5 h-5 text-[#1c201a] fill-current" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </button>

                  {/* More / Native */}
                  <button
                    type="button"
                    title="More sharing options"
                    aria-label="More sharing options"
                    onClick={() => handleSocialShare("more")}
                    className="flex-1 h-11 rounded-xl border border-[#e5e5df] hover:border-[#3158d5] bg-white hover:bg-[#e8effe] flex items-center justify-center transition-all cursor-pointer group shadow-2xs"
                  >
                    <svg className="w-5 h-5 text-[#3158d5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
      <Footer currentPath="/qr-code-generator" />
    </div>
  );

  // Helper renderer for dynamic content fields
  function renderFieldsGroup() {
    if (contentType === "url") {
      return (
        <div>
          <label
            style={{ display: "block", marginBottom: "12px" }}
            className="text-xs font-bold uppercase tracking-wider text-[#70746d]"
          >
            Target URL
          </label>
          <div style={{ position: "relative" }} className="relative w-full">
            <input
              type="url"
              value={urlVal}
              onChange={(e) => setUrlVal(e.target.value)}
              placeholder="https://example.com"
              style={{
                backgroundColor: "#faf9f6",
                borderColor: "#e5e5df",
                borderWidth: "1px",
                borderStyle: "solid",
                color: "#1c201a",
                height: "46px",
                lineHeight: "46px",
                paddingLeft: "16px",
                paddingRight: "44px",
                paddingTop: "0px",
                paddingBottom: "0px",
                fontSize: "14px",
                fontWeight: 600,
                boxSizing: "border-box",
                outline: "none",
                width: "100%",
              }}
              className="w-full rounded-xl placeholder-[#8e928a] shadow-2xs focus:ring-2 focus:ring-[#3158d5]/20 focus:border-[#3158d5]"
            />
            <div
              style={{
                position: "absolute",
                right: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
              }}
              className="flex items-center text-[#70746d]"
            >
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
          <label
            style={{ display: "block", marginBottom: "12px" }}
            className="text-xs font-bold uppercase tracking-wider text-[#70746d]"
          >
            Text Content
          </label>
          <textarea
            rows={3}
            value={textVal}
            onChange={(e) => setTextVal(e.target.value)}
            placeholder="Type any message, note, or raw code..."
            style={{
              backgroundColor: "#faf9f6",
              borderColor: "#e5e5df",
              borderWidth: "1px",
              borderStyle: "solid",
              color: "#1c201a",
              paddingLeft: "16px",
              paddingRight: "16px",
              paddingTop: "12px",
              paddingBottom: "12px",
              fontSize: "14px",
              fontWeight: 600,
              boxSizing: "border-box",
              outline: "none",
              width: "100%",
            }}
            className="w-full rounded-xl placeholder-[#8e928a] shadow-2xs focus:ring-2 focus:ring-[#3158d5]/20 focus:border-[#3158d5]"
          />
        </div>
      );
    }

    if (contentType === "wifi") {
      return (
        <div className="space-y-4">
          <div>
            <label
              style={{ display: "block", marginBottom: "12px" }}
              className="text-xs font-bold uppercase tracking-wider text-[#70746d]"
            >
              Network Name (SSID)
            </label>
            <input
              type="text"
              value={wifiSsid}
              onChange={(e) => setWifiSsid(e.target.value)}
              placeholder="e.g. Office_WiFi_5G"
              style={{
                backgroundColor: "#faf9f6",
                borderColor: "#e5e5df",
                borderWidth: "1px",
                borderStyle: "solid",
                color: "#1c201a",
                height: "46px",
                lineHeight: "46px",
                paddingLeft: "16px",
                paddingRight: "16px",
                paddingTop: "0px",
                paddingBottom: "0px",
                fontSize: "14px",
                fontWeight: 600,
                boxSizing: "border-box",
                outline: "none",
                width: "100%",
              }}
              className="w-full rounded-xl placeholder-[#8e928a] shadow-2xs focus:ring-2 focus:ring-[#3158d5]/20 focus:border-[#3158d5]"
            />
          </div>
          <div>
            <label
              style={{ display: "block", marginBottom: "12px" }}
              className="text-xs font-bold uppercase tracking-wider text-[#70746d]"
            >
              Password
            </label>
            <input
              type="text"
              value={wifiPass}
              onChange={(e) => setWifiPass(e.target.value)}
              placeholder="WiFi Password"
              style={{
                backgroundColor: "#faf9f6",
                borderColor: "#e5e5df",
                borderWidth: "1px",
                borderStyle: "solid",
                color: "#1c201a",
                height: "46px",
                lineHeight: "46px",
                paddingLeft: "16px",
                paddingRight: "16px",
                paddingTop: "0px",
                paddingBottom: "0px",
                fontSize: "14px",
                fontWeight: 600,
                boxSizing: "border-box",
                outline: "none",
                width: "100%",
              }}
              className="w-full rounded-xl placeholder-[#8e928a] shadow-2xs focus:ring-2 focus:ring-[#3158d5]/20 focus:border-[#3158d5]"
            />
          </div>
          <div>
            <label
              style={{ display: "block", marginBottom: "12px" }}
              className="text-xs font-bold uppercase tracking-wider text-[#70746d]"
            >
              Security Protocol
            </label>
            <div style={{ position: "relative" }} className="relative w-full">
              <select
                value={wifiEnc}
                onChange={(e) => setWifiEnc(e.target.value)}
                style={{
                  backgroundColor: "#faf9f6",
                  borderColor: "#e5e5df",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  color: "#1c201a",
                  height: "46px",
                  lineHeight: "46px",
                  paddingLeft: "16px",
                  paddingRight: "40px",
                  paddingTop: "0px",
                  paddingBottom: "0px",
                  fontSize: "14px",
                  fontWeight: 600,
                  boxSizing: "border-box",
                  outline: "none",
                  width: "100%",
                }}
                className="w-full rounded-xl appearance-none cursor-pointer shadow-2xs focus:ring-2 focus:ring-[#3158d5]/20 focus:border-[#3158d5]"
              >
                <option value="WPA">WPA / WPA2 / WPA3 (Recommended)</option>
                <option value="WEP">WEP</option>
                <option value="nopass">None (Open Network)</option>
              </select>
              <div
                style={{
                  position: "absolute",
                  right: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                }}
                className="flex items-center text-[#70746d]"
              >
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
          <label
            style={{ display: "block", marginBottom: "12px" }}
            className="text-xs font-bold uppercase tracking-wider text-[#70746d]"
          >
            Phone Number
          </label>
          <input
            type="tel"
            value={phoneVal}
            onChange={(e) => setPhoneVal(e.target.value)}
            placeholder="+1 (555) 000-0000"
            style={{
              backgroundColor: "#faf9f6",
              borderColor: "#e5e5df",
              borderWidth: "1px",
              borderStyle: "solid",
              color: "#1c201a",
              height: "46px",
              lineHeight: "46px",
              paddingLeft: "16px",
              paddingRight: "16px",
              paddingTop: "0px",
              paddingBottom: "0px",
              fontSize: "14px",
              fontWeight: 600,
              boxSizing: "border-box",
              outline: "none",
              width: "100%",
            }}
            className="w-full rounded-xl placeholder-[#8e928a] shadow-2xs focus:ring-2 focus:ring-[#3158d5]/20 focus:border-[#3158d5]"
          />
        </div>
      );
    }

    if (contentType === "email") {
      return (
        <div>
          <label
            style={{ display: "block", marginBottom: "12px" }}
            className="text-xs font-bold uppercase tracking-wider text-[#70746d]"
          >
            Email Address
          </label>
          <input
            type="email"
            value={emailVal}
            onChange={(e) => setEmailVal(e.target.value)}
            placeholder="hello@example.com"
            style={{
              backgroundColor: "#faf9f6",
              borderColor: "#e5e5df",
              borderWidth: "1px",
              borderStyle: "solid",
              color: "#1c201a",
              height: "46px",
              lineHeight: "46px",
              paddingLeft: "16px",
              paddingRight: "16px",
              paddingTop: "0px",
              paddingBottom: "0px",
              fontSize: "14px",
              fontWeight: 600,
              boxSizing: "border-box",
              outline: "none",
              width: "100%",
            }}
            className="w-full rounded-xl placeholder-[#8e928a] shadow-2xs focus:ring-2 focus:ring-[#3158d5]/20 focus:border-[#3158d5]"
          />
        </div>
      );
    }

    if (contentType === "vcard") {
      return (
        <div className="space-y-4">
          <div>
            <label
              style={{ display: "block", marginBottom: "12px" }}
              className="text-xs font-bold uppercase tracking-wider text-[#70746d]"
            >
              Full Name
            </label>
            <input
              type="text"
              value={vcName}
              onChange={(e) => setVcName(e.target.value)}
              placeholder="e.g. Sarah Jenkins"
              style={{
                backgroundColor: "#faf9f6",
                borderColor: "#e5e5df",
                borderWidth: "1px",
                borderStyle: "solid",
                color: "#1c201a",
              }}
              className="w-full rounded-xl py-3 px-3.5 text-xs sm:text-sm font-semibold placeholder-[#8e928a] outline-none focus:outline-none focus:ring-2 focus:ring-[#3158d5]/20 focus:border-[#3158d5] shadow-2xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                style={{ display: "block", marginBottom: "12px" }}
                className="text-xs font-bold uppercase tracking-wider text-[#70746d]"
              >
                Phone
              </label>
              <input
                type="tel"
                value={vcPhone}
                onChange={(e) => setVcPhone(e.target.value)}
                placeholder="+1 555 123 4567"
                style={{
                  backgroundColor: "#faf9f6",
                  borderColor: "#e5e5df",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  color: "#1c201a",
                }}
                className="w-full rounded-xl py-3 px-3.5 text-xs sm:text-sm font-semibold placeholder-[#8e928a] outline-none focus:outline-none focus:ring-2 focus:ring-[#3158d5]/20 focus:border-[#3158d5] shadow-2xs"
              />
            </div>
            <div>
              <label
                style={{ display: "block", marginBottom: "12px" }}
                className="text-xs font-bold uppercase tracking-wider text-[#70746d]"
              >
                Email
              </label>
              <input
                type="email"
                value={vcEmail}
                onChange={(e) => setVcEmail(e.target.value)}
                placeholder="sarah@company.com"
                style={{
                  backgroundColor: "#faf9f6",
                  borderColor: "#e5e5df",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  color: "#1c201a",
                }}
                className="w-full rounded-xl py-3 px-3.5 text-xs sm:text-sm font-semibold placeholder-[#8e928a] outline-none focus:outline-none focus:ring-2 focus:ring-[#3158d5]/20 focus:border-[#3158d5] shadow-2xs"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                style={{ display: "block", marginBottom: "12px" }}
                className="text-xs font-bold uppercase tracking-wider text-[#70746d]"
              >
                Company (Optional)
              </label>
              <input
                type="text"
                value={vcCompany}
                onChange={(e) => setVcCompany(e.target.value)}
                placeholder="Company Inc."
                style={{
                  backgroundColor: "#faf9f6",
                  borderColor: "#e5e5df",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  color: "#1c201a",
                }}
                className="w-full rounded-xl py-3 px-3.5 text-xs sm:text-sm font-semibold placeholder-[#8e928a] outline-none focus:outline-none focus:ring-2 focus:ring-[#3158d5]/20 focus:border-[#3158d5] shadow-2xs"
              />
            </div>
            <div>
              <label
                style={{ display: "block", marginBottom: "12px" }}
                className="text-xs font-bold uppercase tracking-wider text-[#70746d]"
              >
                Job Title (Optional)
              </label>
              <input
                type="text"
                value={vcTitle}
                onChange={(e) => setVcTitle(e.target.value)}
                placeholder="Product Lead"
                style={{
                  backgroundColor: "#faf9f6",
                  borderColor: "#e5e5df",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  color: "#1c201a",
                }}
                className="w-full rounded-xl py-3 px-3.5 text-xs sm:text-sm font-semibold placeholder-[#8e928a] outline-none focus:outline-none focus:ring-2 focus:ring-[#3158d5]/20 focus:border-[#3158d5] shadow-2xs"
              />
            </div>
          </div>
        </div>
      );
    }

    return null;
  }
}
