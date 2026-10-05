import { NextResponse } from "next/server";
import { createWorker, type Worker } from "tesseract.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import nspell from "nspell";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import {
  GEMINI_RESPONSE_SCHEMA, analyzeTextLayout, analyzeTextMargins, box2dToNorm, classifyContrast,
  crossValidate, detectEdgeContent, evaluateSpelling, extractGeminiText, findOcrBox, makeLumAccessor,
  marginConfig, measureTextContrast, median, mergeOcrWords, parseJsonLoose, verifyDateClaims,
  verifyPriceClaims,
  type ContrastMeasure, type DateClaim, type Locator, type NormBox, type OcrWord, type PriceClaim,
  type QaCategory, type QaIssueDraft, type QaSeverity,
} from "./analysis";
import { buildGeminiPrompt } from "./prompt";
import { runPaddleOcr } from "./paddleOcr";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function loadDictionary(subFolder: string, packageName: string) {
  let resolvedDir: string | null = null;
  try {
    const { createRequire } = require("node:module");
    const req = createRequire(import.meta.url);
    resolvedDir = dirname(req.resolve(packageName));
  } catch {}

  const candidates = [
    ...(resolvedDir ? [resolvedDir] : []),
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

  console.warn(
    `[DesignCheck] Dictionary fallback used for ${packageName} (${subFolder}) — dictionary files not found. Spell checking will be disabled!`
  );

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
  "ronshen", "kelon", "gorenje", "sanden", "changelight", "asko", "tcl", "haier",

  // Acronyms, Geography & Events
  "hvac", "fifa", "uae", "usa", "uk", "eu", "dubai", "abu", "dhabi", "sharjah", "ajman", "rak",
  "fujairah", "doha", "qatar", "saudi", "arabia", "riyadh", "jeddah", "kuwait", "oman", "muscat",
  "bahrain", "manama", "cairo", "egypt", "beirut", "amman", "delhi", "mumbai", "london", "paris",
  "tokyo", "singapore", "sydney", "expo", "olympics", "worldcup", "fifa26", "ac", "led", "lcd",
  "oled", "qled", "uhd", "hd", "4k", "8k", "usb", "btu", "inverter", "wifi", "ai", "iot", "eco",
  "qingdao", "shunde", "guangzhou", "shenzhen", "beijing", "shanghai", "tianjin", "chongqing", "jersey", "worldwide",
  "changsha", "guiyang", "huzhou", "nanchang", "shijiazhuang", "sichuan", "zhejiang", "guangdong",

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
  ocrEngine?: string;
  analysisNotice?: string;
  error?: string;
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

// ───────────────────────── Request guards ─────────────────────────
const MAX_FILE_BYTES = (Number(process.env.MAX_FILE_MB) || 10) * 1024 * 1024;
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX) || 30;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const rateBuckets = new Map<string, { count: number; reset: number }>();

// Best-effort per-instance limiter (on serverless each warm instance counts separately;
// put a real limiter / WAF rule in front of this route if Gemini cost matters).
function isRateLimited(ip: string): boolean {
  if (process.env.NODE_ENV === "development" && (ip === "127.0.0.1" || ip === "::1" || ip === "unknown")) {
    return false;
  }
  const now = Date.now();
  if (rateBuckets.size > 5000) {
    for (const [k, v] of rateBuckets) if (v.reset < now) rateBuckets.delete(k);
  }
  const b = rateBuckets.get(ip);
  if (!b || b.reset < now) {
    rateBuckets.set(ip, { count: 1, reset: now + RATE_WINDOW_MS });
    return false;
  }
  b.count++;
  return b.count > RATE_LIMIT_MAX;
}

/** Trust the bytes, not the client-supplied Content-Type. */
function sniffImageMime(b: Buffer): string | null {
  if (b.length < 12) return null;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

// ───────────────────────── OCR (shared worker + preprocessing) ─────────────────────────
type LoadedImage = Awaited<ReturnType<typeof loadImage>>;
type OcrResultLike = Awaited<ReturnType<Worker["recognize"]>>;

let ocrWorkerPromise: Promise<Worker> | null = null;
let ocrChain: Promise<unknown> = Promise.resolve();

function getOcrWorker(): Promise<Worker> {
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = createWorker("eng").catch((e) => {
      ocrWorkerPromise = null;
      throw e;
    });
  }
  return ocrWorkerPromise;
}

// One shared worker, jobs run strictly one after another.
function runOcr(buf: Buffer): Promise<OcrResultLike> {
  const job = ocrChain.then(async () => {
    const worker = await getOcrWorker();
    return worker.recognize(buf, {}, { blocks: true });
  });
  ocrChain = job.catch(() => {
    // A failed job may leave the worker in a bad state: recycle it.
    const dead = ocrWorkerPromise;
    ocrWorkerPromise = null;
    dead?.then((w) => w.terminate()).catch(() => undefined);
  });
  return job;
}

/** Grayscale + percentile contrast stretch (+ upscale small images, optional inversion for light-on-dark text). */
function buildOcrImage(img: LoadedImage, width: number, height: number, inverted: boolean) {
  const longest = Math.max(width, height);
  let scale = longest < 1400 ? 2 : longest < 2000 ? 1.5 : 1;
  scale = Math.min(scale, 3200 / longest);
  const cw = Math.max(1, Math.round(width * scale));
  const ch = Math.max(1, Math.round(height * scale));
  const c = createCanvas(cw, ch);
  const cx = c.getContext("2d");
  cx.fillStyle = "#ffffff";
  cx.fillRect(0, 0, cw, ch);
  cx.drawImage(img, 0, 0, cw, ch);

  const id = cx.getImageData(0, 0, cw, ch);
  const d = id.data;
  const hist = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) {
    const g = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) | 0;
    d[i] = g;
    hist[g]++;
  }
  const total = cw * ch;
  let acc = 0, lo = 0, hi = 255;
  for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= total * 0.01) { lo = v; break; } }
  acc = 0;
  for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= total * 0.01) { hi = v; break; } }
  if (hi - lo < 25) { lo = 0; hi = 255; } // nearly flat image: don't amplify noise
  const span = Math.max(1, hi - lo);
  for (let i = 0; i < d.length; i += 4) {
    let g = ((d[i] - lo) * 255) / span;
    g = g < 0 ? 0 : g > 255 ? 255 : g;
    if (inverted) g = 255 - g;
    d[i] = d[i + 1] = d[i + 2] = g;
    d[i + 3] = 255;
  }
  cx.putImageData(id, 0, 0);
  return { buffer: c.toBuffer("image/png"), scale };
}

