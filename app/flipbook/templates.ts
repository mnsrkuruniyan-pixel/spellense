export interface FlipPage {
  id: string;
  dataUrl: string;
  width: number;
  height: number;
  pageNum: number;
}

export interface TemplateInfo {
  id: string;
  name: string;
  malName: string;
  badge: string;
  desc: string;
  accentColor: string;
  bgGradient: string;
}

export const TEMPLATES: TemplateInfo[] = [
  {
    id: "classic-book",
    name: "Classic Hardcover Novel",
    malName: "യാഥാർത്ഥ്യമായ പുസ്തകം (Classic Book)",
    badge: "Most Realistic",
    desc: "Antique leather binding, gold foil embossing, parchment pages with classic drop-caps & botanical plates.",
    accentColor: "#d4af37",
    bgGradient: "from-amber-950 via-stone-900 to-amber-950",
  },
  {
    id: "modern-lookbook",
    name: "Aura Luxury Lookbook",
    malName: "മോഡേൺ മാഗസിൻ (Lookbook)",
    badge: "Editorial Design",
    desc: "High-contrast architectural monograph with modern spatial typography, negative space & minimalist grids.",
    accentColor: "#3b82f6",
    bgGradient: "from-slate-900 via-slate-800 to-indigo-950",
  },
  {
    id: "tech-catalog",
    name: "Quantum Tech Specs",
    malName: "ടെക് കാറ്റലോഗ് (Cyber Specs)",
    badge: "Dark Mode HUD",
    desc: "Cyberpunk hardware architecture, glowing cyan telemetry readouts, circuit blueprints & spec tables.",
    accentColor: "#06b6d4",
    bgGradient: "from-cyan-950 via-slate-950 to-blue-950",
  },
  {
    id: "storybook",
    name: "Illustrated Storybook",
    malName: "കുട്ടികളുടെ ചിത്രകഥ (Storybook)",
    badge: "Whimsical & Fun",
    desc: "Dreamy bedtime fairytale with twilight starry covers, pastel illustrated scenes & friendly typography.",
    accentColor: "#f59e0b",
    bgGradient: "from-indigo-950 via-purple-950 to-indigo-950",
  },
];

// Helper: Wrap and render multi-line text with line height
function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(" ");
  let line = "";
  let curY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, curY);
      line = words[n] + " ";
      curY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, curY);
  return curY + lineHeight;
}

