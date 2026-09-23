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
  whyItMatters?: string;
  originalText?: string;
  suggestedFix?: string;
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

function isLikelyRealText(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 2) return false;
  // Discard pure numbers, punctuation or symbols
  if (/^[^a-zA-Z]+$/.test(trimmed)) return false;

  const clean = trimmed.toLowerCase().replace(/[^a-z]/g, "");
  if (clean.length < 2) return false;

  // Words of 3+ letters must contain at least one vowel
  if (clean.length >= 3 && !/[aeiouy]/.test(clean)) return false;

  // Common 2-letter English words whitelist
  const validTwoLetterWords = new Set([
    "am", "an", "as", "at", "be", "by", "do", "go", "he", "hi", "if",
    "in", "is", "it", "me", "my", "no", "of", "on", "or", "so", "to",
    "up", "us", "we"
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
        description: `Dimensions (${origWidth}×${origHeight}px) are low. This design may appear pixelated when printed or viewed on high-DPI displays.`,
        suggestedFix: "Export at a minimum of 1080×1080px (for web) or 300 DPI (for print).",
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
    let marginIssuesCount = 0;
    const SAFE_MARGIN = 0.035; // 3.5% from edges

    for (const w of words) {
      if (w.pixelH < 12 || w.confidence < 70) continue;

      const touchesLeft = w.left < SAFE_MARGIN;
      const touchesRight = w.left + w.width > 1 - SAFE_MARGIN;
      const touchesTop = w.top < SAFE_MARGIN;
      const touchesBottom = w.top + w.height > 1 - SAFE_MARGIN;

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
            description: `Text "${w.text}" is placed too close to the ${edge}. It risks being cut off by print guillotines or social media feed crops.`,
            originalText: w.text,
            suggestedFix: `Move text inward by at least 15–20px to preserve a safe breathing margin.`,
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

    // 5. WCAG Text-to-Background Contrast Engine
    let contrastFailCount = 0;
    for (const w of words) {
      if (w.pixelW < 18 || w.pixelH < 12 || w.confidence < 75) continue;

      try {
        const centerX = Math.floor(w.pixelX + w.pixelW / 2);
        const centerY = Math.floor(w.pixelY + w.pixelH / 2);

        // Sample background pixels just outside the bounding box
        const bgSamples = [
          ctx.getImageData(Math.max(0, w.pixelX - 6), Math.max(0, centerY), 1, 1).data,
          ctx.getImageData(Math.min(width - 1, w.pixelX + w.pixelW + 6), Math.max(0, centerY), 1, 1).data,
          ctx.getImageData(Math.max(0, centerX), Math.max(0, w.pixelY - 6), 1, 1).data,
          ctx.getImageData(Math.max(0, centerX), Math.min(height - 1, w.pixelY + w.pixelH + 6), 1, 1).data,
        ];

        let avgBgR = 0;
        let avgBgG = 0;
        let avgBgB = 0;
        for (const s of bgSamples) {
          avgBgR += s[0];
          avgBgG += s[1];
          avgBgB += s[2];
        }
        avgBgR /= bgSamples.length;
        avgBgG /= bgSamples.length;
        avgBgB /= bgSamples.length;

        const bgLum = calculateRelativeLuminance(avgBgR, avgBgG, avgBgB);

        // Sample a grid of pixels inside the word bounding box
        // To find the actual text glyph strokes rather than the background space between letters
        const stepX = Math.max(1, Math.floor(w.pixelW / 10));
        const stepY = Math.max(1, Math.floor(w.pixelH / 5));
        const luminances: number[] = [];

        for (let px = w.pixelX + 2; px < w.pixelX + w.pixelW - 2; px += stepX) {
          for (let py = w.pixelY + 2; py < w.pixelY + w.pixelH - 2; py += stepY) {
            const p = ctx.getImageData(px, py, 1, 1).data;
            luminances.push(calculateRelativeLuminance(p[0], p[1], p[2]));
          }
        }

        if (luminances.length === 0) continue;
        luminances.sort((a, b) => a - b);

        // If background is dark (bgLum < 0.5), text strokes are the BRIGHTEST pixels (90th percentile)
        // If background is light (bgLum >= 0.5), text strokes are the DARKEST pixels (10th percentile)
        const textStrokeLum =
          bgLum < 0.5
            ? luminances[Math.floor(luminances.length * 0.90)]
            : luminances[Math.floor(luminances.length * 0.10)];

        const ratio = calculateContrastRatio(textStrokeLum, bgLum);

        // Only flag genuinely poor contrast (ratio < 2.5:1) on substantial words
        if (ratio < 2.5 && w.text.length >= 3) {
          contrastFailCount++;
          if (contrastFailCount <= 3) {
            issues.push({
              id: `contrast-${issueCounter++}`,
              category: "contrast",
              severity: "warning",
              title: "Low Contrast Readability",
              description: `Text "${w.text}" has a low contrast ratio of ${ratio.toFixed(1)}:1 (minimum recommended is 4.5:1). It may be hard to read on mobile screens or in bright light.`,
              originalText: w.text,
              suggestedFix: "Increase brightness contrast between the text color and the background.",
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
    let engine: "hybrid-gemini" | "local-deterministic" = "local-deterministic";
    let aiVerdict: "ready" | "needs_review" | "critical_issues" | null = null;
    let aiVerdictTitle: string | null = null;
    let aiVerdictSummary: string | null = null;

    if (geminiKey) {
      try {
        const base64Data = buffer.toString("base64");
        const prompt = `You are a Senior Creative QA Auditor at a premier advertising and publishing agency.
Your role is to conduct an uncompromising, professional Pre-Flight Quality Assurance audit on this graphic design asset.

AUDIT THE DESIGN ACROSS THESE 5 CREATIVE QA PILLARS:

1. DATA & INFORMATION INTEGRITY (Critical & High Priority):
- Price & Discount Math: Verify any stated discounts or savings match the prices (e.g. "50% off! Was $100 Now $60" is wrong math: 100 to 60 is 40%).
- Day & Date Sanity: Verify the day of the week matches the calendar date if stated.
- Contact Details: Incomplete phone numbers (missing digits), malformed emails (e.g. @gmial.com), broken URLs.
- Placeholder Artifacts: Flag leftover dummy text ("Lorem Ipsum", "[Insert Date]", "[Company Name]").
- Genuine spelling mistakes & grammar errors in visible headlines, offers, and body copy. IMPORTANT: Accept BOTH American and British/Commonwealth English spellings (e.g. 'catalogue' and 'catalog', 'colour' and 'color', 'centre' and 'center' are BOTH 100% valid). Do NOT flag brand names, company logos, sponsors, or tech acronyms (e.g. Hisense, Samsung, Nike, FIFA, HVAC, UAE, etc.).

2. COMPLIANCE & ASTERISK (*) MATCHING:
- Asterisk Pairing: If a headline or promotional claim contains an asterisk (*), check whether a corresponding footnote/disclaimer exists. If a footnote has an asterisk, check if the main claim has one.
- Mandatory Disclaimers: Missing terms on promotional or regulated claims.
- Outdated Copyright: Outdated years (e.g. © 2022 on a new ad).

3. PRE-FLIGHT ARTIFACTS & BRAND INTEGRITY:
- Stock Watermarks: Accidental leftover stock watermarks (Shutterstock, Getty, iStock, etc.).
- Logo Distortion & Clear-Space: Logo squished, stretched disproportionately, or crowding borders without breathing room.

4. TYPOGRAPHY & VISUAL HIERARCHY:
- Font Overload: 4+ conflicting font styles creating visual chaos.
- Hierarchy Inversion: Subheadings or fine print visually overpowering the main headline.
- Legibility: Full body paragraphs in ALL-CAPS, or unreadable decorative/script fonts on essential info.

5. LAYOUT, MARGINS & ACCESSIBILITY:
- Text-on-Image Contrast: White or light text placed directly over busy photo highlights without an overlay or drop shadow.
- Overcrowded / Cluttered: Essential elements colliding or lacking breathing room.

COORDINATES (CRITICAL):
For each issue, return a normalized bounding box [ymin, xmin, ymax, xmax] as integers between 0 and 1000 indicating where the issue occurs on the image.

Return ONLY a pure JSON object matching this schema:
{
  "verdict": "ready" | "needs_review" | "critical_issues",
  "verdictTitle": "Short 3-5 word summary headline",
  "verdictSummary": "1-2 sentence executive assessment of the design's publication readiness.",
  "issues": [
    {
      "category": "data_integrity" | "compliance" | "copy" | "typography" | "layout" | "contrast" | "artifacts",
      "severity": "critical" | "warning" | "suggestion",
      "qaRole": "e.g. Data Integrity / Asterisk Match / Typography / Pre-Flight",
      "title": "Concise issue title",
      "description": "Clear explanation of the error",
      "whyItMatters": "Why this damages credibility, legal compliance, or conversion",
      "suggestedFix": "Actionable, designer-ready instruction on how to fix it",
      "originalText": "exact text if applicable",
      "box_2d": [ymin, xmin, ymax, xmax]
    }
  ]
}
If the design is completely flawless with zero errors, return:
{
  "verdict": "ready",
  "verdictTitle": "Ready for Publication",
  "verdictSummary": "This asset passes all creative QA checks with zero data integrity, compliance, or typography issues detected.",
  "issues": []
}`;

        let response: Response | null = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`,
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
                    responseMimeType: "application/json",
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
          } catch (fetchErr) {
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
                        : "Creative QA"),
                    title: item.title || "QA Issue Flagged",
                    description: item.description,
                    whyItMatters: item.whyItMatters,
                    originalText: item.originalText,
                    suggestedFix: item.suggestedFix,
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
        const subTokens = w.text.split(/[\s—–-]+/);
        for (const sub of subTokens) {
          const cleaned = sub.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, "");
          if (cleaned.length < 3 || !isLikelyRealText(cleaned)) continue;

          // 1. Accept valid US, UK/Commonwealth spelling, or known Brand/Acronym
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

          // 3. Check for TitleCase proper nouns / brand names (e.g. "Hisense")
          const isCapitalized = /^[A-Z][a-z0-9]+$/.test(sub);

          const suggestions = spellUS.suggest(cleaned);
          const gbSuggestions = spellGB.suggest(cleaned);
          const topFix = suggestions[0] || gbSuggestions[0];

          issues.push({
            id: `spell-${issueCounter++}`,
            category: "copy",
            severity: isCapitalized ? "suggestion" : "warning",
            qaRole: "Spelling & Typography QA",
            title: isCapitalized ? "Unrecognized Name or Brand" : "Possible Spelling Mistake",
            description: isCapitalized
              ? `Word "${sub}" was not recognized in standard English dictionaries. If this is a brand name or proper noun, you can safely ignore this.`
              : `Word "${sub}" appears to be misspelled.`,
            whyItMatters: isCapitalized
              ? "Verify that brand names and proper nouns are spelled according to official brand guidelines."
              : "Spelling mistakes in published creative assets diminish brand trust and perceived professionalism.",
            originalText: sub,
            suggestedFix: topFix
              ? `If this is a typo, change to "${topFix}". Otherwise ignore if brand name.`
              : "Verify spelling or ignore if brand name.",
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

    // 7. Calculate QA Auditor category scores, verdict, and overall score
    const criticalIssues = issues.filter(
      (i) => i.severity === "critical" || i.severity === "error"
    );
    const warningIssues = issues.filter((i) => i.severity === "warning");

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

    let verdict: "ready" | "needs_review" | "critical_issues" = "ready";
    let verdictTitle = "Ready for Publication";
    let verdictSummary =
      "Asset passed all pre-flight creative QA checks with zero critical flaws.";

    if (
      criticalIssues.length > 0 ||
      overallScore < 65 ||
      aiVerdict === "critical_issues"
    ) {
      verdict = "critical_issues";
      verdictTitle =
        aiVerdictTitle ||
        `${Math.max(1, criticalIssues.length)} Critical QA Deal-Breaker${criticalIssues.length > 1 ? "s" : ""} Detected`;
      verdictSummary =
        aiVerdictSummary ||
        "Resolve critical data, discount math, placeholder, or compliance errors before publishing this asset.";
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
        `${Math.max(1, warningIssues.length)} warning${warningIssues.length > 1 ? "s" : ""} flagged. Adjusting these will elevate design polish and campaign conversion.`;
    } else {
      verdict = "ready";
      if (aiVerdictTitle) verdictTitle = aiVerdictTitle;
      if (aiVerdictSummary) verdictSummary = aiVerdictSummary;
    }

    const result: DesignCheckResponse = {
      success: true,
      score: overallScore,
      verdict,
      verdictTitle,
      verdictSummary,
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
