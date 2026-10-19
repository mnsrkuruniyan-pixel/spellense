"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavbarProps {
  onUploadClick?: () => void;
  resultMode?: {
    fileName: string;
    onReset: () => void;
    onDownloadReport?: () => void;
  };
}

const NAV_ITEMS = [
  {
    label: "Home",
    shortLabel: "Home",
    href: "/",
    description: "Visual OCR proofreading & spell check for images & docs",
    tag: null,
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: "3D Flipbook",
    shortLabel: "Flipbook",
    href: "/flipbook",
    description: "Don’t just send a PDF. Send an experience.",
    tag: "New",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
        <path d="M6 6h10" />
        <path d="M6 10h10" />
      </svg>
    ),
  },
  {
    label: "Image Compressor",
    shortLabel: "Compressor",
    href: "/image-compressor",
    description: "Compress images with live Squoosh-style split comparison",
    tag: "New",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 14h6m0 0v6m0-6L3 21" />
        <path d="M20 10h-6m0 0V4m0 6 7-7" />
      </svg>
    ),
  },
  {
    label: "QR Code Generator",
    shortLabel: "QR Code",
    href: "/qr-code-generator",
    description: "Create custom QR codes with real scannability check",
    tag: "New",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M7 7h.01M7 12h.01M7 17h.01M12 7h.01M12 12h.01M12 17h.01M17 7h.01M17 12h.01M17 17h.01" />
      </svg>
    ),
  },
  {
    label: "ID Print Maker",
    shortLabel: "ID Print",
    href: "/print-sheet-maker",
    description: "Fit photos and ID cards on one A4 or custom page at exact physical mm",
    tag: "New",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
      </svg>
    ),
  },
  {
    label: "Image to Text",
    shortLabel: "Image to Text",
    href: "/image-to-text",
    description: "Extract clean, copyable text from photos & screenshots",
    tag: "New",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="13" y2="17" />
      </svg>
    ),
  },

  {
    label: "Case Converter",
    shortLabel: "Case",
    href: "/case-converter",
    description: "CamelCase, Title, Snake, Kebab & 12 styles",
    tag: null,
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="4 7 4 4 20 4 20 7" />
        <line x1="9" y1="20" x2="15" y2="20" />
        <line x1="12" y1="4" x2="12" y2="20" />
      </svg>
    ),
  },
  {
    label: "US ↔ UK",
    shortLabel: "US/UK",
    href: "/us-uk-converter",
    description: "American vs British dialect spelling switcher",
    tag: null,
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
];

