"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import Navbar from "@/components/Navbar";
import Link from "next/link";

// ── Viewer CSS (embedded in preview AND in every downloaded standalone flipbook) ──
const VCSS = `
.fbv{position:relative;display:flex;flex-direction:column;align-items:center;gap:14px;padding:20px 24px;border-radius:28px;overflow:hidden;min-height:360px;box-sizing:border-box;font-family:inherit;transition:background .3s}
.fbv.full{border-radius:0;min-height:100vh;justify-content:center}
.fbv .ov{position:absolute;inset:0;pointer-events:none}
.fbh{display:flex;justify-content:space-between;align-items:center;width:100%;gap:16px;z-index:2}
.fbh.rv{flex-direction:row-reverse}.fbh.rv p{text-align:left}
.fbh img{max-height:48px;max-width:38%;object-fit:contain;filter:drop-shadow(0 2px 6px rgba(0,0,0,.15))}
.fbh p{margin:0;font-size:.875rem;line-height:1.45;text-align:right;max-width:58%;white-space:pre-line;font-weight:600;letter-spacing:-.01em}
.stage{position:relative;width:100%;display:flex;overflow-x:auto;touch-action:pan-y;z-index:2;padding:12px 0}
.bk{position:relative;margin:auto;perspective:2600px;transition:transform .5s cubic-bezier(.25,1,.5,1);cursor:grab}
.bk:active{cursor:grabbing}
.bd{position:absolute;z-index:0;transition:all .3s}
.lf{position:absolute;top:0;left:50%;transform-origin:left center;transform-style:preserve-3d;transition:transform var(--sp) cubic-bezier(.45,.05,.25,1)}
.fc{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;overflow:hidden;background:#fff;box-shadow:inset 0 0 0 1px rgba(0,0,0,.06)}
.fc.f{border-radius:0 var(--pr) var(--pr) 0}.fc.b{transform:rotateY(180deg);border-radius:var(--pr) 0 0 var(--pr)}
.fc img{width:100%;height:100%;display:block;user-select:none;-webkit-user-drag:none;pointer-events:none;filter:var(--pf);object-fit:fill}
.fc::after{content:"";position:absolute;inset:0;pointer-events:none}
.fc.f::after{background:linear-gradient(90deg,rgba(0,0,0,.22),transparent 12%)}
.fc.b::after{background:linear-gradient(270deg,rgba(0,0,0,.22),transparent 12%)}
.sp{position:absolute;left:50%;top:0;bottom:0;width:22px;transform:translateX(-50%);z-index:9999;pointer-events:none;background:radial-gradient(circle,#111 0 3px,#c8c8c8 3.5px 5.5px,transparent 6px) 0 0/22px 20px repeat-y}
.sp.rg{width:32px;background:radial-gradient(circle,#333 0 4px,#e5e7eb 5px 8px,transparent 9px) 0 0/32px 60px repeat-y}
.sp.st{width:0;border-left:2px dashed rgba(255,255,255,.65)}
.ct{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:4px;z-index:2;background:rgba(15,23,42,.85);padding:6px 12px;border-radius:999px;color:#fff;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 12px 30px -5px rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.15)}
.ct button{all:unset;cursor:pointer;width:34px;height:34px;text-align:center;line-height:34px;border-radius:50%;font-size:1.05rem;transition:all .15s;display:flex;align-items:center;justify-content:center}
.ct button:hover,.ct button:focus-visible{background:rgba(255,255,255,.2);transform:scale(1.08)}
.ct .pg{font-size:.8125rem;min-width:76px;text-align:center;font-weight:700;letter-spacing:-.01em;padding:0 4px}
.th{display:flex;gap:10px;overflow-x:auto;width:100%;padding:10px 4px;z-index:2;scrollbar-width:thin}.th[hidden]{display:none!important}
.th img{height:72px;border-radius:8px;cursor:pointer;border:2px solid transparent;transition:all .18s;box-shadow:0 4px 10px rgba(0,0,0,.15)}.th img:hover{border-color:#3b82f6;transform:scale(1.06)}
.cr{z-index:2;font-size:.75rem;color:inherit;opacity:.75;font-weight:600;text-decoration:none;transition:opacity .15s}
.cr:hover{opacity:1;text-decoration:underline}
@media (prefers-reduced-motion:reduce){.lf,.bk{transition-duration:.01s!important}}
`;

// ── App component specific CSS for editor controls ───────────────────────────
const APP_CSS = `
#fbapp {
  --fb-primary: #2563eb;
  --fb-line: #e2e8f0;
}
#ed {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 370px;
  gap: 24px;
  align-items: start;
}
.fpn {
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 28px;
  padding: 18px;
  position: sticky;
  top: 24px;
  box-shadow: 0 20px 45px -15px rgba(15,23,42,.07), 0 0 1px rgba(15,23,42,.08);
}
.ftb {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  margin-bottom: 16px;
}
.ftb button {
  border: 1px solid transparent;
  background: transparent;
  color: #64748b;
  padding: 8px 4px;
  border-radius: 12px;
  cursor: pointer;
  font-size: .75rem;
  font-weight: 700;
  text-align: center;
  transition: all .15s ease;
  white-space: nowrap;
}
.ftb button:hover {
  color: #0f172a;
  background: rgba(255,255,255,.6);
}
.ftb .fon {
  background: #ffffff !important;
  color: #2563eb !important;
  border-color: #cbd5e1 !important;
  box-shadow: 0 2px 8px rgba(15,23,42,.07) !important;
  font-weight: 800 !important;
}
.ftp {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 4px;
  scrollbar-width: thin;
}
.ftp[hidden] {
  display: none !important;
}
.ftp label {
  font-size: .8125rem;
  font-weight: 700;
  color: #1e293b;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ftg {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.ftc {
  border: 1.5px solid #e2e8f0;
  background: #ffffff;
  border-radius: 18px;
  padding: 10px;
  cursor: pointer;
  font-size: .75rem;
  font-weight: 700;
  color: #1e293b;
  text-align: left;
  transition: all .2s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(15,23,42,.03);
}
.ftc:hover {
  border-color: #93c5fd;
  transform: translateY(-2px);
  box-shadow: 0 10px 22px -5px rgba(37,99,235,.15);
}
.ftc i {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 66px;
  padding: 6px;
  border-radius: 12px;
  position: relative;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.08);
  overflow: hidden;
}
.ftc i img {
  height: 90%;
  border-radius: 4px;
  box-shadow: 0 6px 14px rgba(0,0,0,.3);
}
.ftc.fon {
  border-color: #2563eb !important;
  background: #eff6ff !important;
  color: #1d4ed8 !important;
  box-shadow: 0 0 0 2px #2563eb, 0 10px 24px -5px rgba(37,99,235,.22) !important;
}
.ftc.fon::after {
  content: "✓";
  position: absolute;
  top: 6px;
  right: 6px;
  width: 18px;
  height: 18px;
  background: #2563eb;
  color: #ffffff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 900;
  box-shadow: 0 2px 6px rgba(37,99,235,.4);
}
.fpl {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.fpl button {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid #ffffff;
  box-shadow: 0 0 0 1.5px #cbd5e1;
  cursor: pointer;
  transition: transform .18s, box-shadow .18s;
  padding: 0;
  flex-shrink: 0;
}
.fpl button:hover {
  transform: scale(1.15);
  box-shadow: 0 0 0 2px #2563eb;
}
.ftp input[type=color] {
  appearance: none;
  border: 0;
  width: 30px;
  height: 30px;
  padding: 0;
  border-radius: 50%;
  cursor: pointer;
  background: none;
  flex-shrink: 0;
}
.ftp input[type=color]::-webkit-color-swatch {
  border-radius: 50%;
  border: 2px solid #ffffff;
  box-shadow: 0 0 0 1.5px #cbd5e1;
}
.ftp textarea, .ftp select {
  font: inherit;
  font-size: .8125rem;
  padding: 10px 12px;
  border: 1.5px solid #cbd5e1;
  border-radius: 14px;
  width: 100%;
  background: #ffffff;
  color: #0f172a;
  transition: border-color .15s, box-shadow .15s;
}
.ftp textarea:focus, .ftp select:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37,99,235,.15);
}
.fbtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid #cbd5e1;
  background: #ffffff;
  color: #1e293b;
  padding: 9px 16px;
  border-radius: 14px;
  cursor: pointer;
  font-size: .8125rem;
  font-weight: 700;
  transition: all .15s;
}
.fbtn:hover {
  background: #f8fafc;
  border-color: #94a3b8;
}
.fcta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  color: #ffffff;
  border: 0;
  font-size: .875rem;
  font-weight: 700;
  padding: 10px 20px;
  border-radius: 14px;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(37,99,235,.28);
  transition: all .18s;
}
.fcta:hover {
  box-shadow: 0 8px 22px rgba(37,99,235,.38);
  transform: translateY(-1px);
}
.fupload-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 12px;
  background: #ffffff;
  border: 1.5px solid #cbd5e1;
  color: #1e293b;
  font-size: .75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all .15s;
}
.fupload-btn:hover {
  background: #f8fafc;
  border-color: #94a3b8;
  color: #0f172a;
}
.feye-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1.5px solid #cbd5e1;
  color: #334155;
  font-size: .75rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: all .15s;
}
.feye-btn:hover {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #1d4ed8;
}
#ex {
  margin-top: 24px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}
#emb {
  display: block;
  background: #0f172a;
  color: #93c5fd;
  padding: 12px 14px;
  border-radius: 14px;
  font-size: .8125rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  word-break: break-all;
  margin-top: 10px;
  border: 1px solid #1e293b;
}
@media (max-width: 900px) {
  #ed {
    grid-template-columns: 1fr;
  }
  .fpn {
    position: static;
  }
  .ftp {
    max-height: none;
  }
}
`;

