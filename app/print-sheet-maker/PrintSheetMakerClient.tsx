"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
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
import PrintSheetLandingChooser from "@/components/print-sheet/PrintSheetLandingChooser";
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

  const renderIdSheetPreview = (isMobile: boolean = false) => (
    <div
      className={`bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col ${
        isMobile ? "w-full min-h-[380px] sm:min-h-[500px]" : "h-full min-h-[580px]"
      }`}
    >
      {/* Header bar of preview */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-xs sm:text-sm font-semibold text-slate-900">Print preview</h3>
        {totalFilledCards === 0 ? (
          <span className="text-[11px] sm:text-xs text-slate-400 font-normal">Waiting for card image</span>
        ) : (
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="text-[11px] sm:text-xs text-slate-500 font-medium">
              {totalFilledCards} card{totalFilledCards === 1 ? "" : "s"} · {idPages.length} pg · {idPaper}
            </span>
            <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setPreviewMode("fit")}
                className={`h-5.5 sm:h-6 px-2 sm:px-2.5 rounded-md text-[11px] sm:text-xs font-semibold transition cursor-pointer ${
                  previewMode === "fit" ? "bg-white text-blue-600 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Fit
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("actual")}
                className={`h-5.5 sm:h-6 px-2 sm:px-2.5 rounded-md text-[11px] sm:text-xs font-semibold transition cursor-pointer ${
                  previewMode === "actual" ? "bg-white text-blue-600 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                100%
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Canvas container */}
      <div
        ref={isMobile ? undefined : sheetContainerRef}
        className="flex-1 bg-[#f8fafc] flex flex-col items-center justify-center p-3 sm:p-6 relative min-h-[320px] sm:min-h-[380px]"
      >
        {totalFilledCards === 0 ? (
          <div className="w-full py-10 sm:py-20 px-4 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center text-slate-300 mb-3 sm:mb-4 shadow-2xs">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="5" width="20" height="14" rx="3" />
                <circle cx="8" cy="11" r="2.5" />
                <path d="M4 17a4 4 0 0 1 8 0" />
                <line x1="14" y1="10" x2="19" y2="10" strokeLinecap="round" />
                <line x1="14" y1="13" x2="17" y2="13" strokeLinecap="round" />
              </svg>
            </div>
            <h4 className="text-sm sm:text-base font-bold text-slate-900 mb-1">
              No card image added yet
            </h4>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mt-1 leading-relaxed">
              Add the front of your ID card above to preview the print sheet layout and cut guides.
            </p>
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
                }}
                className="relative bg-white rounded-xs shadow-2xl shadow-slate-900/10 ring-1 ring-slate-900/5 select-none transition-all overflow-hidden"
              >
                {/* Dashed Margin Guide Line */}
                <div
                  style={{
                    left: `${((10 / idOrientedPaper[0]) * 100).toFixed(3)}%`,
                    top: `${((10 / idOrientedPaper[1]) * 100).toFixed(3)}%`,
                    right: `${((10 / idOrientedPaper[0]) * 100).toFixed(3)}%`,
                    bottom: `${((10 / idOrientedPaper[1]) * 100).toFixed(3)}%`,
                  }}
                  className="absolute border border-dashed border-slate-300/80 pointer-events-none z-10"
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
                      }}
                      className={`absolute transition-all overflow-hidden rounded-xs bg-slate-50 ${
                        idCutGuide === "lines" ? "border border-slate-300" : ""
                      }`}
                    >
                      {hasImg ? (
                        <img
                          key={imgData?.url}
                          src={imgData?.url}
                          alt="ID Card"
                          className="w-full h-full object-cover block"
                        />
                      ) : (
                        <div className="w-full h-full border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                          <span className="text-[11px] font-bold">Card Slot</span>
                          <span className="text-[9px] text-slate-400">85.6 × 54 mm</span>
                        </div>
                      )}

                      {/* Live Watermark Overlay if enabled */}
                      {idWatermarkEnabled && hasImg && (
                        <div className="pointer-events-none absolute inset-0 overflow-hidden select-none">
                          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                            <pattern
                              id={`wm-preview-${isMobile ? "m-" : ""}${item.i}-${idx}`}
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
                            <rect width="100%" height="100%" fill={`url(#wm-preview-${isMobile ? "m-" : ""}${item.i}-${idx})`} />
                          </svg>
                        </div>
                      )}

                      {/* Cut Marks */}
                      {idCutGuide === "marks" && (
                        <>
                          <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-slate-400 pointer-events-none" />
                          <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-slate-400 pointer-events-none" />
                          <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-slate-400 pointer-events-none" />
                          <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-slate-400 pointer-events-none" />
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
                  className="h-8 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 disabled:opacity-30 transition cursor-pointer shadow-2xs"
                >
                  ◀ Previous
                </button>
                <span className="text-xs font-bold text-slate-700">
                  Page {idActivePage + 1} of {idPages.length}
                </span>
                <button
                  type="button"
                  disabled={idActivePage === idPages.length - 1}
                  onClick={() => setIdActivePage((p) => Math.min(idPages.length - 1, p + 1))}
                  className="h-8 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 disabled:opacity-30 transition cursor-pointer shadow-2xs"
                >
                  Next ▶
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white relative z-10 text-[15px]">
      {/* NAVBAR */}
      <Navbar />

      {/* TOAST NOTIFICATION */}
      {notification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-slate-900/95 px-5 py-3 text-sm font-medium text-white shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
          {notification}
        </div>
      )}

      {/* CLEAR ALL CONFIRMATION MODAL */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Clear all photos?
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              This will remove all uploaded photos from the sheet. You can undo this action if needed.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="h-11 px-4 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                className="h-11 px-5 rounded-xl text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 shadow-md transition cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODE SWITCH CONFIRMATION MODAL */}
      {showSwitchConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Switch to {pendingSwitchMode === "id" ? "ID Card" : "Photos"} mode?
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Switching will discard your current {toolMode === "id" ? "ID card copies" : "uploaded photos"}. Are you sure you want to proceed?
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowSwitchConfirm(false);
                  setPendingSwitchMode(null);
                }}
                className="h-11 px-4 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pendingSwitchMode) executeModeSwitch(pendingSwitchMode);
                }}
                className="h-11 px-5 rounded-xl text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 shadow-md transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 font-black text-lg">
                ⚠️
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Print Scale Reminder
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Print at <strong>100% / Actual size</strong>, not &quot;Fit to Page&quot;, or your photo dimensions will be wrong.
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-xs text-slate-600 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={dontShowReminderAgain}
                onChange={(e) => setDontShowReminderAgain(e.target.checked)}
                className="h-4 w-4 rounded accent-[#0055fe] cursor-pointer"
              />
              <span>Don&apos;t show this reminder again</span>
            </label>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowPrintReminder(false);
                  setPendingPrintAction(null);
                }}
                className="h-11 px-4 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReminder}
                style={{ backgroundColor: "#0055fe" }}
                className="h-11 px-5 rounded-xl text-sm font-bold text-white shadow-md shadow-blue-600/20 hover:brightness-105 active:scale-95 transition cursor-pointer"
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

      <main id="main-content" className="flex-1">
        {/* HERO TITLE */}
        <section className="px-4 max-w-7xl mx-auto pt-3 sm:pt-6 pb-1.5 sm:pb-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
            <div>
              <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#0f172a]">
                ID Print Maker
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1 line-clamp-1 sm:line-clamp-none">
                Copy ID card front and back onto one page at exact physical dimensions (85.6 × 54 mm). 100% private in-browser printing.
              </p>
            </div>

            {/* Privacy Badge: compact on desktop, hidden on small mobile to keep heading compact */}
            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 text-xs font-semibold text-emerald-800 self-start sm:self-center shadow-2xs">
              <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <span>Your ID never leaves your device</span>
            </div>
          </div>
        </section>

        {/* WORKSPACE SECTION */}
        <section className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 pb-40 sm:pb-36 lg:pb-16 mt-2 sm:mt-4">

          {/* LANDING CHOOSER (First load with 2 cards) */}
          {toolMode === "landing" && (
            <PrintSheetLandingChooser
              onSelectMode={handleSelectLandingMode}
              onDropPhotos={addFiles}
              hasSavedSettings={hasSavedSettings}
            />
          )}

          {/* PHOTOS MODE */}
          {toolMode === "photos" && (
            <>
              {photos.length === 0 ? (
            <div className="mx-auto max-w-2xl py-6 sm:py-10">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`group relative w-full cursor-pointer rounded-3xl border-2 border-dashed py-12 px-6 sm:py-16 sm:px-12 lg:py-20 text-center transition-all duration-200 bg-white shadow-sm ${
                  isDragging
                    ? "border-[#0055fe] bg-blue-50/80 scale-[1.01]"
                    : "border-slate-300 hover:border-[#0055fe] hover:bg-slate-50/50"
                }`}
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 group-hover:scale-110 transition-transform mb-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                    <path d="M12 12v9" />
                    <path d="m16 16-4-4-4 4" />
                  </svg>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 group-hover:text-[#0055fe] transition-colors">
                  Drop photos here or tap to choose
                </h2>
                <p className="text-sm text-slate-500 mt-1.5">
                  Supports JPG, PNG, and WebP • Ctrl+V to paste
                </p>

                {/* BUTTONS (SIDE BY SIDE WITH BREATHING SPACE) */}
                <div className="mt-8 sm:mt-10 mb-2 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="group/btn inline-flex min-w-[185px] sm:min-w-[210px] items-center justify-center gap-3 rounded-2xl border border-slate-200/90 bg-white hover:bg-slate-50 hover:border-blue-400 px-8 sm:px-10 py-4 sm:py-4.5 text-sm sm:text-base font-semibold text-slate-700 hover:text-[#0055fe] shadow-2xs hover:shadow-xs transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-slate-400 group-hover/btn:text-[#0055fe] transition-colors"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span>Upload Now</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLoadSamplePhotos();
                    }}
                    className="group/sample inline-flex min-w-[185px] sm:min-w-[210px] items-center justify-center gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/70 hover:bg-white hover:border-blue-400/80 px-8 sm:px-10 py-4 sm:py-4.5 text-sm sm:text-base font-semibold text-slate-700 hover:text-[#0055fe] transition-all cursor-pointer shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover/sample:text-[#0055fe] transition-colors">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <span>Try Sample</span>
                  </button>
                </div>

                {hasSavedSettings && (
                  <div className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 font-medium">
                    <span>⚙️ Settings remembered from last time</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* VIEW 2: UNIFIED 1-SCREEN WORKSPACE */
            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-5 items-start">
              {/* ========================================================= */}
              {/* LEFT COLUMN: SIMPLIFIED PANEL (~400px tall on desktop)   */}
              {/* ========================================================= */}
              <div className="order-2 lg:order-1 w-full lg:col-span-5 xl:col-span-4 bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
                
                {/* 1. Panel Header: Only Undo, Clear & Same as last time chip */}
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    {hasSavedSettings && savedSettingsDiffer && !hasAppliedSavedSettings && (
                      <button
                        type="button"
                        onClick={handleApplySavedSettings}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0055fe] bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition cursor-pointer"
                        title="Restore previously saved settings"
                      >
                        <span>↺ Same as last time</span>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      data-keep-popover="true"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUndo();
                      }}
                      disabled={historyLength === 0}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 disabled:opacity-30 cursor-pointer transition"
                    >
                      Undo
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(true)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer transition"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* 1. Paper size, Orientation & Copies in ONE clean row */}
                <div className="flex items-end gap-2.5">
                  {/* Paper & Orientation */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="h-5 flex items-center">
                      <label className="text-xs font-bold text-slate-700">
                        Paper size
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <select
                          value={paper}
                          onChange={(e) => setPaper(e.target.value)}
                          className="w-full h-11 px-3 pr-9 rounded-xl border border-slate-200 bg-white font-bold text-xs sm:text-sm text-slate-900 focus:border-[#0055fe] focus:outline-none appearance-none cursor-pointer"
                        >
                          <option value="A4">A4 (210 × 297 mm)</option>
                          <option value="Letter">Letter (8.5 × 11 in)</option>
                          <option value="A3">A3 (297 × 420 mm)</option>
                          <option value="Custom">Custom size...</option>
                        </select>
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-slate-400">
                          <svg className="w-4 h-4 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                      </div>

                      {/* Mini Orientation Toggle inline with dropdown */}
                      <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80 shrink-0 h-11">
                        <button
                          type="button"
                          onClick={() => setOrient("portrait")}
                          className={`h-9 px-2.5 sm:px-3 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center ${
                            orient === "portrait"
                              ? "bg-white text-[#0055fe] shadow-2xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                          title="Portrait"
                          aria-label="Portrait orientation"
                        >
                          <svg className="w-4.5 h-5 text-current" viewBox="0 0 14 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="1" y="1" width="12" height="16" rx="2" />
                            <line x1="4" y1="5" x2="10" y2="5" strokeWidth="1.5" />
                            <line x1="4" y1="8" x2="8" y2="8" strokeWidth="1.5" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrient("landscape")}
                          className={`h-9 px-2.5 sm:px-3 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center ${
                            orient === "landscape"
                              ? "bg-white text-[#0055fe] shadow-2xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                          title="Landscape"
                          aria-label="Landscape orientation"
                        >
                          <svg className="w-5 h-4.5 text-current" viewBox="0 0 18 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="1" y="1" width="16" height="12" rx="2" />
                            <line x1="5" y1="4" x2="13" y2="4" strokeWidth="1.5" />
                            <line x1="5" y1="7" x2="10" y2="7" strokeWidth="1.5" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Copies stepper - compact width */}
                  <div className="w-24 sm:w-28 shrink-0 space-y-1.5">
                    <div className="h-5 flex items-center">
                      <label className="text-xs font-bold text-slate-700">
                        Copies
                      </label>
                    </div>
                    <div className="flex items-center h-11 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                      <button
                        type="button"
                        onClick={() => handleSetGlobalCopies(globalCopies - 1)}
                        disabled={globalCopies <= 1}
                        className="w-7 sm:w-8 h-full flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer text-base"
                        aria-label="Decrease copies"
                      >
                        −
                      </button>
                      <div className="flex-1 text-center font-bold text-xs sm:text-sm text-slate-900 tabular-nums">
                        {globalCopies}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSetGlobalCopies(globalCopies + 1)}
                        className="w-7 sm:w-8 h-full flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 cursor-pointer text-base"
                        aria-label="Increase copies"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Custom paper dimensions if selected */}
                {paper === "Custom" && (
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-2 text-xs">
                    <div className="flex-1">
                      <span className="text-[10px] text-slate-500 font-bold block mb-1">Width (mm)</span>
                      <input
                        type="number"
                        value={customPaper[0]}
                        onChange={(e) => setCustomPaper([Math.max(50, +e.target.value || 100), customPaper[1]])}
                        className="w-full h-9 px-2 rounded-xl border border-slate-200 bg-white tabular-nums text-xs"
                      />
                    </div>
                    <span className="text-slate-400 font-bold self-end pb-1.5">×</span>
                    <div className="flex-1">
                      <span className="text-[10px] text-slate-500 font-bold block mb-1">Height (mm)</span>
                      <input
                        type="number"
                        value={customPaper[1]}
                        onChange={(e) => setCustomPaper([customPaper[0], Math.max(50, +e.target.value || 100)])}
                        className="w-full h-9 px-2 rounded-xl border border-slate-200 bg-white tabular-nums text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* Permanent + Add photos button directly under Copies/Paper row */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
                  aria-label="Add more photos"
                >
                  <span className="text-base font-bold leading-none text-[#0055fe]">+</span>
                  <span>Add photos</span>
                </button>

                {/* 2. Photo size: Segmented Control Auto fit / Custom fit */}
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setFitType("auto")}
                      className={`min-h-[48px] rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer ${
                        fitType === "auto"
                          ? "bg-white text-[#0055fe] shadow-2xs border border-slate-200/60"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                      aria-label="Auto fit mode"
                    >
                      <svg className="w-4 h-4 text-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M3 9h18M9 21V9" />
                      </svg>
                      <span>Auto fit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFitType("custom")}
                      className={`min-h-[48px] rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer ${
                        fitType === "custom"
                          ? "bg-white text-[#0055fe] shadow-2xs border border-slate-200/60"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                      aria-label="Custom fit mode"
                    >
                      <svg className="w-4 h-4 text-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                      <span>Custom fit</span>
                    </button>
                  </div>

                  {/* Custom fit reveals compact block */}
                  {fitType === "custom" && (
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 animate-in fade-in duration-150">
                      {/* Rows and Columns steppers (1 to 12) - ALWAYS VISIBLE */}
                      <div className="space-y-1.5">
                        <div className="grid grid-cols-2 gap-2.5">
                          {/* Columns */}
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-slate-600 block">Columns</span>
                            <div className="flex items-center h-10 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                              <button
                                type="button"
                                onClick={() => {
                                  pushHistory();
                                  setExactSize(false);
                                  setSelectedPresetChip(null);
                                  setGridCols((prev) => Math.max(1, prev - 1));
                                }}
                                disabled={gridCols <= 1}
                                className="w-8 h-full flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                                aria-label="Decrease columns"
                              >
                                −
                              </button>
                              <div className="flex-1 text-center font-bold text-xs text-slate-900 tabular-nums">
                                {gridCols}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  pushHistory();
                                  setExactSize(false);
                                  setSelectedPresetChip(null);
                                  setGridCols((prev) => Math.min(12, prev + 1));
                                }}
                                disabled={gridCols >= 12}
                                className="w-8 h-full flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                                aria-label="Increase columns"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Rows */}
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-slate-600 block">Rows</span>
                            <div className="flex items-center h-10 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                              <button
                                type="button"
                                onClick={() => {
                                  pushHistory();
                                  setExactSize(false);
                                  setSelectedPresetChip(null);
                                  setGridRows((prev) => Math.max(1, prev - 1));
                                }}
                                disabled={gridRows <= 1}
                                className="w-8 h-full flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                                aria-label="Decrease rows"
                              >
                                −
                              </button>
                              <div className="flex-1 text-center font-bold text-xs text-slate-900 tabular-nums">
                                {gridRows}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  pushHistory();
                                  setExactSize(false);
                                  setSelectedPresetChip(null);
                                  setGridRows((prev) => Math.min(12, prev + 1));
                                }}
                                disabled={gridRows >= 12}
                                className="w-8 h-full flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                                aria-label="Increase rows"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Divider & Switch "Exact size & Presets" */}
                      <div className="pt-2 border-t border-slate-200/80">
                        <div
                          onClick={() => {
                            pushHistory();
                            setExactSize(!exactSize);
                          }}
                          className="flex items-center justify-between cursor-pointer select-none py-0.5"
                        >
                          <span className="text-xs font-bold text-slate-700">Exact size & Presets</span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={exactSize}
                            onClick={(e) => {
                              e.stopPropagation();
                              pushHistory();
                              setExactSize(!exactSize);
                            }}
                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer p-0.5 ${
                              exactSize ? "bg-[#0055fe]" : "bg-slate-300"
                            }`}
                            aria-label="Toggle exact size"
                          >
                            <span
                              style={{
                                transform: exactSize ? "translateX(20px)" : "translateX(2px)",
                              }}
                              className="inline-block h-4 w-4 rounded-full bg-white shadow-xs transition-transform duration-200"
                            />
                          </button>
                        </div>

                        {exactSize && (
                          <div className="mt-2.5 space-y-2.5 animate-in fade-in duration-150">
                            {/* Preset chips - WRAPPED TO PREVENT CUTOFF */}
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {PRESET_CHIPS.map((chip) => {
                                const isSelected = selectedPresetChip === chip.id;
                                return (
                                  <button
                                    key={chip.id}
                                    type="button"
                                    onClick={() => {
                                      pushHistory();
                                      handleApplyPresetChip(chip);
                                    }}
                                    className={`h-7 px-2.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${
                                      isSelected
                                        ? "bg-[#0055fe] text-white shadow-2xs"
                                        : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                                    }`}
                                  >
                                    {chip.label}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Width x Height fields + lock + unit */}
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1 min-w-0">
                                <span className="text-[10px] text-slate-500 font-bold block mb-1">
                                  Width ({sizeUnit})
                                </span>
                                <input
                                  type="number"
                                  step={sizeUnit === "in" ? "0.01" : "0.5"}
                                  min="1"
                                  value={customWidth}
                                  onChange={(e) => {
                                    handleWidthChange(+e.target.value || 0);
                                  }}
                                  className="w-full h-9 px-2 rounded-xl border border-slate-200 bg-white font-bold text-xs tabular-nums text-slate-900 focus:border-[#0055fe] focus:outline-none"
                                />
                              </div>

                              {/* Lock button */}
                              <button
                                type="button"
                                onClick={() => setAspectRatioLocked(!aspectRatioLocked)}
                                className={`self-end mb-1 p-1.5 rounded-lg border transition cursor-pointer shrink-0 ${
                                  aspectRatioLocked
                                    ? "bg-blue-50 border-blue-200 text-[#0055fe]"
                                    : "bg-white border-slate-200 text-slate-400 hover:text-slate-600"
                                }`}
                                title={aspectRatioLocked ? "Aspect ratio locked" : "Aspect ratio unlocked"}
                                aria-label="Toggle aspect ratio lock"
                              >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  {aspectRatioLocked ? (
                                    <>
                                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </>
                                  ) : (
                                    <>
                                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                                    </>
                                  )}
                                </svg>
                              </button>

                              {/* Swap Dimensions button ⇄ */}
                              <button
                                type="button"
                                onClick={() => {
                                  pushHistory();
                                  const oldW = customWidth;
                                  setCustomWidth(customHeight);
                                  setCustomHeight(oldW);
                                  setSelectedPresetChip(null);
                                }}
                                className="self-end mb-1 p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer shrink-0"
                                title="Swap width and height (Portrait ⇄ Landscape)"
                                aria-label="Swap width and height"
                              >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M7 16V4m0 0L3 8m4-4l4 4m6 4v12m0 0l4-4m-4 4l-4-4" />
                                </svg>
                              </button>

                              <div className="flex-1 min-w-0">
                                <span className="text-[10px] text-slate-500 font-bold block mb-1">
                                  Height ({sizeUnit})
                                </span>
                                <input
                                  type="number"
                                  step={sizeUnit === "in" ? "0.01" : "0.5"}
                                  min="1"
                                  value={customHeight}
                                  onChange={(e) => {
                                    handleHeightChange(+e.target.value || 0);
                                  }}
                                  className="w-full h-9 px-2 rounded-xl border border-slate-200 bg-white font-bold text-xs tabular-nums text-slate-900 focus:border-[#0055fe] focus:outline-none"
                                />
                              </div>

                              {/* Unit toggle mm / in */}
                              <div className="w-16 self-end">
                                <span className="text-[10px] text-slate-500 font-bold block mb-1">Unit</span>
                                <div className="flex items-center h-9 p-0.5 rounded-xl border border-slate-200 bg-white">
                                  <button
                                    type="button"
                                    onClick={() => handleUnitChange("mm")}
                                    className={`flex-1 h-full rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                      sizeUnit === "mm" ? "bg-[#0055fe] text-white" : "text-slate-600"
                                    }`}
                                  >
                                    mm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUnitChange("in")}
                                    className={`flex-1 h-full rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                      sizeUnit === "in" ? "bg-[#0055fe] text-white" : "text-slate-600"
                                    }`}
                                  >
                                    in
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Live line "Each photo: 85.6 × 54 mm" */}
                      <div className="text-[11px] font-bold text-blue-700 text-center tabular-nums pt-0.5">
                        Each photo: {formatDim(plan.cw)} × {formatDim(plan.ch)} mm
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Photo display (Always visible) */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-bold text-slate-700 block">Photo display</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFitMode("fill")}
                      className={`min-h-[40px] rounded-xl border text-xs font-bold transition cursor-pointer ${
                        fitMode === "fill"
                          ? "border-2 border-[#0055fe] bg-blue-50 text-[#0055fe]"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      Fill the box (crop)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFitMode("fit")}
                      className={`min-h-[40px] rounded-xl border text-xs font-bold transition cursor-pointer ${
                        fitMode === "fit"
                          ? "border-2 border-[#0055fe] bg-blue-50 text-[#0055fe]"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      Show full photo
                    </button>
                  </div>
                </div>

                {/* 4. Gap and Margins side-by-side on one row */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">Gap</label>
                      <span className="text-xs font-bold text-blue-700 tabular-nums">{gap} mm</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      step="0.5"
                      value={gap}
                      onChange={(e) => setGap(+e.target.value)}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0055fe]"
                      aria-label="Gap between photos"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">Margin</label>
                      <span className="text-xs font-bold text-blue-700 tabular-nums">{margin} mm</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      step="1"
                      value={margin}
                      onChange={(e) => setMargin(+e.target.value)}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0055fe]"
                      aria-label="Page margin"
                    />
                  </div>
                </div>

                {/* 5. Cut guides dropdown and Rotate all button */}
                <div className="grid grid-cols-2 gap-2.5 items-end pt-1">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">Cut guides</label>
                    <div className="relative">
                      <select
                        value={cutGuide}
                        onChange={(e) => setCutGuide(e.target.value as "none" | "marks" | "lines" | "border")}
                        className="w-full h-10 px-3 pr-8 rounded-xl border border-slate-200 bg-white font-bold text-xs text-slate-800 focus:border-[#0055fe] focus:outline-none appearance-none cursor-pointer"
                      >
                        <option value="none">None</option>
                        <option value="marks">Corner marks</option>
                        <option value="lines">Thin lines</option>
                        <option value="border">Sheet border</option>
                      </select>
                      <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center text-slate-400">
                        <svg className="w-4 h-4 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleRotateAll}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                      aria-label="Rotate all photos 90 degrees"
                    >
                      <span>↻</span>
                      <span>Rotate all 90°</span>
                    </button>
                  </div>
                </div>

                {/* 6. Desktop primary actions in panel: Download PDF, Print, Share */}
                <div className="hidden lg:flex flex-col gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleDownloadClick}
                    disabled={!plan.fits || isExporting}
                    style={{ backgroundColor: "#0055fe" }}
                    className="min-h-[48px] w-full rounded-2xl text-white text-sm font-bold shadow-lg shadow-blue-600/25 hover:brightness-105 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                    aria-label="Download PDF"
                  >
                    {isExporting ? (
                      <span>Building PDF...</span>
                    ) : (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        <span>Download PDF</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePrintClick}
                      disabled={!plan.fits || isExporting}
                      className="flex-1 min-h-[40px] rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 shadow-2xs"
                      aria-label="Print PDF"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                      <span>Print</span>
                    </button>

                    {mounted && canShare && (
                      <button
                        type="button"
                        onClick={handleShareClick}
                        disabled={!plan.fits || isExporting}
                        className="flex-1 min-h-[40px] rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 shadow-2xs"
                        aria-label="Share PDF"
                      >
                        <span>Share</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* ========================================================= */}
              {/* RIGHT COLUMN: LIVE SHEET PREVIEW (60% desktop, top mobile) */}
              {/* ========================================================= */}
              <div
                ref={sheetContainerRef}
                className="order-1 lg:order-2 w-full lg:col-span-7 xl:col-span-8 flex flex-col items-center bg-[#f1f5f9] rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-xs relative"
              >
                {/* Header bar of preview */}
                <div className="w-full flex items-center justify-between mb-3 gap-2 flex-wrap">
                  {/* Single Page Status badge: "6 photos - 1 page - A4" */}
                  <span className="text-xs font-black text-slate-800 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                    {photoIndicesPerCopy.length} photos - {pages.length} page{pages.length > 1 ? "s" : ""} - {paper}
                  </span>

                  {/* Empty-space Suggestion chip (directly above preview when > 15% empty) */}
                  {emptySpacePercentage > 15 && (
                    <button
                      type="button"
                      onClick={handleFillEmptySlots}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-950 font-bold text-xs cursor-pointer transition shadow-2xs animate-in fade-in"
                    >
                      <span>⚡ Page is {emptySpacePercentage}% empty. Fill with copies?</span>
                    </button>
                  )}

                  {/* Real size toggle */}
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs ml-auto">
                    <button
                      type="button"
                      onClick={() => setPreviewMode("fit")}
                      style={previewMode === "fit" ? { backgroundColor: "#eff6ff", color: "#0055fe" } : {}}
                      className="h-7 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      Fit preview
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode("actual")}
                      style={previewMode === "actual" ? { backgroundColor: "#eff6ff", color: "#0055fe" } : {}}
                      className="h-7 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      Real size (100%)
                    </button>
                  </div>
                </div>

                {/* THE PHYSICAL SHEET PREVIEW */}
                <div className="w-full flex items-center justify-center py-2 overflow-auto">
                  <div
                    style={{
                      aspectRatio: `${plan.pw || 210} / ${plan.ph || 297}`,
                      flexShrink: 0,
                      width:
                        previewMode === "actual"
                          ? `${plan.pw || 210}mm`
                          : `min(100%, calc((100vh - 280px) * ${(plan.pw || 210) / (plan.ph || 297)}))`,
                    }}
                    className="relative bg-white rounded-xs shadow-2xl shadow-slate-900/10 ring-1 ring-slate-900/5 select-none transition-all overflow-hidden"
                  >
                    {/* Dashed Margin Guide Line */}
                    <div
                      style={{
                        left: `${((effectiveMargin / (plan.pw || 210)) * 100).toFixed(3)}%`,
                        top: `${((effectiveMargin / (plan.ph || 297)) * 100).toFixed(3)}%`,
                        right: `${((effectiveMargin / (plan.pw || 210)) * 100).toFixed(3)}%`,
                        bottom: `${((effectiveMargin / (plan.ph || 297)) * 100).toFixed(3)}%`,
                      }}
                      className="absolute border border-dashed border-slate-300/80 pointer-events-none z-10"
                    />

                    {/* Placed Photo Cells */}
                    {pages[activePage]?.map((item, itemIdx) => {
                      const photo = photos[item.i];
                      if (!photo) return null;
                      const isSelected = selectedPhotoId === photo.id;
                      const scale = (photo.scalePercent || 100) / 100;
                      const dpi = getPhotoDpi(photo);

                      return (
                        <div
                          key={`${item.i}-${itemIdx}`}
                          id={`photo-cell-${photo.id}`}
                          data-photo-id={photo.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isSelected) {
                              setSelectedPhotoId(null);
                            } else {
                              openPopoverForPhoto(photo.id, e.currentTarget);
                            }
                          }}
                          style={{
                            left: `${((item.cx / (plan.pw || 210)) * 100).toFixed(3)}%`,
                            top: `${((item.cy / (plan.ph || 297)) * 100).toFixed(3)}%`,
                            width: `${((item.cw / (plan.pw || 210)) * 100).toFixed(3)}%`,
                            height: `${((item.ch / (plan.ph || 297)) * 100).toFixed(3)}%`,
                            ...(isSelected ? { borderColor: "#0055fe" } : {}),
                          }}
                          className={`group absolute cursor-pointer transition-shadow overflow-hidden box-border ${
                            isSelected
                              ? "border-2 ring-2 ring-blue-500/25 z-20 shadow-md"
                              : "hover:ring-1 hover:ring-blue-400 z-10"
                          }`}
                        >
                          <div className="w-full h-full flex items-center justify-center overflow-hidden">
                            <img
                              data-photo-img={photo.id}
                              src={photo.url}
                              alt=""
                              style={{
                                transform: `rotate(${photo.rotation}deg) scale(${scale})`,
                                transformOrigin: "center",
                              }}
                              className={`h-full w-full pointer-events-none ${
                                fitMode === "fill" ? "object-cover" : "object-contain"
                              }`}
                            />
                          </div>

                          {/* Low Quality / Blur warning badge under 150 DPI */}
                          {dpi < 150 && (
                            <span
                              title={
                                dpi < 100
                                  ? `Resolution is only ${dpi} DPI. Photo will look blurry in print.`
                                  : `Resolution is ${dpi} DPI. May look blurry at this size.`
                              }
                              className="absolute top-1 left-1 z-30 flex items-center gap-1 rounded bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs pointer-events-none"
                            >
                              ⚠️ {dpi < 100 ? "Low quality" : "Check sharpness"}
                            </span>
                          )}

                          {/* Cut Lines Guide if enabled */}
                          {cutGuide === "lines" && (
                            <div className="absolute inset-0 border border-slate-400/60 pointer-events-none z-10" />
                          )}
                        </div>
                      );
                    })}

                    {/* Empty Slots: Tap to add another photo */}
                    {plan.fits &&
                      plan.per > 0 &&
                      (pages[activePage]?.length || 0) < plan.per && (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute border border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/40 rounded flex flex-col items-center justify-center cursor-pointer transition z-10"
                          style={{
                            left: `${(
                              (((pages[activePage]?.length || 0) % plan.cols) * (plan.cw + gap) +
                                (effectiveMargin +
                                  Math.max(
                                    0,
                                    (plan.pw -
                                      2 * effectiveMargin -
                                      (plan.cols * plan.cw + (plan.cols - 1) * gap)) /
                                      2
                                  ))) /
                              plan.pw *
                              100
                            ).toFixed(3)}%`,
                            top: `${(
                              (Math.floor((pages[activePage]?.length || 0) / plan.cols) *
                                (plan.ch + gap) +
                                effectiveMargin) /
                              plan.ph *
                              100
                            ).toFixed(3)}%`,
                            width: `${((plan.cw / plan.pw) * 100).toFixed(3)}%`,
                            height: `${((plan.ch / plan.ph) * 100).toFixed(3)}%`,
                          }}
                          title="Click to add another photo into this slot"
                        >
                          <span className="text-xl font-bold text-slate-400 leading-none">+</span>
                          <span className="text-[10px] font-bold text-slate-500 mt-1">Add photo</span>
                        </div>
                      )}
                  </div>
                </div>

                {/* Page Navigation Toolbar (Always available to navigate and add/delete pages) */}
                <div className="flex items-center justify-between gap-1.5 sm:gap-2 mt-3 w-full max-w-xl bg-white p-2 rounded-2xl border border-slate-200/90 shadow-2xs flex-wrap sm:flex-nowrap">
                  {/* Prev Button */}
                  <button
                    type="button"
                    onClick={() => setActivePage((prev) => Math.max(0, prev - 1))}
                    disabled={activePage === 0}
                    className="h-8 px-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-200/70"
                    aria-label="Previous page"
                  >
                    <svg className="w-3.5 h-3.5 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                    <span className="hidden xs:inline">Prev</span>
                  </button>

                  {/* Page Pills */}
                  <div className="flex items-center gap-1 overflow-x-auto py-0.5 px-1 max-w-[180px] sm:max-w-xs scrollbar-none">
                    {pages.map((_, pIdx) => {
                      const isHighlighted = highlightedPage === pIdx;
                      return (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => setActivePage(pIdx)}
                          className={`h-8 min-w-[32px] px-2.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer shrink-0 tabular-nums ${
                            isHighlighted
                              ? "bg-amber-400 text-slate-900 ring-2 ring-amber-300 scale-105 shadow-md"
                              : activePage === pIdx
                              ? "bg-[#0055fe] text-white shadow-2xs"
                              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/70"
                          }`}
                        >
                          {pIdx + 1}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                    {/* Next Button */}
                    <button
                      type="button"
                      onClick={() => setActivePage((prev) => Math.min(pages.length - 1, prev + 1))}
                      disabled={activePage >= pages.length - 1}
                      className="h-8 px-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-200/70"
                      aria-label="Next page"
                    >
                      <span className="hidden xs:inline">Next</span>
                      <svg className="w-3.5 h-3.5 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>

                    {/* + Add Page Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setExtraBlankPages((prev) => prev + 1);
                        setActivePage(pages.length);
                        showToast("New page added");
                      }}
                      className="h-8 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-[#0055fe] border border-blue-200 shadow-2xs shrink-0"
                      title="Add a new page"
                    >
                      <span className="text-sm font-bold leading-none">+</span>
                      <span>Add page</span>
                    </button>

                    {/* Delete Page Button (available on added pages, never on the first page) */}
                    {pages.length > 1 && activePage > 0 && (
                      <button
                        type="button"
                        onClick={handleDeleteActivePage}
                        className="h-8 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 shadow-2xs shrink-0"
                        title={`Delete page ${activePage + 1}`}
                        aria-label="Delete active page"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        <span>Delete page</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* ========================================================= */}
                {/* COMPACT PHOTO POPOVER (~280px wide, non-modal, no freeze) */}
                {/* ========================================================= */}
                {selectedPhoto && (
                  <div
                    ref={popoverRef}
                    style={
                      typeof window !== "undefined" && window.innerWidth >= 640 && popoverCoords
                        ? {
                            position: "absolute",
                            top: `${popoverCoords.top + dragOffset.y}px`,
                            left: `${popoverCoords.left + dragOffset.x}px`,
                            width: "280px",
                          }
                        : {}
                    }
                    className={`${
                      typeof window !== "undefined" && window.innerWidth < 640
                        ? "fixed bottom-[68px] left-0 right-0 max-h-[40vh] bg-white rounded-t-3xl shadow-2xl z-40 border-t border-slate-200 p-4 overflow-y-auto"
                        : "z-40 rounded-2xl bg-white/98 backdrop-blur-md p-3.5 shadow-2xl border border-slate-200 space-y-3"
                    }`}
                  >
                    {/* Header: Draggable on desktop with Prev/Next buttons */}
                    <div
                      onPointerDown={handlePointerDownHeader}
                      onPointerMove={handlePointerMoveHeader}
                      onPointerUp={handlePointerUpHeader}
                      className="flex items-center justify-between pb-2 border-b border-slate-100 cursor-move select-none"
                    >
                      <div className="flex items-center gap-1.5">
                        {/* Prev / Next photo buttons */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const prevIdx = (selectedPhotoIndex - 1 + photos.length) % photos.length;
                            const prevId = photos[prevIdx]?.id;
                            if (prevId) {
                              const cellEl = document.getElementById(`photo-cell-${prevId}`);
                              openPopoverForPhoto(prevId, cellEl);
                            }
                          }}
                          className="h-6 w-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center cursor-pointer"
                          title="Previous photo"
                          aria-label="Previous photo"
                        >
                          ◀
                        </button>
                        <span className="text-xs font-bold text-slate-900">
                          #{selectedPhotoIndex + 1} of {photos.length}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const nextIdx = (selectedPhotoIndex + 1) % photos.length;
                            const nextId = photos[nextIdx]?.id;
                            if (nextId) {
                              const cellEl = document.getElementById(`photo-cell-${nextId}`);
                              openPopoverForPhoto(nextId, cellEl);
                            }
                          }}
                          className="h-6 w-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center cursor-pointer"
                          title="Next photo"
                          aria-label="Next photo"
                        >
                          ▶
                        </button>
                      </div>

                      {/* Close button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPhotoId(null);
                        }}
                        className="h-6 w-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer"
                        title="Close (Esc)"
                        aria-label="Close popover"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Scale Slider (Throttled with requestAnimationFrame) */}
                    <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>Scale</span>
                        <span className="text-blue-700 tabular-nums">{liveSliderScale}%</span>
                      </div>
                      <input
                        type="range"
                        min="25"
                        max="250"
                        value={liveSliderScale}
                        onChange={(e) => handleSliderChange(+e.target.value)}
                        onPointerUp={(e) => handleSliderCommit(+e.currentTarget.value)}
                        onTouchEnd={(e) => handleSliderCommit(+e.currentTarget.value)}
                        className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0055fe]"
                      />
                    </div>

                    {/* Copies Stepper of this Photo */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Copies</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSetPhotoCopies(selectedPhotoIndex, (selectedPhoto.copies || 1) - 1)}
                          disabled={(selectedPhoto.copies || 1) <= 1}
                          className="h-8 w-8 rounded-lg border border-slate-200 bg-white font-bold text-slate-800 flex items-center justify-center disabled:opacity-40 cursor-pointer shadow-2xs"
                          aria-label="Decrease copies of photo"
                        >
                          −
                        </button>
                        <span className="font-bold text-sm min-w-5 text-center text-slate-900">
                          {selectedPhoto.copies || 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSetPhotoCopies(selectedPhotoIndex, (selectedPhoto.copies || 1) + 1)}
                          className="h-8 w-8 rounded-lg border border-slate-200 bg-white font-bold text-slate-800 flex items-center justify-center cursor-pointer shadow-2xs"
                          aria-label="Increase copies of photo"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Fit to Page & Undo Buttons side-by-side */}
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <button
                        type="button"
                        data-keep-popover="true"
                        onClick={(e) => {
                          e.stopPropagation();
                          pushHistory();
                          const fullPageChip = PRESET_CHIPS.find((c) => c.isFullPage);
                          if (fullPageChip) {
                            setFitType("custom");
                            setExactSize(true);
                            handleApplyPresetChip(fullPageChip);
                          }
                          showToast("Fit photo to full page!");
                        }}
                        className="h-8 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-xs font-bold text-[#0055fe] flex items-center justify-center gap-1 cursor-pointer transition shadow-2xs"
                        title="Fit to entire page"
                        aria-label="Fit to full page"
                      >
                        <span>⚡ Fit Full Page</span>
                      </button>
                      <button
                        type="button"
                        data-keep-popover="true"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUndo();
                        }}
                        disabled={historyLength === 0}
                        className="h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-35 disabled:cursor-not-allowed text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer transition shadow-2xs"
                        title="Undo last change"
                        aria-label="Undo"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 7v6h6" />
                          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                        </svg>
                        <span>Undo</span>
                      </button>
                    </div>

                    {/* Action Icon Buttons: Rotate, Replace, Delete */}
                    <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleRotatePhoto(selectedPhotoIndex)}
                        className="h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 flex items-center justify-center gap-1 cursor-pointer transition shadow-2xs"
                        title="Rotate photo 90°"
                        aria-label="Rotate photo 90°"
                      >
                        <span>↻</span>
                        <span>Rotate</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => replaceInputRef.current?.click()}
                        className="h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 flex items-center justify-center gap-1 cursor-pointer transition shadow-2xs"
                        title="Replace photo file"
                        aria-label="Replace photo"
                      >
                        <span>⇄</span>
                        <span>Replace</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(selectedPhotoIndex)}
                        className="h-9 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-[11px] font-bold text-rose-600 flex items-center justify-center gap-1 cursor-pointer transition shadow-2xs"
                        title="Delete photo"
                        aria-label="Delete photo"
                      >
                        <span>🗑</span>
                        <span>Delete</span>
                      </button>
                    </div>

                    {/* Move order buttons */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] text-slate-500 font-bold">
                      <span>Order on sheet:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={selectedPhotoIndex === 0}
                          onClick={() => handleMovePhoto(selectedPhotoIndex, "prev")}
                          className="h-6 px-2 rounded border border-slate-200 bg-white text-slate-700 disabled:opacity-30 cursor-pointer"
                        >
                          Move ◀
                        </button>
                        <button
                          type="button"
                          disabled={selectedPhotoIndex === photos.length - 1}
                          onClick={() => handleMovePhoto(selectedPhotoIndex, "next")}
                          className="h-6 px-2 rounded border border-slate-200 bg-white text-slate-700 disabled:opacity-30 cursor-pointer"
                        >
                          Move ▶
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
            </>
          )}

          {/* ID CARD MODE */}
          {toolMode === "id" && (
            <>
              {/* DESKTOP TWO-COLUMN LAYOUT (>= 1024px) */}
              <div className="hidden lg:grid lg:grid-cols-12 gap-5 items-stretch">
                {/* LEFT COLUMN: ID CARD PANEL */}
                <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm h-full flex flex-col">
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

                {/* RIGHT COLUMN: ID SHEET PREVIEW */}
                <div className="lg:col-span-7 xl:col-span-8">
                  {renderIdSheetPreview(false)}
                </div>
              </div>

              {/* MOBILE LAYOUT (< 1024px) */}
              <div className="block lg:hidden space-y-3">
                {/* 1. FRONT & BACK UPLOAD CONTROLS (ALWAYS NEAR TOP) */}
                <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-sm">
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
                    viewMode="slots-only"
                  />
                </div>

                {/* 2. SEGMENTED TAB SWITCHER (PREVIEW vs EDIT/SETTINGS) */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/90 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setMobileTab("preview")}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      mobileTab === "preview"
                        ? "bg-white text-[#0055fe] shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    <span>Print Preview</span>
                    {totalFilledCards > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileTab("settings")}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      mobileTab === "settings"
                        ? "bg-white text-[#0055fe] shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                    <span>Print Settings</span>
                  </button>
                </div>

                {/* 3. MOBILE VIEW: PREVIEW TAB */}
                {mobileTab === "preview" && (
                  <div className="space-y-3">
                    {/* Quick Layout Switcher on mobile (instant 1-tap stacked vs side-by-side) */}
                    {totalFilledCards > 0 && (
                      <div className="flex items-center justify-between gap-1 bg-white p-2 sm:p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                        <span className="text-[11px] font-bold text-slate-700 ml-1">Card Layout:</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setIdLayout("stacked")}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                              idLayout === "stacked" ? "bg-[#0055fe] text-white shadow-2xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                          >
                            Stacked
                          </button>
                          <button
                            type="button"
                            onClick={() => setIdLayout("side_by_side")}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                              idLayout === "side_by_side" ? "bg-[#0055fe] text-white shadow-2xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                          >
                            Side by side
                          </button>
                          <button
                            type="button"
                            onClick={() => setIdLayout("two_pages")}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                              idLayout === "two_pages" ? "bg-[#0055fe] text-white shadow-2xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                          >
                            2 Pages
                          </button>
                        </div>
                      </div>
                    )}

                    {/* The Print Preview Container */}
                    {renderIdSheetPreview(true)}

                    {/* Action button to switch to settings */}
                    <button
                      type="button"
                      onClick={() => setMobileTab("settings")}
                      className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                      <span>Adjust Size, Placement & Watermark</span>
                      <span>→</span>
                    </button>
                  </div>
                )}

                {/* 4. MOBILE VIEW: SETTINGS TAB */}
                {mobileTab === "settings" && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
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
                      viewMode="settings-only"
                    />

                    <button
                      type="button"
                      onClick={() => setMobileTab("preview")}
                      className="w-full h-11 rounded-xl bg-[#0055fe] hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition cursor-pointer"
                    >
                      <span>← Back to Print Preview</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        {/* STICKY BOTTOM BAR FOR 1-TAP DOWNLOAD & PRINT */}
        {toolMode !== "landing" && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3.5 sm:px-6 pt-2.5 sm:pt-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-lg">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
              {/* Explanatory text when disabled */}
              {totalFilledCards === 0 ? (
                <div className="text-[11px] sm:text-xs text-slate-500 font-medium flex items-center gap-1.5 self-start sm:self-center">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
                  <span>Add front of ID card to enable download and print</span>
                </div>
              ) : (
                <div className="hidden sm:block text-xs text-slate-500">
                  {totalFilledCards} card{totalFilledCards === 1 ? "" : "s"} ready for physical print
                </div>
              )}

              <div className="w-full sm:w-auto flex items-center justify-end gap-2.5 ml-auto">
                {mounted && canShare && (
                  <button
                    type="button"
                    onClick={handleShareIdClick}
                    disabled={!totalFilledCards || isExporting}
                    className="min-h-[44px] min-w-[44px] px-3.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
                  className="min-h-[44px] px-4 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  title={
                    totalFilledCards === 0
                      ? "Add front of ID card to enable printing"
                      : "Print PDF"
                  }
                  aria-label="Print PDF"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  <span>Print</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadIdClick}
                  disabled={!totalFilledCards || isExporting}
                  style={{
                    backgroundColor:
                      totalFilledCards > 0 && !isExporting
                        ? "#0055fe"
                        : "#94a3b8",
                  }}
                  className="min-h-[48px] flex-1 sm:flex-initial px-6 sm:px-8 rounded-xl text-white text-sm sm:text-base font-bold shadow-lg shadow-blue-600/25 hover:brightness-105 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
                  aria-label="Download PDF"
                  title={
                    totalFilledCards === 0
                      ? "Add front of ID card to enable download"
                      : "Download PDF"
                  }
                >
                  {isExporting ? (
                    <span>Building PDF...</span>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      <span>Download PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CRAWLABLE SEO & KNOWLEDGE BASE CONTENT */}
      {/* CRAWLABLE SEO & KNOWLEDGE BASE CONTENT (100% ID PRINT FOCUSED) */}
      <section className="border-t border-slate-200/80 bg-white/70 backdrop-blur-sm px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-16 text-slate-700 leading-relaxed">
          {/* Main ID Print Maker Heading */}
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Copy, Align, and Print Both Sides of Your ID Card on One Sheet
            </h2>
            <p className="text-base text-slate-500 max-w-2xl mx-auto font-normal">
              Create official, print-ready photocopies of your identity card, driver&apos;s license, badge, or membership card at 100% real-world physical scale (85.6 × 54 mm). Completely free, private, and runs locally in your browser.
            </p>
          </div>

          {/* 3 Step ID Copy Workflow */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-bold text-xs mb-3">
                1
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                Capture or Upload Front &amp; Back
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Take photos with your phone camera or upload existing images. The intelligent corner scanner detects card edges, aligns perspective, and removes background clutter.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-bold text-xs mb-3">
                2
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                Choose Layout &amp; Print Scale
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Choose Stacked (top and bottom), Side-by-Side, or 2-Page Duplex layout. Cards are positioned at exact 1:1 real-world size (85.6 × 54 mm) with optional 125% and 150% enlarged sizes.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-bold text-xs mb-3">
                3
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                Print or Download PDF
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Download a sharp, vector-rendered A4 or Letter PDF with optional cut lines and anti-fraud security watermark, ready for immediate 100% scale printing.
              </p>
            </div>
          </div>

          {/* Standard ID Formats Table */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Standard ID Card Formats &amp; Dimensions
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Most government and corporate identity cards follow the international ISO/IEC 7810 ID-1 standard measuring 85.6 × 54 mm. Spellense preserves these exact real-world dimensions:
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-xs">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50/80 text-slate-600 text-[11px] font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Card Format</th>
                    <th className="px-5 py-3.5">Physical Dimensions</th>
                    <th className="px-5 py-3.5">Print Scale</th>
                    <th className="px-5 py-3.5">Common Examples</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-xs">
                  {ID_CARD_FORMATS_DATA.map((row) => (
                    <tr key={row.name} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3.5 font-semibold text-slate-900">
                        {row.name}
                      </td>
                      <td className="px-5 py-3.5 tabular-nums text-slate-600">
                        {row.dim}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-blue-600">
                        {row.scale}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {row.use}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Privacy & Anti-Fraud Features */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <div className="inline-block rounded-md bg-blue-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-blue-600">
                SECURITY &amp; PRIVACY
              </div>
              <h2 className="mt-3 text-xl sm:text-2xl font-bold text-slate-900">
                Why Use Spellense ID Print Maker?
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">
                Photocopying identity cards on public office copiers or sending photos to untrusted online servers creates significant privacy risks. Spellense runs completely in your web browser with built-in fraud prevention tools.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 text-xs">✓</span>
                  100% In-Browser Privacy
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Your ID card images never leave your computer or phone. All corner detection, image filtering, and PDF generation happen 100% locally using client-side WebAssembly and Canvas APIs. EXIF and GPS tags are purged on load.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-blue-700 text-xs">🛡</span>
                  Anti-Fraud Security Watermark
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Protect yourself against identity misuse by overlaying a diagonal semi-transparent watermark (such as &quot;FOR VERIFICATION ONLY&quot; or your custom text) directly across your printed cards.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-100 text-purple-700 text-xs">📐</span>
                  Guaranteed 1:1 Physical Scale
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Standard photo printers and scanners often distort proportions. Spellense strictly locks the ISO ID-1 physical scale (85.6 × 54 mm) so your printed copy matches your real card down to the millimeter.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-700 text-xs">✂</span>
                  Precision Cut Marks &amp; Multi-Card
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Print optional cutting lines or corner marks for effortless trimming with scissors or a paper cutter. Need copies for multiple family members or staff? Add up to 5 cards onto the same sheet in one click.
                </p>
              </div>
            </div>
          </div>

          {/* Print Scale Guide (Amber Warning Box) */}
          <div className="rounded-2xl border border-amber-200 bg-[#fffbeb] p-5 sm:p-6 flex items-start gap-3.5 shadow-2xs">
            <svg className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-amber-950">
                How to print at 100% Actual Size (Stop &quot;Fit to Page&quot;)
              </h3>
              <p className="text-xs sm:text-sm text-amber-900/90 mt-1 leading-relaxed">
                When printing your PDF from Adobe Acrobat, Apple Preview, or Google Chrome, ensure your printer dialog is set to <strong>&quot;Actual Size&quot;</strong> or <strong>&quot;100% Scale&quot;</strong>. If your printer defaults to &quot;Fit to Page&quot; or &quot;Shrink Oversized Pages&quot;, it will scale down your ID card by 3% to 7%, throwing off official visa, banking, and government requirements.
              </p>
            </div>
          </div>

          {/* FAQ 2-Column Section */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start pt-4">
            {/* Left 4 Columns */}
            <div className="md:col-span-4 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block">
                FREQUENTLY ASKED QUESTIONS
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                ID Print Maker FAQ
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Everything you need to know about copying, aligning, and printing your ID cards at exact physical dimensions.
              </p>
            </div>

            {/* Right 8 Columns */}
            <div className="md:col-span-8 space-y-3">
              {FAQ_LIST.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={faq.q}
                    className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs transition"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      className="flex w-full items-center justify-between p-4 sm:p-5 text-left transition hover:bg-slate-50/60 cursor-pointer"
                    >
                      <span className="text-sm font-bold text-slate-900 pr-2">
                        {faq.q}
                      </span>
                      <span
                        className={`ml-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-slate-400 transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-blue-600" : ""
                        }`}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </span>
                    </button>

                    <div
                      className={`grid transition-[grid-template-rows,opacity] duration-200 ease-in-out ${
                        isOpen
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0 pointer-events-none"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="border-t border-slate-100 px-4 sm:px-5 pt-3 pb-4 text-xs sm:text-sm leading-relaxed text-slate-600 font-normal">
                          {faq.a}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Related Tools */}
          <div className="pt-8 border-t border-slate-200/80 space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              More Free Online Tools by Spellense
            </h2>
            <div className="flex flex-wrap gap-2.5">
              <Link
                href="/image-compressor"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 flex items-center gap-1.5 transition shadow-2xs"
              >
                <span>Image Compressor</span>
                <span className="text-xs text-slate-400">↗</span>
              </Link>
              <Link
                href="/image-to-text"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 flex items-center gap-1.5 transition shadow-2xs"
              >
                <span>Image to Text OCR</span>
                <span className="text-xs text-slate-400">↗</span>
              </Link>
              <Link
                href="/qr-code-generator"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 flex items-center gap-1.5 transition shadow-2xs"
              >
                <span>QR Code Generator</span>
                <span className="text-xs text-slate-400">↗</span>
              </Link>
              <Link
                href="/flipbook"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 flex items-center gap-1.5 transition shadow-2xs"
              >
                <span>3D Flipbook Viewer</span>
                <span className="text-xs text-slate-400">↗</span>
              </Link>
              <Link
                href="/case-converter"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 flex items-center gap-1.5 transition shadow-2xs"
              >
                <span>Case Converter</span>
                <span className="text-xs text-slate-400">↗</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* GLOBAL FOOTER */}
      <Footer currentPath="/print-sheet-maker" />
    </div>
  );
}