export default function Navbar({ onUploadClick, resultMode }: NavbarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileMenuOpen(false);
  }

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Check if link is active
  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-2xs transition-colors">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-6 2xl:px-10 h-16 sm:h-[70px] flex items-center justify-between gap-3 sm:gap-4">
        {/* LOGO */}
        <Link
          href="/"
          onClick={() => {
            if (resultMode) {
              resultMode.onReset();
            }
          }}
          className="flex items-center gap-2.5 shrink-0 select-none group"
        >
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M8 13h5" />
              <path d="M8 17h3" />
              <circle cx="17.5" cy="16.5" r="2.7" />
              <path d="m19.5 18.5 1.8 1.8" />
            </svg>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[19px] sm:text-[21px] font-extrabold tracking-[-0.6px] text-slate-900 leading-none">
              Spellense
            </span>
            <span className="inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[#0055fe] border border-blue-200/60">
              BETA
            </span>
          </div>
        </Link>

        {/* RIGHT NAVIGATION */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Main Navigation (Always visible on desktop) */}
          <nav className="hidden xl:flex items-center gap-1 xl:gap-1.5 text-[13px] font-semibold">
            {/* 1. Home */}
            <Link
              href="/"
              onClick={() => {
                if (resultMode) {
                  resultMode.onReset();
                }
              }}
              className={`py-1.5 px-3 rounded-lg transition ${
                isActive("/")
                  ? "bg-blue-50 text-[#0055fe] font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <span>Home</span>
            </Link>

            {/* 2. 3D Flipbook */}
            <Link
              href="/flipbook"
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg transition ${
                isActive("/flipbook")
                  ? "bg-blue-50 text-[#0055fe] font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <span>3D Flipbook</span>
              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-blue-100 text-[#0055fe]">
                New
              </span>
            </Link>

            {/* 3. Image Compressor */}
            <Link
              href="/image-compressor"
              className={`py-1.5 px-3 rounded-lg transition ${
                isActive("/image-compressor")
                  ? "bg-blue-50 text-[#0055fe] font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <span>Image Compressor</span>
            </Link>

            {/* 4. QR Code Generator */}
            <Link
              href="/qr-code-generator"
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg transition ${
                isActive("/qr-code-generator")
                  ? "bg-blue-50 text-[#0055fe] font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <span>QR Code</span>
              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-blue-100 text-[#0055fe]">
                New
              </span>
            </Link>

            {/* 5. ID Print Maker */}
            <Link
              href="/print-sheet-maker"
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg transition ${
                isActive("/print-sheet-maker")
                  ? "bg-blue-50 text-[#0055fe] font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <span>ID Print Maker</span>
              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-blue-100 text-[#0055fe]">
                New
              </span>
            </Link>

            {/* 6. Image to Text */}
            <Link
              href="/image-to-text"
              className={`py-1.5 px-3 rounded-lg transition ${
                isActive("/image-to-text")
                  ? "bg-blue-50 text-[#0055fe] font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <span>Image to Text</span>
            </Link>

            {/* 7. Case Converter */}
            <Link
              href="/case-converter"
              className={`py-1.5 px-3 rounded-lg transition ${
                isActive("/case-converter")
                  ? "bg-blue-50 text-[#0055fe] font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <span>Case Converter</span>
            </Link>

            {/* 8. US ↔ UK */}
            <Link
              href="/us-uk-converter"
              className={`py-1.5 px-3 rounded-lg transition ${
                isActive("/us-uk-converter")
                  ? "bg-blue-50 text-[#0055fe] font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <span>US ↔ UK</span>
            </Link>
          </nav>

          {/* RESULT MODE ACTIONS */}
          {resultMode && (
            <div className="hidden sm:flex items-center gap-2 sm:gap-2.5 xl:border-l xl:border-slate-200 xl:pl-3">
              {/* File name pill */}
              <div className="hidden 2xl:flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 max-w-[180px] shadow-2xs">
                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 animate-pulse" />
                <span className="truncate">{resultMode.fileName}</span>
              </div>

              {/* Download report button */}
              {resultMode.onDownloadReport && (
                <button
                  type="button"
                  onClick={resultMode.onDownloadReport}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:border-slate-300 active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Report</span>
                </button>
              )}

              {/* Check another file */}
              <button
                type="button"
                onClick={resultMode.onReset}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#0055fe] hover:bg-blue-700 px-3.5 py-1.5 sm:py-2 text-xs font-bold text-white shadow-xs shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <span>+ Check another file</span>
              </button>
            </div>
          )}

          {/* Mobile / Tablet Hamburger Button */}
          <div className="flex xl:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              className={`flex h-10 w-10 items-center justify-center rounded-xl border transition cursor-pointer active:scale-95 shadow-2xs ${
                mobileMenuOpen
                  ? "bg-blue-50 border-blue-200 text-[#0055fe] shadow-blue-500/10"
                  : "bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              {mobileMenuOpen ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

        {/* MOBILE RESULT MODE ACTION BAR */}
        {resultMode && (
          <div className="sm:hidden w-full bg-white/95 border-b border-slate-200/80 px-4 py-2.5 flex items-center justify-between gap-2 shadow-xs backdrop-blur-md">
            {/* File name */}
            <div className="flex items-center gap-1.5 min-w-0 flex-1 text-xs font-semibold text-slate-700">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 animate-pulse" />
              <span className="truncate">{resultMode.fileName}</span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {resultMode.onDownloadReport && (
                <button
                  type="button"
                  onClick={resultMode.onDownloadReport}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Report</span>
                </button>
              )}

              <button
                type="button"
                onClick={resultMode.onReset}
                className="inline-flex items-center gap-1 rounded-full bg-[#0055fe] hover:bg-[#0047d9] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <span>+ Check another</span>
              </button>
            </div>
          </div>
        )}

        {/* Mobile menu dropdown overlay */}
        {mobileMenuOpen && (
          <div className={`fixed inset-0 ${resultMode ? "top-[112px] sm:top-[70px]" : "top-[64px] sm:top-[70px]"} z-40 bg-slate-900/30 backdrop-blur-md xl:hidden animate-in fade-in duration-200`}>
            <div className="mx-auto max-w-lg border-b border-slate-200/80 bg-white/95 px-5 pt-4 pb-6 shadow-2xl backdrop-blur-xl max-h-[calc(100dvh-80px)] overflow-y-auto overscroll-contain">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Navigation &amp; Tools
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Free • No Signup
                </span>
              </div>
              <div className="mt-3 space-y-1.5">
                {NAV_ITEMS.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3.5 rounded-2xl p-3 transition-all ${
                        active
                          ? "bg-blue-50/90 text-blue-700 shadow-xs ring-1 ring-blue-200/80"
                          : "text-slate-700 hover:bg-slate-50 active:bg-slate-100"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                          active
                            ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                            : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                        }`}
                      >
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold truncate">
                            {item.label}
                          </span>
                          {item.tag && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {item.tag}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500 truncate">
                          {item.description}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </header>
  );
}
