/**
 * Pure, dependency-free analysis helpers for the Design Check API.
 * Nothing in here touches the network, the filesystem or canvas, so it can be
 * unit-tested directly (see scripts/analysis.test.mjs).
 */

// ───────────────────────── Types ─────────────────────────
export type QaCategory =
  | "copy" | "contrast" | "margin" | "typography" | "compliance"
  | "data_integrity" | "layout" | "artifacts" | "resolution";
export type QaSeverity = "critical" | "warning" | "suggestion";

export interface NormBox { left: number; top: number; width: number; height: number }

export interface QaIssueDraft {
  category: QaCategory;
  severity: QaSeverity;
  qaRole?: string;
  title: string;
  description: string;
  impact?: string;
  specDetail?: string;
  whyItMatters?: string;
  originalText?: string;
  suggestedFix?: string;
  isHedged?: boolean;
  bbox: NormBox;
}

export interface OcrWord {
  text: string; confidence: number;
  left: number; top: number; width: number; height: number;
  pixelX: number; pixelY: number; pixelW: number; pixelH: number;
}
export type OcrLine = OcrWord;

export interface SpellChecker { correct(word: string): boolean; suggest(word: string): string[] }

// ───────────────────────── Small utilities ─────────────────────────
export function median(arr: number[]): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length);
}

/** Edit distance where swapping two adjacent letters ("recieve" → "receive") counts as ONE edit. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

export function iou(a: NormBox, b: NormBox): number {
  const l = Math.max(a.left, b.left), t = Math.max(a.top, b.top);
  const r = Math.min(a.left + a.width, b.left + b.width);
  const bt = Math.min(a.top + a.height, b.top + b.height);
  if (r <= l || bt <= t) return 0;
  const inter = (r - l) * (bt - t);
  const union = a.width * a.height + b.width * b.height - inter;
  return union > 0 ? inter / union : 0;
}

export function unionBox(boxes: NormBox[]): NormBox {
  const l = Math.min(...boxes.map((b) => b.left));
  const t = Math.min(...boxes.map((b) => b.top));
  const r = Math.max(...boxes.map((b) => b.left + b.width));
  const bt = Math.max(...boxes.map((b) => b.top + b.height));
  return { left: l, top: t, width: r - l, height: bt - t };
}

const wordBox = (w: OcrWord): NormBox => ({ left: w.left, top: w.top, width: w.width, height: w.height });
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// ───────────────────────── Luminance / contrast ─────────────────────────
const LIN = new Float64Array(256);
for (let i = 0; i < 256; i++) {
  const s = i / 255;
  LIN[i] = s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** Fast relative-luminance lookup over a flat RGBA array (e.g. ImageData.data). */
export function makeLumAccessor(data: ArrayLike<number>, width: number, height: number) {
  return (x: number, y: number): number => {
    const xi = x < 0 ? 0 : x >= width ? width - 1 : Math.floor(x);
    const yi = y < 0 ? 0 : y >= height ? height - 1 : Math.floor(y);
    const i = (yi * width + xi) * 4;
    return 0.2126 * LIN[data[i]] + 0.7152 * LIN[data[i + 1]] + 0.0722 * LIN[data[i + 2]];
  };
}

