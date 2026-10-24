"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { CornerPoint, orderCorners, warpQuadToCanvas, cardScanner } from "@/lib/print-sheet/cardScanner";

interface CardCropEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string; // original uncropped image url
  initialCorners?: [CornerPoint, CornerPoint, CornerPoint, CornerPoint] | null;
  warningMessage?: string | null;
  onDone: (
    warpedBlob: Blob,
    warpedDataUrl: string,
    corners: [CornerPoint, CornerPoint, CornerPoint, CornerPoint],
    rotation: number
  ) => void;
}

export default function CardCropEditorModal({
  isOpen,
  onClose,
  imageSrc,
  initialCorners,
  warningMessage,
  onDone,
}: CardCropEditorModalProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [corners, setCorners] = useState<[CornerPoint, CornerPoint, CornerPoint, CornerPoint]>([
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ]);
  const [activeHandleIndex, setActiveHandleIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rotation, setRotation] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(warningMessage || null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement>(null);

  // Load image dimensions
  useEffect(() => {
    if (!isOpen || !imageSrc) return;
    setImageLoaded(false);
    setBannerNotice(warningMessage || null);
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      setImageDimensions({ w, h });

      if (initialCorners && initialCorners.length === 4) {
        setCorners([...initialCorners]);
      } else {
        // Default inset rectangle centered with aspect ratio 85.6 / 54 ≈ 1.585
        const targetRatio = 85.6 / 54;
        let rectW = w * 0.8;
        let rectH = rectW / targetRatio;
        if (rectH > h * 0.8) {
          rectH = h * 0.8;
          rectW = rectH * targetRatio;
        }
        const ox = (w - rectW) / 2;
        const oy = (h - rectH) / 2;
        setCorners([
          { x: ox, y: oy },
          { x: ox + rectW, y: oy },
          { x: ox + rectW, y: oy + rectH },
          { x: ox, y: oy + rectH },
        ]);
      }
      setImageLoaded(true);
    };
  }, [isOpen, imageSrc, initialCorners, warningMessage]);

  // Update live preview whenever corners change
  useEffect(() => {
    if (!imageLoaded || !imageRef.current || !previewCanvasRef.current) return;
    const previewCanvas = previewCanvasRef.current;
    const img = imageRef.current;
    warpQuadToCanvas(img, corners, 340, 214, previewCanvas);
  }, [corners, imageLoaded]);

  // Update magnifier loupe when dragging a corner
  useEffect(() => {
    if (!isDragging || activeHandleIndex === null || !imageRef.current || !loupeCanvasRef.current) return;
    const loupe = loupeCanvasRef.current;
    const ctx = loupe.getContext("2d");
    if (!ctx) return;

    const img = imageRef.current;
    const pt = corners[activeHandleIndex];
    const zoom = 2.5;
    const loupeSize = 100;

    loupe.width = loupeSize;
    loupe.height = loupeSize;
    ctx.clearRect(0, 0, loupeSize, loupeSize);

    // Draw circular zoomed section
    ctx.save();
    ctx.beginPath();
    ctx.arc(loupeSize / 2, loupeSize / 2, loupeSize / 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.drawImage(
      img,
      pt.x - (loupeSize / 2) / zoom,
      pt.y - (loupeSize / 2) / zoom,
      loupeSize / zoom,
      loupeSize / zoom,
      0,
      0,
      loupeSize,
      loupeSize
    );

    // Crosshair in loupe
    ctx.strokeStyle = "#3158d5";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(loupeSize / 2 - 12, loupeSize / 2);
    ctx.lineTo(loupeSize / 2 + 12, loupeSize / 2);
    ctx.moveTo(loupeSize / 2, loupeSize / 2 - 12);
    ctx.lineTo(loupeSize / 2, loupeSize / 2 + 12);
    ctx.stroke();

    ctx.restore();
  }, [corners, activeHandleIndex, isDragging]);

  // Global pointer up listener to prevent stuck dragging
  useEffect(() => {
    const handleGlobalUp = () => {
      setIsDragging(false);
      setActiveHandleIndex(null);
    };
    window.addEventListener("pointerup", handleGlobalUp);
    window.addEventListener("pointercancel", handleGlobalUp);
    return () => {
      window.removeEventListener("pointerup", handleGlobalUp);
      window.removeEventListener("pointercancel", handleGlobalUp);
    };
  }, []);

  // Pointer / touch handlers for dragging corners
  const handlePointerDown = (index: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    setActiveHandleIndex(index);
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || activeHandleIndex === null || !imageRef.current) return;
    const img = imageRef.current;
    const rect = img.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;

    // Map screen coordinates to image natural pixel coordinates
    const screenX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const screenY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

    const naturalX = (screenX / rect.width) * imageDimensions.w;
    const naturalY = (screenY / rect.height) * imageDimensions.h;

    setCorners((prev) => {
      const next = [...prev] as [CornerPoint, CornerPoint, CornerPoint, CornerPoint];
      next[activeHandleIndex] = { x: Math.round(naturalX), y: Math.round(naturalY) };
      return next;
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    setIsDragging(false);
    setActiveHandleIndex(null);
  };

  // Keyboard support for accessibility (Arrow keys move active handle)
  const handleKeyDown = (index: number) => (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2;
    let dx = 0;
    let dy = 0;

    if (e.key === "ArrowUp") dy = -step;
    else if (e.key === "ArrowDown") dy = step;
    else if (e.key === "ArrowLeft") dx = -step;
    else if (e.key === "ArrowRight") dx = step;
    else return;

    e.preventDefault();
    setCorners((prev) => {
      const next = [...prev] as [CornerPoint, CornerPoint, CornerPoint, CornerPoint];
      const cur = next[index];
      next[index] = {
        x: Math.max(0, Math.min(imageDimensions.w, cur.x + dx)),
        y: Math.max(0, Math.min(imageDimensions.h, cur.y + dy)),
      };
      return next;
    });
  };

  // Auto detect button
  const handleAutoDetect = async () => {
    if (!imageRef.current) return;
    setIsProcessing(true);
    setBannerNotice(null);
    try {
      const res = await cardScanner.detectAndWarp(imageRef.current);
      if (res.success && res.corners) {
        setCorners([...res.corners] as [CornerPoint, CornerPoint, CornerPoint, CornerPoint]);
      } else {
        setBannerNotice("Edges not found automatically. Please drag corners manually.");
      }
    } catch {
      setBannerNotice("Scanner could not find edges. Adjust manually.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset to default aspect-ratio inset box
  const handleReset = () => {
    const w = imageDimensions.w;
    const h = imageDimensions.h;
    const targetRatio = 85.6 / 54;
    let rectW = w * 0.8;
    let rectH = rectW / targetRatio;
    if (rectH > h * 0.8) {
      rectH = h * 0.8;
      rectW = rectH * targetRatio;
    }
    const ox = (w - rectW) / 2;
    const oy = (h - rectH) / 2;
    setCorners([
      { x: ox, y: oy },
      { x: ox + rectW, y: oy },
      { x: ox + rectW, y: oy + rectH },
      { x: ox, y: oy + rectH },
    ]);
  };

  // Rotate 90 degrees
  const handleRotate90 = () => {
    setCorners((prev) => {
      // Rotate corners: TL becomes TR, TR becomes BR, BR becomes BL, BL becomes TL
      return [prev[3], prev[0], prev[1], prev[2]];
    });
    setRotation((prev) => (prev + 90) % 360);
  };

  // Apply high resolution perspective warp on Done
  const handleDone = async () => {
    if (!imageRef.current) return;
    setIsProcessing(true);
    try {
      const ordered = orderCorners(corners);
      const { blob, dataUrl } = await cardScanner.warpWithCorners(
        imageRef.current,
        ordered,
        1200,
        757
      );
      onDone(blob, dataUrl, ordered, rotation);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Error generating straightened card. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  // Handle position in percentage of current image
  const getHandleStyle = (index: number) => {
    if (!imageDimensions.w || !imageDimensions.h) return { display: "none" };
    const pt = corners[index];
    const leftPct = (pt.x / imageDimensions.w) * 100;
    const topPct = (pt.y / imageDimensions.h) * 100;
    return {
      left: `${leftPct}%`,
      top: `${topPct}%`,
    };
  };

  const labels = ["TL", "TR", "BR", "BL"];
  const handleNames = [
    "Top-left corner",
    "Top-right corner",
    "Bottom-right corner",
    "Bottom-left corner",
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Adjust Card Corners"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#1c201a]/40 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderColor: "#e5e5df",
          borderWidth: "1px",
          borderStyle: "solid",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
        }}
        className="relative w-full max-w-4xl rounded-2xl sm:rounded-[24px] overflow-hidden flex flex-col my-auto max-h-[92vh]"
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: "#fafaf8",
            borderBottom: "1px solid #efeee7",
          }}
          className="px-5 py-4 flex items-center justify-between shrink-0"
        >
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#1c201a] flex items-center gap-2">
              <span>Adjust Card Corners</span>
              <span
                style={{
                  backgroundColor: "#e8effe",
                  color: "#3158d5",
                  borderColor: "#bcd5ff",
                  borderWidth: "1px",
                  borderStyle: "solid",
                }}
                className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
              >
                85.6 × 54 mm
              </span>
            </h2>
            <p className="text-xs text-[#70746d] mt-0.5">
              Drag the 4 corner handles to align with the edges of your card.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: "#ffffff",
              borderColor: "#e5e5df",
              borderWidth: "1px",
              borderStyle: "solid",
              color: "#555a52",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
            className="h-8.5 w-8.5 rounded-xl hover:bg-[#efeee7] flex items-center justify-center transition cursor-pointer text-xs font-bold"
            aria-label="Close corner adjustment modal"
          >
            ✕
          </button>
        </div>

        {/* Warning Banner if detection failed or unsure */}
        {bannerNotice && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 text-xs font-semibold text-amber-900 flex items-center gap-2">
            <span className="text-sm font-bold text-amber-700">⚠️</span>
            <span>{bannerNotice}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-center min-h-0 w-full">
          {/* Main Cropper Photo Canvas Container */}
          <div
            className="w-full bg-slate-950 rounded-lg p-3 sm:p-4 border border-slate-800 shadow-inner flex items-center justify-center relative overflow-hidden select-none"
            style={{
              width: "100%",
              height: "420px",
              maxHeight: "56vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              backgroundColor: "#020617",
            }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Loading indicator */}
            {!imageLoaded && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                  color: "#94a3b8",
                  padding: "40px 0",
                }}
              >
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold">Loading photo...</span>
              </div>
            )}

            {/* Tight wrapper matching rendered image */}
            <div
              ref={containerRef}
              className={`relative inline-block select-none touch-none shadow-2xl max-w-full max-h-[50vh] ${
                !imageLoaded ? "invisible" : ""
              }`}
              style={{
                position: "relative",
                display: "inline-block",
                maxWidth: "100%",
                maxHeight: "380px",
              }}
            >
              {/* The Photo */}
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Card for corner adjustment"
                className="block max-h-[380px] max-w-full w-auto h-auto rounded-lg select-none pointer-events-none"
                style={{
                  display: "block",
                  maxWidth: "100%",
                  maxHeight: "380px",
                  width: "auto",
                  height: "auto",
                  borderRadius: "8px",
                }}
                onLoad={(e) => {
                  const img = e.currentTarget;
                  const w = img.naturalWidth || img.width;
                  const h = img.naturalHeight || img.height;
                  if (w > 0 && h > 0) {
                    setImageDimensions({ w, h });
                    setImageLoaded(true);
                  }
                }}
              />

              {/* Polygon Outline SVG & Dashed Diagonals */}
              {imageLoaded && imageDimensions.w > 0 && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none z-10"
                  viewBox={`0 0 ${imageDimensions.w} ${imageDimensions.h}`}
                  preserveAspectRatio="none"
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                    zIndex: 10,
                  }}
                >
                  <polygon
                    points={`${corners[0].x},${corners[0].y} ${corners[1].x},${corners[1].y} ${corners[2].x},${corners[2].y} ${corners[3].x},${corners[3].y}`}
                    fill="rgba(49, 88, 213, 0.22)"
                    stroke="#3158d5"
                    strokeWidth={Math.max(3, Math.round(imageDimensions.w / 350))}
                    strokeLinejoin="round"
                  />
                  <line
                    x1={corners[0].x}
                    y1={corners[0].y}
                    x2={corners[2].x}
                    y2={corners[2].y}
                    stroke="rgba(255, 255, 255, 0.45)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <line
                    x1={corners[1].x}
                    y1={corners[1].y}
                    x2={corners[3].x}
                    y2={corners[3].y}
                    stroke="rgba(255, 255, 255, 0.45)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                </svg>
              )}

              {/* 4 Draggable Handles */}
              {imageLoaded &&
                labels.map((label, idx) => {
                  const style = getHandleStyle(idx);
                  const isActive = activeHandleIndex === idx;

                  return (
                    <button
                      key={label}
                      type="button"
                      tabIndex={0}
                      role="slider"
                      aria-label={handleNames[idx]}
                      aria-valuenow={corners[idx].x}
                      onPointerDown={handlePointerDown(idx)}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      onKeyDown={handleKeyDown(idx)}
                      style={{
                        ...style,
                        position: "absolute",
                        transform: "translate(-50%, -50%)",
                        minWidth: "48px",
                        minHeight: "48px",
                        width: "48px",
                        height: "48px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "grab",
                        zIndex: isActive ? 40 : 30,
                        touchAction: "none",
                      }}
                      className="focus:outline-hidden"
                    >
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "9999px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "11px",
                          fontWeight: "900",
                          color: "#ffffff",
                          backgroundColor: isActive ? "#3158d5" : "#2546b8",
                          border: "2px solid #ffffff",
                          boxShadow: isActive
                            ? "0 0 0 4px rgba(49, 88, 213, 0.45), 0 10px 15px -3px rgba(0, 0, 0, 0.3)"
                            : "0 4px 6px -1px rgba(0, 0, 0, 0.25)",
                        }}
                      >
                        {label}
                      </div>
                    </button>
                  );
                })}

              {/* Magnifier Loupe Floating */}
              {isDragging && activeHandleIndex !== null && (
                <div
                  className="absolute pointer-events-none z-50 rounded-full border-2 border-white shadow-2xl bg-white overflow-hidden ring-4 ring-black/20"
                  style={{
                    position: "absolute",
                    pointerEvents: "none",
                    zIndex: 50,
                    width: "110px",
                    height: "110px",
                    top: "12px",
                    right: "12px",
                  }}
                >
                  <canvas ref={loupeCanvasRef} className="w-full h-full block" />
                </div>
              )}
            </div>
          </div>

          {/* Side / Bottom Live Straightened Preview */}
          <div className="w-full lg:w-72 shrink-0 flex flex-col items-center lg:items-start gap-3">
            <div className="text-xs font-bold text-[#1c201a] flex items-center gap-1.5">
              <span>Straightened Preview</span>
              <span className="text-[10px] text-[#70746d] font-normal">(Live)</span>
            </div>

            <div
              style={{
                borderColor: "#e5e5df",
                borderWidth: "1px",
                borderStyle: "solid",
                backgroundColor: "#fafaf8",
              }}
              className="w-full max-w-[280px] lg:max-w-none rounded-xl overflow-hidden shadow-2xs flex items-center justify-center aspect-[85.6/54]"
            >
              <canvas
                ref={previewCanvasRef}
                className="w-full h-full object-cover block"
                style={{ aspectRatio: "85.6 / 54" }}
              />
            </div>

            <div className="text-[11px] text-[#70746d] leading-tight">
              Tip: Drag corners until the card is square and text is horizontal.
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div
          style={{
            borderTop: "1px solid #efeee7",
            backgroundColor: "#fafaf8",
          }}
          className="modal-mobile-single-line px-2 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-center sm:justify-between gap-1 sm:gap-3 shrink-0 w-full"
        >
          <div className="flex items-center justify-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handleAutoDetect}
              disabled={isProcessing}
              style={{
                backgroundColor: "#ffffff",
                borderColor: "#e5e5df",
                borderWidth: "1px",
                borderStyle: "solid",
                color: "#1c201a",
                boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
              }}
              className="modal-mobile-btn h-9 px-3.5 rounded-xl text-xs font-bold hover:bg-[#efeee7] transition cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 disabled:opacity-50"
              aria-label="Re-run automatic card detection"
            >
              <span className="text-amber-600 text-xs sm:text-sm">⚡</span>
              <span>Auto</span>
            </button>

            <button
              type="button"
              onClick={handleRotate90}
              style={{
                backgroundColor: "#ffffff",
                borderColor: "#e5e5df",
                borderWidth: "1px",
                borderStyle: "solid",
                color: "#1c201a",
                boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
              }}
              className="modal-mobile-btn h-9 px-3.5 rounded-xl text-xs font-bold hover:bg-[#efeee7] transition cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5"
              aria-label="Rotate card 90 degrees"
            >
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#70746d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <polyline points="21 3 21 8 16 8" />
              </svg>
              <span>Rotate 90°</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              style={{
                backgroundColor: "#ffffff",
                borderColor: "#e5e5df",
                borderWidth: "1px",
                borderStyle: "solid",
                color: "#1c201a",
                boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
              }}
              className="modal-mobile-btn h-9 px-3.5 rounded-xl text-xs font-bold hover:bg-[#efeee7] transition cursor-pointer flex items-center justify-center"
              aria-label="Reset corners to default rectangle"
            >
              Reset
            </button>
          </div>

          <div className="flex items-center justify-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              style={{
                color: "#555a52",
              }}
              className="modal-mobile-btn h-9 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold hover:bg-[#efeee7] transition cursor-pointer flex items-center justify-center"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleDone}
              disabled={isProcessing}
              style={{
                backgroundColor: "#3158d5",
                color: "#ffffff",
                boxShadow: "0 2px 10px rgba(49, 88, 213, 0.3)",
                border: "none",
                outline: "none",
              }}
              className="modal-mobile-btn-done h-10 px-7 rounded-full text-xs sm:text-sm font-bold hover:bg-[#2546b8] active:scale-95 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? "Processing..." : "Done"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

