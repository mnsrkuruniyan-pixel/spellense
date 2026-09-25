"use client";

import { useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Spellense runtime error:", error);
  }, [error]);

  return (
    <div className="relative min-h-screen bg-[#f0f6fe] font-sans text-slate-900 antialiased selection:bg-blue-500 selection:text-white">
      {/* AMBIENT MESH GLOW */}
      <div className="animate-pulse-glow pointer-events-none fixed top-[-10%] left-[20%] h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-rose-400/15 to-indigo-400/15 blur-[120px]" />
      <div className="animate-pulse-glow pointer-events-none fixed bottom-[10%] right-[15%] h-[450px] w-[450px] rounded-full bg-gradient-to-br from-amber-400/15 to-rose-400/15 blur-[120px]" />

      {/* HEADER */}
      <Navbar />

      {/* ERROR MAIN HERO */}
      <main className="relative z-10 flex min-h-[calc(100vh-160px)] items-center justify-center px-6 py-16">
        <div className="w-full max-w-md rounded-3xl border border-rose-100 bg-white/90 p-8 text-center shadow-xl shadow-rose-500/5 backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 shadow-inner ring-1 ring-rose-200/60">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50/80 px-3 py-1 text-[11px] font-bold text-rose-700">
            <span>Temporary Issue</span>
          </div>

          <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900">
            Something went wrong
          </h1>

          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            An unexpected error occurred while rendering this page. You can try refreshing or returning to the home page.
          </p>

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => reset()}
              className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-blue-600/25 transition hover:shadow-xl hover:shadow-blue-600/35 active:scale-98"
            >
              <span>Try Again</span>
              <span>↻</span>
            </button>

            <Link
              href="/"
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50"
            >
              <span>Go to Home</span>
            </Link>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-slate-200/80 bg-white/70 py-6 text-center text-xs text-slate-400 backdrop-blur-md">
        <p>© {new Date().getFullYear()} Spellense. Free & private in-memory spell checking.</p>
      </footer>
    </div>
  );
}

