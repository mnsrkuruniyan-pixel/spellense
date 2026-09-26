export interface FlipPage {
  id: string;
  dataUrl: string;
  width: number;
  height: number;
  pageNum: number;
}

export type BookStyleId =
  | "hardcover"
  | "magazine"
  | "vintage"
  | "minimal"
  | "comic"
  | "spiral"
  | "leather"
  | "newsprint"
  | "cyber-dark"
  | "soft-paperback";

export type StageBgId =
  | "dark-studio"
  | "wood-desk"
  | "nordic-wood"
  | "library-ambience"
  | "emerald-velvet"
  | "gallery-light"
  | "pure-white"
  | "midnight-navy";

export interface BookStyleOption {
  id: BookStyleId;
  name: string;
  badge: string;
  desc: string;
  coverDensity: "hard" | "soft";
  shadowOpacity: number;
  pageFilter: string;
  spineType: "crease" | "glossy" | "vintage-stitch" | "spiral" | "clean" | "heavy-crease";
  pageShadowClass: string;
}

export interface StageBgOption {
  id: StageBgId;
  name: string;
  desc: string;
  bgStyle: string;
  theme: "dark" | "light";
}

export const BOOK_STYLES: BookStyleOption[] = [
  {
    id: "hardcover",
    name: "Classic Hardcover",
    badge: "Most Popular",
    desc: "Stiff front & back covers, deep center spine crease, multi-page edge thickness shadows.",
    coverDensity: "hard",
    shadowOpacity: 0.55,
    pageFilter: "none",
    spineType: "heavy-crease",
    pageShadowClass: "shadow-2xl",
  },
  {
    id: "magazine",
    name: "Glossy Magazine",
    badge: "Editorial",
    desc: "Soft flexible covers, smooth glossy sheen, lightweight page curl with subtle gloss crease.",
    coverDensity: "soft",
    shadowOpacity: 0.38,
    pageFilter: "contrast(1.03) brightness(1.01)",
    spineType: "glossy",
    pageShadowClass: "shadow-lg",
  },
  {
    id: "vintage",
    name: "Vintage Parchment",
    badge: "Aged Tone",
    desc: "Warm antique sepia tones, aged paper edge darkening, classical library feel with stitched fold.",
    coverDensity: "hard",
    shadowOpacity: 0.52,
    pageFilter: "sepia(22%) brightness(97%) contrast(102%)",
    spineType: "vintage-stitch",
    pageShadowClass: "shadow-2xl",
  },
  {
    id: "minimal",
    name: "Modern Portfolio",
    badge: "Clean & Sleek",
    desc: "Crisp architectural presentation, borderless, neutral ambient lighting with flat clean fold.",
    coverDensity: "hard",
    shadowOpacity: 0.28,
    pageFilter: "none",
    spineType: "clean",
    pageShadowClass: "shadow-md",
  },
  {
    id: "comic",
    name: "Graphic Comic",
    badge: "High Contrast",
    desc: "Punchy vibrant colors, enhanced ink saturation, bold dynamic fold shadow for comics & art books.",
    coverDensity: "soft",
    shadowOpacity: 0.45,
    pageFilter: "contrast(1.1) saturate(1.15)",
    spineType: "crease",
    pageShadowClass: "shadow-xl",
  },
  {
    id: "spiral",
    name: "Spiral Notebook",
    badge: "Coil Bound",
    desc: "Wire-O metallic coil binding look with clean notebook paper edge alignment and flat turning.",
    coverDensity: "hard",
    shadowOpacity: 0.35,
    pageFilter: "none",
    spineType: "spiral",
    pageShadowClass: "shadow-lg",
  },
  {
    id: "leather",
    name: "Leatherbound Folio",
    badge: "Premium Luxury",
    desc: "Rich archival folio with burnished edges, deep multi-layered shadows and warm golden paper tone.",
    coverDensity: "hard",
    shadowOpacity: 0.6,
    pageFilter: "sepia(12%) brightness(98%) contrast(104%)",
    spineType: "heavy-crease",
    pageShadowClass: "shadow-2xl",
  },
  {
    id: "newsprint",
    name: "Broadsheet Newsprint",
    badge: "Matte Paper",
    desc: "Authentic lightweight newsprint paper texture, muted ink saturation, and soft center fold.",
    coverDensity: "soft",
    shadowOpacity: 0.32,
    pageFilter: "sepia(8%) contrast(96%) brightness(97%)",
    spineType: "crease",
    pageShadowClass: "shadow-md",
  },
  {
    id: "cyber-dark",
    name: "Cyberpunk Blueprint",
    badge: "Dark Mode HUD",
    desc: "High-contrast technical dark finish with crisp cyan telemetry edge shadows for specs & catalogs.",
    coverDensity: "hard",
    shadowOpacity: 0.4,
    pageFilter: "contrast(1.12) brightness(1.02)",
    spineType: "clean",
    pageShadowClass: "shadow-cyan-900/20 shadow-2xl",
  },
  {
    id: "soft-paperback",
    name: "Pocket Paperback",
    badge: "Novel Book",
    desc: "Standard everyday paperback with flexible paper hinge, natural warm white tone and relaxed flip.",
    coverDensity: "soft",
    shadowOpacity: 0.42,
    pageFilter: "contrast(1.01)",
    spineType: "crease",
    pageShadowClass: "shadow-lg",
  },
];

export const STAGE_BACKGROUNDS: StageBgOption[] = [
  {
    id: "dark-studio",
    name: "Dark Studio",
    desc: "High-contrast deep midnight slate",
    bgStyle: "radial-gradient(circle at center, #1e293b 0%, #090d16 100%)",
    theme: "dark",
  },
  {
    id: "wood-desk",
    name: "Warm Mahogany Desk",
    desc: "Rich executive mahogany wood grain",
    bgStyle: "radial-gradient(circle at center, #451a03 0%, #1a0800 100%)",
    theme: "dark",
  },
  {
    id: "nordic-wood",
    name: "Nordic Birch Wood",
    desc: "Warm light Scandinavian desk wood",
    bgStyle: "linear-gradient(135deg, #d4a373 0%, #a97142 50%, #8b5a2b 100%)",
    theme: "dark",
  },
  {
    id: "library-ambience",
    name: "Cozy Library",
    desc: "Deep ambient purple & dark mahogany",
    bgStyle: "radial-gradient(circle at center, #2e1065 0%, #090314 100%)",
    theme: "dark",
  },
  {
    id: "emerald-velvet",
    name: "Royal Emerald",
    desc: "Luxurious deep velvet green",
    bgStyle: "radial-gradient(circle at center, #064e3b 0%, #022c22 100%)",
    theme: "dark",
  },
  {
    id: "gallery-light",
    name: "Gallery Light",
    desc: "Minimalist soft architectural grey",
    bgStyle: "radial-gradient(circle at center, #f8fafc 0%, #cbd5e1 100%)",
    theme: "light",
  },
  {
    id: "pure-white",
    name: "Presentation White",
    desc: "Crisp neutral white for embedding",
    bgStyle: "#ffffff",
    theme: "light",
  },
  {
    id: "midnight-navy",
    name: "Midnight Navy",
    desc: "Classic dark cobalt & obsidian",
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
      body: "Interactive page turning allows readers to grab and peel corners naturally. Switch between Hardcover, Magazine, Vintage, Comic, Spiral, and Leather styles in real time.",
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
