// Card scanner Web Worker using OpenCV.js for automatic edge detection and perspective warp
/* eslint-disable no-restricted-globals */

let cvInstance = null;
let cvInitPromise = null;

function initOpenCV() {
  if (cvInitPromise) return cvInitPromise;
  cvInitPromise = new Promise((resolve, reject) => {
    try {
      importScripts("/opencv.js");
      if (typeof cv === "undefined") {
        reject(new Error("OpenCV is not defined"));
        return;
      }
      if (typeof cv.then === "function" || cv instanceof Promise) {
        cv.then((resolved) => {
          cvInstance = resolved;
          resolve(cvInstance);
        }).catch(reject);
      } else if (cv.Mat) {
        cvInstance = cv;
        resolve(cvInstance);
      } else {
        cv.onRuntimeInitialized = () => {
          cvInstance = cv;
          resolve(cvInstance);
        };
      }
    } catch (err) {
      reject(err);
    }
  });
  return cvInitPromise;
}

// Distance between two points
function dist(p1, p2) {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

// Order 4 points: [TL, TR, BR, BL]
function orderCorners(pts) {
  // Sort by y-coordinate
  const sorted = [...pts].sort((a, b) => a.y - b.y);
  // Top 2 points
  const top2 = [sorted[0], sorted[1]].sort((a, b) => a.x - b.x);
  const tl = top2[0];
  const tr = top2[1];
  // Bottom 2 points
  const bottom2 = [sorted[2], sorted[3]].sort((a, b) => a.x - b.x);
  const bl = bottom2[0];
  const br = bottom2[1];
  return [tl, tr, br, bl];
}

self.onmessage = async (e) => {
  const { type, id } = e.data || {};

  if (type === "init") {
    try {
      await initOpenCV();
      self.postMessage({ type: "ready", id });
    } catch (err) {
      self.postMessage({ type: "error", id, error: String(err) });
    }
    return;
  }

  if (type === "detect_and_warp") {
    const { imageData, fullImageData, targetW = 1200, targetH = 757 } = e.data;
    try {
      const cv = await initOpenCV();

      const origW = imageData.width;
      const origH = imageData.height;

      // 1. Convert downscaled ImageData to cv.Mat
      const src = cv.matFromImageData(imageData);
      const gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

      const blur = new cv.Mat();
      cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0);

      // Strategy 1: Canny edges + morphological close
      let foundQuad = null;

      const runDetection = (binaryMat) => {
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        cv.findContours(binaryMat, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

        const totalArea = origW * origH;
        let maxArea = 0;
        let bestCorners = null;

        for (let i = 0; i < contours.size(); ++i) {
          const cnt = contours.get(i);
          const peri = cv.arcLength(cnt, true);
          const approx = new cv.Mat();
          cv.approxPolyDP(cnt, approx, 0.02 * peri, true);

          if (approx.rows === 4 && cv.isContourConvex(approx)) {
            const area = cv.contourArea(approx);
            if (area >= 0.15 * totalArea && area > maxArea) {
              const pts = [];
              for (let r = 0; r < 4; r++) {
                pts.push({
                  x: approx.data32S[r * 2],
                  y: approx.data32S[r * 2 + 1],
                });
              }

              const ordered = orderCorners(pts);
              const wTop = dist(ordered[0], ordered[1]);
              const wBottom = dist(ordered[3], ordered[2]);
              const hLeft = dist(ordered[0], ordered[3]);
              const hRight = dist(ordered[1], ordered[2]);

              const w = Math.max(wTop, wBottom);
              const h = Math.max(hLeft, hRight);

              if (w > 0 && h > 0) {
                let ratio = w / h;
                let isPortrait = false;
                if (ratio < 1) {
                  ratio = 1 / ratio;
                  isPortrait = true;
                }

                // Standard ID-1 ratio is 85.6 / 54 ≈ 1.585 (accept 1.3 to 1.9)
                if (ratio >= 1.25 && ratio <= 1.95) {
                  maxArea = area;
                  bestCorners = { corners: ordered, isPortrait };
                }
              }
            }
          }
          approx.delete();
          cnt.delete();
        }

        contours.delete();
        hierarchy.delete();
        return bestCorners;
      };

      // Try Strategy 1
      const edges = new cv.Mat();
      cv.Canny(blur, edges, 50, 150);
      const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
      const closed = new cv.Mat();
      cv.morphologyEx(edges, closed, cv.MORPH_CLOSE, kernel);
      foundQuad = runDetection(closed);
      edges.delete();
      kernel.delete();
      closed.delete();

      // Strategy 2: Adaptive / Otsu threshold if Canny did not find valid quad
      if (!foundQuad) {
        const thresh = new cv.Mat();
        cv.threshold(blur, thresh, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
        foundQuad = runDetection(thresh);
        thresh.delete();
      }

      // Cleanup pre-processing mats
      src.delete();
      gray.delete();
      blur.delete();

      if (!foundQuad) {
        self.postMessage({
          type: "detect_and_warp_result",
          id,
          success: false,
          reason: "No card quadrilateral found matching 1.3-1.9 aspect ratio",
        });
        return;
      }

      let [tl, tr, br, bl] = foundQuad.corners;

      // If card was captured portrait, rotate corners so result is landscape (85.6 x 54)
      if (foundQuad.isPortrait) {
        const newTl = bl;
        const newTr = tl;
        const newBr = tr;
        const newBl = br;
        tl = newTl;
        tr = newTr;
        br = newBr;
        bl = newBl;
      }

      // Warp using full resolution image data if provided, otherwise using scaled imageData
      const warpSrcData = fullImageData || imageData;
      const scaleX = warpSrcData.width / origW;
      const scaleY = warpSrcData.height / origH;

      const fullCorners = [
        { x: tl.x * scaleX, y: tl.y * scaleY },
        { x: tr.x * scaleX, y: tr.y * scaleY },
        { x: br.x * scaleX, y: br.y * scaleY },
        { x: bl.x * scaleX, y: bl.y * scaleY },
      ];

      const fullSrcMat = cv.matFromImageData(warpSrcData);
      const srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
        fullCorners[0].x, fullCorners[0].y,
        fullCorners[1].x, fullCorners[1].y,
        fullCorners[2].x, fullCorners[2].y,
        fullCorners[3].x, fullCorners[3].y,
      ]);

      const dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0, 0,
        targetW, 0,
        targetW, targetH,
        0, targetH,
      ]);

      const M = cv.getPerspectiveTransform(srcPts, dstPts);
      const dsize = new cv.Size(targetW, targetH);
      const dst = new cv.Mat();
      cv.warpPerspective(fullSrcMat, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

      // Create result ImageData
      const warpedData = new ImageData(new Uint8ClampedArray(dst.data), targetW, targetH);

      fullSrcMat.delete();
      srcPts.delete();
      dstPts.delete();
      M.delete();
      dst.delete();

      self.postMessage(
        {
          type: "detect_and_warp_result",
          id,
          success: true,
          corners: fullCorners,
          warpedImageData: warpedData,
          targetW,
          targetH,
        },
        [warpedData.data.buffer]
      );
    } catch (err) {
      self.postMessage({
        type: "detect_and_warp_result",
        id,
        success: false,
        reason: String(err),
      });
    }
    return;
  }

  if (type === "warp_corners") {
    const { imageData, corners, targetW = 1200, targetH = 757 } = e.data;
    try {
      const cv = await initOpenCV();
      const srcMat = cv.matFromImageData(imageData);

      const srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
        corners[0].x, corners[0].y,
        corners[1].x, corners[1].y,
        corners[2].x, corners[2].y,
        corners[3].x, corners[3].y,
      ]);

      const dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0, 0,
        targetW, 0,
        targetW, targetH,
        0, targetH,
      ]);

      const M = cv.getPerspectiveTransform(srcPts, dstPts);
      const dsize = new cv.Size(targetW, targetH);
      const dst = new cv.Mat();
      cv.warpPerspective(srcMat, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

      const warpedData = new ImageData(new Uint8ClampedArray(dst.data), targetW, targetH);

      srcMat.delete();
      srcPts.delete();
      dstPts.delete();
      M.delete();
      dst.delete();

      self.postMessage(
        {
          type: "warp_result",
          id,
          success: true,
          warpedImageData: warpedData,
          targetW,
          targetH,
        },
        [warpedData.data.buffer]
      );
    } catch (err) {
      self.postMessage({
        type: "warp_result",
        id,
        success: false,
        reason: String(err),
      });
    }
  }
};