function extractOcr(result: OcrResultLike, scale: number, width: number, height: number) {
  const words: OcrWord[] = [];
  const lines: OcrWord[] = [];
  const mk = (text: string, confidence: number, x0: number, y0: number, x1: number, y1: number): OcrWord => {
    const px = Math.max(0, x0 / scale), py = Math.max(0, y0 / scale);
    const pw = Math.max(0, (x1 - x0) / scale), ph = Math.max(0, (y1 - y0) / scale);
    return {
      text, confidence,
      left: Math.min(1, px / width), top: Math.min(1, py / height),
      width: Math.min(1, pw / width), height: Math.min(1, ph / height),
      pixelX: px, pixelY: py, pixelW: pw, pixelH: ph,
    };
  };
  for (const block of result.data?.blocks || []) {
    for (const paragraph of block.paragraphs || []) {
      for (const line of paragraph.lines || []) {
        if (line.bbox) {
          const lt = (line.text || "").trim();
          const lc = typeof line.confidence === "number" ? line.confidence : 80;
          if (lt && lc >= 60) lines.push(mk(lt, lc, line.bbox.x0, line.bbox.y0, line.bbox.x1, line.bbox.y1));
        }
        for (const w of line.words || []) {
          const text = (w.text || "").trim();
          const conf = typeof w.confidence === "number" ? w.confidence : 80;
          if (conf < 60 || !w.bbox || !isLikelyRealText(text)) continue;
          const ow = mk(text, conf, w.bbox.x0, w.bbox.y0, w.bbox.x1, w.bbox.y1);
          if (ow.pixelW < 10 || ow.pixelH < 8) continue; // sub-pixel specks
          words.push(ow);
        }
      }
    }
  }
  return { words, lines };
}

