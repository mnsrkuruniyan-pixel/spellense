// Pure layout engine for Print Sheet Maker. All units mm. No DOM.
// Rule: user size always wins (we add pages, never shrink).

export interface PaperSize {
  name: string;
  width: number;
  height: number;
}

export const PAPER_SIZES: Record<string, [number, number]> = {
  A4: [210, 297],
  Letter: [215.9, 279.4],
  A3: [297, 420],
  Legal: [215.9, 355.6],
  A5: [148, 210],
  A6: [105, 148],
  A2: [420, 594],
  Tabloid: [279.4, 431.8],
};

export type Orientation = "auto" | "portrait" | "landscape";
export type FitMode = "fit" | "fill" | "stretch";
export type Arrangement = "grid" | "tight" | "grouped";

export interface PlanOptions {
  paper: [number, number];
  orient: Orientation;
  margin: number;
  gap: number;
  aspects: number[]; // w / h for each copy
  cell: [number, number] | null; // null = fit on 1 page
  customGrid?: [number, number] | null; // [cols, rows] override
  fitMode?: FitMode;
}

export interface LayoutPlan {
  pw: number;
  ph: number;
  cols: number;
  rows: number;
  cw: number;
  ch: number;
  per: number;
  pages: number;
  score: number;
  fits: boolean;
}

export interface PlacedItem {
  i: number; // photo index
  x: number; // photo x in mm
  y: number; // photo y in mm
  w: number; // photo width in mm
  h: number; // photo height in mm
  cx: number; // cell origin x in mm
  cy: number; // cell origin y in mm
  cw: number; // cell width in mm
  ch: number; // cell height in mm
}

export function fitAspectRatio(aspect: number, cw: number, ch: number): [number, number] {
  if (!aspect || isNaN(aspect) || aspect <= 0) aspect = 1;
  const w = Math.min(cw, ch * aspect);
  const h = aspect > 0 ? w / aspect : ch;
  return [w, isNaN(h) || h <= 0 ? ch : h];
}

