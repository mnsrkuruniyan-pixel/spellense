import React, { useEffect, useRef } from "react";
import { AlertTriangle, AlertCircle } from "lucide-react";
import { ConfirmDialogOptions } from "../types";

interface ConfirmDialogProps {
  options: ConfirmDialogOptions | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  options,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!options) return;

    // Focus Cancel button on open
    const timer = setTimeout(() => {
      cancelBtnRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [options, onCancel]);

  if (!options) return null;

  const isDestructive = options.destructive ?? false;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-black/[0.06] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`p-2 rounded-xl shrink-0 ${
              isDestructive
                ? "bg-rose-50 text-rose-600 border border-rose-100"
                : "bg-blue-50 text-[#3158d5] border border-blue-100"
            }`}
          >
            {isDestructive ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
          </div>

          <div className="flex-1">
            <h3
              id="confirm-dialog-title"
              className="text-base font-bold text-[#1c201a] leading-snug"
            >
              {options.title}
            </h3>
            <p
              id="confirm-dialog-desc"
              className="mt-1.5 text-xs text-[#575a53] leading-relaxed"
            >
              {options.message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-[#eeede6] bg-white text-xs font-semibold text-[#1c201a] hover:bg-[#faf9f6] transition cursor-pointer focus-visible:ring-2 focus-visible:ring-[#3158d5] focus-visible:outline-none"
          >
            {options.cancelLabel || "Cancel"}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition cursor-pointer shadow-xs focus-visible:ring-2 focus-visible:outline-none ${
              isDestructive
                ? "bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500"
                : "bg-[#3158d5] hover:bg-blue-700 focus-visible:ring-blue-500"
            }`}
          >
            {options.confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