// ───────────────────────── Gemini ─────────────────────────
async function callGemini(opts: {
  key: string; model: string; prompt: string; base64: string; mime: string;
}): Promise<Record<string, unknown> | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(opts.model)}:generateContent`;
  let useSchema = true;
  let useThinking = true;

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        // Key goes in a header, not the URL (URLs end up in logs).
        headers: { "Content-Type": "application/json", "x-goog-api-key": opts.key },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({
          contents: [{ parts: [{ text: opts.prompt }, { inlineData: { mimeType: opts.mime, data: opts.base64 } }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
            ...(useSchema ? { responseSchema: GEMINI_RESPONSE_SCHEMA } : {}),
            // thinkingConfig belongs INSIDE generationConfig (it was ignored at top level)
            ...(useThinking ? { thinkingConfig: { thinkingBudget: 1024 } } : {}),
          },
        }),
      });
      if (res.ok) return parseJsonLoose(extractGeminiText(await res.json()));
      if (res.status === 400) {
        // Model doesn't support the schema / thinking option: degrade step by step.
        if (useSchema) { useSchema = false; continue; }
        if (useThinking) { useThinking = false; continue; }
        break;
      }
      if (res.status === 503 || res.status === 429) {
        console.warn(`[DesignCheck] Gemini ${res.status}, retry ${attempt}`);
        await new Promise((r) => setTimeout(r, 800 * attempt));
        continue;
      }
      break;
    } catch (err: unknown) {
      console.warn(`[DesignCheck] Gemini fetch error (attempt ${attempt}):`, err);
      const isDnsError = err && typeof err === "object" && ("code" in err && (err as { code?: string }).code === "ENOTFOUND" || "cause" in err && (err as { cause?: { code?: string } }).cause?.code === "ENOTFOUND");
      if (isDnsError || attempt >= 2) {
        break; // Fast fail on network unreachability to stay within route time budget
      }
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
  return null;
}

interface GeminiItem {
  category?: string; severity?: string; qaRole?: string; title?: string; description?: string;
  impact?: string; specDetail?: string; whyItMatters?: string; suggestedFix?: string;
  originalText?: string; isHedged?: boolean; box_2d?: number[];
}

const ROLE_BY_CATEGORY: Record<string, string> = {
  data_integrity: "Data Integrity QA",
  compliance: "Asterisk & Legal Compliance",
  typography: "Typography & Hierarchy",
  contrast: "Contrast & Readability",
  layout: "Layout & Alignment",
  artifacts: "Pre-Flight Artifacts",
};
const VALID_CATEGORIES = ["copy", "contrast", "margin", "typography", "compliance", "data_integrity", "layout", "artifacts"];

function geminiItemsToIssues(parsed: Record<string, unknown>, words: OcrWord[]): QaIssueDraft[] {
  const items = Array.isArray(parsed.issues) ? (parsed.issues as GeminiItem[]) : [];
  return items.map((item) => {
    // Prefer the exact OCR box when the quoted text was found; fall back to the model's box.
    const b: NormBox =
      findOcrBox(words, item.originalText) ??
      box2dToNorm(item.box_2d) ?? { left: 0.1, top: 0.1, width: 0.2, height: 0.08 };
    const category = (VALID_CATEGORIES.includes(item.category ?? "") ? item.category : "copy") as QaCategory;
    const severity = (["critical", "warning", "suggestion"].includes(item.severity ?? "") ? item.severity : "warning") as QaSeverity;
    const left = Math.max(0, Math.min(0.95, b.left));
    const top = Math.max(0, Math.min(0.95, b.top));
    return {
      category, severity,
      qaRole: item.qaRole || ROLE_BY_CATEGORY[category] || "Creative Director QA",
      title: item.title || "QA Issue Flagged",
      description: item.description || item.title || "Potential issue flagged by the visual review.",
      impact: item.impact || item.whyItMatters || undefined,
      specDetail: item.specDetail || undefined,
      whyItMatters: item.whyItMatters || item.impact || undefined,
      originalText: item.originalText,
      suggestedFix: item.suggestedFix,
      isHedged: Boolean(item.isHedged),
      bbox: { left, top, width: Math.min(1 - left, b.width), height: Math.min(1 - top, b.height) },
    };
  });
}

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

// ───────────────────────── Route ─────────────────────────
export async function POST(req: Request) {
  try {
    const ip = (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { success: false, error: "Too many design checks in a short time. Please wait a few minutes and try again." },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ success: false, error: "No image or document file uploaded" }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { success: false, error: `File is too large (max ${Math.round(MAX_FILE_BYTES / 1024 / 1024)}MB).` },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = sniffImageMime(buffer);
    if (!mimeType) {
      return NextResponse.json(
        { success: false, error: "Unsupported or corrupted file. Please upload a valid PNG, JPG, or WebP image." },
        { status: 400 }
      );
    }
    const mode = formData.get("mode") === "print" ? "print" : "digital";

    // 1. Decode and paint onto a WHITE canvas (transparent PNGs would otherwise read as black).
    let img: LoadedImage;
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
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0);
    // One bulk read; every pixel lookup below indexes this array (per-pixel getImageData is very slow).
    const lumAt = makeLumAccessor(ctx.getImageData(0, 0, width, height).data, width, height);

    const issues: DesignIssue[] = [];
    let issueCounter = 1;
    const addDrafts = (drafts: QaIssueDraft[], prefix: string) => {
      for (const d of drafts) issues.push({ id: `${prefix}-${issueCounter++}`, ...d });
    };

    // 2. Resolution
    if (origWidth < 600 || origHeight < 400) {
      addDrafts([{
        category: "resolution", severity: "warning",
        title: "Low Resolution Artwork",
        description: `Artwork dimensions (${origWidth}×${origHeight}px) fall below recommended digital and print resolution thresholds.`,
        impact: "This creative will look noticeably blurry or pixelated when viewed on modern high-DPI screens or in print.",
        specDetail: `Uploaded asset is ${origWidth}×${origHeight}px (standard minimum is 1080×1080px for social, 300 DPI for print).`,
        whyItMatters: "Low-resolution visuals degrade perceived brand quality and credibility.",
        suggestedFix: "Export at a minimum of 1080×1080px (for social) or 300 DPI (for print).",
        bbox: { left: 0.02, top: 0.02, width: 0.96, height: 0.08 },
      }], "quality");
    }

    // 3. OCR: High-Precision PaddleOCR (PP-OCRv6) Engine with Tesseract fallback
    let words: OcrWord[] = [];
    let lines: OcrWord[] = [];
    let ocrEngine = "PaddleOCR (PP-OCRv6)";

    try {
      const pRes = await runPaddleOcr(buffer, width, height);
      words = pRes.words;
      lines = pRes.lines;
    } catch (paddleErr) {
      console.warn("[DesignCheck] PaddleOCR execution fallback to Tesseract:", paddleErr);
      ocrEngine = "Tesseract.js (Fallback)";
      const pass1 = buildOcrImage(img, width, height, false);
      const r1 = await runOcr(pass1.buffer);
      const e1 = extractOcr(r1, pass1.scale, width, height);
      words = e1.words;
      lines = e1.lines;
    }

    const pageLum = median([
      lumAt(10, 10), lumAt(width - 10, 10), lumAt(10, height - 10),
      lumAt(width - 10, height - 10), lumAt(width / 2, 15),
    ]);
    if (words.length < 5 || pageLum < 0.25) {
      try {
        const pass2 = buildOcrImage(img, width, height, true);
        const pRes2 = await runPaddleOcr(pass2.buffer, width, height).catch(async () => {
          const r2 = await runOcr(pass2.buffer);
          return extractOcr(r2, pass2.scale, width, height);
        });
        words = mergeOcrWords(words, pRes2.words);
        lines = mergeOcrWords(lines, pRes2.lines);
      } catch (e) {
        console.warn("[DesignCheck] Secondary inverted OCR pass skipped:", e);
      }
    }

    // 4. Margins (text + non-text artwork), thresholds depend on digital/print mode
    const cfg = marginConfig(mode);
    const margins = analyzeTextMargins(words, cfg);
    addDrafts(margins.issues, "margin");
    addDrafts(detectEdgeContent(lumAt, width, height, cfg.danger, margins.edgesHit), "margin");

    // 5. Contrast: real ratio per word (no luminance-difference shortcuts)
    type Cls = NonNullable<ReturnType<typeof classifyContrast>>;
    const fails: { w: OcrWord; m: ContrastMeasure; cls: Cls }[] = [];
    const busy: { w: OcrWord; m: ContrastMeasure }[] = [];
    for (const w of words) {
      if (w.pixelW < 14 || w.pixelH < 10 || w.confidence < 70) continue;
      if (w.text.length < 3 || isModelOrCodeNumber(w.text)) continue;

      const cleanWord = w.text.toLowerCase().replace(/[^a-z0-9]/g, "");
      // WCAG 2.1 Criterion 1.4.3: Logotypes (brand names & partner logos) are explicitly exempt from contrast rules
      if (BRAND_AND_PROPER_NOUNS.has(cleanWord) || BRAND_AND_PROPER_NOUNS.has(w.text.toLowerCase())) continue;

      // Secondary technical units / parenthetical metadata (e.g. "(inch)", "(kg)", "120W", "60Hz")
      const isSpecUnit = /^\(?[a-z0-9]+(\/?[a-z0-9]+)*\)?$/i.test(w.text) &&
        (w.text.startsWith("(") || w.text.endsWith(")") || /^[0-9]+(w|hz|k|v|m|cm|mm|kg|dba|inch|nit)$/i.test(w.text));

      // Uppercase labels, table column headers, or bold text have higher visual mass
      const isUpperOrBold = (/^[A-Z0-9\s.,/()+-]+$/.test(w.text) && w.text.length >= 2) || isSpecUnit;

      const m = measureTextContrast(lumAt, {
        x: Math.round(w.pixelX), y: Math.round(w.pixelY), w: Math.round(w.pixelW), h: Math.round(w.pixelH),
      });
      if (!m) continue;
      const cls = classifyContrast(m.ratio, w.pixelH, height, m.busy, isUpperOrBold);
      if (cls) fails.push({ w, m, cls });
      else if (m.busy > 0.16 && m.ratio < 7) busy.push({ w, m });
    }
    fails.sort((a, b) => a.m.ratio - b.m.ratio);
    fails.slice(0, 4).forEach(({ w, m, cls }) => {
      addDrafts([{
        category: "contrast", severity: cls.severity, isHedged: cls.hedged,
        title: "Low Contrast Readability",
        description: `Text "${w.text}" has low contrast against its background (${m.ratio.toFixed(1)}:1 ratio).`,
        impact: "Readers in bright ambient lighting or on mobile screens will struggle to read this copy.",
        specDetail: `Contrast ratio is ${m.ratio.toFixed(1)}:1 (WCAG AA requires ${cls.required}:1 for this text size).`,
        whyItMatters: "Poor contrast reduces reading speed and viewer comprehension.",
        originalText: w.text,
        suggestedFix: "Increase the brightness difference between the text color and background.",
        bbox: { left: w.left, top: w.top, width: w.width, height: w.height },
      }], "contrast");
    });
    if (fails.length > 4) {
      const w = fails[4].w;
      addDrafts([{
        category: "contrast", severity: "suggestion", isHedged: true,
        title: "More low-contrast text",
        description: `${fails.length - 4} more word${fails.length - 4 > 1 ? "s" : ""} also fall below the recommended contrast ratio.`,
        specDetail: "WCAG AA: 4.5:1 for normal text, 3:1 for large text.",
        suggestedFix: "Review the colours of all small or light text against its background.",
        bbox: { left: w.left, top: w.top, width: w.width, height: w.height },
      }], "contrast");
    }
    if (busy.length >= 2) {
      const { w, m } = [...busy].sort((a, b) => b.m.busy - a.m.busy)[0];
      addDrafts([{
        category: "typography", severity: "suggestion", isHedged: true,
        title: "Text over a busy background",
        description: `${busy.length} words sit on a textured or photographic background, which can make them harder to read (e.g. "${w.text}").`,
        impact: "Text over busy imagery gets lost, especially on small screens.",
        specDetail: `Background luminance varies by ~${(m.busy * 100).toFixed(0)}% inside the text area.`,
        suggestedFix: "Add a solid panel, gradient overlay, or shadow behind the text.",
        originalText: w.text,
        bbox: { left: w.left, top: w.top, width: w.width, height: w.height },
      }], "typo");
    }

    // 5b. Text layout: tiny text, overlaps, alignment and line-spacing consistency
    addDrafts(analyzeTextLayout(lines, width, height), "layout");

    // 5c. Spelling: ALWAYS run the dictionary check. Vision models silently auto-correct typos while reading,
    //     so the deterministic check is the one that actually catches them.
    let spellCount = 0, spellExtra = 0, lastExtra: OcrWord | null = null;
    for (const w of words) {
      if (w.confidence < 72 || isModelOrCodeNumber(w.text)) continue;
      for (const sub of w.text.split(/[\s—–-]+/)) {
        if (!sub || isModelOrCodeNumber(sub)) continue;
        // Strip leading & trailing punctuation so "Qingdao," becomes "Qingdao"
        const token = sub.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, "");
        if (token.length < 3 || !isLikelyRealText(token)) continue;
        const cleaned = token.toLowerCase();
        if (cleaned.length < 3) continue;
        const v = evaluateSpelling(token, spellUS, spellGB, BRAND_AND_PROPER_NOUNS);
        if (!v) continue;
        if (spellCount >= 8) { spellExtra++; lastExtra = w; continue; }
        spellCount++;
        addDrafts([{
          category: "copy", severity: v.severity, isHedged: v.hedged,
          qaRole: "Spelling & Typography QA",
          title: "Possible Spelling Mistake",
          description: `Word "${token}" appears to be misspelled.`,
          impact: "Spelling errors in published copy distract readers and lower perceived brand credibility.",
          specDetail: v.suggestion ? `Dictionary suggestion: "${v.suggestion}"` : "Flagged by pre-flight dictionary check",
          whyItMatters: "Spelling mistakes in published creative assets diminish brand trust and perceived professionalism.",
          originalText: token,
          suggestedFix: v.suggestion ? `If this is a typo, change to "${v.suggestion}".` : "Verify spelling.",
          bbox: { left: w.left, top: w.top, width: w.width, height: w.height },
        }], "spell");
      }
    }
    if (spellExtra && lastExtra) {
      addDrafts([{
        category: "copy", severity: "suggestion", isHedged: true,
        title: "More possible spelling issues",
        description: `${spellExtra} more word${spellExtra > 1 ? "s" : ""} were flagged by the dictionary check.`,
        suggestedFix: "Proofread the remaining copy.",
        bbox: { left: lastExtra.left, top: lastExtra.top, width: lastExtra.width, height: lastExtra.height },
      }], "spell");
    }

    // 6. Gemini multimodal QA (optionally twice for self-consistency)
    const geminiKey = process.env.GEMINI_API_KEY;
    const geminiModel = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
    let engine: "hybrid-gemini" | "local-deterministic" = "local-deterministic";
    let aiVerdict: "ready" | "needs_review" | "critical_issues" | null = null;
    let aiVerdictTitle: string | null = null;
    let aiVerdictSummary: string | null = null;
    let aiPositiveHighlights: string[] = [];

    if (geminiKey) {
      try {
        const ocrWordList = words
          .map((w) => `"${w.text}" (conf:${Math.round(w.confidence)}%, pos: top=${(w.top * 100).toFixed(1)}% left=${(w.left * 100).toFixed(1)}%)`)
          .join(", ");
        const formatHint =
          origWidth > origHeight ? "landscape / horizontal banner"
          : origWidth < origHeight ? "portrait / vertical banner or flyer"
          : "square format";
        const prompt = buildGeminiPrompt({
          imageDimContext: `${origWidth}×${origHeight}px (aspect ratio ${aspectRatio})`,
          formatHint, mimeType, ocrWordList,
        });
        const base64 = buffer.toString("base64");
        const doublePass = ["1", "true", "yes"].includes((process.env.GEMINI_DOUBLE_PASS || "").toLowerCase());
        const runs = await Promise.all(
          Array.from({ length: doublePass ? 2 : 1 }, () =>
            callGemini({ key: geminiKey, model: geminiModel, prompt, base64, mime: mimeType })
          )
        );
        const primary = runs[0];

        if (primary && typeof primary === "object") {
          engine = "hybrid-gemini";
          const pv = primary.verdict;
          if (pv === "ready" || pv === "needs_review" || pv === "critical_issues") aiVerdict = pv;
          if (typeof primary.verdictTitle === "string" && primary.verdictTitle) aiVerdictTitle = primary.verdictTitle;
          if (typeof primary.verdictSummary === "string" && primary.verdictSummary) aiVerdictSummary = primary.verdictSummary;
          aiPositiveHighlights = arr<unknown>(primary.positiveHighlights)
            .filter((h): h is string => typeof h === "string" && h.trim().length > 0)
            .map((h) => h.trim());

          let drafts = geminiItemsToIssues(primary, words);
          if (runs[1]) {
            // Only findings reproduced by BOTH runs stay "definite"; the rest are shown hedged.
            const { confirmed, unconfirmed } = crossValidate(drafts, geminiItemsToIssues(runs[1], words));
            drafts = [
              ...confirmed,
              ...unconfirmed.map((d) => ({
                ...d, isHedged: true, severity: (d.severity === "critical" ? "warning" : d.severity) as QaSeverity,
              })),
            ];
          }
          addDrafts(drafts, "qa");

          // Price / date math is done in code, never by the LLM.
          const locate: Locator = (text, box2d) =>
            findOcrBox(words, text) ?? box2dToNorm(box2d) ?? { left: 0.1, top: 0.1, width: 0.2, height: 0.08 };
          addDrafts(verifyPriceClaims(arr<PriceClaim>(primary.priceClaims), locate), "fact");
          addDrafts(verifyDateClaims(arr<DateClaim>(primary.dateClaims), locate), "fact");
        }
      } catch (geminiErr) {
        console.warn("Gemini QA analysis failed, falling back to local inspection:", geminiErr);
      }
    }

    // Drop copy issues reported twice for the same word (local dictionary + Gemini)
    const seenCopy = new Set<string>();
    const uniqueIssues = issues.filter((i) => {
      if (i.category !== "copy" || !i.originalText) return true;
      const key = i.originalText.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!key || seenCopy.has(key)) return !key;
      seenCopy.add(key);
      return true;
    });
    issues.length = 0;
    issues.push(...uniqueIssues);

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
        dataIssues.reduce((acc, curr) => {
          if (curr.severity === "critical" || curr.severity === "error") return acc + 22;
          if (curr.severity === "warning") return acc + (curr.isHedged ? 6 : 10);
          return acc + (curr.isHedged ? 1 : 3);
        }, 0)
    );
    const complianceScore = Math.max(
      20,
      100 -
        complianceIssues.reduce((acc, curr) => {
          if (curr.severity === "critical" || curr.severity === "error") return acc + 20;
          if (curr.severity === "warning") return acc + (curr.isHedged ? 6 : 10);
          return acc + (curr.isHedged ? 1 : 2);
        }, 0)
    );
    const layoutScore = Math.max(
      25,
      100 -
        layoutIssues.reduce((acc, curr) => {
          if (curr.severity === "critical" || curr.severity === "error") return acc + 18;
          if (curr.severity === "warning") return acc + (curr.isHedged ? 5 : 8);
          return acc + (curr.isHedged ? 1 : 2);
        }, 0)
    );
    const visualScore = Math.max(
      20,
      100 -
        visualIssues.reduce((acc, curr) => {
          if (curr.severity === "critical" || curr.severity === "error") return acc + 15;
          if (curr.severity === "warning") return acc + (curr.isHedged ? 5 : 7);
          return acc + (curr.isHedged ? 1 : 2);
        }, 0)
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
      ocrEngine,
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
