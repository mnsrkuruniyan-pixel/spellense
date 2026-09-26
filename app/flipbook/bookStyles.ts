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
  | "soft-paperback"
  | "blueprint"
  | "photo-album"
  | "gold-deluxe"
  | "eco-kraft"
  | "board-book"
  | "manga"
  | "catalog"
  | "moleskine"
  | "pastel"
  | "noir";

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
  icon: string;
  coverDensity: "hard" | "soft";
  shadowOpacity: number;
  pageFilter: string;
  spineType: "crease" | "glossy" | "vintage-stitch" | "spiral" | "clean" | "heavy-crease";
  swatchBg: string;
  swatchBorder?: string;
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
    name: "Hardcover",
    badge: "Realistic",
    desc: "Stiff front & back covers, deep center spine crease, multi-page edge thickness shadows.",
    icon: "📖",
    coverDensity: "hard",
    shadowOpacity: 0.55,
    pageFilter: "none",
    spineType: "heavy-crease",
    swatchBg: "linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)",
    swatchBorder: "border-blue-400/30",
  },
  {
    id: "magazine",
    name: "Magazine",
    badge: "Glossy",
    desc: "Soft flexible covers, smooth glossy sheen, lightweight page curl with subtle gloss crease.",
    icon: "📰",
    coverDensity: "soft",
    shadowOpacity: 0.38,
    pageFilter: "contrast(1.03) brightness(1.01)",
    spineType: "glossy",
    swatchBg: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
    swatchBorder: "border-slate-300",
  },
  {
    id: "vintage",
    name: "Vintage",
    badge: "Parchment",
    desc: "Warm antique sepia tones, aged paper edge darkening, classical library feel with stitched fold.",
    icon: "📜",
    coverDensity: "hard",
    shadowOpacity: 0.52,
    pageFilter: "sepia(22%) brightness(97%) contrast(102%)",
    spineType: "vintage-stitch",
    swatchBg: "linear-gradient(135deg, #fef3c7 0%, #d97706 100%)",
    swatchBorder: "border-amber-700/40",
  },
  {
    id: "minimal",
    name: "Portfolio",
    badge: "Clean",
    desc: "Crisp architectural presentation, borderless, neutral ambient lighting with flat clean fold.",
    icon: "📐",
    coverDensity: "hard",
    shadowOpacity: 0.28,
    pageFilter: "none",
    spineType: "clean",
    swatchBg: "linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)",
    swatchBorder: "border-slate-200",
  },
  {
    id: "comic",
    name: "Comic",
    badge: "Vibrant",
    desc: "Punchy vibrant colors, enhanced ink saturation, bold dynamic fold shadow for comics & art books.",
    icon: "💥",
    coverDensity: "soft",
    shadowOpacity: 0.45,
    pageFilter: "contrast(1.1) saturate(1.15)",
    spineType: "crease",
    swatchBg: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
    swatchBorder: "border-yellow-400/50",
  },
  {
    id: "spiral",
    name: "Spiral",
    badge: "Wire-O",
    desc: "Wire-O metallic coil binding look with clean notebook paper edge alignment and flat turning.",
    icon: "🌀",
    coverDensity: "hard",
    shadowOpacity: 0.35,
    pageFilter: "none",
    spineType: "spiral",
    swatchBg: "linear-gradient(135deg, #e0f2fe 0%, #94a3b8 100%)",
    swatchBorder: "border-sky-300",
  },
  {
    id: "leather",
    name: "Leather",
    badge: "Luxury",
    desc: "Rich archival folio with burnished edges, deep multi-layered shadows and warm golden paper tone.",
    icon: "🏛️",
    coverDensity: "hard",
    shadowOpacity: 0.6,
    pageFilter: "sepia(12%) brightness(98%) contrast(104%)",
    spineType: "heavy-crease",
    swatchBg: "linear-gradient(135deg, #451a03 0%, #290e02 100%)",
    swatchBorder: "border-amber-500/40",
  },
  {
    id: "newsprint",
    name: "Newsprint",
    badge: "Matte",
    desc: "Authentic lightweight newsprint paper texture, muted ink saturation, and soft center fold.",
    icon: "🗞️",
    coverDensity: "soft",
    shadowOpacity: 0.32,
    pageFilter: "sepia(8%) contrast(96%) brightness(97%)",
    spineType: "crease",
    swatchBg: "linear-gradient(135deg, #e5e5e5 0%, #a3a3a3 100%)",
    swatchBorder: "border-neutral-400",
  },
  {
    id: "cyber-dark",
    name: "Cyberpunk",
    badge: "Dark Mode",
    desc: "High-contrast technical dark finish with crisp cyan telemetry edge shadows for specs & catalogs.",
    icon: "⚡",
    coverDensity: "hard",
    shadowOpacity: 0.4,
    pageFilter: "contrast(1.12) brightness(1.02)",
    spineType: "clean",
    swatchBg: "linear-gradient(135deg, #042f2e 0%, #020617 100%)",
    swatchBorder: "border-cyan-400/50",
  },
  {
    id: "soft-paperback",
    name: "Paperback",
    badge: "Pocket",
    desc: "Standard everyday paperback with flexible paper hinge, natural warm white tone and relaxed flip.",
    icon: "📕",
    coverDensity: "soft",
    shadowOpacity: 0.42,
    pageFilter: "contrast(1.01)",
    spineType: "crease",
    swatchBg: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
    swatchBorder: "border-amber-200",
  },
  {
    id: "blueprint",
    name: "Blueprint",
    badge: "Drafting",
    desc: "Architectural blueprint style with crisp technical contrast and cyan fold highlights.",
    icon: "📐",
    coverDensity: "hard",
    shadowOpacity: 0.45,
    pageFilter: "contrast(1.08) hue-rotate(185deg) brightness(0.98)",
    spineType: "clean",
    swatchBg: "linear-gradient(135deg, #0284c7 0%, #075985 100%)",
    swatchBorder: "border-cyan-300/40",
  },
  {
    id: "photo-album",
    name: "Album",
    badge: "Heavy Board",
    desc: "Heavy matte black scrapbook backing with thick luxury cardstock page feel.",
    icon: "🖼️",
    coverDensity: "hard",
    shadowOpacity: 0.62,
    pageFilter: "contrast(1.04)",
    spineType: "heavy-crease",
    swatchBg: "linear-gradient(135deg, #27272a 0%, #09090b 100%)",
    swatchBorder: "border-neutral-600",
  },
  {
    id: "gold-deluxe",
    name: "Gold Foil",
    badge: "Executive",
    desc: "Radiant luxury gold foil border shimmer with executive velvet crease depth.",
    icon: "✨",
    coverDensity: "hard",
    shadowOpacity: 0.58,
    pageFilter: "contrast(1.02) brightness(1.01)",
    spineType: "heavy-crease",
    swatchBg: "linear-gradient(135deg, #78350f 0%, #d97706 100%)",
    swatchBorder: "border-amber-300",
  },
  {
    id: "eco-kraft",
    name: "Eco Kraft",
    badge: "Organic",
    desc: "Warm recycled unbleached kraft paper finish with tactile organic tone.",
    icon: "🌿",
    coverDensity: "soft",
    shadowOpacity: 0.4,
    pageFilter: "sepia(28%) saturate(1.1) brightness(0.97)",
    spineType: "crease",
    swatchBg: "linear-gradient(135deg, #b45309 0%, #78350f 100%)",
    swatchBorder: "border-amber-600/40",
  },
  {
    id: "board-book",
    name: "Board Book",
    badge: "Thick Card",
    desc: "Ultra-thick rigid cardstock board feel for children's books and durable catalogs.",
    icon: "👶",
    coverDensity: "hard",
    shadowOpacity: 0.65,
    pageFilter: "none",
    spineType: "heavy-crease",
    swatchBg: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
    swatchBorder: "border-orange-400",
  },
  {
    id: "manga",
    name: "Manga",
    badge: "Tankobon",
    desc: "High-speed monochrome halftone contrast with Japanese tankobon print feel.",
    icon: "🎌",
    coverDensity: "soft",
    shadowOpacity: 0.42,
    pageFilter: "grayscale(25%) contrast(1.15)",
    spineType: "crease",
    swatchBg: "linear-gradient(135deg, #3f3f46 0%, #18181b 100%)",
    swatchBorder: "border-zinc-500",
  },
  {
    id: "catalog",
    name: "Catalog",
    badge: "Commercial",
    desc: "Commercial product catalog with vibrant glossy punch and ultra-crisp photo clarity.",
    icon: "🛍️",
    coverDensity: "soft",
    shadowOpacity: 0.44,
    pageFilter: "contrast(1.05) saturate(1.08)",
    spineType: "glossy",
    swatchBg: "linear-gradient(135deg, #0284c7 0%, #1d4ed8 100%)",
    swatchBorder: "border-sky-400",
  },
  {
    id: "moleskine",
    name: "Notebook",
    badge: "Journal",
    desc: "Classic black rounded notebook aesthetic with deep spine hinge and warm paper tone.",
    icon: "📓",
    coverDensity: "hard",
    shadowOpacity: 0.55,
    pageFilter: "sepia(10%) contrast(1.02)",
    spineType: "heavy-crease",
    swatchBg: "linear-gradient(135deg, #262626 0%, #0a0a0a 100%)",
    swatchBorder: "border-neutral-700",
  },
  {
    id: "pastel",
    name: "Pastel",
    badge: "Soft Mood",
    desc: "Scandinavian soft pastel tones with gentle airy lighting for lookbooks and art journals.",
    icon: "🌸",
    coverDensity: "soft",
    shadowOpacity: 0.3,
    pageFilter: "brightness(1.02) contrast(0.98)",
    spineType: "clean",
    swatchBg: "linear-gradient(135deg, #fbcfe8 0%, #f472b6 100%)",
    swatchBorder: "border-pink-300",
  },
  {
    id: "noir",
    name: "Film Noir",
    badge: "Cinematic",
    desc: "Dramatic black-and-white photography tone with deep shadows and crisp silver highlights.",
    icon: "🎬",
    coverDensity: "hard",
    shadowOpacity: 0.6,
    pageFilter: "grayscale(100%) contrast(1.2)",
    spineType: "heavy-crease",
    swatchBg: "linear-gradient(135deg, #3f3f46 0%, #09090b 100%)",
    swatchBorder: "border-zinc-600",
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