export function contrastRatio(l1: number, l2: number): number {
  const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

export interface ContrastMeasure { ratio: number; inkLum: number; bgLum: number; busy: number; uniformBg: boolean }

/**
 * Measures the real text/background contrast of one word box.
 * - background: median of a ring above/below the word when that ring is uniform,
 *   otherwise the median of the box itself (ink is the minority of pixels);
 * - ink: the pixel at the 96th percentile of distance-from-background (robust to anti-aliasing);
 * - busy: spread of the non-ink pixels (high = text over a photo / texture).
 */
export function measureTextContrast(
  lumAt: (x: number, y: number) => number,
  box: { x: number; y: number; w: number; h: number },
  _imgW?: number,
  _imgH?: number
): ContrastMeasure | null {
  const inner: number[] = [];
  // Sample densely (≈3000 points max): sparse grids alias against thin strokes and miss the ink entirely.
  const step = Math.max(1, Math.floor(Math.sqrt((box.w * box.h) / 3000)));
  for (let y = box.y + 1; y < box.y + box.h - 1; y += step)
    for (let x = box.x + 1; x < box.x + box.w - 1; x += step) inner.push(lumAt(x, y));
  if (inner.length < 8) return null;

  const pad = Math.max(3, Math.round(box.h * 0.3));
  const ring: number[] = [];
  const sx = Math.max(1, Math.floor(box.w / 20));
  for (let x = box.x; x < box.x + box.w; x += sx) {
    ring.push(lumAt(x, box.y - pad));
    ring.push(lumAt(x, box.y + box.h + pad - 1));
  }
  const ringUniform = ring.length >= 10 && stddev(ring) < 0.09;
  const bg = ringUniform ? median(ring) : median(inner);

  const pairs = inner.map((v) => ({ v, d: Math.abs(v - bg) })).sort((a, b) => b.d - a.d);
  const ink = pairs[Math.min(pairs.length - 1, Math.floor(pairs.length * 0.04))].v;
  const bgOnly = pairs.slice(Math.floor(pairs.length * 0.3)).map((p) => p.v);

  return {
    ratio: contrastRatio(ink, bg),
    inkLum: ink,
    bgLum: bg,
    busy: stddev(bgOnly),
    uniformBg: ringUniform,
  };
}

export function classifyContrast(
  ratio: number,
  pixH: number,
  imgH: number,
  busy = 0,
  isBoldOrUpper = false
): { severity: "warning" | "suggestion"; required: number; hedged: boolean } | null {
  // WCAG defines large text as 18pt (~24px) or bold/14pt (~18.66px).
  // In images, text is large if it is bold/uppercase, or has font size >= 30px (or >= 3.5% of canvas height).
  const large = isBoldOrUpper || (imgH > 0 ? pixH >= Math.max(30, 0.035 * imgH) : pixH >= 30);
  const required = large ? 3.0 : 4.5;

  // Real-world raster tolerance:
  // Sub-pixel anti-aliasing and JPEG compression lower measured ratios by 10-15%.
  // In commercial designs, text with ratio >= 3.8:1 (or >= 2.8:1 for large/bold/uppercase) is fully readable.
  const effectiveMin = large ? 2.8 : 3.8;
  if (ratio >= effectiveMin) return null;

  if (ratio < 2.8) return { severity: "warning", required, hedged: busy > 0.15 };
  return { severity: "suggestion", required, hedged: true };
}

// ───────────────────────── Text layout: size, overlap, alignment, spacing ─────────────────────────
export function analyzeTextLayout(lines: OcrLine[], imgW: number, imgH: number): QaIssueDraft[] {
  const issues: QaIssueDraft[] = [];
  const L = lines.filter(
    (l) => l.confidence >= 70 && l.pixelH >= 8 && l.pixelW >= 20 && /[A-Za-z]{3}/.test(l.text)
  );
  if (!L.length) return issues;
  const ref = Math.sqrt(imgW * imgH);

  // 1. Minimum readable size
  const small = L.filter((l) => l.pixelH < 0.0105 * ref).sort((a, b) => a.pixelH - b.pixelH);
  if (small.length) {
    const s = small[0];
    issues.push({
      category: "typography", severity: "suggestion", isHedged: true,
      qaRole: "Typography & Hierarchy",
      title: "Very small text may be hard to read",
      description: `${small.length} line${small.length > 1 ? "s" : ""} of text (e.g. "${s.text.slice(0, 40)}") look very small relative to the canvas.`,
      impact: "Small copy becomes illegible on phones and when the design is scaled down or printed small.",
      specDetail: `Smallest line is ~${Math.round(s.pixelH)}px tall on a ${imgW}×${imgH}px canvas (${((s.pixelH / ref) * 100).toFixed(2)}% of canvas size; below ~1.05%).`,
      whyItMatters: "Unreadable key information (terms, prices, contacts) defeats the purpose of the design.",
      originalText: s.text,
      suggestedFix: "Increase the font size, or confirm this is intentional fine print.",
      bbox: wordBox(s),
    });
  }

  // 2. Overlapping text lines
  let overlapReports = 0;
  for (let i = 0; i < L.length && overlapReports < 2; i++) {
    for (let j = i + 1; j < L.length && overlapReports < 2; j++) {
      const a = L[i], b = L[j];
      const ix = Math.min(a.pixelX + a.pixelW, b.pixelX + b.pixelW) - Math.max(a.pixelX, b.pixelX);
      const iy = Math.min(a.pixelY + a.pixelH, b.pixelY + b.pixelH) - Math.max(a.pixelY, b.pixelY);
      if (ix <= 0 || iy <= 0) continue;
      const minArea = Math.min(a.pixelW * a.pixelH, b.pixelW * b.pixelH);
      if ((ix * iy) / minArea < 0.3) continue;
      overlapReports++;
      issues.push({
        category: "layout", severity: "warning", isHedged: true,
        qaRole: "Layout & Alignment",
        title: "Text elements appear to overlap",
        description: `"${a.text.slice(0, 30)}" and "${b.text.slice(0, 30)}" overlap each other.`,
        impact: "Overlapping copy is hard to read and looks like a layout mistake.",
        specDetail: `Overlap covers ~${Math.round(((ix * iy) / minArea) * 100)}% of the smaller text box.`,
        whyItMatters: "Collisions between text blocks are one of the most visible polish defects.",
        suggestedFix: "Move one of the text blocks or reduce its size so they no longer collide.",
        bbox: unionBox([wordBox(a), wordBox(b)]),
      });
    }
  }

  // 3. Group lines into text blocks (stacked, similar height, horizontally overlapping)
  const parent = L.map((_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  for (let i = 0; i < L.length; i++) {
    for (let j = 0; j < L.length; j++) {
      if (i === j) continue;
      const a = L[i], b = L[j];
      if (a.pixelY + a.pixelH / 2 >= b.pixelY + b.pixelH / 2) continue; // a must be above b
      const ratio = a.pixelH / b.pixelH;
      if (ratio < 0.65 || ratio > 1.55) continue;
      const h = (a.pixelH + b.pixelH) / 2;
      const gap = b.pixelY - (a.pixelY + a.pixelH);
      if (gap < -0.25 * h || gap > 1.4 * h) continue;
      const ox = Math.min(a.pixelX + a.pixelW, b.pixelX + b.pixelW) - Math.max(a.pixelX, b.pixelX);
      if (ox < 0.15 * Math.min(a.pixelW, b.pixelW)) continue;
      parent[find(i)] = find(j);
    }
  }
  const blocks = new Map<number, OcrLine[]>();
  L.forEach((l, i) => {
    const r = find(i);
    blocks.set(r, [...(blocks.get(r) ?? []), l]);
  });

  const minDelta = Math.max(2, 0.0035 * imgW);
  const maxDelta = 0.02 * imgW;
  let alignReports = 0, spacingReports = 0;

  for (const block of blocks.values()) {
    const sorted = [...block].sort((a, b) => a.pixelY - b.pixelY);

    // 3a. Alignment: a clear left/center/right convention with a few near-miss lines
    if (sorted.length >= 3 && alignReports < 3) {
      const refs: { name: string; get: (l: OcrLine) => number }[] = [
        { name: "left", get: (l) => l.pixelX },
        { name: "center", get: (l) => l.pixelX + l.pixelW / 2 },
        { name: "right", get: (l) => l.pixelX + l.pixelW },
      ];
      let best: { name: string; med: number; get: (l: OcrLine) => number; aligned: number } | null = null;
      for (const r of refs) {
        const med = median(sorted.map(r.get));
        const aligned = sorted.filter((l) => Math.abs(r.get(l) - med) < minDelta).length;
        if (!best || aligned > best.aligned) best = { ...r, med, aligned };
      }
      if (best && best.aligned >= Math.ceil(sorted.length * 0.5)) {
        const offenders = sorted.filter((l) => {
          const d = Math.abs(best!.get(l) - best!.med);
          return d >= minDelta && d <= maxDelta;
        });
        if (offenders.length) {
          alignReports++;
          const worst = Math.max(...offenders.map((l) => Math.abs(best!.get(l) - best!.med)));
          issues.push({
            category: "layout", severity: "suggestion", isHedged: true,
            qaRole: "Layout & Alignment",
            title: "Text lines look slightly misaligned",
            description: `${offenders.length} of ${sorted.length} lines in this text block are off the ${best.name} alignment of the others (e.g. "${offenders[0].text.slice(0, 40)}").`,
            impact: "Near-miss alignment looks accidental and makes the layout feel unpolished.",
            specDetail: `Largest ${best.name}-edge offset ≈ ${Math.round(worst)}px on a ${imgW}px-wide canvas.`,
            whyItMatters: "Consistent alignment is a core signal of professional layout.",
            originalText: offenders[0].text,
            suggestedFix: `Snap these lines to the same ${best.name} edge (use guides / smart-align in your design tool).`,
            bbox: unionBox(offenders.map(wordBox)),
          });
        }
      }
    }

    // 3b. Even line spacing
    if (sorted.length >= 4 && spacingReports < 2) {
      const hs = sorted.map((l) => l.pixelH);
      if (Math.max(...hs) / Math.min(...hs) < 1.4) {
        const cys = sorted.map((l) => l.pixelY + l.pixelH / 2);
        const pitches = cys.slice(1).map((c, i) => c - cys[i]);
        const mp = median(pitches);
        const avgH = hs.reduce((a, b) => a + b, 0) / hs.length;
        const bad = pitches
          .map((p, i) => ({ p, i }))
          .filter(({ p }) => Math.abs(p - mp) > Math.max(0.35 * mp, 0.5 * avgH));
        if (mp > 0 && bad.length) {
          spacingReports++;
          const first = bad[0].i;
          issues.push({
            category: "layout", severity: "suggestion", isHedged: true,
            qaRole: "Layout & Alignment",
            title: "Uneven spacing between text lines",
            description: `Line spacing in this block is inconsistent (typical ~${Math.round(mp)}px, but ${bad.length} gap${bad.length > 1 ? "s differ" : " differs"} noticeably).`,
            impact: "Uneven leading makes paragraphs look cramped in one spot and loose in another.",
            specDetail: `Median line pitch ${Math.round(mp)}px; worst deviation ${Math.round(Math.max(...bad.map(({ p }) => Math.abs(p - mp))))}px.`,
            whyItMatters: "Consistent vertical rhythm reads as deliberate, professional typography.",
            suggestedFix: "Use one line-height for the block, or confirm the larger gap is an intentional paragraph break.",
            bbox: unionBox([wordBox(sorted[first]), wordBox(sorted[first + 1])]),
          });
        }
      }
    }
  }
  return issues;
}

// ───────────────────────── Margins / safe zone ─────────────────────────
export interface MarginConfig { danger: number; safe: number }
export function marginConfig(mode?: string | null): MarginConfig {
  return mode === "print" ? { danger: 0.015, safe: 0.04 } : { danger: 0.012, safe: 0.035 };
}

export function analyzeTextMargins(
  words: OcrWord[], cfg: MarginConfig
): { issues: QaIssueDraft[]; edgesHit: Set<string> } {
  const issues: QaIssueDraft[] = [];
  const edgesHit = new Set<string>();
  const danger: { w: OcrWord; edge: string }[] = [];
  const safe: { w: OcrWord; edge: string; d: number }[] = [];

  for (const w of words) {
    if (w.pixelH < 12 || w.confidence < 70) continue;
    const d = [
      { edge: "left edge", v: w.left },
      { edge: "right edge", v: 1 - (w.left + w.width) },
      { edge: "top edge", v: w.top },
      { edge: "bottom edge", v: 1 - (w.top + w.height) },
    ].sort((a, b) => a.v - b.v)[0];
    if (d.v < cfg.danger) { danger.push({ w, edge: d.edge }); edgesHit.add(d.edge); }
    else if (d.v < cfg.safe) safe.push({ w, edge: d.edge, d: d.v });
  }

  danger.slice(0, 3).forEach(({ w, edge }) => {
    issues.push({
      category: "margin", severity: "warning",
      title: "Safe-Zone Margin Bleed",
      description: `Text "${w.text}" is placed dangerously close to the ${edge}.`,
      impact: "Text placed right against the outer border risks being clipped by print trimming or screen bezels.",
      specDetail: `Within ${Math.round(cfg.danger * 1000) / 10}% of the ${edge} (danger boundary).`,
      whyItMatters: "Commercial print trimming drift is typically 2–3mm; copy inside that zone gets cut off.",
      originalText: w.text,
      suggestedFix: "Move the text inward to restore a safe breathing margin.",
      bbox: wordBox(w),
    });
  });
  if (danger.length > 3) {
    issues.push({
      category: "margin", severity: "warning",
      title: "More text touching the edge",
      description: `${danger.length - 3} more text element${danger.length - 3 > 1 ? "s are" : " is"} inside the edge danger zone.`,
      specDetail: `Danger zone = ${Math.round(cfg.danger * 1000) / 10}% from each edge.`,
      suggestedFix: "Pull all copy inside the safe area.",
      bbox: wordBox(danger[3].w),
    });
  }
  if (safe.length) {
    const closest = [...safe].sort((a, b) => a.d - b.d)[0];
    issues.push({
      category: "margin", severity: "suggestion", isHedged: true,
      title: "Text sits inside the recommended safe margin",
      description: `${safe.length} text element${safe.length > 1 ? "s sit" : " sits"} within ${Math.round(cfg.safe * 1000) / 10}% of the canvas edge (closest: "${closest.w.text}" at the ${closest.edge}).`,
      impact: "Social apps overlay UI on the edges and printers trim variably; tight margins risk clipping.",
      specDetail: `Recommended safe margin ≥ ${Math.round(cfg.safe * 1000) / 10}% (hard danger line ${Math.round(cfg.danger * 1000) / 10}%).`,
      whyItMatters: "Comfortable margins keep important copy visible everywhere.",
      originalText: closest.w.text,
      suggestedFix: "Add a little more padding if this isn't an intentional edge-to-edge layout.",
      bbox: wordBox(closest.w),
    });
  }
  return { issues, edgesHit };
}

/** Non-text artwork (logos, buttons, shapes) drawn into the edge danger zone of an otherwise plain page. */
export function detectEdgeContent(
  lumAt: (x: number, y: number) => number,
  imgW: number, imgH: number, dangerFrac: number, skipEdges: Set<string>
): QaIssueDraft[] {
  const dangerPx = Math.round(dangerFrac * Math.min(imgW, imgH));
  if (dangerPx <= 6 || imgW < 100 || imgH < 100) return [];

  const frame: number[] = [];
  for (let x = 0; x < imgW; x += 8) { frame.push(lumAt(x, 1), lumAt(x, imgH - 2)); }
  for (let y = 0; y < imgH; y += 8) { frame.push(lumAt(1, y), lumAt(imgW - 2, y)); }
  if (stddev(frame) > 0.04) return []; // full-bleed photo/gradient: nothing meaningful to say
  const bg = median(frame);

  const edges: { name: string; pts: () => number[]; box: NormBox }[] = [
    { name: "left edge", box: { left: 0, top: 0, width: dangerFrac * (Math.min(imgW, imgH) / imgW), height: 1 },
      pts: () => { const o: number[] = []; for (let y = 0; y < imgH; y += 4) for (let x = 4; x < dangerPx; x += 3) o.push(lumAt(x, y)); return o; } },
    { name: "right edge", box: { left: 1 - dangerFrac * (Math.min(imgW, imgH) / imgW), top: 0, width: dangerFrac * (Math.min(imgW, imgH) / imgW), height: 1 },
      pts: () => { const o: number[] = []; for (let y = 0; y < imgH; y += 4) for (let x = imgW - dangerPx; x < imgW - 4; x += 3) o.push(lumAt(x, y)); return o; } },
    { name: "top edge", box: { left: 0, top: 0, width: 1, height: dangerFrac * (Math.min(imgW, imgH) / imgH) },
      pts: () => { const o: number[] = []; for (let x = 0; x < imgW; x += 4) for (let y = 4; y < dangerPx; y += 3) o.push(lumAt(x, y)); return o; } },
    { name: "bottom edge", box: { left: 0, top: 1 - dangerFrac * (Math.min(imgW, imgH) / imgH), width: 1, height: dangerFrac * (Math.min(imgW, imgH) / imgH) },
      pts: () => { const o: number[] = []; for (let x = 0; x < imgW; x += 4) for (let y = imgH - dangerPx; y < imgH - 4; y += 3) o.push(lumAt(x, y)); return o; } },
  ];

  const out: QaIssueDraft[] = [];
  for (const e of edges) {
    if (skipEdges.has(e.name)) continue;
    const pts = e.pts();
    const hits = pts.filter((v) => Math.abs(v - bg) > 0.2).length;
    if (hits >= 3 && hits / Math.max(1, pts.length) > 0.01) {
      out.push({
        category: "margin", severity: "suggestion", isHedged: true,
        title: "Artwork element close to the edge",
        description: `Something (a logo, shape or image) appears to be drawn very close to the ${e.name} of an otherwise plain canvas.`,
        impact: "Elements hugging the border can be trimmed in print or covered by app UI.",
        specDetail: `Content detected inside the outer ${Math.round(dangerFrac * 1000) / 10}% edge band.`,
        whyItMatters: "Keeping artwork inside the safe area avoids accidental cropping.",
        suggestedFix: "Check whether this is an intentional bleed element; otherwise move it inward.",
        bbox: e.box,
      });
    }
  }
  return out;
}

// ───────────────────────── Spelling ─────────────────────────
export interface SpellVerdict { severity: "warning" | "suggestion"; hedged: boolean; suggestion?: string }

export function evaluateSpelling(
  rawSub: string, us: SpellChecker, gb: SpellChecker, brands: Set<string>
): SpellVerdict | null {
  const sub = rawSub.replace(/[’‘]/g, "'");
  const cleaned = sub.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, "");
  if (cleaned.length < 3) return null;
  if (us.correct(cleaned) || gb.correct(cleaned) || brands.has(cleaned)) return null;

  const isAllCaps = sub === sub.toUpperCase() && /[A-Z]/.test(sub);
  const hasInnerCaps = /[A-Z]/.test(sub.slice(1)) && !isAllCaps;
  if (hasInnerCaps) return null; // CamelCase brands: iPhone, YouTube, eBay…

  const isTitle = /^[A-Z][a-z']+$/.test(sub);
  const suggestion = us.suggest(cleaned)[0] ?? gb.suggest(cleaned)[0];
  const dist = suggestion ? levenshtein(cleaned, suggestion.toLowerCase()) : 99;

  if (isAllCaps) {
    // Short all-caps tokens are almost always acronyms; longer ones are headlines.
    if (cleaned.length < 5) return null;
    if (suggestion && dist === 1) return { severity: "suggestion", hedged: true, suggestion };
    return null;
  }
  if (isTitle) {
    // Headlines are Title Case; only flag near-miss typos of real words ("Recieve"), not names.
    if (cleaned.length >= 5 && suggestion && dist === 1 && Math.abs(suggestion.length - cleaned.length) <= 1) {
      return { severity: "suggestion", hedged: true, suggestion };
    }
    return null;
  }
  if (suggestion && dist <= 2) {
    return { severity: "warning", hedged: false, suggestion };
  }
  return null;
}

// ───────────────────────── Deterministic fact checks (price / date) ─────────────────────────
export interface PriceClaim {
  text?: string | null; originalPrice?: number | null; salePrice?: number | null;
  claimedDiscountPercent?: number | null; box_2d?: number[] | null;
}
export interface DateClaim {
  text?: string | null; weekday?: string | null; day?: number | null; month?: number | null;
  year?: number | null; box_2d?: number[] | null;
}
export type Locator = (text?: string | null, box2d?: number[] | null) => NormBox;

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v.replace(/[^0-9.\-]/g, "")) : (v as number);
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};

export function verifyPriceClaims(claims: PriceClaim[], locate: Locator): QaIssueDraft[] {
  const out: QaIssueDraft[] = [];
  for (const c of claims) {
    const orig = num(c.originalPrice), sale = num(c.salePrice), claimed = num(c.claimedDiscountPercent);
    if (orig === null || sale === null || orig <= 0 || sale < 0) continue;
    const bbox = locate(c.text, c.box_2d);
    if (sale >= orig) {
      out.push({
        category: "data_integrity", severity: "critical", isHedged: false,
        qaRole: "Data Integrity QA",
        title: "Sale price isn't lower than the original price",
        description: `The offer shows an original price of ${orig} and a sale price of ${sale}.`,
        impact: "Customers will see a 'deal' that isn't one, which creates complaints and erodes trust.",
        specDetail: `Original ${orig}, sale ${sale}.`,
        whyItMatters: "Pricing errors in published creative can force a reprint or a public correction.",
        originalText: c.text ?? undefined,
        suggestedFix: "Check which price is correct and update the design.",
        bbox,
      });
      continue;
    }
    if (claimed === null) continue;
    const actual = ((orig - sale) / orig) * 100;
    if (Math.abs(actual - claimed) > 1.5) {
      out.push({
        category: "data_integrity", severity: "critical", isHedged: false,
        qaRole: "Data Integrity QA",
        title: "Discount percentage doesn't match the prices",
        description: `The design claims ${claimed}% off, but the prices shown work out to ${actual.toFixed(1)}% off.`,
        impact: "Customers will notice the mismatch at checkout, causing friction and complaints.",
        specDetail: `(${orig} − ${sale}) ÷ ${orig} = ${actual.toFixed(1)}%, not ${claimed}%.`,
        whyItMatters: "Misleading discount claims are a financial and legal risk.",
        originalText: c.text ?? undefined,
        suggestedFix: `Change the badge to about ${Math.round(actual)}% off, or correct the prices.`,
        bbox,
      });
    }
  }
  return out;
}

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function verifyDateClaims(claims: DateClaim[], locate: Locator, now: Date = new Date()): QaIssueDraft[] {
  const out: QaIssueDraft[] = [];
  const thisYear = now.getUTCFullYear();
  for (const c of claims) {
    const day = num(c.day), month = num(c.month), year = num(c.year);
    if (!day || !month) continue;
    const wdIdx = c.weekday ? WEEKDAYS.indexOf(c.weekday.trim().toLowerCase().slice(0, 3)) : -1;
    const years = year ? [year] : [thisYear, thisYear + 1];
    const bbox = locate(c.text, c.box_2d);
    const label = `${day} ${MONTH_NAMES[month - 1] ?? month}`;

    const valid = month >= 1 && month <= 12
      ? years.filter((y) => {
          const d = new Date(Date.UTC(y, month - 1, day));
          return d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
        })
      : [];
    if (!valid.length) {
      out.push({
        category: "data_integrity", severity: "critical", isHedged: false,
        qaRole: "Data Integrity QA",
        title: "Date doesn't exist on the calendar",
        description: `"${c.text ?? label}" isn't a valid calendar date${year ? ` in ${year}` : ` in ${years.join(" or ")}`}.`,
        impact: "Readers will be confused about when the event or offer actually happens.",
        specDetail: `${label} does not exist in ${years.join(" / ")}.`,
        whyItMatters: "Wrong dates are among the costliest errors to fix after printing.",
        originalText: c.text ?? undefined,
        suggestedFix: "Verify the intended date.",
        bbox,
      });
      continue;
    }
    if (wdIdx >= 0 && !valid.some((y) => new Date(Date.UTC(y, month - 1, day)).getUTCDay() === wdIdx)) {
      const actual = valid.map((y) => `${WEEKDAY_NAMES[new Date(Date.UTC(y, month - 1, day)).getUTCDay()]} in ${y}`).join(", ");
      out.push({
        category: "data_integrity", severity: "critical", isHedged: false,
        qaRole: "Data Integrity QA",
        title: "Day of the week doesn't match the date",
        description: `"${c.text ?? ""}" pairs ${WEEKDAY_NAMES[wdIdx]} with ${label}, but that combination doesn't occur.`,
        impact: "Attendees or customers may show up on the wrong day.",
        specDetail: `${label} is ${actual}.`,
        whyItMatters: "A wrong weekday is a classic, expensive reprint error.",
        originalText: c.text ?? undefined,
        suggestedFix: "Correct either the weekday or the date number.",
        bbox,
      });
    }
  }
  return out;
}

// ───────────────────────── OCR helpers ─────────────────────────
export function mergeOcrWords(primary: OcrWord[], secondary: OcrWord[]): OcrWord[] {
  const out = [...primary];
  for (const s of secondary) {
    let dupIdx = -1;
    for (let i = 0; i < out.length; i++) {
      if (iou(wordBox(out[i]), wordBox(s)) > 0.4) { dupIdx = i; break; }
    }
    if (dupIdx === -1) out.push(s);
    else if (s.confidence > out[dupIdx].confidence + 8) out[dupIdx] = s;
  }
  return out;
}

/** Finds the OCR box for a (possibly multi-word) text snippet reported by the AI. */
export function findOcrBox(words: OcrWord[], text?: string | null): NormBox | null {
  if (!text) return null;
  const target = text.split(/\s+/).map(norm).filter(Boolean);
  if (!target.length) return null;
  const toks = words.map((w) => norm(w.text));
  for (let i = 0; i + target.length <= words.length; i++) {
    let ok = true;
    for (let k = 0; k < target.length; k++) {
      if (toks[i + k] !== target[k]) { ok = false; break; }
    }
    if (!ok) continue;
    const boxes = words.slice(i, i + target.length).map(wordBox);
    const u = unionBox(boxes);
    if (u.height < 0.15) return u;
  }
  if (target.length === 1) {
    const w = words.find((x) => norm(x.text) === target[0]);
    if (w) return wordBox(w);
  }
  return null;
}

// ───────────────────────── Gemini helpers ─────────────────────────
const CATS = ["data_integrity", "compliance", "copy", "typography", "layout", "contrast", "artifacts"];
const BOX = { type: "ARRAY", items: { type: "INTEGER" } };

export const GEMINI_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    verdict: { type: "STRING", enum: ["ready", "needs_review", "critical_issues"] },
    verdictTitle: { type: "STRING" },
    verdictSummary: { type: "STRING" },
    positiveHighlights: { type: "ARRAY", items: { type: "STRING" } },
    issues: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          category: { type: "STRING", enum: CATS },
          severity: { type: "STRING", enum: ["critical", "warning", "suggestion"] },
          qaRole: { type: "STRING" }, title: { type: "STRING" }, description: { type: "STRING" },
          impact: { type: "STRING" }, specDetail: { type: "STRING" }, whyItMatters: { type: "STRING" },
          suggestedFix: { type: "STRING" }, originalText: { type: "STRING" },
          isHedged: { type: "BOOLEAN" }, box_2d: BOX,
        },
        required: ["category", "severity", "title", "description"],
      },
    },
    priceClaims: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          text: { type: "STRING" },
          originalPrice: { type: "NUMBER", nullable: true },
          salePrice: { type: "NUMBER", nullable: true },
          claimedDiscountPercent: { type: "NUMBER", nullable: true },
          box_2d: BOX,
        },
      },
    },
    dateClaims: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          text: { type: "STRING" },
          weekday: { type: "STRING", nullable: true },
          day: { type: "INTEGER", nullable: true },
          month: { type: "INTEGER", nullable: true },
          year: { type: "INTEGER", nullable: true },
          box_2d: BOX,
        },
      },
    },
  },
  required: ["verdict", "verdictTitle", "verdictSummary", "issues"],
};

