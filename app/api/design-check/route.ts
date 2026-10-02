import { NextResponse } from "next/server";
import { createWorker } from "tesseract.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import nspell from "nspell";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function loadDictionary(subFolder: string, packageName: string) {
  const candidates = [
    join(process.cwd(), "dictionaries", subFolder),
    join(process.cwd(), "node_modules", packageName),
    join(__dirname, "..", "..", "..", "dictionaries", subFolder),
    join(__dirname, "..", "..", "dictionaries", subFolder),
    join(__dirname, "..", "dictionaries", subFolder),
  ];

  for (const dir of candidates) {
    try {
      const aff = readFileSync(join(dir, "index.aff"));
      const dic = readFileSync(join(dir, "index.dic"));
      return nspell({ aff, dic });
    } catch {}
  }

  return {
    correct: () => true,
    suggest: () => [],
  } as unknown as ReturnType<typeof nspell>;
}

const spellUS = loadDictionary("en", "dictionary-en");
const spellGB = loadDictionary("en-gb", "dictionary-en-gb");

// Common brand names, international English spellings, and acronyms in advertising
const BRAND_AND_PROPER_NOUNS = new Set([
  // Prominent Global & Regional Brands
  "hisense", "samsung", "panasonic", "sony", "toshiba", "daikin", "gree", "midea", "lg",
  "carrier", "trane", "york", "voltas", "fujitsu", "mitsubishi", "hitachi", "apple", "nike",
  "adidas", "puma", "reebok", "zara", "gucci", "prada", "dior", "chanel", "hermes", "rolex",
  "omega", "casio", "seiko", "canon", "nikon", "epson", "bose", "jbl", "philips", "siemens",
  "bosch", "dyson", "pepsi", "coca", "cola", "nestle", "starbucks", "mcdonalds", "kfc", "subway",
  "dominos", "toyota", "honda", "ford", "bmw", "mercedes", "benz", "audi", "hyundai", "kia",
  "nissan", "tesla", "volvo", "volkswagen", "porsche", "ferrari", "lamborghini", "google",
  "microsoft", "amazon", "meta", "facebook", "instagram", "tiktok", "youtube", "linkedin",
  "whatsapp", "netflix", "spotify", "adobe", "figma", "canva", "uber", "careem", "deliveroo", "talabat",

  // Acronyms, Geography & Events
  "hvac", "fifa", "uae", "usa", "uk", "eu", "dubai", "abu", "dhabi", "sharjah", "ajman", "rak",
  "fujairah", "doha", "qatar", "saudi", "arabia", "riyadh", "jeddah", "kuwait", "oman", "muscat",
  "bahrain", "manama", "cairo", "egypt", "beirut", "amman", "delhi", "mumbai", "london", "paris",
  "tokyo", "singapore", "sydney", "expo", "olympics", "worldcup", "fifa26", "ac", "led", "lcd",
  "oled", "qled", "uhd", "hd", "4k", "8k", "usb", "btu", "inverter", "wifi", "ai", "iot", "eco",
  "pro", "max", "ultra", "plus", "mini", "lite", "super", "smart", "hybrid", "turbo",

  // Appliance, Hardware & Product Specifications
  "inox", "inoxydable", "stainless", "nofrost", "totalnofrost", "frostfree", "multiairflow", "biofresh",
  "defrost", "gross", "net", "dimensions", "dimension", "capacity", "refrigerator", "refrigerators",
  "fridge", "fridges", "freezer", "freezers", "compressor", "compressors", "balcony", "balconies",
  "deodorizing", "deodorizer", "filter", "filters", "sensor", "sensors", "digital", "durable",
  "durability", "crisper", "drawer", "drawers", "shelf", "shelves", "tempered", "loading", "packing",
  "carton", "palette", "pallet", "spec", "specs", "specification", "specifications", "appliance",
  "appliances", "cooling", "freezing", "chilling", "hinge", "hinges", "reversible", "dispenser",
  "icemaker", "twist", "tray", "trays", "rack", "racks", "liters", "litres", "cuft", "cbf", "watt",
  "watts", "kw", "kwh", "voltage", "hz", "dba", "decibel", "decibels", "airflow",

  // Materials, Finishes & Commercial Colors
  "matte", "matt", "gloss", "glossy", "chrome", "satin", "brushed", "titanium", "metallic",
  "platinum", "ceramic", "enamel", "carbon", "aluminum", "aluminium", "graphite", "copper",
  "bronze", "champagne", "obsidian", "rosegold", "gunmetal", "silver", "charcoal",

  // Tech, Audio, Display & Electronics
  "amoled", "fhd", "hdr", "hdr10", "dolby", "atmos", "vision", "bluetooth", "nfc", "hdmi", "aux",
  "usbc", "typec", "wireless", "earbuds", "headphones", "headset", "bass", "anc", "surround",
  "soundbar", "subwoofer", "touchscreen", "stylus", "gigabyte", "terabyte", "ram", "rom", "ssd",
  "fps", "megapixels", "mpx", "mah", "fastcharge", "magsafe", "qi", "retina",

  // Print, Publishing, Design & Typography
  "bleed", "cmyk", "rgb", "pantone", "vector", "raster", "dpi", "ppi", "gsm", "kraft", "emboss",
  "deboss", "foil", "spotuv", "diecut", "crease", "score", "accordion", "saddle", "stitch", "spiral",
  "hardcover", "softcover", "preflight", "kerning", "leading", "tracking", "serif", "sans", "slab",

  // E-commerce, Retail & Business Terms
  "cashback", "emi", "rebate", "voucher", "vouchers", "promo", "promos", "promocode", "bogo",
  "combo", "bundling", "bestseller", "unboxing", "storewide", "clearance", "sitewide", "freeshipping",
  "express", "delivery", "restock", "preorder", "doorstep", "pickup", "checkout", "loyalty", "reward",
  "rewards", "redeem", "disclaimer", "disclaimers", "guarantee", "warranty", "warranties", "barcode",
  "sku", "upc", "ean", "qr", "qrcode", "iso", "ce", "rohs",

  // Standard British / Commonwealth English spellings
  "catalogue", "catalogues", "programme", "programmes", "colour", "colours", "centre", "centres",
  "theatre", "theatres", "favour", "favours", "flavour", "flavours", "defence", "licence",
  "specialised", "specialise", "organised", "organise", "analysed", "analyse", "customised",
  "customise", "prioritised", "prioritise", "optimised", "optimise", "travelled", "travelling",
  "cancelled", "cancelling", "judgement", "fulfil", "enrol"
]);

