import type { PlacedItem } from "./layout";

export const MM_TO_PT = 72 / 25.4;

export interface PrintOptions {
  cutLines?: boolean;
  cutMarks?: boolean;
  bleedMm?: number;
  pageBorder?: boolean;
  blackAndWhite?: boolean;
  showRuler?: boolean;
  fillMode?: boolean; // crop to the box instead of stretching
  watermarkText?: string;
}

export interface PreparedImage {
  bytes: Uint8Array;
  mimeType: "image/jpeg" | "image/png";
  w: number;
  h: number;
}

/**
 * Builds a multi-page PDF using @cantoo/pdf-lib.
 * All coordinates and dimensions are in mm.
 */
export async function buildPdf(
  pw: number,
  ph: number,
  pages: PlacedItem[][],
  images: PreparedImage[],
  options: PrintOptions = {}
): Promise<Blob> {
  const { PDFDocument, rgb, degrees, StandardFonts, pushGraphicsState, popGraphicsState, rectangle, clip, endPath } =
    await import("@cantoo/pdf-lib");
  const pdfDoc = await PDFDocument.create();

  let wmFont: any = null;
  if (options.watermarkText && options.watermarkText.trim().length > 0) {
    try {
      wmFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    } catch {
      // Font embedding fallback
    }
  }

  // Ensure viewers print at 100% (Actual Size) rather than shrinking to fit
  try {
    const catalog = pdfDoc.catalog as unknown as {
      getOrCreateViewerPreferences?: () => { setPrintScaling?: (mode: string) => void };
    };
    if (typeof catalog.getOrCreateViewerPreferences === "function") {
      const vp = catalog.getOrCreateViewerPreferences();
      if (typeof vp?.setPrintScaling === "function") {
        vp.setPrintScaling("None");
      }
    }
  } catch {
    // Ignore viewer preference failure if not supported
  }

  // Pre-embed all unique images once into the PDF document
  const embeddedImages = await Promise.all(
    images.map(async (img) => {
      if (img.mimeType === "image/png") {
        return await pdfDoc.embedPng(img.bytes);
      } else {
        return await pdfDoc.embedJpg(img.bytes);
      }
    })
  );

  const pageWpt = pw * MM_TO_PT;
  const pageHpt = ph * MM_TO_PT;

  for (let pi = 0; pi < pages.length; pi++) {
    const pageItems = pages[pi] || [];
    const page = pdfDoc.addPage([pageWpt, pageHpt]);

    // Draw images
    for (const item of pageItems) {
      const embedded = embeddedImages[item.i];
      if (!embedded) continue;

      // In PDF, y = 0 is at the bottom left
      const xPt = item.x * MM_TO_PT;
      const yPt = (ph - item.y - item.h) * MM_TO_PT;
      const wPt = item.w * MM_TO_PT;
      const hPt = item.h * MM_TO_PT;

      const cxPt = item.cx * MM_TO_PT;
      const cyPt = (ph - item.cy - item.ch) * MM_TO_PT;
      const cwPt = item.cw * MM_TO_PT;
      const chPt = item.ch * MM_TO_PT;

      // Strictly clip image inside its allocated cell box so enlarged photos never spill outside
      page.pushOperators(pushGraphicsState(), rectangle(cxPt, cyPt, cwPt, chPt), clip(), endPath());

      const imgRatio = embedded.width / embedded.height;
      if (options.fillMode && Math.abs(imgRatio - wPt / hPt) > 0.01) {
        // Cover and center-crop, clipped to the box (no distortion)
        const scale = Math.max(wPt / embedded.width, hPt / embedded.height);
        const dw = embedded.width * scale;
        const dh = embedded.height * scale;
        page.drawImage(embedded, { x: xPt + (wPt - dw) / 2, y: yPt + (hPt - dh) / 2, width: dw, height: dh });
      } else {
        page.drawImage(embedded, {
          x: xPt,
          y: yPt,
          width: wPt,
          height: hPt,
        });
      }

      page.pushOperators(popGraphicsState());

      // Render diagonal repeated watermark text across card if enabled
      if (wmFont && options.watermarkText && options.watermarkText.trim().length > 0) {
        const text = options.watermarkText.trim().toUpperCase();
        const fontSize = 10;
        page.pushOperators(pushGraphicsState(), rectangle(cxPt, cyPt, cwPt, chPt), clip(), endPath());
        for (let offset = -chPt * 1.5; offset <= cwPt + chPt * 1.5; offset += 38) {
          page.drawText(text, {
            x: cxPt + offset,
            y: cyPt + offset * 0.55,
            size: fontSize,
            font: wmFont,
            color: rgb(0.45, 0.45, 0.45),
            opacity: 0.35,
            rotate: degrees(30),
          });
        }
        page.pushOperators(popGraphicsState());
      }

      // Draw cut lines (border around cell or photo) if enabled
      if (options.cutLines) {
        const cxPt = item.cx * MM_TO_PT;
        const cyPt = (ph - item.cy - item.ch) * MM_TO_PT;
        const cwPt = item.cw * MM_TO_PT;
        const chPt = item.ch * MM_TO_PT;

        page.drawRectangle({
          x: cxPt,
          y: cyPt,
          width: cwPt,
          height: chPt,
          borderWidth: 0.35,
          borderColor: rgb(0.82, 0.84, 0.86), // subtle slate line
        });
      }

      // Draw corner cut marks if enabled
      if (options.cutMarks) {
        const markLen = 3 * MM_TO_PT; // 3mm mark
        const cxPt = item.cx * MM_TO_PT;
        const cyPt = (ph - item.cy - item.ch) * MM_TO_PT;
        const cwPt = item.cw * MM_TO_PT;
        const chPt = item.ch * MM_TO_PT;

        // Top-left
        page.drawLine({
          start: { x: cxPt - markLen, y: cyPt + chPt },
          end: { x: cxPt, y: cyPt + chPt },
          thickness: 0.5,
          color: rgb(0.5, 0.5, 0.5),
        });
        page.drawLine({
          start: { x: cxPt, y: cyPt + chPt },
          end: { x: cxPt, y: cyPt + chPt + markLen },
          thickness: 0.5,
          color: rgb(0.5, 0.5, 0.5),
        });

        // Top-right
        page.drawLine({
          start: { x: cxPt + cwPt, y: cyPt + chPt },
          end: { x: cxPt + cwPt + markLen, y: cyPt + chPt },
          thickness: 0.5,
          color: rgb(0.5, 0.5, 0.5),
        });
        page.drawLine({
          start: { x: cxPt + cwPt, y: cyPt + chPt },
          end: { x: cxPt + cwPt, y: cyPt + chPt + markLen },
          thickness: 0.5,
          color: rgb(0.5, 0.5, 0.5),
        });

        // Bottom-left
        page.drawLine({
          start: { x: cxPt - markLen, y: cyPt },
          end: { x: cxPt, y: cyPt },
          thickness: 0.5,
          color: rgb(0.5, 0.5, 0.5),
        });
        page.drawLine({
          start: { x: cxPt, y: cyPt - markLen },
          end: { x: cxPt, y: cyPt },
          thickness: 0.5,
          color: rgb(0.5, 0.5, 0.5),
        });

        // Bottom-right
        page.drawLine({
          start: { x: cxPt + cwPt, y: cyPt },
          end: { x: cxPt + cwPt + markLen, y: cyPt },
          thickness: 0.5,
          color: rgb(0.5, 0.5, 0.5),
        });
        page.drawLine({
          start: { x: cxPt + cwPt, y: cyPt - markLen },
          end: { x: cxPt + cwPt, y: cyPt },
          thickness: 0.5,
          color: rgb(0.5, 0.5, 0.5),
        });
      }
    }

    // Page border if enabled
    if (options.pageBorder) {
      const marginPt = 3 * MM_TO_PT;
      page.drawRectangle({
        x: marginPt,
        y: marginPt,
        width: pageWpt - 2 * marginPt,
        height: pageHpt - 2 * marginPt,
        borderWidth: 0.5,
        borderColor: rgb(0.7, 0.7, 0.7),
      });
    }

    // 100mm ruler test calibration mark at the bottom edge
    if (options.showRuler) {
      const rulerX = (pageWpt - 100 * MM_TO_PT) / 2;
      const rulerY = 5 * MM_TO_PT;
      page.drawLine({
        start: { x: rulerX, y: rulerY },
        end: { x: rulerX + 100 * MM_TO_PT, y: rulerY },
        thickness: 0.75,
        color: rgb(0.2, 0.2, 0.2),
      });
      // End ticks
      page.drawLine({
        start: { x: rulerX, y: rulerY - 2 * MM_TO_PT },
        end: { x: rulerX, y: rulerY + 2 * MM_TO_PT },
        thickness: 0.75,
        color: rgb(0.2, 0.2, 0.2),
      });
      page.drawLine({
        start: { x: rulerX + 100 * MM_TO_PT, y: rulerY - 2 * MM_TO_PT },
        end: { x: rulerX + 100 * MM_TO_PT, y: rulerY + 2 * MM_TO_PT },
        thickness: 0.75,
        color: rgb(0.2, 0.2, 0.2),
      });
    }
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
}

/**
 * Dependency-free fallback PDF writer from reference implementation.
 */
export function buildFallbackPdf(
  pw: number,
  ph: number,
  pages: PlacedItem[][],
  imgs: { bytes: Uint8Array; w: number; h: number }[]
): Blob {
  const P = MM_TO_PT;
  const E = new TextEncoder();
  const parts: Uint8Array[] = [];
  const off: number[] = [];
  let len = 0;

  const add = (d: string | Uint8Array) => {
    const b = typeof d === "string" ? E.encode(d) : d;
    parts.push(b);
    len += b.length;
  };

  const n = imgs.length;
  const f = (v: number) => (v * P).toFixed(2);

  add("%PDF-1.4\n");
  off[1] = len;
  add("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  off[2] = len;
  add(
    `2 0 obj\n<< /Type /Pages /Count ${pages.length} /Kids [${pages
      .map((_, i) => 3 + n + i * 2 + " 0 R")
      .join(" ")}] >>\nendobj\n`
  );

  imgs.forEach((m, i) => {
    off[3 + i] = len;
    add(
      `${3 + i} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${m.w} /Height ${
        m.h
      } /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${
        m.bytes.length
      } >>\nstream\n`
    );
    add(m.bytes);
    add("\nendstream\nendobj\n");
  });

  pages.forEach((pl, pi) => {
    const po = 3 + n + pi * 2;
    const co = po + 1;
    const used = [...new Set(pl.map((q) => q.i))];
    const cs = pl
      .map(
        (q) =>
          `q ${f(q.w)} 0 0 ${f(q.h)} ${f(q.x)} ${f(ph - q.y - q.h)} cm /I${
            q.i
          } Do Q`
      )
      .join("\n");

    off[po] = len;
    add(
      `${po} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(pw)} ${f(
        ph
      )}] /Resources << /XObject << ${used
        .map((u) => `/I${u} ${3 + u} 0 R`)
        .join(" ")} >> >> /Contents ${co} 0 R >>\nendobj\n`
    );

    off[co] = len;
    add(`${co} 0 obj\n<< /Length ${cs.length} >>\nstream\n${cs}\nendstream\nendobj\n`);
  });

  const N = 3 + n + pages.length * 2;
  const x = len;
  add(
    `xref\n0 ${N}\n0000000000 65535 f \n` +
      off
        .slice(1, N)
        .map((o) => String(o).padStart(10, "0") + " 00000 n \n")
        .join("")
  );
  add(`trailer\n<< /Size ${N} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF`);

  return new Blob(parts as unknown as BlobPart[], { type: "application/pdf" });
}
