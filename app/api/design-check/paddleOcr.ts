import { PaddleOcrService, V6_SMALL_MODEL } from "ppu-paddle-ocr";
import type { OcrWord } from "./analysis";

let paddleServicePromise: Promise<PaddleOcrService> | null = null;

export async function getPaddleOcrService(): Promise<PaddleOcrService> {
  if (!paddleServicePromise) {
    paddleServicePromise = (async () => {
      const service = new PaddleOcrService({
        model: V6_SMALL_MODEL,
        debugging: { debug: false, verbose: false },
      });
      await service.initialize();
      return service;
    })().catch((err) => {
      paddleServicePromise = null;
      throw err;
    });
  }
  return paddleServicePromise;
}

export async function runPaddleOcr(
  imageBuffer: Buffer,
  width: number,
  height: number
): Promise<{ words: OcrWord[]; lines: OcrWord[]; engine: string }> {
  const service = await getPaddleOcrService();
  const arrayBuffer = (imageBuffer.buffer.slice(
    imageBuffer.byteOffset,
    imageBuffer.byteOffset + imageBuffer.byteLength
  ) as ArrayBuffer);

  const res = await service.recognize(arrayBuffer);
  const words: OcrWord[] = [];
  const lines: OcrWord[] = [];

  const rawLines = res.lines || [];
  for (const lineGroup of rawLines) {
    for (const item of lineGroup) {
      const lineText = (item.text || "").trim();
      if (!lineText) continue;

      const box = item.box || { x: 0, y: 0, width: 0, height: 0 };
      const conf = typeof item.confidence === "number" ? Math.round(item.confidence * 100) : 95;

      const linePxX = Math.max(0, box.x);
      const linePxY = Math.max(0, box.y);
      const linePxW = Math.max(0, box.width);
      const linePxH = Math.max(0, box.height);

      lines.push({
        text: lineText,
        confidence: conf,
        left: Math.min(1, linePxX / width),
        top: Math.min(1, linePxY / height),
        width: Math.min(1, linePxW / width),
        height: Math.min(1, linePxH / height),
        pixelX: linePxX,
        pixelY: linePxY,
        pixelW: linePxW,
        pixelH: linePxH,
      });

      // Segment line into words with approximate word bounding boxes
      const tokens = lineText.split(/\s+/).filter(Boolean);
      const totalChars = lineText.length || 1;
      let charCursor = 0;

      for (const token of tokens) {
        const tokenIdx = lineText.indexOf(token, charCursor);
        const startRatio = tokenIdx >= 0 ? tokenIdx / totalChars : charCursor / totalChars;
        const widthRatio = token.length / totalChars;

        const wPxX = linePxX + startRatio * linePxW;
        const wPxY = linePxY;
        const wPxW = widthRatio * linePxW;
        const wPxH = linePxH;

        if (wPxW >= 6 && wPxH >= 6) {
          words.push({
            text: token,
            confidence: conf,
            left: Math.min(1, wPxX / width),
            top: Math.min(1, wPxY / height),
            width: Math.min(1, wPxW / width),
            height: Math.min(1, wPxH / height),
            pixelX: wPxX,
            pixelY: wPxY,
            pixelW: wPxW,
            pixelH: wPxH,
          });
        }

        charCursor = tokenIdx >= 0 ? tokenIdx + token.length : charCursor + token.length;
      }
    }
  }

  return { words, lines, engine: "PaddleOCR (PP-OCRv6)" };
}

