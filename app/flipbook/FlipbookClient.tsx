"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import Navbar from "@/components/Navbar";
import Link from "next/link";

// ── Viewer CSS (embedded in page AND in every downloaded flipbook) ─────────────
const VCSS = `
.fbv{position:relative;display:flex;flex-direction:column;align-items:center;gap:10px;padding:14px 16px;border-radius:18px;overflow:hidden;min-height:280px;box-sizing:border-box;font-family:inherit}
.fbv.full{border-radius:0;min-height:100vh;justify-content:center}
.fbv .ov{position:absolute;inset:0;pointer-events:none}
.fbh{display:flex;justify-content:space-between;align-items:center;width:100%;gap:14px;z-index:2}
.fbh.rv{flex-direction:row-reverse}.fbh.rv p{text-align:left}
.fbh img{max-height:44px;max-width:42%;object-fit:contain}
.fbh p{margin:0;font-size:.85rem;line-height:1.4;text-align:right;max-width:56%;white-space:pre-line}
.stage{position:relative;width:100%;display:flex;overflow-x:auto;touch-action:pan-y;z-index:2}
.bk{position:relative;margin:auto;perspective:2400px;transition:transform .5s}
.bd{position:absolute;z-index:0}
.lf{position:absolute;top:0;left:50%;transform-origin:left center;transform-style:preserve-3d;transition:transform var(--sp) cubic-bezier(.45,.05,.25,1)}
.fc{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;overflow:hidden;background:#fff}
.fc.f{border-radius:0 var(--pr) var(--pr) 0}.fc.b{transform:rotateY(180deg);border-radius:var(--pr) 0 0 var(--pr)}
.fc img{width:100%;height:100%;display:block;user-select:none;-webkit-user-drag:none;pointer-events:none;filter:var(--pf)}
.fc::after{content:"";position:absolute;inset:0;pointer-events:none}
.fc.f::after{background:linear-gradient(90deg,rgba(0,0,0,.3),transparent 9%)}
.fc.b::after{background:linear-gradient(270deg,rgba(0,0,0,.3),transparent 9%)}
.sp{position:absolute;left:50%;top:0;bottom:0;width:22px;transform:translateX(-50%);z-index:9999;pointer-events:none;background:radial-gradient(circle,#111 0 3px,#c8c8c8 3.5px 5.5px,transparent 6px) 0 0/22px 20px repeat-y}
.sp.rg{width:30px;background:radial-gradient(circle,#333 0 4px,#e5e7eb 5px 8px,transparent 9px) 0 0/30px 60px repeat-y}
.sp.st{width:0;border-left:2px dashed rgba(255,255,255,.6)}
.ct{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:6px;z-index:2;background:rgba(15,23,42,.6);padding:6px 10px;border-radius:999px;color:#fff;backdrop-filter:blur(8px)}
.ct button{all:unset;cursor:pointer;min-width:36px;height:36px;text-align:center;line-height:36px;border-radius:50%;font-size:1.05rem}
.ct button:hover,.ct button:focus-visible{background:rgba(255,255,255,.2)}.ct .pg{font-size:.85rem;min-width:64px;text-align:center}
.th{display:flex;gap:6px;overflow-x:auto;width:100%;padding:4px 2px;z-index:2}.th[hidden]{display:none}
.th img{height:64px;border-radius:4px;cursor:pointer;border:2px solid transparent}.th img:hover{border-color:#fff}
.cr{z-index:2;font-size:.72rem;color:inherit;opacity:.7}
@media (prefers-reduced-motion:reduce){.lf,.bk{transition-duration:.01s!important}}
`;

