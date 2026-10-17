// Card scanner manager: Web Worker management, fallback pure-canvas warp, and coordinate utilities

export interface CornerPoint {
  x: number;
  y: number;
}

export interface DetectResult {
  success: boolean;
  corners?: CornerPoint[];
  blob?: Blob;
  dataUrl?: string;
  width?: number;
  height?: number;
  reason?: string;
}

// Distance helper
export function pointDist(p1: CornerPoint, p2: CornerPoint): number {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

// Sort 4 corners into standard order: [Top-Left, Top-Right, Bottom-Right, Bottom-Left]
export function orderCorners(pts: CornerPoint[]): [CornerPoint, CornerPoint, CornerPoint, CornerPoint] {
  const sorted = [...pts].sort((a, b) => a.y - b.y);
  const top2 = [sorted[0], sorted[1]].sort((a, b) => a.x - b.x);
  const bottom2 = [sorted[2], sorted[3]].sort((a, b) => a.x - b.x);
  return [top2[0], top2[1], bottom2[1], bottom2[0]];
}

/**
 * Pure 2D Canvas bilinear quad warp fallback (subdivision mesh).
 * Used when OpenCV is unavailable or during ultra-smooth real-time drag preview.
 */
export function warpQuadToCanvas(
  sourceImage: CanvasImageSource,
  corners: [CornerPoint, CornerPoint, CornerPoint, CornerPoint],
  targetW: number,
  targetH: number,
  targetCanvas?: HTMLCanvasElement
): HTMLCanvasElement {
  const canvas = targetCanvas || document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, targetW, targetH);

  // Subdivide into an 8x8 grid of triangles
  const GRID = 8;
  const [tl, tr, br, bl] = corners;

  const bilinear = (u: number, v: number): CornerPoint => {
    const x =
      (1 - u) * (1 - v) * tl.x +
      u * (1 - v) * tr.x +
      u * v * br.x +
      (1 - u) * v * bl.x;
    const y =
      (1 - u) * (1 - v) * tl.y +
      u * (1 - v) * tr.y +
      u * v * br.y +
      (1 - u) * v * bl.y;
    return { x, y };
  };

  const drawTriangle = (
    sp0: CornerPoint,
    sp1: CornerPoint,
    sp2: CornerPoint,
    dp0: CornerPoint,
    dp1: CornerPoint,
    dp2: CornerPoint
  ) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(dp0.x, dp0.y);
    ctx.lineTo(dp1.x, dp1.y);
    ctx.lineTo(dp2.x, dp2.y);
    ctx.closePath();
    ctx.clip();

    // Compute affine transform: maps (sp) to (dp)
    const x0 = sp0.x, y0 = sp0.y;
    const x1 = sp1.x, y1 = sp1.y;
    const x2 = sp2.x, y2 = sp2.y;

    const u0 = dp0.x, v0 = dp0.y;
    const u1 = dp1.x, v1 = dp1.y;
    const u2 = dp2.x, v2 = dp2.y;

    const denom = x0 * (y1 - y2) - y0 * (x1 - x2) + (x1 * y2 - x2 * y1);
    if (Math.abs(denom) > 1e-6) {
      const a = (u0 * (y1 - y2) - y0 * (u1 - u2) + (u1 * y2 - u2 * y1)) / denom;
      const b = (v0 * (y1 - y2) - y0 * (v1 - v2) + (v1 * y2 - v2 * y1)) / denom;
      const c = (x0 * (u1 - u2) - u0 * (x1 - x2) + (x1 * u2 - x2 * u1)) / denom;
      const d = (x0 * (v1 - v2) - v0 * (x1 - x2) + (x1 * v2 - x2 * v1)) / denom;
      const e = (x0 * (y1 * u2 - y2 * u1) - y0 * (x1 * u2 - x2 * u1) + u0 * (x1 * y2 - x2 * y1)) / denom;
      const f = (x0 * (y1 * v2 - y2 * v1) - y0 * (x1 * v2 - x2 * v1) + v0 * (x1 * y2 - x2 * y1)) / denom;

      ctx.transform(a, b, c, d, e, f);
      ctx.drawImage(sourceImage, 0, 0);
    }
    ctx.restore();
  };

  const dw = targetW / GRID;
  const dh = targetH / GRID;

  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const u0 = gx / GRID;
      const u1 = (gx + 1) / GRID;
      const v0 = gy / GRID;
      const v1 = (gy + 1) / GRID;

      const spTL = bilinear(u0, v0);
      const spTR = bilinear(u1, v0);
      const spBR = bilinear(u1, v1);
      const spBL = bilinear(u0, v1);

      const dpTL = { x: gx * dw, y: gy * dh };
      const dpTR = { x: (gx + 1) * dw, y: gy * dh };
      const dpBR = { x: (gx + 1) * dw, y: (gy + 1) * dh };
      const dpBL = { x: gx * dw, y: (gy + 1) * dh };

      // Triangle 1: TL, TR, BR
      drawTriangle(spTL, spTR, spBR, dpTL, dpTR, dpBR);
      // Triangle 2: TL, BR, BL
      drawTriangle(spTL, spBR, spBL, dpTL, dpBR, dpBL);
    }
  }

  return canvas;
}