const FAQ_ITEMS = [
  {
    q: "Is the flipbook maker really free, and do I need to sign up?",
    a: "Yes, it is 100% free with no sign-up, no watermark, and no hidden subscriptions. You can create and export as many flipbooks as you want.",
  },
  {
    q: "Are my confidential PDFs or catalog images uploaded to any server?",
    a: "Never. Spellense processes your PDF pages and images 100% locally inside your browser memory using WebAssembly and HTML5 Canvas. Your documents never leave your device.",
  },
  {
    q: "My PDF has two-page spreads. Will they fit nicely?",
    a: "Yes! The tool automatically recognizes two-page spreads and offers to cleanly split them into individual left and right pages for a seamless realistic reading experience.",
  },
  {
    q: "Can I use my own logo and remove Spellense branding?",
    a: "Yes. You can upload your company logo, set a custom publication title and description, and the 'Made with Spellense' badge is completely optional and off by default.",
  },
  {
    q: "Does the downloaded flipbook work offline without internet?",
    a: "Yes! When you click 'Download offline HTML', you receive a self-contained single HTML file with the realistic 3D flipping engine, zoom, sound, and all your pages embedded. Double-click it on Windows, Mac, iPad, or Android and it opens anywhere without internet.",
  },
];

export default function FlipbookClient() {
  const initDone = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  useEffect(() => {
    // Poll until both CDN scripts are loaded, then init DOM-driven logic
    const id = setInterval(() => {
      const w = window as unknown as Record<string, unknown>;
      if (w["pdfjsLib"] && w["jspdf"] && !initDone.current) {
        clearInterval(id);
        initDone.current = true;
        initFlipbookApp();
      }
    }, 150);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#f0f6fe] font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* Inject viewer & editor CSS */}
      <style dangerouslySetInnerHTML={{ __html: VCSS + APP_CSS }} />

      {/* CDN scripts loaded client-side */}
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
        strategy="afterInteractive"
      />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
        strategy="afterInteractive"
      />

      <Navbar />

      <main className="flex-1">
        {/* HERO SECTION — Uniform Spellense tool hero banner */}
        <section className="relative overflow-hidden px-4 pt-12 pb-8 sm:px-6 sm:pt-16 sm:pb-12 lg:pt-20 lg:pb-14">
          <div className="mx-auto max-w-7xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50/90 px-3.5 py-1 text-xs font-bold text-blue-700 shadow-2xs mb-4">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              <span>Free 3D Flipbook Studio • 24 Realistic Book Styles</span>
            </div>
            <h1 className="text-[20px] xs:text-[24px] sm:text-[32px] md:text-[40px] lg:text-[48px] font-extrabold leading-tight tracking-tight text-slate-900 text-center">
              Turn any PDF into a 3D page-flip book.
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-xs sm:text-sm text-slate-600 font-normal leading-relaxed">
              Choose from 24 book styles, add your custom branding, and download an interactive offline HTML file. 100% private in-browser processing.
            </p>
          </div>
        </section>

        {/* WORKSPACE CONTAINER */}
        <div id="fbapp" className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          {/* DROPZONE */}
          <div
            id="drop"
            tabIndex={0}
            role="button"
            aria-label="Upload PDF or images"
            onDragEnter={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            className={`group relative mx-auto max-w-4xl cursor-pointer rounded-[32px] border-2 border-dashed p-8 sm:p-12 text-center transition-all duration-300 backdrop-blur-xl ${
              isDragging
                ? "border-blue-500 bg-blue-50/95 shadow-[0_0_60px_rgba(59,130,246,0.25)] scale-[1.01]"
                : "border-blue-200/90 hover:border-blue-400/80 bg-white/95 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.07),0_0_20px_rgba(59,130,246,0.04)] hover:shadow-[0_25px_70px_-15px_rgba(59,130,246,0.14)]"
            }`}
          >
            {/* FLOATING 3D ICON */}
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
              <div className="absolute inset-0 rounded-3xl bg-blue-500/25 blur-xl transition-all duration-500 group-hover:scale-125 group-hover:bg-blue-500/35" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white shadow-xl shadow-blue-600/35 ring-4 ring-blue-50/90 transition-all duration-300 group-hover:-translate-y-1 group-hover:scale-105">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                  <path d="M6 6h10" />
                  <path d="M6 10h10" />
                  <path d="M6 14h6" />
                </svg>
              </div>
            </div>

            <h2 className="mt-5 text-xl sm:text-2xl font-black tracking-tight text-slate-900 group-hover:text-blue-900 transition-colors">
              Drop your PDF or images here
            </h2>
            <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm text-slate-500 font-medium">
              Supports multi-page PDFs, JPG, PNG, and WebP • 100% private in your browser
            </p>

            {/* BUTTONS: UPLOAD & TRY DEMO */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-600/35">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>Choose PDF or Images</span>
              </span>

              <button
                type="button"
                id="btn-sample"
                onClick={(e) => {
                  e.stopPropagation();
                  const w = window as unknown as Record<string, unknown>;
                  if (typeof w["loadSampleCatalog"] === "function") {
                    (w["loadSampleCatalog"] as () => void)();
                  }
                }}
                className="inline-flex items-center gap-2 rounded-2xl border-1.5 border-slate-200 bg-white/90 px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition-all duration-200 hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-700 hover:-translate-y-0.5"
              >
                <span>✨ Try Demo Catalog</span>
              </button>
            </div>

            {/* BADGES */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] font-bold text-slate-700">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100/80 px-3 py-1 shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                PDF Catalogs
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100/80 px-3 py-1 shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                24 Book Styles
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100/80 px-3 py-1 shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Offline HTML Export
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100/80 px-3 py-1 shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                Zero Upload
              </span>
            </div>

            <div id="st" aria-live="polite" className="mt-4 text-xs font-semibold text-blue-600 min-h-[1.5em]"></div>
          </div>
          <input type="file" id="fi" accept="application/pdf,image/*" multiple hidden />

          {/* WIDE-PAGE SPREAD DIALOG */}
          <div className="mx-auto mt-6 max-w-4xl rounded-2xl border border-amber-200 bg-amber-50/90 p-5 shadow-xs" id="ask" hidden>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <b className="text-sm font-bold text-amber-900">Wide pages detected.</b>
                <p className="text-xs text-amber-800 mt-0.5">They look like two-page spreads. How would you like to display them?</p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <button className="fcta text-xs py-2 px-4" data-m="split">Split into left &amp; right pages</button>
                <button className="fbtn text-xs py-2 px-4" data-m="single">Keep each as one page</button>
              </div>
            </div>
          </div>

          {/* FLIPBOOK WORKSPACE: PREVIEW + CUSTOMIZE PANEL */}
          <section id="ed" className="mt-8" hidden>
            {/* LEFT: INTERACTIVE 3D CANVAS */}
            <div id="pv" className="rounded-3xl border border-slate-200/80 bg-white/95 p-4 sm:p-6 shadow-xl shadow-slate-900/5 backdrop-blur-xl"></div>

            {/* RIGHT: SPELLENSE DESIGNED CUSTOMIZER PANEL */}
            <div className="fpn">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">Customizer</span>
                </div>
                <span className="text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">24 Styles</span>
              </div>

              {/* 5-COL COMPACT SEGMENTED TABS */}
              <div className="ftb" role="tablist">
                <button className="fon" data-p="st">Style</button>
                <button data-p="br">Brand</button>
                <button data-p="bg">Backdrop</button>
                <button data-p="ly">Layout</button>
                <button data-p="kt">Kit</button>
              </div>

              {/* Style panel */}
              <div className="ftp" id="p-st"><div className="ftg" id="tg"></div></div>

              {/* Branding panel */}
              <div className="ftp" id="p-br" hidden>
                {/* Custom cover image */}
                <div>
                  <span className="text-[13px] font-bold text-slate-800">Custom cover image (replaces page 1)</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <label htmlFor="cv" className="fupload-btn">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      <span>Choose Cover Image</span>
                      <input type="file" id="cv" accept="image/*" className="hidden" />
                    </label>
                    <div id="cv-status" className="flex items-center gap-2 hidden">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 text-[11px] font-bold">
                        ✓ Cover set
                      </span>
                      <button type="button" className="text-xs font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer" id="cvx">
                        Remove cover
                      </button>
                    </div>
                  </div>
                </div>

                {/* Your logo */}
                <div>
                  <span className="text-[13px] font-bold text-slate-800">Your logo (shows top left)</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <label htmlFor="lg" className="fupload-btn">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      <span>Upload Logo</span>
                      <input type="file" id="lg" accept="image/*" className="hidden" />
                    </label>
                    <div id="lg-status" className="flex items-center gap-2 hidden">
                      <img id="lg-thumb" src="" alt="Logo" className="h-6 w-auto max-w-[48px] object-contain rounded border border-slate-200" />
                      <button type="button" className="text-xs font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer" id="lgx">
                        Remove logo
                      </button>
                    </div>
                  </div>
                </div>

                {/* Extracted logo palette banner */}
                <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3.5" id="lo" hidden>
                  <p className="text-xs font-bold text-blue-900">Extracted logo palette ready</p>
                  <p className="text-[11px] text-blue-700 mt-0.5">Apply your logo brand colors to the flipbook backdrop:</p>
                  <div className="mt-2.5">
                    <button className="fcta text-xs py-1.5 px-3.5" id="lu">Use logo colors</button>
                  </div>
                </div>

                <label>
                  Description (shows top right)
                  <textarea id="ds" rows={3} maxLength={160} placeholder="Spring Catalog 2026 • Call 555-0100"></textarea>
                </label>

                <label className="inline-flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer select-none py-1">
                  <input type="checkbox" id="lr" className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600" />
                  <span>Swap sides: logo right, text left</span>
                </label>

                <label className="inline-flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer select-none py-1">
                  <input type="checkbox" id="cr" className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600" />
                  <span>Show subtle &ldquo;Made with Spellense&rdquo; credit</span>
                </label>
              </div>

              {/* Background panel */}
              <div className="ftp" id="p-bg" hidden>
                <div>
                  <span className="text-[13px] font-bold text-slate-800">Theme Palettes</span>
                  <div className="fpl mt-2" id="pal"></div>
                </div>

                <div>
                  <span className="text-[13px] font-bold text-slate-800">Colors from your logo</span>
                  <div className="fpl mt-2" id="lp">
                    <span className="text-xs text-slate-400">Upload a logo in the Brand tab to see matching colors</span>
                  </div>
                </div>

                <div>
                  <span className="text-[13px] font-bold text-slate-800">Custom Backdrop Colors</span>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <div className="flex items-center gap-2">
                      <div className="relative flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xs">
                        <input type="color" id="c1" aria-label="Color 1" />
                        <span className="text-[11px] font-bold text-slate-500 uppercase pr-1" id="c1-val">#F8FAFC</span>
                      </div>
                      <div className="relative flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xs">
                        <input type="color" id="c2" aria-label="Color 2" />
                        <span className="text-[11px] font-bold text-slate-500 uppercase pr-1" id="c2-val">#E2E8F0</span>
                      </div>
                    </div>
                    <button type="button" className="feye-btn" id="eye" title="Pick color from screen">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m2 22 1-1h3l9-9"/>
                        <path d="M3 21v-3l9-9"/>
                        <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8"/>
                      </svg>
                      <span>Pick from screen</span>
                    </button>
                  </div>
                </div>

                <label className="inline-flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer select-none py-1">
                  <input type="checkbox" id="gr" className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600" />
                  <span>Use gradient background</span>
                </label>

                {/* Backdrop photo */}
                <div>
                  <span className="text-[13px] font-bold text-slate-800">Backdrop photo</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <label htmlFor="bi" className="fupload-btn">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      <span>Choose Photo</span>
                      <input type="file" id="bi" accept="image/*" className="hidden" />
                    </label>
                    <div id="bi-status" className="flex items-center gap-2 hidden">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 text-[11px] font-bold">
                        ✓ Photo active
                      </span>
                      <button type="button" className="text-xs font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer" id="bix">
                        Remove photo
                      </button>
                    </div>
                  </div>
                </div>

                <label>
                  Darken photo overlay
                  <input type="range" id="dm" min="0" max=".8" step=".05" className="accent-blue-600 mt-1" />
                </label>
              </div>

              {/* Layout panel */}
              <div className="ftp" id="p-ly" hidden>
                <label>
                  Two-page spread handling
                  <select id="md">
                    <option value="ask">Ask me when wide pages are found</option>
                    <option value="single">Keep every page as is</option>
                    <option value="split">Split wide pages into left and right</option>
                  </select>
                </label>

                <label className="inline-flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer select-none py-1">
                  <input type="checkbox" id="sh" className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600" />
                  <span>Shift by one page (fix booklet spreads)</span>
                </label>

                <label className="inline-flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer select-none py-1">
                  <input type="checkbox" id="sn" className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600" />
                  <span>Realistic page-turn sound effects</span>
                </label>
              </div>

              {/* Brand kit panel */}
              <div className="ftp" id="p-kt" hidden>
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    Your chosen style, logo, text, and palette automatically save locally in this browser. Export as JSON to reuse on other computers or teammates.
                  </p>
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  <button className="fbtn w-full justify-center" id="ke">Export brand kit (.json)</button>
                  <label className="fbtn w-full justify-center text-center cursor-pointer">
                    Import brand kit
                    <input type="file" id="ki" accept=".json" hidden />
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* EXPORT ACTION ROW */}
          <div id="ex" className="mt-8 rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-lg shadow-slate-900/5 backdrop-blur-xl" hidden>
            <div className="flex flex-wrap items-center gap-3 w-full">
              <button className="fcta" id="dl">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download Offline HTML
              </button>
              <button className="fbtn" id="dp">Download as PDF</button>
              <button className="fbtn" id="pvw">Preview in New Tab</button>
              <button className="fbtn ml-auto text-slate-500 hover:text-red-600" id="nw">Start Over</button>
            </div>

            {/* EMBED SNIPPET COLLAPSIBLE */}
            <details className="mt-5 w-full rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
              <summary className="text-xs sm:text-sm font-bold text-slate-800 cursor-pointer">
                Embed flipbook on your website or blog (Iframe code)
              </summary>
              <p className="mt-2 text-xs text-slate-500">
                Host your exported HTML file on your web hosting or CDN, then enter its URL below to generate the embed code:
              </p>
              <div className="mt-3 grid gap-3">
                <input
                  id="eu"
                  placeholder="https://yoursite.com/flipbook.html"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                />
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700">
                  <label className="flex items-center gap-1.5">
                    Width: <input id="ew" defaultValue="100%" size={6} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs" />
                  </label>
                  <label className="flex items-center gap-1.5">
                    Height (px): <input id="eh" defaultValue="600" size={6} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs" />
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" id="ea" /> Start auto-play
                  </label>
                </div>
              </div>
              <code id="emb"></code>
              <button className="fsm mt-3" id="ec">Copy embed code</button>
            </details>
          </div>

          {/* 3-STEP WORKFLOW CARDS */}
          <div className="mt-16">
            <div className="text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                Step-by-Step Workflow
              </span>
              <h2 className="mt-1 text-xl sm:text-2xl font-black text-slate-900">
                How Spellense Flipbook Works
              </h2>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-black">
                  1
                </div>
                <h3 className="mt-3 text-sm font-bold text-slate-900">Drop PDF or Images</h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed font-normal">
                  Upload any brochure, catalog, portfolio, or magazine. All rendering happens safely in-browser with zero upload.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-black">
                  2
                </div>
                <h3 className="mt-3 text-sm font-bold text-slate-900">Pick Style &amp; Brand</h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed font-normal">
                  Select from 24 book styles including Vintage Leather, Spiral Notebook, Neon Cyberpunk, add your logo and sound.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-black">
                  3
                </div>
                <h3 className="mt-3 text-sm font-bold text-slate-900">Download Offline HTML</h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed font-normal">
                  Get a single interactive HTML file with realistic 3D flipping engine embedded. Works on Windows, Mac, iOS, or Android without internet.
                </p>
              </div>
            </div>
          </div>

          {/* ACCORDION FAQ */}
          <section className="mt-16 mx-auto max-w-4xl">
            <div className="text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                Frequently Asked Questions
              </span>
              <h2 className="mt-1 text-xl sm:text-2xl font-black text-slate-900">
                Everything About Spellense Flipbook Maker
              </h2>
            </div>

            <div className="mt-8 space-y-3">
              {FAQ_ITEMS.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white transition hover:border-blue-200 shadow-2xs"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="flex w-full items-center justify-between p-5 text-left text-sm font-bold text-slate-900"
                    >
                      <span>{faq.q}</span>
                      <span
                        className={`ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform duration-200 ${
                          isOpen ? "rotate-180 bg-blue-50 text-blue-600" : ""
                        }`}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </span>
                    </button>

                    {isOpen && (
                      <div className="border-t border-slate-100 px-5 pt-3 pb-5 text-xs sm:text-sm leading-relaxed text-slate-600 font-normal animate-in fade-in duration-150">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* MORE FREE TOOLS */}
          <div className="mt-16 text-center text-xs sm:text-sm text-slate-500">
            <span>Explore more free tools: </span>
            <Link href="/image-compressor" className="font-semibold text-blue-600 hover:underline">
              Compress Images
            </Link>
            <span className="mx-2">•</span>
            <Link href="/" className="font-semibold text-blue-600 hover:underline">
              Spell Checker
            </Link>
            <span className="mx-2">•</span>
            <Link href="/design-check" className="font-semibold text-blue-600 hover:underline">
              Design Check QA
            </Link>
            <span className="mx-2">•</span>
            <Link href="/image-to-text" className="font-semibold text-blue-600 hover:underline">
              Image to Text
            </Link>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200/70 bg-white px-5 py-8 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
            <div>
              <div className="text-lg font-bold">
                Spel<span className="text-blue-600">lense</span>
              </div>
              <p className="mt-1 text-xs text-gray-400 font-normal">
                Simple English spell checking and text tools.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs text-gray-400 font-normal">
              <Link href="/" className="transition hover:text-gray-700">Home</Link>
              <Link href="/about" className="transition hover:text-gray-700">About</Link>
              <Link href="/blog" className="transition hover:text-gray-700">Blog</Link>
              <Link href="/design-check" className="transition hover:text-gray-700">Design Check</Link>
              <Link href="/case-converter" className="transition hover:text-gray-700">Case Converter</Link>
              <Link href="/us-uk-converter" className="transition hover:text-gray-700">US ↔ UK Dialect</Link>
              <Link href="/image-to-text" className="transition hover:text-gray-700">Image to Text</Link>
              <Link href="/image-compressor" className="transition hover:text-gray-700">Image Compressor</Link>
              <Link href="/flipbook" className="font-semibold text-blue-600">Flipbook</Link>
              <Link href="/faq" className="transition hover:text-gray-700">FAQ</Link>
              <Link href="/privacy" className="transition hover:text-gray-700">Privacy</Link>
              <Link href="/terms" className="transition hover:text-gray-700">Terms</Link>
              <a href="mailto:hello@spellense.com" className="transition hover:text-gray-700">Contact</a>
            </div>
          </div>

          <div className="mt-6 border-t border-gray-100 pt-5 text-center text-[11px] text-gray-300 font-normal">
            © 2026 Spellense. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── All flipbook app logic (pure DOM, called once after CDN scripts load) ──────
function initFlipbookApp() {
  const w = window as unknown as Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjsLib = w["pdfjsLib"] as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jspdfLib = w["jspdf"] as any;

  if (pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  // ── Constants ──────────────────────────────────────────────────────────────
  const N =
    'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27140%27 height=%27140%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence baseFrequency=%27.85%27 numOctaves=%272%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27 opacity=%27.3%27/%3E%3C/svg%3E")';

  const THEMES = [
    { n: "Pure Minimal", b: "#fff", pd: 0.016, r: 2, sp: "s", f: "none", x: "0 25px 60px -10px rgba(0,0,0,.25)", c1: "#f8fafc", c2: "#e2e8f0" },
    { n: "Modern Magazine", b: "#111", pd: 0.024, r: 0, sp: "s", f: "none", x: "0 25px 60px rgba(0,0,0,.4)", c1: "#e2e8f0", c2: "#cbd5e1" },
    { n: "Scandinavian Clean", b: "#e8e3da", pd: 0.028, r: 4, sp: "s", f: "none", x: "0 20px 50px rgba(0,0,0,.2)", c1: "#f5f1ea", c2: "#e6dfd3" },
    { n: "Typographic Editorial", b: "#fff", pd: 0.02, r: 0, sp: "s", f: "none", x: "10px 10px 0 #111", c1: "#fef08a", c2: "#facc15" },
    { n: "Midnight Luxury", b: "linear-gradient(135deg,#1a1a1a,#000)", pd: 0.035, r: 4, sp: "s", f: "none", x: "0 0 0 2px #d4af37,0 30px 70px #000", c1: "#0b0b0f", c2: "#1a1a22" },
    { n: "Glass Dark", b: "rgba(255,255,255,.18)", pd: 0.028, r: 10, sp: "s", f: "none", x: "0 0 0 1px rgba(255,255,255,.4),0 30px 80px rgba(0,0,0,.6)", c1: "#0f172a", c2: "#312e81" },
    { n: "Noir Corporate", b: "linear-gradient(135deg,#2b2f36,#14161a)", pd: 0.032, r: 2, sp: "s", f: "none", x: "0 0 0 2px #9ca3af,0 25px 60px rgba(0,0,0,.5)", c1: "#1f2937", c2: "#0b0f14" },
    { n: "Neon Cyberpunk", b: "#0a0a12", pd: 0.025, r: 2, sp: "s", f: "none", x: "0 0 0 2px #0ff,0 0 30px #0ff,0 0 90px rgba(255,0,255,.5)", c1: "#050510", c2: "#1b0033" },
    { n: "Kraft Paper", b: N + ",#b08a5b", pd: 0.035, r: 3, sp: "st", f: "sepia(.12)", x: "0 25px 50px rgba(0,0,0,.25)", c1: "#f3e7d3", c2: "#d9c3a0" },
    { n: "Linen Hardcover", b: "repeating-linear-gradient(45deg,#2f4f6f 0 2px,#345a7d 2px 4px)", pd: 0.038, r: 4, sp: "s", f: "none", x: "0 25px 55px rgba(0,0,0,.35)", c1: "#dbe7f3", c2: "#a9c1d9" },
    { n: "Vintage Leather", b: N + ",#5b3a24", pd: 0.045, r: 4, sp: "st", f: "sepia(.25) contrast(.96)", x: "0 30px 70px rgba(0,0,0,.6)", c1: "#3b2a1c", c2: "#1e140c" },
    { n: "Watercolor Edge", b: "radial-gradient(circle at 20% 20%,#f9a8d4,transparent 50%),radial-gradient(circle at 80% 30%,#93c5fd,transparent 50%),radial-gradient(circle at 50% 90%,#fde68a,transparent 50%),#fff", pd: 0.04, r: 14, sp: "s", f: "none", x: "0 20px 50px rgba(0,0,0,.15)", c1: "#fdf2f8", c2: "#e0f2fe" },
    { n: "Gradient Mesh", b: "radial-gradient(at 0 0,#6366f1,transparent 60%),radial-gradient(at 100% 0,#ec4899,transparent 60%),radial-gradient(at 50% 100%,#14b8a6,transparent 60%),#1e1b4b", pd: 0.035, r: 12, sp: "s", f: "none", x: "0 25px 60px rgba(0,0,0,.4)", c1: "#1e1b4b", c2: "#4c1d95" },
    { n: "Duotone Pop", b: "linear-gradient(135deg,#ff3d81,#ffb400)", pd: 0.035, r: 6, sp: "s", f: "none", x: "8px 8px 0 #111", c1: "#fff4d6", c2: "#ffd6e7" },
    { n: "Retro Print", b: N + ",#d9822b", pd: 0.038, r: 3, sp: "s", f: "sepia(.2) saturate(1.1)", x: "0 25px 55px rgba(0,0,0,.25)", c1: "#fbe8c8", c2: "#e9b872" },
    { n: "Pastel Soft", b: "#fbcfe8", pd: 0.032, r: 18, sp: "s", f: "none", x: "0 20px 50px rgba(249,168,212,.5)", c1: "#fdf4ff", c2: "#e0f2fe" },
    { n: "Spiral Notebook", b: "#fff", pd: 0.015, r: 3, sp: "sp", f: "none", x: "0 20px 50px rgba(0,0,0,.2)", c1: "#e2e8f0", c2: "#94a3b8" },
    { n: "Ring Binder", b: "#1d4ed8", pd: 0.038, r: 4, sp: "rg", f: "none", x: "0 25px 55px rgba(0,0,0,.35)", c1: "#dbeafe", c2: "#93c5fd" },
    { n: "Portfolio Case", b: "#222", pd: 0.05, r: 6, sp: "s", f: "none", x: "0 0 0 4px #444,0 30px 70px rgba(0,0,0,.6)", c1: "#e5e5e5", c2: "#bdbdbd" },
    { n: "Newspaper Fold", b: "#e9e4d6", pd: 0.018, r: 0, sp: "s", f: "grayscale(.5) contrast(1.05)", x: "0 20px 45px rgba(0,0,0,.2)", c1: "#d6d1c4", c2: "#b9b3a3" },
    { n: "Art Deco", b: "repeating-linear-gradient(90deg,#0b3d2e 0 10px,#0f4c39 10px 12px)", pd: 0.038, r: 0, sp: "s", f: "none", x: "0 0 0 3px #c9a227,0 30px 70px rgba(0,0,0,.6)", c1: "#06281e", c2: "#0b3d2e" },
    { n: "Terracotta Earth", b: "linear-gradient(135deg,#c2603a,#8f3f21)", pd: 0.035, r: 8, sp: "s", f: "none", x: "0 25px 55px rgba(0,0,0,.35)", c1: "#f5e1d3", c2: "#e2b79a" },
    { n: "Holographic Foil", b: "linear-gradient(120deg,#a5f3fc,#f0abfc,#fde68a,#a7f3d0,#a5f3fc)", pd: 0.035, r: 10, sp: "s", f: "none", x: "0 25px 60px rgba(0,0,0,.4)", c1: "#0f172a", c2: "#1e293b" },
    { n: "Festive Seasonal", b: "linear-gradient(135deg,#b91c1c,#166534)", pd: 0.035, r: 6, sp: "s", f: "none", x: "0 0 0 3px #fde68a,0 25px 60px rgba(0,0,0,.5)", c1: "#450a0a", c2: "#052e16" },
  ];

  const esc = (s: unknown) =>
    String(s || "").replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m] || m));

  const lum = (h: string) => {
    h = String(h || "#fff").replace("#", "");
    if (h.length === 3) h = h.replace(/./g, "$&$&");
    const v = parseInt(h, 16);
    return (0.299 * (v >> 16) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)) / 255;
  };

  // ── Global Audio Context for Page Turns ────────────────────────────────────
  let globalAudioCtx: AudioContext | null = null;
  const playPageSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!globalAudioCtx) globalAudioCtx = new AudioCtx();
      if (globalAudioCtx.state === "suspended") globalAudioCtx.resume();
      const b = globalAudioCtx.createBuffer(1, Math.floor(globalAudioCtx.sampleRate * 0.14), globalAudioCtx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3) * 0.35;
      }
      const r = globalAudioCtx.createBufferSource();
      const f = globalAudioCtx.createBiquadFilter();
      r.buffer = b;
      f.type = "lowpass";
      f.frequency.value = 1600;
      r.connect(f);
      f.connect(globalAudioCtx.destination);
      r.start();
    } catch (_) { /* silent */ }
  };

  // ── Viewer engine ──────────────────────────────────────────────────────────
  function Viewer(root: HTMLElement & { _off?: () => void }, c: Record<string, unknown>) {
    if (root._off) root._off();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const T: any = (THEMES as any[])[c.theme as number] || THEMES[0];
    const P = c.pages as string[];
    const n = P.length;
    const L = Math.ceil(n / 2);
    const maxS = n % 2 ? L - 1 : L;
    const sp = (c.speed as number) || 0.8;
    const img = c.bgType === "img" && c.bgImg;
    let s = typeof c.curPage === "number" ? Math.max(0, Math.min(maxS, c.curPage)) : 0;
    let W = 0, H = 0, z = 1, snd = !!c.sound, tm = 0;
    let dr: null | { x: number; sd: number; m: number; p: number } = null;
    let au: number | ReturnType<typeof setInterval> = 0;

    root.className = "fbv" + (c.full ? " full" : "");
    root.style.background = img
      ? "url(" + c.bgImg + ") center/cover"
      : c.bgType === "grad"
      ? "linear-gradient(135deg," + c.bg1 + "," + c.bg2 + ")"
      : (c.bg1 as string);
    root.style.color = img || lum(c.bg1 as string) < 0.5 ? "#fff" : "#0f172a";
    root.style.setProperty("--pf", T.f);
    root.style.setProperty("--pr", T.r + "px");

    let h = img ? '<div class="ov" style="background:rgba(0,0,0,' + (c.dim || 0) + ')"></div>' : "";
    if (c.logo || c.desc) {
      h +=
        '<div class="fbh' +
        (c.logoRight ? " rv" : "") +
        '">' +
        (c.logo ? '<img src="' + c.logo + '" alt="Logo">' : "<span></span>") +
        "<p>" + esc(c.desc) + "</p></div>";
    }

    h += '<div class="stage"><div class="bk" style="--sp:' + sp + 's"><div class="bd" style="background:' + T.b + ";box-shadow:" + T.x + ";border-radius:" + (T.r + 6) + 'px"></div>';
    for (let j = 0; j < L; j++) {
      h +=
        '<div class="lf"><div class="fc f"><img src="' + P[2 * j] + '" alt="Page ' + (2 * j + 1) + '" draggable="false"></div><div class="fc b">' +
        (P[2 * j + 1] ? '<img src="' + P[2 * j + 1] + '" alt="Page ' + (2 * j + 2) + '" draggable="false">' : "") +
        "</div></div>";
    }

    h +=
      (T.sp && T.sp !== "s" ? '<div class="sp ' + T.sp + '"></div>' : "") +
      '</div></div><div class="ct"><button data-a="p" title="Previous page" aria-label="Previous page">\u2039</button><span class="pg"></span><button data-a="n" title="Next page" aria-label="Next page">\u203a</button><button data-a="t" title="Thumbnails" aria-label="Thumbnails">\u25a6</button><button data-a="z" title="Zoom" aria-label="Zoom">\uff0b</button><button data-a="s" title="Sound toggle" aria-label="Page-turn sound">' + (snd ? "\ud83d\udd0a" : "\ud83d\udd08") + '</button><button data-a="a" title="Autoplay" aria-label="Auto-play">\u25b6</button><button data-a="f" title="Fullscreen" aria-label="Fullscreen">\u26f6</button></div><div class="th" hidden></div>' +
      (c.credit ? '<a class="cr" href="https://spellense.com/flipbook" target="_blank" rel="noopener">Made with Spellense</a>' : "");

    root.innerHTML = h;
    const q = (k: string) => root.querySelector(k) as HTMLElement;
    const bk = q(".bk") as HTMLElement;
    const bd = q(".bd") as HTMLElement;
    const st = q(".stage") as HTMLElement;
    const pg = q(".pg") as HTMLElement;
    const lvs = [...root.querySelectorAll(".lf")] as HTMLElement[];
    const cl = (v: number) => Math.max(0, Math.min(maxS, v));

    const tick = () => {
      if (snd) playPageSound();
    };

    const place = () => {
      lvs.forEach((e, j) => {
        e.style.transform = "rotateY(" + (j < s ? -180 : 0) + "deg)";
        e.style.zIndex = String(j < s ? j + 1 : L - j);
      });
      bk.style.transform =
        "translateX(" + (s === 0 ? -W / 2 : s === maxS && n % 2 === 0 ? W / 2 : 0) + "px)";
      pg.textContent =
        s === 0
          ? "1 / " + n
          : (2 * s + 1 > n ? 2 * s : 2 * s + "\u2013" + (2 * s + 1)) + " / " + n;
      S.curPage = s;
    };

    const fit = () => {
      const aw = Math.max(260, root.clientWidth - 40);
      const ah = document.fullscreenElement ? innerHeight - 160 : Math.min(innerHeight * 0.72, 740);
      W = Math.min(aw / 2, ah * (c.ratio as number)) * z;
      H = W / (c.ratio as number);
      const p = Math.max(6, Math.round(W * T.pd));
      bk.style.width = 2 * W + "px";
      bk.style.height = H + "px";
      bd.style.inset = "-" + p + "px";
      st.style.padding = p + 4 + "px 0";
      lvs.forEach((e) => { e.style.width = W + "px"; e.style.height = H + "px"; });
      const sq = q(".sp") as HTMLElement | null;
      if (sq) { sq.style.top = sq.style.bottom = "-" + p + "px"; }
      place();
    };

    const go = (dir: number) => {
      const ns = cl(s + dir);
      if (ns === s) { place(); return; }
      const m = dir > 0 ? s : s - 1;
      s = ns;
      place();
      if (lvs[m]) lvs[m].style.zIndex = String(L + 5);
      tick();
      clearTimeout(tm as number);
      tm = setTimeout(place, sp * 1000 + 60) as unknown as number;
    };

    bk.addEventListener("pointerdown", (e) => {
      const rect = bk.getBoundingClientRect();
      const sd = e.clientX - rect.left > rect.width / 2 ? 1 : -1;
      if ((sd > 0 && s >= maxS) || (sd < 0 && s <= 0)) return;
      const m = sd > 0 ? s : s - 1;
      dr = { x: e.clientX, sd, m, p: 0 };
      if (lvs[m]) {
        lvs[m].style.transition = "none";
        lvs[m].style.zIndex = String(L + 5);
      }
      bk.setPointerCapture(e.pointerId);
    });

    bk.addEventListener("pointermove", (e) => {
      if (!dr || !lvs[dr.m]) return;
      dr.p = Math.min(1, Math.max(0, ((e.clientX - dr.x) * -dr.sd) / W));
      lvs[dr.m].style.transform = "rotateY(" + (dr.sd > 0 ? -180 * dr.p : -180 + 180 * dr.p) + "deg)";
    });

    const up = () => {
      const d = dr;
      dr = null;
      if (!d || !lvs[d.m]) return;
      lvs[d.m].style.transition = "";
      if (d.p < 0.04 || d.p > 0.3) go(d.sd);
      else place();
    };
    bk.addEventListener("pointerup", up);
    bk.addEventListener("pointercancel", up);

    const key = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && /INPUT|TEXTAREA|SELECT/.test(el.tagName)) return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };

    const ro = new ResizeObserver(fit);
    ro.observe(root);
    addEventListener("keydown", key);
    document.addEventListener("fullscreenchange", fit);

    root._off = () => {
      ro.disconnect();
      removeEventListener("keydown", key);
      document.removeEventListener("fullscreenchange", fit);
      clearInterval(au as number);
    };

    (q(".ct") as HTMLElement).onclick = (e) => {
      const b = (e.target as HTMLElement).closest("button") as HTMLButtonElement | null;
      if (!b) return;
      const a = b.dataset.a;
      if (a === "p") go(-1);
      if (a === "n") go(1);
      if (a === "z") { z = z >= 2.2 ? 1 : z + 0.4; fit(); }
      if (a === "s") {
        snd = !snd;
        S.sound = snd;
        const snInput = document.getElementById("sn") as HTMLInputElement | null;
        if (snInput) snInput.checked = snd;
        b.textContent = snd ? "\ud83d\udd0a" : "\ud83d\udd08";
        tick();
      }
      if (a === "f") {
        document.fullscreenElement ? document.exitFullscreen() : root.requestFullscreen && root.requestFullscreen();
      }
      if (a === "a") {
        if (au) {
          clearInterval(au as number);
          au = 0;
          b.textContent = "\u25b6";
        } else {
          b.textContent = "\u23f8";
          au = setInterval(() => {
            if (s >= maxS) { s = 0; place(); }
            else go(1);
          }, 3200);
        }
      }
      if (a === "t") {
        const t = q(".th") as HTMLElement;
        if (!t.innerHTML) {
          t.innerHTML = P.map((u, i) => (u ? '<img data-i="' + i + '" src="' + u + '" alt="Go to page ' + (i + 1) + '">' : "")).join("");
        }
        t.hidden = !t.hidden;
      }
    };

    (q(".th") as HTMLElement).onclick = (e) => {
      const i = (e.target as HTMLElement).dataset.i;
      if (i == null) return;
      s = cl(i === "0" ? 0 : Math.ceil(Number(i) / 2));
      place();
      tick();
    };

    fit();
  }

  // ── App state & helpers ────────────────────────────────────────────────────
  const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";
  const PAL = [
    ["Ocean", "#0ea5e9", "#1e3a8a"],
    ["Sunset", "#fb7185", "#f59e0b"],
    ["Forest", "#065f46", "#022c22"],
    ["Mono", "#111827", "#374151"],
    ["Lavender", "#c4b5fd", "#818cf8"],
    ["Sand", "#f5efe6", "#d6c7ae"],
    ["Rose", "#fecdd3", "#f472b6"],
    ["Midnight", "#0f172a", "#312e81"],
    ["Mint", "#d1fae5", "#6ee7b7"],
    ["Snow", "#ffffff", "#e5e7eb"],
  ];

  const load1 = () => { try { return JSON.parse(localStorage.spFbKit || "{}"); } catch (_) { return {}; } };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const S: Record<string, any> = Object.assign(
    { theme: 0, logo: "", desc: "", logoRight: false, credit: false, bgType: "grad", bg1: "#f8fafc", bg2: "#e2e8f0", bgImg: "", dim: 0.35, sound: false, bgTouched: false, mode: "ask", shift: false, cover: "", curPage: 0 },
    load1()
  );

  let RAW: string[] = [], pages: string[] = [], ratio = 0.72, tmr = 0;
  let LC: string[] = [], TH = "";

  const li = (u: string): Promise<HTMLImageElement> =>
    new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = u; });

  async function f2u(f: File, max: number, type: string, q: number): Promise<string> {
    const i = await li(URL.createObjectURL(f));
    const k = Math.min(1, max / Math.max(i.width, i.height));
    const c = document.createElement("canvas");
    c.width = Math.round(i.width * k);
    c.height = Math.round(i.height * k);
    c.getContext("2d")!.drawImage(i, 0, 0, c.width, c.height);
    return c.toDataURL(type, q);
  }

  const status = (t: string) => { const el = document.getElementById("st"); if (el) el.textContent = t; };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getEl = (id: string): any => document.getElementById(id);

  async function loadFiles(files: FileList | null) {
    if (!files || !files.length) return;
    status("Reading files…");
    RAW = [];
    try {
      for (const f of Array.from(files)) {
        if (f.type === "application/pdf" || /\.pdf$/i.test(f.name)) {
          const pdf = await pdfjsLib.getDocument({ data: await f.arrayBuffer() }).promise;
          for (let i = 1; i <= pdf.numPages; i++) {
            const p = await pdf.getPage(i);
            const v1 = p.getViewport({ scale: 1 });
            const w = v1.width / v1.height > 1.15 ? 1800 : 1000;
            const vp = p.getViewport({ scale: w / v1.width });
            const c = document.createElement("canvas");
            c.width = vp.width;
            c.height = vp.height;
            await p.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
            RAW.push(c.toDataURL("image/jpeg", 0.85));
            status("Converting page " + i + " of " + pdf.numPages);
          }
        } else if (f.type.startsWith("image/")) {
          RAW.push(await f2u(f, 1600, "image/jpeg", 0.88));
        }
      }
      if (!RAW.length) throw new Error("no pages");
      if (await derive()) {
        getEl("ed").hidden = false;
        getEl("ex").hidden = false;
        status("Ready. " + pages.length + " pages loaded.");
        getEl("ed").scrollIntoView({ behavior: "smooth" });
      }
    } catch (_) {
      status("Could not read that file. Use a PDF, JPG, PNG or WebP.");
    }
  }

  // ── Sample Catalog Generator for Instant 1-Click Demo ──────────────────────
  async function loadSampleCatalog() {
    status("Generating demo catalog pages…");
    const demoPages: string[] = [];
    const colors = [
      { bg1: "#1e1b4b", bg2: "#312e81", title: "SPELLENSE 2026", sub: "EDITORIAL DESIGN & CREATIVE LOOKBOOK", p: 1 },
      { bg1: "#f8fafc", bg2: "#e2e8f0", title: "TABLE OF CONTENTS", sub: "01 Architecture • 02 Materials • 03 Colorways", p: 2 },
      { bg1: "#064e3b", bg2: "#022c22", title: "MINIMALIST LIVING", sub: "Crafted for peaceful modern aesthetics", p: 3 },
      { bg1: "#78350f", bg2: "#451a03", title: "ORGANIC TEXTURES", sub: "Hand-finished walnut, leather & linen", p: 4 },
      { bg1: "#831843", bg2: "#500724", title: "SEASONAL PALETTES", sub: "Vibrant hues curated for print & digital", p: 5 },
      { bg1: "#0f172a", bg2: "#020617", title: "SPELLENSE STUDIO", sub: "Thank you for reading • spellense.com", p: 6 },
    ];

    for (const c of colors) {
      const cvs = document.createElement("canvas");
      cvs.width = 800;
      cvs.height = 1120;
      const ctx = cvs.getContext("2d")!;

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 800, 1120);
      grad.addColorStop(0, c.bg1);
      grad.addColorStop(1, c.bg2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 800, 1120);

      // Decorative shapes
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.beginPath();
      ctx.arc(700, 200, 300, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(100, 900, 250, 0, Math.PI * 2);
      ctx.fill();

      // Border frame
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 40, 720, 1040);

      // Text styling
      ctx.fillStyle = c.bg1 === "#f8fafc" ? "#0f172a" : "#ffffff";
      ctx.textAlign = "center";

      // Tag
      ctx.font = "bold 16px system-ui, sans-serif";
      ctx.fillStyle = c.bg1 === "#f8fafc" ? "#2563eb" : "#93c5fd";
      ctx.fillText("SPELLENSE FLIPBOOK DEMO", 400, 380);

      // Title
      ctx.font = "800 42px system-ui, sans-serif";
      ctx.fillStyle = c.bg1 === "#f8fafc" ? "#0f172a" : "#ffffff";
      ctx.fillText(c.title, 400, 450);

      // Subtitle
      ctx.font = "500 20px system-ui, sans-serif";
      ctx.fillStyle = c.bg1 === "#f8fafc" ? "#475569" : "#cbd5e1";
      ctx.fillText(c.sub, 400, 500);

      // Page indicator badge
      ctx.fillStyle = c.bg1 === "#f8fafc" ? "rgba(15,23,42,0.06)" : "rgba(255,255,255,0.12)";
      ctx.beginPath();
      ctx.roundRect(350, 980, 100, 36, 18);
      ctx.fill();
      ctx.fillStyle = c.bg1 === "#f8fafc" ? "#334155" : "#f8fafc";
      ctx.font = "bold 14px system-ui, sans-serif";
      ctx.fillText(`PAGE ${c.p}`, 400, 1003);

      demoPages.push(cvs.toDataURL("image/jpeg", 0.9));
    }

    RAW = demoPages;
    S.desc = "Spellense Editorial Catalog 2026\nDesigned with 3D Flipbook Studio";
    if (await derive()) {
      getEl("ed").hidden = false;
      getEl("ex").hidden = false;
      status("Demo catalog loaded. Click styles below to customize!");
      getEl("ed").scrollIntoView({ behavior: "smooth" });
    }
  }
  // Expose to window for the "Try Demo Catalog" button in JSX
  (window as unknown as Record<string, unknown>)["loadSampleCatalog"] = loadSampleCatalog;

  async function derive(): Promise<boolean> {
    if (S.mode === "auto") S.mode = "ask";
    if (S.mode === "ask") {
      let wide = false;
      for (const u of RAW) { const i = await li(u); if (i.width / i.height > 1.15) wide = true; }
      if (wide) {
        getEl("ask").hidden = false;
        getEl("ed").hidden = true;
        getEl("ex").hidden = true;
        status("Wide pages found. Choose how to show them.");
        return false;
      }
    }
    getEl("ask").hidden = true;
    const out: string[] = [];
    for (const u of RAW) {
      const i = await li(u);
      const wide = i.width / i.height > 1.15;
      if (S.mode === "split" && wide) {
        for (const k of [0, 1]) {
          const c = document.createElement("canvas");
          const w = Math.floor(i.width / 2);
          c.width = w; c.height = i.height;
          c.getContext("2d")!.drawImage(i, k * w, 0, w, i.height, 0, 0, w, i.height);
          out.push(c.toDataURL("image/jpeg", 0.85));
        }
      } else {
        out.push(u);
      }
    }
    if (S.shift) out.unshift(BLANK);
    pages = out;
    const first = await li(out[S.shift && out[1] ? 1 : 0]);
    ratio = first.width / first.height;
    if (S.cover) out[0] = await fitTo(S.cover, ratio);
    pages = out;
    mkThumb();
    show();
    return true;
  }

  function show() {
    clearTimeout(tmr);
    tmr = setTimeout(() => {
      if (!pages.length) return;
      Viewer(getEl("pv") as HTMLElement & { _off?: () => void }, Object.assign({}, S, { pages, ratio }));
      try { localStorage.spFbKit = JSON.stringify(Object.assign({}, S, { cover: "" })); } catch (_) { /* ok */ }
    }, 100) as unknown as number;
  }

  function sync() {
    (getEl("ds") as HTMLTextAreaElement).value = S.desc;
    (getEl("lr") as HTMLInputElement).checked = S.logoRight;
    (getEl("cr") as HTMLInputElement).checked = S.credit;
    (getEl("c1") as HTMLInputElement).value = S.bg1;
    (getEl("c2") as HTMLInputElement).value = S.bg2;
    const c1Val = document.getElementById("c1-val");
    if (c1Val) c1Val.textContent = S.bg1.toUpperCase();
    const c2Val = document.getElementById("c2-val");
    if (c2Val) c2Val.textContent = S.bg2.toUpperCase();
    (getEl("gr") as HTMLInputElement).checked = S.bgType !== "color";
    (getEl("dm") as HTMLInputElement).value = S.dim;
    (getEl("md") as HTMLSelectElement).value = S.mode;
    (getEl("sh") as HTMLInputElement).checked = S.shift;
    (getEl("sn") as HTMLInputElement).checked = S.sound;
    document.querySelectorAll(".ftc").forEach((b, i) => b.classList.toggle("fon", i === S.theme));

    // Cover image status
    const cvStatus = document.getElementById("cv-status");
    if (cvStatus) cvStatus.classList.toggle("hidden", !S.cover);

    // Logo status
    const lgStatus = document.getElementById("lg-status");
    const lgThumb = document.getElementById("lg-thumb") as HTMLImageElement | null;
    if (lgStatus) lgStatus.classList.toggle("hidden", !S.logo);
    if (lgThumb && S.logo) lgThumb.src = S.logo;

    // Backdrop photo status
    const biStatus = document.getElementById("bi-status");
    if (biStatus) biStatus.classList.toggle("hidden", !S.bgImg);
  }

  function tiles() {
    getEl("tg").innerHTML = THEMES.map(
      (t, i) =>
        '<button class="ftc' + (i === S.theme ? " fon" : "") + '" data-t="' + i + '"><i style="background:' + t.b + '">' +
        (TH ? '<img src="' + TH + '" alt="" style="filter:' + t.f + '">' : "") +
        "</i><span>" + t.n + "</span></button>"
    ).join("");
  }
  tiles();

  getEl("pal").innerHTML = PAL.map(
    (p, i) => '<button data-i="' + i + '" title="' + p[0] + '" style="background:linear-gradient(135deg,' + p[1] + "," + p[2] + ')"></button>'
  ).join("");

  // ── Event listeners ────────────────────────────────────────────────────────
  getEl("tg").onclick = (e: Event) => {
    const b = (e.target as HTMLElement).closest(".ftc") as HTMLButtonElement | null;
    if (!b) return;
    const idx = +b.dataset.t!;
    const t = THEMES[idx];
    S.theme = idx;
    // Always apply theme background aesthetic immediately
    S.bg1 = t.c1;
    S.bg2 = t.c2;
    S.bgType = "grad";
    S.bgImg = ""; // clear photo so theme gradient is visible
    S.bgTouched = false;
    document.querySelectorAll(".ftc").forEach((btn, i) => btn.classList.toggle("fon", i === idx));
    sync();
    show();
  };

  getEl("pal").onclick = (e: Event) => {
    const b = (e.target as HTMLElement).closest("button") as HTMLButtonElement | null;
    if (!b) return;
    const p = PAL[+b.dataset.i!];
    Object.assign(S, { bg1: p[1], bg2: p[2], bgType: "grad", bgImg: "", bgTouched: true });
    sync();
    show();
  };

  // ── 5 Tab Navigation Switching ─────────────────────────────────────────────
  document.querySelectorAll(".ftb button").forEach((tabBtn) => {
    tabBtn.addEventListener("click", () => {
      const pId = (tabBtn as HTMLElement).dataset.p;
      document.querySelectorAll(".ftb button").forEach((x) => x.classList.toggle("fon", x === tabBtn));
      document.querySelectorAll(".ftp").forEach((panel) => {
        const match = (panel as HTMLElement).id === "p-" + pId;
        (panel as HTMLElement).hidden = !match;
        (panel as HTMLElement).style.display = match ? "flex" : "none";
      });
    });
  });

  const bind = (id: string, fn: (el: HTMLElement) => void, ev = "input") =>
    getEl(id).addEventListener(ev, () => { fn(getEl(id)); show(); });

  bind("ds", (e) => { S.desc = (e as HTMLTextAreaElement).value; });
  bind("lr", (e) => { S.logoRight = (e as HTMLInputElement).checked; }, "change");
  bind("cr", (e) => { S.credit = (e as HTMLInputElement).checked; }, "change");
  bind("sn", (e) => { S.sound = (e as HTMLInputElement).checked; }, "change");
  bind("dm", (e) => { S.dim = +(e as HTMLInputElement).value; });
  bind("c1", (e) => {
    S.bg1 = (e as HTMLInputElement).value;
    S.bgTouched = true;
    if (S.bgType === "img") S.bgType = "grad";
    const c1Val = document.getElementById("c1-val");
    if (c1Val) c1Val.textContent = S.bg1.toUpperCase();
  });
  bind("c2", (e) => {
    S.bg2 = (e as HTMLInputElement).value;
    S.bgTouched = true;
    const c2Val = document.getElementById("c2-val");
    if (c2Val) c2Val.textContent = S.bg2.toUpperCase();
  });
  bind("gr", (e) => { S.bgType = (e as HTMLInputElement).checked ? "grad" : "color"; S.bgTouched = true; }, "change");

  getEl("md").addEventListener("change", (e: Event) => { S.mode = (e.target as HTMLSelectElement).value; derive(); });
  getEl("sh").addEventListener("change", (e: Event) => { S.shift = (e.target as HTMLInputElement).checked; derive(); });

  getEl("lg").addEventListener("change", async (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    S.logo = await f2u(f, 320, "image/png", 1);
    await logoPal(S.logo);
    getEl("lo").hidden = !LC.length;
    sync();
    show();
  });

  getEl("lgx").onclick = () => {
    S.logo = "";
    LC = [];
    getEl("lo").hidden = true;
    getEl("lp").innerHTML = '<span class="text-xs text-slate-400">Upload a logo in the Brand tab to see matching colors</span>';
    (getEl("lg") as HTMLInputElement).value = "";
    sync();
    show();
  };

  getEl("bi").addEventListener("change", async (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    S.bgImg = await f2u(f, 1400, "image/jpeg", 0.8);
    S.bgType = "img";
    S.bgTouched = true;
    sync();
    show();
  });

  getEl("bix").onclick = () => {
    S.bgImg = "";
    S.bgType = "grad";
    (getEl("bi") as HTMLInputElement).value = "";
    sync();
    show();
  };

  getEl("eye").onclick = async () => {
    if (!(window as unknown as Record<string, unknown>)["EyeDropper"]) {
      alert("Your browser has no screen color picker. Use the color circles instead.");
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = await new (window as any).EyeDropper().open();
      S.bg1 = r.sRGBHex;
      S.bgType = "grad";
      S.bgTouched = true;
      sync();
      show();
    } catch (_) { /* dismissed */ }
  };

  async function logoPal(u: string) {
    const i = await li(u);
    const c = document.createElement("canvas");
    c.width = c.height = 24;
    const x = c.getContext("2d")!;
    x.drawImage(i, 0, 0, 24, 24);
    const d = x.getImageData(0, 0, 24, 24).data;
    const m: Record<string, number> = {};
    for (let k = 0; k < d.length; k += 4) {
      if (d[k + 3] < 128) continue;
      const key = (d[k] >> 5) + "," + (d[k + 1] >> 5) + "," + (d[k + 2] >> 5);
      m[key] = (m[key] || 0) + 1;
    }
    const cols = Object.entries(m)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => "#" + k.split(",").map((v) => Math.min(255, +v * 32 + 16).toString(16).padStart(2, "0")).join(""));
    LC = cols;
    getEl("lp").innerHTML =
      cols.map((h: string) => '<button data-h="' + h + '" title="' + h + '" style="background:' + h + '"></button>').join("") || "";
  }

  getEl("lp").onclick = (e: Event) => {
    const b = (e.target as HTMLElement).closest("button") as HTMLButtonElement | null;
    if (!b) return;
    Object.assign(S, { bg1: b.dataset.h, bg2: b.dataset.h, bgType: "color", bgImg: "", bgTouched: true });
    sync(); show();
  };

  getEl("ke").onclick = () => dl("spellense-brand-kit.json", JSON.stringify(S), "application/json");

  getEl("ki").addEventListener("change", async (e: Event) => {
    try {
      const text = await (e.target as HTMLInputElement).files![0].text();
      Object.assign(S, JSON.parse(text));
      sync(); show();
    } catch (_) { alert("That file is not a valid brand kit."); }
  });

  function dl(name: string, data: string, type: string) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([data], { type }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  // ── Standalone Offline HTML Generator ──────────────────────────────────────
  function buildHTML(): string {
    const cfg = JSON.stringify(Object.assign({}, S, { pages, ratio, full: true })).replace(/</g, "\\u003c");
    const t = (S.desc || "Flipbook").split("\n")[0].slice(0, 60);

    const standaloneViewerCode = `
      var N = ${JSON.stringify(N)};
      var THEMES = ${JSON.stringify(THEMES)};
      function esc(s) {
        return String(s || "").replace(/[&<>"]/g, function(m) {
          return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m] || m;
        });
      }
      function lum(h) {
        h = String(h || "#fff").replace("#", "");
        if (h.length === 3) h = h.replace(/./g, "$&$&");
        var v = parseInt(h, 16);
        return (0.299 * (v >> 16) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)) / 255;
      }
      var globalAudioCtx = null;
      function playPageSound() {
        try {
          var AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (!globalAudioCtx) globalAudioCtx = new AudioCtx();
          if (globalAudioCtx.state === "suspended") globalAudioCtx.resume();
          var b = globalAudioCtx.createBuffer(1, Math.floor(globalAudioCtx.sampleRate * 0.14), globalAudioCtx.sampleRate);
          var d = b.getChannelData(0);
          for (var i = 0; i < d.length; i++) {
            d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3) * 0.35;
          }
          var r = globalAudioCtx.createBufferSource();
          var f = globalAudioCtx.createBiquadFilter();
          r.buffer = b;
          f.type = "lowpass";
          f.frequency.value = 1600;
          r.connect(f);
          f.connect(globalAudioCtx.destination);
          r.start();
        } catch (_) {}
      }
      function Viewer(root, c) {
        if (root._off) root._off();
        var T = THEMES[c.theme] || THEMES[0];
        var P = c.pages;
        var n = P.length;
        var L = Math.ceil(n / 2);
        var maxS = n % 2 ? L - 1 : L;
        var sp = c.speed || 0.8;
        var img = c.bgType === "img" && c.bgImg;
        var s = 0, W = 0, H = 0, z = 1, snd = !!c.sound, tm = 0;
        var dr = null, au = 0;
        root.className = "fbv" + (c.full ? " full" : "");
        root.style.background = img ? "url(" + c.bgImg + ") center/cover" : c.bgType === "grad" ? "linear-gradient(135deg," + c.bg1 + "," + c.bg2 + ")" : c.bg1;
        root.style.color = img || lum(c.bg1) < 0.5 ? "#fff" : "#0f172a";
        root.style.setProperty("--pf", T.f);
        root.style.setProperty("--pr", T.r + "px");
        var h = img ? '<div class="ov" style="background:rgba(0,0,0,' + (c.dim || 0) + ')"></div>' : "";
        if (c.logo || c.desc) {
          h += '<div class="fbh' + (c.logoRight ? " rv" : "") + '">' + (c.logo ? '<img src="' + c.logo + '" alt="Logo">' : "<span></span>") + "<p>" + esc(c.desc) + "</p></div>";
        }
        h += '<div class="stage"><div class="bk" style="--sp:' + sp + 's"><div class="bd" style="background:' + T.b + ";box-shadow:" + T.x + ";border-radius:" + (T.r + 6) + 'px"></div>';
        for (var j = 0; j < L; j++) {
          h += '<div class="lf"><div class="fc f"><img src="' + P[2 * j] + '" alt="Page ' + (2 * j + 1) + '" draggable="false"></div><div class="fc b">' + (P[2 * j + 1] ? '<img src="' + P[2 * j + 1] + '" alt="Page ' + (2 * j + 2) + '" draggable="false">' : "") + '</div></div>';
        }
        h += (T.sp && T.sp !== "s" ? '<div class="sp ' + T.sp + '"></div>' : "") + '</div></div><div class="ct"><button data-a="p" title="Previous page">\u2039</button><span class="pg"></span><button data-a="n" title="Next page">\u203a</button><button data-a="t" title="Thumbnails">\u25a6</button><button data-a="z" title="Zoom">\uff0b</button><button data-a="s" title="Sound toggle">' + (snd ? "\ud83d\udd0a" : "\ud83d\udd08") + '</button><button data-a="a" title="Autoplay">\u25b6</button><button data-a="f" title="Fullscreen">\u26f6</button></div><div class="th" hidden></div>' + (c.credit ? '<a class="cr" href="https://spellense.com/flipbook" target="_blank" rel="noopener">Made with Spellense</a>' : "");
        root.innerHTML = h;
        function q(k) { return root.querySelector(k); }
        var bk = q(".bk"), bd = q(".bd"), st = q(".stage"), pg = q(".pg"), lvs = [].slice.call(root.querySelectorAll(".lf"));
        function cl(v) { return Math.max(0, Math.min(maxS, v)); }
        function tick() { if (snd) playPageSound(); }
        function place() {
          lvs.forEach(function(e, idx) {
            e.style.transform = "rotateY(" + (idx < s ? -180 : 0) + "deg)";
            e.style.zIndex = String(idx < s ? idx + 1 : L - idx);
          });
          bk.style.transform = "translateX(" + (s === 0 ? -W / 2 : s === maxS && n % 2 === 0 ? W / 2 : 0) + "px)";
          pg.textContent = s === 0 ? "1 / " + n : (2 * s + 1 > n ? 2 * s : 2 * s + "\u2013" + (2 * s + 1)) + " / " + n;
        }
        function fit() {
          var aw = Math.max(260, root.clientWidth - 40);
          var ah = document.fullscreenElement ? innerHeight - 160 : Math.min(innerHeight * 0.72, 740);
          W = Math.min(aw / 2, ah * c.ratio) * z;
          H = W / c.ratio;
          var p = Math.max(6, Math.round(W * T.pd));
          bk.style.width = 2 * W + "px";
          bk.style.height = H + "px";
          bd.style.inset = "-" + p + "px";
          st.style.padding = p + 4 + "px 0";
          lvs.forEach(function(e) { e.style.width = W + "px"; e.style.height = H + "px"; });
          var sq = q(".sp");
          if (sq) { sq.style.top = sq.style.bottom = "-" + p + "px"; }
          place();
        }
        function go(dir) {
          var ns = cl(s + dir);
          if (ns === s) { place(); return; }
          var m = dir > 0 ? s : s - 1;
          s = ns;
          place();
          if (lvs[m]) lvs[m].style.zIndex = String(L + 5);
          tick();
          clearTimeout(tm);
          tm = setTimeout(place, sp * 1000 + 60);
        }
        bk.addEventListener("pointerdown", function(e) {
          var rect = bk.getBoundingClientRect();
          var sd = e.clientX - rect.left > rect.width / 2 ? 1 : -1;
          if ((sd > 0 && s >= maxS) || (sd < 0 && s <= 0)) return;
          var m = sd > 0 ? s : s - 1;
          dr = { x: e.clientX, sd: sd, m: m, p: 0 };
          if (lvs[m]) { lvs[m].style.transition = "none"; lvs[m].style.zIndex = String(L + 5); }
          bk.setPointerCapture(e.pointerId);
        });
        bk.addEventListener("pointermove", function(e) {
          if (!dr || !lvs[dr.m]) return;
          dr.p = Math.min(1, Math.max(0, ((e.clientX - dr.x) * -dr.sd) / W));
          lvs[dr.m].style.transform = "rotateY(" + (dr.sd > 0 ? -180 * dr.p : -180 + 180 * dr.p) + "deg)";
        });
        function up() {
          var d = dr; dr = null;
          if (!d || !lvs[d.m]) return;
          lvs[d.m].style.transition = "";
          if (d.p < 0.04 || d.p > 0.3) go(d.sd); else place();
        }
        bk.addEventListener("pointerup", up);
        bk.addEventListener("pointercancel", up);
        function key(e) {
          var el = document.activeElement;
          if (el && /INPUT|TEXTAREA|SELECT/.test(el.tagName)) return;
          if (e.key === "ArrowRight") go(1);
          if (e.key === "ArrowLeft") go(-1);
        }
        var ro = new ResizeObserver(fit);
        ro.observe(root);
        window.addEventListener("keydown", key);
        document.addEventListener("fullscreenchange", fit);
        root._off = function() {
          ro.disconnect();
          window.removeEventListener("keydown", key);
          document.removeEventListener("fullscreenchange", fit);
          clearInterval(au);
        };
        q(".ct").onclick = function(e) {
          var b = e.target.closest("button");
          if (!b) return;
          var a = b.dataset.a;
          if (a === "p") go(-1);
          if (a === "n") go(1);
          if (a === "z") { z = z >= 2.2 ? 1 : z + 0.4; fit(); }
          if (a === "s") { snd = !snd; b.textContent = snd ? "\ud83d\udd0a" : "\ud83d\udd08"; tick(); }
          if (a === "f") { document.fullscreenElement ? document.exitFullscreen() : root.requestFullscreen && root.requestFullscreen(); }
          if (a === "a") {
            if (au) { clearInterval(au); au = 0; b.textContent = "\u25b6"; }
            else { b.textContent = "\u23f8"; au = setInterval(function() { if (s >= maxS) { s = 0; place(); } else go(1); }, 3200); }
          }
          if (a === "t") {
            var tEl = q(".th");
            if (!tEl.innerHTML) {
              tEl.innerHTML = P.map(function(u, idx) { return u ? '<img data-i="' + idx + '" src="' + u + '">' : ""; }).join("");
            }
            tEl.hidden = !tEl.hidden;
          }
        };
        q(".th").onclick = function(e) {
          var idx = e.target.dataset.i;
          if (idx == null) return;
          s = cl(idx === "0" ? 0 : Math.ceil(Number(idx) / 2));
          place();
          tick();
        };
        fit();
      }
    `;

    return (
      "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\"><title>" +
      esc(t) +
      "</title><style>html,body{margin:0;background:#000;font-family:system-ui,-apple-system,sans-serif}</style><style>" +
      VCSS +
      "</style></head><body><div id=\"r\"></div><script>" +
      standaloneViewerCode +
      "<\\/script><script>Viewer(document.getElementById('r')," +
      cfg +
      ");if(/autoplay=1/.test(location.search)){var b=document.querySelector('[data-a=a]');b&&b.click()}<\\/script></body></html>"
    );
  }

  getEl("dl").onclick = () => dl("flipbook.html", buildHTML(), "text/html");

  getEl("pvw").onclick = () =>
    window.open(URL.createObjectURL(new Blob([buildHTML()], { type: "text/html" })), "_blank");

  getEl("nw").onclick = () => {
    RAW = []; pages = [];
    getEl("ed").hidden = true;
    getEl("ex").hidden = true;
    getEl("pv").innerHTML = "";
    const stEl = document.getElementById("st");
    if (stEl) stEl.textContent = "";
    getEl("fi").value = "";
  };

  // ── Drop zone ──────────────────────────────────────────────────────────────
  const dz = getEl("drop");
  dz.onclick = () => getEl("fi").click();
  dz.onkeydown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); getEl("fi").click(); }
  };

  getEl("fi").addEventListener("change", (e: Event) => loadFiles((e.target as HTMLInputElement).files));
  dz.addEventListener("dragover", (e: Event) => { e.preventDefault(); });
  dz.addEventListener("dragleave", () => {});
  dz.addEventListener("drop", (e: Event) => {
    e.preventDefault();
    loadFiles((e as DragEvent).dataTransfer?.files || null);
  });

  // ── Spread dialog ──────────────────────────────────────────────────────────
  getEl("ask").onclick = async (e: Event) => {
    const b = (e.target as HTMLElement).closest("button") as HTMLButtonElement | null;
    if (!b) return;
    S.mode = b.dataset.m;
    sync();
    if (await derive()) {
      getEl("ed").hidden = false;
      getEl("ex").hidden = false;
      status("Ready. " + pages.length + " pages loaded.");
      getEl("ed").scrollIntoView({ behavior: "smooth" });
    }
  };

  getEl("lu").onclick = () => {
    Object.assign(S, { bg1: LC[0], bg2: LC[1] || LC[0], bgType: "grad", bgImg: "", bgTouched: true });
    getEl("lo").hidden = true;
    sync(); show();
  };

  // ── Cover image fit ────────────────────────────────────────────────────────
  async function fitTo(u: string, r: number): Promise<string> {
    const i = await li(u);
    const c = document.createElement("canvas");
    let w = i.width, h = w / r;
    if (h > i.height) { h = i.height; w = h * r; }
    c.width = Math.round(w); c.height = Math.round(h);
    c.getContext("2d")!.drawImage(i, (i.width - w) / 2, (i.height - h) / 2, w, h, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.88);
  }

  async function mkThumb() {
    try {
      const i = await li(pages[S.shift && pages[1] ? 1 : 0]);
      const c = document.createElement("canvas");
      c.width = 90; c.height = Math.round(90 / ratio);
      c.getContext("2d")!.drawImage(i, 0, 0, c.width, c.height);
      TH = c.toDataURL("image/jpeg", 0.7);
      tiles();
    } catch (_) { /* ok */ }
  }

  getEl("cv").addEventListener("change", async (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    S.cover = await f2u(f, 1400, "image/jpeg", 0.88);
    sync();
    await derive();
  });

  getEl("cvx").onclick = async () => {
    S.cover = "";
    (getEl("cv") as HTMLInputElement).value = "";
    sync();
    await derive();
  };

  // ── PDF download ───────────────────────────────────────────────────────────
  getEl("dp").onclick = () => {
    if (!jspdfLib) { alert("The PDF tool is still loading. Try again in a moment."); return; }
    const { jsPDF } = jspdfLib;
    const pw = 595, ph = pw / ratio, o = ph > pw ? "p" : "l";
    const doc = new jsPDF({ unit: "pt", format: [pw, ph], orientation: o });
    pages.forEach((u, i) => {
      if (i) doc.addPage([pw, ph], o);
      if (u !== BLANK) doc.addImage(u, "JPEG", 0, 0, pw, ph);
    });
    doc.save("flipbook.pdf");
  };

  // ── Embed code ────────────────────────────────────────────────────────────
  function emb() {
    const u = ((document.getElementById("eu") as HTMLInputElement)?.value || "YOUR-FILE-URL") +
      ((document.getElementById("ea") as HTMLInputElement)?.checked ? "?autoplay=1" : "");
    const w = (document.getElementById("ew") as HTMLInputElement)?.value || "100%";
    const h = (document.getElementById("eh") as HTMLInputElement)?.value || "600";
    const el = document.getElementById("emb");
    if (el) el.textContent = '<iframe src="' + u + '" width="' + w + '" height="' + h + '" style="border:0" allowfullscreen></iframe>';
  }

  ["eu", "ew", "eh", "ea"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) { el.addEventListener("input", emb); el.addEventListener("change", emb); }
  });
  emb();

  getEl("ec").onclick = () => {
    const el = document.getElementById("emb");
    if (navigator.clipboard && el) {
      navigator.clipboard.writeText(el.textContent || "");
      const prev = getEl("ec").textContent;
      getEl("ec").textContent = "✓ Copied to clipboard!";
      setTimeout(() => { getEl("ec").textContent = prev; }, 2000);
    }
  };

  // ── Init ──────────────────────────────────────────────────────────────────
  if (S.mode === "auto") S.mode = "ask";
  sync();
  if (S.logo) logoPal(S.logo);
}
