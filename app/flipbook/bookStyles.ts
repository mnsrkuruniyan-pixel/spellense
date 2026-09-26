export interface FlipPage {
  id: string;
  dataUrl: string;
  width: number;
  height: number;
  pageNum: number;
}

export type BookStyleId = "hardcover" | "magazine" | "vintage" | "minimal";
export type StageBgId = "dark-studio" | "wood-desk" | "gallery-light" | "midnight-navy";

export interface BookStyleOption {
  id: BookStyleId;
  name: string;
  badge: string;
  desc: string;
  coverDensity: "hard" | "soft";
  shadowOpacity: number;
  pageFilter: string;
  spineEffect: string;
}

export interface StageBgOption {
  id: StageBgId;
  name: string;
  bgStyle: string;
  theme: "dark" | "light";
}

export const BOOK_STYLES: BookStyleOption[] = [
  {
    id: "hardcover",
    name: "Hardcover Book",
    badge: "Realistic",
    desc: "Stiff front & back covers, deep spine crease, realistic multi-page edge shadows.",
    coverDensity: "hard",
    shadowOpacity: 0.55,
    pageFilter: "none",
    spineEffect: "rgba(0, 0, 0, 0.25)",
  },
  {
    id: "magazine",
    name: "Glossy Magazine",
    badge: "Soft Cover",
    desc: "Soft flexible covers, smooth glossy sheen, lightweight paper peel.",
    coverDensity: "soft",
    shadowOpacity: 0.38,
    pageFilter: "contrast(1.03) brightness(1.01)",
    spineEffect: "rgba(0, 0, 0, 0.15)",
  },
  {
    id: "vintage",
    name: "Vintage Parchment",
    badge: "Aged Tone",
    desc: "Warm antique sepia tones, aged paper edge darkening, classical library feel.",
    coverDensity: "hard",
    shadowOpacity: 0.5,
    pageFilter: "sepia(20%) brightness(97%) contrast(102%)",
    spineEffect: "rgba(67, 20, 7, 0.3)",
  },
  {
    id: "minimal",
    name: "Modern Portfolio",
    badge: "Clean",
    desc: "Crisp architectural presentation, borderless, neutral ambient lighting.",
    coverDensity: "hard",
    shadowOpacity: 0.28,
    pageFilter: "none",
    spineEffect: "rgba(0, 0, 0, 0.12)",
  },
];

export const STAGE_BACKGROUNDS: StageBgOption[] = [
  {
    id: "dark-studio",
    name: "Dark Studio",
    bgStyle: "radial-gradient(circle at center, #1e293b 0%, #090d16 100%)",
    theme: "dark",
  },
  {
    id: "wood-desk",
    name: "Warm Wood Desk",
    bgStyle: "radial-gradient(circle at center, #451a03 0%, #1a0800 100%)",
    theme: "dark",
  },
  {
    id: "gallery-light",
    name: "Gallery Light",
    bgStyle: "radial-gradient(circle at center, #f8fafc 0%, #cbd5e1 100%)",
    theme: "light",
  },
  {
    id: "midnight-navy",
    name: "Midnight Navy",
    bgStyle: "radial-gradient(circle at center, #0f172a 0%, #020617 100%)",
    theme: "dark",
  },
];

// Clean 4-page universal sample document for quick test
export function generateSampleDocumentPages(): FlipPage[] {
  const pages: FlipPage[] = [];
  const W = 900;
  const H = 1200;

  const configs = [
    {
      bg: "#0f172a",
      isCover: true,
      title: "ANNUAL REPORT",
      subtitle: "EXECUTIVE SUMMARY & PERFORMANCE",
      tag: "SAMPLE DOCUMENT",
      body: "A clean multi-page document layout to preview draggable 3D page turning, binding styles, and offline export.",
      footer: "SPELLENSE 3D DIGITAL FLIPBOOK",
    },
    {
      bg: "#ffffff",
      isCover: false,
      title: "OVERVIEW & METRICS",
      subtitle: "KEY OPERATIONAL HIGHLIGHTS",
      tag: "SECTION 01",
      body: "• Zero-Storage Architecture: 100% In-Browser Privacy\n• High-Fidelity Rendering: Canvas & WebGL Physics\n• Responsive Multi-Device Reading (Desktop & Mobile)\n• Instant Offline HTML & ZIP Web Package Export",
      footer: "PAGE 02 / 04",
    },
    {
      bg: "#f8fafc",
      isCover: false,
      title: "DESIGN & SPECIFICATIONS",
      subtitle: "TYPOGRAPHIC RIGOR & PRE-FLIGHT QA",
      tag: "SECTION 02",
      body: "Interactive page turning allows readers to grab and peel corners naturally. Switch between Hardcover, Magazine, and Vintage styles in real time to suit your publication.",
      footer: "PAGE 03 / 04",
    },
    {
      bg: "#0f172a",
      isCover: true,
      title: "DOCUMENT CONCLUDED",
      subtitle: "READY FOR PUBLICATION",
      tag: "BACK COVER",
      body: "Replace this sample with your own multi-page PDF or image files anytime using the 'Upload File' button.",
      footer: "PAGE 04 / 04 • BACK COVER",
    },
  ];

  configs.forEach((cfg, idx) => {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = cfg.bg;
    ctx.fillRect(0, 0, W, H);

    if (cfg.isCover) {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, "rgba(59, 130, 246, 0.2)");
      grad.addColorStop(1, "rgba(99, 102, 241, 0.15)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.strokeStyle = cfg.isCover ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.08)";
    ctx.lineWidth = 2;
    ctx.strokeRect(48, 48, W - 96, H - 96);

    ctx.fillStyle = cfg.isCover ? "#60a5fa" : "#2563eb";
    ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(cfg.tag, 90, 130);

    ctx.fillStyle = cfg.isCover ? "#ffffff" : "#0f172a";
    ctx.font = "bold 52px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(cfg.title, 90, 240);

    ctx.fillStyle = cfg.isCover ? "#94a3b8" : "#64748b";
    ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(cfg.subtitle, 90, 300);

    ctx.fillStyle = cfg.isCover ? "#38bdf8" : "#2563eb";
    ctx.fillRect(90, 335, 140, 4);

    ctx.fillStyle = cfg.isCover ? "#cbd5e1" : "#334155";
    ctx.font = "normal 26px -apple-system, BlinkMacSystemFont, sans-serif";
    const lines = cfg.body.split("\n");
    let y = 430;
    for (const line of lines) {
      ctx.fillText(line, 90, y);
      y += 50;
    }

    ctx.fillStyle = cfg.isCover ? "#64748b" : "#94a3b8";
    ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(cfg.footer, 90, H - 90);

    pages.push({
      id: `sample-${idx + 1}`,
      dataUrl: canvas.toDataURL("image/jpeg", 0.95),
      width: W,
      height: H,
      pageNum: idx + 1,
    });
  });

  return pages;
}
