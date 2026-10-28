"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  OverlayType,
  OverlayItem,
  STAMP_COLORS,
  StudioPage,
  StudioMode,
  EditTool,
  ToastMessage,
  ConfirmDialogOptions,
} from "./types";
import RedactIcon from "./components/RedactIcon";
import ToastContainer from "./components/Toast";
import ConfirmDialog from "./components/ConfirmDialog";
import ProgressOverlay from "./components/ProgressOverlay";
import PostExportCard from "./components/PostExportCard";
import PageThumb from "./components/PageThumb";
import FaqSection from "./components/FaqSection";
import {
  LayoutGrid,
  Eraser,
  Type,
  PenLine,
  MousePointer2,
  Stamp as StampIcon,
  RotateCw,
  RotateCcw,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Download,
  Trash2,
  Copy,
  Plus,
  X,
  Upload,
  FileText,
  ShieldCheck,
  Pipette,
  Bold,
  Italic,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  SlidersHorizontal,
  Layers,
  Sparkles,
} from "lucide-react";

export * from "./types";

interface PasswordPromptState {
  fileName: string;
  reason: number; // 1 = need password, 2 = incorrect password
  onSubmit: (password: string) => void;
  onCancel: () => void;
}

export default function PdfStudioClient() {
  // State
  const [pages, setPages] = useState<StudioPage[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [mode, setMode] = useState<StudioMode>("edit");
  const [tool, setTool] = useState<EditTool>("whiteout");
  const [docTitle, setDocTitle] = useState<string>("document");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false); // Stage 2: separate export state
  const [processingText, setProcessingText] = useState<string>("");
  const [processingPercent, setProcessingPercent] = useState<number>(0);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [showPostExportCard, setShowPostExportCard] = useState<boolean>(false); // Stage 1
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false); // Stage 5

  // Quality dropdown (Standard = 150 DPI, High = 220 DPI)
  const [exportQuality, setExportQuality] = useState<"standard" | "high">("standard");

  // History state for Undo / Redo (Batch 2A, G3 & Stage 6 sliding window)
  const undoRef = useRef<StudioPage[][]>([]);
  const redoRef = useRef<StudioPage[][]>([]);
  const [undoStack, setUndoStack] = useState<StudioPage[][]>([]);
  const [redoStack, setRedoStack] = useState<StudioPage[][]>([]);
  const lastHistoryPushTimeRef = useRef<{ [key: string]: number }>({});
  const hasPushedTextEditThisSessionRef = useRef<boolean>(false);
  const pagesRef = useRef<StudioPage[]>([]);
  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  // Clear selected overlay whenever active page changes (G3)
  useEffect(() => {
    setSelectedOverlayId(null);
  }, [activePageIndex]);

  // Redact mode tool switch: "draw" box vs "select" & move/resize
  const [redactTool, setRedactTool] = useState<"draw" | "select">("draw");

  // Password prompt state
  const [passwordPrompt, setPasswordPrompt] = useState<PasswordPromptState | null>(null);
  const [passwordInput, setPasswordInput] = useState<string>("");

  // In-memory binary storage for uploaded PDFs and session passwords (never stored on disk/server)
  const sourcePdfBytesRef = useRef<Map<string, Uint8Array>>(new Map());
  const sourcePasswordsRef = useRef<Map<string, string>>(new Map());
  const encryptedSourceIdsRef = useRef<Set<string>>(new Set());
  const pendingSourceIdsRef = useRef<Set<string>>(new Set());

  // Helper to purge source PDFs only when unreferenced by pages, undoStack & redoStack (F7, G1)
  const purgeUnreferencedSources = useCallback(() => {
    const referencedSourceIds = new Set<string>();
    const collect = (pList: StudioPage[]) => {
      for (const p of pList) {
        if (p.sourceId) referencedSourceIds.add(p.sourceId);
      }
    };
    collect(pages);
    for (const snap of undoRef.current) collect(snap);
    for (const snap of redoRef.current) collect(snap);

    for (const sId of Array.from(sourcePdfBytesRef.current.keys())) {
      if (!referencedSourceIds.has(sId) && !pendingSourceIdsRef.current.has(sId)) {
        sourcePdfBytesRef.current.delete(sId);
        sourcePasswordsRef.current.delete(sId);
        encryptedSourceIdsRef.current.delete(sId);
      }
    }
  }, [pages]);

  // G1: One single useEffect for source purge
  useEffect(() => {
    purgeUnreferencedSources();
  }, [pages, undoStack, redoStack, purgeUnreferencedSources]);

  // History push: creates 1 snapshot per action, trimmed to 50, with sliding window coalescing (G3, Stage 6)
  const pushHistory = useCallback((groupKey?: string, windowMs = 800, currentPages?: StudioPage[]) => {
    const now = Date.now();
    if (groupKey) {
      const last = lastHistoryPushTimeRef.current[groupKey] || 0;
      lastHistoryPushTimeRef.current[groupKey] = now; // update on every call
      if (last > 0 && now - last < windowMs) {
        return; // Part of current active burst: skip push
      }
    }

    const snapshot = currentPages || pagesRef.current;
    if (!snapshot.length) return;

    const newUndo = [...undoRef.current, snapshot];
    if (newUndo.length > 50) {
      newUndo.shift();
    }
    undoRef.current = newUndo;
    redoRef.current = [];

    setUndoStack(newUndo);
    setRedoStack([]);
  }, []);

  const handleUndo = useCallback(() => {
    if (undoRef.current.length === 0) return;
    const previous = undoRef.current[undoRef.current.length - 1];
    const newUndo = undoRef.current.slice(0, -1);
    const current = pagesRef.current;

    undoRef.current = newUndo;
    redoRef.current = [...redoRef.current, current];

    setUndoStack(newUndo);
    setRedoStack(redoRef.current);
    setPages(previous);
    setSelectedOverlayId(null);
    setActivePageIndex((idx) => Math.min(idx, Math.max(0, previous.length - 1)));
  }, []);

  const handleRedo = useCallback(() => {
    if (redoRef.current.length === 0) return;
    const next = redoRef.current[redoRef.current.length - 1];
    const newRedo = redoRef.current.slice(0, -1);
    const current = pagesRef.current;

    const newUndo = [...undoRef.current, current];
    if (newUndo.length > 50) newUndo.shift();

    undoRef.current = newUndo;
    redoRef.current = newRedo;

    setUndoStack(newUndo);
    setRedoStack(newRedo);
    setPages(next);
    setSelectedOverlayId(null);
    setActivePageIndex((idx) => Math.min(idx, Math.max(0, next.length - 1)));
  }, []);

  // Toasts (Stage 1)
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    const id = "t-" + Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Confirm dialogs (Stage 1)
  const [confirmState, setConfirmState] = useState<{
    options: ConfirmDialogOptions;
    resolve: (val: boolean) => void;
  } | null>(null);

  const confirmAction = useCallback((options: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ options, resolve });
    });
  }, []);

  const handleConfirmConfirm = useCallback(() => {
    confirmState?.resolve(true);
    setConfirmState(null);
  }, [confirmState]);

  const handleConfirmCancel = useCallback(() => {
    confirmState?.resolve(false);
    setConfirmState(null);
  }, [confirmState]);

  // Image cache to eliminate lag and flicker
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const sigImageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const activePageIdRef = useRef<string | null>(null);

  // Text Tool settings (Batch 2A: pt size, normal weight default, style, ref)
  const [textValue, setTextValue] = useState<string>("Sample Text");
  const [textFont, setTextFont] = useState<string>("Inter, sans-serif");
  const [textPtSize, setTextPtSize] = useState<number>(12);
  const [textWeight, setTextWeight] = useState<"normal" | "bold">("normal");
  const [textStyle, setTextStyle] = useState<"normal" | "italic">("normal");
  const [textColor, setTextColor] = useState<string>("#1c201a");
  const [textBg, setTextBg] = useState<string>("transparent");
  const textInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Redact settings
  const [redactStyle, setRedactStyle] = useState<"blackout" | "blur" | "whiteout">("blackout");

  // Whiteout settings (Batch 2A & Stage 6 proper typing)
  const [whiteoutTone, setWhiteoutTone] = useState<"auto" | "white" | "cream" | "gray" | "custom">("auto");
  const [customWhiteoutColor, setCustomWhiteoutColor] = useState<string>("#ffffff");
  const [whiteoutColor, setWhiteoutColor] = useState<string>("#ffffff");
  const [isColorPicking, setIsColorPicking] = useState<boolean>(false);

  // Stamp settings
  const [selectedStamp, setSelectedStamp] = useState<string>("PAID");

  // Signature canvas modal state
  const [isSignatureOpen, setIsSignatureOpen] = useState<boolean>(false);
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawingSig, setIsDrawingSig] = useState<boolean>(false);
  const lastSigPointRef = useRef<{ x: number; y: number } | null>(null);

  // Interactive Canvas refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const isMouseDownRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const currentRectRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const activeOverlayDragRef = useRef<{
    overlayId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const liveOverlayPosRef = useRef<{ id: string; x: number; y: number } | null>(null);

  // Resize Handle drag tracking (Batch 2A & G5)
  const activeResizeRef = useRef<{
    handle: "tl" | "tr" | "br" | "bl";
    overlayId: string;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
    origFontSize?: number;
    startMouseX: number;
    startMouseY: number;
  } | null>(null);
  const liveResizeRef = useRef<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize?: number;
  } | null>(null);

  // Canvas Viewport & Zoom State
  const [zoom, setZoom] = useState<number>(1);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const appendFileInputRef = useRef<HTMLInputElement | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Filmstrip thumbnail element refs for scroll-into-view (Stage 4)
  const desktopFilmstripRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mobileFilmstripRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    desktopFilmstripRefs.current[activePageIndex]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
    mobileFilmstripRefs.current[activePageIndex]?.scrollIntoView({
      behavior: "smooth",
      inline: "nearest",
    });
  }, [activePageIndex]);

  // Active page helpers
  const activePage = pages[activePageIndex] || null;

  const getPtWidth = useCallback((page: StudioPage) => {
    const isRot = page.rotation === 90 || page.rotation === 270;
    return isRot ? page.ptHeight || 841.89 : page.ptWidth || 595.28;
  }, []);

  const getPreviewWidth = useCallback((page: StudioPage) => {
    const isRot = page.rotation === 90 || page.rotation === 270;
    return isRot ? page.height : page.width;
  }, []);

  const ptToPx = useCallback((pt: number, page: StudioPage) => {
    const ptW = getPtWidth(page);
    const prevW = getPreviewWidth(page);
    return Math.round(pt * (prevW / ptW));
  }, [getPtWidth, getPreviewWidth]);

  const pxToPt = useCallback((px: number, page: StudioPage) => {
    const ptW = getPtWidth(page);
    const prevW = getPreviewWidth(page);
    return Math.max(8, Math.min(72, Math.round(px * (ptW / prevW))));
  }, [getPtWidth, getPreviewWidth]);

  const measureTextOverlay = useCallback((
    text: string,
    fontSize: number,
    fontFamily: string,
    fontWeight: string,
    fontStyle: string,
    canvasW: number,
    canvasH: number,
    rot: number
  ) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return { widthPct: 20, heightPct: 5 };
    ctx.font = `${fontStyle || "normal"} ${fontWeight || "normal"} ${fontSize}px ${fontFamily || "Inter, sans-serif"}`;
    const lines = (text || " ").split("\n");
    let maxLineWidth = 0;
    for (const line of lines) {
      const metrics = ctx.measureText(line || " ");
      if (metrics.width > maxLineWidth) maxLineWidth = metrics.width;
    }
    const unrotatedW = maxLineWidth + 12;
    const lineHeight = fontSize * 1.25;
    const unrotatedH = lines.length * lineHeight + 8;

    const isContentRotated = rot === 90 || rot === 270;
    const boxW = isContentRotated ? unrotatedH : unrotatedW;
    const boxH = isContentRotated ? unrotatedW : unrotatedH;

    const widthPct = Math.max(1, Math.min(100, Math.round((boxW / canvasW) * 10000) / 100));
    const heightPct = Math.max(0.5, Math.min(100, Math.round((boxH / canvasH) * 10000) / 100));
    return { widthPct, heightPct };
  }, []);

  // Clean offscreen page image without overlays
  const getCleanPageImageCanvas = useCallback((page: StudioPage) => {
    const img = imageCacheRef.current.get(page.id);
    if (!img) return null;
    const isRotated = page.rotation === 90 || page.rotation === 270;
    const targetW = isRotated ? img.naturalHeight || img.height : img.naturalWidth || img.width;
    const targetH = isRotated ? img.naturalWidth || img.width : img.naturalHeight || img.height;

    const offCanvas = document.createElement("canvas");
    offCanvas.width = targetW;
    offCanvas.height = targetH;
    const ctx = offCanvas.getContext("2d");
    if (!ctx) return null;

    ctx.save();
    ctx.translate(targetW / 2, targetH / 2);
    ctx.rotate((page.rotation * Math.PI) / 180);
    const naturalW = img.naturalWidth || img.width;
    const naturalH = img.naturalHeight || img.height;
    ctx.drawImage(img, -naturalW / 2, -naturalH / 2, naturalW, naturalH);
    ctx.restore();

    return { canvas: offCanvas, ctx, width: targetW, height: targetH };
  }, []);

  // G6: Fast 4-strip Auto Whiteout sampling (median per-channel)
  const sampleAutoWhiteoutColor = useCallback((
    page: StudioPage,
    boxX: number,
    boxY: number,
    boxW: number,
    boxH: number
  ): string => {
    const clean = getCleanPageImageCanvas(page);
    if (!clean) return "#ffffff";
    const { ctx, width: cW, height: cH } = clean;

    const ringThickness = 3;
    const minX = Math.max(0, Math.round(boxX - ringThickness));
    const minY = Math.max(0, Math.round(boxY - ringThickness));
    const maxX = Math.min(cW, Math.round(boxX + boxW + ringThickness));
    const maxY = Math.min(cH, Math.round(boxY + boxH + ringThickness));

    const rVals: number[] = [];
    const gVals: number[] = [];
    const bVals: number[] = [];

    const sampleRect = (rx: number, ry: number, rw: number, rh: number) => {
      if (rw <= 0 || rh <= 0) return;
      try {
        const imgData = ctx.getImageData(rx, ry, rw, rh);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          rVals.push(data[i]);
          gVals.push(data[i + 1]);
          bVals.push(data[i + 2]);
        }
      } catch (_) {}
    };

    // 1. Top strip
    if (minY < boxY) {
      sampleRect(minX, minY, maxX - minX, Math.round(boxY - minY));
    }
    // 2. Bottom strip
    const boxBottom = boxY + boxH;
    if (maxY > boxBottom) {
      sampleRect(minX, Math.round(boxBottom), maxX - minX, Math.round(maxY - boxBottom));
    }
    // 3. Left strip
    if (minX < boxX) {
      sampleRect(minX, Math.round(boxY), Math.round(boxX - minX), Math.round(boxH));
    }
    // 4. Right strip
    const boxRight = boxX + boxW;
    if (maxX > boxRight) {
      sampleRect(Math.round(boxRight), Math.round(boxY), Math.round(maxX - boxRight), Math.round(boxH));
    }

    if (rVals.length === 0) return "#ffffff";

    const median = (arr: number[]) => {
      arr.sort((a, b) => a - b);
      const mid = Math.floor(arr.length / 2);
      return arr.length % 2 !== 0 ? arr[mid] : Math.round((arr[mid - 1] + arr[mid]) / 2);
    };

    const toHex = (n: number) => n.toString(16).padStart(2, "0");
    return `#${toHex(median(rVals))}${toHex(median(gVals))}${toHex(median(bVals))}`;
  }, [getCleanPageImageCanvas]);

  const getHandleAtPoint = useCallback((
    mouseX: number,
    mouseY: number,
    ov: OverlayItem,
    canvasW: number,
    canvasH: number,
    hitRadius: number
  ): "tl" | "tr" | "br" | "bl" | null => {
    const ox = (ov.x / 100) * canvasW;
    const oy = (ov.y / 100) * canvasH;
    const ow = (ov.width / 100) * canvasW;
    const oh = (ov.height / 100) * canvasH;

    const handles: { key: "tl" | "tr" | "br" | "bl"; x: number; y: number }[] = [
      { key: "tl", x: ox, y: oy },
      { key: "tr", x: ox + ow, y: oy },
      { key: "br", x: ox + ow, y: oy + oh },
      { key: "bl", x: ox, y: oy + oh },
    ];

    for (const h of handles) {
      const dist = Math.hypot(mouseX - h.x, mouseY - h.y);
      if (dist <= hitRadius) return h.key;
    }
    return null;
  }, []);

  // ── Unified Overlay Drawing (Shared between Preview and Export) (F4, Batch 2A, G5) ────────
  const drawOverlays = useCallback((
    ctx: CanvasRenderingContext2D,
    overlays: OverlayItem[],
    targetW: number,
    targetH: number,
    scaleFactor: number,
    liveDrag?: { id: string; x: number; y: number } | null,
    liveResize?: { id: string; x: number; y: number; width: number; height: number; fontSize?: number } | null,
    selectedId?: string | null,
    onImagePending?: () => void,
    handleSizePx?: number
  ) => {
    for (const ov of overlays) {
      const isLiveDrag = liveDrag && liveDrag.id === ov.id;
      const isLiveResize = liveResize && liveResize.id === ov.id;

      const curX = isLiveResize ? liveResize.x : isLiveDrag ? liveDrag.x : ov.x;
      const curY = isLiveResize ? liveResize.y : isLiveDrag ? liveDrag.y : ov.y;
      const curW = isLiveResize ? liveResize.width : ov.width;
      const curH = isLiveResize ? liveResize.height : ov.height;
      const curFontSize = isLiveResize && liveResize.fontSize ? liveResize.fontSize : ov.fontSize;

      const ox = (curX / 100) * targetW;
      const oy = (curY / 100) * targetH;
      const ow = (curW / 100) * targetW;
      const oh = (curH / 100) * targetH;

      const rot = ov.rot || 0;
      const cx = ox + ow / 2;
      const cy = oy + oh / 2;
      const contentW = (rot === 90 || rot === 270) ? oh : ow;
      const contentH = (rot === 90 || rot === 270) ? ow : oh;

      if (ov.type === "whiteout") {
        ctx.fillStyle = ov.bgColor || "#ffffff";
        ctx.fillRect(ox, oy, ow, oh);
      } else if (ov.type === "redact") {
        if (ov.redactStyle === "whiteout") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(ox, oy, ow, oh);
        } else if (ov.redactStyle === "blur") {
          ctx.save();
          const pw = Math.max(1, Math.round(ow / 12));
          const ph = Math.max(1, Math.round(oh / 6));
          try {
            const snap = ctx.getImageData(ox, oy, ow, oh);
            const tmpCanvas = document.createElement("canvas");
            tmpCanvas.width = pw;
            tmpCanvas.height = ph;
            const tmpCtx = tmpCanvas.getContext("2d");
            if (tmpCtx) {
              const snapCanvas = document.createElement("canvas");
              snapCanvas.width = ow;
              snapCanvas.height = oh;
              const snapCtx = snapCanvas.getContext("2d");
              if (snapCtx) {
                snapCtx.putImageData(snap, 0, 0);
                tmpCtx.drawImage(snapCanvas, 0, 0, pw, ph);
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(tmpCanvas, ox, oy, ow, oh);
                ctx.imageSmoothingEnabled = true;
              }
            }
          } catch (_) {
            ctx.fillStyle = "#1e293b";
            ctx.fillRect(ox, oy, ow, oh);
          }
          ctx.restore();
        } else {
          ctx.fillStyle = "#000000";
          ctx.fillRect(ox, oy, ow, oh);
        }
      } else if (ov.type === "text") {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((rot * Math.PI) / 180);

        if (ov.bgColor && ov.bgColor !== "transparent") {
          ctx.fillStyle = ov.bgColor;
          ctx.fillRect(-contentW / 2, -contentH / 2, contentW, contentH);
        }

        const fontSize = Math.round((curFontSize || 18) * scaleFactor);
        const style = ov.fontStyle || "normal";
        const weight = ov.fontWeight || "normal";
        const family = ov.fontFamily || "Inter, sans-serif";
        ctx.font = `${style} ${weight} ${fontSize}px ${family}`;
        ctx.fillStyle = ov.color || "#1c201a";
        ctx.textBaseline = "top";

        const lines = (ov.text || "").split("\n");
        const lineHeight = fontSize * 1.25;
        const textStartX = -contentW / 2 + 6 * scaleFactor;
        const textStartY = -contentH / 2 + 4 * scaleFactor;

        lines.forEach((line, idx) => {
          ctx.fillText(line, textStartX, textStartY + idx * lineHeight);
        });
        ctx.restore();
      } else if (ov.type === "signature" || ov.type === "stamp") {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((rot * Math.PI) / 180);

        if (ov.imageData) {
          let sigImg = sigImageCacheRef.current.get(ov.id);
          if (!sigImg) {
            sigImg = new Image();
            sigImg.src = ov.imageData;
            sigImageCacheRef.current.set(ov.id, sigImg);
            if (!sigImg.complete && onImagePending) {
              sigImg.onload = () => onImagePending();
            }
          }
          if (sigImg && sigImg.complete && sigImg.naturalWidth > 0) {
            ctx.drawImage(sigImg, -contentW / 2, -contentH / 2, contentW, contentH);
          }
        }
        ctx.restore();
      }

      // Draw active selection box & corner resize handles
      if (selectedId && ov.id === selectedId) {
        ctx.save();
        ctx.strokeStyle = "#3158d5";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(ox - 2, oy - 2, ow + 4, oh + 4);
        ctx.setLineDash([]); // clear dash for corner handles

        const hSize = handleSizePx || Math.max(7, Math.min(14, Math.round(8 * scaleFactor)));
        const corners = [
          [ox, oy],
          [ox + ow, oy],
          [ox + ow, oy + oh],
          [ox, oy + oh],
        ];
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#3158d5";
        ctx.lineWidth = 1.5;
        for (const [hx, hy] of corners) {
          ctx.fillRect(hx - hSize / 2, hy - hSize / 2, hSize, hSize);
          ctx.strokeRect(hx - hSize / 2, hy - hSize / 2, hSize, hSize);
        }
        ctx.restore();
      }
    }
  }, []);

  // ── Render Page on Canvas ──────────────────────────────────────────────────
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activePage) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pageId = activePage.id;
    activePageIdRef.current = pageId;

    const drawPageWithImage = (img: HTMLImageElement) => {
      if (activePageIdRef.current !== pageId) return;

      const isRotated = activePage.rotation === 90 || activePage.rotation === 270;
      const targetW = isRotated ? img.naturalHeight || img.height : img.naturalWidth || img.width;
      const targetH = isRotated ? img.naturalWidth || img.width : img.naturalHeight || img.height;

      if (canvas.width !== targetW) canvas.width = targetW;
      if (canvas.height !== targetH) canvas.height = targetH;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((activePage.rotation * Math.PI) / 180);
      const naturalW = img.naturalWidth || img.width;
      const naturalH = img.naturalHeight || img.height;
      ctx.drawImage(img, -naturalW / 2, -naturalH / 2, naturalW, naturalH);
      ctx.restore();

      // G5: Constant on-screen handle square size ~10 CSS px
      const rect = canvas.getBoundingClientRect();
      const canvasToCssRatio = rect.width > 0 ? canvas.width / rect.width : 1;
      const handleSizePx = 10 * canvasToCssRatio;

      drawOverlays(
        ctx,
        activePage.overlays,
        targetW,
        targetH,
        1,
        liveOverlayPosRef.current,
        liveResizeRef.current,
        selectedOverlayId,
        () => scheduleRedraw(),
        handleSizePx
      );

      // Draw active dragging box preview
      if (isMouseDownRef.current && currentRectRef.current) {
        const { x, y, w, h } = currentRectRef.current;
        if (mode === "redact") {
          ctx.fillStyle = redactStyle === "blur" ? "rgba(30, 41, 59, 0.75)" : "rgba(0, 0, 0, 0.85)";
          ctx.fillRect(x, y, w, h);
          ctx.strokeStyle = "#dc2626";
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, w, h);
        } else if (tool === "whiteout") {
          ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
          ctx.fillRect(x, y, w, h);
          ctx.strokeStyle = "#3158d5";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x, y, w, h);
        }
      }
    };

    let cachedImg = imageCacheRef.current.get(pageId);
    if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
      drawPageWithImage(cachedImg);
    } else {
      const img = new Image();
      img.onload = () => {
        imageCacheRef.current.set(pageId, img);
        if (activePageIdRef.current === pageId) {
          drawPageWithImage(img);
        }
      };
      img.src = activePage.url;
    }
  }, [activePage, selectedOverlayId, mode, tool, redactStyle, drawOverlays]);

  // G2: Always use the latest renderCanvas reference to prevent stale redraws
  const renderCanvasRef = useRef(renderCanvas);
  renderCanvasRef.current = renderCanvas;

  // Coalesced redraw with requestAnimationFrame during dragging (G2)
  const scheduleRedraw = useCallback(() => {
    if (rafIdRef.current !== null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      renderCanvasRef.current();
    });
  }, []);

  // G2: Cancel pending rAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    scheduleRedraw();
  }, [activePageIndex, pages, mode, tool, redactStyle, selectedOverlayId, scheduleRedraw]);

  // Stage 4: Redraw canvas on zoom change and viewport resize (ResizeObserver)
  useEffect(() => {
    scheduleRedraw();
  }, [zoom, scheduleRedraw]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      scheduleRedraw();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [scheduleRedraw]);

  // ── Canvas Interaction Handlers ───────────────────────────────────────────
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !activePage) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    // Eyedropper click-to-pick fallback: take exact pixel under pointer from clean offscreen canvas (G6)
    if (isColorPicking) {
      const clean = getCleanPageImageCanvas(activePage);
      let pickedColor = "#ffffff";
      if (clean) {
        try {
          const pixel = clean.ctx.getImageData(Math.round(mouseX), Math.round(mouseY), 1, 1).data;
          const toHex = (n: number) => n.toString(16).padStart(2, "0");
          pickedColor = `#${toHex(pixel[0])}${toHex(pixel[1])}${toHex(pixel[2])}`;
        } catch (_) {}
      }
      setCustomWhiteoutColor(pickedColor);
      setWhiteoutTone("custom");
      setWhiteoutColor(pickedColor);
      setIsColorPicking(false);
      return;
    }

    // 1. Check if clicking a corner resize handle of the selected overlay (in ANY tool/mode)
    if (selectedOverlayId) {
      const selOv = activePage.overlays.find((o) => o.id === selectedOverlayId);
      if (selOv) {
        const hitRadius = (e.pointerType === "touch" ? 24 : 12) * scaleX;
        const handle = getHandleAtPoint(mouseX, mouseY, selOv, canvas.width, canvas.height, hitRadius);
        if (handle) {
          activeResizeRef.current = {
            handle,
            overlayId: selOv.id,
            origX: selOv.x,
            origY: selOv.y,
            origW: selOv.width,
            origH: selOv.height,
            origFontSize: selOv.fontSize || 18,
            startMouseX: mouseX,
            startMouseY: mouseY,
          };
          isMouseDownRef.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          return;
        }
      }
    }

    // 2. Text tool placement
    if (mode === "edit" && tool === "text") {
      let hitId: string | null = null;
      for (let i = activePage.overlays.length - 1; i >= 0; i--) {
        const ov = activePage.overlays[i];
        const ox = (ov.x / 100) * canvas.width;
        const oy = (ov.y / 100) * canvas.height;
        const ow = (ov.width / 100) * canvas.width;
        const oh = (ov.height / 100) * canvas.height;

        if (mouseX >= ox && mouseX <= ox + ow && mouseY >= oy && mouseY <= oy + oh) {
          hitId = ov.id;
          activeOverlayDragRef.current = {
            overlayId: ov.id,
            startX: mouseX,
            startY: mouseY,
            origX: ov.x,
            origY: ov.y,
          };
          break;
        }
      }
      if (hitId) {
        setSelectedOverlayId(hitId);
        isMouseDownRef.current = true;
        scheduleRedraw();
        return;
      }

      pushHistory();
      const fontSizePx = ptToPx(textPtSize, activePage);
      const { widthPct, heightPct } = measureTextOverlay(
        textValue || "Sample Text",
        fontSizePx,
        textFont,
        textWeight,
        textStyle,
        canvas.width,
        canvas.height,
        0
      );

      const newOverlay: OverlayItem = {
        id: "ov-" + Date.now(),
        type: "text",
        x: Math.max(0, Math.min(100 - widthPct, (mouseX / canvas.width) * 100)),
        y: Math.max(0, Math.min(100 - heightPct, (mouseY / canvas.height) * 100)),
        width: widthPct,
        height: heightPct,
        rot: 0,
        text: textValue || "Sample Text",
        fontSize: fontSizePx,
        fontFamily: textFont,
        fontWeight: textWeight,
        fontStyle: textStyle,
        color: textColor,
        bgColor: textBg,
      };

      setPages((prev) =>
        prev.map((p, idx) =>
          idx === activePageIndex ? { ...p, overlays: [...p.overlays, newOverlay] } : p
        )
      );
      setSelectedOverlayId(newOverlay.id);
      scheduleRedraw();
      return;
    }

    // 3. Selection tool or Redact select mode
    if ((mode === "edit" && tool === "select") || (mode === "redact" && redactTool === "select")) {
      let hitId: string | null = null;
      for (let i = activePage.overlays.length - 1; i >= 0; i--) {
        const ov = activePage.overlays[i];
        const ox = (ov.x / 100) * canvas.width;
        const oy = (ov.y / 100) * canvas.height;
        const ow = (ov.width / 100) * canvas.width;
        const oh = (ov.height / 100) * canvas.height;

        if (mouseX >= ox && mouseX <= ox + ow && mouseY >= oy && mouseY <= oy + oh) {
          hitId = ov.id;
          activeOverlayDragRef.current = {
            overlayId: ov.id,
            startX: mouseX,
            startY: mouseY,
            origX: ov.x,
            origY: ov.y,
          };
          break;
        }
      }
      setSelectedOverlayId(hitId);
      isMouseDownRef.current = true;
      scheduleRedraw();
      return;
    }

    // 4. Creating new Whiteout or Redact box
    if (tool === "whiteout" || (mode === "redact" && redactTool === "draw")) {
      isMouseDownRef.current = true;
      dragStartRef.current = { x: mouseX, y: mouseY };
      currentRectRef.current = { x: mouseX, y: mouseY, w: 0, h: 0 };
      setSelectedOverlayId(null);
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !activePage) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    // Resizing an existing overlay handle (Batch 2A, G5)
    if (isMouseDownRef.current && activeResizeRef.current) {
      const resize = activeResizeRef.current;
      const targetOv = activePage.overlays.find((o) => o.id === resize.overlayId);
      if (!targetOv) return;

      const dxPct = ((mouseX - resize.startMouseX) / canvas.width) * 100;
      const dyPct = ((mouseY - resize.startMouseY) / canvas.height) * 100;

      let newX = resize.origX;
      let newY = resize.origY;
      let newW = resize.origW;
      let newH = resize.origH;

      if (resize.handle === "br") {
        newW = resize.origW + dxPct;
        newH = resize.origH + dyPct;
      } else if (resize.handle === "bl") {
        newX = resize.origX + dxPct;
        newW = resize.origW - dxPct;
        newH = resize.origH + dyPct;
      } else if (resize.handle === "tr") {
        newY = resize.origY + dyPct;
        newW = resize.origW + dxPct;
        newH = resize.origH - dyPct;
      } else if (resize.handle === "tl") {
        newX = resize.origX + dxPct;
        newY = resize.origY + dyPct;
        newW = resize.origW - dxPct;
        newH = resize.origH - dyPct;
      }

      // Minimum size enforcement (min 1.5% or 10px)
      const minWPct = (10 / canvas.width) * 100;
      const minHPct = (10 / canvas.height) * 100;
      if (newW < minWPct) {
        newW = minWPct;
        if (resize.handle === "tl" || resize.handle === "bl") newX = resize.origX + resize.origW - minWPct;
      }
      if (newH < minHPct) {
        newH = minHPct;
        if (resize.handle === "tl" || resize.handle === "tr") newY = resize.origY + resize.origH - minHPct;
      }

      // G5: Aspect ratio lock for signature and stamp with bound clamping
      if (targetOv.type === "signature" || targetOv.type === "stamp") {
        const aspect = (resize.origW * canvas.width) / (resize.origH * canvas.height);
        const newWPx = (newW / 100) * canvas.width;
        const newHPx = newWPx / (aspect || 1);
        newH = (newHPx / canvas.height) * 100;
        if (resize.handle === "tl" || resize.handle === "tr") {
          newY = resize.origY + resize.origH - newH;
        }

        // Clamp to canvas bounds while preserving aspect ratio
        if (newX < 0) {
          newX = 0;
          newW = resize.origW + resize.origX;
          const adjHPx = ((newW / 100) * canvas.width) / (aspect || 1);
          newH = (adjHPx / canvas.height) * 100;
          if (resize.handle === "tl" || resize.handle === "tr") {
            newY = resize.origY + resize.origH - newH;
          }
        }
        if (newY < 0) {
          newY = 0;
          newH = resize.origH + resize.origY;
          const adjWPx = ((newH / 100) * canvas.height) * (aspect || 1);
          newW = (adjWPx / canvas.width) * 100;
          if (resize.handle === "tl" || resize.handle === "bl") {
            newX = resize.origX + resize.origW - newW;
          }
        }
        if (newX + newW > 100) {
          newW = 100 - newX;
          const adjHPx = ((newW / 100) * canvas.width) / (aspect || 1);
          newH = (adjHPx / canvas.height) * 100;
          if (resize.handle === "tl" || resize.handle === "tr") {
            newY = resize.origY + resize.origH - newH;
          }
        }
        if (newY + newH > 100) {
          newH = 100 - newY;
          const adjWPx = ((newH / 100) * canvas.height) * (aspect || 1);
          newW = (adjWPx / canvas.width) * 100;
          if (resize.handle === "tl" || resize.handle === "bl") {
            newX = resize.origX + resize.origW - newW;
          }
        }
      }

      // G5: Text font size scaling: recompute width & height with measureTextOverlay keeping opposite corner fixed
      let newFontSize = targetOv.fontSize || 18;
      if (targetOv.type === "text" && resize.origW > 0) {
        const scale = Math.max(0.2, newW / resize.origW);
        newFontSize = Math.max(8, Math.min(144, Math.round((resize.origFontSize || 18) * scale)));
        const { widthPct, heightPct } = measureTextOverlay(
          targetOv.text || "",
          newFontSize,
          targetOv.fontFamily || "Inter, sans-serif",
          targetOv.fontWeight || "normal",
          targetOv.fontStyle || "normal",
          canvas.width,
          canvas.height,
          targetOv.rot || 0
        );
        newW = widthPct;
        newH = heightPct;

        if (resize.handle === "br") {
          newX = resize.origX;
          newY = resize.origY;
        } else if (resize.handle === "bl") {
          newX = resize.origX + resize.origW - newW;
          newY = resize.origY;
        } else if (resize.handle === "tr") {
          newX = resize.origX;
          newY = resize.origY + resize.origH - newH;
        } else if (resize.handle === "tl") {
          newX = resize.origX + resize.origW - newW;
          newY = resize.origY + resize.origH - newH;
        }
      } else {
        // Clamping for non-text boxes
        if (newX < 0) { newW += newX; newX = 0; }
        if (newY < 0) { newH += newY; newY = 0; }
        if (newX + newW > 100) newW = 100 - newX;
        if (newY + newH > 100) newH = 100 - newY;
      }

      newX = Math.max(0, Math.min(100 - newW, newX));
      newY = Math.max(0, Math.min(100 - newH, newY));

      liveResizeRef.current = {
        id: resize.overlayId,
        x: newX,
        y: newY,
        width: newW,
        height: newH,
        ...(targetOv.type === "text" ? { fontSize: newFontSize } : {}),
      };
      scheduleRedraw();
      return;
    }

    // Dragging an existing overlay
    if (isMouseDownRef.current && activeOverlayDragRef.current) {
      const drag = activeOverlayDragRef.current;
      const targetOv = activePage.overlays.find((o) => o.id === drag.overlayId);
      const ovW = targetOv ? targetOv.width : 20;
      const ovH = targetOv ? targetOv.height : 10;
      const dxPercent = ((mouseX - drag.startX) / canvas.width) * 100;
      const dyPercent = ((mouseY - drag.startY) / canvas.height) * 100;

      liveOverlayPosRef.current = {
        id: drag.overlayId,
        x: Math.max(0, Math.min(100 - ovW, drag.origX + dxPercent)),
        y: Math.max(0, Math.min(100 - ovH, drag.origY + dyPercent)),
      };
      scheduleRedraw();
      return;
    }

    // Dragging new box
    if (isMouseDownRef.current && dragStartRef.current) {
      const x = Math.min(dragStartRef.current.x, mouseX);
      const y = Math.min(dragStartRef.current.y, mouseY);
      const w = Math.abs(mouseX - dragStartRef.current.x);
      const h = Math.abs(mouseY - dragStartRef.current.y);

      currentRectRef.current = { x, y, w, h };
      scheduleRedraw();
      return;
    }

    // Hover cursor for resize handles
    if (!isMouseDownRef.current && selectedOverlayId && activePage) {
      const selOv = activePage.overlays.find((o) => o.id === selectedOverlayId);
      if (selOv) {
        const hitRadius = 12 * scaleX;
        const handle = getHandleAtPoint(mouseX, mouseY, selOv, canvas.width, canvas.height, hitRadius);
        if (handle === "tl" || handle === "br") {
          canvas.style.cursor = "nwse-resize";
          return;
        } else if (handle === "tr" || handle === "bl") {
          canvas.style.cursor = "nesw-resize";
          return;
        }
      }
    }

    // Default cursor
    if (!isMouseDownRef.current) {
      canvas.style.cursor = isColorPicking
        ? "copy"
        : mode === "redact"
        ? redactTool === "draw" ? "crosshair" : "default"
        : tool === "whiteout"
        ? "crosshair"
        : tool === "text"
        ? "text"
        : "default";
    }
  };

  const handleCanvasPointerUp = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (e && e.currentTarget.hasPointerCapture(e.pointerId)) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }

    isMouseDownRef.current = false;

    // 1. Commit active resize (Batch 2A, G5)
    if (activeResizeRef.current && liveResizeRef.current) {
      pushHistory();
      const { id, x, y, width, height, fontSize } = liveResizeRef.current;
      setPages((prev) =>
        prev.map((p, idx) =>
          idx === activePageIndex
            ? {
                ...p,
                overlays: p.overlays.map((ov) =>
                  ov.id === id ? { ...ov, x, y, width, height, ...(ov.type === "text" && fontSize ? { fontSize } : {}) } : ov
                ),
              }
            : p
        )
      );
      liveResizeRef.current = null;
      activeResizeRef.current = null;
      scheduleRedraw();
      return;
    }

    activeResizeRef.current = null;
    liveResizeRef.current = null;

    // 2. Commit active overlay drag (move)
    if (activeOverlayDragRef.current && liveOverlayPosRef.current) {
      pushHistory();
      const { id, x, y } = liveOverlayPosRef.current;
      setPages((prev) =>
        prev.map((p, idx) =>
          idx === activePageIndex
            ? {
                ...p,
                overlays: p.overlays.map((ov) =>
                  ov.id === id ? { ...ov, x, y } : ov
                ),
              }
            : p
        )
      );
      liveOverlayPosRef.current = null;
      activeOverlayDragRef.current = null;
      scheduleRedraw();
      return;
    }

    activeOverlayDragRef.current = null;
    liveOverlayPosRef.current = null;

    // 3. Commit new box creation (Whiteout or Redact)
    const canvas = canvasRef.current;
    if (!canvas || !currentRectRef.current || !activePage) {
      currentRectRef.current = null;
      scheduleRedraw();
      return;
    }

    const { x, y, w, h } = currentRectRef.current;
    currentRectRef.current = null;

    if (w > 6 && h > 6) {
      pushHistory();
      const xPct = (x / canvas.width) * 100;
      const yPct = (y / canvas.height) * 100;
      const wPct = (w / canvas.width) * 100;
      const hPct = (h / canvas.height) * 100;

      const newId = "ov-" + Date.now();
      let created: OverlayItem;

      if (mode === "redact") {
        created = {
          id: newId,
          type: "redact",
          x: xPct,
          y: yPct,
          width: wPct,
          height: hPct,
          redactStyle,
        };
      } else {
        let finalBgColor = whiteoutColor;
        if (whiteoutTone === "auto") {
          finalBgColor = sampleAutoWhiteoutColor(activePage, x, y, w, h);
        } else if (whiteoutTone === "cream") {
          finalBgColor = "#fbfbfa";
        } else if (whiteoutTone === "gray") {
          finalBgColor = "#f1f0eb";
        } else if (whiteoutTone === "white") {
          finalBgColor = "#ffffff";
        } else if (whiteoutTone === "custom") {
          finalBgColor = customWhiteoutColor;
        }

        created = {
          id: newId,
          type: "whiteout",
          x: xPct,
          y: yPct,
          width: wPct,
          height: hPct,
          bgColor: finalBgColor,
        };
      }

      setPages((prev) =>
        prev.map((p, idx) =>
          idx === activePageIndex ? { ...p, overlays: [...p.overlays, created] } : p
        )
      );
      setSelectedOverlayId(created.id);
    }
    scheduleRedraw();
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !activePage) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    for (let i = activePage.overlays.length - 1; i >= 0; i--) {
      const ov = activePage.overlays[i];
      if (ov.type === "text") {
        const ox = (ov.x / 100) * canvas.width;
        const oy = (ov.y / 100) * canvas.height;
        const ow = (ov.width / 100) * canvas.width;
        const oh = (ov.height / 100) * canvas.height;
        if (mouseX >= ox && mouseX <= ox + ow && mouseY >= oy && mouseY <= oy + oh) {
          setSelectedOverlayId(ov.id);
          setTimeout(() => {
            textInputRef.current?.focus();
            textInputRef.current?.select();
          }, 50);
          break;
        }
      }
    }
  };

  const handleCanvasPointerCancel = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (e && e.currentTarget.hasPointerCapture(e.pointerId)) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
    isMouseDownRef.current = false;
    dragStartRef.current = null;
    currentRectRef.current = null;
    activeOverlayDragRef.current = null;
    liveOverlayPosRef.current = null;
    activeResizeRef.current = null;
    liveResizeRef.current = null;
    scheduleRedraw();
  };

  const handleCanvasPointerUpRef = useRef(handleCanvasPointerUp);
  handleCanvasPointerUpRef.current = handleCanvasPointerUp;

  // Global window pointer listener to ensure releasing pointer outside canvas always ends dragging (A3, F8)
  useEffect(() => {
    const onWindowPointerUp = (e: PointerEvent) => {
      if (isMouseDownRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handleCanvasPointerUpRef.current(e as any);
      }
    };
    window.addEventListener("pointerup", onWindowPointerUp);
    return () => window.removeEventListener("pointerup", onWindowPointerUp);
  }, []);

  const updateSelectedTextOverlay = useCallback((updates: Partial<OverlayItem>) => {
    if (!selectedOverlayId || !activePage) return;
    setPages((prev) =>
      prev.map((p, idx) => {
        if (idx !== activePageIndex) return p;
        const isRot = p.rotation === 90 || p.rotation === 270;
        const canvasW = isRot ? p.height : p.width;
        const canvasH = isRot ? p.width : p.height;
        return {
          ...p,
          overlays: p.overlays.map((ov) => {
            if (ov.id !== selectedOverlayId || ov.type !== "text") return ov;
            const merged: OverlayItem = { ...ov, ...updates };
            const { widthPct, heightPct } = measureTextOverlay(
              merged.text || "",
              merged.fontSize || 18,
              merged.fontFamily || "Inter, sans-serif",
              merged.fontWeight || "normal",
              merged.fontStyle || "normal",
              canvasW,
              canvasH,
              merged.rot || 0
            );
            return {
              ...merged,
              width: widthPct,
              height: heightPct,
            };
          }),
        };
      })
    );
    scheduleRedraw();
  }, [selectedOverlayId, activePage, activePageIndex, measureTextOverlay, scheduleRedraw]);

  // G4: duplicateOverlay taking overlay id and clamping inside page bounds
  const duplicateOverlay = useCallback((id: string | null) => {
    if (!id || !activePage) return;
    const ov = activePage.overlays.find((o) => o.id === id);
    if (!ov) return;
    pushHistory();
    const dupW = ov.width;
    const dupH = ov.height;
    const dup: OverlayItem = {
      ...ov,
      id: "ov-" + Date.now() + Math.random().toString(36).substring(2, 5),
      x: Math.max(0, Math.min(100 - dupW, ov.x + 2)),
      y: Math.max(0, Math.min(100 - dupH, ov.y + 2)),
    };
    setPages((prev) =>
      prev.map((p, idx) =>
        idx === activePageIndex ? { ...p, overlays: [...p.overlays, dup] } : p
      )
    );
    setSelectedOverlayId(dup.id);
    scheduleRedraw();
  }, [activePage, activePageIndex, pushHistory, scheduleRedraw]);

  const handlePickColorFromPage = async () => {
    if (typeof window !== "undefined" && "EyeDropper" in window) {
      try {
        // @ts-expect-error EyeDropper API
        const eyeDropper = new window.EyeDropper();
        const result = await eyeDropper.open();
        if (result && result.sRGBHex) {
          setCustomWhiteoutColor(result.sRGBHex);
          setWhiteoutColor(result.sRGBHex);
          setWhiteoutTone("custom");
          return;
        }
      } catch (_) {}
    }
    setIsColorPicking(true);
  };

  // Keyboard Shortcuts: Undo (Ctrl+Z), Redo (Ctrl+Shift+Z / Ctrl+Y), Duplicate (Ctrl+D), Delete, Escape, Nudge (Arrow Keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName);

      if (e.key === "Escape") {
        if (isInput) {
          (e.target as HTMLElement).blur();
        }
        setSelectedOverlayId(null);
        if (tool === "text") {
          setTool("select");
        }
        return;
      }

      if (isInput) return;

      // Undo: Ctrl/Cmd+Z (no Shift)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl/Cmd+Shift+Z or Ctrl+Y
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && e.shiftKey) ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y")
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      const hasSelectedOnActivePage = activePage?.overlays.some((ov) => ov.id === selectedOverlayId);

      // Duplicate: Ctrl/Cmd+D (G3, G4)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d" && selectedOverlayId && hasSelectedOnActivePage) {
        e.preventDefault();
        duplicateOverlay(selectedOverlayId);
        return;
      }

      // Delete / Backspace (G3)
      if ((e.key === "Delete" || e.key === "Backspace") && selectedOverlayId && hasSelectedOnActivePage) {
        e.preventDefault();
        pushHistory();
        setPages((prev) =>
          prev.map((p, idx) =>
            idx === activePageIndex
              ? { ...p, overlays: p.overlays.filter((ov) => ov.id !== selectedOverlayId) }
              : p
          )
        );
        setSelectedOverlayId(null);
        scheduleRedraw();
        return;
      }

      // Arrow keys nudge: 0.2% normal, 1% with Shift (G3 coalescing with key "nudge")
      if (
        selectedOverlayId &&
        hasSelectedOnActivePage &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
      ) {
        e.preventDefault();
        pushHistory("nudge", 800);
        const delta = e.shiftKey ? 1.0 : 0.2;
        let dx = 0;
        let dy = 0;
        if (e.key === "ArrowLeft") dx = -delta;
        if (e.key === "ArrowRight") dx = delta;
        if (e.key === "ArrowUp") dy = -delta;
        if (e.key === "ArrowDown") dy = delta;

        setPages((prev) =>
          prev.map((p, idx) => {
            if (idx !== activePageIndex) return p;
            return {
              ...p,
              overlays: p.overlays.map((ov) => {
                if (ov.id !== selectedOverlayId) return ov;
                const newX = Math.max(0, Math.min(100 - ov.width, ov.x + dx));
                const newY = Math.max(0, Math.min(100 - ov.height, ov.y + dy));
                return {
                  ...ov,
                  x: Math.round(newX * 1000) / 1000,
                  y: Math.round(newY * 1000) / 1000,
                };
              }),
            };
          })
        );
        scheduleRedraw();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedOverlayId,
    activePage,
    activePageIndex,
    tool,
    handleUndo,
    handleRedo,
    duplicateOverlay,
    pushHistory,
    scheduleRedraw,
  ]);

  // ── Signature Drawing Handlers (Pointer Events & Precise CSS Scaling) ──────
  const startSigDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const c = sigCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const r = c.getBoundingClientRect();
    const scaleX = c.width / r.width;
    const scaleY = c.height / r.height;
    setIsDrawingSig(true);
    const p = {
      x: (e.clientX - r.left) * scaleX,
      y: (e.clientY - r.top) * scaleY,
    };
    lastSigPointRef.current = p;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = "#1e293b";
    ctx.fill();
  };

  const moveSigDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingSig || !lastSigPointRef.current) return;
    const c = sigCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const r = c.getBoundingClientRect();
    const scaleX = c.width / r.width;
    const scaleY = c.height / r.height;
    const curP = {
      x: (e.clientX - r.left) * scaleX,
      y: (e.clientY - r.top) * scaleY,
    };

    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastSigPointRef.current.x, lastSigPointRef.current.y);
    ctx.lineTo(curP.x, curP.y);
    ctx.stroke();
    lastSigPointRef.current = curP;
  };

  const stopSigDraw = () => {
    setIsDrawingSig(false);
    lastSigPointRef.current = null;
  };

  const clearSigPad = () => {
    const c = sigCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, c.width, c.height);
  };

  const insertSignatureOverlay = () => {
    const c = sigCanvasRef.current;
    if (!c || !activePage) return;
    pushHistory();
    const dataUrl = c.toDataURL("image/png");

    const newOverlay: OverlayItem = {
      id: "ov-" + Date.now(),
      type: "signature",
      x: 35,
      y: 65,
      width: 30,
      height: 12,
      rot: 0,
      imageData: dataUrl,
    };

    setPages((prev) =>
      prev.map((p, idx) =>
        idx === activePageIndex ? { ...p, overlays: [...p.overlays, newOverlay] } : p
      )
    );
    setSelectedOverlayId(newOverlay.id);
    setIsSignatureOpen(false);
    clearSigPad();
    scheduleRedraw();
  };

  const insertStampOverlay = (label: string) => {
    if (!activePage) return;
    pushHistory();
    const stampCanvas = document.createElement("canvas");
    stampCanvas.width = 300;
    stampCanvas.height = 100;
    const sCtx = stampCanvas.getContext("2d");
    if (!sCtx) return;

    const col = STAMP_COLORS[label] || "#dc2626";
    sCtx.clearRect(0, 0, 300, 100);
    sCtx.lineWidth = 6;
    sCtx.strokeStyle = col;
    sCtx.strokeRect(10, 10, 280, 80);

    sCtx.font = "900 36px 'Impact', 'Arial Black', sans-serif";
    sCtx.fillStyle = col;
    sCtx.textAlign = "center";
    sCtx.textBaseline = "middle";
    sCtx.fillText(label, 150, 52);

    const dataUrl = stampCanvas.toDataURL("image/png");

    const newOverlay: OverlayItem = {
      id: "ov-" + Date.now(),
      type: "stamp",
      x: 35,
      y: 20,
      width: 25,
      height: 9,
      rot: 0,
      stampText: label,
      imageData: dataUrl,
    };

    setPages((prev) =>
      prev.map((p, idx) =>
        idx === activePageIndex ? { ...p, overlays: [...p.overlays, newOverlay] } : p
      )
    );
    setSelectedOverlayId(newOverlay.id);
    scheduleRedraw();
  };

  // ── Page Operations (Pages Mode) ──────────────────────────────────────────
  const rotatePage = (index: number) => {
    pushHistory();
    setPages((prev) =>
      prev.map((p, idx) => {
        if (idx !== index) return p;
        const remappedOverlays: OverlayItem[] = p.overlays.map((ov) => {
          const isContentRotatable =
            ov.type === "text" || ov.type === "signature" || ov.type === "stamp";
          return {
            ...ov,
            x: Math.round((100 - ov.y - ov.height) * 1000) / 1000,
            y: Math.round(ov.x * 1000) / 1000,
            width: Math.round(ov.height * 1000) / 1000,
            height: Math.round(ov.width * 1000) / 1000,
            rot: isContentRotatable ? (((ov.rot || 0) + 90) % 360) : ov.rot,
          };
        });
        return {
          ...p,
          rotation: (p.rotation + 90) % 360,
          overlays: remappedOverlays,
        };
      })
    );
  };

  const movePage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= pages.length) return;
    pushHistory();
    setPages((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, item);
      return copy;
    });
    setActivePageIndex(toIndex);
  };

  const duplicatePage = (index: number) => {
    pushHistory();
    setPages((prev) => {
      const copy = [...prev];
      const target = copy[index];
      const dup: StudioPage = {
        ...target,
        id: "p-" + Date.now() + Math.random().toString(36).substring(2, 6),
        overlays: target.overlays.map((ov) => ({
          ...ov,
          id: "ov-" + Date.now() + Math.random().toString(36).substring(2, 5),
        })),
      };
      copy.splice(index + 1, 0, dup);
      return copy;
    });
  };

  const deletePage = (index: number) => {
    if (pages.length <= 1) {
      showToast("A document must have at least one page.", "info");
      return;
    }
    pushHistory();
    const targetPage = pages[index];
    if (targetPage) {
      imageCacheRef.current.delete(targetPage.id);
      for (const ov of targetPage.overlays) {
        sigImageCacheRef.current.delete(ov.id);
      }
    }
    const activePageId = pages[activePageIndex]?.id;
    const remaining = pages.filter((_, idx) => idx !== index);
    setPages(remaining);
    const retainedActiveIndex = activePageId
      ? remaining.findIndex((page) => page.id === activePageId)
      : -1;
    setActivePageIndex(
      retainedActiveIndex >= 0
        ? retainedActiveIndex
        : Math.min(index, remaining.length - 1)
    );
  };

  // ── File Loading & Extraction ──────────────────────────────────────────────
  const loadFiles = async (files: FileList | null, isAppend = false) => {
    if (!files || !files.length) return;

    setIsProcessing(true);
    setProcessingText("Loading files into secure RAM…");
    setProcessingPercent(10);

    const newPages: StudioPage[] = [];

    try {
      for (let fIdx = 0; fIdx < files.length; fIdx++) {
        const file = files[fIdx];
        if (!isAppend && fIdx === 0) {
          const cleanName = file.name.replace(/\.[^.]+$/, "").trim();
          setDocTitle(cleanName || "document");
        }

        if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
          setProcessingText(`Loading PDF engine for ${file.name}…`);
          setProcessingPercent(25);
          await new Promise((r) => setTimeout(r, 20));

          const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
          pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

          const arrayBuffer = await file.arrayBuffer();
          const sourceId = "src-" + Date.now() + "-" + Math.random().toString(36).substring(2, 8);
          pendingSourceIdsRef.current.add(sourceId);
          sourcePdfBytesRef.current.set(sourceId, new Uint8Array(arrayBuffer.slice(0)));

          const loadingTask = pdfjs.getDocument({
            data: new Uint8Array(arrayBuffer.slice(0)),
            cMapUrl: "/cmaps/",
            cMapPacked: true,
            standardFontDataUrl: "/standard_fonts/",
          });

          loadingTask.onPassword = (
            updatePassword: (pw: string | Error) => void,
            reason: number
          ) => {
            encryptedSourceIdsRef.current.add(sourceId);
            setPasswordInput("");
            setPasswordPrompt({
              fileName: file.name,
              reason,
              onSubmit: (pw: string) => {
                sourcePasswordsRef.current.set(sourceId, pw);
                setPasswordPrompt(null);
                updatePassword(pw);
              },
              onCancel: () => {
                setPasswordPrompt(null);
                updatePassword(new Error("Password canceled by user"));
              },
            });
          };

          try {
            const pdf = await loadingTask.promise;
            const total = pdf.numPages;

            for (let pNum = 1; pNum <= total; pNum++) {
              const pct = Math.round(25 + (pNum / total) * 65);
              setProcessingText(`Converting page ${pNum} of ${total}…`);
              setProcessingPercent(pct);
              await new Promise((r) => setTimeout(r, 15));

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              let p: any = null;
              let c: HTMLCanvasElement | null = null;
              try {
                p = await pdf.getPage(pNum);
                const vp1 = p.getViewport({ scale: 1 });
                const ptWidth = vp1.width;
                const ptHeight = vp1.height;

                const scale = Math.min(2, 1400 / vp1.width);
                const vp = p.getViewport({ scale });

                c = document.createElement("canvas");
                c.width = vp.width;
                c.height = vp.height;
                const ctx = c.getContext("2d");
                if (ctx) {
                  await p.render({ canvas: c, canvasContext: ctx, viewport: vp }).promise;
                  const dataUrl = c.toDataURL("image/jpeg", 0.88);

                  // Stage 3: Generate small ~320px thumbnail
                  const thumbW = 320;
                  const thumbH = Math.max(1, Math.round((vp.height / vp.width) * thumbW));
                  const cThumb = document.createElement("canvas");
                  cThumb.width = thumbW;
                  cThumb.height = thumbH;
                  const ctxThumb = cThumb.getContext("2d");
                  let thumbUrl: string | undefined = undefined;
                  if (ctxThumb) {
                    ctxThumb.drawImage(c, 0, 0, thumbW, thumbH);
                    thumbUrl = cThumb.toDataURL("image/jpeg", 0.7);
                    cThumb.width = 0;
                    cThumb.height = 0;
                  }

                  newPages.push({
                    id: "p-" + Date.now() + Math.random().toString(36).substring(2, 6),
                    url: dataUrl,
                    thumbUrl,
                    width: vp.width,
                    height: vp.height,
                    rotation: 0,
                    overlays: [],
                    kind: "pdf",
                    ptWidth,
                    ptHeight,
                    sourceId,
                    sourcePageNumber: pNum,
                  });
                }
              } finally {
                if (c) {
                  c.width = 0;
                  c.height = 0;
                }
                if (p && typeof p.cleanup === "function") p.cleanup();
              }
            }

            try {
              await pdf.cleanup();
              await loadingTask.destroy();
            } catch (_) {}
          } catch (pdfLoadErr: unknown) {
            pendingSourceIdsRef.current.delete(sourceId);
            sourcePdfBytesRef.current.delete(sourceId);
            sourcePasswordsRef.current.delete(sourceId);
            encryptedSourceIdsRef.current.delete(sourceId);

            const msg = pdfLoadErr instanceof Error ? pdfLoadErr.message : String(pdfLoadErr);
            if (msg.includes("Password") || msg.includes("canceled")) {
              showToast(`Skipped ${file.name}: password not provided.`, "info");
            } else {
              throw pdfLoadErr;
            }
          }
        } else if (file.type.startsWith("image/")) {
          setProcessingText(`Processing image ${file.name}…`);
          const reader = new FileReader();
          const dataUrl = await new Promise<string>((res) => {
            reader.onload = () => res(reader.result as string);
            reader.readAsDataURL(file);
          });

          const img = new Image();
          await new Promise((res) => {
            img.onload = res;
            img.src = dataUrl;
          });

          // Stage 3: Generate small ~320px thumbnail
          const thumbW = 320;
          const thumbH = Math.max(1, Math.round((img.height / img.width) * thumbW));
          const cThumb = document.createElement("canvas");
          cThumb.width = thumbW;
          cThumb.height = thumbH;
          const ctxThumb = cThumb.getContext("2d");
          let thumbUrl: string | undefined = undefined;
          if (ctxThumb) {
            ctxThumb.drawImage(img, 0, 0, thumbW, thumbH);
            thumbUrl = cThumb.toDataURL("image/jpeg", 0.7);
            cThumb.width = 0;
            cThumb.height = 0;
          }

          newPages.push({
            id: "p-" + Date.now() + Math.random().toString(36).substring(2, 6),
            url: dataUrl,
            thumbUrl,
            width: img.width,
            height: img.height,
            rotation: 0,
            overlays: [],
            kind: "image",
            ptWidth: 595.28,
            ptHeight: 841.89,
            originalImageData: dataUrl,
            imageType: file.type,
          });
        }
      }

      if (newPages.length > 0) {
        pendingSourceIdsRef.current.clear();
        if (isAppend) {
          pushHistory();
          setPages((prev) => [...prev, ...newPages]);
        } else {
          setPages(newPages);
          undoRef.current = [];
          redoRef.current = [];
          setUndoStack([]);
          setRedoStack([]);
          setSelectedOverlayId(null);
          setActivePageIndex(0);
          setMode("edit"); // Stage 4: straight to Patch & Edit
          setTool("whiteout"); // with Whiteout tool active
        }
      }
    } catch (err) {
      console.error("PDF Studio error loading files:", err);
      showToast("Could not load the file. Please ensure it is a valid PDF or image.", "error");
    } finally {
      pendingSourceIdsRef.current.clear();
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (appendFileInputRef.current) appendFileInputRef.current.value = "";
      setIsProcessing(false);
      setProcessingPercent(0);
    }
  };

  // ── Sample Document Generator ──────────────────────────────────────────────
  const loadSampleDocument = () => {
    setIsProcessing(true);
    setProcessingText("Generating demo invoice & service agreement…");
    setProcessingPercent(40);

    setTimeout(() => {
      const c1 = document.createElement("canvas");
      c1.width = 1200;
      c1.height = 1600;
      const ctx1 = c1.getContext("2d")!;

      ctx1.fillStyle = "#ffffff";
      ctx1.fillRect(0, 0, 1200, 1600);

      ctx1.fillStyle = "#3158d5";
      ctx1.fillRect(0, 0, 1200, 16);

      ctx1.fillStyle = "#1c201a";
      ctx1.font = "bold 42px Inter, sans-serif";
      ctx1.fillText("INVOICE", 80, 120);

      ctx1.font = "16px Inter, sans-serif";
      ctx1.fillStyle = "#575a53";
      ctx1.fillText("Spellense Studio Technologies Inc.", 80, 165);
      ctx1.fillText("450 Market Street, San Francisco, CA 94105", 80, 195);
      ctx1.fillText("contact@spellense.com  ·  www.spellense.com", 80, 225);

      ctx1.fillStyle = "#0f172a";
      ctx1.font = "bold 18px Inter, sans-serif";
      ctx1.fillText("Billed To:", 750, 120);
      ctx1.font = "16px Inter, sans-serif";
      ctx1.fillStyle = "#575a53";
      ctx1.fillText("Acme Global Media Corp", 750, 155);
      ctx1.fillText("Attn: Financial Accounting", 750, 185);
      ctx1.fillText("PO Box 8920, Austin, TX 78701", 750, 215);

      ctx1.fillStyle = "#f8fafd";
      ctx1.fillRect(80, 280, 1040, 90);
      ctx1.strokeStyle = "#e2e8f0";
      ctx1.strokeRect(80, 280, 1040, 90);

      ctx1.fillStyle = "#575a53";
      ctx1.font = "bold 13px Inter, sans-serif";
      ctx1.fillText("INVOICE NUMBER", 110, 315);
      ctx1.fillText("ISSUE DATE", 420, 315);
      ctx1.fillText("PAYMENT TERMS", 720, 315);
      ctx1.fillText("DUE DATE", 980, 315);

      ctx1.fillStyle = "#0f172a";
      ctx1.font = "bold 17px Inter, sans-serif";
      ctx1.fillText("INV-2026-089", 110, 345);
      ctx1.fillText("October 24, 2026", 420, 345);
      ctx1.fillText("Net 30 Days", 720, 345);
      ctx1.fillText("November 23, 2026", 980, 345);

      ctx1.fillStyle = "#3158d5";
      ctx1.fillRect(80, 420, 1040, 45);
      ctx1.fillStyle = "#ffffff";
      ctx1.font = "bold 14px Inter, sans-serif";
      ctx1.fillText("DESCRIPTION", 110, 448);
      ctx1.fillText("HOURS", 680, 448);
      ctx1.fillText("RATE", 830, 448);
      ctx1.fillText("AMOUNT", 980, 448);

      const items = [
        ["Enterprise PDF Studio Integration & Security", "40 hrs", "$120.00", "$4,800.00"],
        ["Visual Quality Audit & Vector Alignment", "25 hrs", "$110.00", "$2,750.00"],
        ["3D Flipbook Lookbook Production", "15 hrs", "$130.00", "$1,950.00"],
        ["Brand Palette & Typographic Standardization", "10 hrs", "$100.00", "$1,000.00"],
      ];

      items.forEach((row, i) => {
        const y = 520 + i * 65;
        ctx1.fillStyle = "#1e293b";
        ctx1.font = "16px Inter, sans-serif";
        ctx1.fillText(row[0], 110, y);
        ctx1.fillText(row[1], 680, y);
        ctx1.fillText(row[2], 830, y);
        ctx1.font = "bold 16px Inter, sans-serif";
        ctx1.fillText(row[3], 980, y);

        ctx1.strokeStyle = "#f1f5f9";
        ctx1.beginPath();
        ctx1.moveTo(80, y + 25);
        ctx1.lineTo(1120, y + 25);
        ctx1.stroke();
      });

      ctx1.fillStyle = "#f8fafd";
      ctx1.fillRect(720, 820, 400, 180);
      ctx1.strokeStyle = "#e2e8f0";
      ctx1.strokeRect(720, 820, 400, 180);

      ctx1.fillStyle = "#575a53";
      ctx1.font = "16px Inter, sans-serif";
      ctx1.fillText("Subtotal:", 750, 860);
      ctx1.fillText("Sales Tax (5%):", 750, 900);
      ctx1.font = "bold 20px Inter, sans-serif";
      ctx1.fillStyle = "#0f172a";
      ctx1.fillText("Total Due:", 750, 960);

      ctx1.textAlign = "right";
      ctx1.font = "16px Inter, sans-serif";
      ctx1.fillText("$10,500.00", 1090, 860);
      ctx1.fillText("$525.00", 1090, 900);
      ctx1.font = "bold 22px Inter, sans-serif";
      ctx1.fillStyle = "#3158d5";
      ctx1.fillText("$11,025.00", 1090, 960);
      ctx1.textAlign = "left";

      ctx1.fillStyle = "#fffbeb";
      ctx1.fillRect(80, 1070, 1040, 150);
      ctx1.strokeStyle = "#fde68a";
      ctx1.strokeRect(80, 1070, 1040, 150);

      ctx1.fillStyle = "#92400e";
      ctx1.font = "bold 16px Inter, sans-serif";
      ctx1.fillText("WIRE PAYMENT DETAILS (Confidential)", 110, 1120);
      ctx1.font = "15px Inter, sans-serif";
      ctx1.fillStyle = "#78350f";
      ctx1.fillText("Bank: Silicon Reserve Trust  ·  Routing: 021000021", 110, 1150);
      ctx1.fillText("Account No: 9840-2819-3382-019  ·  SWIFT: SRBKUS33", 110, 1180);

      ctx1.fillStyle = "#575a53";
      ctx1.font = "15px Inter, sans-serif";
      ctx1.fillText("Authorized Signature: _______________________________", 80, 1360);
      ctx1.fillText("Spellense Global Creative Suite · 100% In-Browser Engine", 80, 1530);

      const page1Url = c1.toDataURL("image/jpeg", 0.9);

      // Page 2: Service Agreement
      const c2 = document.createElement("canvas");
      c2.width = 1200;
      c2.height = 1600;
      const ctx2 = c2.getContext("2d")!;
      ctx2.fillStyle = "#ffffff";
      ctx2.fillRect(0, 0, 1200, 1600);

      ctx2.fillStyle = "#1c201a";
      ctx2.font = "bold 34px Inter, sans-serif";
      ctx2.fillText("SERVICE LEVEL AGREEMENT & NON-DISCLOSURE", 80, 120);

      ctx2.font = "16px Inter, sans-serif";
      ctx2.fillStyle = "#575a53";
      ctx2.fillText("This agreement confirms that all intellectual property, design assets, and source codes", 80, 180);
      ctx2.fillText("remain strictly confidential under zero-data retention commitments.", 80, 210);

      ctx2.fillStyle = "#f8fafd";
      ctx2.fillRect(80, 260, 1040, 220);
      ctx2.strokeStyle = "#e2e8f0";
      ctx2.strokeRect(80, 260, 1040, 220);

      ctx2.fillStyle = "#0f172a";
      ctx2.font = "bold 18px Inter, sans-serif";
      ctx2.fillText("1. Client Privacy & Local Execution Warranty", 110, 310);
      ctx2.font = "15px Inter, sans-serif";
      ctx2.fillStyle = "#575a53";
      ctx2.fillText("All rendering, redaction, and PDF flattening operations execute exclusively in browser RAM.", 110, 350);
      ctx2.fillText("Spellense guarantees that no document telemetry or raw bytes are transmitted over the wire.", 110, 385);
      ctx2.fillText("Redacted passages are permanently replaced and unrecoverable once exported.", 110, 420);

      ctx2.fillStyle = "#f8fafd";
      ctx2.fillRect(80, 520, 1040, 260);
      ctx2.strokeStyle = "#e2e8f0";
      ctx2.strokeRect(80, 520, 1040, 260);

      ctx2.fillStyle = "#0f172a";
      ctx2.font = "bold 18px Inter, sans-serif";
      ctx2.fillText("2. Deliverables & Acceptance Criteria", 110, 570);
      ctx2.font = "15px Inter, sans-serif";
      ctx2.fillStyle = "#575a53";
      ctx2.fillText("Client agrees to review each patch and sign off within 14 business days of delivery.", 110, 610);
      ctx2.fillText("Accepted formats include vector PDF, high-resolution JPEG, and WebP raster sheets.", 110, 645);
      ctx2.fillText("Payment schedule adheres strictly to the wire details outlined in Invoice INV-2026-089.", 110, 680);
      ctx2.fillText("Governing law: State of California, United States.", 110, 715);

      ctx2.fillStyle = "#0f172a";
      ctx2.font = "bold 18px Inter, sans-serif";
      ctx2.fillText("Signatures & Acknowledgment", 80, 920);

      ctx2.font = "15px Inter, sans-serif";
      ctx2.fillStyle = "#575a53";
      ctx2.fillText("For Spellense Technologies:", 80, 980);
      ctx2.fillText("Signature: _______________________________", 80, 1040);
      ctx2.fillText("Date: October 24, 2026", 80, 1080);

      ctx2.fillText("For Acme Global Media Corp:", 640, 980);
      ctx2.fillText("Signature: _______________________________", 640, 1040);
      ctx2.fillText("Date: October 24, 2026", 640, 1080);

      const page2Url = c2.toDataURL("image/jpeg", 0.9);

      // Stage 3: Small thumbnails for sample docs
      const cThumb1 = document.createElement("canvas");
      cThumb1.width = 320;
      cThumb1.height = Math.round((1600 / 1200) * 320);
      const ctxT1 = cThumb1.getContext("2d");
      ctxT1?.drawImage(c1, 0, 0, cThumb1.width, cThumb1.height);
      const page1Thumb = cThumb1.toDataURL("image/jpeg", 0.7);

      const cThumb2 = document.createElement("canvas");
      cThumb2.width = 320;
      cThumb2.height = Math.round((1600 / 1200) * 320);
      const ctxT2 = cThumb2.getContext("2d");
      ctxT2?.drawImage(c2, 0, 0, cThumb2.width, cThumb2.height);
      const page2Thumb = cThumb2.toDataURL("image/jpeg", 0.7);

      setDocTitle("sample-service-invoice");
      sourcePdfBytesRef.current.clear();
      sourcePasswordsRef.current.clear();
      encryptedSourceIdsRef.current.clear();
      pendingSourceIdsRef.current.clear();
      undoRef.current = [];
      redoRef.current = [];
      setPages([
        {
          id: "p-sample-1",
          url: page1Url,
          thumbUrl: page1Thumb,
          width: 1200,
          height: 1600,
          rotation: 0,
          overlays: [],
          kind: "image",
          ptWidth: 595.28,
          ptHeight: 841.89,
          originalImageData: page1Url,
          imageType: "image/jpeg",
        },
        {
          id: "p-sample-2",
          url: page2Url,
          thumbUrl: page2Thumb,
          width: 1200,
          height: 1600,
          rotation: 0,
          overlays: [],
          kind: "image",
          ptWidth: 595.28,
          ptHeight: 841.89,
          originalImageData: page2Url,
          imageType: "image/jpeg",
        },
      ]);
      setUndoStack([]);
      setRedoStack([]);
      setSelectedOverlayId(null);
      setActivePageIndex(0);
      setMode("edit");
      setTool("whiteout");
      setIsProcessing(false);
    }, 400);
  };

  // ── Export PDF Engine (A2: Vector Preservation & Targeted Flattening) ──────
  const exportPdf = async () => {
    if (!pages.length) return;

    setIsExporting(true); // Stage 2
    setProcessingText("Preparing clean export in memory…");
    setProcessingPercent(10);

    const pdfjsDocsToCleanup: { cleanup?: () => Promise<void>; destroy?: () => Promise<void> }[] = [];

    try {
      const { PDFDocument, degrees } = await import("@cantoo/pdf-lib");
      const pdfDoc = await PDFDocument.create();

      type LoadedPDFDoc = Awaited<ReturnType<typeof PDFDocument.load>>;
      const sourceDocMap = new Map<string, LoadedPDFDoc>();
      const getSourceDoc = async (sourceId: string): Promise<LoadedPDFDoc | null> => {
        if (sourceDocMap.has(sourceId)) return sourceDocMap.get(sourceId)!;
        const bytes = sourcePdfBytesRef.current.get(sourceId);
        if (!bytes) return null;
        try {
          const sPassword = sourcePasswordsRef.current.get(sourceId) || "";
          const loaded = await PDFDocument.load(bytes.slice(0), {
            password: sPassword,
          });
          sourceDocMap.set(sourceId, loaded);
          return loaded;
        } catch (_) {
          return null;
        }
      };

      const pdfjsDocMap = new Map<string, unknown>();
      const getPdfjsDoc = async (sourceId: string): Promise<unknown> => {
        if (pdfjsDocMap.has(sourceId)) return pdfjsDocMap.get(sourceId);
        const bytes = sourcePdfBytesRef.current.get(sourceId);
        if (!bytes) return null;
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const sPassword = sourcePasswordsRef.current.get(sourceId) || "";

        const loadingTask = pdfjs.getDocument({
          data: bytes.slice(0),
          password: sPassword,
          cMapUrl: "/cmaps/",
          cMapPacked: true,
          standardFontDataUrl: "/standard_fonts/",
        });
        const doc = await loadingTask.promise;
        pdfjsDocMap.set(sourceId, doc);
        pdfjsDocsToCleanup.push(doc);
        pdfjsDocsToCleanup.push(loadingTask);
        return doc;
      };

      const renderFallbackCase3 = async (
        p: StudioPage,
        jpegQuality: number
      ) => {
        const isRot = p.rotation === 90 || p.rotation === 270;
        const exportW = exportQuality === "high" ? 2200 : 1500;
        const previewCanvasWidth = isRot ? p.height : p.width;
        const scaleFactor = previewCanvasWidth > 0 ? exportW / previewCanvasWidth : 1;
        const exportH = Math.round((isRot ? p.width / p.height : p.height / p.width) * exportW);

        const imgCanvas = document.createElement("canvas");
        imgCanvas.width = exportW;
        imgCanvas.height = exportH;
        const ctx = imgCanvas.getContext("2d");
        if (ctx) {
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("Image failed to load in fallback render"));
            img.src = p.url;
          });

          ctx.save();
          ctx.translate(exportW / 2, exportH / 2);
          ctx.rotate((p.rotation * Math.PI) / 180);
          const naturalW = img.naturalWidth || img.width;
          const naturalH = img.naturalHeight || img.height;
          const scaleToFit = isRot ? exportW / naturalH : exportW / naturalW;
          ctx.drawImage(
            img,
            (-naturalW * scaleToFit) / 2,
            (-naturalH * scaleToFit) / 2,
            naturalW * scaleToFit,
            naturalH * scaleToFit
          );
          ctx.restore();

          if (p.overlays.length > 0) {
            for (const ov of p.overlays) {
              if (ov.imageData) {
                const sImg = new Image();
                await new Promise<void>((res) => {
                  sImg.onload = () => res();
                  sImg.onerror = () => res();
                  sImg.src = ov.imageData!;
                });
              }
            }
          }

          drawOverlays(ctx, p.overlays, exportW, exportH, scaleFactor);
        }

        const jpgDataUrl = imgCanvas.toDataURL("image/jpeg", jpegQuality);
        const embeddedJpg = await pdfDoc.embedJpg(jpgDataUrl);

        let finalPtW = 595.28;
        let finalPtH = 841.89;
        if (p.kind === "pdf" && p.ptWidth && p.ptHeight) {
          finalPtW = isRot ? p.ptHeight : p.ptWidth;
          finalPtH = isRot ? p.ptWidth : p.ptHeight;
        } else {
          const ar = isRot ? p.height / p.width : p.width / p.height;
          if (ar >= 1) {
            finalPtW = 841.89;
            finalPtH = 841.89 / ar;
          } else {
            finalPtH = 841.89;
            finalPtW = 841.89 * ar;
          }
        }

        const newPdfPage = pdfDoc.addPage([finalPtW, finalPtH]);
        newPdfPage.drawImage(embeddedJpg, {
          x: 0,
          y: 0,
          width: finalPtW,
          height: finalPtH,
        });
        imgCanvas.width = 0;
        imgCanvas.height = 0;
      };

      const total = pages.length;

      for (let i = 0; i < total; i++) {
        const p = pages[i];
        const pct = Math.round(15 + (i / total) * 75);
        setProcessingText(`Processing page ${i + 1} of ${total}…`);
        setProcessingPercent(pct);
        await new Promise((r) => setTimeout(r, 15));

        const jpegQuality = exportQuality === "high" ? 0.94 : 0.86;
        const isRot = p.rotation === 90 || p.rotation === 270;

        // CASE 1: UNTOUCHED VECTOR PDF PAGE
        if (p.kind === "pdf" && p.overlays.length === 0 && p.sourceId && p.sourcePageNumber) {
          const sDoc = await getSourceDoc(p.sourceId);
          if (sDoc) {
            try {
              const [copiedPage] = await pdfDoc.copyPages(sDoc, [p.sourcePageNumber - 1]);
              const existingAngle = copiedPage.getRotation().angle || 0;
              const finalAngle = (existingAngle + p.rotation) % 360;
              copiedPage.setRotation(degrees(finalAngle));
              pdfDoc.addPage(copiedPage);
              continue;
            } catch (_) {}
          }
        }

        // CASE 2: EDITED PDF PAGE
        if (p.kind === "pdf" && p.sourceId && p.sourcePageNumber) {
          let case2Success = false;
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pdfjsDoc: any = await getPdfjsDoc(p.sourceId);
            if (pdfjsDoc) {
              const pdfPage = await pdfjsDoc.getPage(p.sourcePageNumber);
              try {
                const targetDpi = exportQuality === "high" ? 220 : 150;
                const scale = targetDpi / 72;
                const vp = pdfPage.getViewport({ scale });

                const exportCanvas = document.createElement("canvas");
                exportCanvas.width = isRot ? vp.height : vp.width;
                exportCanvas.height = isRot ? vp.width : vp.height;
                const ctx = exportCanvas.getContext("2d");
                if (ctx) {
                  const tempCanvas = document.createElement("canvas");
                  tempCanvas.width = vp.width;
                  tempCanvas.height = vp.height;
                  const tempCtx = tempCanvas.getContext("2d");
                  if (tempCtx) {
                    await pdfPage.render({
                      canvas: tempCanvas,
                      canvasContext: tempCtx,
                      viewport: vp,
                    }).promise;

                    ctx.save();
                    ctx.translate(exportCanvas.width / 2, exportCanvas.height / 2);
                    ctx.rotate((p.rotation * Math.PI) / 180);
                    ctx.drawImage(tempCanvas, -vp.width / 2, -vp.height / 2);
                    ctx.restore();
                    tempCanvas.width = 0;
                    tempCanvas.height = 0;
                  }

                  const exportW = exportCanvas.width;
                  const exportH = exportCanvas.height;
                  const previewCanvasWidth = isRot ? p.height : p.width;
                  const scaleFactor = previewCanvasWidth > 0 ? exportW / previewCanvasWidth : 1;

                  if (p.overlays.length > 0) {
                    for (const ov of p.overlays) {
                      if (ov.imageData) {
                        const sImg = new Image();
                        await new Promise<void>((res) => {
                          sImg.onload = () => res();
                          sImg.onerror = () => res();
                          sImg.src = ov.imageData!;
                        });
                      }
                    }
                  }

                  drawOverlays(ctx, p.overlays, exportW, exportH, scaleFactor);

                  const jpgDataUrl = exportCanvas.toDataURL("image/jpeg", jpegQuality);
                  const jpgImage = await pdfDoc.embedJpg(jpgDataUrl);

                  const finalPtW = isRot ? p.ptHeight : p.ptWidth;
                  const finalPtH = isRot ? p.ptWidth : p.ptHeight;
                  const newPdfPage = pdfDoc.addPage([finalPtW, finalPtH]);
                  newPdfPage.drawImage(jpgImage, {
                    x: 0,
                    y: 0,
                    width: finalPtW,
                    height: finalPtH,
                  });
                  exportCanvas.width = 0;
                  exportCanvas.height = 0;
                  case2Success = true;
                }
              } finally {
                if (typeof pdfPage.cleanup === "function") pdfPage.cleanup();
              }
            }
          } catch (_) {
            case2Success = false;
          }

          if (case2Success) continue;
        }

        // CASE 3: IMAGE PAGE OR FALLBACK
        await renderFallbackCase3(p, jpegQuality);
      }

      setProcessingText("Building final PDF document…");
      setProcessingPercent(95);

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${docTitle || "document"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const sizeMb = (blob.size / (1024 * 1024)).toFixed(2);
      showToast(`Downloaded ${docTitle}.pdf (${sizeMb} MB)`, "success");
      setShowPostExportCard(true); // Stage 1
    } catch (err) {
      console.error("PDF Export error:", err);
      showToast("Failed to export PDF: " + (err instanceof Error ? err.message : "Unexpected error"), "error");
    } finally {
      for (const item of pdfjsDocsToCleanup) {
        try {
          if (item && typeof item.cleanup === "function") await item.cleanup();
          if (item && typeof item.destroy === "function") await item.destroy();
        } catch (_) {}
      }
      setIsExporting(false); // Stage 2
      setProcessingPercent(0);
    }
  };

  const handleStartOver = async () => {
    const ok = await confirmAction({
      title: "Start Over?",
      message: "Reset current document and return to upload? All unsaved edits will be lost.",
      confirmLabel: "Start Over",
      destructive: true,
    });
    if (!ok) return;

    sourcePdfBytesRef.current.clear();
    sourcePasswordsRef.current.clear();
    encryptedSourceIdsRef.current.clear();
    pendingSourceIdsRef.current.clear();
    undoRef.current = [];
    redoRef.current = [];
    imageCacheRef.current.clear();
    sigImageCacheRef.current.clear();
    setUndoStack([]);
    setRedoStack([]);
    setSelectedOverlayId(null);
    setPages([]);
    setActivePageIndex(0);
    setShowPostExportCard(false);
  };

  const handleClearAllOnPage = async () => {
    if (!activePage || activePage.overlays.length === 0) return;
    const ok = await confirmAction({
      title: "Clear All Edits?",
      message: "Are you sure you want to remove all edits from this page?",
      confirmLabel: "Clear All",
      destructive: true,
    });
    if (!ok) return;

    pushHistory();
    setPages((prev) =>
      prev.map((p, idx) => (idx === activePageIndex ? { ...p, overlays: [] } : p))
    );
    setSelectedOverlayId(null);
    scheduleRedraw();
  };

  // Stage 4: Contextual tool hint
  const getToolHint = () => {
    if (mode === "pages") {
      return "Rearrange, rotate, duplicate, or add pages to your document";
    }
    if (mode === "redact") {
      if (selectedOverlayId) {
        return "Click an edit to select it, drag to move, drag a corner to resize, or press Delete";
      }
      if (redactTool === "draw") {
        return "Drag a box over confidential data to redact it permanently";
      }
      return "Click an existing redaction to select it, or switch to Draw box";
    }
    // mode === "edit"
    if (selectedOverlayId) {
      return "Click an edit to select it, drag to move, drag a corner to resize, or press Delete";
    }
    if (tool === "whiteout") {
      return "Drag a box over outdated text or numbers to erase them cleanly";
    }
    if (tool === "text") {
      return "Click anywhere on the document page to place your text";
    }
    if (tool === "sign") {
      return "Draw your digital signature to place on the document";
    }
    if (tool === "stamp") {
      return "Choose a stamp from the panel to place on the document";
    }
    return "Click an edit to select it, drag to move, or drag a corner to resize";
  };

  // Stage 5: Touch-action condition
  const isDrawingTool =
    mode === "redact" ? redactTool === "draw" : tool === "whiteout" || tool === "text";
  const canvasTouchAction =
    isDrawingTool || selectedOverlayId !== null ? "none" : "pan-x pan-y pinch-zoom";

  const selectedOverlay = activePage?.overlays.find((o) => o.id === selectedOverlayId) || null;

  // Reusable Tool Panel Content (used by Desktop Sidebar & Mobile Bottom Sheet Drawer)
  const renderToolPanel = () => (
    <div className="space-y-4 text-xs">
      {/* Redact Mode Controls */}
      {mode === "redact" && (
        <div className="rounded-2xl border border-black/[0.06] bg-white p-3.5 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-black/[0.06]">
            <span className="font-bold text-rose-600 flex items-center gap-1.5 uppercase tracking-wider text-xs">
              <RedactIcon size={14} className="text-rose-600" />
              <span>Redaction</span>
            </span>
            <span className="font-semibold text-[#70746d]">
              Page {activePageIndex + 1} of {pages.length}
            </span>
          </div>

          <div>
            <label className="font-semibold text-[#1c201a] block mb-1.5 text-xs">Action Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRedactTool("draw")}
                aria-pressed={redactTool === "draw"}
                style={redactTool === "draw" ? { backgroundColor: "#e11d48", color: "#ffffff" } : undefined}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  redactTool === "draw"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-[#f6f5f1] text-[#1c201a] hover:bg-[#eeebe3]"
                }`}
              >
                <RedactIcon size={14} />
                <span>Draw Box</span>
              </button>
              <button
                type="button"
                onClick={() => setRedactTool("select")}
                aria-pressed={redactTool === "select"}
                style={redactTool === "select" ? { backgroundColor: "#3158d5", color: "#ffffff" } : undefined}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  redactTool === "select"
                    ? "bg-[#3158d5] text-white shadow-xs"
                    : "bg-[#f6f5f1] text-[#1c201a] hover:bg-[#eeebe3]"
                }`}
              >
                <MousePointer2 className="w-3.5 h-3.5" />
                <span>Select &amp; Edit</span>
              </button>
            </div>
          </div>

          <div>
            <label className="font-semibold text-[#1c201a] block mb-1.5 text-xs">Redaction Style</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRedactStyle("blackout")}
                aria-pressed={redactStyle === "blackout"}
                style={redactStyle === "blackout" ? { backgroundColor: "#3158d5", color: "#ffffff" } : undefined}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  redactStyle === "blackout"
                    ? "bg-[#3158d5] text-white shadow-xs"
                    : "bg-[#f6f5f1] text-[#1c201a] hover:bg-[#eeebe3]"
                }`}
              >
                <div className="w-3 h-3 rounded-xs bg-black" />
                <span>Blackout</span>
              </button>
              <button
                type="button"
                onClick={() => setRedactStyle("blur")}
                aria-pressed={redactStyle === "blur"}
                style={redactStyle === "blur" ? { backgroundColor: "#3158d5", color: "#ffffff" } : undefined}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  redactStyle === "blur"
                    ? "bg-[#3158d5] text-white shadow-xs"
                    : "bg-[#f6f5f1] text-[#1c201a] hover:bg-[#eeebe3]"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Pixel Blur</span>
              </button>
              <button
                type="button"
                onClick={() => setRedactStyle("whiteout")}
                aria-pressed={redactStyle === "whiteout"}
                style={redactStyle === "whiteout" ? { backgroundColor: "#3158d5", color: "#ffffff" } : undefined}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  redactStyle === "whiteout"
                    ? "bg-[#3158d5] text-white shadow-xs"
                    : "bg-[#f6f5f1] text-[#1c201a] hover:bg-[#eeebe3]"
                }`}
              >
                <span className="w-3 h-3 rounded-xs border border-black/10 bg-white" />
                <span>Whiteout</span>
              </button>
            </div>
          </div>

          {redactStyle === "blur" && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 leading-snug">
              Pixelation can sometimes be reversed. Use Blackout for sensitive data.
            </div>
          )}
        </div>
      )}

      {/* Edit Mode Tools */}
      {mode === "edit" && (
        <div className="space-y-3">
          {/* Tool Selector Grid */}
          <div className="rounded-2xl border border-black/[0.06] bg-white p-3.5 space-y-2.5 shadow-2xs">
            <label className="font-semibold text-[#575a53] block text-xs">Select Tool</label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: "whiteout", label: "Whiteout", icon: Eraser },
                { id: "text", label: "Text", icon: Type },
                { id: "sign", label: "Signature", icon: PenLine },
                { id: "stamp", label: "Stamps", icon: StampIcon },
                { id: "select", label: "Select", icon: MousePointer2 },
              ].map((t) => {
                const Icon = t.icon;
                const active = tool === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      if (t.id === "sign") {
                        setTool("sign");
                        setIsSignatureOpen(true);
                      } else {
                        setTool(t.id as EditTool);
                      }
                    }}
                    aria-pressed={active}
                    style={active ? { backgroundColor: "#3158d5", color: "#ffffff" } : undefined}
                    className={`p-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                      active
                        ? "bg-[#3158d5] text-white shadow-xs"
                        : "bg-[#f6f5f1] text-[#1c201a] hover:bg-[#eeebe3]"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Whiteout Recolor Card for selected whiteout */}
          {selectedOverlay && selectedOverlay.type === "whiteout" && (
            <div className="rounded-2xl border border-[#bcd5ff] bg-[#eff4fe] p-3 space-y-2">
              <span className="font-bold text-[#1c201a] block">Change Whiteout Color</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: "White", val: "#ffffff" },
                  { label: "Cream", val: "#fbfbfa" },
                  { label: "Soft Gray", val: "#f1f0eb" },
                ].map((c) => (
                  <button
                    key={c.val}
                    type="button"
                    onClick={() => {
                      pushHistory();
                      setPages((prev) =>
                        prev.map((p, idx) =>
                          idx === activePageIndex
                            ? {
                                ...p,
                                overlays: p.overlays.map((ov) =>
                                  ov.id === selectedOverlay.id ? { ...ov, bgColor: c.val } : ov
                                ),
                              }
                            : p
                        )
                      );
                      scheduleRedraw();
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-semibold cursor-pointer ${
                      selectedOverlay.bgColor === c.val
                        ? "bg-white text-[#3158d5] border-[#3158d5] ring-2 ring-[#bcd5ff]"
                        : "bg-white text-[#1c201a] border-[#eeede6]"
                    }`}
                  >
                    <span style={{ backgroundColor: c.val }} className="h-3 w-3 rounded-full border border-[#eeede6] shrink-0" />
                    <span>{c.label}</span>
                  </button>
                ))}
                <label className="inline-flex items-center gap-1.5 rounded-lg border border-[#eeede6] bg-white px-2 py-0.5 text-xs font-semibold text-[#1c201a] cursor-pointer">
                  <input
                    type="color"
                    value={selectedOverlay.bgColor || "#ffffff"}
                    onChange={(e) => {
                      const newCol = e.target.value;
                      pushHistory("color", 800);
                      setPages((prev) =>
                        prev.map((p, idx) =>
                          idx === activePageIndex
                            ? {
                                ...p,
                                overlays: p.overlays.map((ov) =>
                                  ov.id === selectedOverlay.id ? { ...ov, bgColor: newCol } : ov
                                ),
                              }
                            : p
                        )
                      );
                      scheduleRedraw();
                    }}
                    className="w-4 h-4 p-0 border-0 rounded cursor-pointer bg-transparent"
                  />
                  <span>Custom</span>
                </label>
              </div>
            </div>
          )}

          {/* Selected Text Edit Card */}
          {selectedOverlay && selectedOverlay.type === "text" && (
            <div className="rounded-2xl border border-[#bcd5ff] bg-[#eff4fe] p-3 space-y-2.5 shadow-2xs">
              <span className="font-bold text-[#3158d5] flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5" />
                <span>Edit Selected Text</span>
              </span>

              <div>
                <label className="font-semibold text-[#1c201a] block mb-1">Text Content</label>
                <textarea
                  ref={(el) => { textInputRef.current = el; }}
                  rows={3}
                  value={selectedOverlay.text || ""}
                  onFocus={() => {
                    hasPushedTextEditThisSessionRef.current = false;
                  }}
                  onBlur={() => {
                    hasPushedTextEditThisSessionRef.current = false;
                  }}
                  onChange={(e) => {
                    if (!hasPushedTextEditThisSessionRef.current) {
                      pushHistory();
                      hasPushedTextEditThisSessionRef.current = true;
                    }
                    updateSelectedTextOverlay({ text: e.target.value });
                  }}
                  placeholder="Type text..."
                  className="w-full resize-y rounded-xl border border-[#bcd5ff] bg-white px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#3158d5]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="font-semibold text-[#1c201a]">
                  Size ({pxToPt(selectedOverlay.fontSize || 18, activePage)} pt)
                  <input
                    type="range"
                    min="8"
                    max="72"
                    value={pxToPt(selectedOverlay.fontSize || 18, activePage)}
                    onChange={(e) => {
                      pushHistory("size", 800);
                      const pt = +e.target.value;
                      updateSelectedTextOverlay({ fontSize: ptToPx(pt, activePage) });
                    }}
                    className="w-full mt-1 accent-blue-600"
                  />
                </label>

                <label className="font-semibold text-[#1c201a]">
                  Font Family
                  <select
                    value={selectedOverlay.fontFamily || "Inter, sans-serif"}
                    onChange={(e) => {
                      pushHistory();
                      updateSelectedTextOverlay({ fontFamily: e.target.value });
                    }}
                    className="mt-1 w-full rounded-lg border border-[#bcd5ff] bg-white px-2 py-1.5 text-xs font-medium"
                  >
                    <option value="Inter, sans-serif">Modern Sans</option>
                    <option value="Georgia, serif">Classic Serif</option>
                    <option value="Courier, monospace">Monospace</option>
                  </select>
                </label>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      pushHistory();
                      updateSelectedTextOverlay({
                        fontWeight: selectedOverlay.fontWeight === "bold" ? "normal" : "bold",
                      });
                    }}
                    className={`h-7 w-7 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center justify-center ${
                      selectedOverlay.fontWeight === "bold"
                        ? "bg-[#3158d5] text-white border-[#3158d5]"
                        : "bg-white text-[#1c201a] border-[#eeede6] hover:bg-[#faf9f6]"
                    }`}
                    title="Toggle Bold"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      pushHistory();
                      updateSelectedTextOverlay({
                        fontStyle: selectedOverlay.fontStyle === "italic" ? "normal" : "italic",
                      });
                    }}
                    className={`h-7 w-7 rounded-lg text-xs font-semibold italic border transition cursor-pointer flex items-center justify-center ${
                      selectedOverlay.fontStyle === "italic"
                        ? "bg-[#3158d5] text-white border-[#3158d5]"
                        : "bg-white text-[#1c201a] border-[#eeede6] hover:bg-[#faf9f6]"
                    }`}
                    title="Toggle Italic"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-1 ml-1.5">
                    {["#1c201a", "#3158d5", "#dc2626", "#059669"].map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => {
                          pushHistory();
                          updateSelectedTextOverlay({ color: col });
                        }}
                        style={{ backgroundColor: col }}
                        className={`h-5 w-5 rounded-full border border-white shadow-xs cursor-pointer ${
                          selectedOverlay.color === col ? "ring-2 ring-[#3158d5]" : ""
                        }`}
                        aria-label={`Select text color ${col}`}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    pushHistory();
                    const nextBg = selectedOverlay.bgColor === "#ffffff" ? "transparent" : "#ffffff";
                    updateSelectedTextOverlay({ bgColor: nextBg });
                  }}
                  className="text-xs font-bold text-[#3158d5] hover:underline cursor-pointer"
                >
                  {selectedOverlay.bgColor === "#ffffff" ? "✓ White Box" : "+ White Box"}
                </button>
              </div>
            </div>
          )}

          {/* Whiteout Settings Card */}
          {tool === "whiteout" && (
            <div className="rounded-2xl border border-black/[0.06] bg-white p-3.5 space-y-2.5 shadow-2xs">
              <span className="font-bold text-[#1c201a] block text-xs">Whiteout Tone</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: "auto", label: "Auto colour", swatch: "linear-gradient(135deg, #ffffff 50%, #e2e8f0 50%)" },
                  { id: "white", label: "White", swatch: "#ffffff" },
                  { id: "cream", label: "Cream", swatch: "#fbfbfa" },
                  { id: "gray", label: "Soft Gray", swatch: "#f1f0eb" },
                ].map((c) => {
                  const active = whiteoutTone === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setWhiteoutTone(c.id as "auto" | "white" | "cream" | "gray");
                        setIsColorPicking(false);
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer transition ${
                        active ? "text-[#3158d5] bg-[#eff4fe] ring-1.5 ring-[#3158d5] font-bold" : "text-[#1c201a] bg-[#f6f5f1] hover:bg-[#eeebe3]"
                      }`}
                    >
                      <span style={{ background: c.swatch }} className="h-3 w-3 rounded-full border border-black/10 shrink-0" />
                      <span>{c.label}</span>
                    </button>
                  );
                })}

                <label
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer transition ${
                    whiteoutTone === "custom" ? "text-[#3158d5] bg-[#eff4fe] ring-1.5 ring-[#3158d5] font-bold" : "text-[#1c201a] bg-[#f6f5f1] hover:bg-[#eeebe3]"
                  }`}
                >
                  <input
                    type="color"
                    value={customWhiteoutColor}
                    onChange={(e) => {
                      setCustomWhiteoutColor(e.target.value);
                      setWhiteoutColor(e.target.value);
                      setWhiteoutTone("custom");
                      setIsColorPicking(false);
                    }}
                    className="w-4 h-4 p-0 border-0 rounded cursor-pointer bg-transparent"
                  />
                  <span>Custom</span>
                </label>

                <button
                  type="button"
                  onClick={handlePickColorFromPage}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                    isColorPicking ? "text-[#3158d5] bg-[#eff4fe] ring-1.5 ring-[#3158d5] font-bold" : "text-[#1c201a] bg-[#f6f5f1] hover:bg-[#eeebe3]"
                  }`}
                  title="Pick color directly from document page"
                >
                  <Pipette className="w-3.5 h-3.5" />
                  <span>{isColorPicking ? "Click canvas..." : "Pick from page"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Default Text Tool Settings (when no text is selected) */}
          {tool === "text" && (!selectedOverlay || selectedOverlay.type !== "text") && (
            <div className="rounded-2xl border border-[#eeede6] bg-white p-3 space-y-3">
              <div>
                <label className="font-semibold text-[#1c201a] block mb-1">Default Text</label>
                <textarea
                  rows={2}
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  placeholder="Type text to place... (new lines supported)"
                  className="w-full resize-y rounded-xl border border-[#eeede6] bg-white px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#3158d5]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="font-semibold text-[#1c201a]">
                  Size ({textPtSize} pt)
                  <input
                    type="range"
                    min="8"
                    max="72"
                    value={textPtSize}
                    onChange={(e) => setTextPtSize(+e.target.value)}
                    className="w-full mt-1 accent-blue-600"
                  />
                </label>

                <label className="font-semibold text-[#1c201a]">
                  Font
                  <select
                    value={textFont}
                    onChange={(e) => setTextFont(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#eeede6] bg-white px-2 py-1.5 text-xs font-medium"
                  >
                    <option value="Inter, sans-serif">Modern Sans</option>
                    <option value="Georgia, serif">Classic Serif</option>
                    <option value="Courier, monospace">Monospace</option>
                  </select>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTextWeight((w) => (w === "bold" ? "normal" : "bold"))}
                    className={`h-7 w-7 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center justify-center ${
                      textWeight === "bold"
                        ? "bg-[#3158d5] text-white border-[#3158d5]"
                        : "bg-white text-[#1c201a] border-[#eeede6] hover:bg-[#faf9f6]"
                    }`}
                    title="Toggle Bold"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextStyle((s) => (s === "italic" ? "normal" : "italic"))}
                    className={`h-7 w-7 rounded-lg text-xs font-semibold italic border transition cursor-pointer flex items-center justify-center ${
                      textStyle === "italic"
                        ? "bg-[#3158d5] text-white border-[#3158d5]"
                        : "bg-white text-[#1c201a] border-[#eeede6] hover:bg-[#faf9f6]"
                    }`}
                    title="Toggle Italic"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-1 ml-1.5">
                    {["#1c201a", "#3158d5", "#dc2626", "#059669"].map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setTextColor(col)}
                        style={{ backgroundColor: col }}
                        className={`h-5 w-5 rounded-full border border-white shadow-xs cursor-pointer ${
                          textColor === col ? "ring-2 ring-[#3158d5]" : ""
                        }`}
                        aria-label={`Select text color ${col}`}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setTextBg(textBg === "transparent" ? "#ffffff" : "transparent")}
                  className="text-xs font-bold text-[#3158d5] hover:underline cursor-pointer"
                >
                  {textBg === "transparent" ? "+ White Box" : "✓ White Box"}
                </button>
              </div>
            </div>
          )}

          {/* Stamps Panel */}
          {tool === "stamp" && (
            <div className="rounded-2xl border border-[#eeede6] bg-white p-3 space-y-2.5">
              <span className="font-bold text-[#1c201a] block">1-Click Document Stamps</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "PAID", color: STAMP_COLORS.PAID },
                  { label: "APPROVED", color: STAMP_COLORS.APPROVED },
                  { label: "CONFIDENTIAL", color: STAMP_COLORS.CONFIDENTIAL },
                  { label: "DRAFT", color: STAMP_COLORS.DRAFT },
                  { label: "VOID", color: STAMP_COLORS.VOID },
                ].map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => insertStampOverlay(s.label)}
                    style={{ borderColor: s.color, color: s.color }}
                    className="rounded-xl border-2 px-3 py-1 text-xs font-black tracking-wider uppercase bg-white hover:bg-[#faf9f6] transition cursor-pointer"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overlays / Edits List for Active Page */}
      {activePage && activePage.overlays.length > 0 && (
        <div className="rounded-2xl border border-[#eeede6] bg-white p-3 space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#eeede6]">
            <span className="font-bold text-[#1c201a] text-xs">
              Page Edits ({activePage.overlays.length})
            </span>
            <button
              type="button"
              onClick={handleClearAllOnPage}
              className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
            >
              Clear All
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-0.5 scrollbar-thin">
            {activePage.overlays.map((ov, oIdx) => {
              const isSelected = ov.id === selectedOverlayId;
              return (
                <div
                  key={ov.id}
                  onClick={() => setSelectedOverlayId(ov.id)}
                  className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition ${
                    isSelected
                      ? "border-[#3158d5] bg-[#eff4fe] font-bold text-[#3158d5]"
                      : "border-[#eeede6] bg-[#faf9f6] hover:bg-[#f1f0eb] text-[#1c201a]"
                  }`}
                >
                  <span className="truncate capitalize mr-2">
                    {oIdx + 1}. {ov.type} {ov.text ? `("${ov.text.slice(0, 14)}...")` : ""}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      title="Duplicate edit (Ctrl+D)"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateOverlay(ov.id);
                      }}
                      className="p-1 rounded hover:bg-[#e8effe] hover:text-blue-600 text-[#8c8f87] transition"
                      aria-label="Duplicate edit"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Delete edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        pushHistory();
                        setPages((prev) =>
                          prev.map((p, idx) =>
                            idx === activePageIndex
                              ? { ...p, overlays: p.overlays.filter((o) => o.id !== ov.id) }
                              : p
                          )
                        );
                        if (selectedOverlayId === ov.id) setSelectedOverlayId(null);
                        scheduleRedraw();
                      }}
                      className="p-1 rounded hover:bg-rose-100 hover:text-rose-600 text-[#8c8f87] transition"
                      aria-label="Delete edit"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div
      style={{ backgroundColor: "#faf9f6" }}
      className="pdf-studio-root flex min-h-screen flex-col bg-[#faf9f6] font-sans text-[#1c201a] antialiased selection:bg-[#bcd5ff] selection:text-black relative z-10 text-[15px]"
    >
      <Navbar />

      <main className="flex-1 pb-28 lg:pb-16 [&_button:focus-visible]:outline-none [&_button:focus-visible]:ring-2 [&_button:focus-visible]:ring-[#3158d5] [&_button:focus-visible]:ring-offset-2">
        <section className="relative overflow-x-clip">
          <div className="relative mx-auto max-w-[1600px] px-2 sm:px-4 lg:px-6 pt-3 sm:pt-4">

            {/* STAGE 1: UPLOAD STAGE */}
            {pages.length === 0 ? (
              <div className="mx-auto max-w-5xl w-full pt-2 sm:pt-4 pb-8">
                {/* Hero Header */}
                <div className="mx-auto max-w-4xl text-center pt-2 sm:pt-6 pb-2">
                  <div
                    style={{
                      color: "#3158d5",
                      letterSpacing: "0.18em",
                      fontSize: "12px",
                      fontWeight: 700,
                    }}
                    className="inline-flex items-center uppercase mb-3 sm:mb-4"
                  >
                    ALL-IN-ONE PDF WORKSPACE
                  </div>

                  <h1
                    aria-live="polite"
                    className="text-center tracking-tight text-[#1c201a] flex flex-col items-center justify-center"
                    style={{ margin: "0 auto" }}
                  >
                    <span
                      style={{
                        fontSize: "clamp(42px, 5.5vw, 68px)",
                        fontWeight: 900,
                        lineHeight: 1.04,
                        letterSpacing: "-0.035em",
                        color: "#1c201a",
                        display: "block",
                        fontFamily: "var(--font-plus-jakarta-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      }}
                    >
                      Fix, patch &amp; redact.
                    </span>
                    <span
                      style={{
                        fontFamily: "'ITC Modern No. 216', var(--font-itc-modern), 'Instrument Serif', Georgia, serif",
                        fontSize: "clamp(36px, 4.6vw, 60px)",
                        fontWeight: 400,
                        fontStyle: "italic",
                        lineHeight: 1.05,
                        letterSpacing: "-0.01em",
                        color: "#1c201a",
                        display: "block",
                        marginTop: "6px",
                      }}
                    >
                      100% private in browser.
                    </span>
                  </h1>

                  <p
                    style={{
                      color: "#575a53",
                      fontSize: "15px",
                      lineHeight: 1.55,
                      margin: "18px auto 0",
                    }}
                    className="text-center font-normal px-4 max-w-[620px] mx-auto"
                  >
                    Whiteout typos, patch text, reorder pages, sign documents, and permanently redact sensitive data with zero server uploads.
                  </p>
                </div>

                {/* Upload Card */}
                <div className="mx-auto mt-6 sm:mt-8 w-full max-w-4xl">
                  <div
                    style={{
                      borderColor: "#eeede6",
                      backgroundColor: "#ecebe4",
                    }}
                    className="relative w-full rounded-2xl sm:rounded-[24px] border overflow-hidden p-2"
                  >
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingFile(true);
                      }}
                      onDragLeave={() => setIsDraggingFile(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingFile(false);
                        loadFiles(e.dataTransfer.files);
                      }}
                      style={{ backgroundColor: "#ffffff", borderColor: isDraggingFile ? "#3158d5" : "#eeede6" }}
                      className={`relative w-full rounded-xl sm:rounded-[20px] border p-6 sm:p-10 text-center transition-all duration-300 ${
                        isDraggingFile ? "ring-4 ring-[#eff4fe]" : ""
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,image/png,image/jpeg,image/webp"
                        multiple
                        onChange={(e) => loadFiles(e.target.files)}
                        className="hidden"
                      />

                      {isProcessing ? (
                        <div
                          style={{ borderColor: "#bcd5ff", backgroundColor: "#f0f5ff" }}
                          className="rounded-2xl border p-5 shadow-xs max-w-sm mx-auto"
                        >
                          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[#3158d5] text-white shadow-md">
                            <RotateCw className="h-5 w-5 animate-spin" />
                          </div>
                          <p className="mt-3 text-sm font-bold text-[#1c201a]">{processingText}</p>
                          <p className="mt-0.5 text-xs text-[#575a53]">100% in-browser RAM engine</p>
                          <div
                            style={{ backgroundColor: "#e0ebff" }}
                            className="mx-auto mt-4 max-w-[200px] h-1.5 w-full rounded-full overflow-hidden"
                          >
                            <div
                              style={{
                                width: `${processingPercent}%`,
                                backgroundColor: "#3158d5",
                                transition: "width 200ms ease",
                              }}
                              className="h-full rounded-full"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eff4fe] text-[#3158d5] shadow-xs">
                            <Upload className="w-6 h-6" />
                          </div>

                          <div>
                            <p className="text-base sm:text-lg font-bold text-[#1c201a]">
                              Drop your PDF or image here
                            </p>
                            <p className="mt-1 text-xs sm:text-sm text-[#575a53]">
                              Supports multi-page PDFs, scans, PNG, JPG, or WebP
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              style={{ backgroundColor: "#3158d5", color: "#ffffff" }}
                              className="inline-flex items-center gap-2 rounded-xl bg-[#3158d5] text-white px-5 py-2.5 text-xs sm:text-sm font-bold shadow-md hover:bg-[#2546b8] active:scale-95 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-[#3158d5] focus-visible:outline-none"
                            >
                              <FileText className="w-4 h-4" />
                              <span>Select Document</span>
                            </button>

                            <button
                              type="button"
                              onClick={loadSampleDocument}
                              style={{ borderColor: "#eeede6", backgroundColor: "#f6f5f3", color: "#1c201a" }}
                              className="inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-xs sm:text-sm font-bold hover:bg-[#eeede6] transition cursor-pointer focus-visible:ring-2 focus-visible:ring-[#3158d5] focus-visible:outline-none"
                            >
                              <span>Try Demo Invoice</span>
                            </button>
                          </div>

                          <div className="pt-3 flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span>Zero uploads · 100% private in browser memory</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* STAGE 2: WORKSPACE (PAGES LOADED) */
              <div className="space-y-3">
                {/* STICKY WORKSPACE TOOLBAR (STAGE 5) */}
                <header
                  className="sticky top-16 sm:top-[70px] z-30 bg-white/95 backdrop-blur-md rounded-2xl border border-black/[0.06] p-2.5 sm:px-4 shadow-xs flex items-center justify-between gap-2 max-w-[1600px] mx-auto"
                >
                  {/* Left: Start Over & Page Count */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      title="Start Over"
                      aria-label="Start Over"
                      onClick={handleStartOver}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#f6f5f1] hover:bg-rose-50 hover:text-rose-600 px-3 py-1.5 text-xs font-semibold text-[#575a53] transition cursor-pointer focus-visible:ring-2 focus-visible:ring-[#3158d5] focus-visible:outline-none"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Start Over</span>
                    </button>

                    <span className="hidden sm:inline text-xs font-semibold text-[#575a53]">
                      {pages.length} {pages.length === 1 ? "page" : "pages"}
                    </span>
                  </div>

                  {/* Center: 3-Mode Switch */}
                  <div className="flex items-center rounded-xl bg-[#f1f0eb] p-1 gap-1">
                    <button
                      type="button"
                      onClick={() => setMode("pages")}
                      aria-pressed={mode === "pages"}
                      style={mode === "pages" ? { backgroundColor: "#3158d5", color: "#ffffff" } : undefined}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                        mode === "pages"
                          ? "bg-[#3158d5] text-white shadow-xs"
                          : "text-[#575a53] hover:bg-[#faf9f6] hover:text-[#3158d5]"
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Pages</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMode("edit");
                        if (tool === "select") setTool("whiteout");
                      }}
                      aria-pressed={mode === "edit"}
                      style={mode === "edit" ? { backgroundColor: "#3158d5", color: "#ffffff" } : undefined}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                        mode === "edit"
                          ? "bg-[#3158d5] text-white shadow-xs"
                          : "text-[#575a53] hover:bg-[#eff4fe] hover:text-[#3158d5]"
                      }`}
                    >
                      <Eraser className="w-3.5 h-3.5" />
                      <span>Patch &amp; Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMode("redact")}
                      aria-pressed={mode === "redact"}
                      style={mode === "redact" ? { backgroundColor: "#e11d48", color: "#ffffff" } : undefined}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                        mode === "redact"
                          ? "bg-rose-600 text-white shadow-xs"
                          : "text-[#575a53] hover:bg-rose-50 hover:text-rose-600"
                      }`}
                    >
                      <RedactIcon size={14} />
                      <span>Redact</span>
                    </button>
                  </div>

                  {/* Right: Quality & Download */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="hidden sm:flex items-center gap-1 bg-[#f1f0eb] rounded-xl px-2.5 py-1 text-xs text-[#1c201a]">
                      <span className="font-semibold text-[#70746d]">Quality:</span>
                      <select
                        aria-label="Export quality"
                        value={exportQuality}
                        onChange={(e) => setExportQuality(e.target.value as "standard" | "high")}
                        className="bg-transparent font-semibold text-xs text-[#1c201a] outline-none cursor-pointer"
                      >
                        <option value="standard">Standard (150 DPI)</option>
                        <option value="high">High (220 DPI)</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      disabled={isProcessing || isExporting}
                      onClick={exportPdf}
                      aria-label="Download PDF"
                      style={{ backgroundColor: "#3158d5", color: "#ffffff" }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#3158d5] hover:bg-[#2546b8] text-xs sm:text-sm font-bold text-white px-3.5 py-1.5 shadow-xs transition cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[#3158d5] focus-visible:outline-none"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isExporting ? "Exporting..." : <span className="hidden sm:inline">Download</span>}</span>
                    </button>
                  </div>
                </header>

                {/* Dismissible Post-Export Card (Stage 1) */}
                {showPostExportCard && (
                  <PostExportCard onDismiss={() => setShowPostExportCard(false)} />
                )}

                {/* ── MODE 1: VISUAL PAGE ORGANIZER (PAGES VIEW) ──────────────── */}
                {mode === "pages" && (
                  <div className="rounded-3xl border border-[#eeede6] bg-white p-5 sm:p-6 shadow-xs animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#eeede6]">
                      <div>
                        <h2 className="text-base font-bold text-[#1c201a]">Organize &amp; Assemble Pages</h2>
                        <p className="text-xs text-[#575a53]">Reorder, rotate, delete, or merge additional documents.</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => appendFileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#bcd5ff] bg-[#eff4fe] hover:bg-[#e8effe] px-3.5 py-2 text-xs font-bold text-[#3158d5] transition cursor-pointer"
                      >
                        <input
                          ref={appendFileInputRef}
                          type="file"
                          accept=".pdf,image/png,image/jpeg,image/webp"
                          multiple
                          onChange={(e) => loadFiles(e.target.files, true)}
                          hidden
                        />
                        <Plus className="w-4 h-4" />
                        <span>Add Pages / PDF</span>
                      </button>
                    </div>

                    {/* Page Grid (Stage 3 PageThumb) */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
                      {pages.map((p, idx) => {
                        const isCurrent = idx === activePageIndex;
                        return (
                          <div
                            key={p.id}
                            className={`group relative rounded-2xl border p-2.5 flex flex-col justify-between transition-all shadow-xs hover:shadow-md bg-white ${
                              isCurrent ? "border-[#3158d5] ring-2 ring-[#eff4fe]" : "border-[#eeede6]"
                            }`}
                          >
                            {/* Page Header */}
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-xs ${isCurrent ? "font-bold text-[#3158d5]" : "font-semibold text-[#70746d]"}`}>
                                Page {idx + 1}
                              </span>

                              <div className="flex items-center gap-0.5">
                                <button
                                  type="button"
                                  title="Move Left"
                                  aria-label="Move Page Left"
                                  disabled={idx === 0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    movePage(idx, idx - 1);
                                  }}
                                  className="h-6 w-6 rounded-lg text-[#8c8f87] hover:text-[#3158d5] hover:bg-[#eff4fe] flex items-center justify-center disabled:opacity-20 cursor-pointer transition"
                                >
                                  <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  title="Move Right"
                                  aria-label="Move Page Right"
                                  disabled={idx === pages.length - 1}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    movePage(idx, idx + 1);
                                  }}
                                  className="h-6 w-6 rounded-lg text-[#8c8f87] hover:text-[#3158d5] hover:bg-[#eff4fe] flex items-center justify-center disabled:opacity-20 cursor-pointer transition"
                                >
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Thumbnail with PageThumb */}
                            <PageThumb
                              page={p}
                              pageNumber={idx + 1}
                              isActive={isCurrent}
                              drawOverlaysFn={drawOverlays}
                              onClick={() => {
                                setActivePageIndex(idx);
                                setMode("edit");
                              }}
                              badgeStyle="editsCount"
                            />

                            {/* Action Footer */}
                            <div className="mt-2.5 flex items-center justify-between px-1">
                              <button
                                type="button"
                                title="Rotate 90° Clockwise"
                                aria-label="Rotate Page 90° Clockwise"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  rotatePage(idx);
                                }}
                                className="h-7 w-7 rounded-lg text-[#8c8f87] hover:text-[#3158d5] hover:bg-[#eff4fe] flex items-center justify-center transition cursor-pointer"
                              >
                                <RotateCw className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                title="Duplicate Page"
                                aria-label="Duplicate Page"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  duplicatePage(idx);
                                }}
                                className="h-7 w-7 rounded-lg text-[#8c8f87] hover:text-[#3158d5] hover:bg-[#eff4fe] flex items-center justify-center transition cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                title="Delete Page"
                                aria-label="Delete Page"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deletePage(idx);
                                }}
                                className="h-7 w-7 rounded-lg text-[#8c8f87] hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── MODE 2 & 3: THREE-COLUMN WORKSPACE (STAGE 4) ───────── */}
                {(mode === "edit" || mode === "redact") && (
                  <div className="flex flex-col lg:flex-row items-start gap-4">
                    {/* COLUMN 1: VERTICAL FILMSTRIP (DESKTOP) */}
                    <aside
                      aria-label="Document pages filmstrip"
                      className="hidden lg:flex w-24 shrink-0 flex-col gap-2.5 overflow-y-auto max-h-[calc(100dvh-220px)] min-h-[520px] pr-1.5 scrollbar-thin"
                    >
                      {pages.map((p, idx) => (
                        <div
                          key={p.id}
                          ref={(el) => {
                            desktopFilmstripRefs.current[idx] = el;
                          }}
                        >
                          <PageThumb
                            page={p}
                            pageNumber={idx + 1}
                            isActive={idx === activePageIndex}
                            drawOverlaysFn={drawOverlays}
                            onClick={() => setActivePageIndex(idx)}
                            badgeStyle="dot"
                          />
                        </div>
                      ))}
                    </aside>

                    {/* COLUMN 2: MIDDLE CANVAS STAGE */}
                    <div className="flex-1 min-w-0 w-full flex flex-col gap-2">
                      {/* Tool Hint Strip (Stage 4) */}
                      <div className="flex items-center gap-2 px-1 text-xs font-medium text-[#575a53]">
                        <Sparkles className="w-3.5 h-3.5 text-[#3158d5] shrink-0" />
                        <span className="truncate">{getToolHint()}</span>
                      </div>

                      {/* Compact Canvas Header (Stage 4) */}
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/[0.06] bg-white px-3 py-1.5 shadow-2xs">
                        {/* Page navigation */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="Previous Page"
                            aria-label="Previous Page"
                            disabled={activePageIndex === 0}
                            onClick={() => setActivePageIndex((prev) => Math.max(0, prev - 1))}
                            className="p-1.5 rounded-lg text-[#1c201a] hover:bg-[#faf9f6] transition cursor-pointer disabled:opacity-20 disabled:pointer-events-none"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-bold text-[#1c201a] px-1">
                            Page {activePageIndex + 1} of {pages.length}
                          </span>
                          <button
                            type="button"
                            title="Next Page"
                            aria-label="Next Page"
                            disabled={activePageIndex >= pages.length - 1}
                            onClick={() => setActivePageIndex((prev) => Math.min(pages.length - 1, prev + 1))}
                            className="p-1.5 rounded-lg text-[#1c201a] hover:bg-[#faf9f6] transition cursor-pointer disabled:opacity-20 disabled:pointer-events-none"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Rotate & Undo & Redo */}
                        <div className="flex items-center gap-1 px-1">
                          <button
                            type="button"
                            title="Rotate page 90° clockwise"
                            aria-label="Rotate page 90° clockwise"
                            onClick={() => rotatePage(activePageIndex)}
                            className="p-1.5 rounded-lg text-[#575a53] hover:text-[#3158d5] hover:bg-[#eff4fe] transition cursor-pointer"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Undo (Ctrl+Z)"
                            aria-label="Undo"
                            disabled={undoStack.length === 0}
                            onClick={handleUndo}
                            className="p-1.5 rounded-lg text-[#575a53] hover:text-[#3158d5] hover:bg-[#eff4fe] transition cursor-pointer disabled:opacity-20"
                          >
                            <Undo2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Redo (Ctrl+Y)"
                            aria-label="Redo"
                            disabled={redoStack.length === 0}
                            onClick={handleRedo}
                            className="p-1.5 rounded-lg text-[#575a53] hover:text-[#3158d5] hover:bg-[#eff4fe] transition cursor-pointer disabled:opacity-20"
                          >
                            <Redo2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Zoom dock */}
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            title="Zoom Out"
                            aria-label="Zoom Out"
                            onClick={() => setZoom((z) => Math.max(0.25, Math.round((z - 0.25) * 100) / 100))}
                            className="p-1.5 rounded-lg text-[#575a53] hover:text-[#3158d5] hover:bg-[#eff4fe] transition cursor-pointer"
                          >
                            <ZoomOut className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-semibold text-[#575a53] min-w-[2.75rem] text-center">
                            {zoom === 1 ? "Fit" : `${Math.round(zoom * 100)}%`}
                          </span>
                          <button
                            type="button"
                            title="Zoom In"
                            aria-label="Zoom In"
                            onClick={() => setZoom((z) => Math.min(3, Math.round((z + 0.25) * 100) / 100))}
                            className="p-1.5 rounded-lg text-[#575a53] hover:text-[#3158d5] hover:bg-[#eff4fe] transition cursor-pointer"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Reset zoom (Fit)"
                            aria-label="Reset zoom (Fit)"
                            onClick={() => setZoom(1)}
                            className="p-1.5 rounded-lg text-[#575a53] hover:text-[#3158d5] hover:bg-[#eff4fe] transition cursor-pointer"
                          >
                            <Maximize className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Main Canvas Viewport (Stage 4) */}
                      <div
                        ref={viewportRef}
                        style={{ height: "min(72dvh, 780px)", minHeight: "440px" }}
                        className="relative w-full rounded-2xl bg-[#ecebe5] overflow-auto flex items-center justify-center p-4 sm:p-6 lg:p-8"
                      >
                        <canvas
                          ref={canvasRef}
                          onPointerDown={handleCanvasPointerDown}
                          onPointerMove={handleCanvasPointerMove}
                          onPointerUp={handleCanvasPointerUp}
                          onPointerCancel={handleCanvasPointerCancel}
                          onDoubleClick={handleCanvasDoubleClick}
                          style={{
                            width: zoom <= 1 ? "auto" : `${Math.round(zoom * 100)}%`,
                            height: zoom <= 1 ? "auto" : "auto",
                            maxWidth: zoom <= 1 ? "85%" : "none",
                            maxHeight: zoom <= 1 ? "85%" : "none",
                            aspectRatio: activePage
                              ? (activePage.rotation === 90 || activePage.rotation === 270)
                                ? `${activePage.height} / ${activePage.width}`
                                : `${activePage.width} / ${activePage.height}`
                              : "auto",
                            touchAction: canvasTouchAction,
                          }}
                          className="rounded-xs shadow-xl shadow-black/10 cursor-crosshair bg-white transition-[width,height] duration-75 select-none"
                        />
                      </div>

                      {/* Horizontal Filmstrip (Mobile / Tablet below lg) */}
                      <div className="lg:hidden w-full flex items-center gap-2 overflow-x-auto py-1 px-0.5 scrollbar-thin">
                        {pages.map((p, idx) => (
                          <div
                            key={p.id}
                            ref={(el) => {
                              mobileFilmstripRefs.current[idx] = el;
                            }}
                            className="w-16 sm:w-20 shrink-0"
                          >
                            <PageThumb
                              page={p}
                              pageNumber={idx + 1}
                              isActive={idx === activePageIndex}
                              drawOverlaysFn={drawOverlays}
                              onClick={() => setActivePageIndex(idx)}
                              badgeStyle="dot"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* COLUMN 3: DESKTOP RIGHT TOOL PANEL */}
                    <div className="hidden lg:block w-80 shrink-0 max-h-[calc(100dvh-220px)] min-h-[520px] overflow-y-auto pr-1 space-y-3.5 scrollbar-thin">
                      {renderToolPanel()}
                    </div>
                  </div>
                )}

                {/* MOBILE BOTTOM TOOLBAR (STAGE 5 - FIXED AT BOTTOM BELOW LG) */}
                {(mode === "edit" || mode === "redact") && (
                  <nav
                    aria-label="Mobile document editing tools"
                    className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#eeede6] px-2 py-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-xl flex items-center justify-around lg:hidden"
                  >
                    {mode === "edit" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setTool("whiteout")}
                          style={tool === "whiteout" ? { color: "#3158d5", backgroundColor: "#eff4fe" } : undefined}
                          className={`min-h-[44px] min-w-[44px] px-2 py-1 rounded-xl flex flex-col items-center justify-center gap-0.5 text-xs font-semibold transition cursor-pointer ${
                            tool === "whiteout" ? "text-[#3158d5] font-bold bg-[#eff4fe]" : "text-[#575a53]"
                          }`}
                        >
                          <Eraser className="w-5 h-5" />
                          <span>Whiteout</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTool("text")}
                          style={tool === "text" ? { color: "#3158d5", backgroundColor: "#eff4fe" } : undefined}
                          className={`min-h-[44px] min-w-[44px] px-2 py-1 rounded-xl flex flex-col items-center justify-center gap-0.5 text-xs font-semibold transition cursor-pointer ${
                            tool === "text" ? "text-[#3158d5] font-bold bg-[#eff4fe]" : "text-[#575a53]"
                          }`}
                        >
                          <Type className="w-5 h-5" />
                          <span>Text</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setTool("sign");
                            setIsSignatureOpen(true);
                          }}
                          style={tool === "sign" ? { color: "#3158d5", backgroundColor: "#eff4fe" } : undefined}
                          className={`min-h-[44px] min-w-[44px] px-2 py-1 rounded-xl flex flex-col items-center justify-center gap-0.5 text-xs font-semibold transition cursor-pointer ${
                            tool === "sign" ? "text-[#3158d5] font-bold bg-[#eff4fe]" : "text-[#575a53]"
                          }`}
                        >
                          <PenLine className="w-5 h-5" />
                          <span>Sign</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTool("select")}
                          style={tool === "select" ? { color: "#3158d5", backgroundColor: "#eff4fe" } : undefined}
                          className={`min-h-[44px] min-w-[44px] px-2 py-1 rounded-xl flex flex-col items-center justify-center gap-0.5 text-xs font-semibold transition cursor-pointer ${
                            tool === "select" ? "text-[#3158d5] font-bold bg-[#eff4fe]" : "text-[#575a53]"
                          }`}
                        >
                          <MousePointer2 className="w-5 h-5" />
                          <span>Select</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setTool("stamp");
                            setIsMobileDrawerOpen(true);
                          }}
                          style={tool === "stamp" ? { color: "#3158d5", backgroundColor: "#eff4fe" } : undefined}
                          className={`min-h-[44px] min-w-[44px] px-2 py-1 rounded-xl flex flex-col items-center justify-center gap-0.5 text-xs font-semibold transition cursor-pointer ${
                            tool === "stamp" ? "text-[#3158d5] font-bold bg-[#eff4fe]" : "text-[#575a53]"
                          }`}
                        >
                          <StampIcon className="w-5 h-5" />
                          <span>Stamps</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsMobileDrawerOpen((prev) => !prev)}
                          className="min-h-[44px] min-w-[44px] px-2 py-1 rounded-xl flex flex-col items-center justify-center gap-0.5 text-xs font-semibold text-[#575a53] hover:text-[#3158d5] hover:bg-[#eff4fe] transition cursor-pointer"
                        >
                          <SlidersHorizontal className="w-5 h-5" />
                          <span>More</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setRedactTool("draw")}
                          style={redactTool === "draw" ? { color: "#e11d48", backgroundColor: "#ffe4e6" } : undefined}
                          className={`min-h-[44px] min-w-[44px] px-2 py-1 rounded-xl flex flex-col items-center justify-center gap-0.5 text-xs font-semibold transition cursor-pointer ${
                            redactTool === "draw" ? "text-rose-600 font-bold bg-rose-50" : "text-[#575a53]"
                          }`}
                        >
                          <RedactIcon size={20} />
                          <span>Draw Box</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRedactTool("select")}
                          style={redactTool === "select" ? { color: "#3158d5", backgroundColor: "#eff4fe" } : undefined}
                          className={`min-h-[44px] min-w-[44px] px-2 py-1 rounded-xl flex flex-col items-center justify-center gap-0.5 text-xs font-semibold transition cursor-pointer ${
                            redactTool === "select" ? "text-[#3158d5] font-bold bg-[#eff4fe]" : "text-[#575a53]"
                          }`}
                        >
                          <MousePointer2 className="w-5 h-5" />
                          <span>Select</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRedactStyle((s) => s === "blackout" ? "blur" : s === "blur" ? "whiteout" : "blackout")}
                          className="min-h-[44px] min-w-[44px] px-2 py-1 rounded-xl flex flex-col items-center justify-center gap-0.5 text-xs font-semibold text-[#1c201a] bg-[#faf9f6] border border-[#eeede6] transition cursor-pointer"
                        >
                          <Layers className="w-5 h-5" />
                          <span className="capitalize">{redactStyle}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsMobileDrawerOpen((prev) => !prev)}
                          className="min-h-[44px] min-w-[44px] px-2 py-1 rounded-xl flex flex-col items-center justify-center gap-0.5 text-xs font-semibold text-[#575a53] hover:text-[#3158d5] hover:bg-[#eff4fe] transition cursor-pointer"
                        >
                          <SlidersHorizontal className="w-5 h-5" />
                          <span>More</span>
                        </button>
                      </>
                    )}
                  </nav>
                )}

                {/* MOBILE BOTTOM SHEET DRAWER (STAGE 5) */}
                {isMobileDrawerOpen && (
                  <div
                    className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/40 backdrop-blur-xs lg:hidden animate-in fade-in duration-150"
                    onClick={() => setIsMobileDrawerOpen(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Tool Options"
                  >
                    <div
                      className="w-full max-h-[80vh] overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl border-t border-[#eeede6] space-y-4 animate-in slide-in-from-bottom duration-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-[#eeede6]">
                        <span className="text-xs font-bold text-[#1c201a] uppercase tracking-wider">
                          Tool Options
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsMobileDrawerOpen(false)}
                          className="p-1 rounded-lg text-[#8c8f87] hover:text-[#3158d5] hover:bg-[#eff4fe] transition"
                          aria-label="Close tools panel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {renderToolPanel()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PASSWORD PROMPT MODAL */}
            {passwordPrompt && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
                role="dialog"
                aria-modal="true"
                aria-label="Password Protected PDF"
              >
                <div
                  style={{ backgroundColor: "#ffffff", borderColor: "#eeede6" }}
                  className="w-full max-w-sm rounded-3xl p-6 shadow-2xl border space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-[#eeede6]">
                    <div>
                      <h3 className="text-base font-bold text-[#1c201a]">Password Protected PDF</h3>
                      <p className="text-xs text-[#575a53] truncate max-w-[240px]">{passwordPrompt.fileName}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        passwordPrompt.onCancel();
                        setPasswordInput("");
                      }}
                      aria-label="Close password dialog"
                      className="h-7 w-7 rounded-lg border border-[#eeede6] text-[#8c8f87] hover:text-[#3158d5] hover:bg-[#eff4fe] flex items-center justify-center transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {passwordPrompt.reason === 2 && (
                    <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 font-medium">
                      Incorrect password, try again
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-[#1c201a] block mb-1.5">Document Password</label>
                    <input
                      type="password"
                      autoFocus
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && passwordInput) {
                          const pw = passwordInput;
                          setPasswordInput("");
                          passwordPrompt.onSubmit(pw);
                        }
                      }}
                      placeholder="Enter password to unlock"
                      className="w-full rounded-xl border border-[#eeede6] bg-[#faf9f6] px-3.5 py-2.5 text-xs text-[#1c201a] placeholder-slate-400 outline-none focus:border-[#3158d5] focus:bg-white"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#eeede6]">
                    <button
                      type="button"
                      onClick={() => {
                        passwordPrompt.onCancel();
                        setPasswordInput("");
                      }}
                      className="rounded-xl border border-[#eeede6] px-4 py-2 text-xs font-bold text-[#575a53] hover:bg-[#f6f5f3] transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const pw = passwordInput;
                        setPasswordInput("");
                        passwordPrompt.onSubmit(pw);
                      }}
                      className="rounded-xl px-4 py-2 text-xs font-bold bg-[#3158d5] text-white shadow-xs hover:opacity-95 transition cursor-pointer"
                    >
                      Unlock
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SIGNATURE MODAL */}
            {isSignatureOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
                role="dialog"
                aria-modal="true"
                aria-label="Draw your signature"
              >
                <div
                  style={{ backgroundColor: "#ffffff", borderColor: "#eeede6" }}
                  className="w-full max-w-md rounded-3xl p-6 shadow-2xl border space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-[#eeede6]">
                    <h3 className="text-base font-bold text-[#1c201a]">Draw Signature</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignatureOpen(false);
                        clearSigPad();
                      }}
                      aria-label="Close signature modal"
                      className="h-7 w-7 rounded-lg border border-[#eeede6] text-[#8c8f87] hover:text-[#3158d5] hover:bg-[#eff4fe] flex items-center justify-center transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="rounded-2xl border border-[#eeede6] bg-[#f8fafd] p-2">
                    <canvas
                      ref={sigCanvasRef}
                      width={400}
                      height={180}
                      onPointerDown={startSigDraw}
                      onPointerMove={moveSigDraw}
                      onPointerUp={stopSigDraw}
                      onPointerCancel={stopSigDraw}
                      style={{ touchAction: "none" }}
                      className="w-full h-44 rounded-xl bg-white cursor-crosshair shadow-inner"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={clearSigPad}
                      className="text-xs font-bold text-[#70746d] hover:text-rose-600 transition cursor-pointer"
                    >
                      Clear Pad
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsSignatureOpen(false);
                          clearSigPad();
                        }}
                        className="rounded-xl border border-[#eeede6] px-4 py-2 text-xs font-bold text-[#575a53] hover:bg-[#f6f5f3] transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={insertSignatureOverlay}
                        className="rounded-xl px-4 py-2 text-xs font-bold bg-[#3158d5] text-white shadow-xs hover:opacity-95 transition cursor-pointer"
                      >
                        Place on Page
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CENTRED WORKSPACE PROGRESS OVERLAY (STAGE 2) */}
            <ProgressOverlay
              isVisible={pages.length > 0 && (isProcessing || isExporting)}
              processingText={processingText}
              processingPercent={processingPercent}
            />

            {/* CONFIRM DIALOG (STAGE 1) */}
            <ConfirmDialog
              options={confirmState ? confirmState.options : null}
              onConfirm={handleConfirmConfirm}
              onCancel={handleConfirmCancel}
            />

            {/* TOAST NOTIFICATIONS (STAGE 1) */}
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />

            {/* FAQ SECTION (STAGE 0 COMPONENT) */}
            <FaqSection />

          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
