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

export interface DesignIssue {
  id: string;
  category: "copy" | "contrast" | "margin" | "typography" | "resolution";
  severity: "error" | "warning" | "suggestion";
  title: string;
  description: string;
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
  dimensions: {
    width: number;
    height: number;
    aspectRatio: number;
  };
  categoryScores: {
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
    const aspectRatio = Math.round((width / Math.max(height, 1)) * 100) / 100;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    const issues: DesignIssue[] = [];
    let issueCounter = 1;

    // 2. Check Resolution & Quality
    let qualityScore = 100;
    if (width < 600 || height < 400) {
      issues.push({
        id: `quality-${issueCounter++}`,
        category: "resolution",
        severity: "warning",
        title: "Low Resolution Artwork",
        description: `Dimensions (${width}×${height}px) are low. This design may appear pixelated when printed or viewed on high-DPI displays.`,
        suggestedFix: "Export at a minimum of 1080×1080px (for web) or 300 DPI (for print).",
        bbox: { left: 0.02, top: 0.02, width: 0.96, height: 0.08 },
      });
      qualityScore = 65;
    }

    // 3. OCR and spatial mapping via Tesseract
    const ocrWorker = await createWorker("eng");
    const ocrResult = await ocrWorker.recognize(buffer, {}, { blocks: true });
    await ocrWorker.terminate();

    type BboxWord = {
      text: string;
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

    // Extract blocks and words with bounding boxes
    const rawBlocks = ocrResult.data?.blocks || [];
    for (const block of rawBlocks) {
      for (const paragraph of block.paragraphs || []) {
        for (const line of paragraph.lines || []) {
          for (const w of line.words || []) {
            const text = (w.text || "").trim();
            if (!text || text.length < 2 || !w.bbox) continue;

            const x0 = w.bbox.x0;
            const y0 = w.bbox.y0;
            const x1 = w.bbox.x1;
            const y1 = w.bbox.y1;

            words.push({
              text,
              left: Math.max(0, x0 / width),
              top: Math.max(0, y0 / height),
              width: Math.min(1, (x1 - x0) / width),
              height: Math.min(1, (y1 - y0) / height),
              pixelX: x0,
              pixelY: y0,
              pixelW: x1 - x0,
              pixelH: y1 - y0,
            });
          }
        }
      }
    }

    // 4. Margins & Safe-Zone Engine
    let marginIssuesCount = 0;
    const SAFE_MARGIN = 0.035; // 3.5% from edges

    for (const w of words) {
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

        // Group or cap to avoid overwhelming
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
      if (w.pixelW < 8 || w.pixelH < 8) continue;

      try {
        // Sample text center pixel
        const centerX = Math.floor(w.pixelX + w.pixelW / 2);
        const centerY = Math.floor(w.pixelY + w.pixelH / 2);
        const textPixel = ctx.getImageData(centerX, centerY, 1, 1).data;
        const textLum = calculateRelativeLuminance(
          textPixel[0],
          textPixel[1],
          textPixel[2]
        );

        // Sample background pixels just outside the bounding box
        const bgSamples = [
          ctx.getImageData(Math.max(0, w.pixelX - 4), Math.max(0, centerY), 1, 1).data,
          ctx.getImageData(Math.min(width - 1, w.pixelX + w.pixelW + 4), Math.max(0, centerY), 1, 1).data,
          ctx.getImageData(Math.max(0, centerX), Math.max(0, w.pixelY - 4), 1, 1).data,
          ctx.getImageData(Math.max(0, centerX), Math.min(height - 1, w.pixelY + w.pixelH + 4), 1, 1).data,
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
        const ratio = calculateContrastRatio(textLum, bgLum);

        // WCAG AA threshold: 4.5:1 for regular text, 3.0:1 for large text
        const isLarge = w.pixelH >= 24;
        const minRatio = isLarge ? 3.0 : 4.5;

        if (ratio < minRatio && ratio > 1.05) {
          contrastFailCount++;
          if (contrastFailCount <= 4) {
            issues.push({
              id: `contrast-${issueCounter++}`,
              category: "contrast",
              severity: "warning",
              title: "Low Contrast Readability",
              description: `Text "${w.text}" has a contrast ratio of ${ratio.toFixed(1)}:1 (minimum recommended is ${minRatio}:1). It may be hard to read on mobile screens or in bright light.`,
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

    // 6. Gemini Multimodal Vision / Language Inspection (if GEMINI_API_KEY is configured)
    const geminiKey = process.env.GEMINI_API_KEY;
    let engine: "hybrid-gemini" | "local-deterministic" = "local-deterministic";

    if (geminiKey) {
      try {
        const base64Data = buffer.toString("base64");
        const prompt = `You are an expert graphic design pre-flight quality inspector.
Analyze this image design carefully for:
1. Spelling mistakes and typos in all visible text.
2. Grammar mistakes, missing articles, or awkward phrasing (e.g., "We provide best service" -> "We provide the best service").
3. Inconsistent or poor typography hierarchy.
4. Overlooked placeholder text (e.g., "Lorem Ipsum", "Sample Text", "000000").

Return your findings strictly as a JSON object matching this schema:
{
  "issues": [
    {
      "category": "copy" | "typography",
      "severity": "error" | "warning" | "suggestion",
      "title": "Short title (e.g. Grammatical Mistake)",
      "description": "Clear explanation of the error",
      "originalText": "exact text as visible on image",
      "suggestedFix": "corrected recommendation"
    }
  ]
}
If there are no copy or typography errors, return { "issues": [] }. Output pure JSON only without markdown formatting.`;

        const response = await fetch(
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

        if (response.ok) {
          const geminiData = await response.json();
          const textResponse =
            geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (textResponse) {
            const parsed = JSON.parse(textResponse);
            if (Array.isArray(parsed.issues)) {
              engine = "hybrid-gemini";
              for (const item of parsed.issues) {
                // Find matching OCR word box for exact pixel-level bounding box
                const orig = (item.originalText || "").toLowerCase();
                const matchedWord = words.find((w) =>
                  orig.includes(w.text.toLowerCase()) ||
                  w.text.toLowerCase().includes(orig)
                );

                issues.push({
                  id: `ai-${issueCounter++}`,
                  category: item.category === "typography" ? "typography" : "copy",
                  severity: item.severity || "error",
                  title: item.title || "Copy Issue",
                  description: item.description,
                  originalText: item.originalText,
                  suggestedFix: item.suggestedFix,
                  bbox: matchedWord
                    ? {
                        left: matchedWord.left,
                        top: matchedWord.top,
                        width: Math.max(matchedWord.width, 0.05),
                        height: Math.max(matchedWord.height, 0.03),
                      }
                    : {
                        left: 0.2,
                        top: 0.3,
                        width: 0.6,
                        height: 0.08,
                      },
                });
              }
            }
          }
        }
      } catch (geminiErr) {
        console.warn("Gemini vision analysis failed, falling back to local spelling check:", geminiErr);
      }
    }

    // Fallback: If Gemini did not add copy issues, run local nspell dictionary
    const hasCopyIssues = issues.some((i) => i.category === "copy");
    if (!hasCopyIssues) {
      for (const w of words) {
        const cleaned = w.text.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, "");
        if (cleaned.length >= 3 && !/^\d+$/.test(cleaned)) {
          if (!spellUS.correct(cleaned)) {
            const suggestions = spellUS.suggest(cleaned);
            issues.push({
              id: `spell-${issueCounter++}`,
              category: "copy",
              severity: "error",
              title: "Possible Spelling Mistake",
              description: `Word "${w.text}" appears to be misspelled.`,
              originalText: w.text,
              suggestedFix: suggestions[0]
                ? `Did you mean "${suggestions[0]}"?`
                : undefined,
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
    }

    // 7. Calculate category scores and overall score
    const copyIssues = issues.filter((i) => i.category === "copy");
    const contrastIssues = issues.filter((i) => i.category === "contrast");
    const marginIssues = issues.filter((i) => i.category === "margin");

    const copyScore = Math.max(20, 100 - copyIssues.length * 15);
    const contrastScore = Math.max(20, 100 - contrastIssues.length * 12);
    const marginScore = Math.max(30, 100 - marginIssues.length * 10);

    const overallScore = Math.round(
      copyScore * 0.4 +
      contrastScore * 0.25 +
      marginScore * 0.2 +
      qualityScore * 0.15
    );

    const result: DesignCheckResponse = {
      success: true,
      score: overallScore,
      dimensions: {
        width,
        height,
        aspectRatio,
      },
      categoryScores: {
        copyScore,
        contrastScore,
        marginScore,
        qualityScore,
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
