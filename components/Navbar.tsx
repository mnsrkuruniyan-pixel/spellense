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
    label: "Spell Checker",
    shortLabel: "Checker",
    href: "/",
    description: "Visual OCR proofreading for images & documents",
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
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h5" />
        <path d="M8 17h3" />
        <circle cx="17.5" cy="16.5" r="2.7" />
        <path d="m19.5 18.5 1.8 1.8" />
      </svg>
    ),
  },
  {
    label: "Design Check",
    shortLabel: "Design QA",
    href: "/design-check",
    description: "Pre-flight QA for posters, ads, contrast & bleed",
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
      </svg>
    ),
  },
  {
    label: "Blog",
    shortLabel: "Blog",
    href: "/blog",
    description: "Guides on OCR proofreading, PDF & design quality",
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
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
        <path d="M6 6h10" />
        <path d="M6 10h10" />
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
    label: "About",
    shortLabel: "About",
    href: "/about",
    description: "Founder origin story, mission & architecture",
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
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
  {
    label: "FAQ",
    shortLabel: "FAQ",
    href: "/faq",
    description: "Frequently asked questions and guides",
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
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
];

const UTILITY_TOOLS = [
  {
    label: "Case Converter",
    href: "/case-converter",
    description: "CamelCase, Title, Snake, Kebab & 12 styles",
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
    label: "US ↔ UK Switcher",
    href: "/us-uk-converter",
    description: "American vs British dialect spelling switcher",
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
    label: "Image to Text",
    href: "/image-to-text",
    description: "Extract clean, copyable text from photos & screenshots",
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

];

export default function Navbar({ onUploadClick, resultMode }: NavbarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileMenuOpen(false);
    setToolsDropdownOpen(false);
  }

  // Close tools dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolsRef.current && !toolsRef.current.contains(event.target as Node)) {
        setToolsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

  const isToolsActive =
    pathname.startsWith("/case-converter") ||
    pathname.startsWith("/us-uk-converter") ||
    pathname.startsWith("/image-to-text");

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl transition-colors">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* BRAND / LOGO */}
        <Link
          href="/"
          onClick={() => {
            if (resultMode) {
              resultMode.onReset();
            }
          }}
          className="group flex items-center gap-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 transition-transform duration-200 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-blue-500/30">
            <svg
              width="22"
              height="22"
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

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[20px] font-extrabold tracking-[-0.8px] text-slate-900">
                Spel<span className="text-blue-600">lense</span>
              </span>
              <span className="hidden sm:inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-700 ring-1 ring-inset ring-blue-700/10">
                OCR
              </span>
            </div>
            <div className="text-[9px] font-semibold tracking-[1.4px] text-slate-400 uppercase">
              Smart Spell Checking
            </div>
          </div>
        </Link>

        {/* RESULTS MODE SPECIFIC BAR */}
        {resultMode ? (
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* File name pill */}
            <div className="hidden md:flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50/90 px-3.5 py-1.5 text-xs font-semibold text-slate-700 max-w-[240px]">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 animate-pulse" />
              <span className="truncate">{resultMode.fileName}</span>
            </div>

            {/* Download report button */}
            {resultMode.onDownloadReport && (
              <button
                type="button"
                onClick={resultMode.onDownloadReport}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-50"
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
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-1.5 sm:py-2 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700 active:translate-y-0"
            >
              <span>+ Check another file</span>
            </button>
          </div>
        ) : (
          <>
            {/* DESKTOP CENTER NAVIGATION PILL */}
            <div className="hidden lg:flex items-center gap-1 rounded-full border border-slate-200/80 bg-slate-100/70 p-1 text-[13px] font-bold text-slate-700 backdrop-blur-md shadow-xs">
              {/* Spell Checker */}
              <Link
                href="/"
                className={`relative rounded-full px-3.5 py-1.5 transition-all duration-150 flex items-center gap-1.5 font-bold ${
                  pathname === "/"
                    ? "bg-white text-blue-600 shadow-xs ring-1 ring-slate-900/5"
                    : "hover:bg-white/60 hover:text-slate-900 text-slate-700"
                }`}
              >
                <span>Spell Checker</span>
              </Link>

              {/* Design Check */}
              <Link
                href="/design-check"
                className={`relative rounded-full px-3.5 py-1.5 transition-all duration-150 flex items-center gap-1.5 font-bold ${
                  pathname.startsWith("/design-check")
                    ? "bg-white text-blue-600 shadow-xs ring-1 ring-slate-900/5"
                    : "hover:bg-white/60 hover:text-slate-900 text-slate-700"
                }`}
              >
                <span>Design Check</span>
                <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700">
                  New
                </span>
              </Link>

              {/* Image Compressor */}
              <Link
                href="/image-compressor"
                className={`relative rounded-full px-3.5 py-1.5 transition-all duration-150 flex items-center gap-1.5 font-bold ${
                  pathname.startsWith("/image-compressor")
                    ? "bg-white text-blue-600 shadow-xs ring-1 ring-slate-900/5"
                    : "hover:bg-white/60 hover:text-slate-900 text-slate-700"
                }`}
              >
                <span>Image Compressor</span>
              </Link>

              {/* Tools Dropdown */}
              <div
                ref={toolsRef}
                className="relative"
                onMouseEnter={() => setToolsDropdownOpen(true)}
                onMouseLeave={() => setToolsDropdownOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setToolsDropdownOpen((prev) => !prev)}
                  className={`relative rounded-full px-3.5 py-1.5 transition-all duration-150 flex items-center gap-1.5 font-bold ${
                    isToolsActive
                      ? "bg-white text-blue-600 shadow-xs ring-1 ring-slate-900/5"
                      : "hover:bg-white/60 hover:text-slate-900 text-slate-700"
                  }`}
                  aria-expanded={toolsDropdownOpen}
                >
                  <span>Tools</span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`transition-transform duration-200 ${
                      toolsDropdownOpen ? "rotate-180 text-blue-600" : "text-slate-400"
                    }`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {toolsDropdownOpen && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-full pt-1.5 z-50">
                    <div className="w-72 rounded-2xl border border-slate-200/80 bg-white/95 p-2 shadow-xl shadow-slate-900/10 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Text Utilities
                      </div>
                      {UTILITY_TOOLS.map((tool) => {
                        const active = pathname.startsWith(tool.href);
                        return (
                          <Link
                            key={tool.href}
                            href={tool.href}
                            onClick={() => setToolsDropdownOpen(false)}
                            className={`flex items-start gap-3 rounded-xl p-2.5 transition-colors ${
                              active
                                ? "bg-blue-50/90 text-blue-700"
                                : "hover:bg-slate-50 text-slate-700 hover:text-slate-900"
                            }`}
                          >
                            <div
                              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                active
                                  ? "bg-blue-600 text-white shadow-xs"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {tool.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold leading-tight">
                                {tool.label}
                              </div>
                              <div className="mt-0.5 text-[11px] text-slate-500 leading-normal line-clamp-1">
                                {tool.description}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* About */}
              <Link
                href="/about"
                className={`relative rounded-full px-3.5 py-1.5 transition-all duration-150 flex items-center gap-1.5 font-bold ${
                  pathname.startsWith("/about")
                    ? "bg-white text-blue-600 shadow-xs ring-1 ring-slate-900/5"
                    : "hover:bg-white/60 hover:text-slate-900 text-slate-700"
                }`}
              >
                <span>About</span>
              </Link>

              {/* FAQ */}
              <Link
                href="/faq"
                className={`relative rounded-full px-3.5 py-1.5 transition-all duration-150 flex items-center gap-1.5 font-bold ${
                  pathname.startsWith("/faq")
                    ? "bg-white text-blue-600 shadow-xs ring-1 ring-slate-900/5"
                    : "hover:bg-white/60 hover:text-slate-900 text-slate-700"
                }`}
              >
                <span>FAQ</span>
              </Link>
            </div>

            {/* DESKTOP RIGHT ACTIONS */}
            <div className="hidden sm:flex items-center gap-3">
              {/* Free badge */}
              <div className="hidden 2xl:flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1 text-[11px] font-semibold text-emerald-700 shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>100% Free • No Signup</span>
              </div>

              {/* Action Button */}
              {pathname === "/" ? (
                <button
                  type="button"
                  onClick={onUploadClick}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-600/25 hover:from-blue-700 hover:to-indigo-700 active:translate-y-0"
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
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span>Upload File</span>
                </button>
              ) : (
                <Link
                  href="/#upload"
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-600/25 hover:from-blue-700 hover:to-indigo-700 active:translate-y-0"
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
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                    <circle cx="17.5" cy="16.5" r="2.7" />
                    <path d="m19.5 18.5 1.8 1.8" />
                  </svg>
                  <span>Check Spelling</span>
                </Link>
              )}
            </div>

            {/* MOBILE / TABLET RIGHT CONTROLS */}
            <div className="flex lg:hidden items-center gap-2">
              {/* Quick action for mobile */}
              {pathname === "/" ? (
                <button
                  type="button"
                  onClick={onUploadClick}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs"
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span>Upload</span>
                </button>
              ) : (
                <Link
                  href="/#upload"
                  className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs"
                >
                  <span>Check</span>
                </Link>
              )}

              {/* Hamburger Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? "Close menu" : "Open navigation menu"}
                aria-expanded={mobileMenuOpen}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50/80 text-slate-700 transition hover:bg-slate-100 active:scale-95"
              >
                {mobileMenuOpen ? (
                  <svg
                    width="18"
                    height="18"
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
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="4" y1="7" x2="20" y2="7" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <line x1="4" y1="17" x2="20" y2="17" />
                  </svg>
                )}
              </button>
            </div>
          </>
        )}
      </nav>

      {/* MOBILE FULL-SCREEN DROPDOWN OVERLAY */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-[65px] z-40 bg-slate-900/20 backdrop-blur-md lg:hidden animate-in fade-in duration-200">
          <div className="mx-auto max-w-lg border-b border-slate-200/80 bg-white/95 px-5 pt-4 pb-6 shadow-2xl backdrop-blur-xl">
            {/* Header label */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Navigation &amp; Tools
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Free • No Signup
              </span>
            </div>

            {/* Menu Links */}
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

                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`shrink-0 ${
                        active ? "text-blue-600" : "text-slate-400"
                      }`}
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>
                );
              })}
            </div>

            {/* Bottom info card */}
            <div className="mt-4 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/60 to-indigo-50/40 p-3.5 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-800">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>Zero Server Storage</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                100% In-Memory RAM proofreading. Files are never saved or stored.
              </p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
