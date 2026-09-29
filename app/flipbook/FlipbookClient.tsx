"use client";

import { useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import Link from "next/link";

// ── SVG Noise & Texture Filters for Realistic Book Covers ────────────────────
const enc = (s: string) => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
const noise = (f: number | string, o: number, m: number, off: number, seed: number, s: number, c = 0, ty = "fractalNoise") =>
  enc(`<svg xmlns='http://www.w3.org/2000/svg' width='${s}' height='${s}'><filter id='f'><feTurbulence type='${ty}' baseFrequency='${f}' numOctaves='${o}' seed='${seed}'/><feColorMatrix values='0 0 0 0 ${c} 0 0 0 0 ${c} 0 0 0 0 ${c} ${m} 0 0 0 ${off}'/></filter><rect width='100%' height='100%' filter='url(#f)'/></svg>`);
const croc = enc(`<svg xmlns='http://www.w3.org/2000/svg' width='64' height='48'><defs><radialGradient id='g'><stop offset='0' stop-color='white' stop-opacity='.26'/><stop offset='1' stop-color='white' stop-opacity='0'/></radialGradient></defs>${[[3,3],[35,3],[19,27],[51,27],[-13,27]].map(([x,y])=>`<rect x='${x}' y='${y}' width='26' height='18' rx='9' fill='url(#g)' stroke='rgba(0,0,0,.65)' stroke-width='2'/>`).join("")}</svg>`);

const G1 = noise(0.9, 2, 1.5, -0.42, 7, 200);
const G2 = noise(0.035, 3, 1.3, -0.38, 3, 420);
const GW = noise("0.006 0.3", 4, 1.9, -0.62, 9, 500);
const GP = noise(1.2, 2, 0.7, -0.18, 5, 160, 1);
const GV = noise(1.7, 1, 0.55, -0.14, 2, 160, 1);
const GM = noise("0.009 0.014", 5, -9, 2.4, 4, 600, 0.32, "turbulence");

const vig = "radial-gradient(130% 110% at 50% 50%,transparent 50%,rgba(0,0,0,.55))";
const hl = "radial-gradient(120% 90% at 30% 15%,rgba(255,255,255,.2),transparent 55%)";
const marb = (a: string, b: string) => `repeating-radial-gradient(ellipse at 25% 35%,${a} 0 5px,#f0e2c0 5px 9px,${b} 9px 13px,#f0e2c0 13px 17px)`;
const brass = "linear-gradient(135deg,#f7e08e,#9a731f)";
const GOLD = "linear-gradient(100deg,#8a6a1a,#f7e08e 30%,#b8891f 50%,#f7e08e 70%,#8a6a1a)";
const DGOLD = "linear-gradient(100deg,#5e430a,#c79a2c 30%,#7d5a12 50%,#c79a2c 70%,#5e430a)";
const PAP = ["#f4ecd6", "#b9a97f"];
const GILT = ["#f6dc85", "#9a731f"];

// ── Viewer CSS (Embedded in preview AND downloaded standalone HTML) ──────────
const VCSS = `
:root {
  --g1: ${G1};
  --g2: ${G2};
  --gw: ${GW};
  --gp: ${GP};
  --gv: ${GV};
  --gm: ${GM};
  --croc: ${croc};
  --O: 14px;
  --e1: #f4ecd6;
  --e2: #b9a97f;
  --st: rgba(236,214,160,.7);
  --foil: linear-gradient(100deg,#8a6a1a,#f7e08e,#8a6a1a);
  --bc: #d4af37;
  --wl: 2px;
  --wr: 12px;
}
.fbv{position:relative;display:flex;flex-direction:column;align-items:center;gap:10px;padding:14px 18px;border-radius:22px;overflow:hidden;box-sizing:border-box;font-family:inherit;transition:background .3s}
.fbv.full{border-radius:0;min-height:100vh;height:100vh;padding:12px 18px;justify-content:space-between;box-sizing:border-box}
.fbv .ov{position:absolute;inset:0;pointer-events:none}
.fbh{display:flex;justify-content:space-between;align-items:center;width:100%;gap:16px;z-index:10}
.fbh.rv{flex-direction:row-reverse}.fbh.rv p{text-align:left}
.fbh img{max-height:44px;max-width:38%;object-fit:contain;filter:drop-shadow(0 2px 6px rgba(0,0,0,.15))}
.fbh p{margin:0;font-size:.8125rem;line-height:1.4;text-align:right;max-width:58%;white-space:pre-line;font-weight:600;letter-spacing:-.01em}

/* 3D Realistic Stage & Hard Board Architecture */
.stage{position:relative;width:100%;height:clamp(380px,52vh,520px);display:flex;align-items:center;justify-content:center;touch-action:pan-y;z-index:2;perspective:2600px;-webkit-perspective:2600px;overflow:hidden}
.fbv.full .stage{height:calc(100vh - 100px);max-height:none}
#wrap{position:relative;display:flex;align-items:center;justify-content:center;transition:transform .55s cubic-bezier(.3,.7,.2,1)}
#book{position:relative;z-index:2}
#board{position:absolute;z-index:1;border-radius:8px 14px 14px 8px;box-shadow:0 34px 50px -8px rgba(0,0,0,.6),0 10px 16px rgba(0,0,0,.45),inset 0 0 0 1px rgba(255,255,255,.12);transition:left .55s cubic-bezier(.3,.7,.2,1),top .55s,width .55s cubic-bezier(.3,.7,.2,1),height .55s}
.stk{position:absolute;background:repeating-linear-gradient(90deg,var(--e1) 0 1px,var(--e2) 1px 2px);box-shadow:inset 0 0 4px rgba(0,0,0,.55);transition:width .4s}
.stk.l{left:calc(var(--O) - var(--wl));width:var(--wl);top:var(--O);bottom:var(--O)}
.stk.r{right:calc(var(--O) - var(--wr));width:var(--wr);top:var(--O);bottom:var(--O)}
.stk.b{left:var(--O);right:var(--O);bottom:calc(var(--O) - 5px);height:5px;background:repeating-linear-gradient(0deg,var(--e1) 0 1px,var(--e2) 1px 2px)}
#rib{position:absolute;left:calc(50% - 6px);bottom:-46px;width:12px;height:58px;clip-path:polygon(0 0,100% 0,100% 100%,50% 86%,0 100%);opacity:0;transition:opacity .4s;pointer-events:none;z-index:3}
#rings{position:absolute;z-index:6;width:30px;pointer-events:none;display:none;background:radial-gradient(ellipse at 50% 50%,#111 0 4px,transparent 5px),radial-gradient(ellipse at 50% 50%,#e8e8ee 0 9px,#7d7d86 11px,transparent 12px);background-size:30px 30px;filter:drop-shadow(1px 3px 2px rgba(0,0,0,.5))}
#band{position:absolute;z-index:6;width:11px;display:none;pointer-events:none;background:linear-gradient(90deg,#7d0c20,#c21a3a 50%,#6d0a1b);box-shadow:2px 0 4px rgba(0,0,0,.5);transition:opacity .3s}

/* Page, Endpaper & Cover Textures */
.page{width:100%;height:100%;overflow:hidden;background-color:#fff}
.paper{width:100%;height:100%;position:relative;display:flex;flex-direction:column}
.pi{background:#fff}.pi img{width:100%;height:100%;object-fit:contain;display:block}
.pi::after,.endp::after{content:"";position:absolute;inset:0;pointer-events:none}
.--left .pi::after,.--left .endp::after{box-shadow:inset -30px 0 30px -18px rgba(60,40,10,.5)}
.--right .pi::after,.--right .endp::after{box-shadow:inset 30px 0 30px -18px rgba(60,40,10,.5)}
.cov{align-items:center;justify-content:center;overflow:hidden}
.cov.hg::before{content:"";position:absolute;z-index:3;top:0;bottom:0;width:3px;background:rgba(0,0,0,.5);box-shadow:1px 0 0 rgba(255,255,255,.14)}
.cov-f.hg::before{left:6%}
.cov-b.hg::before{right:6%}
.stitch{position:absolute;inset:3.2%;border:2px dashed var(--st);border-radius:8px;pointer-events:none}
.frame{position:absolute;inset:9% 9% 9% 12%;border:2px solid;box-shadow:0 1px 0 rgba(255,255,255,.16),inset 0 1px 2px rgba(0,0,0,.6);pointer-events:none}
.cov-b .frame{inset:9% 12% 9% 9%}
.frame.lx{border-image:var(--foil) 1;box-shadow:0 0 0 6px transparent,0 0 0 7px var(--st)}
.spn{position:absolute;top:0;bottom:0;box-shadow:inset -6px 0 8px rgba(0,0,0,.5);pointer-events:none}
.cn{position:absolute;width:34px;height:34px;pointer-events:none}
.ttl{position:relative;text-align:center;padding:0 6%;max-width:94%;z-index:2}
.ttl h2{margin:8px 0;font-size:clamp(16px,3vw,30px);font-weight:400;letter-spacing:.06em;line-height:1.25;word-break:break-word}
.ttl span{font-size:clamp(9px,1.3vw,12px);letter-spacing:.3em}
.lx{filter:drop-shadow(0 1px 0 rgba(0,0,0,.6))}
.lx h2{letter-spacing:.14em;text-transform:uppercase;font-family:Georgia,serif}
.foil{display:inline-block;background:var(--foil);background-size:240% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:sh 6s linear infinite}
@keyframes sh{to{background-position:-240% 0}}
.mono{display:grid;place-items:center;width:clamp(34px,6vw,54px);height:clamp(34px,6vw,54px);border:2px solid var(--bc);border-radius:50%;margin:0 auto 10px;font:italic clamp(17px,3vw,28px) Georgia,serif}
.lbl{background:#f3ead2;color:#222!important;padding:12px 16px;border:2px double #8a7a55;text-shadow:none!important;box-shadow:0 1px 3px rgba(0,0,0,.5)}
.glz{position:absolute;inset:0;z-index:2;pointer-events:none}

/* StPageFlip Engine Styles */
.stf__parent{position:relative;display:block;box-sizing:border-box;transform:translateZ(0);-ms-touch-action:pan-y;touch-action:pan-y;margin:auto}
.sft__wrapper{position:relative;width:100%;box-sizing:border-box}
.stf__parent canvas{position:absolute;width:100%;height:100%;left:0;top:0}
.stf__block{position:absolute;width:100%;height:100%;box-sizing:border-box;perspective:2600px}
.stf__item{display:none;position:absolute;transform-style:preserve-3d}
.stf__outerShadow{position:absolute;left:0;top:0}
.stf__innerShadow{position:absolute;left:0;top:0}
.stf__hardShadow{position:absolute;left:0;top:0}
.stf__hardInnerShadow{position:absolute;left:0;top:0}

/* Viewer Controls Bar */
.ct{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:4px;z-index:10;background:rgba(15,23,42,.85);padding:6px 12px;border-radius:999px;color:#fff;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 12px 30px -5px rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.15);margin-top:4px}
.ct button{all:unset;cursor:pointer;width:34px;height:34px;text-align:center;line-height:34px;border-radius:50%;font-size:1.05rem;transition:all .15s;display:flex;align-items:center;justify-content:center}
.ct button:hover,.ct button:focus-visible{background:rgba(255,255,255,.2);transform:scale(1.08)}
.ct .pg{font-size:.8125rem;min-width:76px;text-align:center;font-weight:700;letter-spacing:-.01em;padding:0 4px}
.th{display:flex;gap:10px;overflow-x:auto;width:100%;padding:10px 4px;z-index:10;scrollbar-width:thin}.th[hidden]{display:none!important}
.th img{height:72px;border-radius:8px;cursor:pointer;border:2px solid transparent;transition:all .18s;box-shadow:0 4px 10px rgba(0,0,0,.15)}.th img:hover{border-color:#3b82f6;transform:scale(1.06)}
.cr{z-index:10;font-size:.75rem;color:inherit;opacity:.75;font-weight:600;text-decoration:none;transition:opacity .15s}
.cr:hover{opacity:1;text-decoration:underline}
`;

// ── App Specific CSS for Customizer & Workspace ───────────────────────────────
const APP_CSS = `
#fbapp {
  --fb-primary: #2563eb;
  --fb-line: #e2e8f0;
}
#ed[hidden], #ex[hidden], #ask[hidden] {
  display: none !important;
}
#ed {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 390px;
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
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 4px;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  margin-bottom: 16px;
}
@media (max-width: 640px) {
  .ftb {
    display: flex;
    flex-wrap: wrap;
  }
  .ftb button {
    flex: 1 1 auto;
  }
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
  overflow: hidden;
  text-overflow: ellipsis;
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
  gap: 12px;
  max-height: 65vh;
  overflow-y: auto;
  padding: 4px 6px 4px 4px;
  scrollbar-width: thin;
}
.ftp label {
  font-size: .8125rem;
  font-weight: 700;
  color: #1e293b;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ft-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ft-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: .6875rem;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: #64748b;
  margin-top: 4px;
}
.ftg {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  padding: 2px 1px;
}
.ftc {
  border: 1.5px solid #e2e8f0;
  background: #ffffff;
  border-radius: 12px;
  padding: 6px 8px;
  cursor: pointer;
  font-size: .6875rem;
  font-weight: 700;
  color: #1e293b;
  text-align: left;
  transition: all .16s ease;
  display: flex;
  align-items: center;
  gap: 7px;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  box-shadow: 0 1px 2px rgba(15,23,42,.04);
}
.ftc:hover {
  border-color: #93c5fd;
  transform: translateY(-1px);
  box-shadow: 0 4px 10px -2px rgba(37,99,235,.12);
}
.ftc i {
  display: block;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.35), 0 2px 4px rgba(0,0,0,.15);
}
.ftc span {
  font-size: .6875rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.01em;
}
.ftc.fon {
  border-color: #2563eb !important;
  background: #eff6ff !important;
  color: #1d4ed8 !important;
  box-shadow: inset 0 0 0 1.5px #2563eb, 0 3px 8px -2px rgba(37,99,235,.25) !important;
}

/* Modern Toggle Switch Options */
.f-toggle-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: 16px;
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  transition: all .15s ease;
  cursor: pointer;
  user-select: none;
}
.f-toggle-card:hover {
  border-color: #93c5fd;
  background: #f8faff;
}
.f-toggle-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  flex-shrink: 0;
}
.f-toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.f-toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: #cbd5e1;
  transition: .2s ease;
  border-radius: 22px;
}
.f-toggle-slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .2s cubic-bezier(0.16, 1, 0.3, 1);
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0,0,0,.25);
}
.f-toggle-switch input:checked + .f-toggle-slider {
  background-color: #2563eb;
}
.f-toggle-switch input:checked + .f-toggle-slider:before {
  transform: translateX(18px);
}

.f-upload-zone {
  border: 1.5px dashed #cbd5e1;
  border-radius: 18px;
  background: #f8fafc;
  padding: 16px;
  text-align: center;
  cursor: pointer;
  transition: all .18s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.f-upload-zone:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}
.f-upload-icon {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: #dbeafe;
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform .18s ease;
}
.f-upload-zone:hover .f-upload-icon {
  transform: scale(1.08);
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
  width: 32px;
  height: 32px;
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
.ftp textarea, .ftp select, .ftp input[type=text] {
  font: inherit;
  font-size: .8125rem;
  padding: 9px 12px;
  border: 1.5px solid #cbd5e1;
  border-radius: 14px;
  width: 100%;
  background: #ffffff;
  color: #0f172a;
  transition: border-color .15s, box-shadow .15s;
  box-sizing: border-box;
}
.ftp select {
  appearance: none;
  -webkit-appearance: none;
  background-color: #ffffff;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  background-size: 16px 16px;
  padding-right: 38px !important;
  cursor: pointer;
}
.ftp textarea:focus, .ftp select:focus, .ftp input[type=text]:focus {
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
  padding: 8px 14px;
  border-radius: 12px;
  cursor: pointer;
  font-size: .75rem;
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
  font-size: .8125rem;
  font-weight: 700;
  padding: 9px 16px;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(37,99,235,.28);
  transition: all .18s;
}
.fcta:hover {
  box-shadow: 0 8px 22px rgba(37,99,235,.38);
  transform: translateY(-1px);
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
    q: "What styles are included?",
    a: "Spellense includes 12 authentic physical book editions: 7 Classic styles (Leather, Linen Cloth, Walnut Wood, Spiral Notebook, Elastic Notebook, Glossy Magazine, Ledger), 4 Luxury styles (Black & Gold, Emerald Velvet, Crocodile Cognac, Carrara Marble), plus 'Your Own Cover' with custom front & back artwork on real hard boards.",
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
    if (!initDone.current) {
      initDone.current = true;
      initFlipbookApp();
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#f0f6fe] font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* Inject viewer & editor CSS */}
      <style dangerouslySetInnerHTML={{ __html: VCSS + APP_CSS }} />

      <Navbar />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden px-4 pt-16 pb-10 sm:px-6 sm:pt-20 sm:pb-12 lg:pt-24 lg:pb-14">
          <div className="mx-auto max-w-5xl text-center px-2">
            <h1 className="text-[34px] xs:text-[44px] sm:text-[56px] md:text-[64px] lg:text-[72px] font-black leading-[1.16] sm:leading-[1.18] tracking-[-1.5px] sm:tracking-[-2.5px] text-slate-900 text-center max-w-4xl mx-auto">
              Turn any PDF into a 3D page-flip book.
            </h1>
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
            className={`group relative mx-auto max-w-[920px] cursor-pointer rounded-[28px] border p-8 sm:p-14 text-center transition-all duration-300 overflow-hidden ${
              isDragging
                ? "border-[#0055fe] bg-blue-50/95 shadow-[0_0_60px_rgba(0,85,254,0.25)] scale-[1.01]"
                : "border-slate-200/90 hover:border-blue-400/80 bg-white shadow-[0_15px_50px_-15px_rgba(0,85,254,0.07)] hover:shadow-[0_20px_60px_-15px_rgba(0,85,254,0.12)]"
            }`}
          >
            {/* Cloud Upload Icon */}
            <div className="mx-auto flex justify-center items-center">
              <svg
                width="68"
                height="68"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0055fe"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="group-hover:-translate-y-1 transition-transform duration-300"
              >
                <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                <path d="M12 12v9" />
                <path d="m16 16-4-4-4 4" />
              </svg>
            </div>

            <h2 className="mt-4 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 group-hover:text-blue-900 transition-colors">
              Drop your PDF or images here
            </h2>
            <p className="mx-auto mt-1 max-w-md text-xs sm:text-sm text-slate-500 font-medium">
              or click to choose a file
            </p>

            {/* Action Button */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <span className="inline-flex items-center gap-2.5 rounded-xl bg-[#0055fe] hover:bg-[#0047d9] px-8 py-3.5 text-sm sm:text-base font-semibold text-white shadow-md shadow-blue-600/25 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5" />
                  <path d="m5 12 7-7 7 7" />
                </svg>
                <span>Choose PDF or Images</span>
              </span>
            </div>

            {/* Sample Link */}
            <div className="mt-5 flex justify-center">
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
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#0055fe] hover:underline cursor-pointer"
                title="Test immediately with a demo catalog"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                  <path d="M6 6h10" />
                  <path d="M6 10h10" />
                </svg>
                <span>📖 Try Demo Catalog</span>
              </button>
            </div>

            <div id="st" aria-live="polite" className="mt-4 text-xs font-semibold text-blue-600 min-h-[1.5em]"></div>
          </div>

          {/* 4 Trust Feature Cards */}
          <div className="mt-8 max-w-[920px] mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
              <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/70 border border-slate-100/90 shadow-2xs backdrop-blur-sm">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100/70 text-[#0055fe]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                    <path d="M6 6h10" />
                    <path d="M6 10h10" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs sm:text-[13px] font-bold text-slate-900 leading-tight">
                    12 Book Styles
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                    Leather, velvet, walnut &amp; custom
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/70 border border-slate-100/90 shadow-2xs backdrop-blur-sm">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-100/70 text-purple-600">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs sm:text-[13px] font-bold text-slate-900 leading-tight">
                    3D Realistic Board
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                    Page stack &amp; ribbon bookmark
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/70 border border-slate-100/90 shadow-2xs backdrop-blur-sm">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100/70 text-emerald-600">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs sm:text-[13px] font-bold text-slate-900 leading-tight">
                    Offline HTML Export
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                    Standalone file • No signup
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/70 border border-slate-100/90 shadow-2xs backdrop-blur-sm">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100/70 text-amber-600">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs sm:text-[13px] font-bold text-slate-900 leading-tight">
                    Zero Server Upload
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                    Rendered entirely in browser
                  </div>
                </div>
              </div>
            </div>
          </div>
          <input type="file" id="fi" accept="application/pdf,image/*" multiple hidden />

          {/* WIDE-PAGE SPREAD DIALOG */}
          <div className="mx-auto mt-6 max-w-[920px] rounded-2xl border border-amber-200 bg-amber-50/90 p-5 shadow-xs" id="ask" hidden>
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
            <div id="pv" className="rounded-3xl border border-slate-200/80 bg-white/95 p-2 sm:p-3 shadow-xl shadow-slate-900/5 backdrop-blur-xl"></div>

            {/* RIGHT: CUSTOMIZER PANEL */}
            <div className="fpn">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">Customizer</span>
                </div>
                <span className="text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">12 Realistic Styles</span>
              </div>

              {/* 5-COL COMPACT SEGMENTED TABS */}
              <div className="ftb" role="tablist">
                <button className="fon" data-p="st">Style</button>
                <button data-p="br">Brand</button>
                <button data-p="bg">Backdrop</button>
                <button data-p="ly">Layout</button>
                <button data-p="kt">Kit</button>
              </div>

              {/* 1. Style panel */}
              <div className="ftp" id="p-st">
                {/* Active Style Description Box */}
                <div id="note" className="rounded-xl border border-blue-100 bg-blue-50/80 p-3 text-xs text-blue-900 leading-relaxed font-medium"></div>

                {/* Custom Cover Studio Panel (Shown when 'Your Own Cover' is selected) */}
                <div id="cpanel" className="rounded-2xl border border-slate-200/90 bg-slate-50/90 p-3.5 shadow-2xs flex flex-col gap-3" hidden>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                    <span className="text-xs font-bold text-slate-800">Bespoke Hardcover Artwork</span>
                    <button type="button" className="fcta text-[11px] py-1 px-2.5" id="cpanel-sample">✨ Sample Cover</button>
                  </div>

                  {/* Front Cover */}
                  <div>
                    <span className="text-xs font-bold text-slate-700">Front Cover Artwork</span>
                    <div className="flex items-center gap-2.5 mt-1.5">
                      <div id="thF" className="h-14 w-10 rounded-md border border-slate-200 bg-slate-100 bg-center bg-cover shrink-0 shadow-2xs flex items-center justify-center text-slate-400">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                      </div>
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <button type="button" className="fbtn text-xs py-1 px-2.5" id="uF">Upload Front</button>
                          <button type="button" className="text-xs text-rose-600 hover:text-rose-800 font-bold px-1.5 hidden" id="uFx">Remove</button>
                        </div>
                        <span className="text-[10px] text-slate-400">Ratio ~5:7 recommended</span>
                      </div>
                    </div>
                    <input id="fF" type="file" accept="image/*" className="hidden" />
                  </div>

                  {/* Back Cover */}
                  <div>
                    <span className="text-xs font-bold text-slate-700">Back Cover Artwork (Optional)</span>
                    <div className="flex items-center gap-2.5 mt-1.5">
                      <div id="thB" className="h-14 w-10 rounded-md border border-slate-200 bg-slate-100 bg-center bg-cover shrink-0 shadow-2xs flex items-center justify-center text-slate-400">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                      </div>
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <button type="button" className="fbtn text-xs py-1 px-2.5" id="uB">Upload Back</button>
                          <button type="button" className="text-xs text-rose-600 hover:text-rose-800 font-bold px-1.5 hidden" id="uBx">Remove</button>
                        </div>
                        <span className="text-[10px] text-slate-400">Matches board if empty</span>
                      </div>
                    </div>
                    <input id="fB" type="file" accept="image/*" className="hidden" />
                  </div>

                  {/* Board & Endpaper Color */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700">Board &amp; Endpaper Color</span>
                      <span className="text-[10px] text-slate-400" id="cpanel-auto">Auto-extracted from cover</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="color" id="col" defaultValue="#2a2545" className="h-8 w-8 rounded-full border-0 cursor-pointer" />
                    </div>
                  </div>

                  {/* Matte / Glossy */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-bold text-slate-700">Cover Finish</span>
                    <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="radio" name="fin" value="matte" defaultChecked /> Matte
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="radio" name="fin" value="gloss" /> Glossy
                      </label>
                    </div>
                  </div>
                </div>

                {/* 12 Authentic Book Styles Grouped */}
                <div id="tg" className="flex flex-col gap-3"></div>
              </div>

              {/* 2. Brand panel */}
              <div className="ftp" id="p-br" hidden>
                {/* Book Title (Embossed on Cover) */}
                <div>
                  <label htmlFor="bt" className="text-xs font-bold text-slate-800 block mb-1">
                    Book Title (Embossed on Cover)
                  </label>
                  <input type="text" id="bt" placeholder="Spellense Catalog" maxLength={45} className="w-full text-xs font-semibold" />
                  <span className="text-[10px] text-slate-400 mt-1">Rendered in gold foil on Luxury editions and stamped ink on Classic</span>
                </div>

                {/* Book Header Subtitle */}
                <div>
                  <label htmlFor="ds" className="text-xs font-bold text-slate-800 block mb-1">
                    Book Header Subtitle
                  </label>
                  <textarea id="ds" rows={2} maxLength={160} placeholder="Spellense Editorial 2026 • Designed for print and digital" className="w-full text-xs font-medium"></textarea>
                </div>

                {/* Brand Logo */}
                <div>
                  <span className="text-xs font-bold text-slate-800">Brand Logo</span>
                  <p className="text-[11px] text-slate-500 mb-2">Displayed in header alongside book description</p>
                  <label htmlFor="lg" className="f-upload-zone group">
                    <input type="file" id="lg" accept="image/*" className="hidden" />
                    <div className="f-upload-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Upload Transparent Logo</span>
                    <span className="text-[10px] text-slate-400">PNG or SVG recommended</span>
                  </label>
                  <div id="lg-status" className="mt-2.5 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-2xs hidden">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img id="lg-thumb" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="Logo" className="h-6 w-auto max-w-[48px] object-contain rounded border border-slate-100 p-0.5" />
                      <span className="text-xs font-semibold text-slate-700 truncate">Logo active</span>
                    </div>
                    <button type="button" className="text-xs font-bold text-rose-600 hover:text-rose-800 px-2 py-0.5 rounded hover:bg-rose-50 transition-colors cursor-pointer" id="lgx">
                      Remove
                    </button>
                  </div>
                </div>

                {/* Option 1: Swap Sides */}
                <label htmlFor="lr" className="f-toggle-card">
                  <div className="flex flex-col pr-3">
                    <span className="text-xs font-bold text-slate-800">Swap Header Sides</span>
                    <span className="text-[11px] text-slate-500 font-normal mt-0.5">Logo on right, text on left</span>
                  </div>
                  <label className="f-toggle-switch">
                    <input type="checkbox" id="lr" />
                    <span className="f-toggle-slider"></span>
                  </label>
                </label>

                {/* Option 2: Made with Spellense credit */}
                <label htmlFor="cr" className="f-toggle-card">
                  <div className="flex flex-col pr-3">
                    <span className="text-xs font-bold text-slate-800">Brand Watermark</span>
                    <span className="text-[11px] text-slate-500 font-normal mt-0.5">Show subtle &ldquo;Made with Spellense&rdquo; credit</span>
                  </div>
                  <label className="f-toggle-switch">
                    <input type="checkbox" id="cr" />
                    <span className="f-toggle-slider"></span>
                  </label>
                </label>
              </div>

              {/* 3. Backdrop panel */}
              <div className="ftp" id="p-bg" hidden>
                <div>
                  <span className="text-xs font-bold text-slate-800">Curated Palettes</span>
                  <div className="fpl mt-2" id="pal"></div>
                </div>

                {/* Colors from Logo */}
                <div>
                  <span className="text-xs font-bold text-slate-800">Colors from Logo</span>
                  <p className="text-[11px] text-slate-500 mb-2">Auto-extract matching backdrop palette from your brand logo</p>
                  
                  {/* Upload button when logo is not yet uploaded */}
                  <div id="lp-upload-box" className="mt-1">
                    <label htmlFor="lg-backdrop" className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/80 text-blue-700 text-xs font-semibold cursor-pointer transition-all hover:shadow-xs">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <span>Upload Brand Logo to Extract Palette</span>
                      <input type="file" id="lg-backdrop" accept="image/*" className="hidden" />
                    </label>
                  </div>

                  <div id="lp-status" className="mt-2.5 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-2 shadow-2xs hidden">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-800">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      Logo palette active
                    </span>
                    <div className="flex items-center gap-2">
                      <label htmlFor="lg-backdrop-change" className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer">
                        Change
                        <input type="file" id="lg-backdrop-change" accept="image/*" className="hidden" />
                      </label>
                      <span className="text-slate-300">•</span>
                      <button type="button" className="text-xs font-bold text-rose-600 hover:text-rose-800 px-1 py-0.5 rounded hover:bg-rose-100/60 transition-colors cursor-pointer" id="lpx">
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="fpl mt-2.5" id="lp" hidden></div>
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-800">Custom Backdrop Dual-Tone</span>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <div className="flex items-center gap-2">
                      <div className="relative flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xs">
                        <input type="color" id="c1" aria-label="Color 1" />
                        <span className="text-[11px] font-bold text-slate-500 uppercase pr-1" id="c1-val">#0D0B1A</span>
                      </div>
                      <div className="relative flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xs">
                        <input type="color" id="c2" aria-label="Color 2" />
                        <span className="text-[11px] font-bold text-slate-500 uppercase pr-1" id="c2-val">#171233</span>
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

                {/* Option 3: Gradient Toggle */}
                <label htmlFor="gr" className="f-toggle-card">
                  <div className="flex flex-col pr-3">
                    <span className="text-xs font-bold text-slate-800">Gradient Backdrop</span>
                    <span className="text-[11px] text-slate-500 font-normal mt-0.5">Smooth diagonal dual-tone transition</span>
                  </div>
                  <label className="f-toggle-switch">
                    <input type="checkbox" id="gr" defaultChecked />
                    <span className="f-toggle-slider"></span>
                  </label>
                </label>

                {/* Backdrop photo */}
                <div>
                  <span className="text-xs font-bold text-slate-800">Backdrop Scenic Photo</span>
                  <p className="text-[11px] text-slate-500 mb-2">Display photography behind the 3D book</p>
                  <label htmlFor="bi" className="f-upload-zone group">
                    <input type="file" id="bi" accept="image/*" className="hidden" />
                    <div className="f-upload-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                        <circle cx="9" cy="9" r="2"/>
                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Choose Backdrop Photo</span>
                    <span className="text-[10px] text-slate-400">High-resolution scenery or studio desk</span>
                  </label>
                  <div id="bi-status" className="mt-2.5 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-2 shadow-2xs hidden">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-800">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      Photo active
                    </span>
                    <button type="button" className="text-xs font-bold text-rose-600 hover:text-rose-800 px-2 py-0.5 rounded hover:bg-rose-100/60 transition-colors cursor-pointer" id="bix">
                      Remove
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="dm" className="text-xs font-bold text-slate-800 block mb-1">
                    Photo Dimming Overlay
                  </label>
                  <input type="range" id="dm" min="0" max=".8" step=".05" defaultValue="0.35" className="w-full accent-blue-600" />
                </div>
              </div>

              {/* 4. Layout panel */}
              <div className="ftp" id="p-ly" hidden>
                <div>
                  <label htmlFor="md" className="text-xs font-bold text-slate-800 block mb-1.5">
                    Two-Page Spread Handling
                  </label>
                  <select id="md" className="w-full" defaultValue="keep">
                    <option value="ask">Ask me when wide pages are found</option>
                    <option value="keep">Keep every page as one page</option>
                    <option value="split">Split wide pages into left and right</option>
                  </select>
                </div>

                {/* Sound Effects */}
                <label htmlFor="sn" className="f-toggle-card">
                  <div className="flex flex-col pr-3">
                    <span className="text-xs font-bold text-slate-800">Realistic Sound Effects</span>
                    <span className="text-[11px] text-slate-500 font-normal mt-0.5">Physical paper rustle on corner turn</span>
                  </div>
                  <label className="f-toggle-switch">
                    <input type="checkbox" id="sn" />
                    <span className="f-toggle-slider"></span>
                  </label>
                </label>
              </div>

              {/* 5. Brand kit panel */}
              <div className="ftp" id="p-kt" hidden>
                <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-3.5 shadow-2xs">
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    Your chosen style, custom cover, title, logo, and palette automatically save locally. Export as JSON to reuse across devices or teammates.
                  </p>
                </div>
                <div className="flex flex-col gap-2.5 mt-2">
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
                <h3 className="mt-3 text-sm font-bold text-slate-900">Pick a Style or Custom Cover</h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed font-normal">
                  Choose from 7 classic books, 4 luxury gold editions, or wrap your own cover with hard board, ribbon &amp; gilded edges.
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

// ── All Flipbook App Logic ───────────────────────────────────────────────────
function initFlipbookApp() {
  let pfSourceCache = "";
  fetch("/page-flip.browser.js")
    .then((r) => (r.ok ? r.text() : ""))
    .then((t) => { pfSourceCache = t; })
    .catch(() => {});

  // ── 12 Authentic Book Styles from Desktop Source ───────────────────────────
  const BOOK_STYLES = [
    {
      g: "Classic",
      n: "Leather",
      dot: "#7a1f1f",
      note: "Full-grain leather, gold-foil frame, stitched border, marbled endpapers, ribbon.",
      cov: `${hl},${vig},var(--g1),var(--g2),linear-gradient(145deg,#7a1f1f,#3a0c0c)`,
      ink: "#e3c374",
      font: "Georgia,serif",
      tfx: "0 -1px 0 #000,0 1px 0 rgba(255,255,255,.28)",
      frame: 1,
      stitch: 1,
      hg: 1,
      r: 12,
      O: 14,
      th: 12,
      hard: 1,
      endp: marb("#8a1f2f", "#22436b"),
      rib: "#a3122a",
      ft: 1000,
      c1: "#1f1414",
      c2: "#0d0707"
    },
    {
      g: "Classic",
      n: "Linen Cloth",
      dot: "#27406f",
      note: "Woven linen over board with a pasted title label – classic library hardback.",
      cov: `${vig},repeating-linear-gradient(0deg,rgba(255,255,255,.08) 0 1px,transparent 1px 3px),repeating-linear-gradient(90deg,rgba(0,0,0,.16) 0 1px,transparent 1px 3px),linear-gradient(145deg,#2c4a80,#141f3c)`,
      ink: "#f0e6c8",
      font: "Georgia,serif",
      tfx: "none",
      label: 1,
      hg: 1,
      r: 4,
      O: 11,
      th: 12,
      hard: 1,
      endp: marb("#27406f", "#8a7a55"),
      rib: "#d9b24a",
      ft: 900,
      c1: "#141c2c",
      c2: "#0b0f1a"
    },
    {
      g: "Classic",
      n: "Walnut Wood",
      dot: "#7a4c25",
      note: "Carved walnut boards with grain, engraved title, brass corners.",
      cov: `linear-gradient(90deg,rgba(0,0,0,.28),transparent 12%),var(--gw),${vig},linear-gradient(90deg,#a06f3e,#6a4322)`,
      ink: "#2a1a0c",
      font: "Georgia,serif",
      tfx: "0 1px 0 rgba(255,225,175,.4),0 -1px 1px rgba(0,0,0,.75)",
      frame: 1,
      corner: brass,
      hg: 1,
      r: 6,
      O: 13,
      th: 14,
      hard: 1,
      endp: marb("#5b3517", "#8a7a55"),
      rib: "#1d5a3a",
      ft: 1100,
      c1: "#25180f",
      c2: "#140c07"
    },
    {
      g: "Classic",
      n: "Spiral Notebook",
      dot: "#2f6f8f",
      note: "Wire-o rings down the middle, frosted poly cover, smooth flip.",
      cov: `${vig},linear-gradient(145deg,#2b6cb0,#1a365d)`,
      ink: "#e2e8f0",
      font: "system-ui,-apple-system,sans-serif",
      tfx: "0 1px 2px rgba(0,0,0,.5)",
      rings: 1,
      r: 6,
      O: 8,
      th: 8,
      hard: 1,
      endp: "#e2e8f0",
      ft: 750,
      c1: "#1a202c",
      c2: "#0f172a"
    },
    {
      g: "Classic",
      n: "Elastic Notebook",
      dot: "#1c1c1f",
      note: "Pebbled black cover, red elastic band that drops off when opened, ribbon.",
      cov: `${vig},var(--gp),#1c1c1f`,
      ink: "#8a8a92",
      font: "Helvetica,Arial,sans-serif",
      tfx: "0 1px 0 rgba(255,255,255,.12),0 -1px 0 #000",
      hg: 1,
      band: 1,
      r: 10,
      O: 9,
      th: 10,
      hard: 1,
      endp: "#d9d2bf",
      rib: "#b0122b",
      ft: 800,
      c1: "#18181b",
      c2: "#09090b"
    },
    {
      g: "Classic",
      n: "Glossy Magazine",
      dot: "#ff2e6e",
      note: "Soft perfect-bound cover with gloss sheen and thin stock. Fast snap flip.",
      cov: "linear-gradient(115deg,rgba(255,255,255,.5),transparent 35%),linear-gradient(160deg,#ff2e6e,#ff9a3d)",
      ink: "#fff",
      font: "'Helvetica Neue',Arial,sans-serif",
      tfx: "0 2px 8px rgba(0,0,0,.35)",
      tt: 1,
      r: 3,
      O: 6,
      th: 6,
      hard: 1,
      endp: "#f8fafc",
      ft: 650,
      c1: "#2e0f22",
      c2: "#150610"
    },
    {
      g: "Classic",
      n: "Ledger",
      dot: "#3a1a1a",
      note: "Marbled boards, black cloth spine and corners. Old accounting book.",
      cov: `${vig},${marb("#3a1a1a", "#1d3a4a")}`,
      ink: "#111",
      font: "Georgia,serif",
      tfx: "none",
      label: 1,
      spine: ["repeating-linear-gradient(0deg,rgba(255,255,255,.07) 0 1px,transparent 1px 3px),#141414", "17%"],
      corner: "linear-gradient(135deg,#222,#050505)",
      hg: 1,
      r: 3,
      O: 12,
      th: 15,
      hard: 1,
      endp: marb("#3a1a1a", "#1d3a4a"),
      rib: "#a3122a",
      ft: 1000,
      c1: "#1f1816",
      c2: "#0f0b0a"
    },
    {
      g: "Luxury",
      lux: 1,
      n: "Black & Gold",
      dot: "#0a0a0a",
      note: "Matte soft-touch black, hot-stamped gold foil, shimmering title, gilded edges.",
      cov: `${vig},var(--gp),linear-gradient(145deg,#171717,#040404)`,
      foil: GOLD,
      bc: "#d4af37",
      st: "rgba(212,175,55,.7)",
      frame: 1,
      hg: 1,
      r: 10,
      O: 14,
      th: 14,
      hard: 1,
      gilt: 1,
      endp: "radial-gradient(circle,rgba(212,175,55,.5) 0 1.5px,transparent 2.5px) 0 0/18px 18px,#0c0c0c",
      rib: "#c79a2c",
      ft: 1050,
      c1: "#0b0b0f",
      c2: "#1a1a22"
    },
    {
      g: "Luxury",
      lux: 1,
      n: "Emerald Velvet",
      dot: "#0f5a45",
      note: "Deep emerald velvet, gold-thread stitching, brass corners, silk endpapers.",
      cov: `linear-gradient(115deg,rgba(255,255,255,.14),transparent 30%,rgba(255,255,255,.07) 62%,transparent),${vig},var(--gv),linear-gradient(145deg,#12664e,#052a20)`,
      foil: GOLD,
      bc: "#e8c76b",
      st: "rgba(232,199,107,.75)",
      stitch: 1,
      frame: 1,
      corner: brass,
      hg: 1,
      r: 8,
      O: 13,
      th: 13,
      hard: 1,
      gilt: 1,
      endp: "repeating-linear-gradient(60deg,#0b4a38 0 2px,#0f5a45 2px 4px)",
      rib: "#e8c76b",
      ft: 1000,
      c1: "#06281e",
      c2: "#021510"
    },
    {
      g: "Luxury",
      lux: 1,
      n: "Crocodile Cognac",
      dot: "#8a4a1c",
      note: "Hand-cut crocodile scales in cognac leather, gold corners and stitching.",
      cov: `${hl},${vig},var(--croc) 0 0/64px 48px,linear-gradient(145deg,#a5581f,#4a230a)`,
      foil: GOLD,
      bc: "#f0d78a",
      st: "rgba(240,215,138,.75)",
      stitch: 1,
      frame: 1,
      corner: brass,
      hg: 1,
      r: 12,
      O: 14,
      th: 14,
      hard: 1,
      gilt: 1,
      endp: "repeating-radial-gradient(ellipse at 25% 35%,#5a2c10 0 5px,#f0e2c0 5px 9px,#c9a45c 9px 13px,#f0e2c0 13px 17px)",
      rib: "#6a1420",
      ft: 1150,
      c1: "#251207",
      c2: "#120803"
    },
    {
      g: "Luxury",
      lux: 1,
      n: "Carrara Marble",
      dot: "#ecebe6",
      note: "Italian marble boards with veining, polished gold spine, art-deco endpaper.",
      cov: `${hl},var(--gm),linear-gradient(145deg,#fdfcf9,#dedbd3)`,
      foil: DGOLD,
      bc: "#a9801f",
      st: "rgba(169,128,31,.8)",
      frame: 1,
      spine: ["linear-gradient(90deg,#9a731f,#f7e08e 45%,#8a6a1a)", "15%"],
      corner: brass,
      hg: 1,
      r: 5,
      O: 14,
      th: 15,
      hard: 1,
      gilt: 1,
      endp: "radial-gradient(circle at 50% 100%,transparent 0 10px,#c9a24a 10px 11px,transparent 11px 20px,#c9a24a 20px 21px,transparent 21px) 0 0/40px 22px,#f7f1e1",
      rib: "#111",
      ft: 1100,
      c1: "#1e1e24",
      c2: "#121217"
    },
    {
      g: "Custom",
      custom: 1,
      n: "Your Own Cover",
      dot: "linear-gradient(135deg,#8b7bff,#ff7ac6)",
      note: "Upload your own front (and back) cover – it is wrapped on real hard boards with hinge, ribbon and page thickness.",
      hg: 1,
      r: 8,
      O: 13,
      th: 13,
      hard: 1,
      rib: "#c79a2c",
      ft: 1000,
      c1: "#171233",
      c2: "#0d0b1a"
    }
  ];

  const esc = (s: unknown) =>
    String(s || "").replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m] || m));

  const lum = (h: string) => {
    h = String(h || "#fff").replace("#", "");
    if (h.length === 3) h = h.replace(/./g, "$&$&");
    const v = parseInt(h, 16);
    return (0.299 * (v >> 16) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)) / 255;
  };

  const dk = (c: string) => `color-mix(in srgb,${c} 55%,black)`;
  const lt = (c: string) => `color-mix(in srgb,${c} 55%,white)`;
  const hex = (r: number, g: number, b: number) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");

  const cn = (c: string) =>
    ["0 0,100% 0,0 100%", "0 0,100% 0,100% 100%", "0 100%,100% 0,100% 100%", "0 0,100% 100%,0 100%"]
      .map((p, i) => `<i class="cn" style="background:${c};clip-path:polygon(${p});${i < 2 ? "top" : "bottom"}:0;${i % 2 ? "right" : "left"}:0"></i>`)
      .join("");

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
    } catch (_) {}
  };

  // ── Cover Generators ───────────────────────────────────────────────────────
  function ccover(s: any, f: number, cust: any) {
    const img = f ? cust.front : cust.back;
    const rad = f ? `3px ${s.r}px ${s.r}px 3px` : `${s.r}px 3px 3px ${s.r}px`;
    const bg = img
      ? `url(${img}) center/cover`
      : f
      ? "repeating-linear-gradient(45deg,#2a2545 0 12px,#332d55 12px 24px)"
      : `${vig},linear-gradient(145deg,${cust.col},${dk(cust.col)})`;
    const ov = (cust.gloss
      ? "linear-gradient(115deg,rgba(255,255,255,.5),rgba(255,255,255,.08) 30%,transparent 42%,rgba(255,255,255,.12) 70%,transparent)"
      : "var(--g1)") + "," + (f ? "linear-gradient(90deg,rgba(0,0,0,.4),transparent 9%)" : "linear-gradient(270deg,rgba(0,0,0,.4),transparent 9%)");
    return `<div class="paper cov ${f ? "cov-f" : "cov-b"} hg" style="background:${bg};border-radius:${rad}">${!img && f ? '<div class="ttl" style="color:#cfc8ff"><span>⬆</span><h2>Upload your cover</h2><span>USE THE STYLE PANEL</span></div>' : ""}<i class="glz" style="background:${ov};border-radius:${rad}"></i></div>`;
  }

  function cover(s: any, f: number, cust: any, title: string) {
    if (s.custom) return ccover(s, f, cust);
    const r = s.r, rad = f ? `3px ${r}px ${r}px 3px` : `${r}px 3px 3px ${r}px`;
    const t = s.lux
      ? (f ? `<div class="mono foil">S</div><h2 class="foil">${esc(title)}</h2><span class="foil">3D FLIPBOOK</span>` : `<div class="mono foil">S</div><span class="foil">SPELLENSE · MAISON</span>`)
      : (f ? `<span>❖</span><h2>${esc(title)}</h2><span>3D FLIPBOOK</span>` : `<span>❦</span><h2>Spellense</h2>`);
    const st = s.lux ? "" : `font-family:${s.font};color:${s.ink};text-shadow:${s.tfx};${s.tt ? "text-transform:uppercase;font-weight:900;" : ""}`;
    return `<div class="paper cov ${f ? "cov-f" : "cov-b"} ${s.hg ? "hg" : ""}" style="background:${s.cov};color:${s.ink || "inherit"};border-radius:${rad}">${s.spine ? `<i class="spn" style="${f ? "left" : "right"}:0;width:${s.spine[1]};background:${s.spine[0]}"></i>` : ""}${s.stitch ? '<i class="stitch"></i>' : ""}${s.frame ? `<i class="frame ${s.lux ? "lx" : ""}" ${s.lux ? "" : `style="border-color:${s.ink}"`}></i>` : ""}${s.corner ? cn(s.corner) : ""}<div class="ttl ${s.label ? "lbl" : ""} ${s.lux ? "lx" : ""}" style="${st}${s.spine && f ? "margin-left:14%" : ""}">${t}</div></div>`;
  }

  const endpOf = (s: any, cust: any) =>
    s.custom
      ? `repeating-linear-gradient(45deg,${cust.col} 0 2px,${lt(cust.col)} 2px 4px)`
      : s.endp;

  function pagesFor(s: any, pgs: string[], cust: any, title: string) {
    const hc = !s.nocov;
    const ep = hc && (s.endp || s.custom);
    const a: { h: string; hd?: number }[] = [];
    if (hc) {
      a.push({ h: cover(s, 1, cust, title), hd: 1 });
      if (ep) a.push({ h: `<div class="paper endp" style="background:${endpOf(s, cust)}"></div>`, hd: 1 });
    }
    pgs.forEach((u) => {
      a.push({ h: `<div class="paper pi"><img src="${u}" alt=""></div>` });
    });
    if ((a.length + (hc ? (ep ? 2 : 1) : 0)) % 2) {
      a.push({ h: '<div class="paper pi"></div>' });
    }
    if (hc) {
      if (ep) a.push({ h: `<div class="paper endp" style="background:${endpOf(s, cust)}"></div>`, hd: 1 });
      a.push({ h: cover(s, 0, cust, title), hd: 1 });
    }
    return a;
  }

  // ── Viewer Engine ──────────────────────────────────────────────────────────
  function Viewer(root: HTMLElement & { _off?: () => void; _pf?: any }, c: Record<string, unknown>) {
    if (root._off) root._off();
    if (root._pf && typeof root._pf.destroy === "function") {
      try { root._pf.destroy(); } catch (_) {}
      root._pf = null;
    }

    const cur = typeof c.theme === "number" ? Math.max(0, Math.min(BOOK_STYLES.length - 1, c.theme)) : 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s: any = BOOK_STYLES[cur] || BOOK_STYLES[0];
    const P = (c.pages as string[]) || [];
    const title = (c.title as string) || "Spellense Catalog";
    const cust = (c.cust as any) || { front: null, back: null, col: "#2a2545", auto: true, gloss: false };
    const img = c.bgType === "img" && c.bgImg;
    let snd = !!c.sound;
    let z = 1, au: number | ReturnType<typeof setInterval> = 0;
    let flip: any = null;
    let T = 0, port = false;
    let w = 0, h = 0, pw = 0;

    root.className = "fbv" + (c.full ? " full" : "");
    root.style.background = img
      ? "url(" + c.bgImg + ") center/cover"
      : c.bgType === "grad"
      ? "linear-gradient(135deg," + c.bg1 + "," + c.bg2 + ")"
      : (c.bg1 as string);
    root.style.color = img || lum(c.bg1 as string) < 0.5 ? "#fff" : "#0f172a";

    // Inject style root variables
    root.style.setProperty("--O", s.O + "px");
    root.style.setProperty("--e1", s.gilt ? GILT[0] : PAP[0]);
    root.style.setProperty("--e2", s.gilt ? GILT[1] : PAP[1]);
    root.style.setProperty("--st", s.st || "rgba(236,214,160,.7)");
    if (s.lux) {
      root.style.setProperty("--foil", s.foil);
      root.style.setProperty("--bc", s.bc);
    }

    let hHtml = img ? '<div class="ov" style="background:rgba(0,0,0,' + (c.dim || 0) + ')"></div>' : "";
    if (c.logo || c.desc) {
      hHtml +=
        '<div class="fbh' +
        (c.logoRight ? " rv" : "") +
        '">' +
        (c.logo ? '<img src="' + c.logo + '" alt="Logo">' : "<span></span>") +
        "<p>" + esc(c.desc) + "</p></div>";
    }

    hHtml +=
      '<div class="stage" id="stage">' +
      '<div id="wrap">' +
      '<div id="board"><i class="stk l"></i><i class="stk r"></i><i class="stk b"></i><i id="rib"></i></div>' +
      '<i id="rings"></i><i id="band"></i>' +
      '<div id="book"></div>' +
      '</div></div>' +
      '<div class="ct">' +
      '<button data-a="p" title="Previous page" aria-label="Previous page">‹</button>' +
      '<span class="pg">1 / 1</span>' +
      '<button data-a="n" title="Next page" aria-label="Next page">›</button>' +
      '<button data-a="t" title="Thumbnails" aria-label="Thumbnails">▦</button>' +
      '<button data-a="z" title="Zoom" aria-label="Zoom">＋</button>' +
      '<button data-a="s" title="Sound toggle" aria-label="Page-turn sound">' + (snd ? "🔊" : "🔈") + '</button>' +
      '<button data-a="a" title="Autoplay" aria-label="Auto-play">▶</button>' +
      '<button data-a="f" title="Fullscreen" aria-label="Fullscreen">⛶</button>' +
      '</div><div class="th" hidden></div>' +
      (c.credit ? '<a class="cr" href="https://spellense.com/flipbook" target="_blank" rel="noopener">Made with Spellense</a>' : "");

    root.innerHTML = hHtml;

    const stageEl = root.querySelector("#stage") as HTMLElement;
    const wrapEl = root.querySelector("#wrap") as HTMLElement;
    const boardEl = root.querySelector("#board") as HTMLElement;
    const ribEl = root.querySelector("#rib") as HTMLElement;
    const ringsEl = root.querySelector("#rings") as HTMLElement;
    const bandEl = root.querySelector("#band") as HTMLElement;
    const pgEl = root.querySelector(".pg") as HTMLElement;

    boardEl.style.background = s.nb
      ? "transparent"
      : s.custom
      ? `${vig},linear-gradient(145deg,${cust.col},${dk(cust.col)})`
      : (s.bb || s.cov);
    boardEl.style.boxShadow = s.nb ? "none" : "";
    ribEl.style.background = `linear-gradient(90deg,${s.rib || "#a3122a"},rgba(255,255,255,.4) 50%,${s.rib || "#a3122a"})`;

    const fit = () => {
      if (!flip || !wrapEl || !boardEl) return;
      const wr = wrapEl.getBoundingClientRect();
      let L = 1e9, Rr = -1e9, Tp = 1e9, B = -1e9;
      const bookEl = root.querySelector("#book");
      if (!bookEl) return;

      bookEl.querySelectorAll(".page").forEach((p) => {
        if (getComputedStyle(p).display === "none") return;
        const r = p.getBoundingClientRect();
        if (r.width < 5) return;
        L = Math.min(L, r.left);
        Rr = Math.max(Rr, r.right);
        Tp = Math.min(Tp, r.top);
        B = Math.max(B, r.bottom);
      });

      const O = s.O;
      const i = flip.getCurrentPageIndex();
      const fr = Math.min(1, i / Math.max(1, T - 1));
      const k = Math.min(1, 0.35 + T / 24);

      if (L > Rr) {
        if (w > 0 && h > 0) {
          const isCover = !s.nocov && i === 0;
          const isBack = !s.nocov && i >= T - 1;
          const bW = (isCover || isBack) ? pw + 2 * O : w + 2 * O;
          const bL = isCover ? pw - O : -O;
          Object.assign(boardEl.style, {
            left: bL + "px",
            top: -O + "px",
            width: bW + "px",
            height: h + 2 * O + "px"
          });
        }
        return;
      }

      Object.assign(boardEl.style, {
        left: L - wr.left - O + "px",
        top: Tp - wr.top - O + "px",
        width: Rr - L + 2 * O + "px",
        height: B - Tp + 2 * O + "px"
      });
      boardEl.style.setProperty("--wl", (1 + (s.th - 1) * fr * k) + "px");
      boardEl.style.setProperty("--wr", (1 + (s.th - 1) * (1 - fr) * k) + "px");

      ribEl.style.opacity = (i > 0 && i < T - 1 && !port && s.rib) ? "1" : "0";

      Object.assign(ringsEl.style, {
        display: s.rings ? "block" : "none",
        left: (L + Rr) / 2 - wr.left - 15 + "px",
        top: Tp - wr.top + 4 + "px",
        height: B - Tp - 8 + "px"
      });

      Object.assign(bandEl.style, {
        display: s.band ? "block" : "none",
        opacity: i === 0 ? "1" : "0",
        left: Rr - wr.left - 38 + "px",
        top: Tp - wr.top - O + "px",
        height: B - Tp + 2 * O + "px"
      });

      // Center front cover when closed, center back cover when closed
      if (!s.nocov && !port && pw > 0) {
        if (i === 0) {
          wrapEl.style.transform = `translateX(-${Math.round(pw / 2)}px)`;
        } else if (i >= T - 1) {
          wrapEl.style.transform = `translateX(${Math.round(pw / 2)}px)`;
        } else {
          wrapEl.style.transform = "translateX(0)";
        }
      } else {
        wrapEl.style.transform = "translateX(0)";
      }

      // Update page display badge
      if (pgEl) {
        if (!s.nocov && i === 0) {
          pgEl.textContent = "Cover";
        } else if (!s.nocov && i >= T - 1) {
          pgEl.textContent = "Back Cover";
        } else {
          pgEl.textContent = `${i + 1} / ${T}`;
        }
      }
    };

    const build = async () => {
      const clientW = stageEl.clientWidth || stageEl.parentElement?.clientWidth || (typeof window !== "undefined" ? window.innerWidth - 440 : 800);
      const isFull = !!c.full || (typeof document !== "undefined" && !!document.fullscreenElement);
      const clientH = stageEl.clientHeight || (typeof window !== "undefined" ? (isFull ? window.innerHeight - 100 : Math.min(window.innerHeight * 0.52, 520)) : 460);
      const W = Math.max(280, clientW - (isFull ? 24 : 32));
      const H = Math.max(260, clientH - (isFull ? 16 : 24));
      const A = (c.ratio as number) || 0.714;
      let w: number, h: number;
      port = W < 520;
      if (port) {
        h = Math.min(H, W / A) * z;
        w = h * A;
      } else {
        h = Math.min(H, W / (2 * A)) * z;
        w = 2 * h * A;
      }

      wrapEl.style.width = Math.round(w) + "px";
      wrapEl.style.height = Math.round(h) + "px";
      const pw = Math.round(port ? w : w / 2);

      if (flip) {
        try { flip.destroy(); } catch (_) {}
        flip = null;
      }

      const oldBook = root.querySelector("#book");
      if (oldBook) oldBook.remove();

      const bk = document.createElement("div");
      bk.id = "book";
      wrapEl.appendChild(bk);

      const pg = pagesFor(s, P, cust, title);
      T = pg.length;

      const els = pg.map((p) => {
        const d = document.createElement("div");
        d.className = "page";
        if (s.hard && p.hd) d.dataset.density = "hard";
        d.innerHTML = p.h;
        return d;
      });

      try {
        const mod = await import("page-flip") as any;
        const PageFlipClass = mod.PageFlip || mod.default?.PageFlip || mod.default;
        if (!PageFlipClass) return;

        flip = new PageFlipClass(bk, {
          width: pw,
          height: Math.round(h),
          size: "stretch",
          minWidth: Math.round(pw * 0.6),
          maxWidth: 2400,
          minHeight: 200,
          maxHeight: 2200,
          showCover: s.showCover !== false,
          flippingTime: s.ft || 800,
          maxShadowOpacity: 0.6,
          drawShadow: true,
          usePortrait: true,
          mobileScrollSupport: false,
          autoSize: true,
        });

        root._pf = flip;
        flip.loadFromHTML(els);

        flip.on("flip", () => {
          if (snd) playPageSound();
          setTimeout(fit, 80);
        });

        flip.on("changeState", (e: any) => {
          if (e.data === "read") setTimeout(fit, 40);
        });

        flip.on("init", () => {
          setTimeout(fit, 50);
        });

        setTimeout(fit, 100);
        setTimeout(fit, 350);
        setTimeout(fit, 900);
      } catch (err) {
        console.warn("PageFlip build error:", err);
      }
    };

    build();

    const ro = new ResizeObserver(() => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        if (P.length && stageEl.clientWidth > 50) fit();
      }, 100);
    });
    ro.observe(stageEl);

    const key = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && /INPUT|TEXTAREA|SELECT/.test(el.tagName)) return;
      if (e.key === "ArrowRight") {
        if (flip) {
          try {
            if (flip.getState() === "read") flip.flipNext("bottom");
            else flip.turnToNextPage();
          } catch (_) { flip.turnToNextPage(); }
        }
      }
      if (e.key === "ArrowLeft") {
        if (flip) {
          try {
            if (flip.getState() === "read") flip.flipPrev("bottom");
            else flip.turnToPrevPage();
          } catch (_) { flip.turnToPrevPage(); }
        }
      }
    };

    let rt: any;
    const onResize = () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        if (P.length) build();
      }, 250);
    };

    window.addEventListener("resize", onResize);
    addEventListener("keydown", key);
    document.addEventListener("fullscreenchange", () => setTimeout(build, 100));

    root._off = () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
      removeEventListener("keydown", key);
      clearInterval(au as number);
      if (flip) {
        try { flip.destroy(); } catch (_) {}
        flip = null;
        root._pf = null;
      }
    };

    // Viewer Bottom Controls Handlers
    (root.querySelector(".ct") as HTMLElement).onclick = (e) => {
      const b = (e.target as HTMLElement).closest("button") as HTMLButtonElement | null;
      if (!b) return;
      const a = b.dataset.a;
      if (a === "p") {
        if (flip) {
          try {
            if (flip.getState() === "read") flip.flipPrev("bottom");
            else flip.turnToPrevPage();
          } catch (_) { flip.turnToPrevPage(); }
        }
      }
      if (a === "n") {
        if (flip) {
          try {
            if (flip.getState() === "read") flip.flipNext("bottom");
            else flip.turnToNextPage();
          } catch (_) { flip.turnToNextPage(); }
        }
      }
      if (a === "z") {
        z = z >= 1.6 ? 1 : z + 0.3;
        build();
      }
      if (a === "s") {
        snd = !snd;
        b.textContent = snd ? "🔊" : "🔈";
        const snEl = document.getElementById("sn") as HTMLInputElement | null;
        if (snEl) snEl.checked = snd;
        if (snd) playPageSound();
      }
      if (a === "f") {
        document.fullscreenElement ? document.exitFullscreen() : root.requestFullscreen && root.requestFullscreen();
      }
      if (a === "a") {
        if (au) {
          clearInterval(au as number);
          au = 0;
          b.textContent = "▶";
        } else {
          b.textContent = "⏸";
          au = setInterval(() => {
            if (flip) {
              if (flip.getCurrentPageIndex() >= flip.getPageCount() - 1) {
                flip.turnToPage(0);
              } else {
                try {
                  if (flip.getState() === "read") flip.flipNext("bottom");
                  else flip.turnToNextPage();
                } catch (_) { flip.turnToNextPage(); }
              }
            }
          }, 3200);
        }
      }
      if (a === "t") {
        const thEl = root.querySelector(".th") as HTMLElement;
        if (!thEl.innerHTML) {
          thEl.innerHTML = P.map((u, idx) => `<img data-i="${idx}" src="${u}" alt="Page ${idx + 1}">`).join("");
        }
        thEl.hidden = !thEl.hidden;
      }
    };

    (root.querySelector(".th") as HTMLElement).onclick = (e) => {
      const i = (e.target as HTMLElement).dataset.i;
      if (i == null || !flip) return;
      const idx = Number(i);
      try { flip.turnToPage(s.nocov ? idx : idx + 1); } catch (_) {}
    };
  }

  // ── App State & Settings ───────────────────────────────────────────────────
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

  const loadSaved = () => {
    try { return JSON.parse(localStorage.spFbKit || "{}"); } catch (_) { return {}; }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const S: Record<string, any> = Object.assign(
    {
      theme: 0,
      title: "Spellense Catalog",
      logo: "",
      desc: "",
      logoRight: false,
      credit: false,
      bgType: "grad",
      bg1: "#0d0b1a",
      bg2: "#171233",
      bgImg: "",
      dim: 0.35,
      sound: false,
      mode: "keep",
      cust: { front: null, back: null, col: "#2a2545", auto: true, gloss: false },
    },
    loadSaved()
  );

  if (typeof S.theme !== "number" || S.theme < 0 || S.theme >= BOOK_STYLES.length) {
    S.theme = 0;
  }

  let RAW: string[] = [], pages: string[] = [], ratio = 0.714, tmr = 0;
  let LC: string[] = [];

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

  async function coverFrom(file: File): Promise<{ u: string; col: string }> {
    const im = await li(await readURL(file));
    const k = Math.min(1, 1000 / Math.max(im.width, im.height));
    const c = document.createElement("canvas");
    c.width = Math.round(im.width * k);
    c.height = Math.round(im.height * k);
    c.getContext("2d")!.drawImage(im, 0, 0, c.width, c.height);
    const s = document.createElement("canvas");
    s.width = s.height = 1;
    const x = s.getContext("2d")!;
    x.drawImage(im, 0, 0, 1, 1);
    const d = x.getImageData(0, 0, 1, 1).data;
    return { u: c.toDataURL("image/jpeg", 0.9), col: hex(d[0], d[1], d[2]) };
  }

  const readURL = (f: File): Promise<string> =>
    new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result as string); fr.readAsDataURL(f); });

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
          status("Loading PDF engine…");
          const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
          pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
          const arrayBuffer = await f.arrayBuffer();
          const loadingTask = pdfjs.getDocument({
            data: new Uint8Array(arrayBuffer),
            cMapUrl: "/cmaps/",
            cMapPacked: true,
            standardFontDataUrl: "/standard_fonts/",
          });
          const pdf = await loadingTask.promise;
          S.title = f.name.replace(/\.[^.]+$/, "").slice(0, 36);
          for (let i = 1; i <= pdf.numPages; i++) {
            status(`Converting page ${i} of ${pdf.numPages}…`);
            try {
              const p = await pdf.getPage(i);
              const v1 = p.getViewport({ scale: 1 });
              const w = v1.width / v1.height > 1.15 ? 1800 : 1000;
              const vp = p.getViewport({ scale: w / v1.width });
              const c = document.createElement("canvas");
              c.width = vp.width;
              c.height = vp.height;
              const ctx = c.getContext("2d");
              if (ctx) {
                await p.render({ canvas: c, canvasContext: ctx, viewport: vp }).promise;
                RAW.push(c.toDataURL("image/jpeg", 0.85));
              }
            } catch (pageErr) {
              console.warn("Failed rendering page " + i, pageErr);
            }
          }
        } else if (f.type.startsWith("image/")) {
          S.title = f.name.replace(/\.[^.]+$/, "").slice(0, 36);
          RAW.push(await f2u(f, 1600, "image/jpeg", 0.88));
        }
      }
      if (!RAW.length) throw new Error("Could not extract pages from file");
      getEl("ed").hidden = false;
      getEl("ex").hidden = false;
      if (await derive()) {
        status("Ready. " + pages.length + " pages loaded.");
        getEl("ed").scrollIntoView({ behavior: "smooth" });
        show();
      }
    } catch (err) {
      console.error("Flipbook loadFiles error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      status("Could not read file (" + msg + "). Use a valid PDF, JPG, PNG or WebP.");
    }
  }

  // ── Demo Catalog Generator ─────────────────────────────────────────────────
  async function loadSampleCatalog() {
    status("Generating demo catalog pages…");
    const W = 600, H = 840;
    const cols = [
      ["#5b4bff", "#ff7ac6"],
      ["#0ea5e9", "#22d3ee"],
      ["#f97316", "#facc15"],
      ["#10b981", "#84cc16"],
      ["#ec4899", "#8b5cf6"],
      ["#14b8a6", "#3b82f6"],
      ["#f43f5e", "#fb923c"],
      ["#6366f1", "#06b6d4"]
    ];
    const ti = ["Welcome", "New Arrivals", "Bestsellers", "Studio Picks", "Colour Story", "Materials", "Care Guide", "Contact"];

    RAW = ti.map((t, i) => {
      const c = document.createElement("canvas");
      c.width = W; c.height = H;
      const x = c.getContext("2d")!;
      const g = x.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, cols[i][0]);
      g.addColorStop(1, cols[i][1]);
      x.fillStyle = "#fffdf8";
      x.fillRect(0, 0, W, H);
      x.fillStyle = g;
      x.fillRect(0, 0, W, 16);
      x.fillRect(40, 300, W - 80, 300);
      x.fillStyle = "#1c1640";
      x.font = "bold 110px system-ui";
      x.fillText(String(i + 1).padStart(2, "0"), 40, 200);
      x.font = "bold 46px system-ui";
      x.fillText(t, 40, 270);
      x.font = "20px system-ui";
      x.globalAlpha = 0.6;
      x.fillText("Spellense Demo Catalog", 40, H - 48);
      return c.toDataURL("image/jpeg", 0.9);
    });

    S.title = "Demo Catalog";
    S.desc = "Spellense Editorial 2026\nDesigned with 3D Flipbook Studio";
    getEl("ed").hidden = false;
    getEl("ex").hidden = false;
    if (await derive()) {
      status("Demo catalog loaded. Click styles below to customize!");
      getEl("ed").scrollIntoView({ behavior: "smooth" });
      show();
    }
  }
  (window as unknown as Record<string, unknown>)["loadSampleCatalog"] = loadSampleCatalog;

  async function derive(): Promise<boolean> {
    let wide = false;
    for (const u of RAW) {
      const i = await li(u);
      if (i.width / i.height > 1.15) wide = true;
    }
    if (wide && S.mode === "ask") {
      getEl("ask").hidden = false;
    } else {
      getEl("ask").hidden = true;
    }
    const out: string[] = [];
    for (const u of RAW) {
      const i = await li(u);
      const isWide = i.width / i.height > 1.15;
      if (S.mode === "split" && isWide) {
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
    pages = out;
    if (out.length) {
      const first = await li(out[0]);
      ratio = first.width / first.height;
    }
    show();
    return true;
  }

  function show() {
    clearTimeout(tmr);
    tmr = setTimeout(() => {
      if (!pages.length) return;
      Viewer(getEl("pv") as HTMLElement & { _off?: () => void }, Object.assign({}, S, { pages, ratio }));
      try { localStorage.spFbKit = JSON.stringify(S); } catch (_) {}
    }, 100) as unknown as number;
  }

  function sync() {
    const curStyle = BOOK_STYLES[S.theme] || BOOK_STYLES[0];
    (getEl("bt") as HTMLInputElement).value = S.title || "";
    (getEl("ds") as HTMLTextAreaElement).value = S.desc || "";
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
    (getEl("sn") as HTMLInputElement).checked = S.sound;

    // Update style buttons state
    document.querySelectorAll(".ftc").forEach((b) => {
      const idx = +(b as HTMLElement).dataset.t!;
      b.classList.toggle("fon", idx === S.theme);
    });

    // Update Style Note
    const noteEl = document.getElementById("note");
    if (noteEl) noteEl.textContent = curStyle.note;

    // Custom cover panel visibility
    const cpanel = document.getElementById("cpanel");
    if (cpanel) cpanel.hidden = !curStyle.custom;

    // Custom cover thumbnails
    const thF = document.getElementById("thF");
    const uFx = document.getElementById("uFx");
    if (thF) {
      if (S.cust.front) {
        thF.style.backgroundImage = `url(${S.cust.front})`;
        thF.innerHTML = "";
        if (uFx) uFx.classList.remove("hidden");
      } else {
        thF.style.backgroundImage = "none";
        thF.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`;
        if (uFx) uFx.classList.add("hidden");
      }
    }

    const thB = document.getElementById("thB");
    const uBx = document.getElementById("uBx");
    if (thB) {
      if (S.cust.back) {
        thB.style.backgroundImage = `url(${S.cust.back})`;
        thB.innerHTML = "";
        if (uBx) uBx.classList.remove("hidden");
      } else {
        thB.style.backgroundImage = "none";
        thB.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`;
        if (uBx) uBx.classList.add("hidden");
      }
    }

    (getEl("col") as HTMLInputElement).value = S.cust.col || "#2a2545";
    const cpanelAuto = document.getElementById("cpanel-auto");
    if (cpanelAuto) cpanelAuto.textContent = S.cust.auto ? "Auto-extracted from cover" : "Custom selected color";

    document.querySelectorAll("input[name=fin]").forEach((r) => {
      (r as HTMLInputElement).checked = (r as HTMLInputElement).value === (S.cust.gloss ? "gloss" : "matte");
    });

    // Logo status
    const lgStatus = document.getElementById("lg-status");
    const lgThumb = document.getElementById("lg-thumb") as HTMLImageElement | null;
    if (lgStatus) lgStatus.classList.toggle("hidden", !S.logo);
    if (lgThumb && S.logo) lgThumb.src = S.logo;

    const lpUploadBox = document.getElementById("lp-upload-box");
    if (lpUploadBox) lpUploadBox.classList.toggle("hidden", !!S.logo);
    const lpStatus = document.getElementById("lp-status");
    if (lpStatus) lpStatus.classList.toggle("hidden", !S.logo);
    const lp = document.getElementById("lp");
    if (lp) lp.hidden = !LC.length || !S.logo;

    // Backdrop photo status
    const biStatus = document.getElementById("bi-status");
    if (biStatus) biStatus.classList.toggle("hidden", !S.bgImg);
  }

  // ── Render 12 Style Cards Grouped by Classic, Luxury, Custom ───────────────
  function renderStyleCards() {
    const tg = getEl("tg");
    if (!tg) return;

    const groups: { [k: string]: { s: typeof BOOK_STYLES[0]; idx: number }[] } = {};
    BOOK_STYLES.forEach((s, idx) => {
      if (!groups[s.g]) groups[s.g] = [];
      groups[s.g].push({ s, idx });
    });

    let html = "";
    Object.entries(groups).forEach(([groupName, items]) => {
      html += `
        <div class="ft-section">
          <div class="ft-header">
            <span>${groupName === "Classic" ? "Classic Editions" : groupName === "Luxury" ? "Luxury Editions" : "Custom Edition"}</span>
            <span class="text-[10px] text-slate-400">(${items.length})</span>
          </div>
          <div class="ftg">
            ${items.map(({ s, idx }) => `
              <button type="button" class="ftc${idx === S.theme ? " fon" : ""}" data-t="${idx}">
                <i style="background:${s.dot}"></i>
                <span>${s.n}</span>
              </button>
            `).join("")}
          </div>
        </div>
      `;
    });

    tg.innerHTML = html;
  }
  renderStyleCards();

  getEl("pal").innerHTML = PAL.map(
    (p, i) => `<button data-i="${i}" title="${p[0]}" style="background:linear-gradient(135deg,${p[1]},${p[2]})"></button>`
  ).join("");

  // ── Style Selection Listener ───────────────────────────────────────────────
  getEl("tg").onclick = (e: Event) => {
    const b = (e.target as HTMLElement).closest(".ftc") as HTMLButtonElement | null;
    if (!b) return;
    const idx = +b.dataset.t!;
    const st = BOOK_STYLES[idx];
    S.theme = idx;
    // Update default backdrop palette to match style if not user touched
    if (st.c1 && st.c2) {
      S.bg1 = st.c1;
      S.bg2 = st.c2;
      S.bgType = "grad";
    }
    sync();
    show();
  };

  getEl("pal").onclick = (e: Event) => {
    const b = (e.target as HTMLElement).closest("button") as HTMLButtonElement | null;
    if (!b) return;
    const p = PAL[+b.dataset.i!];
    Object.assign(S, { bg1: p[1], bg2: p[2], bgType: "grad", bgImg: "" });
    sync();
    show();
  };

  // ── Tab Navigation ─────────────────────────────────────────────────────────
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

  const bind = (id: string, fn: (el: HTMLElement) => void, ev = "input") => {
    const el = getEl(id);
    if (el) el.addEventListener(ev, () => { fn(el); show(); });
  };

  bind("bt", (e) => { S.title = (e as HTMLInputElement).value; });
  bind("ds", (e) => { S.desc = (e as HTMLTextAreaElement).value; });
  bind("lr", (e) => { S.logoRight = (e as HTMLInputElement).checked; }, "change");
  bind("cr", (e) => { S.credit = (e as HTMLInputElement).checked; }, "change");
  bind("sn", (e) => { S.sound = (e as HTMLInputElement).checked; }, "change");
  bind("dm", (e) => { S.dim = +(e as HTMLInputElement).value; });
  bind("c1", (e) => {
    S.bg1 = (e as HTMLInputElement).value;
    if (S.bgType === "img") S.bgType = "grad";
    const c1Val = document.getElementById("c1-val");
    if (c1Val) c1Val.textContent = S.bg1.toUpperCase();
  });
  bind("c2", (e) => {
    S.bg2 = (e as HTMLInputElement).value;
    const c2Val = document.getElementById("c2-val");
    if (c2Val) c2Val.textContent = S.bg2.toUpperCase();
  });
  bind("gr", (e) => { S.bgType = (e as HTMLInputElement).checked ? "grad" : "color"; }, "change");

  getEl("md").addEventListener("change", (e: Event) => {
    S.mode = (e.target as HTMLSelectElement).value;
    derive();
  });

  // ── Custom Cover Controls ──────────────────────────────────────────────────
  getEl("uF").onclick = () => getEl("fF").click();
  getEl("uB").onclick = () => getEl("fB").click();

  getEl("fF").onchange = async (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    const res = await coverFrom(f);
    S.cust.front = res.u;
    if (S.cust.auto) {
      S.cust.col = res.col;
      (getEl("col") as HTMLInputElement).value = res.col;
    }
    sync();
    show();
  };

  getEl("fB").onchange = async (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    const res = await coverFrom(f);
    S.cust.back = res.u;
    sync();
    show();
  };

  getEl("uFx").onclick = () => {
    S.cust.front = null;
    (getEl("fF") as HTMLInputElement).value = "";
    sync();
    show();
  };

  getEl("uBx").onclick = () => {
    S.cust.back = null;
    (getEl("fB") as HTMLInputElement).value = "";
    sync();
    show();
  };

  getEl("col").onchange = (e: Event) => {
    S.cust.col = (e.target as HTMLInputElement).value;
    S.cust.auto = false;
    sync();
    show();
  };

  document.querySelectorAll("input[name=fin]").forEach((r) => {
    r.addEventListener("change", () => {
      S.cust.gloss = (r as HTMLInputElement).value === "gloss";
      show();
    });
  });

  getEl("cpanel-sample").onclick = () => {
    const W = 600, H = 840;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const x = c.getContext("2d")!;
    const g = x.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#1e3a8a");
    g.addColorStop(1, "#7c3aed");
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
    x.strokeStyle = "#f7e08e";
    x.lineWidth = 4;
    x.strokeRect(40, 40, W - 80, H - 80);
    x.fillStyle = "#f7e08e";
    x.textAlign = "center";
    x.font = "bold 64px Georgia";
    x.fillText("SPELLENSE", W / 2, H / 2 - 30);
    x.fillText("LOOKBOOK", W / 2, H / 2 + 50);
    x.font = "22px Georgia";
    x.fillText("— 2026 EDITION —", W / 2, H / 2 + 110);
    S.cust.front = c.toDataURL("image/jpeg", 0.9);
    S.cust.col = "#3b2fa6";
    S.cust.auto = false;
    sync();
    show();
  };

  // ── Brand Logo & Palette ───────────────────────────────────────────────────
  const handleLogoFile = async (f: File | undefined) => {
    if (!f) return;
    S.logo = await f2u(f, 320, "image/png", 1);
    await logoPal(S.logo);
    sync();
    show();
  };

  getEl("lg").addEventListener("change", (e: Event) => {
    handleLogoFile((e.target as HTMLInputElement).files?.[0]);
  });
  const lgBackdrop = document.getElementById("lg-backdrop");
  if (lgBackdrop) {
    lgBackdrop.addEventListener("change", (e: Event) => {
      handleLogoFile((e.target as HTMLInputElement).files?.[0]);
    });
  }
  const lgBackdropChange = document.getElementById("lg-backdrop-change");
  if (lgBackdropChange) {
    lgBackdropChange.addEventListener("change", (e: Event) => {
      handleLogoFile((e.target as HTMLInputElement).files?.[0]);
    });
  }

  const removeLogo = () => {
    S.logo = "";
    LC = [];
    const lp = document.getElementById("lp");
    if (lp) { lp.innerHTML = ""; lp.hidden = true; }
    const lpStatus = document.getElementById("lp-status");
    if (lpStatus) lpStatus.classList.add("hidden");
    const lpUploadBox = document.getElementById("lp-upload-box");
    if (lpUploadBox) lpUploadBox.classList.remove("hidden");
    const lgStatus = document.getElementById("lg-status");
    if (lgStatus) lgStatus.classList.add("hidden");
    (getEl("lg") as HTMLInputElement).value = "";
    const lgB = document.getElementById("lg-backdrop") as HTMLInputElement | null;
    if (lgB) lgB.value = "";
    const lgBC = document.getElementById("lg-backdrop-change") as HTMLInputElement | null;
    if (lgBC) lgBC.value = "";
    sync();
    show();
  };
  getEl("lgx").onclick = removeLogo;
  const lpx = document.getElementById("lpx");
  if (lpx) lpx.onclick = removeLogo;

  async function logoPal(u: string) {
    const i = await li(u);
    const c = document.createElement("canvas");
    c.width = c.height = 24;
    c.height = 24;
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
    const lp = document.getElementById("lp");
    if (lp) {
      lp.innerHTML = cols.map((h: string) => `<button data-h="${h}" title="${h}" style="background:${h}"></button>`).join("");
      lp.hidden = !cols.length;
    }
    const lpUploadBox = document.getElementById("lp-upload-box");
    if (lpUploadBox) lpUploadBox.classList.toggle("hidden", !!S.logo);
    const lpStatus = document.getElementById("lp-status");
    if (lpStatus) lpStatus.classList.toggle("hidden", !S.logo);
  }

  getEl("lp").onclick = (e: Event) => {
    const b = (e.target as HTMLElement).closest("button") as HTMLButtonElement | null;
    if (!b) return;
    Object.assign(S, { bg1: b.dataset.h, bg2: b.dataset.h, bgType: "color", bgImg: "" });
    sync(); show();
  };

  // ── Backdrop Scenic Photo ──────────────────────────────────────────────────
  getEl("bi").addEventListener("change", async (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    S.bgImg = await f2u(f, 1400, "image/jpeg", 0.8);
    S.bgType = "img";
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
      sync();
      show();
    } catch (_) {}
  };

  // ── Brand Kit Export / Import ──────────────────────────────────────────────
  getEl("ke").onclick = () => dl("spellense-brand-kit.json", JSON.stringify(S), "application/json");

  getEl("ki").addEventListener("change", async (e: Event) => {
    try {
      const text = await (e.target as HTMLInputElement).files![0].text();
      Object.assign(S, JSON.parse(text));
      sync(); show();
    } catch (_) { alert("That file is not a valid brand kit."); }
  });

  function dl(name: string, data: string, type: string) {
    const blob = new Blob([data], { type: `${type};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 4000);
  }

  // ── Standalone Offline HTML Generator ──────────────────────────────────────
  function buildHTML(): string {
    const cfg = JSON.stringify(Object.assign({}, S, { pages, ratio, full: true })).replace(/</g, "\\u003c");
    const t = (S.title || S.desc || "Flipbook").split("\n")[0].slice(0, 60);

    const standaloneViewerCode = `
      var BOOK_STYLES = ${JSON.stringify(BOOK_STYLES)};
      var G1 = ${JSON.stringify(G1)};
      var G2 = ${JSON.stringify(G2)};
      var GW = ${JSON.stringify(GW)};
      var GP = ${JSON.stringify(GP)};
      var GV = ${JSON.stringify(GV)};
      var GM = ${JSON.stringify(GM)};
      var croc = ${JSON.stringify(croc)};
      var vig = ${JSON.stringify(vig)};
      var hl = ${JSON.stringify(hl)};
      var brass = ${JSON.stringify(brass)};
      var GOLD = ${JSON.stringify(GOLD)};
      var DGOLD = ${JSON.stringify(DGOLD)};
      var PAP = ${JSON.stringify(PAP)};
      var GILT = ${JSON.stringify(GILT)};

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
      function dk(c) { return "color-mix(in srgb," + c + " 55%,black)"; }
      function lt(c) { return "color-mix(in srgb," + c + " 55%,white)"; }
      function cn(c) {
        return ["0 0,100% 0,0 100%", "0 0,100% 0,100% 100%", "0 100%,100% 0,100% 100%", "0 0,100% 100%,0 100%"]
          .map(function(p, i) { return '<i class="cn" style="background:' + c + ';clip-path:polygon(' + p + ');' + (i < 2 ? 'top' : 'bottom') + ':0;' + (i % 2 ? 'right' : 'left') + ':0"></i>'; })
          .join("");
      }
      function ccover(s, f, cust) {
        var img = f ? cust.front : cust.back;
        var rad = f ? "3px " + s.r + "px " + s.r + "px 3px" : s.r + "px 3px 3px " + s.r + "px";
        var bg = img ? "url(" + img + ") center/cover" : (f ? "repeating-linear-gradient(45deg,#2a2545 0 12px,#332d55 12px 24px)" : vig + ",linear-gradient(145deg," + cust.col + "," + dk(cust.col) + ")");
        var ov = (cust.gloss ? "linear-gradient(115deg,rgba(255,255,255,.5),rgba(255,255,255,.08) 30%,transparent 42%,rgba(255,255,255,.12) 70%,transparent)" : "var(--g1)") + "," + (f ? "linear-gradient(90deg,rgba(0,0,0,.4),transparent 9%)" : "linear-gradient(270deg,rgba(0,0,0,.4),transparent 9%)");
        return '<div class="paper cov ' + (f ? 'cov-f' : 'cov-b') + ' hg" style="background:' + bg + ';border-radius:' + rad + '">' + (!img && f ? '<div class="ttl" style="color:#cfc8ff"><span>⬆</span><h2>Upload your cover</h2></div>' : '') + '<i class="glz" style="background:' + ov + ';border-radius:' + rad + '"></i></div>';
      }
      function cover(s, f, cust, title) {
        if (s.custom) return ccover(s, f, cust);
        var r = s.r, rad = f ? "3px " + r + "px " + r + "px 3px" : r + "px 3px 3px " + r + "px";
        var t = s.lux
          ? (f ? '<div class="mono foil">S</div><h2 class="foil">' + esc(title) + '</h2><span class="foil">3D FLIPBOOK</span>' : '<div class="mono foil">S</div><span class="foil">SPELLENSE · MAISON</span>')
          : (f ? '<span>❖</span><h2>' + esc(title) + '</h2><span>3D FLIPBOOK</span>' : '<span>❦</span><h2>Spellense</h2>');
        var st = s.lux ? '' : 'font-family:' + s.font + ';color:' + s.ink + ';text-shadow:' + s.tfx + ';' + (s.tt ? 'text-transform:uppercase;font-weight:900;' : '');
        return '<div class="paper cov ' + (f ? 'cov-f' : 'cov-b') + ' ' + (s.hg ? 'hg' : '') + '" style="background:' + s.cov + ';color:' + (s.ink || 'inherit') + ';border-radius:' + rad + '">' + (s.spine ? '<i class="spn" style="' + (f ? 'left' : 'right') + ':0;width:' + s.spine[1] + ';background:' + s.spine[0] + '"></i>' : '') + (s.stitch ? '<i class="stitch"></i>' : '') + (s.frame ? '<i class="frame ' + (s.lux ? 'lx' : '') + '" ' + (s.lux ? '' : 'style="border-color:' + s.ink + '"') + '></i>' : '') + (s.corner ? cn(s.corner) : '') + '<div class="ttl ' + (s.label ? 'lbl' : '') + ' ' + (s.lux ? 'lx' : '') + '" style="' + st + (s.spine && f ? 'margin-left:14%' : '') + '">' + t + '</div></div>';
      }
      function endpOf(s, cust) {
        return s.custom ? "repeating-linear-gradient(45deg," + cust.col + " 0 2px," + lt(cust.col) + " 2px 4px)" : s.endp;
      }
      function pagesFor(s, pgs, cust, title) {
        var hc = !s.nocov, ep = hc && (s.endp || s.custom), a = [];
        if (hc) {
          a.push({ h: cover(s, 1, cust, title), hd: 1 });
          if (ep) a.push({ h: '<div class="paper endp" style="background:' + endpOf(s, cust) + '"></div>', hd: 1 });
        }
        pgs.forEach(function(u) { a.push({ h: '<div class="paper pi"><img src="' + u + '" alt=""></div>' }); });
        if ((a.length + (hc ? (ep ? 2 : 1) : 0)) % 2) a.push({ h: '<div class="paper pi"></div>' });
        if (hc) {
          if (ep) a.push({ h: '<div class="paper endp" style="background:' + endpOf(s, cust) + '"></div>', hd: 1 });
          a.push({ h: cover(s, 0, cust, title), hd: 1 });
        }
        return a;
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
        var cur = typeof c.theme === "number" ? Math.max(0, Math.min(BOOK_STYLES.length - 1, c.theme)) : 0;
        var s = BOOK_STYLES[cur] || BOOK_STYLES[0];
        var P = c.pages || [];
        var title = c.title || "Spellense Catalog";
        var cust = c.cust || { front: null, back: null, col: "#2a2545", auto: true, gloss: false };
        var img = c.bgType === "img" && c.bgImg;
        var snd = !!c.sound, z = 1, au = 0, flip = null, T = 0, port = false, pw = 0, curH = 0;

        root.className = "fbv" + (c.full ? " full" : "");
        root.style.background = img ? "url(" + c.bgImg + ") center/cover" : c.bgType === "grad" ? "linear-gradient(135deg," + c.bg1 + "," + c.bg2 + ")" : c.bg1;
        root.style.color = img || lum(c.bg1) < 0.5 ? "#fff" : "#0f172a";

        root.style.setProperty("--O", s.O + "px");
        root.style.setProperty("--e1", s.gilt ? GILT[0] : PAP[0]);
        root.style.setProperty("--e2", s.gilt ? GILT[1] : PAP[1]);
        root.style.setProperty("--st", s.st || "rgba(236,214,160,.7)");
        if (s.lux) { root.style.setProperty("--foil", s.foil); root.style.setProperty("--bc", s.bc); }

        var h = img ? '<div class="ov" style="background:rgba(0,0,0,' + (c.dim || 0) + ')"></div>' : "";
        if (c.logo || c.desc) {
          h += '<div class="fbh' + (c.logoRight ? ' rv' : '') + '">' + (c.logo ? '<img src="' + c.logo + '" alt="Logo">' : '<span></span>') + '<p>' + esc(c.desc) + '</p></div>';
        }
        h += '<div class="stage" id="stage"><div id="wrap"><div id="board"><i class="stk l"></i><i class="stk r"></i><i class="stk b"></i><i id="rib"></i></div><i id="rings"></i><i id="band"></i><div id="book"></div></div></div>' +
             '<div class="ct"><button data-a="p" title="Previous page">‹</button><span class="pg">1 / 1</span><button data-a="n" title="Next page">›</button><button data-a="t" title="Thumbnails">▦</button><button data-a="z" title="Zoom">＋</button><button data-a="s" title="Sound toggle">' + (snd ? '🔊' : '🔈') + '</button><button data-a="a" title="Autoplay">▶</button><button data-a="f" title="Fullscreen">⛶</button></div><div class="th" hidden></div>' +
             (c.credit ? '<a class="cr" href="https://spellense.com/flipbook" target="_blank" rel="noopener">Made with Spellense</a>' : '');
        root.innerHTML = h;

        var stageEl = root.querySelector("#stage");
        var wrapEl = root.querySelector("#wrap");
        var boardEl = root.querySelector("#board");
        var ribEl = root.querySelector("#rib");
        var ringsEl = root.querySelector("#rings");
        var bandEl = root.querySelector("#band");
        var pgEl = root.querySelector(".pg");

        boardEl.style.background = s.nb ? "transparent" : s.custom ? (vig + ",linear-gradient(145deg," + cust.col + "," + dk(cust.col) + ")") : (s.bb || s.cov);
        boardEl.style.boxShadow = s.nb ? "none" : "";
        ribEl.style.background = "linear-gradient(90deg," + (s.rib || "#a3122a") + ",rgba(255,255,255,.4) 50%," + (s.rib || "#a3122a") + ")";

        function fit() {
          if (!flip || !wrapEl || !boardEl) return;
          var wr = wrapEl.getBoundingClientRect();
          var L = 1e9, Rr = -1e9, Tp = 1e9, B = -1e9;
          var bookEl = root.querySelector("#book");
          if (!bookEl) return;
          bookEl.querySelectorAll(".page").forEach(function(p) {
            if (getComputedStyle(p).display === "none") return;
            var r = p.getBoundingClientRect();
            if (r.width < 5) return;
            L = Math.min(L, r.left); Rr = Math.max(Rr, r.right); Tp = Math.min(Tp, r.top); B = Math.max(B, r.bottom);
          });
          var O = s.O;
          if (L > Rr || Rr === -1e9) {
            if (!s.nocov && !port && pw > 0) {
              var bW = pw + 2 * O;
              Object.assign(boardEl.style, {
                left: ((wr.width - bW) / 2) + "px",
                top: -O + "px",
                width: bW + "px",
                height: (curH + 2 * O) + "px"
              });
            }
            return;
          }
          var i = flip.getCurrentPageIndex(), fr = Math.min(1, i / Math.max(1, T - 1)), k = Math.min(1, 0.35 + T / 24);
          Object.assign(boardEl.style, {
            left: L - wr.left - O + "px",
            top: Tp - wr.top - O + "px",
            width: Rr - L + 2 * O + "px",
            height: B - Tp + 2 * O + "px"
          });
          boardEl.style.setProperty("--wl", (1 + (s.th - 1) * fr * k) + "px");
          boardEl.style.setProperty("--wr", (1 + (s.th - 1) * (1 - fr) * k) + "px");
          ribEl.style.opacity = (i > 0 && i < T - 1 && !port && s.rib) ? "1" : "0";
          Object.assign(ringsEl.style, {
            display: s.rings ? "block" : "none",
            left: (L + Rr) / 2 - wr.left - 15 + "px",
            top: Tp - wr.top + 4 + "px",
            height: B - Tp - 8 + "px"
          });
          Object.assign(bandEl.style, {
            display: s.band ? "block" : "none",
            opacity: i === 0 ? "1" : "0",
            left: Rr - wr.left - 38 + "px",
            top: Tp - wr.top - O + "px",
            height: B - Tp + 2 * O + "px"
          });
          if (!s.nocov && !port && pw > 0) {
            if (i === 0) wrapEl.style.transform = "translateX(-" + Math.round(pw / 2) + "px)";
            else if (i >= T - 1) wrapEl.style.transform = "translateX(" + Math.round(pw / 2) + "px)";
            else wrapEl.style.transform = "translateX(0)";
          } else {
            wrapEl.style.transform = "translateX(0)";
          }
          if (pgEl) {
            if (!s.nocov && i === 0) pgEl.textContent = "Cover";
            else if (!s.nocov && i >= T - 1) pgEl.textContent = "Back Cover";
            else pgEl.textContent = (i + 1) + " / " + T;
          }
        }

        function build() {
          var clientW = stageEl.clientWidth || (typeof window !== "undefined" && window.innerWidth ? window.innerWidth : 800);
          var isFull = !!c.full || (typeof document !== "undefined" && !!document.fullscreenElement);
          var clientH = stageEl.clientHeight || (typeof window !== "undefined" ? (isFull ? window.innerHeight - 100 : Math.min(window.innerHeight * 0.78, 880)) : 650);
          var W = Math.max(280, clientW - (isFull ? 24 : 36)), H = Math.max(280, clientH - (isFull ? 16 : 32));
          var A = c.ratio || 0.714, w, h;
          port = W < 520;
          if (port) { h = Math.min(H, W / A) * z; w = h * A; }
          else { h = Math.min(H, W / (2 * A)) * z; w = 2 * h * A; }
          curH = Math.round(h);
          wrapEl.style.width = Math.round(w) + "px";
          wrapEl.style.height = Math.round(h) + "px";
          pw = Math.round(port ? w : w / 2);

          if (flip) { try { flip.destroy(); } catch (_) {} flip = null; }
          var oldBook = root.querySelector("#book");
          if (oldBook) oldBook.remove();
          var bk = document.createElement("div");
          bk.id = "book";
          wrapEl.appendChild(bk);

          var pg = pagesFor(s, P, cust, title);
          T = pg.length;
          var els = pg.map(function(p) {
            var d = document.createElement("div");
            d.className = "page";
            if (s.hard && p.hd) d.dataset.density = "hard";
            d.innerHTML = p.h;
            return d;
          });

          var PageFlipClass = (window.St && window.St.PageFlip) || window.PageFlip;
          if (!PageFlipClass) return;

          flip = new PageFlipClass(bk, {
            width: pw,
            height: Math.round(h),
            size: "stretch",
            minWidth: Math.round(pw * 0.6),
            maxWidth: 2400,
            minHeight: 200,
            maxHeight: 2200,
            showCover: s.showCover !== false,
            flippingTime: s.ft || 800,
            maxShadowOpacity: 0.6,
            drawShadow: true,
            usePortrait: true,
            mobileScrollSupport: false,
            autoSize: true,
          });

          flip.loadFromHTML(els);
          flip.on("flip", function() {
            if (snd) playPageSound();
            setTimeout(fit, 80);
          });
          flip.on("changeState", function(e) {
            if (e.data === "read") setTimeout(fit, 40);
          });
          flip.on("init", function() {
            setTimeout(fit, 50);
          });
          setTimeout(fit, 100);
          setTimeout(fit, 350);
          setTimeout(fit, 900);
        }

        build();

        var rt;
        window.addEventListener("resize", function() {
          clearTimeout(rt);
          rt = setTimeout(function() { if (P.length) build(); }, 250);
        });

        window.addEventListener("keydown", function(e) {
          if (e.key === "ArrowRight" && flip) {
            try { if (flip.getState() === "read") flip.flipNext("bottom"); else flip.turnToNextPage(); } catch (_) { flip.turnToNextPage(); }
          }
          if (e.key === "ArrowLeft" && flip) {
            try { if (flip.getState() === "read") flip.flipPrev("bottom"); else flip.turnToPrevPage(); } catch (_) { flip.turnToPrevPage(); }
          }
        });

        root.querySelector(".ct").onclick = function(e) {
          var b = e.target.closest("button");
          if (!b) return;
          var a = b.dataset.a;
          if (a === "p" && flip) {
            try { if (flip.getState() === "read") flip.flipPrev("bottom"); else flip.turnToPrevPage(); } catch (_) { flip.turnToPrevPage(); }
          }
          if (a === "n" && flip) {
            try { if (flip.getState() === "read") flip.flipNext("bottom"); else flip.turnToNextPage(); } catch (_) { flip.turnToNextPage(); }
          }
          if (a === "z") { z = z >= 1.6 ? 1 : z + 0.3; build(); }
          if (a === "s") { snd = !snd; b.textContent = snd ? "🔊" : "🔈"; if (snd) playPageSound(); }
          if (a === "f") { document.fullscreenElement ? document.exitFullscreen() : root.requestFullscreen && root.requestFullscreen(); }
          if (a === "a") {
            if (au) { clearInterval(au); au = 0; b.textContent = "▶"; }
            else {
              b.textContent = "⏸";
              au = setInterval(function() {
                if (flip) {
                  if (flip.getCurrentPageIndex() >= flip.getPageCount() - 1) flip.turnToPage(0);
                  else {
                    try { if (flip.getState() === "read") flip.flipNext("bottom"); else flip.turnToNextPage(); } catch (_) { flip.turnToNextPage(); }
                  }
                }
              }, 3200);
            }
          }
          if (a === "t") {
            var thEl = root.querySelector(".th");
            if (!thEl.innerHTML) {
              thEl.innerHTML = P.map(function(u, idx) { return '<img data-i="' + idx + '" src="' + u + '">'; }).join("");
            }
            thEl.hidden = !thEl.hidden;
          }
        };

        root.querySelector(".th").onclick = function(e) {
          var i = e.target.dataset.i;
          if (i == null || !flip) return;
          try { flip.turnToPage(s.nocov ? Number(i) : Number(i) + 1); } catch (_) {}
        };
      }
    `;

    const closeScript = "</" + "script>";
    return (
      "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\"><title>" +
      esc(t) +
      "</title><style>html,body{margin:0;background:#0d0b1a;font-family:Inter,system-ui,-apple-system,sans-serif}</style><style>" +
      VCSS +
      "</style></head><body><div id=\"r\"></div>" +
      "<script>" + (pfSourceCache || "/* page-flip library */") + closeScript +
      (pfSourceCache ? "" : "<script src=\"https://cdn.jsdelivr.net/npm/page-flip@2.0.7/dist/js/page-flip.browser.js\">" + closeScript) +
      "<script>" +
      standaloneViewerCode +
      "\n;Viewer(document.getElementById('r')," +
      cfg +
      ");if(/autoplay=1/.test(location.search)){var b=document.querySelector('[data-a=a]');b&&b.click()}\n" +
      closeScript +
      "</body></html>"
    );
  }

  getEl("dl").onclick = async () => {
    if (!pages || pages.length === 0) {
      alert("Please upload a PDF or images first.");
      return;
    }
    const dlBtn = getEl("dl");
    const origHtml = dlBtn.innerHTML;
    dlBtn.textContent = "Generating Offline HTML...";
    (dlBtn as HTMLButtonElement).disabled = true;

    try {
      if (!pfSourceCache) {
        try {
          const res = await fetch("/page-flip.browser.js");
          if (res.ok) pfSourceCache = await res.text();
        } catch (_) {}
      }
      const html = buildHTML();
      const docName = (S.title || "flipbook").trim().replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase() || "flipbook";
      dl(`${docName}.html`, html, "text/html");
      dlBtn.textContent = "✓ Downloaded!";
      setTimeout(() => {
        dlBtn.innerHTML = origHtml;
        (dlBtn as HTMLButtonElement).disabled = false;
      }, 2500);
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to generate offline HTML. Please try again.");
      dlBtn.innerHTML = origHtml;
      (dlBtn as HTMLButtonElement).disabled = false;
    }
  };

  getEl("pvw").onclick = async () => {
    if (!pages || pages.length === 0) {
      alert("Please upload a PDF or images first.");
      return;
    }
    try {
      if (!pfSourceCache) {
        try {
          const res = await fetch("/page-flip.browser.js");
          if (res.ok) pfSourceCache = await res.text();
        } catch (_) {}
      }
      const html = buildHTML();
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      if (!win) {
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          if (document.body.contains(a)) document.body.removeChild(a);
        }, 1000);
      }
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60000);
    } catch (err) {
      console.error("Preview error:", err);
      alert("Could not open preview. Please allow popups for Spellense.");
    }
  };

  getEl("nw").onclick = () => {
    RAW = [];
    pages = [];
    getEl("ed").hidden = true;
    getEl("ex").hidden = true;
    getEl("pv").innerHTML = "";
    const stEl = document.getElementById("st");
    if (stEl) stEl.textContent = "";
    (getEl("fi") as HTMLInputElement).value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Dropzone & Uploads ─────────────────────────────────────────────────────
  const dz = getEl("drop");
  dz.onclick = () => getEl("fi").click();
  dz.onkeydown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); getEl("fi").click(); }
  };

  getEl("fi").addEventListener("change", (e: Event) => {
    const input = e.target as HTMLInputElement;
    loadFiles(input.files);
    input.value = "";
  });
  dz.addEventListener("dragover", (e: Event) => { e.preventDefault(); });
  dz.addEventListener("dragleave", () => {});
  dz.addEventListener("drop", (e: Event) => {
    e.preventDefault();
    loadFiles((e as DragEvent).dataTransfer?.files || null);
  });

  // ── Spread Dialog ──────────────────────────────────────────────────────────
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

  // ── Embed Code Generator ───────────────────────────────────────────────────
  function fallbackCopyText(text: string, cb: () => void) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand("copy");
      cb();
    } catch (_) {
      alert("Please copy the code manually from the box.");
    }
    document.body.removeChild(ta);
  }

  function emb() {
    const defaultUrl = typeof window !== "undefined" ? window.location.origin + "/flipbook" : "https://spellense.com/flipbook";
    const userUrl = (document.getElementById("eu") as HTMLInputElement)?.value.trim();
    const u = (userUrl || defaultUrl) +
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
    const code = el ? el.textContent || "" : "";
    if (!code) return;
    const btn = getEl("ec");
    const prev = btn.textContent;
    const onSuccess = () => {
      btn.textContent = "✓ Copied to clipboard!";
      setTimeout(() => { btn.textContent = prev; }, 2000);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(onSuccess).catch(() => {
        fallbackCopyText(code, onSuccess);
      });
    } else {
      fallbackCopyText(code, onSuccess);
    }
  };

  sync();
  if (S.logo) logoPal(S.logo);
}
