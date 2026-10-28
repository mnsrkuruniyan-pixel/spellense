import React, { useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { ToastMessage } from "../types";

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastProps) {
  if (!toasts.length) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 max-w-[92vw] sm:max-w-md w-full pointer-events-none"
      aria-live="polite"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const bgStyle =
    toast.type === "success"
      ? "bg-[#0f172a] text-white border-emerald-500/30"
      : toast.type === "error"
      ? "bg-[#0f172a] text-white border-rose-500/30"
      : "bg-[#0f172a] text-white border-blue-500/30";

  const icon =
    toast.type === "success" ? (
      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
    ) : toast.type === "error" ? (
      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
    ) : (
      <Info className="w-4 h-4 text-blue-400 shrink-0" />
    );

  return (
    <div
      className={`pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-xl border shadow-xl text-xs font-medium backdrop-blur-sm transition-all animate-in fade-in slide-in-from-bottom-2 duration-200 ${bgStyle}`}
      role="status"
    >
      {icon}
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Close notification"
        className="p-1 -mr-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

