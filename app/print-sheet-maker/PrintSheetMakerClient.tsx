"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import {
  PAPER_SIZES,
  planLayout,
  placeItems,
  placeIdCards,
  IdCardLayoutType,
  Orientation,
  FitMode,
  LayoutPlan,
  PlacedItem,
} from "@/lib/print-sheet/layout";
import { buildPdf, PreparedImage, PrintOptions } from "@/lib/print-sheet/pdf";
import CardCropEditorModal from "@/components/print-sheet/CardCropEditorModal";
import IdCardPanel, { IdCardItemData } from "@/components/print-sheet/IdCardPanel";
import { cardScanner, CornerPoint } from "@/lib/print-sheet/cardScanner";

export interface PhotoItem {
  id: string;
  url: string;
  name: string;
  file: File;
  w: number;
  h: number;
  mw: number;
  mh: number;
  copies: number;
  rotation: number;
  scalePercent: number; // 25 to 250, default 100
}

const PRESET_SIZES: Record<string, [number, number]> = {
  "Passport 35×45 mm": [35, 45],
  "2×2 inch": [50.8, 50.8],
  "ID card 85.6×54 mm": [85.6, 54],
  "4×6 inch": [101.6, 152.4],
  "Stamp 20×25 mm": [20, 25],
};

interface PresetChip {
  id: string;
  label: string;
  wMm: number;
  hMm: number;
  isFullPage?: boolean;
}

const PRESET_CHIPS: PresetChip[] = [
  { id: "passport", label: "Passport 35×45", wMm: 35, hMm: 45 },
  { id: "2x2", label: "2×2 inch", wMm: 50.8, hMm: 50.8 },
  { id: "idcard", label: "ID card 85.6×54", wMm: 85.6, hMm: 54 },
  { id: "4x6", label: "4×6 inch", wMm: 101.6, hMm: 152.4 },
  { id: "stamp", label: "Stamp 20×25", wMm: 20, hMm: 25 },
  { id: "fullpage", label: "Full page", wMm: 0, hMm: 0, isFullPage: true },
];

const formatDim = (v: number): string => {
  if (!v || isNaN(v)) return "0";
  const r = Math.round(v * 10) / 10;
  return r % 1 === 0 ? r.toFixed(0) : r.toFixed(1);
};

const FAQ_LIST = [
  {
    q: "How do I print the front and back of my ID card on one page?",
    a: "Add both sides of your card using the upload button or camera on your phone. Spellense automatically detects the corners, straightens the perspective, and arranges both the front and back together on a single A4 or Letter page. You can choose a Stacked (top and bottom) or Side-by-Side layout, then click 'Download PDF' or 'Print'.",
  },
  {
    q: "What is the exact physical size of a standard ID card?",
    a: "Standard identity cards, driver's licenses, and residency badges follow the international ISO/IEC 7810 ID-1 (CR80) standard, measuring exactly 85.6 mm × 54 mm (3.370 × 2.125 inches). Spellense prints your card at 100% exact real-world dimensions by default, ensuring your printed photocopy matches the genuine card size.",
  },
  {
    q: "Is it safe to copy my ID card or driver's license here?",
    a: "Yes, 100% safe. All image processing, perspective alignment, and PDF compilation take place entirely inside your web browser. No photos, personal identification numbers, or card data are ever transmitted to or stored on any server or cloud service. Furthermore, EXIF and GPS location metadata are stripped automatically, and your files vanish the moment you close the browser tab.",
  },
  {
    q: "What printer settings should I use to get 100% exact size?",
    a: "In your computer or phone's print dialog (Adobe Acrobat, Preview, or Chrome), always select 'Actual Size' or set the scale to '100%'. Never choose 'Fit to Page' or 'Shrink Oversized Pages', as printer drivers automatically shrink the page margins, making your printed card smaller than standard physical dimensions.",
  },
  {
    q: "What paper sizes are supported?",
    a: "Spellense supports standard international A4 paper (210 × 297 mm) and US Letter paper (8.5 × 11 inches), as well as A3, A5, and custom paper sizes. You can print in either Portrait or Landscape orientation.",
  },
  {
    q: "Can I copy and print multiple ID cards on the same page?",
    a: "Yes. Click '+ Add another card' to add up to 5 different identity cards (or multiple family members' / employees' cards). Spellense automatically positions each card pair cleanly across the page or generates additional pages if required.",
  },
  {
    q: "What is the security watermark feature and why should I use it?",
    a: "The security watermark feature adds semi-transparent protective text (such as 'FOR VERIFICATION ONLY' or your custom note) across your card copies. This prevents identity theft and stops unauthorized parties from reusing your ID photocopy for unapproved registrations or loans.",
  },
  {
    q: "How does the automatic corner crop and scanner work?",
    a: "When you upload a photo of your card, our built-in scanner analyzes the image contrast to locate the card's 4 corners, corrects any angle distortion, and flattens it into a rectangular ID card. If your photo was taken on a busy surface, you can easily click 'Edit' to adjust the 4 corner pins manually with a high-magnification loupe.",
  },
];

const ID_CARD_FORMATS_DATA = [
  {
    name: "National ID (ISO/IEC 7810 ID-1)",
    dim: "85.6 × 54 mm",
    scale: "100% (1:1 Exact)",
    use: "National identity cards, state IDs, citizenship cards",
  },
  {
    name: "Driver's License",
    dim: "85.6 × 54 mm",
    scale: "100% (1:1 Exact)",
    use: "Standard photocard driving licenses worldwide",
  },
  {
    name: "Corporate & Student Badges",
    dim: "85.6 × 54 mm",
    scale: "100% (1:1 Exact)",
    use: "Office access cards, campus badges, student identity cards",
  },
  {
    name: "Health & Medical Insurance",
    dim: "85.6 × 54 mm",
    scale: "100% (1:1 Exact)",
    use: "Medical insurance cards, health service cards, clinic passes",
  },
  {
    name: "Voter & Election ID",
    dim: "85.6 × 54 mm",
    scale: "100% (1:1 Exact)",
    use: "Official government voter registration and election cards",
  },
  {
    name: "Vehicle Registration & Permits",
    dim: "85.6 × 54 mm",
    scale: "100% (1:1 Exact)",
    use: "Vehicle registration cards, ownership permits",
  },
];

const SETTINGS_STORAGE_KEY = "spellense_print_sheet_settings_v2";
const PRINT_REMINDER_KEY = "spellense_print_reminder_dismissed_v1";

interface SavedSettings {
  paper?: string;
  orient?: Orientation;
  fitType?: "auto" | "custom";
  exactSize?: boolean;
  gridCols?: number;
  gridRows?: number;
  customWidth?: number;
  customHeight?: number;
  sizeUnit?: "mm" | "in";
  gap?: number;
  margin?: number;
  fitMode?: FitMode;
  cutGuide?: "none" | "marks" | "lines" | "border";
  bleed?: number;
  preset?: string;
  customCell?: [number, number];
  customUnit?: "mm" | "cm" | "in";
}

export default function PrintSheetMakerClient() {
  const [mounted, setMounted] = useState<boolean>(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Photos state — NEVER stored in localStorage or IndexedDB
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [activePage, setActivePage] = useState<number>(0);
  const [extraBlankPages, setExtraBlankPages] = useState<number>(0);

  // Settings
  const [paper, setPaper] = useState<string>("A4");
  const [customPaper, setCustomPaper] = useState<[number, number]>([210, 297]);
  const [orient, setOrient] = useState<Orientation>("portrait");
  const [globalCopies, setGlobalCopies] = useState<number>(1);
  const [fitType, setFitType] = useState<"auto" | "custom">("auto");
  const [exactSize, setExactSize] = useState<boolean>(false);
  const [gridCols, setGridCols] = useState<number>(2);
  const [gridRows, setGridRows] = useState<number>(3);
  const [customWidth, setCustomWidth] = useState<number>(35);
  const [customHeight, setCustomHeight] = useState<number>(45);
  const [sizeUnit, setSizeUnit] = useState<"mm" | "in">("mm");
  const [selectedPresetChip, setSelectedPresetChip] = useState<string | null>("passport");
  const [aspectRatioLocked, setAspectRatioLocked] = useState<boolean>(true);
  const [fitMode, setFitMode] = useState<FitMode>("fill");
  const [margin, setMargin] = useState<number>(3); // Default 3 mm
  const [gap, setGap] = useState<number>(2); // Default 2 mm
  const [cutGuide, setCutGuide] = useState<"none" | "marks" | "lines" | "border">("none");
  const [bleed, setBleed] = useState<number>(0);

  // Saved settings tracking
  const [savedSettingsData, setSavedSettingsData] = useState<SavedSettings | null>(null);
  const [hasAppliedSavedSettings, setHasAppliedSavedSettings] = useState<boolean>(false);
  const [highlightedPage, setHighlightedPage] = useState<number | null>(null);
  const prevPagesLengthRef = useRef<number>(0);

  // UI state
  const [previewMode, setPreviewMode] = useState<"fit" | "actual">("fit");
  const [mobileTab, setMobileTab] = useState<"preview" | "settings">("preview");
  const [showMoreOptions, setShowMoreOptions] = useState<boolean>(false);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [canShare, setCanShare] = useState<boolean>(false);
  const [hasSavedSettings, setHasSavedSettings] = useState<boolean>(false);
  const [showPrintReminder, setShowPrintReminder] = useState<boolean>(false);
  const [dontShowReminderAgain, setDontShowReminderAgain] = useState<boolean>(false);
  const [pendingPrintAction, setPendingPrintAction] = useState<"download" | "print" | "download_id" | "print_id" | null>(null);

  // Selected photo popover state
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [popoverPlacement, setPopoverPlacement] = useState<"top" | "bottom">("bottom");
  const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingHeader, setIsDraggingHeader] = useState<boolean>(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);

  // Local scale state to throttle slider & prevent freeze
  const [liveSliderScale, setLiveSliderScale] = useState<number>(100);
  const livePreviewRef = useRef<Record<string, number>>({});

  // Mode selection: default "id" mode
  const [toolMode, setToolMode] = useState<"landing" | "photos" | "id">("id");
  const [showSwitchConfirm, setShowSwitchConfirm] = useState<boolean>(false);
  const [pendingSwitchMode, setPendingSwitchMode] = useState<"photos" | "id" | null>(null);

  // ID Mode State
  const [idCards, setIdCards] = useState<IdCardItemData[]>([{ id: "card_1" }]);
  const [idLayout, setIdLayout] = useState<IdCardLayoutType>("stacked");
  const [idScale, setIdScale] = useState<number>(1);
  const [idPaper, setIdPaper] = useState<string>("A4");
  const [idOrient, setIdOrient] = useState<Orientation>("portrait");
  const [idWatermarkEnabled, setIdWatermarkEnabled] = useState<boolean>(false);
  const [idWatermarkText, setIdWatermarkText] = useState<string>("For verification only");
  const [idCutGuide, setIdCutGuide] = useState<"none" | "marks" | "lines">("none");
  const [idTopMargin, setIdTopMargin] = useState<number>(30); // 30 mm = 3 cm default from top edge
  const [idActivePage, setIdActivePage] = useState<number>(0);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStatusText, setScanStatusText] = useState<string>("");

  // Crop Editor State
  const [cropModalOpen, setCropModalOpen] = useState<boolean>(false);
  const [cropTarget, setCropTarget] = useState<{ cardIndex: number; side: "front" | "back" } | null>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string>("");
  const [cropInitialCorners, setCropInitialCorners] = useState<[CornerPoint, CornerPoint, CornerPoint, CornerPoint] | null>(null);
  const [cropWarning, setCropWarning] = useState<string | null>(null);

  // Refs
  const sheetContainerRef = useRef<HTMLDivElement>(null);
