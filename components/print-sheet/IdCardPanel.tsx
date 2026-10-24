"use client";

import React, { useRef, useState, useEffect } from "react";
import { IdCardLayoutType, Orientation } from "@/lib/print-sheet/layout";
import { CornerPoint } from "@/lib/print-sheet/cardScanner";

export interface IdCardItemData {
  id: string;
  frontRawUrl?: string;
  frontUrl?: string;
  frontBlob?: Blob;
  frontCorners?: [CornerPoint, CornerPoint, CornerPoint, CornerPoint];
  frontFile?: File;
  backRawUrl?: string;
  backUrl?: string;
  backBlob?: Blob;
  backCorners?: [CornerPoint, CornerPoint, CornerPoint, CornerPoint];
  backFile?: File;
}

interface IdCardPanelProps {
  cards: IdCardItemData[];
  onUpdateCard: (index: number, updated: IdCardItemData) => void;
  onAddCard: () => void;
  onRemoveCard: (index: number) => void;
  onClearAllCards: () => void;
  layout: IdCardLayoutType;
  onChangeLayout: (l: IdCardLayoutType) => void;
  scale: number;
  onChangeScale: (s: number) => void;
  paper: string;
  onChangePaper: (p: string) => void;
  orient: Orientation;
  onChangeOrient: (o: Orientation) => void;
  watermarkEnabled: boolean;
  onChangeWatermarkEnabled: (v: boolean) => void;
  watermarkText: string;
  onChangeWatermarkText: (t: string) => void;
  cutGuide: "none" | "marks" | "lines";
  onChangeCutGuide: (g: "none" | "marks" | "lines") => void;
  topMargin?: number;
  onChangeTopMargin?: (m: number) => void;
  isExporting: boolean;
  onDownload: () => void;
  onPrint: () => void;
  onShare: () => void;
  canShare: boolean;
  onAdjustCard: (cardIndex: number, side: "front" | "back") => void;
  onFileSelected: (cardIndex: number, side: "front" | "back", file: File) => void;
  isScanning: boolean;
  scanStatusText: string;
  viewMode?: "all" | "slots-only" | "settings-only";
}

const WATERMARK_PRESETS = [
  "For bank KYC only",
  "For visa application only",
  "Copy - not valid for any other use",
];

