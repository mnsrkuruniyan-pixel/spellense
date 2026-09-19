"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch((err) => {
          console.warn("ServiceWorker registration failed:", err);
        });
      });
    }

    // 2. Check if already installed in standalone mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      return;
    }

    // 3. Check if previously dismissed within 7 days
    const dismissedAt = localStorage.getItem("spellense_pwa_dismissed_at");
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      if (elapsed < SEVEN_DAYS_MS) {
        return;
      }
    }

    // 4. Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice =
      /iphone|ipad|ipod/.test(userAgent) &&
      !(window as unknown as { MSStream?: unknown }).MSStream;

    if (isIosDevice) {
      // Show prompt on iOS after a brief delay for user to see the page
      const timer = setTimeout(() => {
        setIsIos(true);
        setShowPrompt(true);
      }, 2500);
      return () => clearTimeout(timer);
    }

    // 5. Handle Android / Chromium `beforeinstallprompt`
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosInstructions(true);
      return;
    }

    if (!deferredPrompt) {
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowPrompt(false);
      }
    } catch (err) {
      console.error("Install prompt error:", err);
    } finally {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIosInstructions(false);
    localStorage.setItem(
      "spellense_pwa_dismissed_at",
      Date.now().toString()
    );
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <>
      {/* FLOATING INSTALL BANNER (Mobile optimized) */}
      <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300">
        <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/90 bg-white/95 p-3.5 shadow-2xl shadow-slate-900/15 backdrop-blur-xl ring-1 ring-black/5">
          {/* App Icon */}
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-white p-1 shadow-xs">
            <Image
              src="/icon-96.png"
              alt="Spellense App"
              width={48}
              height={48}
              className="h-full w-full object-contain"
            />
          </div>

          {/* Text Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-slate-900">
                Install Spellense App
              </span>
              <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-600">
                Free
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">
              Check spelling directly from your home screen.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={handleInstallClick}
              className="rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
            >
              Install
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss install prompt"
              className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* iOS INSTALL INSTRUCTIONS MODAL */}
      {showIosInstructions && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <Image
                  src="/icon-96.png"
                  alt="Spellense"
                  width={36}
                  height={36}
                  className="rounded-lg"
                />
                <h3 className="font-bold text-slate-900 text-base">
                  Add to Home Screen
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIosInstructions(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-600">
              Follow these simple steps to install Spellense on your iPhone or iPad:
            </p>

            <div className="mt-4 space-y-3.5 text-xs text-slate-700">
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">
                  1
                </span>
                <p className="pt-0.5">
                  Tap the <strong className="font-semibold text-slate-900">Share button</strong> (
                  <svg
                    className="inline-block mx-0.5 -mt-0.5"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                  ) in Safari&apos;s bottom toolbar.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">
                  2
                </span>
                <p className="pt-0.5">
                  Scroll down and tap <strong className="font-semibold text-slate-900">&quot;Add to Home Screen&quot;</strong>.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">
                  3
                </span>
                <p className="pt-0.5">
                  Tap <strong className="font-semibold text-slate-900">&quot;Add&quot;</strong> in the top-right corner to finish.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="mt-6 w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