export function planLayout(options: PlanOptions): LayoutPlan {
  const n = options.aspects.length;
  if (n === 0) {
    const pw = options.paper?.[0] || 210;
    const ph = options.paper?.[1] || 297;
    return {
      pw,
      ph,
      cols: 0,
      rows: 0,
      cw: options.cell ? options.cell[0] : 50.8,
      ch: options.cell ? options.cell[1] : 50.8,
      per: 0,
      pages: 0,
      score: 0,
      fits: true,
    };
  }

  const G = options.gap;
  const M = options.margin;
  let best: LayoutPlan | null = null;

  const rotations =
    options.orient === "portrait"
      ? [0]
      : options.orient === "landscape"
      ? [1]
      : [0, 1];

  for (const r of rotations) {
    const pw = r ? options.paper[1] : options.paper[0];
    const ph = r ? options.paper[0] : options.paper[1];
    const W = pw - 2 * M;
    const H = ph - 2 * M;

    if (W <= 0 || H <= 0) continue;

    let c: LayoutPlan | null = null;

    if (options.customGrid) {
      const [cols, rows] = options.customGrid;
      if (cols > 0 && rows > 0) {
        const cw = (W - (cols - 1) * G) / cols;
        const maxRowH = (H - (rows - 1) * G) / rows;
        if (cw > 0 && maxRowH > 0) {
          const per = cols * rows;
          const pages = Math.ceil(n / per);

          let displayCh = maxRowH;
          if (options.fitMode !== "fill" && options.aspects.length > 0) {
            const avgAspect =
              options.aspects.reduce((sum, a) => sum + (a || 1), 0) /
              options.aspects.length;
            const [, fh] = fitAspectRatio(avgAspect, cw, maxRowH);
            displayCh = fh;
          }

          c = {
            pw,
            ph,
            cols,
            rows,
            cw,
            ch: displayCh,
            per,
            pages,
            score: 1,
            fits: true,
          };
        }
      }
    } else if (options.cell) {
      const [cw, ch] = options.cell;
      if (cw + G <= 0 || ch + G <= 0) continue;
      const cols = Math.floor((W + G) / (cw + G));
      const rows = Math.floor((H + G) / (ch + G));

      if (cols > 0 && rows > 0) {
        const per = cols * rows;
        const pages = Math.ceil(n / per);
        const scoreRatio = pages * per > 0 ? n / (pages * per) : 0;
        c = {
          pw,
          ph,
          cols,
          rows,
          cw,
          ch,
          per,
          pages,
          score: -pages * 1e3 + scoreRatio,
          fits: true,
        };
      }
    } else {
      // Auto fit: find grid that fits on 1 page and maximizes photo area
      for (let cols = 1; cols <= n; cols++) {
        const rows = Math.ceil(n / cols);
        const cw = cols > 0 ? (W - (cols - 1) * G) / cols : 0;
        const maxRowH = rows > 0 ? (H - (rows - 1) * G) / rows : 0;

        if (cw <= 0 || maxRowH <= 0) continue;

        let totalArea = 0;
        let totalH = 0;
        for (let rowIdx = 0; rowIdx < rows; rowIdx++) {
          const rowItems = options.aspects.slice(rowIdx * cols, (rowIdx + 1) * cols);
          let rowH = 0;
          for (const a of rowItems) {
            const [w, h] = fitAspectRatio(a, cw, maxRowH);
            totalArea += w * h;
            if (h > rowH) rowH = h;
          }
          totalH += rowH + (rowIdx > 0 ? G : 0);
        }

        if (totalH > H + 0.5) continue; // Must fit on 1 page

        let displayCh = maxRowH;
        if (options.fitMode !== "fill" && options.aspects.length > 0) {
          const avgAspect =
            options.aspects.reduce((sum, a) => sum + (a || 1), 0) /
            options.aspects.length;
          const [, fh] = fitAspectRatio(avgAspect, cw, maxRowH);
          displayCh = fh;
        }

        if (!c || totalArea > c.score) {
          c = {
            pw,
            ph,
            cols,
            rows,
            cw,
            ch: displayCh,
            per: n,
            pages: 1,
            score: totalArea,
            fits: true,
          };
        }
      }
    }

    if (c && (!best || c.score > best.score)) {
      best = c;
    }
  }

  return (
    best || {
      pw: options.paper?.[0] || 210,
      ph: options.paper?.[1] || 297,
      cols: 0,
      rows: 0,
      cw: options.cell ? options.cell[0] : 50.8,
      ch: options.cell ? options.cell[1] : 50.8,
      per: 0,
      pages: 0,
      score: -Infinity,
      fits: false,
    }
  );
}

export function placeItems(
  plan: LayoutPlan,
  items: number[], // photo index for each copy
  aspects: number[], // aspect ratio per photo index
  margin: number,
  gap: number,
  fitMode: FitMode = "fit"
): PlacedItem[][] {
  if (!plan.fits || plan.per <= 0 || plan.cols <= 0 || plan.rows <= 0) {
    return [];
  }

  const W = plan.pw - 2 * margin;
  const cols = plan.cols;
  const cw = plan.cw;
  const ch = plan.ch;

  const gridW = cols * cw + (cols - 1) * gap;
  const ox = margin + Math.max(0, (W - gridW) / 2);
  const oy = margin; // Top-aligned from page margin, no dead space!

  const pages: PlacedItem[][] = [];
  const per = plan.per;
  const totalPages = Math.ceil(items.length / per);

  for (let p = 0; p < totalPages; p++) {
    const pageItems = items.slice(p * per, (p + 1) * per);
    const placedPage: PlacedItem[] = [];

    const rowCount = Math.ceil(pageItems.length / cols);
    let currentY = oy;

    for (let r = 0; r < rowCount; r++) {
      const rowItemIndices = pageItems.slice(r * cols, (r + 1) * cols);

      // Determine height of this row
      let rowH = ch;
      if (fitMode === "fit") {
        const heights = rowItemIndices.map((pi) => {
          const a = aspects[pi] || 1;
          const [, fh] = fitAspectRatio(a, cw, ch > 0 ? ch : 297);
          return fh;
        });
        rowH = Math.max(...heights, 5);
      }

      rowItemIndices.forEach((pi, c) => {
        const cx = ox + c * (cw + gap);
        const cy = currentY;
        const aspect = aspects[pi] || 1;

        let w = cw;
        let h = rowH;

        if (fitMode === "fill") {
          w = cw;
          h = rowH;
        } else {
          const [fw, fh] = fitAspectRatio(aspect, cw, rowH);
          w = fw;
          h = fh;
        }

        const x = cx + (cw - w) / 2;
        const y = cy + (rowH - h) / 2;

        placedPage.push({
          i: pi,
          x,
          y,
          w,
          h,
          cx: fitMode === "fit" ? x : cx,
          cy: fitMode === "fit" ? y : cy,
          cw: fitMode === "fit" ? w : cw,
          ch: fitMode === "fit" ? h : rowH,
        });
      });

      // Move to next row with EXACTLY gap
      currentY += rowH + gap;
    }

    pages.push(placedPage);
  }

  return pages;
}

