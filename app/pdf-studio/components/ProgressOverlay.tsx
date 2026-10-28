import React from "react";
import { Loader2 } from "lucide-react";

interface ProgressOverlayProps {
  isVisible: boolean;
  processingText: string;
  processingPercent: number;
}

export default function ProgressOverlay({
  isVisible,
  processingText,
  processingPercent,
}: ProgressOverlayProps) {
  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={processingPercent}
      aria-label={processingText || "Processing document"}
    >
      <div
        style={{ borderColor: "#bcd5ff", backgroundColor: "#f0f5ff" }}
        className="w-full max-w-sm rounded-2xl border p-6 text-center shadow-2xl animate-in zoom-in-95 duration-150"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3158d5] text-white shadow-md">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <p className="mt-3.5 text-sm font-bold text-[#1c201a]">{processingText}</p>
        <p className="mt-1 text-xs text-[#70746d]">100% in-browser RAM engine</p>
        <div
          style={{ backgroundColor: "#e0ebff" }}
          className="mx-auto mt-4 max-w-[220px] h-2 w-full rounded-full overflow-hidden"
        >
          <div
            style={{
              width: `${Math.max(5, Math.min(100, processingPercent))}%`,
              backgroundColor: "#3158d5",
              transition: "width 200ms ease",
            }}
            className="h-full rounded-full"
          />
        </div>
      </div>
    </div>
  );
}

