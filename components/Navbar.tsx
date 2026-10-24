"use client";

import { useState, useEffect, useRef } from "react";
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
    label: "Design Check",
    shortLabel: "Design Check",
    href: "/design-check",
    description: "Review spelling, contrast, and layout issues in your design",
    tag: "New",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="m8 15 2.5 2.5L16 12" />
      </svg>
    ),
  },
  {
    label: "US ↔ UK Converter",
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
  {
    label: "About Us",
    shortLabel: "About",
    href: "/about",
    description: "Learn about Spellense and our mission",
    tag: null,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
      </svg>
    ),
  },
];

export default function Navbar({ onUploadClick, resultMode }: NavbarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const hamburgerRef = useRef<HTMLButtonElement | null>(null);

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

  // Close mobile menu on outside click or touch
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleOutsideInteraction = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      // If clicked inside the floating menu card, do not close
      if (menuRef.current && menuRef.current.contains(target)) return;
      // If clicked on the hamburger button, let the button handle toggle
      if (hamburgerRef.current && hamburgerRef.current.contains(target)) return;
      // If target is no longer in DOM (e.g. replaced icon), ignore
      if (!document.contains(target)) return;

      setMobileMenuOpen(false);
    };

    // Attach after a short delay so the tap that opened the menu does not trigger an immediate close
    const timer = setTimeout(() => {
      document.addEventListener("pointerdown", handleOutsideInteraction);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerdown", handleOutsideInteraction);
    };
  }, [mobileMenuOpen]);

  // Close mobile menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
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
    <>
      <header style={{ borderBottomColor: "#e5e5df" }} className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b shadow-2xs transition-colors">
      <div className="w-full px-3 sm:px-4 lg:px-5 min-h-16 sm:min-h-[70px] py-4 flex items-center justify-between gap-3 sm:gap-4">
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
            <span className="text-[20px] sm:text-[22px] font-extrabold tracking-[-0.6px] text-slate-900 leading-none">
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
          <nav className="hidden lg:flex flex-wrap items-center justify-end gap-2 text-[13px] xl:text-sm font-semibold">
            {/* 1. Home */}
            <Link
              href="/"
              onClick={() => {
                if (resultMode) {
                  resultMode.onReset();
                }
              }}
              className={`whitespace-nowrap py-1.5 px-3 xl:px-3.5 rounded-lg transition focus:outline-none focus-visible:outline-none focus-visible:ring-0 ${
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
              className={`flex items-center gap-1 whitespace-nowrap py-1.5 px-3 xl:px-3.5 rounded-lg transition focus:outline-none focus-visible:outline-none focus-visible:ring-0 ${
                isActive("/flipbook")
                  ? "bg-blue-50 text-[#0055fe] font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <span>3D Flipbook</span>
            </Link>

            {/* 3. Image Compressor */}
            <Link
              href="/image-compressor"
              className={`whitespace-nowrap py-1.5 px-3 xl:px-3.5 rounded-lg transition focus:outline-none focus-visible:outline-none focus-visible:ring-0 ${
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
              className={`flex items-center gap-1 whitespace-nowrap py-1.5 px-3 xl:px-3.5 rounded-lg transition focus:outline-none focus-visible:outline-none focus-visible:ring-0 ${
                isActive("/qr-code-generator")
                  ? "bg-blue-50 text-[#0055fe] font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <span>QR Code Generator</span>
            </Link>

            {/* 5. ID Print Maker */}
            <Link
              href="/print-sheet-maker"
              className={`flex items-center gap-1 whitespace-nowrap py-1.5 px-3 xl:px-3.5 rounded-lg transition focus:outline-none focus-visible:outline-none focus-visible:ring-0 ${
                isActive("/print-sheet-maker")
                  ? "bg-blue-50 text-[#0055fe] font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <span>ID Print Maker</span>
            </Link>

            {/* 6. Image to Text */}
            <Link
              href="/image-to-text"
              className={`whitespace-nowrap py-1.5 px-3 xl:px-3.5 rounded-lg transition focus:outline-none focus-visible:outline-none focus-visible:ring-0 ${
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
              className={`whitespace-nowrap py-1.5 px-3 xl:px-3.5 rounded-lg transition focus:outline-none focus-visible:outline-none focus-visible:ring-0 ${
                isActive("/case-converter")
                  ? "bg-blue-50 text-[#0055fe] font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <span>Case Converter</span>
            </Link>

            {/* Design Check */}
            <Link
              href="/design-check"
              className={`flex items-center gap-1 whitespace-nowrap py-1.5 px-3 xl:px-3.5 rounded-lg transition focus:outline-none focus-visible:outline-none focus-visible:ring-0 ${
                isActive("/design-check")
                  ? "bg-blue-50 text-[#0055fe] font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <span>Design Check</span>
            </Link>

            {/* 8. US ↔ UK */}
            <Link
              href="/us-uk-converter"
              className={`whitespace-nowrap py-1.5 px-3 xl:px-3.5 rounded-lg transition focus:outline-none focus-visible:outline-none focus-visible:ring-0 ${
                isActive("/us-uk-converter")
                  ? "bg-blue-50 text-[#0055fe] font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <span>US ↔ UK Converter</span>
            </Link>

            {/* About Us */}
            <Link
              href="/about"
              className={`whitespace-nowrap py-1.5 px-3 xl:px-3.5 rounded-lg transition focus:outline-none focus-visible:outline-none focus-visible:ring-0 ${
                isActive("/about")
                  ? "bg-blue-50 text-[#0055fe] font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <span>About Us</span>
            </Link>
          </nav>

          {/* Mobile / Tablet Hamburger Button - shown below the wide desktop navigation */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              ref={hamburgerRef}
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              style={{
                borderColor: mobileMenuOpen ? "#3158d5" : "#e5e5df",
                backgroundColor: mobileMenuOpen ? "#efeee7" : "#ffffff",
                color: mobileMenuOpen ? "#3158d5" : "#1c201a",
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border transition cursor-pointer active:scale-95 shadow-2xs"
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

      </header>

      {/* Mobile menu dropdown overlay OUTSIDE header to prevent backdrop-blur containing block bug */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation Menu"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setMobileMenuOpen(false);
            }
          }}
          className={`fixed inset-0 "top-[64px] sm:top-[70px]" z-50 bg-[#1c201a]/40 backdrop-blur-sm lg:hidden flex flex-col items-center justify-start p-3.5 sm:p-5 overflow-y-auto overscroll-contain cursor-pointer transition-opacity duration-200`}
        >
          {/* Floating Menu Card (NOT full bleed, rounded all around, stopping propagation) */}
          <div
            ref={menuRef}
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: "#faf9f6", borderColor: "#e5e5df" }}
            className="w-full max-w-[420px] rounded-3xl border shadow-2xl overflow-hidden flex flex-col my-auto sm:my-4 cursor-default animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Header bar */}
            <div
              style={{ borderBottomColor: "#e5e5df" }}
              className="flex items-center justify-between p-4 pb-3 border-b shrink-0"
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#70746d]">
                Navigation &amp; Tools
              </span>
              <div className="flex items-center gap-2">
                <span
                  style={{ backgroundColor: "#efeee7", borderColor: "#e5e5df", color: "#3158d5" }}
                  className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold shadow-2xs"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#3158d5] animate-pulse" />
                  Free · No Signup
                </span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ borderColor: "#e5e5df", backgroundColor: "#ffffff" }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border text-slate-500 hover:text-slate-800 transition active:scale-95 cursor-pointer"
                  title="Close navigation"
                  aria-label="Close navigation"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Navigation Items (NO dark outline, soft border #e5e5df, scrollable if height is constrained) */}
            <div className="p-3.5 space-y-2 max-h-[calc(100dvh-170px)] overflow-y-auto overscroll-contain">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      borderColor: "#e5e5df",
                      backgroundColor: active ? "#efeee7" : "#ffffff",
                    }}
                    className="flex items-center gap-3.5 rounded-2xl border p-3 transition-all active:scale-[0.99] shadow-2xs hover:bg-[#f6f5f3]"
                  >
                    <div
                      style={{
                        backgroundColor: active ? "#3158d5" : "#f6f5f3",
                        color: active ? "#ffffff" : "#3158d5",
                        borderColor: active ? "#3158d5" : "#e5e5df",
                      }}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition shadow-2xs"
                    >
                      {item.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          style={{ color: "#1c201a" }}
                          className={`text-[15px] ${active ? "font-bold" : "font-semibold"}`}
                        >
                          {item.label}
                        </span>
                        {item.tag && (
                          <span
                            style={{
                              backgroundColor: active ? "#3158d5" : "#efeee7",
                              color: active ? "#ffffff" : "#3158d5",
                              borderColor: "#e5e5df",
                            }}
                            className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-2xs"
                          >
                            {item.tag}
                          </span>
                        )}
                      </div>
                      <p style={{ color: "#70746d" }} className="mt-0.5 text-xs truncate">
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
    </>
  );
}