// 1. Classic Hardcover Vintage Book Generator
function generateClassicBookPages(W: number, H: number): FlipPage[] {
  const pages: FlipPage[] = [];

  // Page 1: Front Cover (Dark Oxblood Leather + Gold Embossing)
  {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // Leather texture gradient
    const grad = ctx.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, H / 1.2);
    grad.addColorStop(0, "#4a1818");
    grad.addColorStop(1, "#240a0a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Subtle grain texture simulation
    ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
    for (let i = 0; i < 200; i++) {
      ctx.fillRect((i * 37) % W, (i * 53) % H, 4, 4);
    }

    // Gold embossed outer border
    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 4;
    ctx.strokeRect(48, 48, W - 96, H - 96);

    // Inner thin border
    ctx.strokeStyle = "rgba(212, 175, 55, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(62, 62, W - 124, H - 124);

    // Ornate gold corner accents
    const corners = [
      [75, 75],
      [W - 75, 75],
      [75, H - 75],
      [W - 75, H - 75],
    ];
    corners.forEach(([cx, cy]) => {
      ctx.fillStyle = "#d4af37";
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();
    });

    // Header Emblem
    ctx.fillStyle = "#d4af37";
    ctx.font = "bold 22px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("✦  HISTORIA ET ARS  ✦", W / 2, 220);

    // Main Book Title
    ctx.fillStyle = "#fff4d0";
    ctx.font = "bold 58px 'Times New Roman', Georgia, serif";
    ctx.fillText("THE CHRONICLES", W / 2, 440);
    ctx.fillText("OF ARCADIA", W / 2, 520);

    // Gold Divider Flourish
    ctx.fillStyle = "#d4af37";
    ctx.font = "32px serif";
    ctx.fillText("— ❦ ❧ —", W / 2, 610);

    // Subtitle
    ctx.fillStyle = "#e2d19e";
    ctx.font = "italic 26px Georgia, serif";
    ctx.fillText("An Archival Compendium of Art & Essays", W / 2, 700);
    ctx.fillText("Written & Illustrated by Master Craftsmen", W / 2, 745);

    // Center Gold Foil Seal
    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(W / 2, 920, 60, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = "bold 20px serif";
    ctx.fillText("FOLIO", W / 2, 915);
    ctx.font = "14px serif";
    ctx.fillText("MDCCCLXXXIV", W / 2, 938);

    // Footer
    ctx.fillStyle = "rgba(212, 175, 55, 0.75)";
    ctx.font = "bold 18px Georgia, serif";
    ctx.fillText("SPELLENSE CLASSICAL ARCHIVES • FIRST EDITION", W / 2, H - 100);

    pages.push({
      id: "classic-1",
      dataUrl: canvas.toDataURL("image/jpeg", 0.95),
      width: W,
      height: H,
      pageNum: 1,
    });
  }

  // Page 2: Ex Libris & Dedication (Aged Cream Parchment)
  {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // Parchment background
    ctx.fillStyle = "#faf5e8";
    ctx.fillRect(0, 0, W, H);

    // Faint vintage vignette border
    const vignette = ctx.createRadialGradient(W / 2, H / 2, W / 3, W / 2, H / 2, H / 1.5);
    vignette.addColorStop(0, "rgba(250, 245, 232, 0)");
    vignette.addColorStop(1, "rgba(180, 150, 110, 0.25)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);

    // Bookplate frame
    ctx.strokeStyle = "#8b5a2b";
    ctx.lineWidth = 2;
    ctx.strokeRect(120, 180, W - 240, 360);
    ctx.strokeRect(126, 186, W - 252, 348);

    ctx.textAlign = "center";
    ctx.fillStyle = "#5c3a21";
    ctx.font = "bold 24px Georgia, serif";
    ctx.fillText("EX LIBRIS", W / 2, 250);

    ctx.fillStyle = "#8b5a2b";
    ctx.font = "italic 20px Georgia, serif";
    ctx.fillText("This Volvme Belongeth Unto", W / 2, 310);

    ctx.strokeStyle = "#8b5a2b";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(180, 390);
    ctx.lineTo(W - 180, 390);
    ctx.stroke();

    ctx.fillStyle = "#a27b5c";
    ctx.font = "italic 16px Georgia, serif";
    ctx.fillText("( Owner Signature )", W / 2, 420);

    ctx.fillStyle = "#5c3a21";
    ctx.font = "bold 18px Georgia, serif";
    ctx.fillText("✦  VERITAS VOS LIBERABIT  ✦", W / 2, 490);

    // Dedication
    ctx.textAlign = "left";
    ctx.fillStyle = "#3e2723";
    ctx.font = "italic 24px Georgia, serif";
    const dedication =
      "Dedicated to all who cherish the tactile serenity of printed leaves, the scent of aged cedar bindings, and the enduring grace of the written word.";
    drawWrappedText(ctx, dedication, 120, 680, W - 240, 42);

    ctx.textAlign = "center";
    ctx.fillStyle = "#8d6e63";
    ctx.font = "italic 18px Georgia, serif";
    ctx.fillText("Published at the Spellense Press • London & Milan", W / 2, H - 120);
    ctx.fillText("— ii —", W / 2, H - 80);

    pages.push({
      id: "classic-2",
      dataUrl: canvas.toDataURL("image/jpeg", 0.95),
      width: W,
      height: H,
      pageNum: 2,
    });
  }

  // Page 3: Chapter I (Illuminated Drop Cap & Book Page)
  {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "#faf5e8";
    ctx.fillRect(0, 0, W, H);

    // Running Header
    ctx.textAlign = "center";
    ctx.fillStyle = "#795548";
    ctx.font = "italic 18px Georgia, serif";
    ctx.fillText("THE CHRONICLES OF ARCADIA  •  BOOK I", W / 2, 90);

    ctx.strokeStyle = "#d7ccc8";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(100, 115);
    ctx.lineTo(W - 100, 115);
    ctx.stroke();

    // Chapter Title
    ctx.fillStyle = "#3e2723";
    ctx.font = "bold 32px Georgia, serif";
    ctx.fillText("CHAPTER THE FIRST", W / 2, 180);

    ctx.fillStyle = "#8d6e63";
    ctx.font = "italic 20px Georgia, serif";
    ctx.fillText("On the Architecture of the Movable Letter", W / 2, 220);

    ctx.fillStyle = "#8d6e63";
    ctx.font = "20px serif";
    ctx.fillText("— ✦ —", W / 2, 260);

    // Drop Cap "I"
    ctx.fillStyle = "#5c1d1d";
    ctx.fillRect(100, 310, 80, 80);
    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 2;
    ctx.strokeRect(102, 312, 76, 76);
    ctx.fillStyle = "#fff4d0";
    ctx.font = "bold 64px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("I", 140, 372);

    // Text alongside drop cap
    ctx.textAlign = "left";
    ctx.fillStyle = "#2c1b18";
    ctx.font = "normal 22px Georgia, serif";
    ctx.fillText("N THE ANCIENT PROVINCE OF VALLE-", 195, 338);
    ctx.fillText("luz, where monasteries kept the light of", 195, 372);

    // Main paragraph text
    const p1 =
      "manuscripts burning through long centuries of winter, the creation of a folio was accounted a holy labor. The master scribe would select vellum with patient fingers, testing each sheet against the candlelight for uniformity and grain.\n\nEvery stroke of iron gall ink carried the quiet breath of the author across generations. It was believed that a true volume possessed its own heartbeat—a resonant spirit sealed between leather boards and brass clasps.";
    drawWrappedText(ctx, p1, 100, 430, W - 200, 36);

    // Woodcut banner placeholder
    ctx.fillStyle = "#ede0cc";
    ctx.fillRect(100, 720, W - 200, 240);
    ctx.strokeStyle = "#bcaaa4";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(100, 720, W - 200, 240);

    ctx.textAlign = "center";
    ctx.fillStyle = "#5d4037";
    ctx.font = "bold 20px Georgia, serif";
    ctx.fillText("FIG. I — COMPOSITION OF THE MOVABLE TYPE MESH", W / 2, 820);
    ctx.fillStyle = "#8d6e63";
    ctx.font = "italic 16px Georgia, serif";
    ctx.fillText("Hand-cast lead alloy matrices arranged by typographic point size", W / 2, 860);

    ctx.fillText("— 3 —", W / 2, H - 60);

    pages.push({
      id: "classic-3",
      dataUrl: canvas.toDataURL("image/jpeg", 0.95),
      width: W,
      height: H,
      pageNum: 3,
    });
  }

  // Page 4: Architectural Botanical Plate
  {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "#faf5e8";
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = "center";
    ctx.fillStyle = "#795548";
    ctx.font = "italic 18px Georgia, serif";
    ctx.fillText("PLANTARVM ARCHITECTURA  •  PLATE IV", W / 2, 90);

    ctx.strokeStyle = "#d7ccc8";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(100, 115);
    ctx.lineTo(W - 100, 115);
    ctx.stroke();

    // Plate drawing border
    ctx.strokeStyle = "#8d6e63";
    ctx.lineWidth = 2;
    ctx.strokeRect(90, 160, W - 180, H - 320);

    // Decorative botanical compass design
    ctx.save();
    ctx.translate(W / 2, 460);
    ctx.strokeStyle = "rgba(109, 76, 65, 0.4)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      ctx.beginPath();
      ctx.ellipse(0, 0, 70, 220, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 80, 0, Math.PI * 2);
    ctx.strokeStyle = "#5d4037";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "#3e2723";
    ctx.font = "bold 24px Georgia, serif";
    ctx.fillText("TABVLA BOTANICA & GEOMETRIA SACRA", W / 2, 820);

    ctx.fillStyle = "#5d4037";
    ctx.font = "italic 18px Georgia, serif";
    ctx.fillText("Harmonic Golden Ratio Proportions observed in Folio Leaves", W / 2, 860);

    ctx.fillText("— 4 —", W / 2, H - 60);

    pages.push({
      id: "classic-4",
      dataUrl: canvas.toDataURL("image/jpeg", 0.95),
      width: W,
      height: H,
      pageNum: 4,
    });
  }

  // Page 5: Chapter II (The Binder's Art)
  {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "#faf5e8";
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = "center";
    ctx.fillStyle = "#795548";
    ctx.font = "italic 18px Georgia, serif";
    ctx.fillText("THE CHRONICLES OF ARCADIA  •  BOOK I", W / 2, 90);

    ctx.strokeStyle = "#d7ccc8";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(100, 115);
    ctx.lineTo(W - 100, 115);
    ctx.stroke();

    ctx.fillStyle = "#3e2723";
    ctx.font = "bold 32px Georgia, serif";
    ctx.fillText("CHAPTER THE SECOND", W / 2, 180);

    ctx.fillStyle = "#8d6e63";
    ctx.font = "italic 20px Georgia, serif";
    ctx.fillText("The Binder's Guild & The Art of Gold Leaf", W / 2, 220);
    ctx.fillText("— ✦ —", W / 2, 260);

    // Drop Cap "T"
    ctx.fillStyle = "#5c1d1d";
    ctx.fillRect(100, 310, 80, 80);
    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 2;
    ctx.strokeRect(102, 312, 76, 76);
    ctx.fillStyle = "#fff4d0";
    ctx.font = "bold 64px Georgia, serif";
    ctx.fillText("T", 140, 372);

    ctx.textAlign = "left";
    ctx.fillStyle = "#2c1b18";
    ctx.font = "normal 22px Georgia, serif";
    ctx.fillText("O BIND A BOOK IS TO BUILD A SANCTU-", 195, 338);
    ctx.fillText("ary for human memory. The spine must", 195, 372);

    const p2 =
      "bear the tension of a thousand unfoldings without rupture; the threads of raw unbleached linen must weave each signature tightly into the next.\n\nWhen the heated brass iron strikes the gold leaf against dampened morocco leather, a miraculous alchemy takes place: fragile thoughts are crowned with the permanence of sunlight.";
    drawWrappedText(ctx, p2, 100, 430, W - 200, 36);

    ctx.textAlign = "center";
    ctx.fillStyle = "#8d6e63";
    ctx.font = "32px serif";
    ctx.fillText("❦  ❧  ❦", W / 2, 740);

    ctx.fillStyle = "#6d4c41";
    ctx.font = "italic 20px Georgia, serif";
    ctx.fillText("End of First Folio Excerpt", W / 2, 800);

    ctx.fillText("— 5 —", W / 2, H - 60);

    pages.push({
      id: "classic-5",
      dataUrl: canvas.toDataURL("image/jpeg", 0.95),
      width: W,
      height: H,
      pageNum: 5,
    });
  }

  // Page 6: Back Cover (Dark Oxblood Leather)
  {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    const grad = ctx.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, H / 1.2);
    grad.addColorStop(0, "#4a1818");
    grad.addColorStop(1, "#240a0a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 4;
    ctx.strokeRect(48, 48, W - 96, H - 96);
    ctx.strokeStyle = "rgba(212, 175, 55, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(62, 62, W - 124, H - 124);

    ctx.textAlign = "center";
    ctx.fillStyle = "#d4af37";
    ctx.font = "36px serif";
    ctx.fillText("✦  ✦  ✦", W / 2, 380);

    ctx.fillStyle = "#fff4d0";
    ctx.font = "bold 32px Georgia, serif";
    ctx.fillText("SPELLENSE CLASSICAL ARCHIVES", W / 2, 480);

    ctx.fillStyle = "#e2d19e";
    ctx.font = "italic 22px Georgia, serif";
    ctx.fillText("Crafted with In-Browser Zero-Server Privacy", W / 2, 540);
    ctx.fillText("Preserving the Heritage of Master Bookbinding", W / 2, 580);

    ctx.fillStyle = "rgba(212, 175, 55, 0.8)";
    ctx.font = "bold 18px Georgia, serif";
    ctx.fillText("FINIS", W / 2, 700);

    ctx.font = "14px Georgia, serif";
    ctx.fillText("spellense.com • 3D Physical Digital Flipbook", W / 2, H - 100);

    pages.push({
      id: "classic-6",
      dataUrl: canvas.toDataURL("image/jpeg", 0.95),
      width: W,
      height: H,
      pageNum: 6,
    });
  }

  return pages;
}

// 2. Modern Lookbook & Architectural Editorial
function generateModernLookbookPages(W: number, H: number): FlipPage[] {
  const pages: FlipPage[] = [];

  const configs = [
    {
      bg: "#0b0f19",
      tag: "ISSUE NO. 04 / SPRING 2026",
      title: "AURA 2026",
      subtitle: "EDITORIAL LOOKBOOK & SPECIFICATIONS",
      body: "A curated monograph exploring architectural forms, typographic balance, and zero-storage pre-flight publishing.",
      isCover: true,
      footer: "SPELLENSE HIGH-FASHION ARCHIVES",
    },
    {
      bg: "#ffffff",
      tag: "INDEX & MANIFESTO",
      title: "TABLE OF CONTENTS",
      subtitle: "STRUCTURED MONOGRAPH DIVISIONS",
      body: "01. Spatial Typography & Negative Space Rhythm\n02. Organic Cotton Packaging & Tactile Foiling\n03. Digital Pre-Flight QA & Color Proofing Rigor\n04. Architectural Catalog Formats & Paper Stocks",
      footer: "PAGE 02 / 06",
    },
    {
      bg: "#f8fafc",
      tag: "SECTION 01",
      title: "SPATIAL TYPOGRAPHY",
      subtitle: "MATHEMATICAL BALANCING & NEGATIVE SPACE",
      body: "Visual hierarchies should breathe. When type meets negative space with mathematical rigor, the reader's cognitive flow accelerates naturally without visual fatigue.",
      footer: "PAGE 03 / 06",
    },
    {
      bg: "#ffffff",
      tag: "SECTION 02",
      title: "SUSTAINABLE MATERIALS",
      subtitle: "TEXTURE, BLEED & EMBOSSED FINISHES",
      body: "Geometric compositions printed on 350gsm unbleached organic cardstock. Engineered to capture glancing raking light and endure countless page turnings.",
      footer: "PAGE 04 / 06",
    },
    {
      bg: "#f1f5f9",
      tag: "SECTION 03",
      title: "COLOR PRECISION QA",
      subtitle: "ZERO-STORAGE DIGITAL PRE-FLIGHT VERIFICATION",
      body: "Every millimeter inspected before plates are struck. Catching typos, misaligned margins, and contrast drops saves thousands in costly reprint runs.",
      footer: "PAGE 05 / 06",
    },
    {
      bg: "#0b0f19",
      tag: "COLOPHON",
      title: "AURA MONOGRAPH",
      subtitle: "FLAWLESS DESIGN • ZERO ERROR",
      body: "Published with 100% In-Browser Privacy.\nDesigned for agencies, photographers & print masters worldwide.\n\nVisit spellense.com",
      isCover: true,
      footer: "BACK COVER • ISSUE 04",
    },
  ];

  configs.forEach((cfg, idx) => {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = cfg.bg;
    ctx.fillRect(0, 0, W, H);

    if (cfg.isCover) {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, "rgba(59, 130, 246, 0.25)");
      grad.addColorStop(1, "rgba(147, 51, 234, 0.15)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    // Border
    ctx.strokeStyle = cfg.isCover ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.08)";
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 50, W - 100, H - 100);

    // Tag
    ctx.fillStyle = cfg.isCover ? "#60a5fa" : "#2563eb";
    ctx.font = "bold 20px -apple-system, sans-serif";
    ctx.fillText(cfg.tag, 100, 130);

    // Title
    ctx.fillStyle = cfg.isCover ? "#ffffff" : "#0f172a";
    ctx.font = "bold 56px -apple-system, sans-serif";
    ctx.fillText(cfg.title, 100, 260);

    // Subtitle
    ctx.fillStyle = cfg.isCover ? "#94a3b8" : "#64748b";
    ctx.font = "bold 22px -apple-system, sans-serif";
    ctx.fillText(cfg.subtitle, 100, 320);

    // Accent line
    ctx.fillStyle = cfg.isCover ? "#38bdf8" : "#2563eb";
    ctx.fillRect(100, 360, 140, 5);

    // Body
    ctx.fillStyle = cfg.isCover ? "#cbd5e1" : "#334155";
    ctx.font = "normal 26px -apple-system, sans-serif";
    const lines = cfg.body.split("\n");
    let y = 460;
    for (const l of lines) {
      ctx.fillText(l, 100, y);
      y += 50;
    }

    // Footer
    ctx.fillStyle = cfg.isCover ? "#64748b" : "#94a3b8";
    ctx.font = "bold 18px -apple-system, sans-serif";
    ctx.fillText(cfg.footer, 100, H - 90);

    pages.push({
      id: `lookbook-${idx + 1}`,
      dataUrl: canvas.toDataURL("image/jpeg", 0.95),
      width: W,
      height: H,
      pageNum: idx + 1,
    });
  });

  return pages;
}

// 3. Cyberpunk Tech Catalog & Blueprint Specs
function generateTechCatalogPages(W: number, H: number): FlipPage[] {
  const pages: FlipPage[] = [];

  const specs = [
    {
      title: "NEXUS-9 QUANTUM",
      sub: "NEXT-GEN HARDWARE ARCHITECTURE & TELEMETRY",
      tag: "SYSTEM STATUS: NOMINAL • QUBIT ARRAY 1024",
      body: "High-throughput cryocooled computing node specifications with zero-latency photonic interconnects and hardware-level quantum key encryption.",
      isCover: true,
    },
    {
      title: "CORE ARCHITECTURE",
      sub: "QUANTUM HYPER-THREADED PROCESSOR MESH",
      tag: "SECTION 01: SILICON & PHOTONICS",
      body: "• Clock Rate: Equivalent 14.8 GHz\n• Coherence Time: 280 Microseconds\n• Bus Width: 512-bit Photonic Waveguide\n• Error Correction: Surface Code L2 Matrix\n• Sub-Kelvin Thermal Envelope: 15 Millikelvin",
    },
    {
      title: "DIAGNOSTIC TELEMETRY",
      sub: "REAL-TIME PHOTONIC LOSS & QUBIT FIDELITY",
      tag: "SECTION 02: HARDWARE VERIFICATION",
      body: "Zero detectable signal degradation across 10,000 continuous test cycles. Tamper-evident enclosure engineered for critical aerospace and defense computing grids.",
    },
    {
      title: "POWER & CRYO-COOLING",
      sub: "HELIUM-DILUTION REFRIGERATION MATRIX",
      tag: "SECTION 03: ENVIRONMENTAL SPECS",
      body: "Triple-stage Stirling pulse tube with magnetic shielding to eliminate electromagnetic interference. Power draw optimized to 1.2 kW at full quantum load.",
    },
    {
      title: "SECURITY PROTOCOLS",
      sub: "TAMPER-PROOF HARDWARE ROOTS OF TRUST",
      tag: "SECTION 04: CRYPTOGRAPHY",
      body: "NIST-standardized post-quantum lattice cryptography executed at the bare-metal firmware layer. Zero possibility of eavesdropping without quantum state collapse.",
    },
    {
      title: "NEXUS-9 TERMINAL",
      sub: "DOCUMENTATION CLOSED",
      tag: "SPELLENSE CYBER CATALOG",
      body: "Exported with 100% In-Browser Privacy.\nZero telemetry data logged to external servers.\n\nConfidential Product Specification.",
      isCover: true,
    },
  ];

  specs.forEach((s, idx) => {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // Dark cyberpunk background
    ctx.fillStyle = "#070b14";
    ctx.fillRect(0, 0, W, H);

    // Glowing grid lines
    ctx.strokeStyle = "rgba(6, 182, 212, 0.12)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Tech HUD corner brackets
    ctx.strokeStyle = "#06b6d4";
    ctx.lineWidth = 3;
    // Top-left
    ctx.strokeRect(40, 40, 40, 40);
    // Top-right
    ctx.strokeRect(W - 80, 40, 40, 40);
    // Bottom-left
    ctx.strokeRect(40, H - 80, 40, 40);
    // Bottom-right
    ctx.strokeRect(W - 80, H - 80, 40, 40);

    // Tag
    ctx.fillStyle = "#22d3ee";
    ctx.font = "bold 18px monospace";
    ctx.fillText(`// ${s.tag}`, 90, 130);

    // Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 52px -apple-system, monospace";
    ctx.fillText(s.title, 90, 240);

    // Subtitle
    ctx.fillStyle = "#818cf8";
    ctx.font = "bold 20px monospace";
    ctx.fillText(s.sub, 90, 300);

    // Glowing divider
    ctx.fillStyle = "#06b6d4";
    ctx.fillRect(90, 335, 180, 4);

    // Body
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "normal 24px monospace";
    const lines = s.body.split("\n");
    let y = 430;
    for (const l of lines) {
      ctx.fillText(l, 90, y);
      y += 46;
    }

    // Tech Footer
    ctx.fillStyle = "#475569";
    ctx.font = "bold 16px monospace";
    ctx.fillText(`TELEMETRY FRAME [${idx + 1}/6] // SECURE ENCLAVE`, 90, H - 90);

    pages.push({
      id: `tech-${idx + 1}`,
      dataUrl: canvas.toDataURL("image/jpeg", 0.95),
      width: W,
      height: H,
      pageNum: idx + 1,
    });
  });

  return pages;
}

// 4. Illustrated Children's Fairytale Storybook
function generateStorybookPages(W: number, H: number): FlipPage[] {
  const pages: FlipPage[] = [];

  const stories = [
    {
      bg: "#1e1b4b",
      tag: "A BEDTIME FAIRYTALE",
      title: "THE LITTLE STAR'S",
      title2: "JOURNEY",
      sub: "A Whimsical Adventure Across The Whispering Clouds",
      body: "Once in the velvet indigo sky, there lived Pippin, the tiniest star who wondered where the sunlight slept.",
      isCover: true,
    },
    {
      bg: "#fffbeb",
      tag: "CHAPTER ONE",
      title: "THE SLEEPY MOUNTAINS",
      title2: "",
      sub: "Where the winds carry dandelion seeds",
      body: "High above the purple hills, Pippin danced on moonbeams. 'Why do the forest creatures close their eyes at night?' whispered Pippin.\n\nThe wise grandfather owl blinked from a hollow oak tree: 'Because they are dreaming of you, little star.'",
    },
    {
      bg: "#f0fdf4",
      tag: "CHAPTER TWO",
      title: "THE SILVER COMET",
      title2: "",
      sub: "A spark of light across the milky way",
      body: "Zoom! A friendly comet with a sparkling crystal tail flashed past. 'Hop on, Pippin!' chimed the comet.\n\nTogether they soared past pink nebula cotton candy and singing constellations, laughing under the glow of the crescent moon.",
    },
    {
      bg: "#faf5ff",
      tag: "CHAPTER THREE",
      title: "OVER SLUMBERING SEAS",
      title2: "",
      sub: "Whales singing bedtime melodies",
      body: "Down below, great blue whales leaped into the glittering water, sending ripples of starlight toward the coral shores.\n\nEvery wave whispered a soft goodnight lullaby to the sleeping turtles on the sandy beaches.",
    },
    {
      bg: "#fff7ed",
      tag: "CHAPTER FOUR",
      title: "A BEDTIME BLESSING",
      title2: "",
      sub: "Rest your sleepy head",
      body: "'Every child looking out of their window tonight will see your golden twinkle,' murmured the silver moon.\n\nPippin snuggled inside a soft lavender cloud, pulled up a blanket of warm stardust, and drifted into sweet dreams.",
    },
    {
      bg: "#1e1b4b",
      tag: "SWEET DREAMS",
      title: "THE END",
      title2: "",
      sub: "Goodnight Little Star • Sleep Tight",
      body: "May your night be filled with wonder and tranquil dreams.\n\nSpellense Whimsical Illustrated Flipbooks.",
      isCover: true,
    },
  ];

  stories.forEach((st, idx) => {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = st.bg;
    ctx.fillRect(0, 0, W, H);

    if (st.isCover) {
      // Draw sparkling stars on cover
      ctx.fillStyle = "#fbbf24";
      for (let i = 0; i < 40; i++) {
        const sx = (i * 97) % W;
        const sy = (i * 131) % H;
        ctx.beginPath();
        ctx.arc(sx, sy, (i % 3) + 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Crescent Moon
      ctx.fillStyle = "#fef08a";
      ctx.beginPath();
      ctx.arc(W / 2, 280, 80, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = st.bg;
      ctx.beginPath();
      ctx.arc(W / 2 + 25, 275, 75, 0, Math.PI * 2);
      ctx.fill();
    }

    // Border
    ctx.strokeStyle = st.isCover ? "rgba(251, 191, 36, 0.4)" : "rgba(245, 158, 11, 0.25)";
    ctx.lineWidth = 3;
    ctx.strokeRect(40, 40, W - 80, H - 80);

    // Tag
    ctx.fillStyle = st.isCover ? "#fcd34d" : "#d97706";
    ctx.font = "bold 20px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`✦  ${st.tag}  ✦`, W / 2, st.isCover ? 120 : 130);

    // Title
    ctx.fillStyle = st.isCover ? "#ffffff" : "#1e1b4b";
    ctx.font = "bold 52px -apple-system, sans-serif";
    ctx.fillText(st.title, W / 2, st.isCover ? 430 : 230);
    if (st.title2) {
      ctx.fillText(st.title2, W / 2, 500);
    }

    // Subtitle
    ctx.fillStyle = st.isCover ? "#fde68a" : "#b45309";
    ctx.font = "italic 24px Georgia, serif";
    ctx.fillText(st.sub, W / 2, st.isCover ? 560 : 280);

    // Body
    ctx.textAlign = "left";
    ctx.fillStyle = st.isCover ? "#e0e7ff" : "#334155";
    ctx.font = "normal 26px -apple-system, sans-serif";
    drawWrappedText(ctx, st.body, 100, st.isCover ? 640 : 380, W - 200, 44);

    // Footer
    ctx.textAlign = "center";
    ctx.fillStyle = st.isCover ? "#a5b4fc" : "#94a3b8";
    ctx.font = "bold 18px -apple-system, sans-serif";
    ctx.fillText(`PAGE ${idx + 1} OF 6  •  SPELLENSE STORYBOOK`, W / 2, H - 75);

    pages.push({
      id: `story-${idx + 1}`,
      dataUrl: canvas.toDataURL("image/jpeg", 0.95),
      width: W,
      height: H,
      pageNum: idx + 1,
    });
  });

  return pages;
}

// Master generator function
export async function generateTemplatePages(templateId: string): Promise<FlipPage[]> {
  const W = 1000;
  const H = 1400;

  switch (templateId) {
    case "classic-book":
      return generateClassicBookPages(W, H);
    case "tech-catalog":
      return generateTechCatalogPages(W, H);
    case "storybook":
      return generateStorybookPages(W, H);
    case "modern-lookbook":
    default:
      return generateModernLookbookPages(W, H);
  }
}
