export type OverlayType = "whiteout" | "text" | "signature" | "stamp" | "redact";

export interface OverlayItem {
  id: string;
  type: OverlayType;
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  width: number; // percentage 0 - 100
  height: number; // percentage 0 - 100
  rot?: number; // 0, 90, 180, 270 (F4: rotation relative to page)
  text?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: "normal" | "italic"; // Batch 2A
  fontFamily?: string;
  color?: string;
  bgColor?: string;
  redactStyle?: "blackout" | "blur" | "whiteout";
  stampText?: string;
  imageData?: string; // base64 PNG data URL
}

export const STAMP_COLORS: Record<string, string> = {
  PAID: "#059669",
  APPROVED: "#2563eb",
  CONFIDENTIAL: "#dc2626",
  DRAFT: "#d97706",
  VOID: "#4b5563",
};

export interface StudioPage {
  id: string;
  url: string;
  thumbUrl?: string; // Stage 3: small ~320px JPEG data URL for fast thumbnails
  width: number;
  height: number;
  rotation: number; // user rotation: 0, 90, 180, 270
  overlays: OverlayItem[];
  kind: "pdf" | "image";
  ptWidth: number; // page width in PDF points
  ptHeight: number; // page height in PDF points
  sourceId?: string; // key in sourcePdfBytesRef
  sourcePageNumber?: number; // 1-based page number in original PDF
  originalImageData?: string;
  imageType?: string;
}

export type StudioMode = "pages" | "edit" | "redact";
export type EditTool = "select" | "whiteout" | "text" | "sign" | "stamp";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