/** Joins all non-"thought" text parts (thinking models return several parts). */
export function extractGeminiText(data: unknown): string {
  const parts = (data as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] })
    ?.candidates?.[0]?.content?.parts ?? [];
  return parts.filter((p) => !p.thought && typeof p.text === "string").map((p) => p.text as string).join("");
}

export function parseJsonLoose(text: string): Record<string, unknown> | null {
  const t = text.trim();
  try { return JSON.parse(t); } catch { /* fall through */ }
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s === -1 || e <= s) return null;
  try { return JSON.parse(t.slice(s, e + 1)); } catch { return null; }
}

export function box2dToNorm(b?: number[] | null): NormBox | null {
  if (!Array.isArray(b) || b.length !== 4 || b.some((v) => typeof v !== "number")) return null;
  const ymin = Math.max(0, Math.min(1000, b[0])), xmin = Math.max(0, Math.min(1000, b[1]));
  const ymax = Math.max(ymin, Math.min(1000, b[2])), xmax = Math.max(xmin, Math.min(1000, b[3]));
  return {
    top: ymin / 1000, left: xmin / 1000,
    width: Math.max(0.04, (xmax - xmin) / 1000), height: Math.max(0.025, (ymax - ymin) / 1000),
  };
}

export function sameFinding(
  a: { category: string; originalText?: string; bbox: NormBox },
  b: { category: string; originalText?: string; bbox: NormBox }
): boolean {
  if (a.category !== b.category) return false;
  const ta = norm(a.originalText ?? ""), tb = norm(b.originalText ?? "");
  if (ta && tb && ta === tb) return true;
  return iou(a.bbox, b.bbox) > 0.3;
}

/** Findings from run A that run B independently reproduced are "confirmed". */
export function crossValidate<T extends { category: string; originalText?: string; bbox: NormBox }>(
  a: T[], b: T[]
): { confirmed: T[]; unconfirmed: T[] } {
  const confirmed: T[] = [], unconfirmed: T[] = [];
  for (const x of a) (b.some((y) => sameFinding(x, y)) ? confirmed : unconfirmed).push(x);
  return { confirmed, unconfirmed };
}
