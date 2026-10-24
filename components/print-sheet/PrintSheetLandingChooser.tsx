"use client";

import React, { useState } from "react";

interface PrintSheetLandingChooserProps {
  onSelectMode: (mode: "photos" | "id") => void;
  onDropPhotos: (files: FileList) => void;
  hasSavedSettings?: boolean;
}

export default function PrintSheetLandingChooser({
  onSelectMode,
  onDropPhotos,
  hasSavedSettings,
}: PrintSheetLandingChooserProps) {
  const [isDraggingPhotos, setIsDraggingPhotos] = useState(false);

  return (
    <div className="mx-auto max-w-4xl py-6 sm:py-10">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-2xl sm:text-3xl font-black text-[#1c201a] tracking-tight">
          What do you want to print?
        </h2>
        <p className="text-xs sm:text-sm text-[#575a53] max-w-md mx-auto">
          Choose a printing format below. Your images stay 100% in your browser.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {/* CARD 1: PHOTOS */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingPhotos(true);
          }}
          onDragLeave={() => setIsDraggingPhotos(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingPhotos(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              onDropPhotos(e.dataTransfer.files);
            }
          }}
          onClick={() => onSelectMode("photos")}
          className={`group relative rounded-2xl sm:rounded-[24px] border p-6 sm:p-8 flex flex-col justify-between transition-all duration-200 cursor-pointer bg-white shadow-2xs hover:shadow-xs ${
            isDraggingPhotos
              ? "border-[#3158d5] bg-[#e8effe]/70 scale-[1.01]"
              : "border-[#e5e5df] hover:border-[#3158d5] hover:bg-[#faf9f6]"
          }`}
        >
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8effe] text-[#3158d5] border border-[#bcd5ff] group-hover:scale-105 transition-transform shadow-2xs">
              {/* Photo Grid Icon */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-[#1c201a] group-hover:text-[#3158d5] transition-colors flex items-center gap-2">
                <span>Photos</span>
                <span className="text-[10px] font-semibold text-[#70746d] bg-[#f6f5f3] border border-[#e5e5df] px-2 py-0.5 rounded-full">
                  Grid &amp; Presets
                </span>
              </h3>
              <p className="text-sm text-[#575a53] leading-relaxed">
                Passport, 4x6, stamps or any size. Fill the page evenly with custom rows and columns or exact physical millimeters.
              </p>
            </div>
          </div>

          <div style={{ borderTop: "1px solid #e5e5df" }} className="mt-8 pt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectMode("photos");
              }}
              style={{ backgroundColor: "#3158d5" }}
              className="h-11 px-5 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md shadow-[#3158d5]/20 hover:brightness-105 transition cursor-pointer flex items-center gap-2"
            >
              <span>Choose photos</span>
              <span>→</span>
            </button>
            <span className="text-[11px] text-[#70746d] hidden sm:inline">
              Drop files or Ctrl+V
            </span>
          </div>
        </div>

        {/* CARD 2: ID CARD */}
        <div
          onClick={() => onSelectMode("id")}
          className="group relative rounded-2xl sm:rounded-[24px] border border-[#e5e5df] hover:border-[#3158d5] p-6 sm:p-8 flex flex-col justify-between transition-all duration-200 cursor-pointer bg-white shadow-2xs hover:shadow-xs hover:bg-[#faf9f6]"
        >
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8effe] text-[#3158d5] border border-[#bcd5ff] group-hover:scale-105 transition-transform shadow-2xs">
              {/* Front & Back Card Icon */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
                <circle cx="6" cy="15" r="1.5" />
                <line x1="10" y1="15" x2="18" y2="15" />
              </svg>
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-[#1c201a] group-hover:text-[#3158d5] transition-colors flex items-center gap-2">
                <span>ID card</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  CR80 Standard
                </span>
              </h3>
              <p className="text-sm text-[#575a53] leading-relaxed">
                Front and back on one page. Automatic edge straightening, standard 85.6 × 54 mm sizing, stacked, side-by-side or two-page duplex layouts.
              </p>
            </div>
          </div>

          <div style={{ borderTop: "1px solid #e5e5df" }} className="mt-8 pt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectMode("id");
              }}
              style={{ backgroundColor: "#3158d5" }}
              className="h-11 px-5 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md shadow-[#3158d5]/20 hover:brightness-105 transition cursor-pointer flex items-center gap-2"
            >
              <span>Add front and back</span>
              <span>→</span>
            </button>
            <span className="text-[11px] text-[#70746d] hidden sm:inline">
              Phone camera ready
            </span>
          </div>
        </div>
      </div>

      {hasSavedSettings && (
        <div className="mt-6 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-1 text-xs text-slate-600 font-medium">
            <span>⚙️ Print settings remembered from last time</span>
          </span>
        </div>
      )}
    </div>
  );
}