// ── Editor / page UI CSS ───────────────────────────────────────────────────────
const PAGE_CSS = `
#fbapp{--fbbr:#4f46e5;--fbln:#dfe3ee;--fbmt:#5b6478}
#fbapp h1{font-size:clamp(1.8rem,5vw,2.8rem);line-height:1.15;margin:.2em 0 .5em}
#fbapp h2{font-size:1.5rem;margin:1.8em 0 .5em}
.fblead{color:var(--fbmt);max-width:64ch}
#drop{border:2px dashed var(--fbbr);border-radius:18px;background:#fff;padding:44px 20px;text-align:center;cursor:pointer;margin:20px 0}
#drop.on{background:#eef2ff}#drop strong{display:block;font-size:1.2rem}#st{color:var(--fbmt);margin-top:8px;min-height:1.4em}
#ed{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:18px;align-items:start}
.fpn{background:#fff;border:1px solid var(--fbln);border-radius:16px;padding:12px;position:sticky;top:10px}
.ftb{display:flex;gap:4px;overflow-x:auto;margin-bottom:10px}.ftb button{flex:0 0 auto;border:0;background:#eef0f7;padding:8px 12px;border-radius:999px;cursor:pointer;font:inherit;font-size:.85rem}.ftb .fon{background:var(--fbbr);color:#fff}
.ftp{display:flex;flex-direction:column;gap:10px;max-height:56vh;overflow:auto}.ftp[hidden]{display:none}.ftp label{font-size:.85rem;color:var(--fbmt);display:flex;flex-direction:column;gap:4px}.ftp label.fck{flex-direction:row;align-items:center;gap:8px}
.ftg{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.ftc{border:1px solid var(--fbln);background:#fff;border-radius:12px;padding:6px;cursor:pointer;font:inherit;font-size:.78rem;text-align:left}.ftc i{display:flex;align-items:center;justify-content:center;height:58px;padding:6px;border-radius:6px;margin-bottom:4px}.ftc i img{height:100%;border-radius:2px;box-shadow:0 2px 6px #0006}.ftc.fon{outline:2px solid var(--fbbr)}
.fpl{display:flex;flex-wrap:wrap;gap:8px}.fpl button{width:42px;height:42px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px var(--fbln);cursor:pointer}
.ftp input[type=color]{appearance:none;border:0;width:42px;height:42px;padding:0;border-radius:50%;cursor:pointer;background:none}.ftp input[type=color]::-webkit-color-swatch{border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px var(--fbln)}
.ftp textarea,.ftp select{font:inherit;padding:8px;border:1px solid var(--fbln);border-radius:8px;width:100%}
.fbtn{display:inline-block;border:1px solid var(--fbln);background:#fff;padding:8px 14px;border-radius:10px;cursor:pointer;font:inherit;font-size:.85rem}
.fcta{background:var(--fbbr);color:#fff;border:0;font-size:1rem;padding:12px 22px;border-radius:10px;cursor:pointer;font:inherit}
.fsm{display:inline-block;border:1px solid var(--fbln);background:#fff;padding:8px 14px;border-radius:10px;cursor:pointer;font:inherit;font-size:.85rem}
#ex{margin-top:16px;display:flex;flex-wrap:wrap;gap:10px;align-items:center}
#emb{display:block;background:#0f172a;color:#e2e8f0;padding:10px;border-radius:8px;font-size:.78rem;word-break:break-all;margin-top:8px}
.fg3{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px}.fg3>div{background:#fff;border:1px solid var(--fbln);border-radius:14px;padding:16px}.fg3 h3{margin:0 0 6px;font-size:1.05rem}
#fbapp details{background:#fff;border:1px solid var(--fbln);border-radius:12px;padding:12px 16px;margin:8px 0}#fbapp summary{cursor:pointer;font-weight:600}
.fask{background:#fff7ed;border:1px solid #fdba74;border-radius:14px;padding:14px;margin:12px 0;font-size:.9rem}.fask>div{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
#exeu{padding:8px;border:1px solid var(--fbln);border-radius:8px;font:inherit;width:100%}
@media(max-width:860px){#ed{grid-template-columns:1fr}.fpn{position:static}.ftp{max-height:none}}
`;