class CardScannerService {
  private worker: Worker | null = null;
  private workerReady: boolean = false;
  private workerInitializing: boolean = false;
  private workerFailed: boolean = false;
  private initCallbacks: Array<(ready: boolean) => void> = [];
  private pendingJobs = new Map<string, (res: any) => void>();

  public get isReady(): boolean {
    return this.workerReady;
  }

  public get hasFailed(): boolean {
    return this.workerFailed;
  }

  public async init(): Promise<boolean> {
    if (this.workerReady) return true;
    if (this.workerFailed) return false;

    if (this.workerInitializing) {
      return new Promise((resolve) => {
        this.initCallbacks.push(resolve);
      });
    }

    if (typeof window === "undefined" || !window.Worker) {
      this.workerFailed = true;
      return false;
    }

    this.workerInitializing = true;

    try {
      this.worker = new Worker("/card-scanner-worker.js");

      const initTimeout = setTimeout(() => {
        if (!this.workerReady) {
          console.warn("Card scanner worker initialization timed out. Using canvas fallback.");
          this.workerFailed = true;
          this.workerInitializing = false;
          this.initCallbacks.forEach((cb) => cb(false));
          this.initCallbacks = [];
        }
      }, 8000);

      this.worker.onmessage = (e) => {
        const { type, id, ...data } = e.data || {};

        if (type === "ready") {
          clearTimeout(initTimeout);
          this.workerReady = true;
          this.workerInitializing = false;
          this.initCallbacks.forEach((cb) => cb(true));
          this.initCallbacks = [];
          return;
        }

        if (type === "error") {
          clearTimeout(initTimeout);
          this.workerFailed = true;
          this.workerInitializing = false;
          this.initCallbacks.forEach((cb) => cb(false));
          this.initCallbacks = [];
          return;
        }

        if (id && this.pendingJobs.has(id)) {
          const resolve = this.pendingJobs.get(id);
          this.pendingJobs.delete(id);
          resolve?.(data);
        }
      };

      this.worker.onerror = (err) => {
        console.warn("Card scanner worker error:", err);
        clearTimeout(initTimeout);
        this.workerFailed = true;
        this.workerInitializing = false;
        this.initCallbacks.forEach((cb) => cb(false));
        this.initCallbacks = [];
      };

      this.worker.postMessage({ type: "init" });

      return new Promise((resolve) => {
        this.initCallbacks.push(resolve);
      });
    } catch (err) {
      console.warn("Could not create scanner worker:", err);
      this.workerFailed = true;
      this.workerInitializing = false;
      return false;
    }
  }