interface HistorySnapshot {
  photos: PhotoItem[];
  fitType: "auto" | "custom";
  exactSize: boolean;
  gridCols: number;
  gridRows: number;
  customWidth: number;
  customHeight: number;
  selectedPresetChip: string | null;
  selectedPhotoId: string | null;
  paper: string;
  orient: Orientation;
  globalCopies: number;
  margin: number;
  gap: number;
  fitMode: FitMode;
}

  const popoverRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HistorySnapshot[]>([]);
  const [historyLength, setHistoryLength] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const idFrontInputRef = useRef<HTMLInputElement>(null);
  const idBackInputRef = useRef<HTMLInputElement>(null);
  const idCameraInputRef = useRef<HTMLInputElement>(null);
  const [isIdDragging, setIsIdDragging] = useState<boolean>(false);

  const showToast = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  }, []);

  const pushHistory = useCallback(
    (overridePhotos?: PhotoItem[]) => {
      const snapPhotos = overridePhotos || photos;
      const snap: HistorySnapshot = {
        photos: snapPhotos.map((p) => ({ ...p })),
        fitType,
        exactSize,
        gridCols,
        gridRows,
        customWidth,
        customHeight,
        selectedPresetChip,
        selectedPhotoId,
        paper,
        orient,
        globalCopies,
        margin,
        gap,
        fitMode,
      };
      historyRef.current = [...historyRef.current.slice(-25), snap];
      setHistoryLength(historyRef.current.length);
    },
    [
      photos,
      fitType,
      exactSize,
      gridCols,
      gridRows,
      customWidth,
      customHeight,
      selectedPresetChip,
      selectedPhotoId,
      paper,
      orient,
      globalCopies,
      margin,
      gap,
      fitMode,
    ]
  );

  const handleUndo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const previous = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    setHistoryLength(historyRef.current.length);

    // Keep active selected photo if available, or fall back to snapshot's photo
    const targetPhotoId = selectedPhotoId || previous.selectedPhotoId;

    setPhotos(previous.photos);
    setFitType(previous.fitType);
    setExactSize(previous.exactSize);
    setGridCols(previous.gridCols);
    setGridRows(previous.gridRows);
    setCustomWidth(previous.customWidth);
    setCustomHeight(previous.customHeight);
    setSelectedPresetChip(previous.selectedPresetChip);
    setPaper(previous.paper);
    setOrient(previous.orient);
    setGlobalCopies(previous.globalCopies);
    setMargin(previous.margin);
    setGap(previous.gap);
    setFitMode(previous.fitMode);

    if (targetPhotoId) {
      const stillExists = previous.photos.some((p) => p.id === targetPhotoId);
      if (stillExists) {
        setSelectedPhotoId(targetPhotoId);
        setTimeout(() => {
          const cellEl = document.getElementById(`photo-cell-${targetPhotoId}`);
          if (cellEl && sheetContainerRef.current && window.innerWidth >= 640) {
            const cellRect = cellEl.getBoundingClientRect();
            const containerRect = sheetContainerRef.current.getBoundingClientRect();
            const cellTop = cellRect.top - containerRect.top;
            const cellBottom = cellRect.bottom - containerRect.top;
            const cellCenterX = cellRect.left - containerRect.left + cellRect.width / 2;
            const popoverWidth = 280;
            const popoverEstimatedHeight = 290;
            const spaceBelow = containerRect.height - cellBottom;
            if (spaceBelow >= popoverEstimatedHeight + 15) {
              setPopoverPlacement("bottom");
              setPopoverCoords({
                top: cellBottom + 8,
                left: Math.max(10, Math.min(containerRect.width - popoverWidth - 10, cellCenterX - popoverWidth / 2)),
              });
            } else {
              setPopoverPlacement("top");
              setPopoverCoords({
                top: Math.max(10, cellTop - popoverEstimatedHeight - 8),
                left: Math.max(10, Math.min(containerRect.width - popoverWidth - 10, cellCenterX - popoverWidth / 2)),
              });
            }
          }
        }, 50);
      } else {
        setSelectedPhotoId(null);
      }
    }

    showToast("Reverted to previous state");
  }, [selectedPhotoId, showToast]);

  // Load saved settings from localStorage on mount (NEVER save photos)
  useEffect(() => {
    setMounted(true);
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      setCanShare(true);
    }

    // ID card mode is default and exclusive for print-sheet-maker
    setToolMode("id");

    const savedWm = localStorage.getItem("spellense_id_watermark_text");
    if (savedWm) setIdWatermarkText(savedWm);

    const savedTopMargin = localStorage.getItem("spellense_id_top_margin");
    if (savedTopMargin !== null) {
      const parsed = Number(savedTopMargin);
      if (!isNaN(parsed)) setIdTopMargin(parsed);
    }

    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        setHasSavedSettings(true);
        const data: SavedSettings = JSON.parse(saved);
        setSavedSettingsData(data);
        if (data.paper) setPaper(data.paper);
        if (data.orient) setOrient(data.orient);
        if (data.fitType) setFitType(data.fitType);
        if (typeof data.exactSize === "boolean") setExactSize(data.exactSize);
        if (typeof data.gridCols === "number") setGridCols(data.gridCols);
        if (typeof data.gridRows === "number") setGridRows(data.gridRows);
        if (typeof data.customWidth === "number") setCustomWidth(data.customWidth);
        if (typeof data.customHeight === "number") setCustomHeight(data.customHeight);
        if (data.sizeUnit) setSizeUnit(data.sizeUnit);
        if (typeof data.gap === "number") setGap(data.gap);
        if (typeof data.margin === "number") setMargin(data.margin);
        if (data.fitMode) setFitMode(data.fitMode);
        if (data.cutGuide) setCutGuide(data.cutGuide);
        if (typeof data.bleed === "number") setBleed(data.bleed);
        // Backwards compatibility for old saved presets
        if (data.preset && data.preset !== "fit") {
          setFitType("custom");
          setExactSize(true);
          if (PRESET_SIZES[data.preset]) {
            const [w, h] = PRESET_SIZES[data.preset];
            setCustomWidth(w);
            setCustomHeight(h);
            setSizeUnit("mm");
          }
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Listen for browser Back and Forward navigation between modes
  useEffect(() => {
    const handlePopState = () => {
      setToolMode("id");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Check if saved settings differ from current state
  const savedSettingsDiffer = useMemo(() => {
    if (!savedSettingsData) return false;
    return (
      (savedSettingsData.paper && savedSettingsData.paper !== paper) ||
      (savedSettingsData.orient && savedSettingsData.orient !== orient) ||
      (savedSettingsData.fitType && savedSettingsData.fitType !== fitType) ||
      (typeof savedSettingsData.exactSize === "boolean" && savedSettingsData.exactSize !== exactSize) ||
      (typeof savedSettingsData.gridCols === "number" && savedSettingsData.gridCols !== gridCols) ||
      (typeof savedSettingsData.gridRows === "number" && savedSettingsData.gridRows !== gridRows) ||
      (typeof savedSettingsData.gap === "number" && savedSettingsData.gap !== gap) ||
      (typeof savedSettingsData.margin === "number" && savedSettingsData.margin !== margin) ||
      (savedSettingsData.cutGuide && savedSettingsData.cutGuide !== cutGuide) ||
      (savedSettingsData.fitMode && savedSettingsData.fitMode !== fitMode)
    );
  }, [
    savedSettingsData,
    paper,
    orient,
    fitType,
    exactSize,
    gridCols,
    gridRows,
    gap,
    margin,
    cutGuide,
    fitMode,
  ]);

  const handleApplySavedSettings = () => {
    if (!savedSettingsData) return;
    if (savedSettingsData.paper) setPaper(savedSettingsData.paper);
    if (savedSettingsData.orient) setOrient(savedSettingsData.orient);
    if (savedSettingsData.fitType) setFitType(savedSettingsData.fitType);
    if (typeof savedSettingsData.exactSize === "boolean") setExactSize(savedSettingsData.exactSize);
    if (typeof savedSettingsData.gridCols === "number") setGridCols(savedSettingsData.gridCols);
    if (typeof savedSettingsData.gridRows === "number") setGridRows(savedSettingsData.gridRows);
    if (typeof savedSettingsData.customWidth === "number") setCustomWidth(savedSettingsData.customWidth);
    if (typeof savedSettingsData.customHeight === "number") setCustomHeight(savedSettingsData.customHeight);
    if (savedSettingsData.sizeUnit) setSizeUnit(savedSettingsData.sizeUnit);
    if (typeof savedSettingsData.gap === "number") setGap(savedSettingsData.gap);
    if (typeof savedSettingsData.margin === "number") setMargin(savedSettingsData.margin);
    if (savedSettingsData.cutGuide) setCutGuide(savedSettingsData.cutGuide);
    if (savedSettingsData.fitMode) setFitMode(savedSettingsData.fitMode);
    if (typeof savedSettingsData.bleed === "number") setBleed(savedSettingsData.bleed);
    setHasAppliedSavedSettings(true);
    showToast("Applied previous settings");
  };

  // Automatically remember settings in localStorage
  useEffect(() => {
    if (!mounted) return;
    try {
      const data: SavedSettings = {
        paper,
        orient,
        fitType,
        exactSize,
        gridCols,
        gridRows,
        customWidth,
        customHeight,
        sizeUnit,
        gap,
        margin,
        fitMode,
        cutGuide,
        bleed,
      };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(data));
      setHasSavedSettings(true);
    } catch {
      // Ignore
    }
  }, [
    mounted,
    paper,
    orient,
    fitType,
    exactSize,
    gridCols,
    gridRows,
    customWidth,
    customHeight,
    sizeUnit,
    gap,
    margin,
    fitMode,
    cutGuide,
    bleed,
  ]);

  // Keyboard shortcut: Esc closes popover
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedPhotoId(null);
        setShowClearConfirm(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Outside click closes popover
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        // Check if the click was on a photo cell or keep-popover button (like Undo)
        const target = e.target as HTMLElement;
        if (!target.closest("[data-photo-id]") && !target.closest("[data-keep-popover]")) {
          setSelectedPhotoId(null);
        }
      }
    };
    if (selectedPhotoId) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("touchstart", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [selectedPhotoId]);

  // Clean dragging state
  useEffect(() => {
    setIsDragging(false);
    const handleDragEnd = () => setIsDragging(false);
    const handleWindowDragLeave = (e: DragEvent) => {
      if (e.relatedTarget === null) setIsDragging(false);
    };
    window.addEventListener("dragend", handleDragEnd);
    window.addEventListener("dragleave", handleWindowDragLeave);
    return () => {
      window.removeEventListener("dragend", handleDragEnd);
      window.removeEventListener("dragleave", handleWindowDragLeave);
    };
  }, []);

  // Add files callback (100% in-browser, NEVER uploaded)
  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const valid = Array.from(files).filter((f) =>
        /^image\/(jpeg|png|webp)$/i.test(f.type)
      );

      if (valid.length === 0) {
        showToast("Please choose valid JPG, PNG, or WebP images.");
        return;
      }

      pushHistory(photos);

      let loadedCount = 0;
      const newItems: PhotoItem[] = [];

      valid.forEach((file) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          const w = img.naturalWidth || 600;
          const h = img.naturalHeight || 600;
          const mw = Number(((w / 300) * 25.4).toFixed(1));
          const mh = Number(((h / 300) * 25.4).toFixed(1));

          newItems.push({
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            url,
            name: file.name,
            file,
            w,
            h,
            mw,
            mh,
            copies: globalCopies,
            rotation: 0,
            scalePercent: 100,
          });

          loadedCount++;
          if (loadedCount === valid.length) {
            setPhotos((prev) => [...prev, ...newItems]);
            showToast(`Added ${valid.length} photo${valid.length > 1 ? "s" : ""}`);
          }
        };
        img.onerror = () => {
          loadedCount++;
        };
        img.src = url;
      });
    },
    [photos, globalCopies, pushHistory, showToast]
  );

  // Global paste handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
        addFiles(e.clipboardData.files);
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [addFiles]);

  const handleConfirmClearAll = () => {
    pushHistory(photos);
    setPhotos([]);
    setSelectedPhotoId(null);
    setExtraBlankPages(0);
    setShowClearConfirm(false);
    showToast("Cleared all photos");
  };

  const handleLoadSamplePhotos = async () => {
    const sampleColors = [
      "#bbf7d0", // mint
      "#bae6fd", // sky blue
      "#fef08a", // pastel yellow
      "#fbcfe8", // pink
      "#ddd6fe", // lavender
      "#fed7aa", // peach
    ];

    const samples: PhotoItem[] = await Promise.all(
      sampleColors.map(async (color, i) => {
        const cv = document.createElement("canvas");
        cv.width = 600;
        cv.height = 600;
        const ctx = cv.getContext("2d");
        if (ctx) {
          ctx.fillStyle = color;
          ctx.beginPath();
          if (typeof ctx.roundRect === "function") {
            ctx.roundRect(0, 0, 600, 600, 48);
          } else {
            ctx.rect(0, 0, 600, 600);
          }
          ctx.fill();

          ctx.fillStyle = "#334155";
          ctx.font = "bold 44px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`Photo ${i + 1}`, 300, 300);
        }
        const blob = await new Promise<Blob>((res) =>
          cv.toBlob((b) => res(b || new Blob()), "image/png")
        );
        const file = new File([blob], `sample-${i + 1}.png`, { type: "image/png" });
        const url = URL.createObjectURL(blob);
        return {
          id: `sample-${i + 1}-${Date.now()}`,
          url,
          name: `Photo ${i + 1}`,
          file,
          w: 600,
          h: 600,
          mw: 50.8,
          mh: 50.8,
          copies: globalCopies,
          rotation: 0,
          scalePercent: 100,
        };
      })
    );

    pushHistory(photos);
    setPhotos(samples);
    showToast("Loaded 6 sample photos");
  };

  // Expand photos by individual copies count
  const photoIndicesPerCopy = useMemo(() => {
    const list: number[] = [];
    photos.forEach((p, idx) => {
      const c = Math.max(1, p.copies || 1);
      for (let i = 0; i < c; i++) {
        list.push(idx);
      }
    });
    return list;
  }, [photos]);

  const activeCustomGrid = useMemo((): [number, number] | null => {
    if (fitType === "custom" && !exactSize) {
      return [Math.min(12, Math.max(1, gridCols)), Math.min(12, Math.max(1, gridRows))];
    }
    return null;
  }, [fitType, exactSize, gridCols, gridRows]);

  // Active cell size (mm) when exactSize is ON
  const activeCell = useMemo((): [number, number] | null => {
    if (fitType === "auto") return null;
    if (fitType === "custom" && !exactSize) return null;
    // Exact size is ON
    const wMm = sizeUnit === "in" ? customWidth * 25.4 : customWidth;
    const hMm = sizeUnit === "in" ? customHeight * 25.4 : customHeight;
    return [Math.max(5, wMm), Math.max(5, hMm)];
  }, [fitType, exactSize, customWidth, customHeight, sizeUnit]);

  // Paper dimensions
  const paperDimensions = useMemo((): [number, number] => {
    if (paper === "Custom") {
      return customPaper;
    }
    return PAPER_SIZES[paper] || PAPER_SIZES.A4;
  }, [paper, customPaper]);

  const effectiveMargin = useMemo(() => {
    if (bleed > 0) return Math.max(margin, 8);
    return margin;
  }, [margin, bleed]);

  const handleApplyPresetChip = (chip: PresetChip) => {
    setFitType("custom");
    setExactSize(true);
    setSelectedPresetChip(chip.id);
    let wMm = chip.wMm;
    let hMm = chip.hMm;
    if (chip.isFullPage) {
      wMm = Math.max(10, paperDimensions[0] - 2 * effectiveMargin);
      hMm = Math.max(10, paperDimensions[1] - 2 * effectiveMargin);
    } else if (chip.id === "4x6") {
      const firstPhoto = photos[0];
      const isLandscape = firstPhoto && firstPhoto.w > firstPhoto.h;
      if (isLandscape) {
        wMm = 152.4;
        hMm = 101.6;
      }
    }
    if (sizeUnit === "in") {
      setCustomWidth(Number((wMm / 25.4).toFixed(2)));
      setCustomHeight(Number((hMm / 25.4).toFixed(2)));
    } else {
      setCustomWidth(wMm);
      setCustomHeight(hMm);
    }
  };

  const handleWidthChange = (val: number) => {
    setFitType("custom");
    setExactSize(true);
    setSelectedPresetChip(null);
    setCustomWidth(val);
    if (aspectRatioLocked && customWidth > 0 && customHeight > 0) {
      const ratio = customHeight / customWidth;
      const newH = Math.round(val * ratio * 10) / 10;
      setCustomHeight(newH);
    }
  };

  const handleHeightChange = (val: number) => {
    setFitType("custom");
    setExactSize(true);
    setSelectedPresetChip(null);
    setCustomHeight(val);
    if (aspectRatioLocked && customWidth > 0 && customHeight > 0) {
      const ratio = customWidth / customHeight;
      const newW = Math.round(val * ratio * 10) / 10;
      setCustomWidth(newW);
    }
  };

  const handleUnitChange = (newUnit: "mm" | "in") => {
    if (newUnit === sizeUnit) return;
    setSizeUnit(newUnit);
    if (newUnit === "in") {
      setCustomWidth(Number((customWidth / 25.4).toFixed(2)));
      setCustomHeight(Number((customHeight / 25.4).toFixed(2)));
    } else {
      setCustomWidth(Number((customWidth * 25.4).toFixed(1)));
      setCustomHeight(Number((customHeight * 25.4).toFixed(1)));
    }
  };

  // Layout plan calculation
  const plan = useMemo((): LayoutPlan => {
    const aspects = photoIndicesPerCopy.map((pi) => {
      const p = photos[pi];
      if (!p) return 1;
      const rot = (p.rotation || 0) % 180;
      return rot === 90 ? p.h / p.w : p.w / p.h;
    });

    return planLayout({
      paper: paperDimensions,
      orient,
      margin: effectiveMargin,
      gap,
      aspects,
      cell: activeCell,
      customGrid: activeCustomGrid,
      fitMode,
    });
  }, [paperDimensions, orient, effectiveMargin, gap, photoIndicesPerCopy, photos, activeCell, activeCustomGrid, fitMode]);

  // Placed items calculation
  const basePages = useMemo((): PlacedItem[][] => {
    if (!plan.fits || photos.length === 0) return [];
    const aspects = photos.map((p) => {
      const rot = (p.rotation || 0) % 180;
      return rot === 90 ? p.h / p.w : p.w / p.h;
    });

    return placeItems(
      plan,
      photoIndicesPerCopy,
      aspects,
      effectiveMargin,
      gap,
      fitMode
    );
  }, [plan, photos, photoIndicesPerCopy, effectiveMargin, gap, fitMode]);

  useEffect(() => {
    if (photos.length === 0) setExtraBlankPages(0);
  }, [photos.length]);

  const pages = useMemo(
    () => [
      ...basePages,
      ...Array.from({ length: extraBlankPages }, () => [] as PlacedItem[]),
    ],
    [basePages, extraBlankPages]
  );

  const exportPages = useMemo(
    () =>
      pages.map((pg) =>
        pg.map((it) => {
          const k = (photos[it.i]?.scalePercent || 100) / 100;
          if (k === 1) return it;
          const w = it.w * k;
          const h = it.h * k;
          return { ...it, w, h, x: it.x + (it.w - w) / 2, y: it.y + (it.h - h) / 2 };
        })
      ),
    [pages, photos]
  );

  useEffect(() => {
    if (pages.length > 0 && activePage >= pages.length) {
      setActivePage(pages.length - 1);
    }
  }, [pages.length, activePage]);

  // Soft highlight on new page when automatically added
  useEffect(() => {
    if (pages.length > prevPagesLengthRef.current && prevPagesLengthRef.current > 0) {
      const newPageIdx = pages.length - 1;
      setHighlightedPage(newPageIdx);
      const timer = setTimeout(() => {
        setHighlightedPage(null);
      }, 1200);
      prevPagesLengthRef.current = pages.length;
      return () => clearTimeout(timer);
    }
    prevPagesLengthRef.current = pages.length;
  }, [pages.length]);

  // Global copies setter
  const handleSetGlobalCopies = (val: number) => {
    const count = Math.max(1, Math.min(500, val));
    pushHistory(photos);
    setGlobalCopies(count);
    setPhotos((prev) => prev.map((p) => ({ ...p, copies: count })));
  };

  // Individual photo copies
  const handleSetPhotoCopies = (photoIdx: number, val: number) => {
    const count = Math.max(1, Math.min(500, val));
    pushHistory(photos);
    setPhotos((prev) => {
      const copy = [...prev];
      if (copy[photoIdx]) {
        copy[photoIdx] = { ...copy[photoIdx], copies: count };
      }
      return copy;
    });
  };

  const handleRotatePhoto = (photoIdx: number) => {
    pushHistory(photos);
    setPhotos((prev) => {
      const copy = [...prev];
      if (copy[photoIdx]) {
        copy[photoIdx] = {
          ...copy[photoIdx],
          rotation: (copy[photoIdx].rotation + 90) % 360,
        };
      }
      return copy;
    });
  };

  const handleRotateAll = () => {
    pushHistory(photos);
    setPhotos((prev) =>
      prev.map((p) => ({ ...p, rotation: (p.rotation + 90) % 360 }))
    );
    showToast("Rotated all photos 90°");
  };

  const handleDeletePhoto = (photoIdx: number) => {
    pushHistory(photos);
    setPhotos((prev) => prev.filter((_, i) => i !== photoIdx));
    setSelectedPhotoId(null);
  };

  const handleDeleteActivePage = () => {
    if (pages.length <= 1 || activePage === 0) return;
    pushHistory();

    // If deleting an extra blank page
    if (extraBlankPages > 0 && activePage >= basePages.length) {
      setExtraBlankPages((prev) => Math.max(0, prev - 1));
      setActivePage((prev) => Math.max(0, prev - 1));
      showToast(`Deleted page ${activePage + 1}`);
      return;
    }

    // If deleting a page containing photos
    const itemsOnThisPage = pages[activePage] || [];
    if (itemsOnThisPage.length === 0) {
      if (extraBlankPages > 0) {
        setExtraBlankPages((prev) => Math.max(0, prev - 1));
      }
      setActivePage((prev) => Math.max(0, prev - 1));
      showToast(`Deleted page ${activePage + 1}`);
      return;
    }

    // Count copies to remove from this page
    const countsToRemove = new Map<number, number>();
    itemsOnThisPage.forEach((it) => {
      countsToRemove.set(it.i, (countsToRemove.get(it.i) || 0) + 1);
    });

    setPhotos((prev) =>
      prev
        .map((p, idx) => {
          const toRemove = countsToRemove.get(idx) || 0;
          if (toRemove === 0) return p;
          const remaining = (p.copies || 1) - toRemove;
          return remaining > 0 ? { ...p, copies: remaining } : null;
        })
        .filter((p): p is PhotoItem => p !== null)
    );

    setActivePage((prev) => Math.max(0, prev - 1));
    showToast(`Deleted page ${activePage + 1}`);
  };

  const handleReplacePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPhotoId) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      pushHistory(photos);
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === selectedPhotoId
            ? {
                ...p,
                file,
                url,
                name: file.name,
                w: img.naturalWidth || 600,
                h: img.naturalHeight || 600,
              }
            : p
        )
      );
      showToast("Photo replaced");
    };
    img.src = url;
    e.target.value = "";
  };

  // Move photo position (Reorder)
  const handleMovePhoto = (fromIdx: number, direction: "prev" | "next") => {
    const toIdx = direction === "prev" ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= photos.length) return;
    pushHistory(photos);
    setPhotos((prev) => {
      const copy = [...prev];
      const item = copy.splice(fromIdx, 1)[0];
      copy.splice(toIdx, 0, item);
      return copy;
    });
  };

  // Empty-space suggestion calculation
  const emptySpacePercentage = useMemo(() => {
    if (!plan.fits || plan.per <= 0 || photoIndicesPerCopy.length === 0) return 0;
    const totalSlots = plan.per * basePages.length;
    const filledSlots = photoIndicesPerCopy.length;
    const emptySlots = totalSlots - filledSlots;
    if (emptySlots <= 0) return 0;
    return Math.round((emptySlots / plan.per) * 100);
  }, [plan, basePages.length, photoIndicesPerCopy.length]);

  const handleFillEmptySlots = () => {
    if (plan.per <= 0 || photos.length === 0) return;
    const totalSlots = plan.per * basePages.length;
    const needed = totalSlots - photoIndicesPerCopy.length;
    if (needed <= 0) return;

    pushHistory(photos);
    setPhotos((prev) => {
      const updated = [...prev];
      let remaining = needed;
      let i = 0;
      while (remaining > 0 && updated.length > 0) {
        updated[i % updated.length] = {
          ...updated[i % updated.length],
          copies: (updated[i % updated.length].copies || 1) + 1,
        };
        remaining--;
        i++;
      }
      return updated;
    });
    showToast(`Added ${needed} copies to fill the page!`);
  };

  // Resolution / Quality check for each photo
  const getPhotoDpi = (photo: PhotoItem): number => {
    if (!plan.cw || plan.cw <= 0) return 300;
    const widthInInches = plan.cw / 25.4;
    return Math.round(photo.w / widthInInches);
  };

  // Prepare images for PDF
  const prepareImagesForPdf = async (): Promise<PreparedImage[]> => {
    const list: PreparedImage[] = [];
    for (const p of photos) {
      if (p.rotation % 360 !== 0) {
        const cv = document.createElement("canvas");
        const rad = (p.rotation * Math.PI) / 180;
        const sin = Math.abs(Math.sin(rad));
        const cos = Math.abs(Math.cos(rad));
        cv.width = Math.round(p.w * cos + p.h * sin);
        cv.height = Math.round(p.w * sin + p.h * cos);
        const ctx = cv.getContext("2d");

        if (ctx) {
          ctx.save();
          ctx.translate(cv.width / 2, cv.height / 2);
          ctx.rotate(rad);
          const img = new Image();
          await new Promise<void>((res) => {
            img.onload = () => res();
            img.src = p.url;
          });
          ctx.drawImage(img, -p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();

          const blob = await new Promise<Blob | null>((res) =>
            cv.toBlob(res, "image/png")
          );
          if (blob) {
            const buf = await blob.arrayBuffer();
            list.push({
              bytes: new Uint8Array(buf),
              mimeType: "image/png",
              w: cv.width,
              h: cv.height,
            });
            continue;
          }
        }
      }

      const buf = await p.file.arrayBuffer();
      list.push({
        bytes: new Uint8Array(buf),
        mimeType: p.file.type.includes("png") ? "image/png" : "image/jpeg",
        w: p.w,
        h: p.h,
      });
    }
    return list;
  };

  // Execute PDF Download
  const executeDownloadPdf = async () => {
    if (photos.length === 0 || !plan.fits) return;
    setIsExporting(true);
    try {
      const prepared = await prepareImagesForPdf();
      const options: PrintOptions = {
        cutLines: cutGuide === "lines",
        cutMarks: cutGuide === "marks",
        bleedMm: bleed,
        pageBorder: cutGuide === "border",
        fillMode: fitMode === "fill",
      };

      const blob = await buildPdf(plan.pw, plan.ph, exportPages, prepared, options);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `print-sheet-${paper.toLowerCase()}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Print Sheet PDF downloaded successfully!");
    } catch (err) {
      console.error(err);
      showToast("Error generating PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // Execute PDF Print
  const executePrintPdf = async () => {
    if (photos.length === 0 || !plan.fits) return;
    setIsExporting(true);
    try {
      const prepared = await prepareImagesForPdf();
      const options: PrintOptions = {
        cutLines: cutGuide === "lines",
        cutMarks: cutGuide === "marks",
        bleedMm: bleed,
        pageBorder: cutGuide === "border",
        fillMode: fitMode === "fill",
      };

      const blob = await buildPdf(plan.pw, plan.ph, exportPages, prepared, options);
      const url = URL.createObjectURL(blob);

      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      iframe.src = url;

      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        }, 300);
      };

      document.body.appendChild(iframe);
      showToast("Opening print dialog...");
    } catch (err) {
      console.error(err);
      executeDownloadPdf();
    } finally {
      setIsExporting(false);
    }
  };

  // Trigger download with Print Reminder check
  const handleDownloadClick = () => {
    if (photos.length === 0 || !plan.fits) return;
    const dismissed = localStorage.getItem(PRINT_REMINDER_KEY) === "true";
    if (dismissed) {
      executeDownloadPdf();
    } else {
      setPendingPrintAction("download");
      setShowPrintReminder(true);
    }
  };

  const handlePrintClick = () => {
    if (photos.length === 0 || !plan.fits) return;
    const dismissed = localStorage.getItem(PRINT_REMINDER_KEY) === "true";
    if (dismissed) {
      executePrintPdf();
    } else {
      setPendingPrintAction("print");
      setShowPrintReminder(true);
    }
  };

  const handleConfirmReminder = () => {
    if (dontShowReminderAgain) {
      localStorage.setItem(PRINT_REMINDER_KEY, "true");
    }
    setShowPrintReminder(false);
    if (pendingPrintAction === "download") {
      executeDownloadPdf();
    } else if (pendingPrintAction === "print") {
      executePrintPdf();
    } else if (pendingPrintAction === "download_id") {
      executeDownloadIdPdf();
    } else if (pendingPrintAction === "print_id") {
      executePrintIdPdf();
    }
    setPendingPrintAction(null);
  };

  const handleShareClick = async () => {
    if (photos.length === 0 || !plan.fits) return;
    setIsExporting(true);
    try {
      const prepared = await prepareImagesForPdf();
      const blob = await buildPdf(plan.pw, plan.ph, exportPages, prepared, {
        cutLines: cutGuide === "lines",
        cutMarks: cutGuide === "marks",
        bleedMm: bleed,
        pageBorder: cutGuide === "border",
        fillMode: fitMode === "fill",
      });

      const file = new File([blob], "print-sheet.pdf", { type: "application/pdf" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "Print Sheet Maker",
          text: "Here is your print sheet PDF from Spellense.",
          files: [file],
        });
      } else {
        executeDownloadPdf();
      }
    } catch {
      // User cancelled
    } finally {
      setIsExporting(false);
    }
  };

  // Mode selection and switching
  const handleSelectLandingMode = (mode: "photos" | "id") => {
    setToolMode(mode);
    try {
      localStorage.setItem("spellense_print_mode_v1", mode);
    } catch {
      // Ignore
    }
    const newUrl = mode === "id" ? "/print-sheet-maker?mode=id" : "/print-sheet-maker";
    window.history.pushState(null, "", newUrl);
  };

  const handleSwitchMode = (target: "photos" | "id") => {
    if (target === toolMode) return;
    const hasPhotos = toolMode === "photos" && photos.length > 0;
    const hasId = toolMode === "id" && idCards.some((c) => Boolean(c.frontUrl || c.backUrl));

    if (hasPhotos || hasId) {
      setPendingSwitchMode(target);
      setShowSwitchConfirm(true);
      return;
    }

    executeModeSwitch(target);
  };

  const executeModeSwitch = (target: "photos" | "id") => {
    if (target === "photos") {
      setIdCards([{ id: "card_1" }]);
    } else {
      setPhotos([]);
    }
    setToolMode(target);
    try {
      localStorage.setItem("spellense_print_mode_v1", target);
    } catch {
      // Ignore
    }
    const newUrl = target === "id" ? "/print-sheet-maker?mode=id" : "/print-sheet-maker";
    window.history.pushState(null, "", newUrl);
    setShowSwitchConfirm(false);
    setPendingSwitchMode(null);
  };

  // ID Card handlers
  const handleUpdateIdCard = (index: number, updated: IdCardItemData) => {
    setIdCards((prev) => {
      const next = [...prev];
      next[index] = updated;
      return next;
    });
  };

  const handleAddIdCard = () => {
    if (idCards.length >= 5) return;
    setIdCards((prev) => [...prev, { id: "card_" + (prev.length + 1) }]);
    showToast("Added new card slot");
  };

  const handleRemoveIdCard = (index: number) => {
    if (idCards.length <= 1) return;
    setIdCards((prev) => prev.filter((_, i) => i !== index));
    showToast("Removed card");
  };

  const handleClearAllIdCards = () => {
    setIdCards([{ id: "card_1" }]);
    showToast("All cards cleared");
  };

  const handleUpdateWatermarkText = (text: string) => {
    setIdWatermarkText(text);
    try {
      localStorage.setItem("spellense_id_watermark_text", text);
    } catch {
      // Ignore
    }
  };

  const handleUpdateTopMargin = (margin: number) => {
    setIdTopMargin(margin);
    try {
      localStorage.setItem("spellense_id_top_margin", String(margin));
    } catch {
      // Ignore
    }
  };

  const handleLoadSampleIdCard = useCallback(() => {
    // Generate sample front card canvas (85.6 × 54 mm ratio)
    const canvasFront = document.createElement("canvas");
    canvasFront.width = 1012;
    canvasFront.height = 638;
    const ctxF = canvasFront.getContext("2d");
    if (ctxF) {
      const grad = ctxF.createLinearGradient(0, 0, 1012, 638);
      grad.addColorStop(0, "#f0f5ff");
      grad.addColorStop(0.5, "#e6efff");
      grad.addColorStop(1, "#dce8fc");
      ctxF.fillStyle = grad;
      ctxF.fillRect(0, 0, 1012, 638);

      ctxF.strokeStyle = "#bcd5ff";
      ctxF.lineWidth = 6;
      ctxF.strokeRect(12, 12, 988, 614);

      ctxF.fillStyle = "#3158d5";
      ctxF.fillRect(20, 20, 972, 85);
      ctxF.fillStyle = "#ffffff";
      ctxF.font = "bold 28px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctxF.fillText("NATIONAL IDENTITY CARD", 50, 72);
      ctxF.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctxF.fillText("ISO/IEC 7810 ID-1", 780, 72);

      // Smart chip
      ctxF.fillStyle = "#e5b95c";
      ctxF.fillRect(60, 150, 110, 85);
      ctxF.strokeStyle = "#b5872a";
      ctxF.lineWidth = 3;
      ctxF.strokeRect(60, 150, 110, 85);

      // Photo Box
      ctxF.fillStyle = "#dce4ec";
      ctxF.fillRect(60, 270, 220, 280);
      ctxF.strokeStyle = "#94a3b8";
      ctxF.lineWidth = 3;
      ctxF.strokeRect(60, 270, 220, 280);

      // Avatar silhouette
      ctxF.fillStyle = "#64748b";
      ctxF.beginPath();
      ctxF.arc(170, 370, 50, 0, Math.PI * 2);
      ctxF.fill();
      ctxF.beginPath();
      ctxF.arc(170, 520, 85, Math.PI, 0, false);
      ctxF.fill();

      // Details text
      ctxF.fillStyle = "#1c201a";
      ctxF.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctxF.fillText("FULL NAME", 330, 180);
      ctxF.font = "bold 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctxF.fillText("ALEXANDER MORGAN", 330, 225);

      ctxF.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctxF.fillText("CARD NUMBER", 330, 290);
      ctxF.font = "bold 30px 'Courier New', monospace";
      ctxF.fillStyle = "#3158d5";
      ctxF.fillText("CR80 8560 5400 9921", 330, 335);

      ctxF.fillStyle = "#1c201a";
      ctxF.font = "bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctxF.fillText("DATE OF BIRTH", 330, 400);
      ctxF.font = "bold 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctxF.fillText("14 MAY 1994", 330, 435);

      ctxF.font = "bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctxF.fillText("EXPIRY DATE", 620, 400);
      ctxF.font = "bold 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctxF.fillText("31 DEC 2032", 620, 435);

      ctxF.font = "bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctxF.fillText("NATIONALITY", 330, 500);
      ctxF.font = "bold 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctxF.fillText("STANDARD / VERIFIED", 330, 535);
    }

    // Generate sample back card canvas
    const canvasBack = document.createElement("canvas");
    canvasBack.width = 1012;
    canvasBack.height = 638;
    const ctxB = canvasBack.getContext("2d");
    if (ctxB) {
      ctxB.fillStyle = "#f6f8fc";
      ctxB.fillRect(0, 0, 1012, 638);

      ctxB.strokeStyle = "#d6e0ea";
      ctxB.lineWidth = 6;
      ctxB.strokeRect(12, 12, 988, 614);

      // Magnetic stripe
      ctxB.fillStyle = "#1e293b";
      ctxB.fillRect(20, 45, 972, 110);

      // Signature strip
      ctxB.fillStyle = "#ffffff";
      ctxB.fillRect(60, 200, 580, 80);
      ctxB.strokeStyle = "#cbd5e1";
      ctxB.lineWidth = 2;
      ctxB.strokeRect(60, 200, 580, 80);
      ctxB.fillStyle = "#334155";
      ctxB.font = "italic 26px Georgia, serif";
      ctxB.fillText("Alexander Morgan", 90, 250);

      // Security code
      ctxB.fillStyle = "#ffffff";
      ctxB.fillRect(660, 200, 120, 80);
      ctxB.strokeRect(660, 200, 120, 80);
      ctxB.fillStyle = "#0f172a";
      ctxB.font = "bold 24px monospace";
      ctxB.fillText("892", 695, 250);

      // Disclaimer
      ctxB.fillStyle = "#64748b";
      ctxB.font = "16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctxB.fillText("This sample card is formatted strictly in compliance with ISO/IEC 7810 ID-1 standard dimensions (85.60 × 53.98 mm).", 60, 340);
      ctxB.fillText("Keep physical scale set to 100% when printing to maintain exact 1:1 real-world size.", 60, 375);

      // Machine readable zone (MRZ)
      ctxB.fillStyle = "#0f172a";
      ctxB.font = "bold 24px 'Courier New', monospace";
      ctxB.fillText("I<UTO856054009921<<<<<<<<<<<<<<<<", 60, 490);
      ctxB.fillText("9405148M3212318UTO<<<<<<<<<<<4", 60, 535);
      ctxB.fillText("MORGAN<<ALEXANDER<<<<<<<<<<<<<<<", 60, 580);
    }

    const frontUrl = canvasFront.toDataURL("image/jpeg", 0.95);
    const backUrl = canvasBack.toDataURL("image/jpeg", 0.95);

    setIdCards([
      {
        id: "card_1",
        frontUrl,
        backUrl,
      },
    ]);
    showToast("Loaded sample ID card with exact 1:1 scale!");
  }, [showToast]);

  // Upload/Camera file selection in ID Mode
  const handleIdFileSelected = async (cardIndex: number, side: "front" | "back", file: File) => {
    const supportedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (file.type && !supportedTypes.includes(file.type.toLowerCase())) {
      showToast("Please choose a JPG, PNG, or WebP image. HEIC photos are not supported yet.");
      return;
    }

    setIsScanning(true);
    setScanStatusText("Preparing card scanner...");
    let rawUrl = URL.createObjectURL(file);

    const img = new Image();
    const imageLoaded = await new Promise<boolean>((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = rawUrl;
    });

    if (!imageLoaded) {
      URL.revokeObjectURL(rawUrl);
      setIsScanning(false);
      setScanStatusText("");
      showToast("This image could not be opened. Please choose a JPG, PNG, or WebP photo.");
      return;
    }

    const largestSide = Math.max(img.naturalWidth, img.naturalHeight);
    if (largestSide > 1600) {
      const ratio = 1600 / largestSide;
      const resizedCanvas = document.createElement("canvas");
      resizedCanvas.width = Math.round(img.naturalWidth * ratio);
      resizedCanvas.height = Math.round(img.naturalHeight * ratio);
      const resizedContext = resizedCanvas.getContext("2d");
      if (resizedContext) {
        resizedContext.drawImage(img, 0, 0, resizedCanvas.width, resizedCanvas.height);
        const resizedBlob = await new Promise<Blob | null>((resolve) =>
          resizedCanvas.toBlob(resolve, "image/jpeg", 0.92)
        );
        if (resizedBlob) {
          URL.revokeObjectURL(rawUrl);
          rawUrl = URL.createObjectURL(resizedBlob);
          img.src = rawUrl;
          await new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0) resolve();
            else {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }
          });
        }
      }
    }

    setScanStatusText("Detecting edges & straightening...");
    try {
      // Keep automatic scanning responsive on mobile. If it takes too long,
      // let the user crop manually while the original image stays available.
      let timeoutId = 0;
      const res = await Promise.race([
        cardScanner.detectAndWarp(img),
        new Promise<null>((resolve) => {
          timeoutId = window.setTimeout(() => resolve(null), 3000);
        }),
      ]);
      window.clearTimeout(timeoutId);
      if (res && res.success && res.blob && res.dataUrl && res.corners) {
        setIdCards((prev) => {
          const next = [...prev];
          const cur = next[cardIndex] || { id: "card_" + (cardIndex + 1) };
          if (side === "front") {
            next[cardIndex] = {
              ...cur,
              frontFile: file,
              frontRawUrl: rawUrl,
              frontUrl: res.dataUrl,
              frontBlob: res.blob,
              frontCorners: res.corners as [CornerPoint, CornerPoint, CornerPoint, CornerPoint],
            };
          } else {
            next[cardIndex] = {
              ...cur,
              backFile: file,
              backRawUrl: rawUrl,
              backUrl: res.dataUrl,
              backBlob: res.blob,
              backCorners: res.corners as [CornerPoint, CornerPoint, CornerPoint, CornerPoint],
            };
          }
          return next;
        });
        showToast("Card edges straightened automatically!");
      } else {
        // Fallback to manual crop editor
        setIdCards((prev) => {
          const next = [...prev];
          const cur = next[cardIndex] || { id: "card_" + (cardIndex + 1) };
          if (side === "front") {
            next[cardIndex] = { ...cur, frontFile: file, frontRawUrl: rawUrl };
          } else {
            next[cardIndex] = { ...cur, backFile: file, backRawUrl: rawUrl };
          }
          return next;
        });
        setCropTarget({ cardIndex, side });
        setCropImageSrc(rawUrl);
        setCropInitialCorners(null);
        setCropWarning(res === null
          ? "Automatic scanning is taking too long. Drag the corners to crop your card manually."
          : "We couldn't find the edges. Drag the corners to fit your card.");
        setCropModalOpen(true);
      }
    } catch {
      setIdCards((prev) => {
        const next = [...prev];
        const cur = next[cardIndex] || { id: "card_" + (cardIndex + 1) };
        if (side === "front") {
          next[cardIndex] = { ...cur, frontFile: file, frontRawUrl: rawUrl };
        } else {
          next[cardIndex] = { ...cur, backFile: file, backRawUrl: rawUrl };
        }
        return next;
      });
      setCropTarget({ cardIndex, side });
      setCropImageSrc(rawUrl);
      setCropInitialCorners(null);
      setCropWarning("We couldn't find the edges. Drag the corners to fit your card.");
      setCropModalOpen(true);
    } finally {
      setIsScanning(false);
      setScanStatusText("");
    }
  };

  const handleAdjustCard = (cardIndex: number, side: "front" | "back") => {
    const card = idCards[cardIndex];
    if (!card) return;
    let rawUrl = side === "front" ? (card.frontRawUrl || card.frontUrl) : (card.backRawUrl || card.backUrl);
    if (!rawUrl && side === "front" && card.frontFile) {
      try { rawUrl = URL.createObjectURL(card.frontFile); } catch {}
    }
    if (!rawUrl && side === "back" && card.backFile) {
      try { rawUrl = URL.createObjectURL(card.backFile); } catch {}
    }
    if (!rawUrl) return;

    const corners = side === "front" ? card.frontCorners : card.backCorners;
    setCropTarget({ cardIndex, side });
    setCropImageSrc(rawUrl);
    setCropInitialCorners(corners || null);
    setCropWarning(null);
    setCropModalOpen(true);
  };

  const handleCropDone = (
    warpedBlob: Blob,
    warpedDataUrl: string,
    corners: [CornerPoint, CornerPoint, CornerPoint, CornerPoint]
  ) => {
    if (!cropTarget) return;
    const { cardIndex, side } = cropTarget;
    setIdCards((prev) => {
      const next = [...prev];
      const cur = next[cardIndex] || { id: "card_" + (cardIndex + 1) };
      if (side === "front") {
        next[cardIndex] = {
          ...cur,
          frontRawUrl: cur.frontRawUrl || cropImageSrc,
          frontUrl: warpedDataUrl,
          frontBlob: warpedBlob,
          frontCorners: corners,
        };
      } else {
        next[cardIndex] = {
          ...cur,
          backRawUrl: cur.backRawUrl || cropImageSrc,
          backUrl: warpedDataUrl,
          backBlob: warpedBlob,
          backCorners: corners,
        };
      }
      return next;
    });
    setCropModalOpen(false);
    setCropTarget(null);
    showToast("Card adjusted successfully!");
  };

  // ID Mode Layout calculations
  const idPaperDimensions: [number, number] = idPaper === "Letter" ? [215.9, 279.4] : [210, 297];
  const idOrientedPaper: [number, number] =
    idOrient === "landscape"
      ? [idPaperDimensions[1], idPaperDimensions[0]]
      : [idPaperDimensions[0], idPaperDimensions[1]];

  const { idPreparedImages, idSlotPairs, totalFilledCards } = useMemo(() => {
    const images: { url: string; blob?: Blob }[] = [];
    const pairs: { frontIndex: number | null; backIndex: number | null }[] = [];
    let filledCount = 0;

    idCards.forEach((c) => {
      let fIdx: number | null = null;
      let bIdx: number | null = null;

      if (c.frontUrl) {
        fIdx = images.length;
        images.push({ url: c.frontUrl, blob: c.frontBlob });
      }
      if (c.backUrl) {
        bIdx = images.length;
        images.push({ url: c.backUrl, blob: c.backBlob });
      }

      if (fIdx !== null || bIdx !== null) {
        filledCount++;
        pairs.push({ frontIndex: fIdx, backIndex: bIdx });
      }
    });

    return { idPreparedImages: images, idSlotPairs: pairs, totalFilledCards: filledCount };
  }, [idCards]);

  const idCardW = 85.6 * idScale;
  const idCardH = 54 * idScale;

  const idPages: PlacedItem[][] = useMemo(() => {
    if (idSlotPairs.length === 0) {
      return placeIdCards([{ frontIndex: null, backIndex: null }], idOrientedPaper, idCardW, idCardH, idLayout, 10, 6, idTopMargin);
    }
    return placeIdCards(idSlotPairs, idOrientedPaper, idCardW, idCardH, idLayout, 10, 6, idTopMargin);
  }, [idSlotPairs, idOrientedPaper, idCardW, idCardH, idLayout, idTopMargin]);

  // ID PDF Generation with EXIF/GPS stripping
  const executeDownloadIdPdf = async () => {
    if (idSlotPairs.length === 0) return;
    setIsExporting(true);
    try {
      const prepared: PreparedImage[] = await Promise.all(
        idPreparedImages.map(async (imgObj) => {
          const img = new Image();
          img.src = imgObj.url;
          await new Promise((r) => { img.onload = r; });
          const cvs = document.createElement("canvas");
          cvs.width = img.naturalWidth || img.width;
          cvs.height = img.naturalHeight || img.height;
          const ctx = cvs.getContext("2d");
          ctx?.drawImage(img, 0, 0);

          const blob = await new Promise<Blob>((res) =>
            cvs.toBlob((b) => res(b || new Blob()), "image/jpeg", 0.95)
          );
          const buf = await blob.arrayBuffer();
          return {
            bytes: new Uint8Array(buf),
            mimeType: "image/jpeg" as const,
            w: cvs.width,
            h: cvs.height,
          };
        })
      );

      const blob = await buildPdf(
        idOrientedPaper[0],
        idOrientedPaper[1],
        idPages,
        prepared,
        {
          cutLines: idCutGuide === "lines",
          cutMarks: idCutGuide === "marks",
          watermarkText: idWatermarkEnabled ? idWatermarkText : undefined,
          fillMode: true,
        }
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `id-card-sheet-${idPaper.toLowerCase()}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("ID Card PDF downloaded successfully!");
    } catch (err) {
      console.error(err);
      showToast("Error generating PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadIdClick = () => {
    if (idSlotPairs.length === 0) return;
    const dismissed = localStorage.getItem(PRINT_REMINDER_KEY) === "true";
    if (dismissed) {
      executeDownloadIdPdf();
    } else {
      setPendingPrintAction("download_id");
      setShowPrintReminder(true);
    }
  };

  const executePrintIdPdf = async () => {
    if (idSlotPairs.length === 0) return;
    setIsExporting(true);
    try {
      const prepared: PreparedImage[] = await Promise.all(
        idPreparedImages.map(async (imgObj) => {
          const img = new Image();
          img.src = imgObj.url;
          await new Promise((r) => { img.onload = r; });
          const cvs = document.createElement("canvas");
          cvs.width = img.naturalWidth || img.width;
          cvs.height = img.naturalHeight || img.height;
          const ctx = cvs.getContext("2d");
          ctx?.drawImage(img, 0, 0);

          const blob = await new Promise<Blob>((res) =>
            cvs.toBlob((b) => res(b || new Blob()), "image/jpeg", 0.95)
          );
          const buf = await blob.arrayBuffer();
          return {
            bytes: new Uint8Array(buf),
            mimeType: "image/jpeg" as const,
            w: cvs.width,
            h: cvs.height,
          };
        })
      );

      const blob = await buildPdf(
        idOrientedPaper[0],
        idOrientedPaper[1],
        idPages,
        prepared,
        {
          cutLines: idCutGuide === "lines",
          cutMarks: idCutGuide === "marks",
          watermarkText: idWatermarkEnabled ? idWatermarkText : undefined,
          fillMode: true,
        }
      );

      const url = URL.createObjectURL(blob);
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      iframe.src = url;

      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        }, 300);
      };

      document.body.appendChild(iframe);
      showToast("Opening print dialog...");
    } catch (err) {
      console.error(err);
      executeDownloadIdPdf();
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintIdClick = () => {
    if (idSlotPairs.length === 0) return;
    const dismissed = localStorage.getItem(PRINT_REMINDER_KEY) === "true";
    if (dismissed) {
      executePrintIdPdf();
    } else {
      setPendingPrintAction("print_id");
      setShowPrintReminder(true);
    }
  };

  const handleShareIdClick = async () => {
    if (idSlotPairs.length === 0) return;
    setIsExporting(true);
    try {
      const prepared: PreparedImage[] = await Promise.all(
        idPreparedImages.map(async (imgObj) => {
          const img = new Image();
          img.src = imgObj.url;
          await new Promise((r) => { img.onload = r; });
          const cvs = document.createElement("canvas");
          cvs.width = img.naturalWidth || img.width;
          cvs.height = img.naturalHeight || img.height;
          const ctx = cvs.getContext("2d");
          ctx?.drawImage(img, 0, 0);

          const blob = await new Promise<Blob>((res) =>
            cvs.toBlob((b) => res(b || new Blob()), "image/jpeg", 0.95)
          );
          const buf = await blob.arrayBuffer();
          return {
            bytes: new Uint8Array(buf),
            mimeType: "image/jpeg" as const,
            w: cvs.width,
            h: cvs.height,
          };
        })
      );

      const blob = await buildPdf(
        idOrientedPaper[0],
        idOrientedPaper[1],
        idPages,
        prepared,
        {
          cutLines: idCutGuide === "lines",
          cutMarks: idCutGuide === "marks",
          watermarkText: idWatermarkEnabled ? idWatermarkText : undefined,
          fillMode: true,
        }
      );

      const file = new File([blob], `id-card-sheet-${Date.now()}.pdf`, { type: "application/pdf" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "ID Print Maker",
          text: "Here is your ID card copy from Spellense ID Print Maker.",
          files: [file],
        });
      } else {
        executeDownloadIdPdf();
      }
    } catch {
      // User cancelled
    } finally {
      setIsExporting(false);
    }
  };

  const selectedPhoto = useMemo(() => {
    return photos.find((p) => p.id === selectedPhotoId) || null;
  }, [photos, selectedPhotoId]);

  const selectedPhotoIndex = useMemo(() => {
    return photos.findIndex((p) => p.id === selectedPhotoId);
  }, [photos, selectedPhotoId]);

  // Synchronize live slider scale when selected photo changes
  useEffect(() => {
    if (selectedPhoto) {
      setLiveSliderScale(selectedPhoto.scalePercent || 100);
      setDragOffset({ x: 0, y: 0 });
    }
  }, [selectedPhotoId, selectedPhoto?.id]);

  // Calculate popover positioning relative to selected photo cell
  const openPopoverForPhoto = useCallback((photoId: string, cellElement: HTMLElement | null) => {
    setSelectedPhotoId(photoId);
    setDragOffset({ x: 0, y: 0 });

    if (!cellElement || !sheetContainerRef.current) return;

    // Check if on mobile (<640px)
    if (window.innerWidth < 640) {
      // On mobile it renders as a fixed bottom sheet; scroll the cell into view so it's not covered
      setTimeout(() => {
        cellElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }

    const cellRect = cellElement.getBoundingClientRect();
    const containerRect = sheetContainerRef.current.getBoundingClientRect();

    const cellTop = cellRect.top - containerRect.top;
    const cellBottom = cellRect.bottom - containerRect.top;
    const cellCenterX = cellRect.left - containerRect.left + cellRect.width / 2;

    const popoverWidth = 280;
    const popoverEstimatedHeight = 290;

    // Check if space below
    const spaceBelow = containerRect.height - cellBottom;
    if (spaceBelow >= popoverEstimatedHeight + 15) {
      setPopoverPlacement("bottom");
      setPopoverCoords({
        top: cellBottom + 8,
        left: Math.max(10, Math.min(containerRect.width - popoverWidth - 10, cellCenterX - popoverWidth / 2)),
      });
    } else {
      setPopoverPlacement("top");
      setPopoverCoords({
        top: Math.max(10, cellTop - popoverEstimatedHeight - 8),
        left: Math.max(10, Math.min(containerRect.width - popoverWidth - 10, cellCenterX - popoverWidth / 2)),
      });
    }
  }, []);

  // Draggable popover header handling
  const handlePointerDownHeader = (e: React.PointerEvent) => {
    if (window.innerWidth < 640) return;
    setIsDraggingHeader(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: dragOffset.x,
      initY: dragOffset.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMoveHeader = (e: React.PointerEvent) => {
    if (!isDraggingHeader || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;
    setDragOffset({
      x: dragStartRef.current.initX + dx,
      y: dragStartRef.current.initY + dy,
    });
  };

  const handlePointerUpHeader = (e: React.PointerEvent) => {
    setIsDraggingHeader(false);
    dragStartRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  // Throttled slider handler to eliminate freezing
  const handleSliderChange = (newScale: number) => {
    setLiveSliderScale(newScale);
    if (!selectedPhotoId) return;

    // Lightweight live DOM update without triggering layout engine recomputation
    livePreviewRef.current[selectedPhotoId] = newScale;
    requestAnimationFrame(() => {
      const imgEl = document.querySelector(`[data-photo-img="${selectedPhotoId}"]`) as HTMLElement | null;
      if (imgEl && selectedPhoto) {
        imgEl.style.transform = `rotate(${selectedPhoto.rotation}deg) scale(${newScale / 100})`;
      }
    });
  };

  // Commit scale change on release
  const handleSliderCommit = (finalScale: number) => {
    if (!selectedPhotoId) return;
    pushHistory(photos);
    setPhotos((prev) =>
      prev.map((p) => (p.id === selectedPhotoId ? { ...p, scalePercent: finalScale } : p))
    );
  };

  const renderIdSheetPreview = () => (
    <div className="w-full h-full flex flex-col min-h-[440px] lg:min-h-[600px] justify-between">
      {/* Header bar of preview */}
      <div
        style={{
          backgroundColor: "#ffffff",
        }}
        className="px-4 sm:px-6 py-3 flex items-center justify-between gap-2 flex-wrap"
      >
        <div className="flex items-center gap-2">
          <h3 style={{ color: "#1c201a" }} className="text-xs sm:text-sm font-bold">Print preview</h3>
          <span style={{ color: "#767a74" }} className="text-[11px] sm:text-xs font-normal">
            {idPaper} · {idOrient === "portrait" ? "Portrait" : "Landscape"} · {Math.round(idScale * 100)}%
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handleLoadSampleIdCard}
            style={{
              backgroundColor: "#ffffff",
              borderColor: "#e5e5df",
              borderWidth: "1px",
              borderStyle: "solid",
              color: "#3158d5",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
            className="text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 hover:bg-[#f8f9fc] transition cursor-pointer"
          >
            <span>Try sample ID</span>
            <span>→</span>
          </button>
          <div
            style={{
              backgroundColor: "#efeee7",
              borderColor: "#e5e5df",
              borderWidth: "1px",
              borderStyle: "solid",
            }}
            className="flex items-center gap-0.5 p-0.5 rounded-lg"
          >
            <button
              type="button"
              onClick={() => setPreviewMode("fit")}
              style={{
                backgroundColor: previewMode === "fit" ? "#ffffff" : "transparent",
                color: previewMode === "fit" ? "#3158d5" : "#575a53",
                boxShadow: previewMode === "fit" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                border: "none",
                outline: "none",
              }}
              className="h-6.5 px-2.5 rounded-md text-[11px] sm:text-xs font-bold transition cursor-pointer"
            >
              Fit
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode("actual")}
              style={{
                backgroundColor: previewMode === "actual" ? "#ffffff" : "transparent",
                color: previewMode === "actual" ? "#3158d5" : "#555a52",
                boxShadow: previewMode === "actual" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                border: "none",
                outline: "none",
              }}
              className="h-6.5 px-2.5 rounded-md text-[11px] sm:text-xs font-bold transition cursor-pointer"
            >
              100%
            </button>
          </div>
        </div>
      </div>

      {/* Canvas container */}
      <div
        ref={sheetContainerRef}
        className="flex-1 bg-[#ecebe4] flex flex-col items-center justify-center p-3 sm:p-6 relative min-h-[420px] lg:min-h-[500px]"
      >
        {totalFilledCards === 0 ? (
          /* PHYSICAL A4 SHEET MOCKUP MATCHING USER SCREENSHOT */
          <div className="w-full flex items-center justify-center py-2 sm:py-4 overflow-auto">
            <div
              style={{
                aspectRatio: `${idOrientedPaper[0]} / ${idOrientedPaper[1]}`,
                flexShrink: 0,
                width:
                  previewMode === "actual"
                    ? `${idOrientedPaper[0]}mm`
                    : `min(100%, min(380px, calc((100vh - 280px) * ${idOrientedPaper[0] / idOrientedPaper[1]})))`,
                boxShadow: "0 20px 45px -15px rgba(0, 0, 0, 0.14), 0 0 1px 1px rgba(0, 0, 0, 0.05)",
              }}
              className="relative bg-white rounded-xs select-none transition-all overflow-hidden p-4 sm:p-6 flex flex-col justify-between"
            >
              {/* Centered top label */}
              <div className="text-center pt-1 pb-3 sm:pb-4">
                <span className="text-[11px] sm:text-xs font-bold tracking-[0.16em] text-[#7c8278] uppercase select-none">
                  PRINT SCALE – {Math.round(idScale * 100)}%
                </span>
              </div>

              {/* Dashed Margin Guide Line & Dynamic Slots */}
              {idLayout === "side_by_side" ? (
                <div
                  style={{
                    borderColor: "#dcdcd6",
                    borderWidth: "1px",
                    borderStyle: "dashed",
                  }}
                  className={`my-auto relative rounded-none sm:rounded-xs p-2 sm:p-3 flex items-center justify-center flex-1 w-full ${
                    idTopMargin === 30
                      ? "items-start pt-4 sm:pt-6"
                      : idTopMargin === 50
                      ? "items-start pt-8 sm:pt-12"
                      : "items-center"
                  }`}
                >
                  <div className="w-full flex flex-row items-center justify-center gap-1.5 sm:gap-2.5">
                    {/* Front Card Placeholder (Left) */}
                    <div
                      onClick={() => idFrontInputRef.current?.click()}
                      style={{
                        aspectRatio: "85.6 / 54",
                        backgroundColor: "#f5f6f8",
                        borderColor: "#e4e7eb",
                        borderWidth: "1px",
                        borderStyle: "solid",
                        width: `${Math.min(48, Math.round(44 * idScale))}%`,
                        maxWidth: `${Math.round(180 * idScale)}px`,
                      }}
                      className="flex-1 rounded-xl sm:rounded-2xl hover:bg-[#edf0f4] transition-all duration-200 p-2 sm:p-3 flex flex-col items-center justify-center text-center cursor-pointer shadow-2xs relative group select-none overflow-hidden"
                      title="Click to add front photo"
                    >
                      <div style={{ backgroundColor: "#ffffff", borderColor: "#eaedf1", borderWidth: "1px", borderStyle: "solid" }} className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-[#6b7280] group-hover:scale-105 group-hover:text-[#3158d5] transition-all mb-1 shadow-2xs z-10">
                        <svg className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="20" height="15" x="2" y="4.5" rx="2.5" />
                          <circle cx="8" cy="11" r="2" />
                          <path d="M5 16a3 3 0 0 1 6 0" />
                        </svg>
                      </div>
                      <span className="text-[11px] sm:text-xs font-bold text-[#1c201a] group-hover:text-[#3158d5] transition-colors leading-tight z-10">
                        Card front
                      </span>
                      <span className="text-[9px] sm:text-[10px] text-[#717770] font-normal z-10">
                        {(85.6 * idScale).toFixed(1)} × {(54 * idScale).toFixed(1)} mm
                      </span>

                      {/* Live Watermark Overlay on Front Placeholder */}
                      {idWatermarkEnabled && (
                        <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-20">
                          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                            <pattern
                              id="wm-mockup-sbs-front"
                              width="120"
                              height="60"
                              patternTransform="rotate(-28 0 0)"
                              patternUnits="userSpaceOnUse"
                            >
                              <text
                                x="0"
                                y="22"
                                fill="#3158d5"
                                opacity="0.28"
                                fontSize="10"
                                fontWeight="bold"
                                fontFamily="sans-serif"
                              >
                                {idWatermarkText.toUpperCase() || "FOR VERIFICATION ONLY"}
                              </text>
                            </pattern>
                            <rect width="100%" height="100%" fill="url(#wm-mockup-sbs-front)" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Vertical Dashed Cut Line (Center) */}
                    <div
                      style={{ borderLeft: "1px dashed #dcdcd6" }}
                      className="h-24 sm:h-28 shrink-0 my-auto select-none"
                    />

                    {/* Back Card Placeholder (Right) */}
                    <div
                      onClick={() => idBackInputRef.current?.click()}
                      style={{
                        aspectRatio: "85.6 / 54",
                        backgroundColor: "#f5f6f8",
                        borderColor: "#e4e7eb",
                        borderWidth: "1px",
                        borderStyle: "solid",
                        width: `${Math.min(48, Math.round(44 * idScale))}%`,
                        maxWidth: `${Math.round(180 * idScale)}px`,
                      }}
                      className="flex-1 rounded-xl sm:rounded-2xl hover:bg-[#edf0f4] transition-all duration-200 p-2 sm:p-3 flex flex-col items-center justify-center text-center cursor-pointer shadow-2xs relative group select-none overflow-hidden"
                      title="Click to add back photo"
                    >
                      <div style={{ backgroundColor: "#ffffff", borderColor: "#eaedf1", borderWidth: "1px", borderStyle: "solid" }} className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-[#6b7280] group-hover:scale-105 group-hover:text-[#3158d5] transition-all mb-1 shadow-2xs z-10">
                        <svg className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="20" height="15" x="2" y="4.5" rx="2.5" />
                          <line x1="2" y1="9.5" x2="22" y2="9.5" />
                          <line x1="6" y1="14" x2="11" y2="14" />
                        </svg>
                      </div>
                      <span className="text-[11px] sm:text-xs font-bold text-[#1c201a] group-hover:text-[#3158d5] transition-colors leading-tight z-10">
                        Card back
                      </span>
                      <span className="text-[9px] sm:text-[10px] text-[#717770] font-normal z-10">
                        {(85.6 * idScale).toFixed(1)} × {(54 * idScale).toFixed(1)} mm
                      </span>

                      {/* Live Watermark Overlay on Back Placeholder */}
                      {idWatermarkEnabled && (
                        <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-20">
                          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                            <pattern
                              id="wm-mockup-sbs-back"
                              width="120"
                              height="60"
                              patternTransform="rotate(-28 0 0)"
                              patternUnits="userSpaceOnUse"
                            >
                              <text
                                x="0"
                                y="22"
                                fill="#3158d5"
                                opacity="0.28"
                                fontSize="10"
                                fontWeight="bold"
                                fontFamily="sans-serif"
                              >
                                {idWatermarkText.toUpperCase() || "FOR VERIFICATION ONLY"}
                              </text>
                            </pattern>
                            <rect width="100%" height="100%" fill="url(#wm-mockup-sbs-back)" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : idLayout === "two_pages" ? (
                <div
                  style={{
                    borderColor: "#dcdcd6",
                    borderWidth: "1px",
                    borderStyle: "dashed",
                  }}
                  className={`my-auto relative rounded-none sm:rounded-xs p-3 sm:p-4 flex flex-col items-center gap-3 flex-1 w-full ${
                    idTopMargin === 30
                      ? "justify-start pt-4 sm:pt-6"
                      : idTopMargin === 50
                      ? "justify-start pt-8 sm:pt-12"
                      : "justify-center"
                  }`}
                >
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#efeee7] text-[10px] sm:text-[11px] font-bold text-[#555a52]">
                    <span>Sheet 1 of 2 · Front side</span>
                  </div>

                  {/* Front Slot Placeholder Card */}
                  <div
                    onClick={() => idFrontInputRef.current?.click()}
                    style={{
                      aspectRatio: "85.6 / 54",
                      backgroundColor: "#f5f6f8",
                      borderColor: "#e4e7eb",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      width: `${Math.min(94, Math.round(72 * idScale))}%`,
                      maxWidth: `${Math.round(290 * idScale)}px`,
                    }}
                    className="rounded-2xl hover:bg-[#edf0f4] transition-all duration-200 p-4 sm:p-5 flex flex-col items-center justify-center text-center cursor-pointer shadow-2xs relative group select-none overflow-hidden"
                    title="Click to add front photo"
                  >
                    <div style={{ backgroundColor: "#ffffff", borderColor: "#eaedf1", borderWidth: "1px", borderStyle: "solid" }} className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-[#6b7280] group-hover:scale-105 group-hover:text-[#3158d5] transition-all mb-2 shadow-2xs z-10">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="15" x="2" y="4.5" rx="2.5" />
                        <circle cx="8" cy="11" r="2" />
                        <path d="M5 16a3 3 0 0 1 6 0" />
                        <line x1="14" y1="9.5" x2="19" y2="9.5" />
                        <line x1="14" y1="13.5" x2="17" y2="13.5" />
                      </svg>
                    </div>
                    <span className="text-sm sm:text-base font-bold text-[#1c201a] group-hover:text-[#3158d5] transition-colors leading-tight z-10">
                      Card front
                    </span>
                    <span className="text-xs sm:text-[13px] text-[#717770] font-normal mt-0.5 z-10">
                      {(85.6 * idScale).toFixed(1)} × {(54 * idScale).toFixed(1)} mm
                    </span>

                    {/* Live Watermark Overlay on Two Pages Front */}
                    {idWatermarkEnabled && (
                      <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-20">
                        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                          <pattern
                            id="wm-mockup-twopages-front"
                            width="140"
                            height="70"
                            patternTransform="rotate(-28 0 0)"
                            patternUnits="userSpaceOnUse"
                          >
                            <text
                              x="0"
                              y="25"
                              fill="#3158d5"
                              opacity="0.28"
                              fontSize="11"
                              fontWeight="bold"
                              fontFamily="sans-serif"
                            >
                              {idWatermarkText.toUpperCase() || "FOR VERIFICATION ONLY"}
                            </text>
                          </pattern>
                          <rect width="100%" height="100%" fill="url(#wm-mockup-twopages-front)" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <span className="text-[11px] text-[#70746d]">Back side prints on Sheet 2</span>
                </div>
              ) : (
                /* Stacked (Default) */
                <div
                  style={{
                    borderColor: "#dcdcd6",
                    borderWidth: "1px",
                    borderStyle: "dashed",
                  }}
                  className={`my-auto relative rounded-none sm:rounded-xs p-3 sm:p-4 flex flex-col items-center gap-2.5 sm:gap-3 flex-1 w-full ${
                    idTopMargin === 30
                      ? "justify-start pt-3 sm:pt-4"
                      : idTopMargin === 50
                      ? "justify-start pt-7 sm:pt-9"
                      : "justify-center"
                  }`}
                >
                  {/* Front Slot Placeholder Card */}
                  <div
                    onClick={() => idFrontInputRef.current?.click()}
                    style={{
                      aspectRatio: "85.6 / 54",
                      backgroundColor: "#f5f6f8",
                      borderColor: "#e4e7eb",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      width: `${Math.min(94, Math.round(72 * idScale))}%`,
                      maxWidth: `${Math.round(290 * idScale)}px`,
                    }}
                    className="rounded-2xl hover:bg-[#edf0f4] transition-all duration-200 p-3.5 sm:p-4 flex flex-col items-center justify-center text-center cursor-pointer shadow-2xs relative group select-none overflow-hidden"
                    title="Click to add front photo"
                  >
                    <div style={{ backgroundColor: "#ffffff", borderColor: "#eaedf1", borderWidth: "1px", borderStyle: "solid" }} className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-[#6b7280] group-hover:scale-105 group-hover:text-[#3158d5] transition-all mb-1.5 shadow-2xs z-10">
                      <svg className="w-4.5 h-4.5 sm:w-5.5 sm:h-5.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="15" x="2" y="4.5" rx="2.5" />
                        <circle cx="8" cy="11" r="2" />
                        <path d="M5 16a3 3 0 0 1 6 0" />
                        <line x1="14" y1="9.5" x2="19" y2="9.5" />
                        <line x1="14" y1="13.5" x2="17" y2="13.5" />
                      </svg>
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-[#1c201a] group-hover:text-[#3158d5] transition-colors leading-tight z-10">
                      Card front
                    </span>
                    <span className="text-[11px] sm:text-xs text-[#717770] font-normal mt-0.5 z-10">
                      {(85.6 * idScale).toFixed(1)} × {(54 * idScale).toFixed(1)} mm
                    </span>

                    {/* Live Watermark Overlay on Stacked Front */}
                    {idWatermarkEnabled && (
                      <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-20">
                        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                          <pattern
                            id="wm-mockup-stacked-front"
                            width="140"
                            height="70"
                            patternTransform="rotate(-28 0 0)"
                            patternUnits="userSpaceOnUse"
                          >
                            <text
                              x="0"
                              y="25"
                              fill="#3158d5"
                              opacity="0.28"
                              fontSize="11"
                              fontWeight="bold"
                              fontFamily="sans-serif"
                            >
                              {idWatermarkText.toUpperCase() || "FOR VERIFICATION ONLY"}
                            </text>
                          </pattern>
                          <rect width="100%" height="100%" fill="url(#wm-mockup-stacked-front)" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Dashed Cut Line */}
                  <div
                    style={{
                      width: `${Math.min(94, Math.round(72 * idScale))}%`,
                      maxWidth: `${Math.round(290 * idScale)}px`,
                      borderBottom: "1px dashed #dcdcd6",
                    }}
                    className="select-none my-1 sm:my-1.5"
                  />

                  {/* Back Slot Placeholder Card */}
                  <div
                    onClick={() => idBackInputRef.current?.click()}
                    style={{
                      aspectRatio: "85.6 / 54",
                      backgroundColor: "#f5f6f8",
                      borderColor: "#e4e7eb",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      width: `${Math.min(94, Math.round(72 * idScale))}%`,
                      maxWidth: `${Math.round(290 * idScale)}px`,
                    }}
                    className="rounded-2xl hover:bg-[#edf0f4] transition-all duration-200 p-3.5 sm:p-4 flex flex-col items-center justify-center text-center cursor-pointer shadow-2xs relative group select-none overflow-hidden"
                    title="Click to add back photo"
                  >
                    <div style={{ backgroundColor: "#ffffff", borderColor: "#eaedf1", borderWidth: "1px", borderStyle: "solid" }} className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-[#6b7280] group-hover:scale-105 group-hover:text-[#3158d5] transition-all mb-1.5 shadow-2xs z-10">
                      <svg className="w-4.5 h-4.5 sm:w-5.5 sm:h-5.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="15" x="2" y="4.5" rx="2.5" />
                        <line x1="2" y1="9.5" x2="22" y2="9.5" />
                        <line x1="6" y1="14" x2="11" y2="14" />
                      </svg>
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-[#1c201a] group-hover:text-[#3158d5] transition-colors leading-tight z-10">
                      Card back
                    </span>
                    <span className="text-[11px] sm:text-xs text-[#717770] font-normal mt-0.5 z-10">
                      {(85.6 * idScale).toFixed(1)} × {(54 * idScale).toFixed(1)} mm
                    </span>

                    {/* Live Watermark Overlay on Stacked Back */}
                    {idWatermarkEnabled && (
                      <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-20">
                        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                          <pattern
                            id="wm-mockup-stacked-back"
                            width="140"
                            height="70"
                            patternTransform="rotate(-28 0 0)"
                            patternUnits="userSpaceOnUse"
                          >
                            <text
                              x="0"
                              y="25"
                              fill="#3158d5"
                              opacity="0.28"
                              fontSize="11"
                              fontWeight="bold"
                              fontFamily="sans-serif"
                            >
                              {idWatermarkText.toUpperCase() || "FOR VERIFICATION ONLY"}
                            </text>
                          </pattern>
                          <rect width="100%" height="100%" fill="url(#wm-mockup-stacked-back)" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* THE PHYSICAL SHEET PREVIEW FOR ID CARDS */}
            <div className="w-full flex items-center justify-center py-2 overflow-auto">
              <div
                style={{
                  aspectRatio: `${idOrientedPaper[0]} / ${idOrientedPaper[1]}`,
                  flexShrink: 0,
                  width:
                    previewMode === "actual"
                      ? `${idOrientedPaper[0]}mm`
                      : `min(100%, calc((100vh - 280px) * ${idOrientedPaper[0] / idOrientedPaper[1]}))`,
                  boxShadow: "0 20px 45px -15px rgba(0, 0, 0, 0.14), 0 0 1px 1px rgba(0, 0, 0, 0.05)",
                }}
                className="relative bg-white rounded-xs select-none transition-all overflow-hidden"
              >
                {/* Dashed Margin Guide Line */}
                <div
                  style={{
                    left: `${((10 / idOrientedPaper[0]) * 100).toFixed(3)}%`,
                    top: `${((10 / idOrientedPaper[1]) * 100).toFixed(3)}%`,
                    right: `${((10 / idOrientedPaper[0]) * 100).toFixed(3)}%`,
                    bottom: `${((10 / idOrientedPaper[1]) * 100).toFixed(3)}%`,
                    borderColor: "#dcdcd6",
                    borderWidth: "1px",
                    borderStyle: "dashed",
                  }}
                  className="absolute pointer-events-none z-10"
                />

                {/* Placed Card Items */}
                {(idPages[idActivePage] || []).map((item, idx) => {
                  const imgData = idPreparedImages[item.i];
                  const hasImg = Boolean(imgData?.url);

                  return (
                    <div
                      key={`id-card-${item.i}-${idx}-${imgData?.url || "empty"}`}
                      style={{
                        left: `${((item.x / idOrientedPaper[0]) * 100).toFixed(3)}%`,
                        top: `${((item.y / idOrientedPaper[1]) * 100).toFixed(3)}%`,
                        width: `${((item.w / idOrientedPaper[0]) * 100).toFixed(3)}%`,
                        height: `${((item.h / idOrientedPaper[1]) * 100).toFixed(3)}%`,
                        ...(idCutGuide === "lines"
                          ? { borderColor: "#dcdcd6", borderWidth: "1px", borderStyle: "solid" }
                          : {}),
                      }}
                      className="absolute transition-all overflow-hidden rounded-xs bg-[#f6f5f3]"
                    >
                      {hasImg ? (
                        <img
                          key={imgData?.url}
                          src={imgData?.url}
                          alt="ID Card"
                          className="w-full h-full object-cover block"
                        />
                      ) : (
                        <div
                          onClick={() => {
                            if (item.i % 2 === 1) {
                              idBackInputRef.current?.click();
                            } else {
                              idFrontInputRef.current?.click();
                            }
                          }}
                          style={{
                            backgroundColor: "#f5f6f8",
                            borderColor: "#dcdcd6",
                            borderWidth: "1px",
                            borderStyle: "dashed",
                          }}
                          className="w-full h-full hover:bg-[#edf0f4] transition-all duration-200 rounded-xs flex flex-col items-center justify-center text-[#70746d] p-2 text-center cursor-pointer group select-none"
                        >
                          <span className="text-[10px] sm:text-[11px] font-bold text-[#1c201a] group-hover:text-[#3158d5]">
                            {item.i % 2 === 1 ? "+ Add Back Side" : "+ Add Front Side"}
                          </span>
                          <span className="text-[8px] sm:text-[9px] text-[#70746d]">
                            {(85.6 * idScale).toFixed(1)} × {(54 * idScale).toFixed(1)} mm
                          </span>
                        </div>
                      )}

                      {/* Live Watermark Overlay if enabled */}
                      {idWatermarkEnabled && (
                        <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-10">
                          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                            <pattern
                              id={`wm-preview-id-${item.i}-${idx}`}
                              width="140"
                              height="70"
                              patternTransform="rotate(-30 0 0)"
                              patternUnits="userSpaceOnUse"
                            >
                              <text
                                x="0"
                                y="25"
                                fill="#475569"
                                opacity="0.35"
                                fontSize="10"
                                fontWeight="bold"
                                fontFamily="sans-serif"
                              >
                                {idWatermarkText.toUpperCase() || "FOR VERIFICATION ONLY"}
                              </text>
                            </pattern>
                            <rect width="100%" height="100%" fill={`url(#wm-preview-id-${item.i}-${idx})`} />
                          </svg>
                        </div>
                      )}

                      {/* Cut Marks */}
                      {idCutGuide === "marks" && (
                        <>
                          <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#70746d] pointer-events-none" />
                          <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#70746d] pointer-events-none" />
                          <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#70746d] pointer-events-none" />
                          <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#70746d] pointer-events-none" />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Page Navigation Toolbar in ID Mode */}
            {idPages.length > 1 && (
              <div className="w-full max-w-xl mx-auto flex items-center justify-center gap-3 pt-3 flex-wrap">
                <button
                  type="button"
                  disabled={idActivePage === 0}
                  onClick={() => setIdActivePage((p) => Math.max(0, p - 1))}
                  className="h-8 px-3 rounded-xl border border-[#e5e5df] bg-white hover:bg-[#faf9f6] text-xs font-bold text-[#1c201a] disabled:opacity-30 transition cursor-pointer shadow-2xs"
                >
                  ◀ Previous
                </button>
                <span className="text-xs font-bold text-[#1c201a]">
                  Page {idActivePage + 1} of {idPages.length}
                </span>
                <button
                  type="button"
                  disabled={idActivePage === idPages.length - 1}
                  onClick={() => setIdActivePage((p) => Math.min(idPages.length - 1, p + 1))}
                  className="h-8 px-3 rounded-xl border border-[#e5e5df] bg-white hover:bg-[#faf9f6] text-xs font-bold text-[#1c201a] disabled:opacity-30 transition cursor-pointer shadow-2xs"
                >
                  Next ▶
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom status box inside right column */}
      <div style={{ backgroundColor: "#ffffff" }} className="p-3 sm:p-3.5 text-center">
        <div className="text-xs font-bold text-[#1c201a]">
          {totalFilledCards === 0 ? (
            <>
              Ready to arrange both sides.{" "}
              <span className="font-normal text-[#767a74]">
                Add card photos to create an exact 1:1 scale print sheet.
              </span>
            </>
          ) : (
            <>
              {totalFilledCards} card{totalFilledCards === 1 ? "" : "s"} ready for physical print.{" "}
              <span className="font-normal text-[#767a74]">
                Exact 1:1 scale layout configured.
              </span>
            </>
          )}
        </div>
        <div className="mt-1 flex items-center justify-center gap-1.5 text-[11px] text-[#575a53]">
          <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <span>Photos stay on your device in the production tool. This preview never reads or sends image data.</span>
        </div>
      </div>
    </div>
  );

  return (
    <div
      style={{ backgroundColor: "#faf9f6" }}
      className="flex min-h-screen flex-col font-sans text-[#1c201a] antialiased selection:bg-[#bcd5ff] selection:text-black relative z-10 text-[15px]"
    >
      {/* NAVBAR */}
      <Navbar />

      {/* TOAST NOTIFICATION */}
      {notification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-[#1c201a]/95 px-5 py-3 text-sm font-medium text-white shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
          {notification}
        </div>
      )}

      {/* CLEAR ALL CONFIRMATION MODAL */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1c201a]/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl sm:rounded-[24px] bg-white p-6 shadow-2xl border border-[#e5e5df] space-y-4">
            <h3 className="text-base font-bold text-[#1c201a]">
              Clear all photos?
            </h3>
            <p className="text-sm text-[#575a53] leading-relaxed">
              This will remove all uploaded photos from the sheet. You can undo this action if needed.
            </p>
            <div style={{ borderTop: "1px solid #e5e5df" }} className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="h-11 px-4 rounded-xl text-sm font-bold text-[#575a53] hover:bg-[#f6f5f3] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                className="h-11 px-5 rounded-xl text-sm font-bold text-white bg-[#1c201a] hover:bg-black shadow-md transition cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODE SWITCH CONFIRMATION MODAL */}
      {showSwitchConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1c201a]/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl sm:rounded-[24px] bg-white p-6 shadow-2xl border border-[#e5e5df] space-y-4">
            <h3 className="text-base font-bold text-[#1c201a]">
              Switch to {pendingSwitchMode === "id" ? "ID Card" : "Photos"} mode?
            </h3>
            <p className="text-sm text-[#575a53] leading-relaxed">
              Switching will discard your current {toolMode === "id" ? "ID card copies" : "uploaded photos"}. Are you sure you want to proceed?
            </p>
            <div style={{ borderTop: "1px solid #e5e5df" }} className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowSwitchConfirm(false);
                  setPendingSwitchMode(null);
                }}
                className="h-11 px-4 rounded-xl text-sm font-bold text-[#575a53] hover:bg-[#f6f5f3] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pendingSwitchMode) executeModeSwitch(pendingSwitchMode);
                }}
                className="h-11 px-5 rounded-xl text-sm font-bold text-white bg-[#3158d5] hover:bg-[#2546b8] shadow-md shadow-[#3158d5]/20 transition cursor-pointer"
              >
                Switch mode
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CARD CROP EDITOR MODAL */}
      {cropModalOpen && (
        <CardCropEditorModal
          isOpen={cropModalOpen}
          onClose={() => {
            setCropModalOpen(false);
            setCropTarget(null);
          }}
          imageSrc={cropImageSrc}
          initialCorners={cropInitialCorners}
          warningMessage={cropWarning}
          onDone={handleCropDone}
        />
      )}

      {/* PRINT REMINDER DIALOG */}
      {showPrintReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1c201a]/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl sm:rounded-[24px] bg-white p-6 shadow-2xl border border-[#e5e5df] space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 font-black text-lg">
                ⚠️
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#1c201a]">
                  Print Scale Reminder
                </h3>
                <p className="text-sm text-[#575a53] leading-relaxed">
                  Print at <strong>100% / Actual size</strong>, not &quot;Fit to Page&quot;, or your photo dimensions will be wrong.
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-xs text-[#575a53] pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={dontShowReminderAgain}
                onChange={(e) => setDontShowReminderAgain(e.target.checked)}
                className="h-4 w-4 rounded accent-[#3158d5] cursor-pointer"
              />
              <span>Don&apos;t show this reminder again</span>
            </label>

            <div style={{ borderTop: "1px solid #e5e5df" }} className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowPrintReminder(false);
                  setPendingPrintAction(null);
                }}
                className="h-11 px-4 rounded-xl text-sm font-bold text-[#575a53] hover:bg-[#f6f5f3] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReminder}
                style={{ backgroundColor: "#3158d5" }}
                className="h-11 px-5 rounded-xl text-sm font-bold text-white shadow-md shadow-[#3158d5]/20 hover:brightness-105 active:scale-95 transition cursor-pointer"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HIDDEN INPUTS */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={handleReplacePhoto}
      />
      <input
        ref={idFrontInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleIdFileSelected(0, "front", file);
          e.target.value = "";
        }}
      />
      <input
        ref={idBackInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleIdFileSelected(0, "back", file);
          e.target.value = "";
        }}
      />
      <input
        ref={idCameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        capture="environment"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleIdFileSelected(0, "front", file);
          e.target.value = "";
        }}
      />

      <main id="main-content" style={{ backgroundColor: "#faf9f6" }} className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden">
          <div className="relative mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 pb-8 pt-6 sm:pt-10">
            {/* HERO TITLE & BADGES */}
            <div className="mx-auto max-w-5xl text-center pb-2">
              {/* H1 Heading */}
              <h1
                aria-live="polite"
                className="text-center tracking-tight text-[#1c201a] flex flex-col items-center justify-center"
                style={{ margin: "0 auto" }}
              >
                <span
                  style={{
                    fontSize: "clamp(44px, 5.8vw, 72px)",
                    fontWeight: 900,
                    lineHeight: 1.04,
                    letterSpacing: "-0.035em",
                    color: "#1c201a",
                    display: "block",
                    fontFamily:
                      "var(--font-plus-jakarta-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  }}
                >
                  Two sides. One page.
                </span>
                <span
                  style={{
                    fontFamily:
                      "'ITC Modern No. 216', var(--font-itc-modern), 'Instrument Serif', Georgia, serif",
                    fontSize: "clamp(38px, 4.8vw, 64px)",
                    fontWeight: 400,
                    fontStyle: "italic",
                    lineHeight: 1.05,
                    letterSpacing: "-0.01em",
                    color: "#1c201a",
                    display: "block",
                    marginTop: "6px",
                  }}
                >
                  Exact real size.
                </span>
              </h1>

              {/* Homepage-style Subtitle */}
              <p
                style={{
                  color: "#70746d",
                  maxWidth: "920px",
                  margin: "14px auto 0",
                }}
                className="text-center font-normal text-sm sm:text-base leading-relaxed whitespace-normal sm:whitespace-nowrap"
              >
                Print two-sided ID cards at true 1:1 scale on a single sheet. Free, private, and instant.
              </p>
            </div>
          </div>
        </section>

        {/* WORKSPACE SECTION */}
        <section className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 mt-4 sm:mt-6 pb-24 sm:pb-36">

          <div>
              <div
                style={{
                  borderColor: "#e5e5df",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  backgroundColor: "#ffffff",
                  boxShadow: "none",
                }}
                className="relative w-full rounded-2xl sm:rounded-[24px] overflow-hidden shadow-2xs transition-all duration-300"
              >
                {/* TOP FULL CONTAINER HEADER */}
                <div
                  style={{
                    borderBottom: "1px solid #e5e5df",
                    backgroundColor: "#faf9f6",
                  }}
                  className="flex items-center justify-between px-5 sm:px-8 py-3.5 sm:py-4"
                >
                  {/* Left: ID Icon + Title + Subtitle */}
                  <div className="flex items-center gap-3">
                    <div
                      style={{ backgroundColor: "#e8effe", color: "#3158d5" }}
                      className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl flex items-center justify-center shrink-0 shadow-2xs"
                    >
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#3158d5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <circle cx="8" cy="11" r="2" />
                        <path d="M4 17a4 4 0 0 1 8 0" />
                        <line x1="14" y1="10" x2="19" y2="10" />
                        <line x1="14" y1="13" x2="17" y2="13" />
                      </svg>
                    </div>
                    <div>
                      <h2 style={{ color: "#1c201a" }} className="text-base sm:text-[19px] font-bold leading-tight">ID Card Copy</h2>
                      <span style={{ color: "#767a74" }} className="text-xs sm:text-[13px] block mt-0.5">
                        {idCards.length} {idCards.length === 1 ? "card" : "cards"} · Standard ID · 85.6 × 54 mm
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span
                      style={{
                        backgroundColor: "#e8effe",
                        borderColor: "#bcd5ff",
                        borderWidth: "1px",
                        borderStyle: "solid",
                        color: "#3158d5",
                      }}
                      className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full px-2.5 py-1 sm:px-3 sm:py-1 text-[11px] sm:text-xs font-bold whitespace-nowrap"
                    >
                      <svg className="w-3.5 h-3.5 text-[#3158d5] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                      <span>100% Private</span>
                    </span>
                    <span
                      style={{
                        backgroundColor: "#e8effe",
                        borderColor: "#bcd5ff",
                        borderWidth: "1px",
                        borderStyle: "solid",
                        color: "#3158d5",
                      }}
                      className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full px-2.5 py-1 sm:px-3 sm:py-1 text-[11px] sm:text-xs font-bold whitespace-nowrap"
                    >
                      <svg className="w-3.5 h-3.5 text-[#3158d5] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                        <line x1="3" y1="9" x2="21" y2="9" />
                        <line x1="9" y1="21" x2="9" y2="9" />
                      </svg>
                      <span>Exact 1:1 Scale</span>
                    </span>
                    <span
                      style={{
                        backgroundColor: "#e8effe",
                        borderColor: "#bcd5ff",
                        borderWidth: "1px",
                        borderStyle: "solid",
                        color: "#3158d5",
                      }}
                      className="hidden md:inline-flex items-center gap-1 sm:gap-1.5 rounded-full px-2.5 py-1 sm:px-3 sm:py-1 text-[11px] sm:text-xs font-bold whitespace-nowrap"
                    >
                      <svg className="w-3.5 h-3.5 text-[#3158d5] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 6 2 18 2 18 9" />
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                        <rect x="6" y="14" width="12" height="8" />
                      </svg>
                      <span>Print-Ready PDF</span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row items-stretch w-full animate-in fade-in duration-200">
                  {/* LEFT COLUMN: EXACT ID CARD PANEL */}
                  <div
                    style={{
                      backgroundColor: "#ffffff",
                      borderRight: "1px solid #e5e5df",
                    }}
                    className="w-full lg:w-[48%] xl:w-[46%] p-4 sm:p-6 lg:p-6 flex flex-col justify-between"
                  >
                    <IdCardPanel
                      cards={idCards}
                      onUpdateCard={handleUpdateIdCard}
                      onAddCard={handleAddIdCard}
                      onRemoveCard={handleRemoveIdCard}
                      onClearAllCards={handleClearAllIdCards}
                      layout={idLayout}
                      onChangeLayout={setIdLayout}
                      scale={idScale}
                      onChangeScale={setIdScale}
                      paper={idPaper}
                      onChangePaper={setIdPaper}
                      orient={idOrient}
                      onChangeOrient={setIdOrient}
                      watermarkEnabled={idWatermarkEnabled}
                      onChangeWatermarkEnabled={setIdWatermarkEnabled}
                      watermarkText={idWatermarkText}
                      onChangeWatermarkText={handleUpdateWatermarkText}
                      cutGuide={idCutGuide}
                      onChangeCutGuide={setIdCutGuide}
                      topMargin={idTopMargin}
                      onChangeTopMargin={handleUpdateTopMargin}
                      isExporting={isExporting}
                      onDownload={handleDownloadIdClick}
                      onPrint={handlePrintIdClick}
                      onShare={handleShareIdClick}
                      canShare={canShare}
                      onAdjustCard={handleAdjustCard}
                      onFileSelected={handleIdFileSelected}
                      isScanning={isScanning}
                      scanStatusText={scanStatusText}
                      viewMode="all"
                    />
                  </div>

                  {/* RIGHT COLUMN: PREVIEW CANVAS & STATUS BAR */}
                  <div
                    style={{
                      backgroundColor: "#ecebe4",
                    }}
                    className="w-full lg:w-[52%] xl:w-[54%] flex flex-col justify-between"
                  >
                    {renderIdSheetPreview()}
                  </div>
                </div>
              </div>
            </div>
        </section>

        {/* STICKY BOTTOM BAR FOR 1-TAP DOWNLOAD & PRINT */}
        {toolMode !== "landing" && (
          <div
            style={{
              backgroundColor: "#ffffff",
              borderTop: "1px solid #e5e5df",
              boxShadow: "0 -6px 25px rgba(0, 0, 0, 0.08)",
            }}
            className="fixed bottom-0 left-0 right-0 z-40 px-4 sm:px-8 py-3.5 sm:py-4"
          >
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Explanatory text when disabled */}
              {totalFilledCards === 0 ? (
                <div className="text-xs sm:text-sm text-[#555a52] font-semibold flex items-center gap-2 self-start sm:self-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 shadow-xs"></span>
                  <span>Add front photo of ID card to enable download and print</span>
                </div>
              ) : (
                <div className="text-xs sm:text-sm text-[#1c201a] font-bold flex items-center gap-2 self-start sm:self-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 shadow-xs"></span>
                  <span>{totalFilledCards} card side{totalFilledCards === 1 ? "" : "s"} ready · 100% exact 1:1 scale</span>
                </div>
              )}

              <div className="w-full sm:w-auto flex items-center justify-end gap-2.5 sm:gap-3 ml-auto">
                {mounted && canShare && (
                  <button
                    type="button"
                    onClick={handleShareIdClick}
                    disabled={!totalFilledCards || isExporting}
                    style={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      color: "#1c201a",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                      minHeight: "46px",
                    }}
                    className="min-h-[46px] px-3.5 rounded-xl hover:bg-[#faf9f6] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    title="Share PDF"
                    aria-label="Share PDF"
                  >
                    <span>Share</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handlePrintIdClick}
                  disabled={!totalFilledCards || isExporting}
                  style={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e5e5df",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    color: "#1c201a",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    minHeight: "46px",
                  }}
                  className="min-h-[46px] flex-1 sm:flex-initial px-3 sm:px-6 rounded-xl hover:bg-[#faf9f6] text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
                  title={
                    totalFilledCards === 0
                      ? "Add front of ID card to enable printing"
                      : "Print PDF"
                  }
                  aria-label="Print PDF"
                >
                  <svg className="shrink-0" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  <span className="whitespace-nowrap">Print</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadIdClick}
                  disabled={!totalFilledCards || isExporting}
                  style={{
                    backgroundColor: "#3158d5",
                    opacity: totalFilledCards > 0 && !isExporting ? 1 : 0.45,
                    minHeight: "46px",
                  }}
                  className="min-h-[46px] flex-1 sm:flex-initial px-3 sm:px-8 rounded-xl text-white text-xs sm:text-base font-bold shadow-md shadow-[#3158d5]/20 hover:brightness-105 active:scale-95 transition flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0"
                  aria-label="Download PDF"
                  title={
                    totalFilledCards === 0
                      ? "Add front of ID card to enable download"
                      : "Download PDF"
                  }
                >
                  {isExporting ? (
                    <span className="whitespace-nowrap">Building PDF...</span>
                  ) : (
                    <>
                      <svg className="shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      <span className="whitespace-nowrap">Download PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

        {/* EXPLANATORY SEO & PRODUCT SECTIONS (HOMEPAGE MATCH - PERFECTLY ALIGNED) */}
        <section
          style={{
            marginTop: "48px",
            paddingTop: "16px",
          }}
          className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 w-full pb-32 sm:pb-28"
        >
          <div className="mx-auto w-full space-y-4 sm:space-y-6">
            <div aria-hidden="true" className="mx-auto h-0.5 w-full bg-[#c9cbc5]" />
            {/* SECTION 1: INTRO */}
            <ScrollReveal>
              <div
                style={{
                  borderColor: "#e5e5df",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  backgroundColor: "#ffffff",
                }}
                className="rounded-2xl sm:rounded-[24px] p-6 sm:p-8 shadow-2xs"
              >
                <h2 className="text-xl sm:text-2xl font-black text-[#1c201a] tracking-tight">
                  Copy, Align, and Print Both Sides of Your ID Card on One Sheet
                </h2>
                <p className="mt-2.5 text-xs sm:text-sm text-[#575a53] leading-relaxed font-normal">
                  Create official, print-ready photocopies of your identity card, driver&apos;s license, badge, or membership card at 100% real-world physical scale (85.6 × 54 mm). Completely free, private, and runs locally in your browser.
                </p>
              </div>
            </ScrollReveal>

            {/* SECTION 2: 3-STEP ID COPY WORKFLOW */}
            <ScrollReveal delay={50}>
              <div
                style={{
                  borderColor: "#e5e5df",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  backgroundColor: "#ffffff",
                }}
                className="rounded-2xl sm:rounded-[24px] p-6 sm:p-8 shadow-2xs"
              >
                <h2 className="text-xl sm:text-2xl font-black text-[#1c201a] tracking-tight mb-2.5">
                  How to Copy Both Sides of an ID Card
                </h2>
                <p className="text-xs sm:text-sm text-[#575a53] leading-relaxed mb-6 font-normal">
                  Create high-resolution, aligned 1:1 ID card copies in three simple steps without uploading sensitive documents to external servers:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
                  {/* Step 1 */}
                  <div
                    style={{
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      backgroundColor: "#faf9f6",
                      padding: "20px",
                    }}
                    className="rounded-2xl flex flex-col justify-between"
                  >
                    <div>
                      <div
                        style={{
                          backgroundColor: "#f6f5f3",
                          borderColor: "#e5e5df",
                          borderWidth: "1px",
                          borderStyle: "solid",
                          color: "#3158d5",
                        }}
                        className="flex h-10 w-10 items-center justify-center rounded-xl mb-3 shadow-2xs shrink-0 font-black text-sm"
                      >
                        1
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-[#1c201a] mb-1.5">
                        Capture or Upload Front &amp; Back
                      </h3>
                      <p className="text-xs sm:text-sm text-[#575a53] leading-relaxed font-normal">
                        Take photos with your phone camera or upload existing images. The intelligent corner scanner detects card edges, aligns perspective, and removes background clutter.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div
                    style={{
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      backgroundColor: "#faf9f6",
                      padding: "20px",
                    }}
                    className="rounded-2xl flex flex-col justify-between"
                  >
                    <div>
                      <div
                        style={{
                          backgroundColor: "#f6f5f3",
                          borderColor: "#e5e5df",
                          borderWidth: "1px",
                          borderStyle: "solid",
                          color: "#3158d5",
                        }}
                        className="flex h-10 w-10 items-center justify-center rounded-xl mb-3 shadow-2xs shrink-0 font-black text-sm"
                      >
                        2
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-[#1c201a] mb-1.5">
                        Choose Layout &amp; Print Scale
                      </h3>
                      <p className="text-xs sm:text-sm text-[#575a53] leading-relaxed font-normal">
                        Choose Stacked (top and bottom), Side-by-Side, or 2-Page Duplex layout. Cards are positioned at exact 1:1 real-world size (85.6 × 54 mm) with optional 125% and 150% enlarged sizes.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div
                    style={{
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      backgroundColor: "#faf9f6",
                      padding: "20px",
                    }}
                    className="rounded-2xl flex flex-col justify-between"
                  >
                    <div>
                      <div
                        style={{
                          backgroundColor: "#f6f5f3",
                          borderColor: "#e5e5df",
                          borderWidth: "1px",
                          borderStyle: "solid",
                          color: "#3158d5",
                        }}
                        className="flex h-10 w-10 items-center justify-center rounded-xl mb-3 shadow-2xs shrink-0 font-black text-sm"
                      >
                        3
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-[#1c201a] mb-1.5">
                        Print or Download PDF
                      </h3>
                      <p className="text-xs sm:text-sm text-[#575a53] leading-relaxed font-normal">
                        Download a sharp, vector-rendered A4 or Letter PDF with optional cut lines and anti-fraud security watermark, ready for immediate 100% scale printing.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* SECTION 3: STANDARD ID FORMATS TABLE */}
            <ScrollReveal delay={100}>
              <div
                style={{
                  borderColor: "#e5e5df",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  backgroundColor: "#ffffff",
                }}
                className="rounded-2xl sm:rounded-[24px] shadow-2xs overflow-hidden"
              >
                <div className="p-6 sm:p-8 pb-5">
                  <h2 className="text-xl sm:text-2xl font-black text-[#1c201a] tracking-tight mb-2.5">
                    Standard ID Card Formats &amp; Dimensions
                  </h2>
                  <p className="text-xs sm:text-sm text-[#575a53] leading-relaxed font-normal">
                    Most government and corporate identity cards follow the international ISO/IEC 7810 ID-1 standard measuring 85.6 × 54 mm. Spellense preserves these exact real-world dimensions:
                  </p>
                </div>

                <div style={{ borderTop: "1px solid #efeee7" }} className="overflow-x-auto w-full">
                  <table className="w-full table-fixed min-w-[640px] text-left text-sm border-collapse">
                    <colgroup>
                      <col style={{ width: "28%" }} />
                      <col style={{ width: "20%" }} />
                      <col style={{ width: "17%" }} />
                      <col style={{ width: "35%" }} />
                    </colgroup>
                    <thead style={{ backgroundColor: "#f6f5f3" }} className="text-[#70746d] text-[11px] font-bold uppercase tracking-wider">
                      <tr>
                        <th style={{ borderBottom: "1px solid #efeee7" }} className="px-5 sm:px-7 py-3.5">Card Format</th>
                        <th style={{ borderBottom: "1px solid #efeee7" }} className="px-5 sm:px-7 py-3.5">Physical Dimensions</th>
                        <th style={{ borderBottom: "1px solid #efeee7" }} className="px-5 sm:px-7 py-3.5">Print Scale</th>
                        <th style={{ borderBottom: "1px solid #efeee7" }} className="px-5 sm:px-7 py-3.5">Common Examples</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white text-xs">
                      {ID_CARD_FORMATS_DATA.map((row) => (
                        <tr
                          key={row.name}
                          style={{
                            borderBottom: "1px solid #efeee7",
                          }}
                          className="hover:bg-[#faf9f6] transition-colors"
                        >
                          <td className="px-5 sm:px-7 py-3.5 font-bold text-[#1c201a]">
                            {row.name}
                          </td>
                          <td className="px-5 sm:px-7 py-3.5 tabular-nums text-[#575a53] font-mono">
                            {row.dim}
                          </td>
                          <td className="px-5 sm:px-7 py-3.5 font-bold text-[#3158d5]">
                            {row.scale}
                          </td>
                          <td className="px-5 sm:px-7 py-3.5 text-[#575a53]">
                            {row.use}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </ScrollReveal>

            {/* SECTION 4: PRIVACY & ANTI-FRAUD FEATURES */}
            <ScrollReveal delay={150}>
              <div
                style={{
                  borderColor: "#e5e5df",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  backgroundColor: "#ffffff",
                }}
                className="rounded-2xl sm:rounded-[24px] p-6 sm:p-8 shadow-2xs space-y-6"
              >
                <div>
                  <div
                    style={{
                      borderColor: "#bcd5ff",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      backgroundColor: "#e8effe",
                      color: "#3158d5",
                    }}
                    className="inline-block rounded-md px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider shadow-2xs"
                  >
                    SECURITY &amp; PRIVACY
                  </div>
                  <h2 className="mt-3 text-xl sm:text-2xl font-black text-[#1c201a] tracking-tight">
                    Why Use Spellense ID Print Maker?
                  </h2>
                  <p className="mt-2 text-xs sm:text-sm text-[#575a53] max-w-3xl leading-relaxed font-normal">
                    Photocopying identity cards on public office copiers or sending photos to untrusted online servers creates significant privacy risks. Spellense runs completely in your web browser with built-in fraud prevention tools.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                  <div
                    style={{
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      backgroundColor: "#faf9f6",
                      padding: "20px",
                    }}
                    className="rounded-2xl space-y-2"
                  >
                    <div className="flex items-center gap-2.5 font-bold text-[#1c201a] text-sm sm:text-base">
                      <div
                        style={{
                          backgroundColor: "#f6f5f3",
                          borderColor: "#e5e5df",
                          borderWidth: "1px",
                          borderStyle: "solid",
                          color: "#3158d5",
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-xl shadow-2xs shrink-0 font-bold"
                      >
                        <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <span>100% In-Browser Privacy</span>
                    </div>
                    <p className="text-xs sm:text-sm text-[#575a53] leading-relaxed font-normal">
                      Your ID card images never leave your computer or phone. All corner detection, image filtering, and PDF generation happen 100% locally using client-side WebAssembly and Canvas APIs. EXIF and GPS tags are purged on load.
                    </p>
                  </div>

                  <div
                    style={{
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      backgroundColor: "#faf9f6",
                      padding: "20px",
                    }}
                    className="rounded-2xl space-y-2"
                  >
                    <div className="flex items-center gap-2.5 font-bold text-[#1c201a] text-sm sm:text-base">
                      <div
                        style={{
                          backgroundColor: "#f6f5f3",
                          borderColor: "#e5e5df",
                          borderWidth: "1px",
                          borderStyle: "solid",
                          color: "#3158d5",
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-xl shadow-2xs shrink-0 font-bold"
                      >
                        <svg className="w-4 h-4 text-[#3158d5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                      </div>
                      <span>Anti-Fraud Security Watermark</span>
                    </div>
                    <p className="text-xs sm:text-sm text-[#575a53] leading-relaxed font-normal">
                      Protect yourself against identity misuse by overlaying a diagonal semi-transparent watermark (such as &quot;FOR VERIFICATION ONLY&quot; or your custom text) directly across your printed cards.
                    </p>
                  </div>

                  <div
                    style={{
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      backgroundColor: "#faf9f6",
                      padding: "20px",
                    }}
                    className="rounded-2xl space-y-2"
                  >
                    <div className="flex items-center gap-2.5 font-bold text-[#1c201a] text-sm sm:text-base">
                      <div
                        style={{
                          backgroundColor: "#f6f5f3",
                          borderColor: "#e5e5df",
                          borderWidth: "1px",
                          borderStyle: "solid",
                          color: "#3158d5",
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-xl shadow-2xs shrink-0 font-bold"
                      >
                        <svg className="w-4 h-4 text-[#3158d5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                      </div>
                      <span>Guaranteed 1:1 Physical Scale</span>
                    </div>
                    <p className="text-xs sm:text-sm text-[#575a53] leading-relaxed font-normal">
                      Standard photo printers and scanners often distort proportions. Spellense strictly locks the ISO ID-1 physical scale (85.6 × 54 mm) so your printed copy matches your real card down to the millimeter.
                    </p>
                  </div>

                  <div
                    style={{
                      borderColor: "#e5e5df",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      backgroundColor: "#faf9f6",
                      padding: "20px",
                    }}
                    className="rounded-2xl space-y-2"
                  >
                    <div className="flex items-center gap-2.5 font-bold text-[#1c201a] text-sm sm:text-base">
                      <div
                        style={{
                          backgroundColor: "#f6f5f3",
                          borderColor: "#e5e5df",
                          borderWidth: "1px",
                          borderStyle: "solid",
                          color: "#3158d5",
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-xl shadow-2xs shrink-0 font-bold"
                      >
                        <svg className="w-4 h-4 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="6" cy="6" r="3" />
                          <circle cx="6" cy="18" r="3" />
                          <line x1="20" y1="4" x2="8.12" y2="15.88" />
                          <line x1="14.47" y1="14.48" x2="20" y2="20" />
                          <line x1="8.12" y1="8.12" x2="12" y2="12" />
                        </svg>
                      </div>
                      <span>Precision Cut Marks &amp; Multi-Card</span>
                    </div>
                    <p className="text-xs sm:text-sm text-[#575a53] leading-relaxed font-normal">
                      Print optional cutting lines or corner marks for effortless trimming with scissors or a paper cutter. Need copies for multiple family members or staff? Add up to 5 cards onto the same sheet in one click.
                    </p>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* SECTION 5: AMBER SCALE WARNING CARD */}
            <ScrollReveal delay={200}>
              <div className="rounded-2xl sm:rounded-[24px] border border-amber-200 bg-[#fffbeb] p-5 sm:p-6 flex items-start gap-3.5 shadow-2xs">
                <svg className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-amber-950">
                    How to print at 100% Actual Size (Stop &quot;Fit to Page&quot;)
                  </h3>
                  <p className="text-xs sm:text-sm text-amber-900/90 mt-1 leading-relaxed font-normal">
                    When printing your PDF from Adobe Acrobat, Apple Preview, or Google Chrome, ensure your printer dialog is set to <strong>&quot;Actual Size&quot;</strong> or <strong>&quot;100% Scale&quot;</strong>. If your printer defaults to &quot;Fit to Page&quot; or &quot;Shrink Oversized Pages&quot;, it will scale down your ID card by 3% to 7%, throwing off official visa, banking, and government requirements.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            {/* SECTION 6: FAQ SECTION — 2-Column Clean Layout (HOMEPAGE MATCH) */}
            <div
              style={{
                borderTop: "1px solid #e5e5df",
                marginTop: "48px",
                paddingTop: "48px",
                marginBottom: "48px",
              }}
              className="w-full pb-12 sm:pb-20"
            >
              <div className="mx-auto w-full">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left 4 Columns */}
                  <ScrollReveal className="lg:col-span-4 lg:sticky lg:top-8">
                    <div
                      style={{
                        borderColor: "#e5e5df",
                        borderWidth: "1px",
                        borderStyle: "solid",
                        backgroundColor: "#ffffff",
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 shadow-2xs"
                    >
                      <span className="flex h-1.5 w-1.5 rounded-full bg-[#3158d5] animate-pulse" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#3158d5]">
                        FREQUENTLY ASKED QUESTIONS
                      </span>
                    </div>
                    <h2 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-[#1c201a]">
                      ID Print Maker FAQ
                    </h2>
                    <p className="mt-2 text-xs sm:text-sm text-[#70746d] leading-relaxed font-normal">
                      Everything you need to know about copying, aligning, and printing your ID cards at exact physical dimensions.
                    </p>
                  </ScrollReveal>

                  {/* Right 8 Columns */}
                  <div className="lg:col-span-8 space-y-3.5">
                    {FAQ_LIST.map((faq, index) => (
                      <ScrollReveal key={faq.q} delay={index * 30}>
                        <details
                          style={{
                            borderColor: "#e5e5df",
                            borderWidth: "1px",
                            borderStyle: "solid",
                            backgroundColor: "#ffffff",
                          }}
                          className="group rounded-2xl p-5 shadow-2xs transition-all open:border-[#3158d5]/40 open:shadow-xs"
                        >
                          <summary className="flex cursor-pointer items-center justify-between font-bold text-[#1c201a] text-sm sm:text-base list-none">
                            <span>{faq.q}</span>
                            <span className="ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f6f5f3] text-[#70746d] transition-transform duration-200 group-open:rotate-180 group-open:bg-[#e8effe] group-open:text-[#3158d5]">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </span>
                          </summary>
                          <p className="mt-3 text-xs sm:text-sm leading-relaxed text-[#575a53]">
                            {faq.a}
                          </p>
                        </details>
                      </ScrollReveal>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      {/* GLOBAL FOOTER */}
      <Footer currentPath="/print-sheet-maker" />
    </div>
  );
}