export default function FlipbookClient() {
  const initDone = useRef(false);

  useEffect(() => {
    // Poll until both CDN scripts are loaded, then init
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
    <>
      {/* Inject CSS */}
      <style dangerouslySetInnerHTML={{ __html: VCSS + PAGE_CSS }} />

      {/* CDN scripts — afterInteractive so they load after hydration */}
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
        strategy="afterInteractive"
      />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
        strategy="afterInteractive"
      />

      <Navbar />

      <div id="fbapp">
        <main style={{ maxWidth: 1180, margin: "auto", padding: "24px 16px 60px" }}>
          <h1>Free flipbook maker: turn any PDF into a page-flip book</h1>
          <p className="fblead">
            Drop a PDF or images, choose from 24 styles, add your own logo and background, and
            download a flipbook that works offline. Everything runs in your browser — your file is
            never uploaded.
          </p>

          {/* ── Drop zone ── */}
          <div id="drop" tabIndex={0} role="button" aria-label="Upload PDF or images">
            <strong>Drop your PDF or images here</strong>
            <span>or tap to choose files (PDF, JPG, PNG, WebP)</span>
            <div id="st" aria-live="polite"></div>
          </div>
          <input type="file" id="fi" accept="application/pdf,image/*" multiple hidden />

          {/* ── Wide-page dialog ── */}
          <div className="fask" id="ask" hidden>
            <b>Wide pages found.</b> They look like two-page spreads. How should they appear in the book?
            <div>
              <button className="fcta" data-m="split">Split into left and right pages</button>
              <button className="fbtn" data-m="single">Keep each as one page</button>
            </div>
          </div>

          {/* ── Editor: preview + panel ── */}
          <section id="ed" hidden>
            <div id="pv"></div>
            <div className="fpn">
              <div className="ftb" role="tablist">
                <button className="fon" data-p="st">Style</button>
                <button data-p="br">Branding</button>
                <button data-p="bg">Background</button>
                <button data-p="ly">Layout</button>
                <button data-p="kt">Brand kit</button>
              </div>

              {/* Style panel */}
              <div className="ftp" id="p-st"><div className="ftg" id="tg"></div></div>

              {/* Branding panel */}
              <div className="ftp" id="p-br" hidden>
                <label>Custom cover image (replaces page 1)<input type="file" id="cv" accept="image/*" /></label>
                <button className="fsm" id="cvx">Remove cover</button>
                <label>Your logo (shows top left)<input type="file" id="lg" accept="image/*" /></label>
                <button className="fsm" id="lgx">Remove logo</button>
                <div className="fask" id="lo" hidden>
                  Match the background to your logo?
                  <div><button className="fcta" id="lu" style={{ fontSize: ".85rem", padding: "8px 14px" }}>Use logo colors</button></div>
                </div>
                <label>Description (shows top right)<textarea id="ds" rows={3} maxLength={160} placeholder="Spring catalog 2026. Call 555-0100"></textarea></label>
                <label className="fck"><input type="checkbox" id="lr" /> Swap sides: logo right, text left</label>
                <label className="fck"><input type="checkbox" id="cr" /> Show a small &ldquo;Made with Spellense&rdquo; credit</label>
              </div>

              {/* Background panel */}
              <div className="ftp" id="p-bg" hidden>
                <label>Palettes</label><div className="fpl" id="pal"></div>
                <label>From your logo</label>
                <div className="fpl" id="lp"><span style={{ fontSize: ".8rem", color: "var(--fbmt)" }}>Add a logo to see matching colors</span></div>
                <label>Custom colors</label>
                <div className="fpl">
                  <input type="color" id="c1" aria-label="Color 1" />
                  <input type="color" id="c2" aria-label="Color 2" />
                  <button className="fsm" id="eye" style={{ borderRadius: 10, width: "auto", height: "auto", padding: "8px 12px" }}>Pick from screen</button>
                </div>
                <label className="fck"><input type="checkbox" id="gr" /> Use gradient</label>
                <label>Background image<input type="file" id="bi" accept="image/*" /></label>
                <button className="fsm" id="bix">Remove image</button>
                <label>Darken image <input type="range" id="dm" min="0" max=".8" step=".05" /></label>
              </div>

              {/* Layout panel */}
              <div className="ftp" id="p-ly" hidden>
                <label>Page layout
                  <select id="md">
                    <option value="ask">Ask me when wide pages are found</option>
                    <option value="single">Keep every page as is</option>
                    <option value="split">Split wide pages into left and right</option>
                  </select>
                </label>
                <label className="fck"><input type="checkbox" id="sh" /> Shift by one page (fix misaligned spreads)</label>
                <label className="fck"><input type="checkbox" id="sn" /> Page-turn sound</label>
              </div>

              {/* Brand kit panel */}
              <div className="ftp" id="p-kt" hidden>
                <p style={{ margin: 0, fontSize: ".85rem", color: "var(--fbmt)" }}>
                  Your style, logo, text and background are saved in this browser automatically. Export them to reuse on another device.
                </p>
                <button className="fbtn" id="ke">Export brand kit</button>
                <label className="fbtn" style={{ cursor: "pointer" }}>Import brand kit<input type="file" id="ki" accept=".json" hidden /></label>
              </div>
            </div>
          </section>

          {/* ── Export row ── */}
          <div id="ex" hidden>
            <button className="fbtn" id="pvw">Preview final page</button>
            <button className="fbtn" id="dp">Download as PDF</button>
            <button className="fcta" id="dl">Download offline HTML</button>
            <button className="fbtn" id="nw">Start over</button>
            <details>
              <summary>Embed on your website</summary>
              <p style={{ margin: "8px 0 0", fontSize: ".85rem" }}>
                Upload the downloaded file to your host, then fill in its address:
              </p>
              <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                <input id="eu" placeholder="https://yoursite.com/flipbook.html" style={{ padding: 8, border: "1px solid var(--fbln)", borderRadius: 8, font: "inherit", width: "100%", boxSizing: "border-box" }} />
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: ".85rem" }}>
                  <label>Width <input id="ew" defaultValue="100%" size={6} /></label>
                  <label>Height (px) <input id="eh" defaultValue="600" size={6} /></label>
                  <label><input type="checkbox" id="ea" /> Start auto-play</label>
                </div>
              </div>
              <code id="emb"></code>
              <button className="fsm" id="ec" style={{ marginTop: 8 }}>Copy embed code</button>
            </details>
          </div>

          {/* ── Content ── */}
          <h2>How it works</h2>
          <div className="fg3">
            <div><h3>1. Upload</h3>Drop a PDF or a set of images. Pages are converted on your device.</div>
            <div><h3>2. Customize</h3>Pick a style, add your logo and text, then set a color, gradient or photo background.</div>
            <div><h3>3. Download</h3>Get one offline HTML file that opens anywhere, with the flip, zoom and thumbnails built in.</div>
          </div>

          <h2>Built for real documents</h2>
          <div className="fg3">
            <div><h3>Fits your file</h3>The book takes your PDF&apos;s exact proportions. Two-page spreads split cleanly into left and right pages.</div>
            <div><h3>Works on phones</h3>The full spread scales to any screen, and dragging, tapping and swiping all turn pages.</div>
            <div><h3>24 book styles</h3>Minimal, luxury dark, kraft, leather, spiral notebook, ring binder, art deco, holographic and more.</div>
            <div><h3>Your branding</h3>Logo on one side, editable text on the other. No Spellense watermark unless you turn it on.</div>
            <div><h3>Private</h3>No upload, no account. Your brand kit stays in your browser.</div>
            <div><h3>Reader tools</h3>Thumbnails, zoom, fullscreen, auto-play and optional page-turn sound.</div>
          </div>

          <h2>Frequently asked questions</h2>
          <details><summary>Is the flipbook maker really free, and do I need to sign up?</summary>It is free and needs no account.</details>
          <details><summary>Are my files uploaded to a server?</summary>No. Conversion happens in your browser, so your PDF never leaves your device.</details>
          <details><summary>My PDF has two-page spreads. Will they fit?</summary>Yes. The book matches your file&apos;s proportions, and wide spread pages can be split into left and right pages automatically.</details>
          <details><summary>Can I use my own logo and remove Spellense branding?</summary>Yes. Add your logo and description; the Spellense credit is off by default.</details>
          <details><summary>Does it work on mobile?</summary>Yes. The two-page spread scales to fit small screens and supports touch dragging.</details>

          <h2>More free tools</h2>
          <p>
            <Link href="/image-compressor">Compress the images first</Link> for a lighter book,{" "}
            <Link href="/">check spelling</Link> before you publish, or run a{" "}
            <Link href="/design-check">design check</Link> on your cover.
          </p>
        </main>
        <footer style={{ textAlign: "center", color: "var(--fbmt)", fontSize: ".85rem", padding: "30px 16px" }}>
          © Spellense &middot; <Link href="/privacy">Privacy</Link> &middot; <Link href="/terms">Terms</Link>
        </footer>
      </div>
    </>
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
    { n: "Pure Minimal", b: "#fff", pd: 0.012, r: 2, sp: "s", f: "none", x: "0 25px 60px -10px #0004", c1: "#f8fafc", c2: "#e2e8f0" },
    { n: "Modern Magazine", b: "#111", pd: 0.02, r: 0, sp: "s", f: "none", x: "0 25px 60px #0006", c1: "#e5e7eb", c2: "#cbd5e1" },
    { n: "Scandinavian Clean", b: "#e8e3da", pd: 0.025, r: 4, sp: "s", f: "none", x: "0 20px 50px #0003", c1: "#f5f1ea", c2: "#e6dfd3" },
    { n: "Typographic Editorial", b: "#fff", pd: 0.015, r: 0, sp: "s", f: "none", x: "10px 10px 0 #111", c1: "#fde047", c2: "#facc15" },
    { n: "Midnight Luxury", b: "linear-gradient(135deg,#1a1a1a,#000)", pd: 0.03, r: 3, sp: "s", f: "none", x: "0 0 0 2px #d4af37,0 30px 70px #000", c1: "#0b0b0f", c2: "#1a1a22" },
    { n: "Glass Dark", b: "rgba(255,255,255,.14)", pd: 0.025, r: 10, sp: "s", f: "none", x: "0 0 0 1px rgba(255,255,255,.4),0 30px 80px #0009", c1: "#0f172a", c2: "#312e81" },
    { n: "Noir Corporate", b: "linear-gradient(135deg,#2b2f36,#14161a)", pd: 0.028, r: 2, sp: "s", f: "none", x: "0 0 0 2px #9ca3af,0 25px 60px #0008", c1: "#1f2937", c2: "#0b0f14" },
    { n: "Neon Cyberpunk", b: "#0a0a12", pd: 0.02, r: 2, sp: "s", f: "none", x: "0 0 0 2px #0ff,0 0 30px #0ff,0 0 90px #f0f8", c1: "#050510", c2: "#1b0033" },
    { n: "Kraft Paper", b: N + ",#b08a5b", pd: 0.03, r: 3, sp: "st", f: "sepia(.12)", x: "0 25px 50px #0004", c1: "#f3e7d3", c2: "#d9c3a0" },
    { n: "Linen Hardcover", b: "repeating-linear-gradient(45deg,#2f4f6f 0 2px,#345a7d 2px 4px)", pd: 0.035, r: 4, sp: "s", f: "none", x: "0 25px 55px #0005", c1: "#dbe7f3", c2: "#a9c1d9" },
    { n: "Vintage Leather", b: N + ",#5b3a24", pd: 0.04, r: 3, sp: "st", f: "sepia(.28) contrast(.96)", x: "0 30px 70px #0009", c1: "#3b2a1c", c2: "#1e140c" },
    { n: "Watercolor Edge", b: "radial-gradient(circle at 20% 20%,#f9a8d4,transparent 50%),radial-gradient(circle at 80% 30%,#93c5fd,transparent 50%),radial-gradient(circle at 50% 90%,#fde68a,transparent 50%),#fff", pd: 0.04, r: 14, sp: "s", f: "none", x: "0 20px 50px #0002", c1: "#fdf2f8", c2: "#e0f2fe" },
    { n: "Gradient Mesh", b: "radial-gradient(at 0 0,#6366f1,transparent 60%),radial-gradient(at 100% 0,#ec4899,transparent 60%),radial-gradient(at 50% 100%,#14b8a6,transparent 60%),#1e1b4b", pd: 0.03, r: 12, sp: "s", f: "none", x: "0 25px 60px #0006", c1: "#1e1b4b", c2: "#4c1d95" },
    { n: "Duotone Pop", b: "linear-gradient(135deg,#ff3d81,#ffb400)", pd: 0.03, r: 6, sp: "s", f: "none", x: "8px 8px 0 #111", c1: "#fff4d6", c2: "#ffd6e7" },
    { n: "Retro Print", b: N + ",#d9822b", pd: 0.035, r: 3, sp: "s", f: "sepia(.2) saturate(1.1)", x: "0 25px 55px #0004", c1: "#fbe8c8", c2: "#e9b872" },
    { n: "Pastel Soft", b: "#fbcfe8", pd: 0.03, r: 18, sp: "s", f: "none", x: "0 20px 50px #f9a8d488", c1: "#fdf4ff", c2: "#e0f2fe" },
    { n: "Spiral Notebook", b: "#fff", pd: 0.01, r: 3, sp: "sp", f: "none", x: "0 20px 50px #0003", c1: "#e2e8f0", c2: "#94a3b8" },
    { n: "Ring Binder", b: "#1d4ed8", pd: 0.035, r: 4, sp: "rg", f: "none", x: "0 25px 55px #0005", c1: "#dbeafe", c2: "#93c5fd" },
    { n: "Portfolio Case", b: "#222", pd: 0.05, r: 6, sp: "s", f: "none", x: "0 0 0 4px #444,0 30px 70px #0009", c1: "#e5e5e5", c2: "#bdbdbd" },
    { n: "Newspaper Fold", b: "#e9e4d6", pd: 0.015, r: 0, sp: "s", f: "grayscale(.5) contrast(1.05)", x: "0 20px 45px #0003", c1: "#d6d1c4", c2: "#b9b3a3" },
    { n: "Art Deco", b: "repeating-linear-gradient(90deg,#0b3d2e 0 10px,#0f4c39 10px 12px)", pd: 0.035, r: 0, sp: "s", f: "none", x: "0 0 0 3px #c9a227,0 30px 70px #000a", c1: "#06281e", c2: "#0b3d2e" },
    { n: "Terracotta Earth", b: "linear-gradient(135deg,#c2603a,#8f3f21)", pd: 0.03, r: 8, sp: "s", f: "none", x: "0 25px 55px #0005", c1: "#f5e1d3", c2: "#e2b79a" },
    { n: "Holographic Foil", b: "linear-gradient(120deg,#a5f3fc,#f0abfc,#fde68a,#a7f3d0,#a5f3fc)", pd: 0.03, r: 10, sp: "s", f: "none", x: "0 25px 60px #0006", c1: "#0f172a", c2: "#1e293b" },
    { n: "Festive Seasonal", b: "linear-gradient(135deg,#b91c1c,#166534)", pd: 0.03, r: 6, sp: "s", f: "none", x: "0 0 0 3px #fde68a,0 25px 60px #0008", c1: "#450a0a", c2: "#052e16" },
  ];

  const esc = (s: unknown) =>
    String(s || "").replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m] || m));

  const lum = (h: string) => {
    h = String(h || "#fff").replace("#", "");
    if (h.length === 3) h = h.replace(/./g, "$&$&");
    const v = parseInt(h, 16);
    return (0.299 * (v >> 16) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)) / 255;
  };

  // ── Viewer engine (runs live AND is embedded in downloaded HTML) ───────────
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
    let s = 0, W = 0, H = 0, z = 1, snd = !!c.sound, tm = 0;
    let dr: null | { x: number; sd: number; m: number; p: number } = null;
    let au: number | ReturnType<typeof setInterval> = 0;

    root.className = "fbv" + (c.full ? " full" : "");
    root.style.background = img
      ? "url(" + c.bgImg + ") center/cover"
      : c.bgType === "grad"
      ? "linear-gradient(135deg," + c.bg1 + "," + c.bg2 + ")"
      : c.bg1 as string;
    root.style.color = img || lum(c.bg1 as string) < 0.5 ? "#fff" : "#0f172a";
    root.style.setProperty("--pf", T.f);
    root.style.setProperty("--pr", T.r + "px");

    let h = img ? '<div class="ov" style="background:rgba(0,0,0,' + (c.dim || 0) + ')"></div>' : "";
    if (c.logo || c.desc)
      h +=
        '<div class="fbh' +
        (c.logoRight ? " rv" : "") +
        '">' +
        (c.logo ? '<img src="' + c.logo + '" alt="Logo">' : "<span></span>") +
        "<p>" + esc(c.desc) + "</p></div>";

    h += '<div class="stage"><div class="bk" style="--sp:' + sp + 's"><div class="bd" style="background:' + T.b + ";box-shadow:" + T.x + ";border-radius:" + (T.r + 4) + 'px"></div>';
    for (let j = 0; j < L; j++)
      h +=
        '<div class="lf"><div class="fc f"><img src="' + P[2 * j] + '" alt="Page ' + (2 * j + 1) + '" draggable="false"></div><div class="fc b">' +
        (P[2 * j + 1] ? '<img src="' + P[2 * j + 1] + '" alt="Page ' + (2 * j + 2) + '" draggable="false">' : "") +
        "</div></div>";

    h +=
      (T.sp && T.sp !== "s" ? '<div class="sp ' + T.sp + '"></div>' : "") +
      '</div></div><div class="ct"><button data-a="p" aria-label="Previous page">\u2039</button><span class="pg"></span><button data-a="n" aria-label="Next page">\u203a</button><button data-a="t" aria-label="Thumbnails">\u25a6</button><button data-a="z" aria-label="Zoom">\uff0b</button><button data-a="s" aria-label="Page-turn sound">\ud83d\udd08</button><button data-a="a" aria-label="Auto-play">\u25b6</button><button data-a="f" aria-label="Fullscreen">\u26f6</button></div><div class="th" hidden></div>' +
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
      if (!snd) return;
      try {
        const a = new AudioContext();
        const b = a.createBuffer(1, Math.floor(a.sampleRate * 0.15), a.sampleRate);
        const d = b.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3) * 0.4;
        const r = a.createBufferSource();
        const f = a.createBiquadFilter();
        r.buffer = b;
        f.type = "lowpass";
        f.frequency.value = 1800;
        r.connect(f);
        f.connect(a.destination);
        r.start();
      } catch (_) { /* silent */ }
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
          : (2 * s + 1 > n ? 2 * s : 2 * s + "\u20133" + (2 * s + 1)) + " / " + n;
    };

    const fit = () => {
      const aw = Math.max(200, root.clientWidth - 32);
      const ah = document.fullscreenElement ? innerHeight - 170 : Math.min(innerHeight * 0.72, 760);
      W = Math.min(aw / 2, ah * (c.ratio as number)) * z;
      H = W / (c.ratio as number);
      const p = Math.round(W * T.pd);
      bk.style.width = 2 * W + "px";
      bk.style.height = H + "px";
      bd.style.inset = "-" + p + "px";
      st.style.padding = p + "px";
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
      lvs[m].style.zIndex = String(L + 5);
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
      lvs[m].style.transition = "none";
      lvs[m].style.zIndex = String(L + 5);
      bk.setPointerCapture(e.pointerId);
    });

    bk.addEventListener("pointermove", (e) => {
      if (!dr) return;
      dr.p = Math.min(1, Math.max(0, ((e.clientX - dr.x) * -dr.sd) / W));
      lvs[dr.m].style.transform = "rotateY(" + (dr.sd > 0 ? -180 * dr.p : -180 + 180 * dr.p) + "deg)";
    });

    const up = () => {
      const d = dr;
      dr = null;
      if (!d) return;
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
      if (a === "z") { z = z >= 2 ? 1 : z + 0.5; fit(); }
      if (a === "s") { snd = !snd; b.textContent = snd ? "\ud83d\udd0a" : "\ud83d\udd08"; tick(); }
      if (a === "f") { document.fullscreenElement ? document.exitFullscreen() : root.requestFullscreen && root.requestFullscreen(); }
      if (a === "a") {
        if (au) { clearInterval(au as number); au = 0; b.textContent = "\u25b6"; }
        else { b.textContent = "\u23f8"; au = setInterval(() => { if (s >= maxS) { s = 0; place(); } else go(1); }, 3200); }
      }
      if (a === "t") {
        const t = q(".th") as HTMLElement;
        if (!t.innerHTML)
          t.innerHTML = P.map((u, i) => (u ? '<img data-i="' + i + '" src="' + u + '" alt="Go to page ' + (i + 1) + '">' : "")).join("");
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
    { theme: 0, logo: "", desc: "", logoRight: false, credit: false, bgType: "grad", bg1: "#f8fafc", bg2: "#e2e8f0", bgImg: "", dim: 0.35, sound: false, bgTouched: false, mode: "ask", shift: false, cover: "" },
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
    if (!files) return;
    status("Reading files\u2026");
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
        status("Ready. " + pages.length + " pages.");
        getEl("ed").scrollIntoView({ behavior: "smooth" });
      }
    } catch (_) {
      status("Could not read that file. Use a PDF, JPG, PNG or WebP.");
    }
  }

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
    }, 120) as unknown as number;
  }

  function sync() {
    (getEl("ds") as HTMLTextAreaElement).value = S.desc;
    (getEl("lr") as HTMLInputElement).checked = S.logoRight;
    (getEl("cr") as HTMLInputElement).checked = S.credit;
    (getEl("c1") as HTMLInputElement).value = S.bg1;
    (getEl("c2") as HTMLInputElement).value = S.bg2;
    (getEl("gr") as HTMLInputElement).checked = S.bgType !== "color";
    (getEl("dm") as HTMLInputElement).value = S.dim;
    (getEl("md") as HTMLSelectElement).value = S.mode;
    (getEl("sh") as HTMLInputElement).checked = S.shift;
    (getEl("sn") as HTMLInputElement).checked = S.sound;
    document.querySelectorAll(".ftc").forEach((b, i) => b.classList.toggle("fon", i === S.theme));
  }

  function tiles() {
    getEl("tg").innerHTML = THEMES.map(
      (t, i) =>
        '<button class="ftc' + (i === S.theme ? " fon" : "") + '" data-t="' + i + '"><i style="background:' + t.b + '">' +
        (TH ? '<img src="' + TH + '" alt="" style="filter:' + t.f + '">' : "") +
        "</i>" + t.n + "</button>"
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
    const t = THEMES[(S.theme = +b.dataset.t!)];
    if (!S.bgTouched) { S.bg1 = t.c1; S.bg2 = t.c2; S.bgType = "grad"; }
    sync(); show();
  };

  getEl("pal").onclick = (e: Event) => {
    const b = (e.target as HTMLElement).closest("button") as HTMLButtonElement | null;
    if (!b) return;
    const p = PAL[+b.dataset.i!];
    Object.assign(S, { bg1: p[1], bg2: p[2], bgType: "grad", bgTouched: true });
    sync(); show();
  };

  document.querySelector(".ftb")!.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest("button") as HTMLButtonElement | null;
    if (!b) return;
    document.querySelectorAll(".ftb button").forEach((x) => x.classList.toggle("fon", x === b));
    document.querySelectorAll(".ftp").forEach((p) => (p as HTMLElement).hidden = (p as HTMLElement).id !== "p-" + b.dataset.p);
  });

  const bind = (id: string, fn: (el: HTMLElement) => void, ev = "input") =>
    getEl(id).addEventListener(ev, () => { fn(getEl(id)); show(); });

  bind("ds", (e) => { S.desc = (e as HTMLTextAreaElement).value; });
  bind("lr", (e) => { S.logoRight = (e as HTMLInputElement).checked; }, "change");
  bind("cr", (e) => { S.credit = (e as HTMLInputElement).checked; }, "change");
  bind("sn", (e) => { S.sound = (e as HTMLInputElement).checked; }, "change");
  bind("dm", (e) => { S.dim = +(e as HTMLInputElement).value; });
  bind("c1", (e) => { S.bg1 = (e as HTMLInputElement).value; S.bgTouched = true; if (S.bgType === "img") S.bgType = "grad"; });
  bind("c2", (e) => { S.bg2 = (e as HTMLInputElement).value; S.bgTouched = true; });
  bind("gr", (e) => { S.bgType = (e as HTMLInputElement).checked ? "grad" : "color"; S.bgTouched = true; }, "change");

  getEl("md").addEventListener("change", (e: Event) => { S.mode = (e.target as HTMLSelectElement).value; derive(); });
  getEl("sh").addEventListener("change", (e: Event) => { S.shift = (e.target as HTMLInputElement).checked; derive(); });

  getEl("lg").addEventListener("change", async (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    S.logo = await f2u(f, 320, "image/png", 1);
    await logoPal(S.logo);
    getEl("lo").hidden = !LC.length;
    show();
  });

  getEl("lgx").onclick = () => { S.logo = ""; LC = []; getEl("lo").hidden = true; getEl("lp").innerHTML = ""; show(); };

  getEl("bi").addEventListener("change", async (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    S.bgImg = await f2u(f, 1400, "image/jpeg", 0.8);
    S.bgType = "img"; S.bgTouched = true; show();
  });

  getEl("bix").onclick = () => { S.bgImg = ""; S.bgType = "grad"; show(); };

  getEl("eye").onclick = async () => {
    if (!(window as unknown as Record<string, unknown>)["EyeDropper"]) {
      alert("Your browser has no screen color picker. Use the color circles instead.");
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = await new (window as any).EyeDropper().open();
      S.bg1 = r.sRGBHex; S.bgType = "grad"; S.bgTouched = true; sync(); show();
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
    Object.assign(S, { bg1: b.dataset.h, bg2: b.dataset.h, bgType: "color", bgTouched: true });
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

  // ── Build standalone HTML for download ────────────────────────────────────
  function buildHTML(): string {
    const cfg = JSON.stringify(Object.assign({}, S, { pages, ratio, full: true })).replace(/</g, "\\u003c");
    const t = (S.desc || "Flipbook").split("\n")[0].slice(0, 60);

    // Reconstruct engine as string for embedding
    const engineStr = [
      "const N=" + JSON.stringify(N) + ";",
      "const THEMES=" + JSON.stringify(THEMES) + ";",
      "const esc=s=>String(s||'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));",
      "const lum=h=>{h=String(h||'#fff').replace('#','');if(h.length==3)h=h.replace(/./g,'$&$&');const v=parseInt(h,16);return(.299*(v>>16)+.587*(v>>8&255)+.114*(v&255))/255};",
      Viewer.toString(),
    ].join("\n");

    return (
      "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\"><title>" +
      esc(t) +
      "</title><style>html,body{margin:0;background:#000;font-family:system-ui,sans-serif}</style><style>" +
      VCSS +
      "</style></head><body><div id=\"r\"></div><script>" +
      engineStr +
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
    (getEl("fi") as HTMLInputElement).value = "";
  };

  // ── Drop zone ──────────────────────────────────────────────────────────────
  const dz = getEl("drop");
  dz.onclick = () => (getEl("fi") as HTMLInputElement).click();
  dz.onkeydown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (getEl("fi") as HTMLInputElement).click(); }
  };

  getEl("fi").addEventListener("change", (e: Event) => loadFiles((e.target as HTMLInputElement).files));
  dz.addEventListener("dragover", (e: Event) => { e.preventDefault(); dz.classList.add("on"); });
  dz.addEventListener("dragleave", () => dz.classList.remove("on"));
  dz.addEventListener("drop", (e: Event) => {
    e.preventDefault(); dz.classList.remove("on");
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
      status("Ready. " + pages.length + " pages.");
      getEl("ed").scrollIntoView({ behavior: "smooth" });
    }
  };

  getEl("lu").onclick = () => {
    Object.assign(S, { bg1: LC[0], bg2: LC[1] || LC[0], bgType: "grad", bgTouched: true });
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
    await derive();
  });

  getEl("cvx").onclick = async () => { S.cover = ""; await derive(); };

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
    if (navigator.clipboard && el) navigator.clipboard.writeText(el.textContent || "");
  };

  // ── Init ──────────────────────────────────────────────────────────────────
  if (S.mode === "auto") S.mode = "ask";
  sync();
  if (S.logo) logoPal(S.logo);
}
