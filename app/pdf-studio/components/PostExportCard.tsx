import React from "react";
import Link from "next/link";
import { BookOpen, Image as ImageIcon, X, ArrowRight } from "lucide-react";

interface PostExportCardProps {
  onDismiss: () => void;
}

export default function PostExportCard({ onDismiss }: PostExportCardProps) {
  return (
    <div
      style={{ borderColor: "#bcd5ff", backgroundColor: "#f0f5ff" }}
      className="rounded-2xl border p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#3158d5] text-white text-xs font-bold shrink-0">
          ✓
        </span>
        <div>
          <p className="text-xs font-bold text-slate-900">Done! Export downloaded successfully.</p>
          <p className="text-[11px] sm:text-xs text-slate-600">Explore more free browser-only tools next:</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href="/flipbook"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-white hover:bg-blue-50 text-xs font-semibold text-[#3158d5] transition"
        >
          <BookOpen className="w-3.5 h-3.5 text-[#3158d5]" />
          <span>Make a 3D flipbook</span>
          <ArrowRight className="w-3 h-3 text-blue-400" />
        </Link>
        <Link
          href="/image-compressor"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-white hover:bg-blue-50 text-xs font-semibold text-[#3158d5] transition"
        >
          <ImageIcon className="w-3.5 h-3.5 text-[#3158d5]" />
          <span>Compress your images</span>
          <ArrowRight className="w-3 h-3 text-blue-400" />
        </Link>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="p-1 rounded-lg hover:bg-blue-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