export default function IdCardPanel({
  cards,
  onUpdateCard,
  onAddCard,
  onRemoveCard,
  onClearAllCards,
  layout,
  onChangeLayout,
  scale,
  onChangeScale,
  paper,
  onChangePaper,
  orient,
  onChangeOrient,
  watermarkEnabled,
  onChangeWatermarkEnabled,
  watermarkText,
  onChangeWatermarkText,
  cutGuide,
  onChangeCutGuide,
  topMargin = 30,
  onChangeTopMargin,
  isExporting,
  onDownload,
  onPrint,
  onShare,
  canShare,
  onAdjustCard,
  onFileSelected,
  isScanning,
  scanStatusText,
  viewMode = "all",
}: IdCardPanelProps) {
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const activeSlotTarget = useRef<{ cardIndex: number; side: "front" | "back" } | null>(null);

  const [activeToolbarSlot, setActiveToolbarSlot] = useState<{
    cardIndex: number;
    side: "front" | "back";
  } | null>(null);

  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      const isSmall = window.innerWidth < 640;
      setIsMobileDevice(isMobileUA || (isTouch && isSmall));
    };
    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  const [hasOpenedToolbar, setHasOpenedToolbar] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("spellense_id_toolbar_hint_seen") === "true";
      } catch {
        return false;
      }
    }
    return false;
  });

  const handleToggleToolbar = (cardIndex: number, side: "front" | "back") => {
    if (
      activeToolbarSlot?.cardIndex === cardIndex &&
      activeToolbarSlot?.side === side
    ) {
      setActiveToolbarSlot(null);
    } else {
      setActiveToolbarSlot({ cardIndex, side });
      if (!hasOpenedToolbar) {
        setHasOpenedToolbar(true);
        try {
          localStorage.setItem("spellense_id_toolbar_hint_seen", "true");
        } catch {}
      }
    }
  };

  useEffect(() => {
    if (!activeToolbarSlot) return;

    const handleDocumentClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest(`[data-slot-id="${activeToolbarSlot.cardIndex}-${activeToolbarSlot.side}"]`)) {
        return;
      }
      setActiveToolbarSlot(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveToolbarSlot(null);
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);
    document.addEventListener("touchstart", handleDocumentClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
      document.removeEventListener("touchstart", handleDocumentClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeToolbarSlot]);

  const handleTriggerUpload = (cardIndex: number, side: "front" | "back") => {
    activeSlotTarget.current = { cardIndex, side };
    if (uploadInputRef.current) {
      uploadInputRef.current.value = "";
      uploadInputRef.current.click();
    }
  };

  const handleTriggerCamera = (cardIndex: number, side: "front" | "back") => {
    activeSlotTarget.current = { cardIndex, side };
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
      cameraInputRef.current.click();
    }
  };

  const handleInputFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeSlotTarget.current) {
      onFileSelected(activeSlotTarget.current.cardIndex, activeSlotTarget.current.side, file);
    }
  };

  const handleSwapFrontBack = (cardIndex: number) => {
    setActiveToolbarSlot(null);
    const card = cards[cardIndex];
    if (!card) return;
    const swapped: IdCardItemData = {
      ...card,
      frontRawUrl: card.backRawUrl,
      frontUrl: card.backUrl,
      frontBlob: card.backBlob,
      frontCorners: card.backCorners,
      frontFile: card.backFile,
      backRawUrl: card.frontRawUrl,
      backUrl: card.frontUrl,
      backBlob: card.frontBlob,
      backCorners: card.frontCorners,
      backFile: card.frontFile,
    };
    onUpdateCard(cardIndex, swapped);
  };

  const handleRemoveSide = (cardIndex: number, side: "front" | "back") => {
    setActiveToolbarSlot(null);
    const card = cards[cardIndex];
    if (!card) return;
    if (side === "front") {
      onUpdateCard(cardIndex, {
        ...card,
        frontRawUrl: undefined,
        frontUrl: undefined,
        frontBlob: undefined,
        frontCorners: undefined,
        frontFile: undefined,
      });
    } else {
      onUpdateCard(cardIndex, {
        ...card,
        backRawUrl: undefined,
        backUrl: undefined,
        backBlob: undefined,
        backCorners: undefined,
        backFile: undefined,
      });
    }
  };

  const handleRotateSide = async (cardIndex: number, side: "front" | "back") => {
    const card = cards[cardIndex];
    if (!card) return;
    const currentUrl = side === "front" ? (card.frontUrl || card.frontRawUrl) : (card.backUrl || card.backRawUrl);
    if (!currentUrl) return;

    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (err) => reject(err);
        img.src = currentUrl;
        if (img.complete && img.naturalWidth > 0) {
          resolve();
        }
      });

      const targetW = img.naturalHeight || img.height || 757;
      const targetH = img.naturalWidth || img.width || 1200;

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

      const rotatedDataUrl = canvas.toDataURL("image/jpeg", 0.95);

      // Convert data URL to Blob reliably
      const byteString = atob(rotatedDataUrl.split(",")[1]);
      const mimeString = rotatedDataUrl.split(",")[0].split(":")[1].split(";")[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const rotatedBlob = new Blob([ab], { type: mimeString });

      if (side === "front") {
        onUpdateCard(cardIndex, {
          ...card,
          frontRawUrl: rotatedDataUrl,
          frontBlob: rotatedBlob,
          frontUrl: rotatedDataUrl,
          frontCorners: undefined,
        });
      } else {
        onUpdateCard(cardIndex, {
          ...card,
          backRawUrl: rotatedDataUrl,
          backBlob: rotatedBlob,
          backUrl: rotatedDataUrl,
          backCorners: undefined,
        });
      }
    } catch (err) {
      console.error("Failed to rotate card:", err);
    }
  };

  const hasAnyImages = cards.some((c) => Boolean(c.frontUrl || c.backUrl));

  return (
    <div className="space-y-4">
      {/* Hidden file inputs */}
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        hidden
        onChange={handleInputFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        capture="environment"
        hidden
        onChange={handleInputFileChange}
      />

      {/* RENDER SLOTS WHEN NOT SETTINGS-ONLY */}
      {viewMode !== "settings-only" && (
        <>
          {/* SECTION HEADER: YOUR CARD */}
          <div className="flex items-center justify-between pb-1">
            <div>
              <h3 className="text-base font-bold text-[#1c201a] leading-tight">Your card</h3>
              <p className="text-xs text-[#767a74] mt-0.5">Add a front photo; the back is optional.</p>
            </div>
            <div className="flex items-center gap-2">
              <span
                style={{
                  backgroundColor: "#efeee7",
                  borderColor: "#e5e5df",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  color: "#555a52",
                }}
                className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
              >
                {cards.length} {cards.length === 1 ? "card" : "cards"} · max 5
              </span>
              {hasAnyImages && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveToolbarSlot(null);
                    onClearAllCards();
                  }}
                  className="text-xs font-semibold text-rose-500 hover:text-rose-700 transition cursor-pointer px-2 py-0.5 rounded-md hover:bg-rose-50 border border-transparent hover:border-rose-200"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* FIRST-TIME INTERACTION HINT */}
          {!hasOpenedToolbar && hasAnyImages && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#e8effe] border border-[#bcd5ff] text-[#3158d5] text-xs font-medium animate-in fade-in duration-200 shadow-2xs">
              <svg className="w-4 h-4 text-[#3158d5] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>Tap or click the photo to show editing options.</span>
            </div>
          )}

          {/* SCANNING TOAST */}
          {isScanning && (
            <div className="rounded-xl bg-[#e8effe] border border-[#bcd5ff] px-3 py-2 sm:px-3.5 sm:py-2.5 flex items-center gap-2 text-xs font-bold text-[#3158d5] animate-pulse">
              <svg className="animate-spin h-3.5 w-3.5 shrink-0 text-[#3158d5]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <span>{scanStatusText || "Scanning card & auto-straightening..."}</span>
            </div>
          )}

          {/* CARD UPLOAD SLOTS */}
          <div className="space-y-3.5">
            {cards.map((card, cIndex) => {
              return (
                <div key={card.id || cIndex} className="space-y-2">
                  {/* Card Title & Swap Action for multi-cards */}
                  {cards.length > 1 && (
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-xs sm:text-sm font-bold text-[#1c201a] flex items-center gap-1.5">
                        <span className="h-5 w-5 rounded-full bg-[#f0f2f5] text-[#1c201a] flex items-center justify-center text-[11px] font-bold shrink-0">
                          {cIndex + 1}
                        </span>
                        <span>ID Card #{cIndex + 1}</span>
                      </span>

                      <div className="flex items-center gap-1.5">
                        {(card.frontUrl || card.backUrl) && (
                          <button
                            type="button"
                            onClick={() => handleSwapFrontBack(cIndex)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#555a52] hover:text-[#3158d5] bg-[#f6f5f3] hover:bg-[#e8effe] px-2 py-0.5 rounded-lg transition cursor-pointer"
                            title="Swap front and back"
                          >
                            <span>⇄</span>
                            <span>Swap</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onRemoveCard(cIndex)}
                          className="text-[11px] text-rose-500 hover:text-rose-700 font-bold px-1.5 py-0.5 rounded-md hover:bg-rose-50 transition cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Front & Back Slots - 2 columns side by side */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-1">
                    {/* FRONT SLOT */}
                    <div
                      style={{
                        borderColor: "#e5e5df",
                        borderWidth: "1px",
                        borderStyle: "solid",
                        backgroundColor: "#ffffff",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                      }}
                      className="rounded-2xl p-3 sm:p-3.5 space-y-2 min-w-0"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-[#1c201a] text-xs sm:text-[13px]">
                          <span className="w-2 h-2 rounded-full bg-[#3158d5]" />
                          <span>Front side</span>
                        </div>
                        {card.frontUrl ? (
                          <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-0.5">
                            <span>✓</span> Ready
                          </span>
                        ) : (
                          <span
                            style={{
                              backgroundColor: "#faf9f6",
                              borderColor: "#e5e5df",
                              borderWidth: "1px",
                              borderStyle: "solid",
                              color: "#70746d",
                            }}
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
                          >
                            Required
                          </span>
                        )}
                      </div>

                  {card.frontUrl ? (
                    <div className="space-y-2" data-slot-id={`${cIndex}-front`}>
                      {/* Clean Card photo container */}
                      <div
                        style={{
                          aspectRatio: "85.6 / 54",
                          borderColor: "#e5e5df",
                          borderWidth: "1px",
                          borderStyle: "solid",
                        }}
                        className="w-full relative rounded-lg bg-[#1c201a] overflow-hidden shadow-xs select-none cursor-pointer group"
                        onClick={() => onAdjustCard(cIndex, "front")}
                        title="Click to edit corners or crop"
                      >
                        <img
                          key={card.frontUrl}
                          src={card.frontUrl}
                          alt={`Card ${cIndex + 1} Front`}
                          className="w-full h-full object-cover block group-hover:opacity-95 transition-opacity"
                        />
                      </div>

                      {/* Below photo: Edit on left, Replace on right */}
                      <div className="flex items-center justify-between text-xs pt-0.5 px-0.5">
                        <button
                          type="button"
                          onClick={() => onAdjustCard(cIndex, "front")}
                          style={{
                            backgroundColor: "#e8effe",
                            borderColor: "#bcd5ff",
                            borderWidth: "1px",
                            borderStyle: "solid",
                            color: "#3158d5",
                          }}
                          className="h-7 px-3.5 rounded-lg text-xs font-bold hover:bg-[#d5e4fe] transition cursor-pointer active:scale-95 whitespace-nowrap flex items-center justify-center"
                          title="Adjust corners / Crop"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTriggerUpload(cIndex, "front")}
                          style={{
                            backgroundColor: "#ffffff",
                            borderColor: "#e5e5df",
                            borderWidth: "1px",
                            borderStyle: "solid",
                            color: "#1c201a",
                          }}
                          className="h-7 px-3.5 rounded-lg text-xs font-bold hover:bg-[#efeee7] transition cursor-pointer active:scale-95 whitespace-nowrap flex items-center justify-center"
                          title="Replace with another image"
                        >
                          Replace
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files?.[0];
                        if (file) onFileSelected(cIndex, "front", file);
                      }}
                      onClick={() => handleTriggerUpload(cIndex, "front")}
                      style={{
                        borderColor: "#cbcfc5",
                        borderWidth: "1.5px",
                        borderStyle: "dashed",
                        backgroundColor: "#faf9f6",
                      }}
                      className="min-h-[140px] sm:min-h-[155px] rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 hover:border-[#3158d5] hover:bg-[#f0f4fe] group w-full"
                    >
                      <div
                        style={{ backgroundColor: "#e8effe", color: "#3158d5" }}
                        className="w-8 h-8 rounded-full flex items-center justify-center mb-1 group-hover:scale-105 transition-transform"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="16 12 12 8 8 12" />
                          <line x1="12" y1="8" x2="12" y2="16" />
                        </svg>
                      </div>

                      <span style={{ color: "#1c201a" }} className="text-xs sm:text-[13px] font-bold group-hover:text-[#3158d5] transition-colors block">
                        Add front photo
                      </span>
                      <span style={{ color: "#70746d" }} className="text-[10px] sm:text-[11px] mt-0.5">
                        JPG, PNG or WebP
                      </span>

                      {isMobileDevice ? (
                        /* Mobile-only Action Button: Camera only under Add photo */
                        <div className="flex items-center justify-center mt-2.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTriggerCamera(cIndex, "front");
                            }}
                            style={{
                              backgroundColor: "#3158d5",
                              color: "#ffffff",
                              boxShadow: "0 1px 3px rgba(49, 88, 213, 0.25)",
                              border: "none",
                              outline: "none",
                            }}
                            className="h-8 px-4 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                              <circle cx="12" cy="13" r="3" />
                            </svg>
                            <span>Take photo</span>
                          </button>
                        </div>
                      ) : (
                        /* Desktop-only Action Button: Choose image (NO camera on desktop) */
                        <div className="flex items-center justify-center mt-2.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTriggerUpload(cIndex, "front");
                            }}
                            style={{
                              backgroundColor: "#3158d5",
                              color: "#ffffff",
                              boxShadow: "0 1px 3px rgba(49, 88, 213, 0.25)",
                              border: "none",
                              outline: "none",
                            }}
                            className="h-8 px-4 rounded-lg text-xs font-bold transition hover:bg-[#2546b8] cursor-pointer flex items-center justify-center active:scale-95"
                          >
                            <span>Choose image</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* BACK SLOT */}
                <div
                  style={{
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    backgroundColor: "#ffffff",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                  }}
                  className="rounded-2xl p-3 sm:p-3.5 space-y-2 min-w-0"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-[#1c201a] text-xs sm:text-[13px]">
                      <span className="w-2 h-2 rounded-full bg-[#8f96a3]" />
                      <span>Back side</span>
                    </div>
                    {card.backUrl ? (
                      <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-0.5">
                        <span>✓</span> Ready
                      </span>
                    ) : (
                      <span style={{ color: "#70746d" }} className="text-[11px] font-normal">
                        Optional
                      </span>
                    )}
                  </div>

                  {card.backUrl ? (
                    <div className="space-y-2" data-slot-id={`${cIndex}-back`}>
                      {/* Clean Card photo container */}
                      <div
                        style={{
                          aspectRatio: "85.6 / 54",
                          borderColor: "#e5e5df",
                          borderWidth: "1px",
                          borderStyle: "solid",
                        }}
                        className="w-full relative rounded-lg bg-[#1c201a] overflow-hidden shadow-xs select-none cursor-pointer group"
                        onClick={() => onAdjustCard(cIndex, "back")}
                        title="Click to edit corners or crop"
                      >
                        <img
                          key={card.backUrl}
                          src={card.backUrl}
                          alt={`Card ${cIndex + 1} Back`}
                          className="w-full h-full object-cover block group-hover:opacity-95 transition-opacity"
                        />
                      </div>

                      {/* Below photo: Edit on left, Replace on right */}
                      <div className="flex items-center justify-between text-xs pt-0.5 px-0.5">
                        <button
                          type="button"
                          onClick={() => onAdjustCard(cIndex, "back")}
                          style={{
                            backgroundColor: "#e8effe",
                            borderColor: "#bcd5ff",
                            borderWidth: "1px",
                            borderStyle: "solid",
                            color: "#3158d5",
                          }}
                          className="h-7 px-3.5 rounded-lg text-xs font-bold hover:bg-[#d5e4fe] transition cursor-pointer active:scale-95 whitespace-nowrap flex items-center justify-center"
                          title="Adjust corners / Crop"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTriggerUpload(cIndex, "back")}
                          style={{
                            backgroundColor: "#ffffff",
                            borderColor: "#e5e5df",
                            borderWidth: "1px",
                            borderStyle: "solid",
                            color: "#1c201a",
                          }}
                          className="h-7 px-3.5 rounded-lg text-xs font-bold hover:bg-[#efeee7] transition cursor-pointer active:scale-95 whitespace-nowrap flex items-center justify-center"
                          title="Replace with another image"
                        >
                          Replace
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files?.[0];
                        if (file) onFileSelected(cIndex, "back", file);
                      }}
                      onClick={() => handleTriggerUpload(cIndex, "back")}
                      style={{
                        borderColor: "#cbcfc5",
                        borderWidth: "1.5px",
                        borderStyle: "dashed",
                        backgroundColor: "#faf9f6",
                      }}
                      className="min-h-[140px] sm:min-h-[155px] rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 hover:border-[#3158d5] hover:bg-[#f0f4fe] group w-full"
                    >
                      <div
                        style={{ backgroundColor: "#e8effe", color: "#3158d5" }}
                        className="w-8 h-8 rounded-full flex items-center justify-center mb-1 group-hover:scale-105 transition-transform"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="16 12 12 8 8 12" />
                          <line x1="12" y1="8" x2="12" y2="16" />
                        </svg>
                      </div>

                      <span style={{ color: "#1c201a" }} className="text-xs sm:text-[13px] font-bold group-hover:text-[#3158d5] transition-colors block">
                        Add back photo
                      </span>
                      <span style={{ color: "#70746d" }} className="text-[10px] sm:text-[11px] mt-0.5">
                        JPG, PNG or WebP
                      </span>

                      {isMobileDevice ? (
                        /* Mobile-only Action Button: Camera only under Add photo */
                        <div className="flex items-center justify-center mt-2.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTriggerCamera(cIndex, "back");
                            }}
                            style={{
                              backgroundColor: "#3158d5",
                              color: "#ffffff",
                              boxShadow: "0 1px 3px rgba(49, 88, 213, 0.25)",
                              border: "none",
                              outline: "none",
                            }}
                            className="h-8 px-4 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                              <circle cx="12" cy="13" r="3" />
                            </svg>
                            <span>Take photo</span>
                          </button>
                        </div>
                      ) : (
                        /* Desktop-only Action Button: Choose image (NO camera on desktop) */
                        <div className="flex items-center justify-center mt-2.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTriggerUpload(cIndex, "back");
                            }}
                            style={{
                              backgroundColor: "#3158d5",
                              color: "#ffffff",
                              boxShadow: "0 1px 3px rgba(49, 88, 213, 0.25)",
                              border: "none",
                              outline: "none",
                            }}
                            className="h-8 px-4 rounded-lg text-xs font-bold transition hover:bg-[#2546b8] cursor-pointer flex items-center justify-center active:scale-95"
                          >
                            <span>Choose image</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Below slots: Add another card & counter */}
        <div className="flex items-center justify-between pt-1">
          {cards.length < 5 ? (
            <button
              type="button"
              onClick={onAddCard}
              className="text-xs sm:text-[13px] font-bold text-[#3158d5] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>+ Add another card</span>
            </button>
          ) : <div />}
          <span className="text-[11px] sm:text-xs text-[#70746d]">
            Up to 5 cards on a sheet
          </span>
        </div>
      </div>

      {/* DIVIDER LINE */}
      <div style={{ borderBottom: "1px solid #efeee7" }} className="my-3.5" />
      </>
      )}

      {/* RENDER SETTINGS (ALWAYS VISIBLE WHEN NOT SLOTS-ONLY) */}
      {viewMode !== "slots-only" && (
        <div className="space-y-4 pt-1">
          {/* PRINT SETTINGS BOX */}
          <div
            style={{
              borderColor: "#e5e5df",
              borderWidth: "1px",
              borderStyle: "solid",
              backgroundColor: "#fafaf8",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            }}
            className="rounded-2xl p-4 sm:p-5 space-y-4"
          >
            <div
              style={{ borderBottom: "1px solid #efeee7" }}
              className="flex items-center justify-between pb-2"
            >
              <h3 style={{ color: "#1c201a" }} className="text-sm font-bold">Print settings</h3>
              <span style={{ color: "#70746d" }} className="text-xs">Changes update the preview</span>
            </div>

            {/* Card Layout selector: 3 VISUAL CARDS WITH ILLUSTRATIONS */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: "#1c201a" }} className="font-bold">Card layout</span>
                <span style={{ color: "#3158d5" }} className="text-[11px] font-semibold">
                  {layout === "stacked" ? "Stacked" : layout === "side_by_side" ? "Side by side" : "Two pages"}
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: "8px",
                }}
                className="w-full"
              >
                {/* 1. Stacked */}
                <button
                  type="button"
                  onClick={() => onChangeLayout("stacked")}
                  style={{
                    backgroundColor: layout === "stacked" ? "#ffffff" : "#fafaf8",
                    borderColor: layout === "stacked" ? "#3158d5" : "#e5e5df",
                    borderWidth: layout === "stacked" ? "2px" : "1px",
                    borderStyle: "solid",
                    color: layout === "stacked" ? "#3158d5" : "#555a52",
                    boxShadow: layout === "stacked" ? "0 2px 8px rgba(49, 88, 213, 0.12)" : "0 1px 2px rgba(0,0,0,0.02)",
                    outline: "none",
                    minHeight: "72px",
                  }}
                  className="rounded-xl p-2.5 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer hover:border-[#3158d5]/60 group select-none"
                >
                  <svg
                    className="w-8 h-7 shrink-0 transition-transform group-hover:scale-105"
                    viewBox="0 0 32 26"
                    fill="none"
                    stroke="currentColor"
                  >
                    <rect x="2" y="1" width="28" height="24" rx="2.5" strokeWidth="1.3" opacity={layout === "stacked" ? "0.6" : "0.3"} />
                    <rect x="6" y="3.5" width="20" height="8" rx="1.5" strokeWidth="1.5" fill="currentColor" fillOpacity={layout === "stacked" ? "0.35" : "0.08"} />
                    <rect x="6" y="14.5" width="20" height="8" rx="1.5" strokeWidth="1.5" fill="currentColor" fillOpacity={layout === "stacked" ? "0.35" : "0.08"} />
                  </svg>
                  <span className={`text-xs leading-tight ${layout === "stacked" ? "font-bold text-[#3158d5]" : "font-semibold text-[#1c201a]"}`}>
                    Stacked
                  </span>
                </button>

                {/* 2. Side by Side */}
                <button
                  type="button"
                  onClick={() => onChangeLayout("side_by_side")}
                  style={{
                    backgroundColor: layout === "side_by_side" ? "#ffffff" : "#fafaf8",
                    borderColor: layout === "side_by_side" ? "#3158d5" : "#e5e5df",
                    borderWidth: layout === "side_by_side" ? "2px" : "1px",
                    borderStyle: "solid",
                    color: layout === "side_by_side" ? "#3158d5" : "#555a52",
                    boxShadow: layout === "side_by_side" ? "0 2px 8px rgba(49, 88, 213, 0.12)" : "0 1px 2px rgba(0,0,0,0.02)",
                    outline: "none",
                    minHeight: "72px",
                  }}
                  className="rounded-xl p-2.5 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer hover:border-[#3158d5]/60 group select-none"
                >
                  <svg
                    className="w-8 h-7 shrink-0 transition-transform group-hover:scale-105"
                    viewBox="0 0 32 26"
                    fill="none"
                    stroke="currentColor"
                  >
                    <rect x="2" y="1" width="28" height="24" rx="2.5" strokeWidth="1.3" opacity={layout === "side_by_side" ? "0.6" : "0.3"} />
                    <rect x="5" y="5.5" width="9.5" height="15" rx="1.5" strokeWidth="1.5" fill="currentColor" fillOpacity={layout === "side_by_side" ? "0.35" : "0.08"} />
                    <rect x="17.5" y="5.5" width="9.5" height="15" rx="1.5" strokeWidth="1.5" fill="currentColor" fillOpacity={layout === "side_by_side" ? "0.35" : "0.08"} />
                  </svg>
                  <span className={`text-xs leading-tight ${layout === "side_by_side" ? "font-bold text-[#3158d5]" : "font-semibold text-[#1c201a]"}`}>
                    Side by side
                  </span>
                </button>

                {/* 3. Two pages */}
                <button
                  type="button"
                  onClick={() => onChangeLayout("two_pages")}
                  style={{
                    backgroundColor: layout === "two_pages" ? "#ffffff" : "#fafaf8",
                    borderColor: layout === "two_pages" ? "#3158d5" : "#e5e5df",
                    borderWidth: layout === "two_pages" ? "2px" : "1px",
                    borderStyle: "solid",
                    color: layout === "two_pages" ? "#3158d5" : "#555a52",
                    boxShadow: layout === "two_pages" ? "0 2px 8px rgba(49, 88, 213, 0.12)" : "0 1px 2px rgba(0,0,0,0.02)",
                    outline: "none",
                    minHeight: "72px",
                  }}
                  className="rounded-xl p-2.5 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer hover:border-[#3158d5]/60 group select-none"
                >
                  <svg
                    className="w-8 h-7 shrink-0 transition-transform group-hover:scale-105"
                    viewBox="0 0 32 26"
                    fill="none"
                    stroke="currentColor"
                  >
                    <rect x="2" y="1.5" width="12" height="23" rx="2" strokeWidth="1.3" opacity={layout === "two_pages" ? "0.6" : "0.3"} />
                    <rect x="4" y="6" width="8" height="7" rx="1" strokeWidth="1.4" fill="currentColor" fillOpacity={layout === "two_pages" ? "0.35" : "0.08"} />
                    <rect x="18" y="1.5" width="12" height="23" rx="2" strokeWidth="1.3" opacity={layout === "two_pages" ? "0.6" : "0.3"} />
                    <rect x="20" y="6" width="8" height="7" rx="1" strokeWidth="1.4" fill="currentColor" fillOpacity={layout === "two_pages" ? "0.35" : "0.08"} />
                  </svg>
                  <span className={`text-xs leading-tight ${layout === "two_pages" ? "font-bold text-[#3158d5]" : "font-semibold text-[#1c201a]"}`}>
                    Two pages
                  </span>
                </button>
              </div>
            </div>

            {/* Row with Position on page & Card print size side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {/* Position on page */}
              {onChangeTopMargin && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: "#1c201a" }} className="font-bold">Position on page</span>
                    <span style={{ color: "#3158d5" }} className="text-[11px] font-semibold">
                      {topMargin === 30 ? "3 cm" : topMargin === 50 ? "5 cm" : "Center"}
                    </span>
                  </div>
                  <div
                    style={{
                      backgroundColor: "#efeee7",
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: "4px",
                      padding: "4px",
                      minHeight: "50px",
                    }}
                    className="rounded-xl w-full"
                  >
                    <button
                      type="button"
                      onClick={() => onChangeTopMargin(30)}
                      style={{
                        backgroundColor: topMargin === 30 ? "#ffffff" : "transparent",
                        color: topMargin === 30 ? "#3158d5" : "#555a52",
                        boxShadow: topMargin === 30 ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                        border: "none",
                        outline: "none",
                        minHeight: "42px",
                      }}
                      className="h-10.5 sm:h-11 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center whitespace-nowrap"
                    >
                      Top (3 cm)
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeTopMargin(50)}
                      style={{
                        backgroundColor: topMargin === 50 ? "#ffffff" : "transparent",
                        color: topMargin === 50 ? "#3158d5" : "#555a52",
                        boxShadow: topMargin === 50 ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                        border: "none",
                        outline: "none",
                        minHeight: "42px",
                      }}
                      className="h-10.5 sm:h-11 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center whitespace-nowrap"
                    >
                      Top (5 cm)
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeTopMargin(0)}
                      style={{
                        backgroundColor: topMargin === 0 ? "#ffffff" : "transparent",
                        color: topMargin === 0 ? "#3158d5" : "#555a52",
                        boxShadow: topMargin === 0 ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                        border: "none",
                        outline: "none",
                        minHeight: "42px",
                      }}
                      className="h-10.5 sm:h-11 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center whitespace-nowrap"
                    >
                      Center
                    </button>
                  </div>
                </div>
              )}

              {/* Card print size */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: "#1c201a" }} className="font-bold">Card print size</span>
                  <span style={{ color: "#3158d5" }} className="text-[11px] font-semibold">
                    {(85.6 * scale).toFixed(1)} × {(54 * scale).toFixed(1)} mm
                  </span>
                </div>
                <div
                  style={{
                    backgroundColor: "#efeee7",
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: "4px",
                    padding: "4px",
                    minHeight: "50px",
                  }}
                  className="rounded-xl w-full"
                >
                  <button
                    type="button"
                    onClick={() => onChangeScale(1)}
                    style={{
                      backgroundColor: scale === 1 ? "#ffffff" : "transparent",
                      color: scale === 1 ? "#3158d5" : "#555a52",
                      boxShadow: scale === 1 ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                      border: "none",
                      outline: "none",
                      minHeight: "42px",
                    }}
                    className="h-10.5 sm:h-11 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center whitespace-nowrap"
                  >
                    1:1 Real size
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeScale(1.25)}
                    style={{
                      backgroundColor: scale === 1.25 ? "#ffffff" : "transparent",
                      color: scale === 1.25 ? "#3158d5" : "#555a52",
                      boxShadow: scale === 1.25 ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                      border: "none",
                      outline: "none",
                      minHeight: "42px",
                    }}
                    className="h-10.5 sm:h-11 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center whitespace-nowrap"
                  >
                    +125%
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeScale(1.5)}
                    style={{
                      backgroundColor: scale === 1.5 ? "#ffffff" : "transparent",
                      color: scale === 1.5 ? "#3158d5" : "#555a52",
                      boxShadow: scale === 1.5 ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                      border: "none",
                      outline: "none",
                      minHeight: "42px",
                    }}
                    className="h-10.5 sm:h-11 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center whitespace-nowrap"
                  >
                    ++150%
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ADVANCED PRINT SETTINGS: DISTINCT BORDERED BOX, PERMANENTLY OPEN */}
          <div
            style={{
              borderColor: "#e5e5df",
              borderWidth: "1px",
              borderStyle: "solid",
              backgroundColor: "#fafaf8",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            }}
            className="rounded-2xl p-4 sm:p-5 space-y-4 mt-3.5 shadow-2xs"
          >
            <div
              style={{ borderBottom: "1px solid #efeee7" }}
              className="flex items-center justify-between pb-2"
            >
              <h3 style={{ color: "#1c201a" }} className="text-sm font-bold">Advanced print settings</h3>
              <span style={{ color: "#70746d" }} className="text-xs">Paper &amp; security</span>
            </div>

            {/* Paper & Orientation */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label style={{ color: "#1c201a" }} className="text-xs font-bold block">Paper</label>
                <div
                  style={{
                    backgroundColor: "#efeee7",
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: "4px",
                    padding: "4px",
                    minHeight: "50px",
                  }}
                  className="rounded-xl w-full"
                >
                  <button
                    type="button"
                    onClick={() => onChangePaper("A4")}
                    style={{
                      backgroundColor: paper === "A4" ? "#ffffff" : "transparent",
                      color: paper === "A4" ? "#3158d5" : "#555a52",
                      boxShadow: paper === "A4" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                      border: "none",
                      outline: "none",
                      minHeight: "42px",
                    }}
                    className="h-10.5 sm:h-11 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center"
                  >
                    A4
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangePaper("Letter")}
                    style={{
                      backgroundColor: paper === "Letter" ? "#ffffff" : "transparent",
                      color: paper === "Letter" ? "#3158d5" : "#555a52",
                      boxShadow: paper === "Letter" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                      border: "none",
                      outline: "none",
                      minHeight: "42px",
                    }}
                    className="h-10.5 sm:h-11 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center"
                  >
                    Letter
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label style={{ color: "#1c201a" }} className="text-xs font-bold block">Orientation</label>
                <div
                  style={{
                    backgroundColor: "#efeee7",
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: "4px",
                    padding: "4px",
                    minHeight: "50px",
                  }}
                  className="rounded-xl w-full"
                >
                  <button
                    type="button"
                    onClick={() => onChangeOrient("portrait")}
                    style={{
                      backgroundColor: orient === "portrait" ? "#ffffff" : "transparent",
                      color: orient === "portrait" ? "#3158d5" : "#555a52",
                      boxShadow: orient === "portrait" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                      border: "none",
                      outline: "none",
                      minHeight: "42px",
                    }}
                    className="h-10.5 sm:h-11 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                    title="Portrait"
                  >
                    <svg className="w-3.5 h-4" viewBox="0 0 14 18" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <rect x="1.5" y="1.5" width="11" height="15" rx="2" />
                      <line x1="4" y1="5.5" x2="10" y2="5.5" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <span>Portrait</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeOrient("landscape")}
                    style={{
                      backgroundColor: orient === "landscape" ? "#ffffff" : "transparent",
                      color: orient === "landscape" ? "#3158d5" : "#555a52",
                      boxShadow: orient === "landscape" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                      border: "none",
                      outline: "none",
                      minHeight: "42px",
                    }}
                    className="h-10.5 sm:h-11 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                    title="Landscape"
                  >
                    <svg className="w-4 h-3.5" viewBox="0 0 18 14" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <rect x="1.5" y="1.5" width="15" height="11" rx="2" />
                      <line x1="5" y1="4.5" x2="13" y2="4.5" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <span>Landscape</span>
                  </button>
                </div>
              </div>
            </div>


            {/* Security Watermark card */}
            <div
              style={{
                borderColor: "#e5e5df",
                borderWidth: "1px",
                borderStyle: "solid",
                backgroundColor: "#ffffff",
              }}
              className="rounded-xl p-3.5 space-y-2.5 shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    style={{ backgroundColor: "#eef4ff", color: "#3158d5" }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: "#1c201a" }} className="text-xs font-bold">Security watermark</span>
                      <span
                        style={{
                          backgroundColor: "#ecfdf5",
                          borderColor: "#a7f3d0",
                          borderWidth: "1px",
                          borderStyle: "solid",
                          color: "#047857",
                        }}
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      >
                        Anti-fraud
                      </span>
                    </div>
                    <p style={{ color: "#70746d" }} className="text-[11px] mt-0.5">Helps protect copies against misuse</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={watermarkEnabled}
                  onClick={() => onChangeWatermarkEnabled(!watermarkEnabled)}
                  style={{
                    backgroundColor: watermarkEnabled ? "#3158d5" : "#e5e5df",
                    border: "none",
                    outline: "none",
                    boxShadow: "none",
                    padding: "2px",
                  }}
                  className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-0"
                >
                  <span
                    style={{
                      transform: watermarkEnabled ? "translateX(20px)" : "translateX(0px)",
                      border: "none",
                      outline: "none",
                    }}
                    className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out"
                  />
                </button>
              </div>
              {watermarkEnabled && (
                <div style={{ borderTop: "1px solid #efeee7" }} className="pt-2 space-y-2">
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => onChangeWatermarkText(e.target.value)}
                    placeholder="For verification only"
                    style={{
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      backgroundColor: "#ffffff",
                      color: "#1c201a",
                    }}
                    className="w-full text-xs px-3 py-2 rounded-lg outline-none focus:border-[#3158d5]"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {WATERMARK_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => onChangeWatermarkText(preset)}
                        style={{
                          backgroundColor: watermarkText === preset ? "#e8effe" : "#efeee7",
                          color: watermarkText === preset ? "#3158d5" : "#555a52",
                          border: "none",
                          outline: "none",
                          boxShadow: "none",
                        }}
                        className="text-[10px] font-semibold px-2.5 py-1 rounded-md transition cursor-pointer hover:bg-[#e4e3dc]"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
