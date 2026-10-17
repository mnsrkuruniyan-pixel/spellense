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
          {/* TOP HEADER */}
          <div className="flex items-center justify-between pb-3 sm:pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
                <svg className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <rect x="2" y="5" width="20" height="14" rx="3" />
                  <circle cx="8" cy="11" r="2.5" />
                  <path d="M4 17a4 4 0 0 1 8 0" />
                  <line x1="14" y1="10" x2="19" y2="10" strokeLinecap="round" />
                  <line x1="14" y1="13" x2="17" y2="13" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">ID Card Copy</h2>
                <span className="text-[11px] sm:text-xs text-slate-400">
                  {cards.length} {cards.length === 1 ? "card" : "cards"} · Standard ID (85.6 × 54 mm)
                </span>
              </div>
            </div>

            {hasAnyImages && (
              <button
                type="button"
                onClick={() => {
                  setActiveToolbarSlot(null);
                  onClearAllCards();
                }}
                className="text-xs font-semibold text-rose-500 hover:text-rose-700 transition cursor-pointer px-2 py-1 rounded-lg hover:bg-rose-50"
              >
                Clear all
              </button>
            )}
          </div>

          {/* FIRST-TIME INTERACTION HINT */}
          {!hasOpenedToolbar && hasAnyImages && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-blue-50/90 border border-blue-200/80 text-blue-900 text-xs font-medium animate-in fade-in duration-200 shadow-2xs">
              <svg className="w-4 h-4 text-[#0055fe] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>Tap or click the photo to show editing options.</span>
            </div>
          )}

          {/* SCANNING TOAST */}
          {isScanning && (
            <div className="rounded-xl bg-blue-50/90 border border-blue-200/80 px-3 py-2 sm:px-3.5 sm:py-2.5 flex items-center gap-2 text-xs font-bold text-[#0055fe] animate-pulse">
              <svg className="animate-spin h-3.5 w-3.5 shrink-0 text-[#0055fe]" viewBox="0 0 24 24" fill="none">
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
                <div key={card.id || cIndex} className="space-y-2.5">
                  {/* Card Title & Swap Action */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="h-5 w-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-black">
                        {cIndex + 1}
                      </span>
                      <span>ID Card {cards.length > 1 ? `#${cIndex + 1}` : ""}</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      {(card.frontUrl || card.backUrl) && (
                        <button
                          type="button"
                          onClick={() => handleSwapFrontBack(cIndex)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-[#0055fe] bg-slate-100 hover:bg-blue-50 px-2 py-0.5 rounded-lg transition cursor-pointer"
                          title="Swap front and back"
                        >
                          <span>⇄</span>
                          <span>Swap</span>
                        </button>
                      )}

                      {cards.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onRemoveCard(cIndex)}
                          className="text-[11px] text-rose-500 hover:text-rose-700 font-bold px-1.5 py-0.5 rounded-md hover:bg-rose-50 transition cursor-pointer"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Front & Back Slots - 2 columns side by side on mobile & tablet */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-3.5">
                    {/* FRONT SLOT */}
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center justify-between text-xs px-0.5">
                        <span className="font-bold text-slate-800 text-[11px] sm:text-xs">Front</span>
                        {card.frontUrl ? (
                          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                            <span>✓</span> Ready
                          </span>
                        ) : (
                          <span className="text-[9px] sm:text-[10px] font-bold text-[#0055fe] bg-blue-50 border border-blue-200/70 px-1.5 sm:px-2 py-0.2 rounded-full">
                            Required
                          </span>
                        )}
                      </div>

                  {card.frontUrl ? (
                    <div className="space-y-1.5" data-slot-id={`${cIndex}-front`}>
                      {/* Compact toolbar directly above the image */}
                      {activeToolbarSlot?.cardIndex === cIndex && activeToolbarSlot?.side === "front" && (
                        <div
                          role="toolbar"
                          aria-label="Front card actions"
                          className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-50/90 rounded-lg border border-slate-200 shadow-2xs animate-in fade-in duration-150"
                        >
                          <button
                            type="button"
                            onClick={() => onAdjustCard(cIndex, "front")}
                            className="h-8 px-2 rounded-md bg-white hover:bg-slate-100 border border-slate-200/90 text-slate-700 hover:text-slate-900 text-[11px] font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs select-none min-w-0 w-full"
                            title="Adjust corners / Crop"
                          >
                            <svg className="w-3.5 h-3.5 shrink-0 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                            <span className="whitespace-nowrap">Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRotateSide(cIndex, "front")}
                            className="h-8 px-2 rounded-md bg-white hover:bg-slate-100 border border-slate-200/90 text-slate-700 hover:text-slate-900 text-[11px] font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs select-none min-w-0 w-full"
                            title="Rotate 90 degrees"
                          >
                            <svg className="w-3.5 h-3.5 shrink-0 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                              <polyline points="21 3 21 8 16 8" />
                            </svg>
                            <span className="whitespace-nowrap">Rotate</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTriggerUpload(cIndex, "front")}
                            className="h-8 px-2 rounded-md bg-white hover:bg-slate-100 border border-slate-200/90 text-slate-700 hover:text-slate-900 text-[11px] font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs select-none min-w-0 w-full"
                            title="Replace photo"
                          >
                            <svg className="w-3.5 h-3.5 shrink-0 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span className="whitespace-nowrap">Replace</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveToolbarSlot(null);
                              handleRemoveSide(cIndex, "front");
                            }}
                            className="h-8 px-2 rounded-md bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 hover:text-rose-700 text-[11px] font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs select-none min-w-0 w-full"
                            title="Remove"
                          >
                            <svg className="w-3.5 h-3.5 shrink-0 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                            <span className="whitespace-nowrap">Remove</span>
                          </button>
                        </div>
                      )}

                      {/* Card photo container - click or tap toggles toolbar */}
                      <div
                        role="button"
                        tabIndex={0}
                        aria-label={`Front card photo: click or tap to ${activeToolbarSlot?.cardIndex === cIndex && activeToolbarSlot?.side === "front" ? "hide" : "show"} editing toolbar`}
                        aria-expanded={activeToolbarSlot?.cardIndex === cIndex && activeToolbarSlot?.side === "front"}
                        onClick={() => handleToggleToolbar(cIndex, "front")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleToggleToolbar(cIndex, "front");
                          }
                        }}
                        className={`block relative rounded-lg bg-slate-900 overflow-hidden shadow-xs border transition cursor-pointer select-none group focus:outline-none focus:ring-2 focus:ring-[#0055fe] ${
                          activeToolbarSlot?.cardIndex === cIndex && activeToolbarSlot?.side === "front"
                            ? "ring-2 ring-[#0055fe] border-[#0055fe]"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                        style={{ aspectRatio: "85.6 / 54" }}
                      >
                        <img
                          key={card.frontUrl}
                          src={card.frontUrl}
                          alt={`Card ${cIndex + 1} Front`}
                          className="w-full h-full object-cover block pointer-events-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div
                      className="min-h-[105px] sm:min-h-[120px] rounded-lg border border-dashed border-slate-200/90 bg-[#f8fafc] hover:bg-slate-50 transition p-2 sm:p-3 flex flex-col items-center justify-center gap-1.5 sm:gap-2 text-center group w-full"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <circle cx="8" cy="11" r="2.2" />
                        <path d="M4 17a4 4 0 0 1 8 0" />
                        <line x1="14" y1="10" x2="19" y2="10" strokeLinecap="round" />
                        <line x1="14" y1="13" x2="17" y2="13" strokeLinecap="round" />
                      </svg>
                      <span className="text-[11px] sm:text-xs font-semibold text-slate-600">Front of Card</span>

                      {/* Side by side Camera & Upload on tablet; stacked on mobile; Upload only on desktop */}
                      <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-1 gap-1 w-full max-w-[145px] sm:max-w-[185px] lg:max-w-[125px] pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleTriggerCamera(cIndex, "front")}
                          className="lg:hidden h-7 px-2 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-blue-600 text-[11px] font-semibold shadow-2xs transition cursor-pointer flex items-center justify-center gap-1 min-w-0"
                          title="Capture using camera"
                        >
                          <svg className="w-3.5 h-3.5 shrink-0 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="12" cy="13" r="4" />
                          </svg>
                          <span className="whitespace-nowrap font-semibold">Camera</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTriggerUpload(cIndex, "front")}
                          className="h-7 px-2 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-blue-600 text-[11px] font-semibold shadow-2xs transition cursor-pointer flex items-center justify-center gap-1.5 min-w-0 w-full"
                          title="Upload image"
                        >
                          <svg className="w-3.5 h-3.5 shrink-0 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                            <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
                            <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" />
                          </svg>
                          <span className="whitespace-nowrap font-semibold">Upload</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* BACK SLOT */}
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center justify-between text-xs px-0.5">
                    <span className="font-bold text-slate-800">Back side</span>
                    {card.backUrl ? (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                        <span>✓</span> Ready
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400">
                        Optional
                      </span>
                    )}
                  </div>

                  {card.backUrl ? (
                    <div className="space-y-1.5" data-slot-id={`${cIndex}-back`}>
                      {/* Compact toolbar directly above the image */}
                      {activeToolbarSlot?.cardIndex === cIndex && activeToolbarSlot?.side === "back" && (
                        <div
                          role="toolbar"
                          aria-label="Back card actions"
                          className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-50/90 rounded-lg border border-slate-200 shadow-2xs animate-in fade-in duration-150"
                        >
                          <button
                            type="button"
                            onClick={() => onAdjustCard(cIndex, "back")}
                            className="h-8 px-2 rounded-md bg-white hover:bg-slate-100 border border-slate-200/90 text-slate-700 hover:text-slate-900 text-[11px] font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs select-none min-w-0 w-full"
                            title="Adjust corners / Crop"
                          >
                            <svg className="w-3.5 h-3.5 shrink-0 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                            <span className="whitespace-nowrap">Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRotateSide(cIndex, "back")}
                            className="h-8 px-2 rounded-md bg-white hover:bg-slate-100 border border-slate-200/90 text-slate-700 hover:text-slate-900 text-[11px] font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs select-none min-w-0 w-full"
                            title="Rotate 90 degrees"
                          >
                            <svg className="w-3.5 h-3.5 shrink-0 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                              <polyline points="21 3 21 8 16 8" />
                            </svg>
                            <span className="whitespace-nowrap">Rotate</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTriggerUpload(cIndex, "back")}
                            className="h-8 px-2 rounded-md bg-white hover:bg-slate-100 border border-slate-200/90 text-slate-700 hover:text-slate-900 text-[11px] font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs select-none min-w-0 w-full"
                            title="Replace photo"
                          >
                            <svg className="w-3.5 h-3.5 shrink-0 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span className="whitespace-nowrap">Replace</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveToolbarSlot(null);
                              handleRemoveSide(cIndex, "back");
                            }}
                            className="h-8 px-2 rounded-md bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 hover:text-rose-700 text-[11px] font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs select-none min-w-0 w-full"
                            title="Remove"
                          >
                            <svg className="w-3.5 h-3.5 shrink-0 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                            <span className="whitespace-nowrap">Remove</span>
                          </button>
                        </div>
                      )}

                      {/* Card photo container - click or tap toggles toolbar */}
                      <div
                        role="button"
                        tabIndex={0}
                        aria-label={`Back card photo: click or tap to ${activeToolbarSlot?.cardIndex === cIndex && activeToolbarSlot?.side === "back" ? "hide" : "show"} editing toolbar`}
                        aria-expanded={activeToolbarSlot?.cardIndex === cIndex && activeToolbarSlot?.side === "back"}
                        onClick={() => handleToggleToolbar(cIndex, "back")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleToggleToolbar(cIndex, "back");
                          }
                        }}
                        className={`block relative rounded-lg bg-slate-900 overflow-hidden shadow-xs border transition cursor-pointer select-none group focus:outline-none focus:ring-2 focus:ring-[#0055fe] ${
                          activeToolbarSlot?.cardIndex === cIndex && activeToolbarSlot?.side === "back"
                            ? "ring-2 ring-[#0055fe] border-[#0055fe]"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                        style={{ aspectRatio: "85.6 / 54" }}
                      >
                        <img
                          key={card.backUrl}
                          src={card.backUrl}
                          alt={`Card ${cIndex + 1} Back`}
                          className="w-full h-full object-cover block pointer-events-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div
                      className="min-h-[105px] sm:min-h-[120px] rounded-lg border border-dashed border-slate-200/90 bg-[#f8fafc] hover:bg-slate-50 transition p-2 sm:p-3 flex flex-col items-center justify-center gap-1.5 sm:gap-2 text-center group w-full"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <line x1="2" y1="9" x2="22" y2="9" strokeWidth="1.5" />
                        <line x1="6" y1="13" x2="11" y2="13" strokeWidth="1.5" strokeLinecap="round" />
                        <line x1="6" y1="15.5" x2="9" y2="15.5" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      <span className="text-[11px] sm:text-xs font-semibold text-slate-600">Back of Card</span>

                      {/* Side by side Camera & Upload on tablet; stacked on mobile; Upload only on desktop */}
                      <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-1 gap-1 w-full max-w-[145px] sm:max-w-[185px] lg:max-w-[125px] pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleTriggerCamera(cIndex, "back")}
                          className="lg:hidden h-7 px-2 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-blue-600 text-[11px] font-semibold shadow-2xs transition cursor-pointer flex items-center justify-center gap-1 min-w-0"
                          title="Capture using camera"
                        >
                          <svg className="w-3.5 h-3.5 shrink-0 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="12" cy="13" r="4" />
                          </svg>
                          <span className="whitespace-nowrap font-semibold">Camera</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTriggerUpload(cIndex, "back")}
                          className="h-7 px-2 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-blue-600 text-[11px] font-semibold shadow-2xs transition cursor-pointer flex items-center justify-center gap-1.5 min-w-0 w-full"
                          title="Upload image"
                        >
                          <svg className="w-3.5 h-3.5 shrink-0 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                            <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
                            <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" />
                          </svg>
                          <span className="whitespace-nowrap font-semibold">Upload</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Another Card Button */}
        {cards.length < 5 && (
          <button
            type="button"
            onClick={onAddCard}
            className="w-full h-9 sm:h-10 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs mt-3.5"
          >
            <span className="text-sm font-bold">+</span>
            <span>Add another card ({cards.length}/5)</span>
          </button>
        )}
      </div>
      </>
      )}

      {/* RENDER SETTINGS WHEN NOT SLOTS-ONLY */}
      {viewMode !== "slots-only" && (
        <div className="space-y-4 pt-1">
          {viewMode === "settings-only" && (
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">Print Settings</h3>
                  <span className="text-[11px] text-slate-400">Card size, placement & watermark</span>
                </div>
              </div>
            </div>
          )}

          {hasAnyImages || viewMode === "settings-only" ? (
          <div className="space-y-4 animate-in fade-in">
          {/* SECTION: PRINT LAYOUT */}
          <div className="space-y-4 pt-1">
        {/* Card Layout selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800">Card Layout</label>
          <div className="grid grid-cols-3 gap-2">
            {/* 1. Stacked */}
            <button
              type="button"
              onClick={() => onChangeLayout("stacked")}
              style={
                layout === "stacked"
                  ? { backgroundColor: "#0055fe", borderColor: "#0055fe", color: "#ffffff" }
                  : {}
              }
              className={`p-2.5 rounded-lg flex flex-col items-center justify-center gap-1.5 transition cursor-pointer text-center border ${
                layout === "stacked"
                  ? "bg-blue-600 border-blue-600 text-white font-bold shadow-md shadow-blue-600/20 ring-1 ring-blue-600/20"
                  : "border-slate-200/90 bg-white text-slate-700 hover:text-slate-900 hover:border-slate-300 font-medium hover:bg-slate-50"
              }`}
            >
              <svg
                className={`w-7 h-6 shrink-0 ${layout === "stacked" ? "text-white" : "text-slate-500"}`}
                viewBox="0 0 32 26"
                fill="none"
                stroke="currentColor"
              >
                <rect x="2" y="1" width="28" height="24" rx="2.5" strokeWidth="1.25" opacity={layout === "stacked" ? "0.6" : "0.25"} />
                <rect x="6" y="3.5" width="20" height="8" rx="1.5" strokeWidth="1.5" fill="currentColor" fillOpacity={layout === "stacked" ? "0.35" : "0.08"} />
                <rect x="6" y="14.5" width="20" height="8" rx="1.5" strokeWidth="1.5" fill="currentColor" fillOpacity={layout === "stacked" ? "0.35" : "0.08"} />
              </svg>
              <span className={`text-[11px] leading-tight ${layout === "stacked" ? "text-white font-bold" : "text-slate-700 font-medium"}`}>
                Stacked
              </span>
            </button>

            {/* 2. Side by Side */}
            <button
              type="button"
              onClick={() => onChangeLayout("side_by_side")}
              style={
                layout === "side_by_side"
                  ? { backgroundColor: "#0055fe", borderColor: "#0055fe", color: "#ffffff" }
                  : {}
              }
              className={`p-2.5 rounded-lg flex flex-col items-center justify-center gap-1.5 transition cursor-pointer text-center border ${
                layout === "side_by_side"
                  ? "bg-blue-600 border-blue-600 text-white font-bold shadow-md shadow-blue-600/20 ring-1 ring-blue-600/20"
                  : "border-slate-200/90 bg-white text-slate-700 hover:text-slate-900 hover:border-slate-300 font-medium hover:bg-slate-50"
              }`}
            >
              <svg
                className={`w-7 h-6 shrink-0 ${layout === "side_by_side" ? "text-white" : "text-slate-500"}`}
                viewBox="0 0 32 26"
                fill="none"
                stroke="currentColor"
              >
                <rect x="2" y="1" width="28" height="24" rx="2.5" strokeWidth="1.25" opacity={layout === "side_by_side" ? "0.6" : "0.25"} />
                <rect x="5" y="5.5" width="9.5" height="15" rx="1.5" strokeWidth="1.5" fill="currentColor" fillOpacity={layout === "side_by_side" ? "0.35" : "0.08"} />
                <rect x="17.5" y="5.5" width="9.5" height="15" rx="1.5" strokeWidth="1.5" fill="currentColor" fillOpacity={layout === "side_by_side" ? "0.35" : "0.08"} />
              </svg>
              <span className={`text-[11px] leading-tight ${layout === "side_by_side" ? "text-white font-bold" : "text-slate-700 font-medium"}`}>
                Side by side
              </span>
            </button>

            {/* 3. Two pages */}
            <button
              type="button"
              onClick={() => onChangeLayout("two_pages")}
              style={
                layout === "two_pages"
                  ? { backgroundColor: "#0055fe", borderColor: "#0055fe", color: "#ffffff" }
                  : {}
              }
              className={`p-2.5 rounded-lg flex flex-col items-center justify-center gap-1.5 transition cursor-pointer text-center border ${
                layout === "two_pages"
                  ? "bg-blue-600 border-blue-600 text-white font-bold shadow-md shadow-blue-600/20 ring-1 ring-blue-600/20"
                  : "border-slate-200/90 bg-white text-slate-700 hover:text-slate-900 hover:border-slate-300 font-medium hover:bg-slate-50"
              }`}
            >
              <svg
                className={`w-7 h-6 shrink-0 ${layout === "two_pages" ? "text-white" : "text-slate-500"}`}
                viewBox="0 0 32 26"
                fill="none"
                stroke="currentColor"
              >
                <rect x="2" y="1.5" width="12" height="23" rx="2" strokeWidth="1.25" opacity={layout === "two_pages" ? "0.6" : "0.3"} />
                <rect x="4" y="6" width="8" height="7" rx="1" strokeWidth="1.4" fill="currentColor" fillOpacity={layout === "two_pages" ? "0.35" : "0.08"} />
                <rect x="18" y="1.5" width="12" height="23" rx="2" strokeWidth="1.25" opacity={layout === "two_pages" ? "0.6" : "0.3"} />
                <rect x="20" y="6" width="8" height="7" rx="1" strokeWidth="1.4" fill="currentColor" fillOpacity={layout === "two_pages" ? "0.35" : "0.08"} />
              </svg>
              <span className={`text-[11px] leading-tight ${layout === "two_pages" ? "text-white font-bold" : "text-slate-700 font-medium"}`}>
                Two pages
              </span>
            </button>
          </div>
        </div>

        {/* Position on page */}
        {onChangeTopMargin && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span>Position on Page</span>
              <span className="text-[11px] font-semibold text-[#0055fe]">
                {topMargin === 30 ? "3 cm from top" : topMargin === 50 ? "5 cm from top" : "Centered"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-100/90 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => onChangeTopMargin(30)}
                style={topMargin === 30 ? { backgroundColor: "#0055fe", color: "#ffffff" } : {}}
                className={`py-1.5 rounded-md text-xs transition cursor-pointer font-bold ${
                  topMargin === 30
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-200/50"
                }`}
              >
                Top (3 cm)
              </button>
              <button
                type="button"
                onClick={() => onChangeTopMargin(50)}
                style={topMargin === 50 ? { backgroundColor: "#0055fe", color: "#ffffff" } : {}}
                className={`py-1.5 rounded-md text-xs transition cursor-pointer font-bold ${
                  topMargin === 50
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-200/50"
                }`}
              >
                Top (5 cm)
              </button>
              <button
                type="button"
                onClick={() => onChangeTopMargin(0)}
                style={topMargin === 0 ? { backgroundColor: "#0055fe", color: "#ffffff" } : {}}
                className={`py-1.5 rounded-md text-xs transition cursor-pointer font-bold ${
                  topMargin === 0
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-200/50"
                }`}
              >
                Center
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CARD SIZE remains a common setting; less-used print options are collapsed below. */}
      <div className="space-y-3.5 pt-3 border-t border-slate-100">
        {/* Size scale */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span>Card Print Size</span>
            <span className="text-[11px] font-mono font-bold text-[#0055fe]">
              {(85.6 * scale).toFixed(1)} × {(54 * scale).toFixed(1)} mm
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 bg-slate-100/90 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => onChangeScale(1)}
              style={scale === 1 ? { backgroundColor: "#0055fe", color: "#ffffff" } : {}}
              className={`py-1.5 rounded-md text-xs transition cursor-pointer font-bold ${
                scale === 1
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-200/50"
              }`}
            >
              1:1 Real size
            </button>
            <button
              type="button"
              onClick={() => onChangeScale(1.25)}
              style={scale === 1.25 ? { backgroundColor: "#0055fe", color: "#ffffff" } : {}}
              className={`py-1.5 rounded-md text-xs transition cursor-pointer font-bold ${
                scale === 1.25
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-200/50"
              }`}
            >
              + 125%
            </button>
            <button
              type="button"
              onClick={() => onChangeScale(1.5)}
              style={scale === 1.5 ? { backgroundColor: "#0055fe", color: "#ffffff" } : {}}
              className={`py-1.5 rounded-md text-xs transition cursor-pointer font-bold ${
                scale === 1.5
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-200/50"
              }`}
            >
              ++ 150%
            </button>
          </div>
        </div>
      </div>

      <details className="group rounded-lg border border-slate-200 bg-slate-50/60">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-bold text-slate-800 [&::-webkit-details-marker]:hidden">
          <span>Advanced print settings</span>
          <svg className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
        </summary>
        <div className="space-y-4 border-t border-slate-200 px-3 py-4 sm:px-4">
        {/* Paper & Orientation */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800">Paper</label>
            <div className="grid grid-cols-2 gap-1 bg-slate-100/90 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => onChangePaper("A4")}
                style={paper === "A4" ? { backgroundColor: "#0055fe", color: "#ffffff" } : {}}
                className={`h-7.5 rounded-md text-xs transition cursor-pointer font-bold flex items-center justify-center ${
                  paper === "A4"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-200/50"
                }`}
              >
                A4
              </button>
              <button
                type="button"
                onClick={() => onChangePaper("Letter")}
                style={paper === "Letter" ? { backgroundColor: "#0055fe", color: "#ffffff" } : {}}
                className={`h-7.5 rounded-md text-xs transition cursor-pointer font-bold flex items-center justify-center ${
                  paper === "Letter"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-200/50"
                }`}
              >
                Letter
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800">Orientation</label>
            <div className="grid grid-cols-2 gap-1 bg-slate-100/90 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => onChangeOrient("portrait")}
                style={orient === "portrait" ? { backgroundColor: "#0055fe", color: "#ffffff" } : {}}
                className={`h-7.5 rounded-md text-xs transition cursor-pointer font-bold flex items-center justify-center ${
                  orient === "portrait"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-200/50"
                }`}
                title="Portrait"
                aria-label="Portrait orientation"
              >
                <svg className="w-3.5 h-4.5" viewBox="0 0 14 18" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <rect x="1.5" y="1.5" width="11" height="15" rx="2" />
                  <line x1="4" y1="5.5" x2="10" y2="5.5" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="4" y1="8.5" x2="8" y2="8.5" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => onChangeOrient("landscape")}
                style={orient === "landscape" ? { backgroundColor: "#0055fe", color: "#ffffff" } : {}}
                className={`h-7.5 rounded-md text-xs transition cursor-pointer font-bold flex items-center justify-center ${
                  orient === "landscape"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-200/50"
                }`}
                title="Landscape"
                aria-label="Landscape orientation"
              >
                <svg className="w-4.5 h-3.5" viewBox="0 0 18 14" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <rect x="1.5" y="1.5" width="15" height="11" rx="2" />
                  <line x1="5" y1="4.5" x2="13" y2="4.5" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="5" y1="7.5" x2="10" y2="7.5" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Cut Guides */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800">Cut Guides</label>
          <div className="grid grid-cols-3 gap-1.5 bg-slate-100/90 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => onChangeCutGuide("none")}
              style={cutGuide === "none" ? { backgroundColor: "#0055fe", color: "#ffffff" } : {}}
              className={`py-1.5 rounded-md text-xs transition cursor-pointer font-bold ${
                cutGuide === "none"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-200/50"
              }`}
            >
              None
            </button>
            <button
              type="button"
              onClick={() => onChangeCutGuide("marks")}
              style={cutGuide === "marks" ? { backgroundColor: "#0055fe", color: "#ffffff" } : {}}
              className={`py-1.5 rounded-md text-xs transition cursor-pointer font-bold ${
                cutGuide === "marks"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-200/50"
              }`}
            >
              Corners
            </button>
            <button
              type="button"
              onClick={() => onChangeCutGuide("lines")}
              style={cutGuide === "lines" ? { backgroundColor: "#0055fe", color: "#ffffff" } : {}}
              className={`py-1.5 rounded-md text-xs transition cursor-pointer font-bold ${
                cutGuide === "lines"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-200/50"
              }`}
            >
              Lines
            </button>
          </div>
        </div>

      {/* SECTION: ANTI-FRAUD SECURITY WATERMARK */}
      <div className="rounded-lg border border-slate-200/90 bg-white p-3.5 space-y-2.5">
        <button
          type="button"
          role="switch"
          aria-checked={watermarkEnabled}
          onClick={() => onChangeWatermarkEnabled(!watermarkEnabled)}
          className="w-full flex items-center justify-between text-left cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <div className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors ${watermarkEnabled ? "bg-blue-100 text-[#0055fe]" : "bg-slate-200/70 text-slate-500"}`}>
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                <path d="M10 2l7 3v5c0 4.5-3 8-7 9-4-1-7-4.5-7-9V5l7-3z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span>Security Watermark</span>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-md">Anti-fraud</span>
              </div>
              <p className="text-[11px] text-slate-500 font-normal">Protects against misuse & identity theft</p>
            </div>
          </div>

          <div
            style={watermarkEnabled ? { backgroundColor: "#0055fe" } : {}}
            className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 flex items-center p-0.5 pointer-events-none ${watermarkEnabled ? "bg-blue-600" : "bg-slate-300"}`}
          >
            <div className={`w-4.5 h-4.5 rounded-full bg-white shadow-xs transition-transform duration-200 ${watermarkEnabled ? "translate-x-4.5" : "translate-x-0"}`} />
          </div>
        </button>

        {watermarkEnabled && (
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <input
              type="text"
              value={watermarkText}
              onChange={(e) => onChangeWatermarkText(e.target.value)}
              placeholder="Enter custom watermark text"
              maxLength={45}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-[#0055fe] focus:outline-hidden shadow-2xs"
            />
            <div className="flex flex-wrap gap-1.5">
              {WATERMARK_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onChangeWatermarkText(preset)}
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-md transition cursor-pointer border shadow-2xs ${
                    watermarkText === preset
                      ? "bg-blue-50 text-[#0055fe] border-blue-200 font-bold"
                      : "bg-white text-slate-600 hover:text-[#0055fe] border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
        </div>
      </details>
      </div>
      ) : (
        <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-3.5 flex items-start gap-2.5 text-xs text-slate-600 mt-4">
          <svg className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>Add a card photo to show the print layout and size options.</span>
        </div>
      )}
        </div>
      )}
    </div>
  );
}