export interface IdCardSlot {
  frontIndex: number | null;
  backIndex: number | null;
}

export type IdCardLayoutType = "stacked" | "side_by_side" | "two_pages";

export function placeIdCards(
  cards: IdCardSlot[],
  paper: [number, number],
  cardW = 85.6,
  cardH = 54,
  layout: IdCardLayoutType = "stacked",
  margin = 10,
  gap = 6,
  topOffset = 30 // 3 cm from top edge
): PlacedItem[][] {
  const [pw, ph] = paper;
  const availW = Math.max(10, pw - 2 * margin);
  const availH = Math.max(10, ph - 2 * margin);

  const pages: PlacedItem[][] = [];

  if (layout === "two_pages") {
    // Front on odd page, Back on even page in exact same coordinates
    const cols = Math.max(1, Math.floor((availW + gap) / (cardW + gap)));
    const rows = Math.max(1, Math.floor((availH + gap) / (cardH + gap)));
    const perPage = cols * rows;
    const totalSheetPairs = Math.max(1, Math.ceil(cards.length / perPage));

    for (let sp = 0; sp < totalSheetPairs; sp++) {
      const pageCards = cards.slice(sp * perPage, (sp + 1) * perPage);
      const frontPage: PlacedItem[] = [];
      const backPage: PlacedItem[] = [];

      if (pageCards.length === 1) {
        const cx = (pw - cardW) / 2;
        const cy = topOffset > 0 ? topOffset : (ph - cardH) / 2;
        const c = pageCards[0];
        if (c.frontIndex !== null) {
          frontPage.push({ i: c.frontIndex, x: cx, y: cy, w: cardW, h: cardH, cx, cy, cw: cardW, ch: cardH });
        }
        if (c.backIndex !== null) {
          backPage.push({ i: c.backIndex, x: cx, y: cy, w: cardW, h: cardH, cx, cy, cw: cardW, ch: cardH });
        }
      } else {
        const gridW = cols * cardW + (cols - 1) * gap;
        const gridH = rows * cardH + (rows - 1) * gap;
        const ox = margin + Math.max(0, (availW - gridW) / 2);
        const oy = topOffset > 0 && topOffset + gridH <= ph - margin ? topOffset : margin;

        pageCards.forEach((c, idx) => {
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          const cx = ox + col * (cardW + gap);
          const cy = oy + row * (cardH + gap);

          if (c.frontIndex !== null) {
            frontPage.push({ i: c.frontIndex, x: cx, y: cy, w: cardW, h: cardH, cx, cy, cw: cardW, ch: cardH });
          }
          if (c.backIndex !== null) {
            backPage.push({ i: c.backIndex, x: cx, y: cy, w: cardW, h: cardH, cx, cy, cw: cardW, ch: cardH });
          }
        });
      }

      pages.push(frontPage);
      pages.push(backPage);
    }
    return pages;
  }

  if (layout === "stacked") {
    // Front above Back
    const pairW = cardW;
    const pairH = 2 * cardH + gap;

    if (cards.length === 1) {
      const cx = (pw - pairW) / 2;
      const cy = topOffset > 0 ? topOffset : (ph - pairH) / 2;
      const p: PlacedItem[] = [];
      const c = cards[0];
      if (c.frontIndex !== null) {
        p.push({ i: c.frontIndex, x: cx, y: cy, w: cardW, h: cardH, cx, cy, cw: cardW, ch: cardH });
      }
      if (c.backIndex !== null) {
        p.push({ i: c.backIndex, x: cx, y: cy + cardH + gap, w: cardW, h: cardH, cx, cy: cy + cardH + gap, cw: cardW, ch: cardH });
      }
      return [p];
    }

    const cols = Math.max(1, Math.floor((availW + gap) / (pairW + gap)));
    const rows = Math.max(1, Math.floor((availH + gap) / (pairH + gap)));
    const perPage = Math.max(1, cols * rows);
    const totalPages = Math.ceil(cards.length / perPage);

    for (let pg = 0; pg < totalPages; pg++) {
      const pageCards = cards.slice(pg * perPage, (pg + 1) * perPage);
      const placed: PlacedItem[] = [];

      const gridCols = Math.min(pageCards.length, cols);
      const gridRows = Math.min(rows, Math.ceil(pageCards.length / cols));
      const gridW = gridCols * pairW + (gridCols - 1) * gap;
      const gridH = gridRows * pairH + (gridRows - 1) * gap;
      const ox = margin + Math.max(0, (availW - gridW) / 2);
      const oy = topOffset > 0 && topOffset + gridH <= ph - margin ? topOffset : margin;

      pageCards.forEach((c, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const cx = ox + col * (pairW + gap);
        const cy = oy + row * (pairH + gap);

        if (c.frontIndex !== null) {
          placed.push({ i: c.frontIndex, x: cx, y: cy, w: cardW, h: cardH, cx, cy, cw: cardW, ch: cardH });
        }
        if (c.backIndex !== null) {
          placed.push({ i: c.backIndex, x: cx, y: cy + cardH + gap, w: cardW, h: cardH, cx, cy: cy + cardH + gap, cw: cardW, ch: cardH });
        }
      });
      pages.push(placed);
    }
    return pages;
  }

  // layout === "side_by_side"
  const pairW = 2 * cardW + gap;
  const pairH = cardH;

  if (cards.length === 1) {
    const cx = (pw - pairW) / 2;
    const cy = topOffset > 0 ? topOffset : (ph - pairH) / 2;
    const p: PlacedItem[] = [];
    const c = cards[0];
    if (c.frontIndex !== null) {
      p.push({ i: c.frontIndex, x: cx, y: cy, w: cardW, h: cardH, cx, cy, cw: cardW, ch: cardH });
    }
    if (c.backIndex !== null) {
      p.push({ i: c.backIndex, x: cx + cardW + gap, y: cy, w: cardW, h: cardH, cx: cx + cardW + gap, cy, cw: cardW, ch: cardH });
    }
    return [p];
  }

  const cols = Math.max(1, Math.floor((availW + gap) / (pairW + gap)));
  const rows = Math.max(1, Math.floor((availH + gap) / (pairH + gap)));
  const perPage = Math.max(1, cols * rows);
  const totalPages = Math.ceil(cards.length / perPage);

  for (let pg = 0; pg < totalPages; pg++) {
    const pageCards = cards.slice(pg * perPage, (pg + 1) * perPage);
    const placed: PlacedItem[] = [];

    const gridCols = Math.min(pageCards.length, cols);
    const gridRows = Math.min(rows, Math.ceil(pageCards.length / cols));
    const gridW = gridCols * pairW + (gridCols - 1) * gap;
    const gridH = gridRows * pairH + (gridRows - 1) * gap;
    const ox = margin + Math.max(0, (availW - gridW) / 2);
    const oy = topOffset > 0 && topOffset + gridH <= ph - margin ? topOffset : margin;

    pageCards.forEach((c, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const cx = ox + col * (pairW + gap);
      const cy = oy + row * (pairH + gap);

      if (c.frontIndex !== null) {
        placed.push({ i: c.frontIndex, x: cx, y: cy, w: cardW, h: cardH, cx, cy, cw: cardW, ch: cardH });
      }
      if (c.backIndex !== null) {
        placed.push({ i: c.backIndex, x: cx + cardW + gap, y: cy, w: cardW, h: cardH, cx: cx + cardW + gap, cy, cw: cardW, ch: cardH });
      }
    });
    pages.push(placed);
  }

  return pages;
}
