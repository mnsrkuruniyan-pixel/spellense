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
    label: "Design Check",
    shortLabel: "Design QA",
    href: "/design-check",
    description: "The pre-flight check your creative work deserves",
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
    pathname.startsWith("/us-uk-converter");

  return (
    <header className="sticky top-0 z-50 w-full transition-colors">
      <div className="w-full flex items-stretch h-[68px] sm:h-[76px] bg-[#0055fe] shadow-sm">
        {/* LEFT WHITE LOGO TAB WITH CURVED NOTCH */}
        <div className="relative bg-white pl-5 sm:pl-8 pr-6 sm:pr-8 flex items-center gap-3 shrink-0 rounded-br-[36px] sm:rounded-br-[44px] shadow-xs z-10">
          <Link
            href="/"
            onClick={() => {
              if (resultMode) {
                resultMode.onReset();
              }
            }}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25">
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
                <span className="text-[20px] sm:text-[22px] font-extrabold tracking-[-0.8px] text-slate-900 leading-none">
                  Spel<span className="text-blue-600">lense</span>
                </span>
                <span className="inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-700 ring-1 ring-inset ring-blue-700/10">
                  Beta
                </span>
              </div>
              <div className="text-[8px] sm:text-[8.5px] font-semibold tracking-[1.1px] sm:tracking-[1.3px] text-slate-400 uppercase mt-0.5 whitespace-nowrap">
                ALWAYS GOT YOUR BACK
              </div>
            </div>
          </Link>

          {/* Smooth concave curve into the blue bar */}
          <div className="absolute -right-[28px] sm:-right-[32px] top-0 w-[28px] sm:w-[32px] h-[28px] sm:h-[32px] overflow-hidden pointer-events-none">
            <svg viewBox="0 0 32 32" fill="none" className="w-full h-full text-white fill-current">
              <path d="M0 0 C0 17.673 14.327 32 32 32 L0 32 Z" />
            </svg>
          </div>
        </div>

        {/* RIGHT ROYAL BLUE NAVIGATION BAR */}
        <div className="flex-1 flex items-center justify-end px-5 sm:px-8 lg:px-10">
          {resultMode ? (
            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* File name pill */}
              <div className="hidden md:flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white max-w-[240px] backdrop-blur-md">
                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 animate-pulse" />
                <span className="truncate">{resultMode.fileName}</span>
              </div>

              {/* Download report button */}
              {resultMode.onDownloadReport && (
                <button
                  type="button"
                  onClick={resultMode.onDownloadReport}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-white/25 active:scale-95 cursor-pointer"
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
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 sm:py-2 text-xs font-bold text-[#0055fe] shadow-md transition-all hover:bg-white/95 active:scale-95 cursor-pointer"
              >
                <span>+ Check another file</span>
              </button>
            </div>
          ) : (
            <nav className="hidden lg:flex items-center gap-1.5 xl:gap-2.5 text-white text-[13px] xl:text-[13.5px] font-semibold tracking-wide">
              {/* Home */}
              <Link
                href="/"
                className={`py-1.5 px-3 rounded-full transition font-bold ${
                  isActive("/")
                    ? "bg-white/20 text-white shadow-xs"
                    : "text-white/90 hover:text-white hover:bg-white/10"
                }`}
              >
                <span>Home</span>
              </Link>

              {/* Design Check */}
              <Link
                href="/design-check"
                className={`flex items-center gap-1.5 py-1.5 px-3 rounded-full transition font-bold ${
                  isActive("/design-check")
                    ? "bg-white/20 text-white shadow-xs"
                    : "text-white/90 hover:text-white hover:bg-white/10"
                }`}
              >
                <span>Design Check</span>
                <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-white/20 text-white">
                  New
                </span>
              </Link>

              {/* 3D Flipbook */}
              <Link
                href="/flipbook"
                className={`flex items-center gap-1.5 py-1.5 px-3 rounded-full transition font-bold ${
                  isActive("/flipbook")
                    ? "bg-white/20 text-white shadow-xs"
                    : "text-white/90 hover:text-white hover:bg-white/10"
                }`}
              >
                <span>3D Flipbook</span>
                <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-white/20 text-white">
                  New
                </span>
              </Link>

              {/* Image Compressor */}
              <Link
                href="/image-compressor"
                className={`py-1.5 px-3 rounded-full transition font-bold ${
                  isActive("/image-compressor")
                    ? "bg-white/20 text-white shadow-xs"
                    : "text-white/90 hover:text-white hover:bg-white/10"
                }`}
              >
                <span>Image Compressor</span>
              </Link>

              {/* Image to Text */}
              <Link
                href="/image-to-text"
                className={`py-1.5 px-3 rounded-full transition font-bold ${
                  isActive("/image-to-text")
                    ? "bg-white/20 text-white shadow-xs"
                    : "text-white/90 hover:text-white hover:bg-white/10"
                }`}
              >
                <span>Image to Text</span>
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
                  className={`flex items-center gap-1.5 py-1.5 px-3 rounded-full transition cursor-pointer font-bold ${
                    isToolsActive || toolsDropdownOpen
                      ? "bg-white/20 text-white shadow-xs"
                      : "text-white/90 hover:text-white hover:bg-white/10"
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
                      toolsDropdownOpen ? "rotate-180" : ""
                    }`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {toolsDropdownOpen && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-full pt-2 z-50">
                    <div className="w-72 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 text-slate-800">
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Text Utilities
                      </div>
                      {UTILITY_TOOLS.map((tool) => (
                        <Link
                          key={tool.href}
                          href={tool.href}
                          onClick={() => setToolsDropdownOpen(false)}
                          className={`flex items-start gap-3 rounded-xl p-2.5 transition-colors ${
                            pathname.startsWith(tool.href)
                              ? "bg-blue-50 text-blue-700 font-bold"
                              : "hover:bg-blue-50/80 text-slate-700 hover:text-blue-700"
                          }`}
                        >
                          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            pathname.startsWith(tool.href) ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                          }`}>
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
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* About */}
              <Link
                href="/about"
                className={`py-1.5 px-3 rounded-full transition font-bold ${
                  isActive("/about")
                    ? "bg-white/20 text-white shadow-xs"
                    : "text-white/90 hover:text-white hover:bg-white/10"
                }`}
              >
                <span>About</span>
              </Link>

              {/* FAQ */}
              <Link
                href="/faq"
                className={`py-1.5 px-3 rounded-full transition font-bold ${
                  isActive("/faq")
                    ? "bg-white/20 text-white shadow-xs"
                    : "text-white/90 hover:text-white hover:bg-white/10"
                }`}
              >
                <span>FAQ</span>
              </Link>

              {/* Blog */}
              <Link
                href="/blog"
                className={`py-1.5 px-3 rounded-full transition font-bold ${
                  isActive("/blog")
                    ? "bg-white/20 text-white shadow-xs"
                    : "text-white/90 hover:text-white hover:bg-white/10"
                }`}
              >
                <span>Blog</span>
              </Link>
            </nav>
          )}

            {/* Mobile Hamburger Button */}
            <div className="flex lg:hidden items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? "Close menu" : "Open navigation menu"}
                aria-expanded={mobileMenuOpen}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white hover:bg-white/25 active:scale-95 transition cursor-pointer"
              >
                {mobileMenuOpen ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu dropdown overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 top-[68px] sm:top-[76px] z-40 bg-slate-900/30 backdrop-blur-md lg:hidden animate-in fade-in duration-200">
            <div className="mx-auto max-w-lg border-b border-slate-200/80 bg-white/95 px-5 pt-4 pb-6 shadow-2xl backdrop-blur-xl">
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
