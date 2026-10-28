import React, { useRef, useEffect, useState } from "react";
import { StudioPage, OverlayItem } from "../types";

// Global cache for rendered thumbnail data URLs so switching back and forth is instant
const thumbCache = new Map<string, string>();

interface PageThumbProps {
  page: StudioPage;
  pageNumber: number;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
  drawOverlaysFn: (
    ctx: CanvasRenderingContext2D,
    overlays: OverlayItem[],
    targetW: number,
    targetH: number,
    scaleFactor: number
  ) => void;
  badgeStyle?: "editsCount" | "dot";
}

export default function PageThumb({
  page,
  pageNumber,
  isActive = false,
  onClick,
  className = "",
  drawOverlaysFn,
  badgeStyle = "editsCount",
}: PageThumbProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [renderedUrl, setRenderedUrl] = useState<string | null>(null);

  // Include every field that affects rendered pixels, so previews refresh after edits.
  const overlaySig = JSON.stringify(
    page.overlays.map(({ id, type, x, y, width, height, rot, text, fontSize, fontWeight, fontStyle, fontFamily, color, bgColor, redactStyle, imageData }) => ({
      id, type, x, y, width, height, rot, text, fontSize, fontWeight, fontStyle, fontFamily, color, bgColor, redactStyle, hasImage: Boolean(imageData),
    }))
  );

  const cacheKey = `${page.id}_${page.rotation}_${overlaySig}`;

  // IntersectionObserver: only render when visible in viewport / filmstrip
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { rootMargin: "150px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Debounced thumbnail rendering
  useEffect(() => {
    if (!isVisible) return;

    // Check cache first
    const cached = thumbCache.get(cacheKey);
    if (cached) {
      const timer = setTimeout(() => setRenderedUrl(cached), 0);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      const img = new Image();
      img.onload = () => {
        const isRot = page.rotation === 90 || page.rotation === 270;
        const baseW = img.naturalWidth || img.width || 320;
        const baseH = img.naturalHeight || img.height || 420;

        const canvasW = isRot ? baseH : baseW;
        const canvasH = isRot ? baseW : baseH;

        const offCanvas = document.createElement("canvas");
        offCanvas.width = canvasW;
        offCanvas.height = canvasH;
        const ctx = offCanvas.getContext("2d");
        if (!ctx) return;

        // Draw rotated base image
        ctx.save();
        ctx.translate(canvasW / 2, canvasH / 2);
        ctx.rotate((page.rotation * Math.PI) / 180);
        ctx.drawImage(img, -baseW / 2, -baseH / 2, baseW, baseH);
        ctx.restore();

        // Preview canvas width of this page in rotated orientation
        const previewW = isRot ? page.height : page.width;
        const scaleFactor = previewW > 0 ? canvasW / previewW : 1;

        // Draw overlays on top
        if (page.overlays.length > 0) {
          drawOverlaysFn(ctx, page.overlays, canvasW, canvasH, scaleFactor);
        }

        const dataUrl = offCanvas.toDataURL("image/jpeg", 0.75);
        offCanvas.width = 0;
        offCanvas.height = 0;

        thumbCache.set(cacheKey, dataUrl);
        setRenderedUrl(dataUrl);
      };

      img.src = page.thumbUrl || page.url;
    }, 250);

    return () => clearTimeout(timer);
  }, [isVisible, cacheKey, page, overlaySig, drawOverlaysFn]);

  const hasEdits = page.overlays.length > 0;
  const isRot = page.rotation === 90 || page.rotation === 270;
  const aspectRatio = isRot ? `${page.height}/${page.width}` : `${page.width}/${page.height}`;

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      onKeyDown={(event) => {
        if (onClick && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onClick();
        }
      }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{
        aspectRatio,
        borderColor: isActive ? "#3158d5" : "rgba(0,0,0,0.08)",
      }}
      className={`group relative w-full overflow-hidden rounded-xl border bg-white shadow-2xs transition cursor-pointer select-none ${
        isActive
          ? "border-[#3158d5] ring-2 ring-[#3158d5]/40 shadow-sm"
          : "border-black/[0.08] hover:border-[#3158d5] hover:shadow-xs"
      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3158d5] focus-visible:ring-offset-1 ${className}`}
    >
      {/* Thumbnail image or placeholder */}
      {renderedUrl ? (
        <img
          src={renderedUrl}
          alt={`Page ${pageNumber}`}
          className="h-full w-full object-contain pointer-events-none"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[#faf9f6] text-[11px] text-[#8c8f87] font-medium">
          p. {pageNumber}
        </div>
      )}

      {/* Page number badge */}
      <span className="absolute top-1.5 left-1.5 rounded-md bg-[#3158d5] px-1.5 py-0.5 text-[10px] sm:text-xs font-bold text-white shadow-xs">
        {pageNumber}
      </span>

      {/* Edits badge */}
      {hasEdits && (
        badgeStyle === "editsCount" ? (
          <span className="absolute bottom-1.5 right-1.5 rounded-md bg-blue-600 px-1.5 py-0.5 text-[10px] sm:text-xs font-bold text-white shadow-xs">
            {page.overlays.length} {page.overlays.length === 1 ? "edit" : "edits"}
          </span>
        ) : (
          <span
            title={`${page.overlays.length} edits`}
            className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-white shadow-xs"
          />
        )
      )}
    </div>
  );
}