export interface DesignIssue {
  id: string;
  category:
    | "copy"
    | "contrast"
    | "margin"
    | "typography"
    | "compliance"
    | "data_integrity"
    | "layout"
    | "artifacts"
    | "resolution";
  severity: "critical" | "warning" | "suggestion" | "error";
  qaRole?: string;
  title: string;
  description: string;
  impact?: string;
  specDetail?: string;
  whyItMatters?: string;
  originalText?: string;
  suggestedFix?: string;
  isHedged?: boolean;
  bbox: {
    left: number; // 0.0 - 1.0
    top: number;
    width: number;
    height: number;
  };
}

export interface DesignCheckResponse {
  success: boolean;
  score: number;
  verdict: "ready" | "needs_review" | "critical_issues";
  verdictTitle: string;
  verdictSummary: string;
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
    dataScore: number;
    complianceScore: number;
    layoutScore: number;
    visualScore: number;
    copyScore: number;
    contrastScore: number;
    marginScore: number;
    qualityScore: number;
  };
  issues: DesignIssue[];
  engine: "hybrid-gemini" | "local-deterministic";
  analysisNotice?: string;
  error?: string;
}

// Convert sRGB to linear luminance
function getLinearLuminance(val: number): number {
  const s = val / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function calculateRelativeLuminance(r: number, g: number, b: number): number {
  return (
    0.2126 * getLinearLuminance(r) +
    0.7152 * getLinearLuminance(g) +
    0.0722 * getLinearLuminance(b)
  );
}

function calculateContrastRatio(lum1: number, lum2: number): number {
  const l1 = Math.max(lum1, lum2);
  const l2 = Math.min(lum1, lum2);
  return (l1 + 0.05) / (l2 + 0.05);
}

function isModelOrCodeNumber(token: string): boolean {
  const clean = token.replace(/[(),:;*#"[\]]/g, "").trim();
  if (clean.length < 2) return false;

  // 1. Mixed alphanumeric codes (e.g. RT324N4ASU1, RT328N3ES, WW90T554DAN, SM-S928B, A4, 4K, 120Hz, 500GB)
  const hasLetters = /[a-zA-Z]/.test(clean);
  const hasDigits = /\d/.test(clean);
  if (hasLetters && hasDigits) return true;

  // 2. Technical dimension, ratio, or model separator formats (e.g., 595x650x1696, 595X650, 16:9, 4:3, WxDxH)
  if (/^[a-zA-Z0-9]+[xX×/:\-][a-zA-Z0-9]+/.test(clean)) return true;

  // 3. Numbers with attached measurement units (e.g. 400L, 326L, 73L, 220V, 50Hz, 45dB, 10kg, 25mm, 1500W, 1080p)
  if (/^\d+(\.\d+)?(l|liters|litres|kg|g|lb|lbs|w|watt|kw|v|volt|hz|khz|mhz|ghz|a|mah|ah|btu|db|dba|rpm|mm|cm|m|in|inch|ft|sqft|cbf|cuft|k|gb|tb|mb|kb|fps|dpi|gsm|p)$/i.test(clean)) return true;

  // 4. Standalone pure numbers, decimals, or currency (e.g. 326, 73, 595, $199, AED500)
  if (/^[^\w]*\d+(\.\d+)?[^\w]*$/.test(clean)) return true;

  // 5. Short all-caps acronyms (2-5 chars: HVAC, FIFA, LED, LCD, USB, AC, DC, ISO, CE)
  if (/^[A-Z0-9]{2,5}$/.test(clean)) return true;

  return false;
}

function isLikelyRealText(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 2) return false;
  // Discard pure numbers, punctuation or symbols
  if (/^[^a-zA-Z]+$/.test(trimmed)) return false;

  const clean = trimmed.toLowerCase().replace(/[^a-z]/g, "");
  if (clean.length < 2) return false;

  // Words of 3+ letters must contain at least one vowel
  if (clean.length >= 3 && !/[aeiouy]/.test(clean)) return false;

  // Common 2-letter English words and tech abbreviations whitelist
  const validTwoLetterWords = new Set([
    "am", "an", "as", "at", "be", "by", "do", "go", "he", "hi", "if",
    "in", "is", "it", "me", "my", "no", "of", "on", "or", "so", "to",
    "up", "us", "we", "tv", "hd", "ad", "id", "ac", "dc", "ai", "vr",
    "ar", "kg", "mm", "cm", "lb", "oz", "qr", "uk", "eu", "us"
  ]);
  if (clean.length === 2 && !validTwoLetterWords.has(clean)) return false;

  return true;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No image or document file uploaded" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || "image/png";

    // 1. Load image onto canvas to get exact pixel dimensions
    let img;
    try {
      img = await loadImage(buffer);
    } catch {
      return NextResponse.json(
        { success: false, error: "Failed to parse image file. Please upload a valid PNG, JPG, or WebP image." },
        { status: 400 }
      );
    }

    const width = img.width;
    const height = img.height;
    const origWidth = Number(formData.get("originalWidth")) || width;
    const origHeight = Number(formData.get("originalHeight")) || height;
    const aspectRatio = Math.round((origWidth / Math.max(origHeight, 1)) * 100) / 100;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    const issues: DesignIssue[] = [];
    let issueCounter = 1;

    // 2. Check Resolution & Quality
    if (origWidth < 600 || origHeight < 400) {
      issues.push({
        id: `quality-${issueCounter++}`,
        category: "resolution",
        severity: "warning",
        title: "Low Resolution Artwork",
        description: `Artwork dimensions (${origWidth}×${origHeight}px) fall below recommended digital and print resolution thresholds.`,
        impact: "This creative will look noticeably blurry or pixelated when viewed on modern high-DPI screens or in print.",
        specDetail: `Uploaded asset is ${origWidth}×${origHeight}px (standard minimum is 1080×1080px for social, 300 DPI for print).`,
        whyItMatters: "Low-resolution visuals degrade perceived brand quality and credibility.",
        suggestedFix: "Export at a minimum of 1080×1080px (for social) or 300 DPI (for print).",
        bbox: { left: 0.02, top: 0.02, width: 0.96, height: 0.08 },
      });
    }

    // 3. OCR and spatial mapping via Tesseract
    const ocrWorker = await createWorker("eng");
    const ocrResult = await ocrWorker.recognize(buffer, {}, { blocks: true });
    await ocrWorker.terminate();

    type BboxWord = {
      text: string;
      confidence: number;
      left: number;
      top: number;
      width: number;
      height: number;
      pixelX: number;
      pixelY: number;
      pixelW: number;
      pixelH: number;
    };

    const words: BboxWord[] = [];

    // Extract blocks and words with strict noise filtering
    const rawBlocks = ocrResult.data?.blocks || [];
    for (const block of rawBlocks) {
      for (const paragraph of block.paragraphs || []) {
        for (const line of paragraph.lines || []) {
          for (const w of line.words || []) {
            const text = (w.text || "").trim();
            const conf = typeof w.confidence === "number" ? w.confidence : 80;

            // Strict filtering: discard low-confidence noise & non-text graphics
            if (conf < 65) continue;
            if (!isLikelyRealText(text) || !w.bbox) continue;

            const x0 = w.bbox.x0;
            const y0 = w.bbox.y0;
            const x1 = w.bbox.x1;
            const y1 = w.bbox.y1;
            const pw = x1 - x0;
            const ph = y1 - y0;

            // Discard tiny sub-pixel specks
            if (pw < 10 || ph < 8) continue;

            words.push({
              text,
              confidence: conf,
              left: Math.max(0, x0 / width),
              top: Math.max(0, y0 / height),
              width: Math.min(1, pw / width),
              height: Math.min(1, ph / height),
              pixelX: x0,
              pixelY: y0,
              pixelW: pw,
              pixelH: ph,
            });
          }
        }
      }
    }

    // 4. Margins & Safe-Zone Engine
    // True print bleed / cut risk occurs when text is placed dangerously close (< 1.2%) to the physical edge.
    // Standard graphic design layouts commonly use tight intentional margins (2% to 3.5%).
    // We only flag text that is genuinely within the danger zone (< 1.2% or > 98.8%).
    let marginIssuesCount = 0;
    const DANGER_MARGIN = 0.012; // 1.2% from edge (genuine trim / cut-off danger zone)

    for (const w of words) {
      if (w.pixelH < 12 || w.confidence < 70) continue;

      const touchesLeft = w.left < DANGER_MARGIN;
      const touchesRight = w.left + w.width > 1 - DANGER_MARGIN;
      const touchesTop = w.top < DANGER_MARGIN;
      const touchesBottom = w.top + w.height > 1 - DANGER_MARGIN;

      if (touchesLeft || touchesRight || touchesTop || touchesBottom) {
        marginIssuesCount++;
        const edge = touchesLeft
          ? "left edge"
          : touchesRight
          ? "right edge"
          : touchesTop
          ? "top edge"
          : "bottom edge";

        if (marginIssuesCount <= 3) {
          issues.push({
            id: `margin-${issueCounter++}`,
            category: "margin",
            severity: "warning",
            title: "Safe-Zone Margin Bleed",
            description: `Text "${w.text}" is placed dangerously close to the ${edge}.`,
            impact: "Text placed right against the outer border risks being clipped by commercial print guillotines or screen bezels.",
            specDetail: `Within ${Math.round(DANGER_MARGIN * 1000) / 10}% bleed danger boundary (${edge}).`,
            whyItMatters: "Commercial print trimming drift is typically 2–3mm; placing copy inside the bleed zone causes cut-off text.",
            originalText: w.text,
            suggestedFix: `Move text inward slightly to preserve a safe breathing margin.`,
            bbox: {
              left: w.left,
              top: w.top,
              width: w.width,
              height: w.height,
            },
          });
        }
      }
    }

    // 5. WCAG Text-to-Background Contrast Engine (Page-Aware & Interline Sampling)
    const cornerSamples = [
      ctx.getImageData(10, 10, 1, 1).data,
      ctx.getImageData(Math.max(0, width - 10), 10, 1, 1).data,
      ctx.getImageData(10, Math.max(0, height - 10), 1, 1).data,
      ctx.getImageData(Math.max(0, width - 10), Math.max(0, height - 10), 1, 1).data,
      ctx.getImageData(Math.floor(width / 2), 15, 1, 1).data,
    ];
    const pageLums = cornerSamples.map((s) => calculateRelativeLuminance(s[0], s[1], s[2]));
    pageLums.sort((a, b) => a - b);
    const medianPageLum = pageLums[Math.floor(pageLums.length / 2)];
    const isLightPage = medianPageLum >= 0.70;
    const isDarkPage = medianPageLum <= 0.30;

    let contrastFailCount = 0;
    for (const w of words) {
      if (w.pixelW < 14 || w.pixelH < 10 || w.confidence < 70) continue;
      if (w.text.length < 3 || isModelOrCodeNumber(w.text)) continue;

      try {
        // Collect pixel luminances INSIDE the word bounding box
        const stepX = Math.max(1, Math.floor(w.pixelW / 12));
        const stepY = Math.max(1, Math.floor(w.pixelH / 6));
        const innerLuminances: number[] = [];

        for (let px = w.pixelX + 1; px < w.pixelX + w.pixelW - 1; px += stepX) {
          for (let py = w.pixelY + 1; py < w.pixelY + w.pixelH - 1; py += stepY) {
            const p = ctx.getImageData(px, py, 1, 1).data;
            innerLuminances.push(calculateRelativeLuminance(p[0], p[1], p[2]));
          }
        }

        if (innerLuminances.length < 6) continue;
        innerLuminances.sort((a, b) => a - b);

        const p10 = innerLuminances[Math.floor(innerLuminances.length * 0.10)]; // Darkest (ink if text is dark)
        const p50 = innerLuminances[Math.floor(innerLuminances.length * 0.50)]; // Median
        const p90 = innerLuminances[Math.floor(innerLuminances.length * 0.90)]; // Brightest (ink if text is light)

        // 1. If standard light page (white/cream document) and text has dark ink (p10 < 0.35 & p90 > 0.60):
        // It is standard dark text on white document -> 100% High Contrast Pass!
        if (isLightPage && p10 < 0.35 && p90 > 0.60) {
          continue;
        }

        // 2. If standard dark page (black/navy presentation) and text has light ink (p90 > 0.65 & p10 < 0.40):
        // Standard light text on dark background -> 100% High Contrast Pass!
        if (isDarkPage && p90 > 0.65 && p10 < 0.40) {
          continue;
        }

        // 3. If there is a massive luminance spread inside the text box itself (clear contrast between glyph and box):
        if (p90 - p10 >= 0.40) {
          continue;
        }

        // 4. For text inside localized colored banners, buttons, or photo blocks:
        // Sample background in the line-height space immediately above the word (never hits adjacent words in a sentence)
        const topSpaceY = Math.max(0, w.pixelY - Math.max(4, Math.floor(w.pixelH * 0.4)));
        const sampleX = Math.floor(w.pixelX + w.pixelW / 2);
        const topBgPixel = ctx.getImageData(sampleX, topSpaceY, 1, 1).data;
        const localBgLum = calculateRelativeLuminance(topBgPixel[0], topBgPixel[1], topBgPixel[2]);

        let contrastRatio = 21;
        if (localBgLum >= 0.5) {
          contrastRatio = calculateContrastRatio(p10, localBgLum);
        } else {
          contrastRatio = calculateContrastRatio(p90, localBgLum);
        }

        // Only flag genuinely poor contrast (< 2.5:1 ratio)
        if (contrastRatio < 2.5) {
          contrastFailCount++;
          if (contrastFailCount <= 4) {
            issues.push({
              id: `contrast-${issueCounter++}`,
              category: "contrast",
              severity: "warning",
              title: "Low Contrast Readability",
              description: `Text "${w.text}" has low contrast against its background (${contrastRatio.toFixed(1)}:1 ratio).`,
              impact: "Readers in bright ambient lighting or on mobile screens will struggle to read this copy.",
              specDetail: `Contrast ratio is ${contrastRatio.toFixed(1)}:1 (WCAG AA requires 3:1 for bold/UI headers, 4.5:1 for fine body copy).`,
              whyItMatters: "Poor contrast reduces reading speed and viewer comprehension.",
              originalText: w.text,
              suggestedFix: "Increase the brightness difference between the text color and background.",
              bbox: {
                left: w.left,
                top: w.top,
                width: w.width,
                height: w.height,
              },
            });
          }
        }
      } catch {}
    }

    // 6. Gemini Multimodal Creative QA Auditor Inspection
    const geminiKey = process.env.GEMINI_API_KEY;
    const geminiModel = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
    let engine: "hybrid-gemini" | "local-deterministic" = "local-deterministic";
    let aiVerdict: "ready" | "needs_review" | "critical_issues" | null = null;
    let aiVerdictTitle: string | null = null;
    let aiVerdictSummary: string | null = null;
    let aiPositiveHighlights: string[] = [];

    if (geminiKey) {
      try {
        const base64Data = buffer.toString("base64");

        // Build OCR context string for Gemini — exact words extracted from the image
        const ocrWordList = words
          .map((w) => `"${w.text}" (conf:${Math.round(w.confidence)}%, pos: top=${(w.top * 100).toFixed(1)}% left=${(w.left * 100).toFixed(1)}%)`)
          .join(", ");

        const imageDimContext = `${origWidth}×${origHeight}px (aspect ratio ${aspectRatio})`;
        const formatHint = origWidth > origHeight
          ? "landscape / horizontal banner"
          : origWidth < origHeight
          ? "portrait / vertical banner or flyer"
          : "square format";

        const prompt = `You are an experienced Creative Director and Senior Pre-Flight QA Auditor at a premier advertising and publishing agency.
Your role is to review this graphic design asset and provide an insightful, constructive, human pre-flight review.
You must sound like an experienced human creative director — NEVER like a robotic automated checklist.

IMAGE METADATA (use this for context):
- Dimensions: ${imageDimContext}
- Format: ${formatHint}
- File type: ${mimeType}

OCR-EXTRACTED TEXT (machine-read estimate; OCR can misread small, stylized, or non-English text. Do not treat it as ground truth for spelling, pricing, dates, or contact details):
${ocrWordList || "(no readable text detected by OCR — rely on visual read)"}

IMPORTANT: Cross-check OCR text against the image. If the text is unclear or OCR and visual reading disagree, do not claim a definite error; report that a human should verify it.

FOLLOW THESE 6 CORE HUMAN REVIEWER PRINCIPLES:

1. HUMAN OVERALL VERDICT & SEVERITY SUMMARY:
- Lead with an overarching, natural assessment of the asset's publication readiness.
- Provide a severity-weighted summary (e.g., "1 critical data issue needs fixing before release, with 2 minor layout suggestions", NOT a raw robotic count like "3 issues found").
- If the creative is clean, give a confident verdict like "Looks print-ready — strong contrast and clean hierarchy throughout."

2. EXPLAIN IMPACT, NOT SPEC:
- Frame findings around real-world human reader consequences and business risks.
- In "impact": Explain what readers, customers, or printers will actually experience in plain language (e.g., "This text will be hard to read in bright sunlight or on a dim phone screen", or "Customers will notice conflicting prices at checkout, creating friction and complaints").
- In "specDetail": Put the technical measurements or math comparisons (e.g., "Contrast ratio: 3.2:1 (WCAG AA requires 4.5:1 for 14pt body text)", or "Was $100, Now $60 is a 40% discount, but banner claims 50%").
- Never lead an issue with dry spec numbers; always lead with what it actually means for people reading the design.

3. REAL-WORLD SEVERITY ORDERING:
- Prioritize issues by tangible financial and reprint risk:
  1. Financial / Reprint Disasters (Price & discount math errors, wrong dates, broken contact info, missing mandatory disclaimers).
  2. Compliance & Legal Risks (Missing asterisks/disclaimers, outdated copyright).
  3. Pre-Flight Artifacts & Brand (Squished/stretched logos, leftover stock watermarks).
  4. Typography & Readability (Unreadable script fonts, poor contrast on important copy).
  5. Cosmetic Polish (Minor margin spacing, subtle secondary contrast).

4. HEDGE AI-VISION & SUBJECTIVE FINDINGS:
- Deterministic checks (pricing math, date sanity, exact typos, missing phone digits) are definite and should be stated with confidence.
- Subjective or visual checks (e.g. logo proportions, visual clutter, font pairing disharmony, crowded layout) must be hedged gently:
  - "This looks like it might be a stretched logo — worth a second look."
  - "The headline feels slightly crowded against the image subject; consider adding a little breathing room."
  - "The contrast here may be difficult to read in bright outdoor conditions."
- Set "isHedged": true for visual/subjective observations, and "isHedged": false for definite errors.

5. MENTION WHAT'S WORKING WELL (POSITIVE HIGHLIGHTS):
- Every great creative director builds trust by pointing out what works before critiquing flaws.
- Provide 1 to 3 "positiveHighlights" noting what the design does effectively (e.g., "High-contrast, eye-catching Call-to-Action button", "Strong visual hierarchy guiding the eye from headline to offer", "Clean safe margins with zero border cut-off risks").

6. GROUP RELATED ISSUES:
- If a promotional offer has an asterisk (*) and the footnote disclaimer is missing, group them into a SINGLE cohesive finding (e.g. 'Promotional headline contains an asterisk (*), but the corresponding footnote terms are missing'). Do not split them into two disjointed errors.
- If multiple small text elements on a background share the same contrast or safe-zone issue, group them into one unified, actionable note.

AUDIT SCOPE:
- Price & Discount Math: Use the OCR text to verify stated savings match the numbers (e.g. "50% off! Was AED 100 Now AED 60" is wrong: 100 to 60 is 40%). Perform the arithmetic yourself and flag if wrong.
- Day & Date Sanity: Verify day/date combinations in the OCR text make calendar sense (e.g. "Monday 30 September" — verify the day matches).
- Contact Details: Incomplete phone numbers (too few digits), malformed emails (e.g. @gmial.com), broken or obviously fake URLs.
- Placeholder Artifacts: Leftover dummy text ("Lorem Ipsum", "[Insert Date]", "CLIENT NAME", "SAMPLE", "TBC").
- Genuine typos in headlines, offers, and body copy using OCR text. IMPORTANT: Accept BOTH American and British/Commonwealth English spellings. Do NOT flag brand names, standard tech acronyms, or proper nouns.
- Asterisk Pairing: Headline claims with (*) or (T&C) must have a matching footnote disclaimer visible on the design.
- Watermarks & Logo Distortion: Leftover stock watermarks (Shutterstock, Getty, iStock), or logos that appear visually stretched or squished.
- Typography & Hierarchy: More than 3 distinct fonts in use, unreadable decorative/script fonts on busy backgrounds, illegible font sizes on key copy.
- WCAG Contrast: Flag text that appears to have low contrast against its background, especially body copy and small print.

COORDINATES:
For each issue, return a normalized bounding box [ymin, xmin, ymax, xmax] as integers between 0 and 1000 indicating where the issue occurs on the image.

Return ONLY a pure JSON object matching this schema:
{
  "verdict": "ready" | "needs_review" | "critical_issues",
  "verdictTitle": "Human-friendly executive title (e.g., '1 Critical Issue Needs Attention Before Print' or 'Looks Print-Ready')",
  "verdictSummary": "1-2 sentence warm, professional creative director assessment explaining the overall readiness and severity-weighted status.",
  "positiveHighlights": [
    "1-3 concise observations of what is working well in this design (layout, color balance, hierarchy, typography, etc.)"
  ],
  "issues": [
    {
      "category": "data_integrity" | "compliance" | "copy" | "typography" | "layout" | "contrast" | "artifacts",
      "severity": "critical" | "warning" | "suggestion",
      "qaRole": "Role title (e.g. Creative Director / Data Integrity QA / Legal Compliance / Pre-Flight)",
      "title": "Natural, clear issue title (e.g., 'Discount calculation doesn\\'t match prices')",
      "description": "Clear explanation of what was observed",
      "impact": "Real-world consequence for readers, customers, or brand reputation",
      "specDetail": "Technical or mathematical details if applicable",
      "whyItMatters": "Concise summary of business or print risk",
      "suggestedFix": "Actionable, designer-friendly fix in plain language",
      "originalText": "exact text if applicable",
      "isHedged": true | false,
      "box_2d": [ymin, xmin, ymax, xmax]
    }
  ]
}
If the design is completely flawless with zero errors, return:
{
  "verdict": "ready",
  "verdictTitle": "Looks Print-Ready",
  "verdictSummary": "This asset passes pre-flight review cleanly with solid typography hierarchy, clear contrast, and zero data integrity risks.",
  "positiveHighlights": [
    "Strong visual balance and clear call to action",
    "Clean margin safe-zones with no text crowding borders",
    "High contrast ensuring readability across screen and print"
  ],
  "issues": []
}`;



        let response: Response | null = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${geminiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [
                    {
                      parts: [
                        { text: prompt },
                        {
                          inlineData: {
                            mimeType: mimeType.startsWith("image/") ? mimeType : "image/png",
                            data: base64Data,
                          },
                        },
                      ],
                    },
                  ],
                  generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 8192,
                    responseMimeType: "application/json",
                  },
                  thinkingConfig: {
                    thinkingBudget: 1024,
                  },
                }),
              }
            );

            if (response.ok) break;

            if (response.status === 503 || response.status === 429) {
              console.warn(`[DesignCheck] Gemini returned ${response.status}, retrying attempt ${attempt}...`);
              if (attempt < 3) {
                await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
              }
            } else {
              break;
            }
          } catch (fetchErr: unknown) {
            const isDnsError = fetchErr && typeof fetchErr === "object" && (("code" in fetchErr && fetchErr.code === "ENOTFOUND") || ("cause" in fetchErr && typeof fetchErr.cause === "object" && fetchErr.cause !== null && "code" in fetchErr.cause && fetchErr.cause.code === "ENOTFOUND"));
            if (isDnsError) {
              console.warn(`[DesignCheck] Gemini API domain offline or unreachable, proceeding immediately with local engine.`);
              break;
            }
            console.warn(`[DesignCheck] Gemini fetch error on attempt ${attempt}:`, fetchErr);
            if (attempt < 3) {
              await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
            }
          }
        }

        if (response && response.ok) {
          const geminiData = await response.json();
          const textResponse =
            geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (textResponse) {
            const cleanJson = textResponse
              .replace(/^[^{[]*/, "")
              .replace(/[^}\]]*$/, "")
              .trim();
            const parsed = JSON.parse(cleanJson);

            if (parsed && typeof parsed === "object") {
              engine = "hybrid-gemini";
              if (parsed.verdict) aiVerdict = parsed.verdict;
              if (parsed.verdictTitle) aiVerdictTitle = parsed.verdictTitle;
              if (parsed.verdictSummary) aiVerdictSummary = parsed.verdictSummary;
              if (Array.isArray(parsed.positiveHighlights)) {
                aiPositiveHighlights = parsed.positiveHighlights
                  .filter((h: unknown): h is string => typeof h === "string" && h.trim().length > 0)
                  .map((h: string) => h.trim());
              }

              if (Array.isArray(parsed.issues)) {
                for (const item of parsed.issues) {
                  let left = 0.1;
                  let top = 0.1;
                  let boxW = 0.2;
                  let boxH = 0.08;

                  if (
                    Array.isArray(item.box_2d) &&
                    item.box_2d.length === 4 &&
                    typeof item.box_2d[0] === "number"
                  ) {
                    const ymin = Math.max(0, Math.min(1000, item.box_2d[0]));
                    const xmin = Math.max(0, Math.min(1000, item.box_2d[1]));
                    const ymax = Math.max(ymin, Math.min(1000, item.box_2d[2]));
                    const xmax = Math.max(xmin, Math.min(1000, item.box_2d[3]));

                    top = ymin / 1000;
                    left = xmin / 1000;
                    boxW = Math.max(0.04, (xmax - xmin) / 1000);
                    boxH = Math.max(0.025, (ymax - ymin) / 1000);
                  } else if (item.originalText) {
                    const orig = item.originalText.toLowerCase().trim();
                    const matchedWord = words.find(
                      (w) =>
                        w.text.toLowerCase().trim() === orig ||
                        w.text.toLowerCase().includes(orig) ||
                        orig.includes(w.text.toLowerCase().trim())
                    );
                    if (matchedWord) {
                      left = matchedWord.left;
                      top = matchedWord.top;
                      boxW = Math.max(matchedWord.width, 0.05);
                      boxH = Math.max(matchedWord.height, 0.03);
                    }
                  }

                  const validCategory = [
                    "copy",
                    "contrast",
                    "margin",
                    "typography",
                    "compliance",
                    "data_integrity",
                    "layout",
                    "artifacts",
                  ].includes(item.category)
                    ? item.category
                    : "copy";

                  const validSeverity = [
                    "critical",
                    "warning",
                    "suggestion",
                  ].includes(item.severity)
                    ? item.severity
                    : "warning";

                  issues.push({
                    id: `qa-${issueCounter++}`,
                    category: validCategory,
                    severity: validSeverity,
                    qaRole:
                      item.qaRole ||
                      (validCategory === "data_integrity"
                        ? "Data Integrity QA"
                        : validCategory === "compliance"
                        ? "Asterisk & Legal Compliance"
                        : validCategory === "typography"
                        ? "Typography & Hierarchy"
                        : validCategory === "contrast"
                        ? "Contrast & Readability"
                        : validCategory === "layout"
                        ? "Layout & Alignment"
                        : validCategory === "artifacts"
                        ? "Pre-Flight Artifacts"
                        : "Creative Director QA"),
                    title: item.title || "QA Issue Flagged",
                    description: item.description,
                    impact: item.impact || item.whyItMatters || undefined,
                    specDetail: item.specDetail || undefined,
                    whyItMatters: item.whyItMatters || item.impact || undefined,
                    originalText: item.originalText,
                    suggestedFix: item.suggestedFix,
                    isHedged: Boolean(item.isHedged),
                    bbox: {
                      left: Math.max(0, Math.min(0.95, left)),
                      top: Math.max(0, Math.min(0.95, top)),
                      width: Math.min(1 - left, boxW),
                      height: Math.min(1 - top, boxH),
                    },
                  });
                }
              }
            }
          }
        }
      } catch (geminiErr) {
        console.warn("Gemini QA analysis failed, falling back to local inspection:", geminiErr);
      }
    }

    // Fallback: ONLY run local nspell dictionary if Gemini did NOT run
    if (engine !== "hybrid-gemini") {
      for (const w of words) {
        // Skip whole token if it is a model number, technical code, or dimension
        if (isModelOrCodeNumber(w.text)) continue;

        const subTokens = w.text.split(/[\s—–-]+/);
        for (const sub of subTokens) {
          if (isModelOrCodeNumber(sub)) continue;

          const cleaned = sub.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, "");
          if (cleaned.length < 3 || !isLikelyRealText(cleaned)) continue;

          // 1. Accept valid US, UK/Commonwealth spelling, or known Brand/Acronym/Product Spec
          if (
            spellUS.correct(cleaned) ||
            spellGB.correct(cleaned) ||
            BRAND_AND_PROPER_NOUNS.has(cleaned)
          ) {
            continue;
          }

          // 2. Ignore 2-5 letter uppercase acronyms (HVAC, UAE, FIFA, LED, VIP, USB, AI, CEO, etc.)
          if (sub === sub.toUpperCase() && cleaned.length <= 5) {
            continue;
          }

          // 3. Skip Capitalized words (Proper Nouns, Brands, Names, Geographic Places)
          // In advertising, catalogs, and commercial documents, words starting with a capital letter
          // (e.g. "Qingdao", "Sanden", "Changzhou", "Sanhua", "Ronshen", "Kelon", "ASKO", "Thailand", "Vietnam")
          // are proper nouns, company brands, or geography, NOT spelling errors!
          const isCapitalized = /^[A-Z][a-zA-Z0-9]*$/.test(sub);
          if (isCapitalized) {
            continue;
          }

          // 4. Only flag genuine lowercase spelling mistakes
          const suggestions = spellUS.suggest(cleaned);
          const gbSuggestions = spellGB.suggest(cleaned);
          const topFix = suggestions[0] || gbSuggestions[0];

          issues.push({
            id: `spell-${issueCounter++}`,
            category: "copy",
            severity: "warning",
            qaRole: "Spelling & Typography QA",
            title: "Possible Spelling Mistake",
            description: `Word "${sub}" appears to be misspelled.`,
            impact: "Spelling errors in published copy distract readers and lower perceived brand credibility.",
            specDetail: topFix ? `Dictionary suggestion: "${topFix}"` : "Flagged by pre-flight dictionary check",
            whyItMatters: "Spelling mistakes in published creative assets diminish brand trust and perceived professionalism.",
            originalText: sub,
            suggestedFix: topFix
              ? `If this is a typo, change to "${topFix}".`
              : "Verify spelling.",
            bbox: {
              left: w.left,
              top: w.top,
              width: w.width,
              height: w.height,
            },
          });
        }
      }
    }

    // 7. Sort issues by Real-World Severity (Rule 3: Financial & Reprint Risks First)
    function getRealWorldSeverityScore(issue: DesignIssue): number {
      let sevScore = 100;
      if (issue.severity === "critical" || (issue.severity as string) === "error") {
        sevScore = 1000;
      } else if (issue.severity === "warning") {
        sevScore = 500;
      }

      let catScore = 10;
      if (issue.category === "data_integrity") catScore = 50;
      else if (issue.category === "compliance") catScore = 40;
      else if (issue.category === "artifacts") catScore = 30;
      else if (issue.category === "copy" || issue.category === "typography") catScore = 20;
      else if (issue.category === "contrast" || issue.category === "margin" || issue.category === "layout") catScore = 10;

      return sevScore + catScore;
    }

    // 7a. DEDUPLICATION — remove near-duplicate issues flagged by both local and Gemini engines
    // Two issues are considered duplicates if they share the same category AND their bboxes overlap > 50%
    const deduped: DesignIssue[] = [];
    for (const issue of issues) {
      const isDup = deduped.some((existing) => {
        if (existing.category !== issue.category) return false;
        // Overlap check
        const overlapLeft = Math.max(existing.bbox.left, issue.bbox.left);
        const overlapTop = Math.max(existing.bbox.top, issue.bbox.top);
        const overlapRight = Math.min(existing.bbox.left + existing.bbox.width, issue.bbox.left + issue.bbox.width);
        const overlapBottom = Math.min(existing.bbox.top + existing.bbox.height, issue.bbox.top + issue.bbox.height);
        if (overlapRight <= overlapLeft || overlapBottom <= overlapTop) return false;
        const overlapArea = (overlapRight - overlapLeft) * (overlapBottom - overlapTop);
        const issueArea = issue.bbox.width * issue.bbox.height;
        return issueArea > 0 && overlapArea / issueArea > 0.5;
      });
      if (!isDup) deduped.push(issue);
    }
    issues.length = 0;
    issues.push(...deduped);

    // 7b. Sort issues by Real-World Severity (Rule 3: Financial & Reprint Risks First)
    issues.sort((a, b) => getRealWorldSeverityScore(b) - getRealWorldSeverityScore(a));

    const criticalIssues = issues.filter(
      (i) => i.severity === "critical" || (i.severity as string) === "error"
    );
    const warningIssues = issues.filter((i) => i.severity === "warning");
    const suggestionIssues = issues.filter((i) => i.severity === "suggestion");

    const verdictCounts = {
      critical: criticalIssues.length,
      warning: warningIssues.length,
      suggestion: suggestionIssues.length,
      total: issues.length,
    };

    const dataIssues = issues.filter(
      (i) => i.category === "data_integrity" || i.category === "copy"
    );
    const complianceIssues = issues.filter(
      (i) => i.category === "compliance" || i.category === "artifacts"
    );
    const layoutIssues = issues.filter(
      (i) => i.category === "layout" || i.category === "margin"
    );
    const visualIssues = issues.filter(
      (i) => i.category === "contrast" || i.category === "typography"
    );

    const dataScore = Math.max(
      15,
      100 -
        dataIssues.reduce(
          (acc, curr) => acc + (curr.severity === "critical" || curr.severity === "error" ? 22 : 10),
          0
        )
    );
    const complianceScore = Math.max(
      20,
      100 -
        complianceIssues.reduce(
          (acc, curr) => acc + (curr.severity === "critical" || curr.severity === "error" ? 20 : 10),
          0
        )
    );
    const layoutScore = Math.max(
      25,
      100 -
        layoutIssues.reduce(
          (acc, curr) => acc + (curr.severity === "critical" || curr.severity === "error" ? 18 : 8),
          0
        )
    );
    const visualScore = Math.max(
      20,
      100 -
        visualIssues.reduce(
          (acc, curr) => acc + (curr.severity === "critical" || curr.severity === "error" ? 15 : 7),
          0
        )
    );

    const overallScore = Math.min(
      100,
      Math.max(
        15,
        Math.round(
          dataScore * 0.35 +
            complianceScore * 0.2 +
            layoutScore * 0.25 +
            visualScore * 0.2
        )
      )
    );

    // Only the vision model can provide subjective positive observations.
    const positiveHighlights: string[] = [...aiPositiveHighlights];

    // Rule 1: Human Creative Director Verdict & Severity-Weighted Summary
    let verdict: "ready" | "needs_review" | "critical_issues" = "ready";
    let verdictTitle = "Looks Print-Ready";
    let verdictSummary =
      "Asset passed pre-flight creative review cleanly with zero critical flaws or reprint risks detected.";

    if (
      criticalIssues.length > 0 ||
      overallScore < 65 ||
      aiVerdict === "critical_issues"
    ) {
      verdict = "critical_issues";
      verdictTitle =
        aiVerdictTitle ||
        (criticalIssues.length === 1
          ? "1 Critical Issue Needs Attention Before Release"
          : `${criticalIssues.length} Critical Issues Need Attention Before Release`);
      verdictSummary =
        aiVerdictSummary ||
        (warningIssues.length > 0
          ? `Identified ${criticalIssues.length} critical deal-breaker${criticalIssues.length > 1 ? "s" : ""} (reprint or pricing risk) and ${warningIssues.length} recommendation${warningIssues.length > 1 ? "s" : ""} to review before going live.`
          : `Identified ${criticalIssues.length} critical deal-breaker${criticalIssues.length > 1 ? "s" : ""} that could cause reprint costs or customer friction if published as-is.`);
    } else if (
      warningIssues.length > 0 ||
      overallScore < 85 ||
      aiVerdict === "needs_review"
    ) {
      verdict = "needs_review";
      verdictTitle =
        aiVerdictTitle || "Review Recommended Before Launch";
      verdictSummary =
        aiVerdictSummary ||
        `Overall this design is in solid shape, but ${warningIssues.length} item${warningIssues.length > 1 ? "s" : ""} should be verified to elevate polish and conversion.`;
    } else {
      verdict = "ready";
      if (aiVerdictTitle) verdictTitle = aiVerdictTitle;
      if (aiVerdictSummary) {
        verdictSummary = aiVerdictSummary;
      } else if (suggestionIssues.length > 0) {
        verdictTitle = "Looks Print-Ready with Minor Suggestions";
        verdictSummary = `The creative is structurally sound. ${suggestionIssues.length} minor visual polish suggestion${suggestionIssues.length > 1 ? "s" : ""} noted for extra finesse.`;
      }
    }

    const analysisNotice = engine === "local-deterministic"
      ? "Limited automated checks only: OCR spelling, approximate text contrast, margins, and image dimensions. Prices, dates, contact details, legal requirements, and overall design quality were not verified. Review these manually before publishing."
      : undefined;

    if (analysisNotice) {
      verdict = "needs_review";
      verdictTitle = "Limited Checks Completed — Manual Review Needed";
      verdictSummary = analysisNotice;
    }

    const result: DesignCheckResponse = {
      success: true,
      score: overallScore,
      verdict,
      verdictTitle,
      verdictSummary,
      verdictCounts,
      positiveHighlights,
      dimensions: {
        width: origWidth,
        height: origHeight,
        aspectRatio,
      },
      categoryScores: {
        dataScore,
        complianceScore,
        layoutScore,
        visualScore,
        copyScore: dataScore,
        contrastScore: visualScore,
        marginScore: layoutScore,
        qualityScore: complianceScore,
      },
      issues,
      engine,
      analysisNotice,
    };

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("Design Check API error:", err);
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "An unexpected error occurred during design inspection.",
      },
      { status: 500 }
    );
  }
}