  public async detectAndWarp(
    img: HTMLImageElement,
    targetW = 1200,
    targetH = 757
  ): Promise<DetectResult> {
    const ready = await this.init();

    // Scale to max 800px for edge detection
    const origW = img.naturalWidth || img.width;
    const origH = img.naturalHeight || img.height;
    const maxDim = Math.max(origW, origH);
    const scale = maxDim > 800 ? 800 / maxDim : 1;
    const downW = Math.round(origW * scale);
    const downH = Math.round(origH * scale);

    const downCanvas = document.createElement("canvas");
    downCanvas.width = downW;
    downCanvas.height = downH;
    const downCtx = downCanvas.getContext("2d");
    if (!downCtx) {
      return { success: false, reason: "Canvas context unavailable" };
    }
    downCtx.drawImage(img, 0, 0, downW, downH);
    const downImageData = downCtx.getImageData(0, 0, downW, downH);

    // Keep the transferred image buffer modest for mobile browsers.
    const fullScale = maxDim > 1600 ? 1600 / maxDim : 1;
    const fullW = Math.round(origW * fullScale);
    const fullH = Math.round(origH * fullScale);
    const fullCanvas = document.createElement("canvas");
    fullCanvas.width = fullW;
    fullCanvas.height = fullH;
    const fullCtx = fullCanvas.getContext("2d");
    if (!fullCtx) {
      return { success: false, reason: "Canvas context unavailable" };
    }
    fullCtx.drawImage(img, 0, 0, fullW, fullH);
    const fullImageData = fullCtx.getImageData(0, 0, fullW, fullH);

    if (ready && this.worker) {
      const jobId = "detect_" + Math.random().toString(36).substring(2, 9);
      try {
        const response: any = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            this.pendingJobs.delete(jobId);
            resolve({ success: false, reason: "Worker detection timeout" });
          }, 9000);

          this.pendingJobs.set(jobId, (res) => {
            clearTimeout(timeout);
            resolve(res);
          });

          this.worker?.postMessage(
            {
              type: "detect_and_warp",
              id: jobId,
              imageData: downImageData,
              fullImageData: fullImageData,
              targetW,
              targetH,
            },
            [downImageData.data.buffer, fullImageData.data.buffer]
          );
        });

        if (response && response.success && response.warpedImageData) {
          const outCanvas = document.createElement("canvas");
          outCanvas.width = targetW;
          outCanvas.height = targetH;
          const outCtx = outCanvas.getContext("2d");
          if (outCtx) {
            outCtx.putImageData(response.warpedImageData, 0, 0);
            const blob = await new Promise<Blob | null>((res) =>
              outCanvas.toBlob((b) => res(b), "image/jpeg", 0.96)
            );
            if (blob) {
              const dataUrl = URL.createObjectURL(blob);
              // Scale corners back to original image dimensions
              const scaleBack = 1 / fullScale;
              const mappedCorners = (response.corners as CornerPoint[]).map((c) => ({
                x: c.x * scaleBack,
                y: c.y * scaleBack,
              }));

              return {
                success: true,
                corners: mappedCorners,
                blob,
                dataUrl,
                width: targetW,
                height: targetH,
              };
            }
          }
        }

        return {
          success: false,
          reason: response?.reason || "Detection unsuccessful",
        };
      } catch (err) {
        console.warn("Worker error during detection:", err);
      }
    }

    return {
      success: false,
      reason: "OpenCV scanner unavailable or failed to find edges",
    };
  }

  public async warpWithCorners(
    img: HTMLImageElement,
    corners: [CornerPoint, CornerPoint, CornerPoint, CornerPoint],
    targetW = 1200,
    targetH = 757
  ): Promise<{ blob: Blob; dataUrl: string }> {
    const ready = await this.init();

    const origW = img.naturalWidth || img.width;
    const origH = img.naturalHeight || img.height;
    const maxDim = Math.max(origW, origH);
    const fullScale = maxDim > 1600 ? 1600 / maxDim : 1;
    const fullW = Math.round(origW * fullScale);
    const fullH = Math.round(origH * fullScale);

    const fullCanvas = document.createElement("canvas");
    fullCanvas.width = fullW;
    fullCanvas.height = fullH;
    const fullCtx = fullCanvas.getContext("2d");
    if (fullCtx) {
      fullCtx.drawImage(img, 0, 0, fullW, fullH);
    }

    const scaledCorners: [CornerPoint, CornerPoint, CornerPoint, CornerPoint] = [
      { x: corners[0].x * fullScale, y: corners[0].y * fullScale },
      { x: corners[1].x * fullScale, y: corners[1].y * fullScale },
      { x: corners[2].x * fullScale, y: corners[2].y * fullScale },
      { x: corners[3].x * fullScale, y: corners[3].y * fullScale },
    ];

    if (ready && this.worker && fullCtx) {
      const fullImageData = fullCtx.getImageData(0, 0, fullW, fullH);
      const jobId = "warp_" + Math.random().toString(36).substring(2, 9);
      try {
        const response: any = await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            this.pendingJobs.delete(jobId);
            resolve(null);
          }, 8000);

          this.pendingJobs.set(jobId, (res) => {
            clearTimeout(timeout);
            resolve(res);
          });

          this.worker?.postMessage(
            {
              type: "warp_corners",
              id: jobId,
              imageData: fullImageData,
              corners: scaledCorners,
              targetW,
              targetH,
            },
            [fullImageData.data.buffer]
          );
        });

        if (response && response.success && response.warpedImageData) {
          const outCanvas = document.createElement("canvas");
          outCanvas.width = targetW;
          outCanvas.height = targetH;
          const outCtx = outCanvas.getContext("2d");
          if (outCtx) {
            outCtx.putImageData(response.warpedImageData, 0, 0);
            const blob = await new Promise<Blob | null>((res) =>
              outCanvas.toBlob((b) => res(b), "image/jpeg", 0.96)
            );
            if (blob) {
              return { blob, dataUrl: URL.createObjectURL(blob) };
            }
          }
        }
      } catch (err) {
        console.warn("Worker warp error, falling back to canvas warp:", err);
      }
    }

    // Pure canvas fallback warp
    const canvas = warpQuadToCanvas(img, corners, targetW, targetH);
    const blob = await new Promise<Blob>((res) =>
      canvas.toBlob((b) => res(b || new Blob()), "image/jpeg", 0.96)
    );
    return { blob, dataUrl: URL.createObjectURL(blob) };
  }
}

export const cardScanner = new CardScannerService();

