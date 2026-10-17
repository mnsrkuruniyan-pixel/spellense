"use client";

import { useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function PrintSheetMakerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Print Sheet Maker error boundary caught error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#f8faff] font-sans text-slate-800">
      <Navbar />
      <main className="flex min-h-[calc(100vh-160px)] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600 mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Print Sheet Maker encountered an issue
          </h2>
          <p className="mt-2 text-xs text-slate-500">
            {error?.message || "An unexpected error occurred while loading this page."}
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-xl bg-[#0055fe] px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-blue-700"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

