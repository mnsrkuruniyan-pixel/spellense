"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

type SpellError = {
  word: string;
  suggestion: string | null;
  index: number;
  page?: number;
};

type CheckResult = {
  success: boolean;
  filename?: string;
  text?: string;
  errors?: SpellError[];
  wordCount?: number;
  errorCount?: number;
  pdfHasTextLayer?: boolean;
  pdfMarks?: PdfMark[];
  imageMarks?: ImageMark[];
  message?: string;
  error?: string;
};

type PdfMark = {
  word: string;
  page: number;
  left: number;
  top: number;
  width: number;
  height: number;
};

type ImageMark = {
  word: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

function renderMarkedText(
  text: string,
  errors: SpellError[]
): ReactNode[] {
  const parts: ReactNode[] = [];
  let cursor = 0;

  for (const [index, error] of errors.entries()) {
    const start = Math.max(cursor, error.index);
    const end = Math.min(
      text.length,
      start + error.word.length
    );

    if (start >= text.length || end <= start) {
      continue;
    }

    if (start > cursor) {
      parts.push(text.slice(cursor, start));
    }

    parts.push(
      <mark
        key={`${error.word}-${index}`}
        className="rounded border border-red-500 bg-transparent px-1 text-red-600 underline decoration-red-500 decoration-2 underline-offset-4"
        title={error.suggestion ? `Suggestion: ${error.suggestion}` : "Possible spelling mistake"}
      >
        {text.slice(start, end)}
      </mark>
    );

    cursor = end;
  }

  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }

  return parts;
}

function PdfMarkedPreview({
  file,
  errors,
  selectedPage,
  onPageChange,
  markErrors,
  pdfMarks,
}: {
  file: File;
  errors: SpellError[];
  selectedPage: number;
  onPageChange: (page: number) => void;
  markErrors: boolean;
  pdfMarks: PdfMark[];
}) {
  const [pageCount, setPageCount] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [panning, setPanning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const layerRef = useRef<HTMLDivElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const pdfDocRef = useRef<unknown>(null);
  const loadingTaskRef = useRef<unknown>(null);
  const panStartRef = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);

  // Load PDF document once per file
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        if (loadingTaskRef.current) {
          try {
            await (loadingTaskRef.current as { destroy: () => Promise<void> }).destroy();
          } catch {}
        }

        const arrayBuffer = await file.arrayBuffer();
        if (cancelled) return;

        const loadingTask = pdfjs.getDocument({
          data: new Uint8Array(arrayBuffer),
        });
        loadingTaskRef.current = loadingTask;
        const pdf = await loadingTask.promise;

        if (!cancelled) {
          pdfDocRef.current = pdf;
          setPageCount(pdf.numPages);
        }
      } catch (err) {
        console.error("Failed to load PDF preview:", err);
      }
    })();

    return () => {
      cancelled = true;
      if (loadingTaskRef.current) {
        try {
          (loadingTaskRef.current as { destroy: () => Promise<void> }).destroy().catch(() => {});
        } catch {}
      }
      pdfDocRef.current = null;
    };
  }, [file]);

  // Render current page
  useEffect(() => {
    const pdf = pdfDocRef.current as {
      getPage: (num: number) => Promise<{
        getViewport: (options: { scale: number }) => {
          width: number;
          height: number;
          transform: number[];
        };
        render: (options: {
          canvas: HTMLCanvasElement;
          canvasContext: CanvasRenderingContext2D;
          viewport: unknown;
        }) => { promise: Promise<void> };
        getTextContent: () => Promise<{
          items: Array<{
            str?: string;
            transform: number[];
            width: number;
          }>;
        }>;
        cleanup: () => void;
      }>;
    } | null;

    if (!pdf || !pageCount) return;
    let cancelled = false;

    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        if (cancelled || !canvasRef.current || !layerRef.current) return;

        const page = await pdf.getPage(selectedPage);
        if (cancelled) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const availableWidth = Math.max(
          (previewRef.current?.clientWidth ?? 680) - 32,
          280
        );
        const containerH = previewRef.current?.clientHeight ?? 480;
        const availableHeight = Math.max(containerH - 16, 280);
        const fitScale = Math.min(
          availableWidth / baseViewport.width,
          availableHeight / baseViewport.height
        );
        const scale = fitScale * zoom;
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const layer = layerRef.current;

        if (!canvas || !layer) {
          page.cleanup();
          return;
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        layer.style.width = `${viewport.width}px`;
        layer.style.height = `${viewport.height}px`;

        await page.render({
          canvas,
          canvasContext: canvas.getContext("2d")!,
          viewport,
        }).promise;

        if (cancelled) {
          page.cleanup();
          return;
        }

        const content = await page.getTextContent();
        layer.replaceChildren();

        for (const item of content.items) {
          if (!("str" in item) || !item.str) continue;

          const transform = pdfjs.Util.transform(
            viewport.transform,
            item.transform
          );
          const fontSize = Math.max(
            8,
            Math.hypot(transform[2], transform[3])
          );
          const span = document.createElement("span");

          span.style.left = `${transform[4]}px`;
          span.style.top = `${transform[5] - fontSize}px`;
          span.style.fontSize = `${fontSize}px`;
          span.style.width = `${Math.max(item.width * scale, 2)}px`;
          span.style.height = `${fontSize * 1.2}px`;
          span.className = "absolute overflow-visible whitespace-nowrap text-transparent";

          let tokenOffset = 0;

          for (const token of item.str.split(/(\s+)/)) {
            const normalizedToken = token
              .toLowerCase()
              .replace(/^[^a-z]+|[^a-z]+$/g, "");
            const matchingError = markErrors
              ? errors.find((error) =>
                  normalizedToken === error.word.toLowerCase()
                )
              : undefined;
            const tokenSpan = document.createElement("span");

            if (matchingError) {
              const itemWidth = Math.max(item.width * scale, 2);

              tokenSpan.style.position = "absolute";
              tokenSpan.style.left = `${
                (tokenOffset / item.str.length) * itemWidth
              }px`;
              tokenSpan.style.top = "0px";
              tokenSpan.style.width = `${Math.max(
                (token.length / item.str.length) * itemWidth,
                4
              )}px`;
              tokenSpan.style.height = `${fontSize * 1.2}px`;
              tokenSpan.className =
                "rounded border-2 border-red-500 bg-red-500/15 shadow-xs ring-1 ring-red-500/40 pointer-events-auto";
              tokenSpan.title = matchingError.suggestion
                ? `Suggestion: ${matchingError.suggestion}`
                : "Possible spelling mistake";
              span.appendChild(tokenSpan);
            }

            tokenOffset += token.length;
          }

          layer.appendChild(span);
        }

        if (!markErrors || pdfMarks.length > 0) {
          for (const mark of pdfMarks.filter(
            (item) => item.page === selectedPage
          )) {
            const outline = document.createElement("span");
            outline.style.position = "absolute";
            outline.style.left = `${mark.left * viewport.width}px`;
            outline.style.top = `${mark.top * viewport.height}px`;
            outline.style.width = `${mark.width * viewport.width}px`;
            outline.style.height = `${mark.height * viewport.height}px`;
            outline.className =
              "rounded border-2 border-red-500 bg-red-500/15 shadow-xs ring-1 ring-red-500/40 pointer-events-auto";
            outline.title = `Possible spelling mistake: ${mark.word}`;
            layer.appendChild(outline);
          }
        }

        page.cleanup();
      } catch (err) {
        if (!cancelled) {
          console.error("Error rendering PDF page:", err);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [errors, markErrors, pageCount, pdfMarks, selectedPage, zoom]);

  if (!pageCount) {
    return (
      <div className="flex h-[360px] sm:h-[480px] lg:h-[588px] items-center justify-center text-sm text-slate-400">
        Loading PDF preview...
      </div>
    );
  }

  return (
    <div className="bg-slate-200 p-4">
      <div
        ref={previewRef}
        className={`flex h-[360px] sm:h-[480px] lg:h-[588px] items-center justify-center overflow-auto ${
          zoom > 1 ? (panning ? "cursor-grabbing touch-none" : "cursor-grab touch-none") : "touch-pan-y"
        }`}
        onPointerDown={(event) => {
          if (zoom <= 1 || !previewRef.current) return;

          panStartRef.current = {
            x: event.clientX,
            y: event.clientY,
            left: previewRef.current.scrollLeft,
            top: previewRef.current.scrollTop,
          };
          setPanning(true);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = panStartRef.current;
          if (!start || !previewRef.current) return;

          previewRef.current.scrollLeft =
            start.left - (event.clientX - start.x);
          previewRef.current.scrollTop =
            start.top - (event.clientY - start.y);
        }}
        onPointerUp={(event) => {
          panStartRef.current = null;
          setPanning(false);
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => {
          panStartRef.current = null;
          setPanning(false);
        }}
      >
        <div className="relative w-fit bg-white shadow-md">
          <canvas ref={canvasRef} />
          <div
            ref={layerRef}
            className="pointer-events-none absolute left-0 top-0"
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-500">
        <button
          type="button"
          disabled={selectedPage === 1}
          onClick={() => onPageChange(selectedPage - 1)}
          className="rounded-lg px-3 py-2 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
        >
          Previous
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Zoom out"
            disabled={zoom <= 0.75}
            onClick={() => setZoom((value) => Math.max(0.75, value - 0.25))}
            className="rounded-lg px-2 py-1 text-base leading-none transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="min-w-12 rounded-lg px-2 py-1 text-[11px] transition hover:bg-slate-100"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            aria-label="Zoom in"
            disabled={zoom >= 2}
            onClick={() => setZoom((value) => Math.min(2, value + 0.25))}
            className="rounded-lg px-2 py-1 text-base leading-none transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
          >
            +
          </button>
        </div>
        <span>Page {selectedPage} of {pageCount}</span>
        <button
          type="button"
          disabled={selectedPage === pageCount}
          onClick={() => onPageChange(selectedPage + 1)}
          className="rounded-lg px-3 py-2 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function DocxPreview({
  file,
  errors,
}: {
  file: File;
  errors: SpellError[];
}) {
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [panning, setPanning] = useState(false);
  const panStartRef = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { renderAsync } = await import("docx-preview");
      const container = containerRef.current;
      if (!container) return;

      container.replaceChildren();
      await renderAsync(
        await file.arrayBuffer(),
        container,
        undefined,
        { breakPages: true }
      );

      const textNodes = Array.from(
        container.querySelectorAll("section p, section span")
      );
      for (const node of textNodes) {
        if (!node.textContent) continue;
        const text = node.textContent;
        const fragment = document.createDocumentFragment();
        let cursor = 0;
        const matches = errors
          .map((error) => ({
            word: error.word,
            start: text.toLowerCase().indexOf(error.word.toLowerCase()),
          }))
          .filter((match) => match.start >= 0)
          .sort((a, b) => a.start - b.start);

        for (const match of matches) {
          if (match.start < cursor) continue;
          fragment.append(text.slice(cursor, match.start));
          const mark = document.createElement("span");
          mark.textContent = text.slice(
            match.start,
            match.start + match.word.length
          );
          mark.className =
            "rounded border border-red-500 bg-transparent text-red-600";
          mark.title = "Possible spelling mistake";
          fragment.append(mark);
          cursor = match.start + match.word.length;
        }

        if (cursor > 0) {
          fragment.append(text.slice(cursor));
          node.replaceChildren(fragment);
        }
      }

      const pages = Array.from(container.querySelectorAll("section"));
      if (!cancelled) {
        setPageCount(Math.max(pages.length, 1));
        setCurrentPage(1);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [errors, file]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !pageCount) return;

    const pages = Array.from(container.querySelectorAll("section"));
    container.style.width = `${Math.max(100, zoom * 100)}%`;
    container.style.minWidth = `${Math.max(100, zoom * 100)}%`;
    pages.forEach((page, index) => {
      page.style.display = index + 1 === currentPage ? "block" : "none";
      page.style.transform = `scale(${zoom})`;
      page.style.transformOrigin = "top left";
      page.style.marginLeft = zoom > 1 ? "0" : "auto";
      page.style.marginBottom = index + 1 === currentPage
        ? `${(zoom - 1) * 100}%`
        : "0";
    });
  }, [currentPage, pageCount, zoom]);

  return (
    <div className="bg-slate-200 p-4">
      <div
        ref={previewRef}
        className={`relative flex h-[360px] sm:h-[480px] lg:h-[588px] items-start justify-start overflow-auto ${
          zoom > 1 ? (panning ? "cursor-grabbing touch-none" : "cursor-grab touch-none") : "touch-pan-y"
        }`}
        onPointerDown={(event) => {
          if (zoom <= 1 || !previewRef.current) return;
          panStartRef.current = {
            x: event.clientX,
            y: event.clientY,
            left: previewRef.current.scrollLeft,
            top: previewRef.current.scrollTop,
          };
          setPanning(true);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = panStartRef.current;
          if (!start || !previewRef.current) return;
          previewRef.current.scrollLeft = start.left - (event.clientX - start.x);
          previewRef.current.scrollTop = start.top - (event.clientY - start.y);
        }}
        onPointerUp={(event) => {
          panStartRef.current = null;
          setPanning(false);
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => {
          panStartRef.current = null;
          setPanning(false);
        }}
      >
        <div ref={containerRef} className="docx-preview-container w-full" />
        {!pageCount && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
            Loading DOCX preview...
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-500">
        <button
          type="button"
          disabled={!pageCount || currentPage === 1}
          onClick={() => setCurrentPage((page) => page - 1)}
          className="rounded-lg px-3 py-2 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
        >
          Previous
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Zoom out"
            disabled={!pageCount || zoom <= 0.75}
            onClick={() => setZoom((value) => Math.max(0.75, value - 0.25))}
            className="rounded-lg px-2 py-1 text-base leading-none transition hover:bg-slate-100 disabled:opacity-30"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="min-w-12 rounded-lg px-2 py-1 text-[11px] hover:bg-slate-100"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            aria-label="Zoom in"
            disabled={!pageCount || zoom >= 2}
            onClick={() => setZoom((value) => Math.min(2, value + 0.25))}
            className="rounded-lg px-2 py-1 text-base leading-none transition hover:bg-slate-100 disabled:opacity-30"
          >
            +
          </button>
        </div>
        <span>{pageCount ? `Page ${currentPage} of ${pageCount}` : "Preparing pages..."}</span>
        <button
          type="button"
          disabled={!pageCount || currentPage === pageCount}
          onClick={() => setCurrentPage((page) => page + 1)}
          className="rounded-lg px-3 py-2 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function PptxPreview({
  file,
  errors,
}: {
  file: File;
  errors: SpellError[];
}) {
  const [slideCount, setSlideCount] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [panning, setPanning] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const panStartRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { init } = await import("pptx-preview");
      const container = containerRef.current;
      if (!container) return;

      container.replaceChildren();
      const previewer = init(container, {
        width: 960,
        height: 540,
        mode: "list",
      });
      await previewer.preview(await file.arrayBuffer());

      const slides = Array.from(container.children) as HTMLElement[];
      slides.forEach((slide) => {
        slide.style.position = "relative";
        const textElements = Array.from(slide.querySelectorAll("*")).filter(
          (element) => element.children.length === 0 && element.textContent
        );

        textElements.forEach((element) => {
          const text = element.textContent ?? "";
          const tokens = text.split(/(\s+)/);
          const hasMatch = tokens.some((token) => {
            const normalized = token
              .toLowerCase()
              .replace(/^[^a-z]+|[^a-z]+$/g, "");
            return errors.some(
              (error) => normalized === error.word.toLowerCase()
            );
          });

          if (!hasMatch) return;

          const fragment = document.createDocumentFragment();
          tokens.forEach((token) => {
            const normalized = token
              .toLowerCase()
              .replace(/^[^a-z]+|[^a-z]+$/g, "");
            const matchingError = errors.find(
              (error) => normalized === error.word.toLowerCase()
            );

            if (!matchingError) {
              fragment.append(token);
              return;
            }

            const mark = document.createElement("span");
            mark.textContent = token;
            mark.style.outline = "2px solid #ef4444";
            mark.style.outlineOffset = "2px";
            mark.style.borderRadius = "2px";
            mark.title = matchingError.suggestion
              ? `Suggestion: ${matchingError.suggestion}`
              : "Possible spelling mistake";
            fragment.append(mark);
          });

          element.replaceChildren(fragment);
        });
      });

      if (!cancelled) {
        setSlideCount(Math.max(slides.length, 1));
        setCurrentSlide(1);
      }
    })().catch(() => {
      if (!cancelled) setSlideCount(0);
    });

    return () => {
      cancelled = true;
    };
  }, [errors, file]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !slideCount) return;

    const slides = Array.from(container.children) as HTMLElement[];
    const activeSlide = slides[currentSlide - 1];
    const baseWidth = activeSlide?.offsetWidth ?? 960;
    const baseHeight = activeSlide?.offsetHeight ?? 540;

    container.style.width = `${baseWidth * zoom}px`;
    container.style.minWidth = `${baseWidth * zoom}px`;
    container.style.height = `${baseHeight * zoom}px`;
    container.style.minHeight = `${baseHeight * zoom}px`;

    slides.forEach((slide, index) => {
      slide.style.display = index + 1 === currentSlide ? "block" : "none";
      slide.style.transform = `scale(${zoom})`;
      slide.style.transformOrigin = "top left";
      slide.style.margin = "0";
    });
  }, [currentSlide, slideCount, zoom]);

  return (
    <div className="bg-slate-200 p-4">
      <div
        ref={viewportRef}
        className={`relative flex h-[360px] sm:h-[480px] lg:h-[588px] items-start justify-start overflow-auto ${
          zoom > 1 ? (panning ? "cursor-grabbing touch-none" : "cursor-grab touch-none") : "touch-pan-y"
        }`}
        onPointerDown={(event) => {
          if (zoom <= 1 || !viewportRef.current) return;
          panStartRef.current = {
            x: event.clientX,
            y: event.clientY,
            left: viewportRef.current.scrollLeft,
            top: viewportRef.current.scrollTop,
          };
          setPanning(true);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = panStartRef.current;
          if (!start || !viewportRef.current) return;
          viewportRef.current.scrollLeft = start.left - (event.clientX - start.x);
          viewportRef.current.scrollTop = start.top - (event.clientY - start.y);
        }}
        onPointerUp={(event) => {
          panStartRef.current = null;
          setPanning(false);
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => {
          panStartRef.current = null;
          setPanning(false);
        }}
      >
        {!slideCount && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
            Loading PPTX preview...
          </div>
        )}
        <div ref={containerRef} className="pptx-preview-container" />
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-500">
        <button type="button" disabled={!slideCount || currentSlide === 1} onClick={() => setCurrentSlide((slide) => slide - 1)} className="rounded-lg px-3 py-2 hover:bg-slate-100 disabled:opacity-30">Previous</button>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Zoom out" disabled={zoom <= 0.75} onClick={() => setZoom((value) => Math.max(0.75, value - 0.25))} className="rounded-lg px-2 py-1 text-base hover:bg-slate-100 disabled:opacity-30">−</button>
          <button type="button" aria-label="Reset zoom" onClick={() => setZoom(1)} className="min-w-12 rounded-lg px-2 py-1 text-[11px] hover:bg-slate-100">{Math.round(zoom * 100)}%</button>
          <button type="button" aria-label="Zoom in" disabled={zoom >= 2} onClick={() => setZoom((value) => Math.min(2, value + 0.25))} className="rounded-lg px-2 py-1 text-base hover:bg-slate-100 disabled:opacity-30">+</button>
        </div>
        <span>{slideCount ? `Slide ${currentSlide} of ${slideCount}` : "Preparing slides..."}</span>
        <button type="button" disabled={!slideCount || currentSlide === slideCount} onClick={() => setCurrentSlide((slide) => slide + 1)} className="rounded-lg px-3 py-2 hover:bg-slate-100 disabled:opacity-30">Next</button>
      </div>
    </div>
  );
}

function XlsxPreview({
  file,
  errors,
}: {
  file: File;
  errors: SpellError[];
}) {
  const [sheets, setSheets] = useState<{ name: string; rows: string[][] }[]>([]);
  const [currentSheet, setCurrentSheet] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [panning, setPanning] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const panStartRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", raw: false });
      const parsed = workbook.SheetNames.map((name) => ({
        name,
        rows: XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[name], {
          header: 1,
          raw: false,
          defval: "",
        }).map((row) => row.map((cell) => String(cell))),
      }));

      if (!cancelled) {
        setSheets(parsed);
        setCurrentSheet(0);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [file]);

  const rows = sheets[currentSheet]?.rows ?? [];
  const maxColumns = Math.max(1, ...rows.map((row) => row.length));

  return (
    <div className="bg-slate-200 p-4">
      <div
        ref={viewportRef}
        className={`relative flex h-[360px] sm:h-[480px] lg:h-[588px] items-start justify-start overflow-auto ${
          zoom > 1 ? (panning ? "cursor-grabbing touch-none" : "cursor-grab touch-none") : "touch-pan-y"
        }`}
        onPointerDown={(event) => {
          if (zoom <= 1 || !viewportRef.current) return;
          panStartRef.current = {
            x: event.clientX,
            y: event.clientY,
            left: viewportRef.current.scrollLeft,
            top: viewportRef.current.scrollTop,
          };
          setPanning(true);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = panStartRef.current;
          if (!start || !viewportRef.current) return;
          viewportRef.current.scrollLeft = start.left - (event.clientX - start.x);
          viewportRef.current.scrollTop = start.top - (event.clientY - start.y);
        }}
        onPointerUp={(event) => {
          panStartRef.current = null;
          setPanning(false);
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => {
          panStartRef.current = null;
          setPanning(false);
        }}
      >
        {!sheets.length ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
            Loading XLSX preview...
          </div>
        ) : (
          <div
            className="origin-top-left bg-white shadow-md"
            style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
          >
            <table className="border-collapse text-left text-sm">
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {Array.from({ length: maxColumns }, (_, columnIndex) => {
                      const value = row[columnIndex] ?? "";
                      const tokens = value.split(/(\s+)/);

                      return (
                        <td
                          key={columnIndex}
                          className="min-w-32 max-w-72 whitespace-pre-wrap border border-slate-200 px-3 py-2 align-top text-slate-700"
                        >
                          {tokens.map((token, tokenIndex) => {
                            const normalized = token
                              .toLowerCase()
                              .replace(/^[^a-z]+|[^a-z]+$/g, "");
                            const matchingError = errors.find(
                              (error) => normalized === error.word.toLowerCase()
                            );

                            if (!matchingError) return token;

                            return (
                              <span
                                key={`${token}-${tokenIndex}`}
                                className="rounded border-2 border-red-500 bg-transparent text-red-600"
                                title={matchingError.suggestion
                                  ? `Suggestion: ${matchingError.suggestion}`
                                  : "Possible spelling mistake"}
                              >
                                {token}
                              </span>
                            );
                          })}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-500">
        <button type="button" disabled={currentSheet === 0} onClick={() => setCurrentSheet((sheet) => sheet - 1)} className="rounded-lg px-3 py-2 hover:bg-slate-100 disabled:opacity-30">Previous</button>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Zoom out" disabled={zoom <= 0.75} onClick={() => setZoom((value) => Math.max(0.75, value - 0.25))} className="rounded-lg px-2 py-1 text-base hover:bg-slate-100 disabled:opacity-30">−</button>
          <button type="button" aria-label="Reset zoom" onClick={() => setZoom(1)} className="min-w-12 rounded-lg px-2 py-1 text-[11px] hover:bg-slate-100">{Math.round(zoom * 100)}%</button>
          <button type="button" aria-label="Zoom in" disabled={zoom >= 2} onClick={() => setZoom((value) => Math.min(2, value + 0.25))} className="rounded-lg px-2 py-1 text-base hover:bg-slate-100 disabled:opacity-30">+</button>
        </div>
        <span>{sheets.length ? `Sheet ${currentSheet + 1} of ${sheets.length}` : "Preparing sheets..."}</span>
        <button type="button" disabled={!sheets.length || currentSheet === sheets.length - 1} onClick={() => setCurrentSheet((sheet) => sheet + 1)} className="rounded-lg px-3 py-2 hover:bg-slate-100 disabled:opacity-30">Next</button>
      </div>
    </div>
  );
}

function ImagePreview({
  file,
  errors,
  marks,
}: {
  file: File;
  errors: SpellError[];
  marks: ImageMark[];
}) {
  const [zoom, setZoom] = useState(1);
  const [panning, setPanning] = useState(false);
  const imageUrl = useMemo(() => URL.createObjectURL(file), [file]);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const panStartRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  const markedWords = new Set(errors.map((error) => error.word.toLowerCase()));

  return (
    <div className="bg-slate-200 p-4">
      <div
        ref={viewportRef}
        className={`relative flex h-[360px] sm:h-[480px] lg:h-[588px] items-start justify-start overflow-auto ${
          zoom > 1 ? (panning ? "cursor-grabbing touch-none" : "cursor-grab touch-none") : "touch-pan-y"
        }`}
        onPointerDown={(event) => {
          if (zoom <= 1 || !viewportRef.current) return;
          panStartRef.current = {
            x: event.clientX,
            y: event.clientY,
            left: viewportRef.current.scrollLeft,
            top: viewportRef.current.scrollTop,
          };
          setPanning(true);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = panStartRef.current;
          if (!start || !viewportRef.current) return;
          viewportRef.current.scrollLeft = start.left - (event.clientX - start.x);
          viewportRef.current.scrollTop = start.top - (event.clientY - start.y);
        }}
        onPointerUp={(event) => {
          panStartRef.current = null;
          setPanning(false);
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => {
          panStartRef.current = null;
          setPanning(false);
        }}
      >
        <div className="relative h-fit w-fit">
          {/* Blob URLs cannot use Next image optimization. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Uploaded file preview"
            className="block max-h-[360px] sm:max-h-[480px] lg:max-h-[588px] max-w-none object-contain"
            style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
          />
          {marks
            .filter((mark) => markedWords.has(mark.word.toLowerCase()))
            .map((mark, index) => (
              <span
                key={`${mark.word}-${index}`}
                className="pointer-events-none absolute rounded border-2 border-red-500 bg-transparent"
                style={{
                  left: `${mark.left * 100}%`,
                  top: `${mark.top * 100}%`,
                  width: `${mark.width * 100}%`,
                  height: `${mark.height * 100}%`,
                  transform: `scale(${zoom})`,
                  transformOrigin: "top left",
                }}
                title="Possible spelling mistake"
              />
            ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-500">
        <button type="button" aria-label="Zoom out" disabled={zoom <= 0.75} onClick={() => setZoom((value) => Math.max(0.75, value - 0.25))} className="rounded-lg px-2 py-1 text-base hover:bg-slate-100 disabled:opacity-30">−</button>
        <button type="button" aria-label="Reset zoom" onClick={() => setZoom(1)} className="min-w-12 rounded-lg px-2 py-1 text-[11px] hover:bg-slate-100">{Math.round(zoom * 100)}%</button>
        <button type="button" aria-label="Zoom in" disabled={zoom >= 2} onClick={() => setZoom((value) => Math.min(2, value + 0.25))} className="rounded-lg px-2 py-1 text-base hover:bg-slate-100 disabled:opacity-30">+</button>
      </div>
      {imageUrl && <ImageUrlCleanup url={imageUrl} />}
    </div>
  );
}

function ImageUrlCleanup({ url }: { url: string }) {
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return null;
}

function computeReadability(text: string) {
  const clean = text.trim();
  if (!clean) {
    return {
      readingTime: "< 1 min read",
      readabilityLevel: "Standard",
      readabilityScore: 70,
      sentenceCount: 0,
      charCount: 0,
      charCountNoSpaces: 0,
    };
  }

  const words = clean.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const sentences = clean.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const sentenceCount = Math.max(1, sentences.length);
  const charCount = clean.length;
  const charCountNoSpaces = clean.replace(/\s+/g, "").length;
  const readingTime =
    wordCount <= 200 ? "1 min read" : `${Math.ceil(wordCount / 200)} min read`;

  // Syllables approximation
  let totalSyllables = 0;
  for (const word of words) {
    const w = word.toLowerCase().replace(/[^a-z]/g, "");
    if (!w) continue;
    if (w.length <= 3) {
      totalSyllables += 1;
      continue;
    }
    const syllables = w
      .replace(/(?:[^laeiouy]|ed|es|e)$/, "")
      .replace(/^y/, "")
      .match(/[aeiouy]{1,2}/g);
    totalSyllables += syllables ? syllables.length : 1;
  }

  const flesch =
    206.835 -
    1.015 * (wordCount / sentenceCount) -
    84.6 * (totalSyllables / Math.max(1, wordCount));
  const score = Math.round(Math.max(0, Math.min(100, flesch)));

  let level = "Standard (Grade 8-9)";
  if (score >= 80) level = "Very Easy (Grade 5-6)";
  else if (score >= 60) level = "Standard (Grade 8-9)";
  else if (score >= 40) level = "Fairly Difficult (High School)";
  else level = "Advanced / Technical";

  return {
    readingTime,
    readabilityLevel: level,
    readabilityScore: score,
    sentenceCount,
    charCount,
    charCountNoSpaces,
  };
}

export default function Home() {

  const fileInput =
    useRef<HTMLInputElement>(null);

  const [files, setFiles] =
    useState<File[]>([]);

  const [inputMode, setInputMode] =
    useState<"upload" | "text">("upload");

  const [pastedText, setPastedText] =
    useState("");

  const [dialect, setDialect] =
    useState<"en-US" | "en-GB">("en-US");

  const [copiedShare, setCopiedShare] =
    useState(false);

  useEffect(() => {
    const savedDialect = localStorage.getItem("spellense_dialect");
    if (savedDialect === "en-GB" || savedDialect === "en-US") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDialect(savedDialect);
    }
  }, []);

  const handleDialectChange = (newDialect: "en-US" | "en-GB") => {
    setDialect(newDialect);
    localStorage.setItem("spellense_dialect", newDialect);
  };

  const [dragging, setDragging] =
    useState(false);

  const [checking, setChecking] =
    useState(false);

  const [checkingMessage, setCheckingMessage] =
    useState("Checking your file...");

  const [result, setResult] =
    useState<CheckResult | null>(null);

  const [pdfPreviewUrl, setPdfPreviewUrl] =
    useState<string | null>(null);

  const [pdfSelectedPage, setPdfSelectedPage] =
    useState(1);

  const [copiedWord, setCopiedWord] =
    useState<string | null>(null);

  const [uploadError, setUploadError] =
    useState<string | null>(null);

  const [loadingSample, setLoadingSample] =
    useState(false);

  const [copiedReport, setCopiedReport] =
    useState(false);

  const [copiedCorrected, setCopiedCorrected] =
    useState(false);

  const [copiedRaw, setCopiedRaw] =
    useState(false);


  // ==========================================
  // FILE SELECTION & VALIDATION
  // ==========================================

  const handleFiles = (
    selected: FileList | File[] | null
  ) => {
    if (!selected) return;

    const fileList = Array.from(selected);
    if (fileList.length === 0) return;

    const file = fileList[0];
    if (!file) return;

    // 1. Max size limit: 25 MB
    const MAX_SIZE_BYTES = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      setUploadError(
        `"${file.name}" exceeds the 25 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB). Please select a smaller document.`
      );
      return;
    }

    // 2. Format validation (extensions & mime types)
    const allowedExtensions = [".pdf", ".docx", ".pptx", ".xlsx", ".jpg", ".jpeg", ".png", ".webp"];
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    const fileNameLower = file.name.toLowerCase();
    const hasValidExt = allowedExtensions.some((ext) => fileNameLower.endsWith(ext));
    const hasValidMime = allowedMimeTypes.includes(file.type);

    if (!hasValidExt && !hasValidMime) {
      setUploadError(
        "Unsupported file format. Please upload a PDF, DOCX, PPTX, XLSX, JPG, PNG, or WEBP file."
      );
      return;
    }

    // Clear any previous error and setup file
    setUploadError(null);

    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
    }

    setPdfPreviewUrl(
      fileNameLower.endsWith(".pdf")
        ? URL.createObjectURL(file)
        : null
    );
    setPdfSelectedPage(1);
    setFiles([file]);
    setResult(null);
  };


  const openFilePicker = () => {
    fileInput.current?.click();
  };


  const removeFiles = () => {
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
    }

    setFiles([]);
    setUploadError(null);
    setPdfPreviewUrl(null);
    setPdfSelectedPage(1);
    setResult(null);

    if (fileInput.current) {
      fileInput.current.value = "";
    }
  };

  const loadSampleFile = async () => {
    try {
      setLoadingSample(true);
      setUploadError(null);
      const res = await fetch("/sample-document.png");
      if (!res.ok) {
        throw new Error("Failed to fetch sample document");
      }
      const blob = await res.blob();
      const sampleFile = new File([blob], "sample-document.png", {
        type: "image/png",
      });
      handleFiles([sampleFile]);
    } catch (err) {
      console.error(err);
      setUploadError("Could not load sample document. Please try choosing a local file.");
    } finally {
      setLoadingSample(false);
    }
  };

  const ignoreError = (errorToIgnore: SpellError) => {
    setResult((currentResult) => {
      if (!currentResult || !currentResult.errors) {
        return currentResult;
      }

      const errors = currentResult.errors.filter(
        (error) =>
          !(
            error.index === errorToIgnore.index &&
            error.word === errorToIgnore.word
          )
      );

      return {
        ...currentResult,
        errors,
        errorCount: errors.length,
      };
    });
  };

  const ignoreAllInstances = (wordToIgnore: string) => {
    setResult((currentResult) => {
      if (!currentResult || !currentResult.errors) {
        return currentResult;
      }

      const lower = wordToIgnore.toLowerCase();
      const errors = currentResult.errors.filter(
        (error) => error.word.toLowerCase() !== lower
      );

      return {
        ...currentResult,
        errors,
        errorCount: errors.length,
      };
    });
  };

  const getCorrectedText = (text: string, errors: SpellError[]): string => {
    if (!text || !errors || errors.length === 0) return text;

    const sorted = [...errors]
      .filter((e) => Boolean(e.suggestion))
      .sort((a, b) => b.index - a.index);

    let output = text;
    for (const err of sorted) {
      if (!err.suggestion) continue;
      const start = err.index;
      const end = start + err.word.length;
      if (
        start >= 0 &&
        end <= output.length &&
        output.slice(start, end).toLowerCase() === err.word.toLowerCase()
      ) {
        output = output.slice(0, start) + err.suggestion + output.slice(end);
      }
    }
    return output;
  };

  const copyCorrectedText = async () => {
    if (!result?.text) return;
    const corrected = getCorrectedText(result.text, result.errors ?? []);
    await navigator.clipboard.writeText(corrected);
    setCopiedCorrected(true);
    setTimeout(() => setCopiedCorrected(false), 2000);
  };

  const copyRawText = async () => {
    if (!result?.text) return;
    await navigator.clipboard.writeText(result.text);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };


  // ==========================================
  // SPELL CHECK
  // ==========================================

  const checkFile = async () => {
    if (files.length === 0) {
      return;
    }

    setChecking(true);
    setCheckingMessage(
      files[0]?.name.toLowerCase().endsWith(".pdf")
        ? "Reading your PDF..."
        : "Reading your file..."
    );

    setResult(null);

    try {
      const file = files[0];
      const isPdf = file.name.toLowerCase().endsWith(".pdf");
      const formData = new FormData();

      if (isPdf) {
        setCheckingMessage("Extracting text from PDF...");
        try {
          const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
          pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
          const arrayBuffer = await file.arrayBuffer();
          const loadingTask = pdfjs.getDocument({
            data: new Uint8Array(arrayBuffer),
          });
          const pdf = await loadingTask.promise;

          const textParts: string[] = [];
          const pageStarts: number[] = [];
          let currentOffset = 0;

          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            pageStarts.push(currentOffset);
            setCheckingMessage(`Scanning page ${pageNum} of ${pdf.numPages}...`);
            const page = await pdf.getPage(pageNum);
            const content = await page.getTextContent();
            const pageText = content.items
              .map((item) => ("str" in item ? item.str : ""))
              .join(" ")
              .replace(/\r/g, "")
              .replace(/[ \t]+/g, " ")
              .trim();

            page.cleanup();

            textParts.push(pageText);
            // Joined with "\n\n"
            currentOffset += pageText.length + 2;
          }

          await pdf.cleanup();
          await loadingTask.destroy();

          const extractedText = textParts.join("\n\n").trim();
          if (extractedText.length > 0) {
            setCheckingMessage("Checking spelling...");
            formData.append("text", extractedText);
            formData.append("pageStarts", JSON.stringify(pageStarts));
            formData.append("fileName", file.name);
            formData.append("dialect", dialect);
          } else {
            // Scanned PDF (images only)
            if (file.size <= 4.2 * 1024 * 1024) {
              setCheckingMessage("Running OCR on scanned PDF...");
              formData.append("file", file);
              formData.append("dialect", dialect);
            } else {
              setResult({
                success: false,
                error:
                  "This scanned PDF contains only images without selectable text and exceeds the 4.5MB limit for OCR scanning. Please compress the file or use a digital PDF.",
              });
              return;
            }
          }
        } catch (pdfErr) {
          console.warn(
            "Client-side PDF extraction failed, falling back to file upload:",
            pdfErr
          );
          if (file.size <= 4.2 * 1024 * 1024) {
            formData.append("file", file);
            formData.append("dialect", dialect);
          } else {
            setResult({
              success: false,
              error:
                "Unable to process this large PDF on the device. Please try a file under 4.5MB.",
            });
            return;
          }
        }
      } else {
        setCheckingMessage("Checking spelling...");
        formData.append("file", file);
        formData.append("dialect", dialect);
      }

      const response =
        await fetch("/api/check", {
          method: "POST",
          body: formData,
        });

      let data: CheckResult | null = null;
      try {
        data = await response.json();
      } catch {
        // Handle non-JSON or HTML error responses
      }

      if (!response.ok || !data) {
        setResult({
          success: false,
          error:
            data?.error ||
            "Unable to check the file. Please try again.",
        });
        return;
      }

      setResult(data);

    } catch (error) {

      console.error(error);

      setResult({
        success: false,
        error:
          "Unable to connect to the spell checker.",
      });

    } finally {

      setChecking(false);
      setCheckingMessage("Checking your file...");
    }
  };

  const checkPastedText = async () => {
    const trimmed = pastedText.trim();
    if (!trimmed) {
      setUploadError("Please enter or paste some text to check.");
      return;
    }

    setChecking(true);
    setCheckingMessage("Checking your text...");
    setResult(null);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("text", trimmed);
      formData.append("fileName", "pasted-text.txt");
      formData.append("dialect", dialect);

      const response = await fetch("/api/check", {
        method: "POST",
        body: formData,
      });

      let data: CheckResult | null = null;
      try {
        data = await response.json();
      } catch {
        // Handle non-JSON or HTML error responses
      }

      if (!response.ok || !data) {
        setResult({
          success: false,
          error:
            data?.error ||
            "Unable to check the text. Please try again.",
        });
        return;
      }

      setFiles([
        new File([trimmed], "pasted-text.txt", { type: "text/plain" }),
      ]);
      setResult(data);
    } catch (err) {
      console.error(err);
      setResult({
        success: false,
        error: "Unable to connect to the spell checker.",
      });
    } finally {
      setChecking(false);
      setCheckingMessage("Checking your file...");
    }
  };

  const downloadReport = () => {
    if (!result) return;

    const lines = [
      "Spellense spelling report",
      `File: ${result.filename ?? files[0]?.name ?? "Unknown"}`,
      `Words checked: ${result.wordCount ?? 0}`,
      `Possible mistakes: ${result.errorCount ?? 0}`,
      "",
      ...(result.errors && result.errors.length > 0
        ? result.errors.map((error, index) =>
            `${error.page ? `Page ${error.page}` : `#${index + 1}`} | ${error.word} -> ${error.suggestion ?? "No suggestion"}`
          )
        : ["No possible spelling mistakes found."]),
    ];
    const url = URL.createObjectURL(
      new Blob([lines.join("\n")], { type: "text/plain" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "spellense-report.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyReport = async () => {
    if (!result) return;

    const lines = [
      "Spellense spelling report",
      `File: ${result.filename ?? files[0]?.name ?? "Unknown"}`,
      `Words checked: ${result.wordCount ?? 0}`,
      `Possible mistakes: ${result.errorCount ?? 0}`,
      "",
      ...(result.errors && result.errors.length > 0
        ? result.errors.map((error, index) =>
            `${error.page ? `Page ${error.page}` : `#${index + 1}`} | ${error.word} -> ${error.suggestion ?? "No suggestion"}`
          )
        : ["No possible spelling mistakes found."]),
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopiedReport(true);
    setTimeout(() => {
      setCopiedReport(false);
    }, 2000);
  };


  // ==========================================
  // RESULTS SCREEN
  // ==========================================

  if (result) {

    const isTextResult =
      files[0]?.name === "pasted-text.txt" || !files[0]?.name.includes(".");
    const isPdfResult =
      !isTextResult && (files[0]?.name.toLowerCase().endsWith(".pdf") ?? false);
    const isDocxResult =
      !isTextResult && (files[0]?.name.toLowerCase().endsWith(".docx") ?? false);
    const isPptxResult =
      !isTextResult && (files[0]?.name.toLowerCase().endsWith(".pptx") ?? false);
    const isXlsxResult =
      !isTextResult && (files[0]?.name.toLowerCase().endsWith(".xlsx") ?? false);
    const isImageResult =
      !isTextResult &&
      !isPdfResult &&
      !isDocxResult &&
      !isPptxResult &&
      !isXlsxResult;

    const readability = computeReadability(result.text ?? "");

    const fileName = files[0]?.name ?? result.filename ?? "Uploaded Document";
    const wordCount = result.wordCount ?? 0;
    const errorCount = result.errorCount ?? result.errors?.length ?? 0;
    const hasErrors = errorCount > 0;
    const accuracyRate = wordCount > 0
      ? Math.max(0, Math.min(100, Math.round(((wordCount - errorCount) / wordCount) * 100)))
      : (errorCount === 0 ? 100 : 0);

    return (
      <main className="min-h-screen bg-[#f8fafc] text-[#101828]">

        {/* NAVBAR */}
        <Navbar
          resultMode={{
            fileName,
            onReset: () => {
              setResult(null);
              setFiles([]);
            },
            onDownloadReport: downloadReport,
          }}
        />

        {/* RESULTS HERO */}
        <section className="relative overflow-hidden bg-dot-pattern">
          {/* Ambient lighting */}
          <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[560px] w-[900px] rounded-full bg-gradient-to-tr from-blue-400/15 via-indigo-400/15 to-purple-400/10 blur-[120px] opacity-75 animate-pulse-glow" />

          <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-10 sm:px-6 lg:px-10">

            {/* STATUS BANNER & HEADER */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/85 px-4 py-1.5 shadow-2xs backdrop-blur-md">
                {hasErrors ? (
                  <>
                    <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
                      SPELL ANALYSIS COMPLETE • {errorCount} POTENTIAL ISSUE{errorCount === 1 ? "" : "S"}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                      SPELL ANALYSIS COMPLETE • ALL CLEAN
                    </span>
                  </>
                )}
              </div>

              <h1 className="mt-4 text-3xl font-extrabold tracking-[-1.2px] text-slate-900 sm:text-4xl lg:text-[42px]">
                {hasErrors ? "Spelling issues detected in your file" : "Your document is error-free!"}
              </h1>

              <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-slate-500">
                {hasErrors
                  ? "We inspected the English text in your file. Review the suggestions and marked positions below."
                  : "Every English token detected was cross-referenced against standard dictionaries with zero mistakes found."}
              </p>
            </div>

            {/* METRICS SUMMARY KPI BAR (4 Cards) */}
            <div className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">

              {/* Words Checked */}
              <div className="group relative overflow-hidden rounded-2xl border border-white/90 bg-white/80 p-4 text-center shadow-xs backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
                <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                    <path d="M10 9H8" />
                    <path d="M16 13H8" />
                    <path d="M16 17H8" />
                  </svg>
                </div>
                <p className="text-2xl font-extrabold tracking-tight text-slate-900">{wordCount}</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-400">Words Scanned</p>
              </div>

              {/* Mistakes Flagged */}
              <div className="group relative overflow-hidden rounded-2xl border border-white/90 bg-white/80 p-4 text-center shadow-xs backdrop-blur-md transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className={`mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl ring-1 ${hasErrors ? "bg-rose-50 text-rose-600 ring-rose-100" : "bg-emerald-50 text-emerald-600 ring-emerald-100"}`}>
                  {hasErrors ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  )}
                </div>
                <p className={`text-2xl font-extrabold tracking-tight ${hasErrors ? "text-rose-600" : "text-emerald-600"}`}>
                  {errorCount}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-slate-400">Mistakes Flagged</p>
              </div>

              {/* Spelling Score */}
              <div className="group relative overflow-hidden rounded-2xl border border-white/90 bg-white/80 p-4 text-center shadow-xs backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
                <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="6" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                </div>
                <p className="text-2xl font-extrabold tracking-tight text-indigo-600">{accuracyRate}%</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-400">Spelling Score</p>
              </div>

              {/* File Info */}
              <div className="group relative overflow-hidden rounded-2xl border border-white/90 bg-white/80 p-4 text-center shadow-xs backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
                <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 text-[11px] font-black tracking-wider ring-1 ring-slate-200">
                  {isTextResult ? "TXT" : isPdfResult ? "PDF" : isDocxResult ? "DOCX" : isPptxResult ? "PPTX" : isXlsxResult ? "XLSX" : "IMG"}
                </div>
                <p className="truncate text-sm font-bold tracking-tight text-slate-800 px-1" title={fileName}>
                  {files[0]?.size ? (files[0].size / 1024 / 1024).toFixed(2) + " MB" : "Verified"}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-slate-400">In-Memory OCR</p>
              </div>

            </div>

            {/* WRITING & READABILITY INSIGHTS (4 Cards) */}
            {result.text && (
              <div className="mx-auto mt-4 max-w-4xl rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-xs backdrop-blur-md">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100/80">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-indigo-500" />
                    <span className="text-xs font-bold text-slate-800">
                      Writing &amp; Readability Insights
                    </span>
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600">
                      {dialect === "en-GB" ? "🇬🇧 UK English" : "🇺🇸 US English"}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">
                    Flesch Reading Ease: {readability.readabilityScore}/100
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
                  <div className="rounded-xl bg-slate-50/80 p-2.5">
                    <p className="text-base font-extrabold text-slate-800">{readability.readingTime}</p>
                    <p className="text-[11px] font-semibold text-slate-400">Est. Reading Time</p>
                  </div>
                  <div className="rounded-xl bg-slate-50/80 p-2.5">
                    <p className="truncate text-base font-extrabold text-indigo-600" title={readability.readabilityLevel}>
                      {readability.readabilityLevel.split(" ")[0]}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-400">{readability.readabilityLevel}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50/80 p-2.5">
                    <p className="text-base font-extrabold text-slate-800">{readability.sentenceCount}</p>
                    <p className="text-[11px] font-semibold text-slate-400">Sentences</p>
                  </div>
                  <div className="rounded-xl bg-slate-50/80 p-2.5">
                    <p className="text-base font-extrabold text-slate-800">{readability.charCount.toLocaleString()}</p>
                    <p className="text-[11px] font-semibold text-slate-400">Characters ({readability.charCountNoSpaces.toLocaleString()} no spaces)</p>
                  </div>
                </div>
              </div>
            )}

            {/* ERROR MESSAGE */}
            {result.success === false && (
              <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-red-200/80 bg-red-50/80 p-5 text-center text-sm font-semibold text-red-600 shadow-sm backdrop-blur-sm">
                {result.error}
              </div>
            )}

            {/* NO TEXT FOUND */}
            {result.success && !result.text && (
              <div className="mx-auto mt-6 max-w-2xl rounded-3xl border border-slate-200/80 bg-white/90 p-8 text-center shadow-sm backdrop-blur-md">
                <p className="text-base font-bold text-slate-800">
                  No readable English text detected.
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  The OCR scanner could not find text in this file. Try uploading an image or document with higher contrast or clearer resolution.
                </p>
              </div>
            )}

            {/* MAIN INSPECTION INTERFACE (PREVIEW + SUGGESTIONS) */}
            {(isImageResult || isPdfResult || isDocxResult || isPptxResult || isXlsxResult || isTextResult) && (
              <div
                className={`mt-8 gap-6 ${
                  result.errors && result.errors.length > 0
                    ? "grid lg:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.7fr)]"
                    : "flex flex-col items-center"
                }`}
              >
                {/* PREVIEW CARD */}
                <div className="w-full overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/40 backdrop-blur-xl">

                  {/* PREVIEW HEADER */}
                  <div className="flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse" />
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {isTextResult
                            ? "Text Analysis Canvas"
                            : isPdfResult
                              ? "PDF Document Viewer"
                              : isDocxResult
                                ? "Word Document Preview"
                                : isPptxResult
                                  ? "PowerPoint Slide Viewer"
                                  : isXlsxResult
                                    ? "Spreadsheet Grid Viewer"
                                    : "Visual Asset Canvas"}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {isTextResult ? "Interactive spell inspection" : "Interactive OCR overlay"}
                        </p>
                      </div>
                    </div>

                    <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${hasErrors ? "border border-rose-200 bg-rose-50 text-rose-600" : "border border-emerald-200 bg-emerald-50 text-emerald-600"}`}>
                      {hasErrors ? `${errorCount} MARKED ERROR${errorCount === 1 ? "" : "S"}` : "ALL CLEAR"}
                    </span>
                  </div>

                  {files[0] ? (
                    isTextResult ? (
                      <div className="bg-slate-50 p-6 overflow-auto h-[360px] sm:h-[480px] lg:h-[588px] text-slate-800 leading-relaxed font-sans text-base whitespace-pre-wrap select-text">
                        {renderMarkedText(result.text ?? "", result.errors ?? [])}
                      </div>
                    ) : isPdfResult ? (
                      <PdfMarkedPreview
                        key={files[0].name}
                        file={files[0]}
                        errors={result.errors ?? []}
                        selectedPage={pdfSelectedPage}
                        onPageChange={setPdfSelectedPage}
                        markErrors={result.pdfHasTextLayer ?? false}
                        pdfMarks={result.pdfMarks ?? []}
                      />
                    ) : isDocxResult ? (
                      <DocxPreview
                        key={files[0].name}
                        file={files[0]}
                        errors={result.errors ?? []}
                      />
                    ) : isPptxResult ? (
                      <PptxPreview
                        key={files[0].name}
                        file={files[0]}
                        errors={result.errors ?? []}
                      />
                    ) : isXlsxResult ? (
                      <XlsxPreview
                        key={files[0].name}
                        file={files[0]}
                        errors={result.errors ?? []}
                      />
                    ) : (
                      <ImagePreview
                        key={files[0].name}
                        file={files[0]}
                        errors={result.errors ?? []}
                        marks={result.imageMarks ?? []}
                      />
                    )
                  ) : (
                    <div className="flex h-[360px] sm:h-[480px] lg:h-[588px] items-center justify-center text-sm text-slate-400">
                      Preview unavailable
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN: SUGGESTIONS PANEL */}
                {result.errors && result.errors.length > 0 ? (
                  <div className="w-full overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/40 backdrop-blur-xl">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
                      <div>
                        <h2 className="text-sm font-bold text-slate-900">
                          Suggested Corrections
                        </h2>
                        <p className="mt-0.5 text-xs text-slate-400">
                          Click to inspect page location
                        </p>
                      </div>

                      <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-600">
                        {result.errors.length} TO REVIEW
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 max-h-[588px] overflow-y-auto">
                      {result.errors.map((error, index) => (
                        <div
                          key={`${error.word}-${index}`}
                          className={`group flex items-center justify-between gap-3 px-5 py-3.5 transition-all hover:bg-blue-50/40 sm:px-6 ${
                            error.page ? "cursor-pointer" : ""
                          }`}
                          onClick={() => {
                            if (error.page) {
                              setPdfSelectedPage(error.page);
                            }
                          }}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-xs font-black text-rose-500 ring-1 ring-rose-100">
                              {error.page
                                ? `P${error.page}`
                                : String(index + 1).padStart(2, "0")}
                            </span>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-rose-600">
                                {error.word}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {error.suggestion
                                  ? "Suggested correction available"
                                  : "Possible typo or brand name"}
                              </p>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            {error.suggestion && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (error.suggestion) {
                                    navigator.clipboard.writeText(error.suggestion);
                                    setCopiedWord(error.suggestion);
                                    setTimeout(() => {
                                      setCopiedWord((prev) =>
                                        prev === error.suggestion ? null : prev
                                      );
                                    }, 2000);
                                  }
                                }}
                                title="Click to copy suggested correction"
                                className="group/btn flex items-center gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-2.5 py-1.5 text-xs font-bold text-emerald-700 shadow-2xs transition hover:border-emerald-300 hover:bg-emerald-100 hover:scale-105 active:scale-95 cursor-pointer"
                              >
                                <span className="text-emerald-500">→</span>
                                <span>
                                  {copiedWord === error.suggestion
                                    ? "Copied!"
                                    : error.suggestion}
                                </span>
                              </button>
                            )}

                            {(() => {
                              const occurrences = (result.errors ?? []).filter(
                                (e) => e.word.toLowerCase() === error.word.toLowerCase()
                              ).length;

                              return (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      ignoreError(error);
                                    }}
                                    className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                    title="Ignore this spelling suggestion"
                                  >
                                    Ignore
                                  </button>

                                  {occurrences > 1 && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        ignoreAllInstances(error.word);
                                      }}
                                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                                      title={`Ignore all ${occurrences} occurrences of "${error.word}"`}
                                    >
                                      Ignore all ({occurrences})
                                    </button>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* ZERO ERRORS CELEBRATION CARD */
                  <div className="mt-6 w-full max-w-2xl rounded-3xl border border-emerald-100 bg-gradient-to-b from-emerald-50/50 via-white to-white p-8 text-center shadow-lg shadow-emerald-500/5 backdrop-blur-md">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-md shadow-emerald-500/10 ring-4 ring-emerald-50">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>

                    <h3 className="mt-4 text-xl font-extrabold text-slate-900">
                      Flawless! No spelling mistakes found.
                    </h3>

                    <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                      All readable text tokens in <span className="font-semibold text-slate-700">{fileName}</span> were checked and verified. Your document is ready to publish.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* DETECTED TEXT COLLAPSIBLE */}
            {result.text && (
              <details className="group mt-8 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all">
                <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 text-sm font-bold text-slate-800 transition hover:bg-slate-50/60">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-600 transition group-open:rotate-90">
                      ›
                    </span>
                    <span>View Detected OCR Text Stream</span>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                    {wordCount} words
                  </span>
                </summary>

                <div className="border-t border-slate-100 bg-slate-50/40 p-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-slate-400">
                      Underlined words indicate potential spelling mistakes:
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={copyRawText}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-2xs transition hover:bg-slate-50 hover:text-slate-900 active:scale-95 cursor-pointer"
                        title="Copy original extracted text"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        <span>{copiedRaw ? "Copied Raw!" : "Copy Raw"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={copyCorrectedText}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 shadow-2xs transition hover:bg-blue-100 hover:text-blue-800 active:scale-95 cursor-pointer"
                        title="Copy text with all suggestions automatically applied"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>{copiedCorrected ? "Copied Corrected!" : "Copy Corrected Text"}</span>
                      </button>
                    </div>
                  </div>

                  <p className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-600">
                    {renderMarkedText(result.text, result.errors ?? [])}
                  </p>
                </div>
              </details>
            )}

            {/* BOTTOM ACTIONS */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={copyReport}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/30 hover:text-blue-600 cursor-pointer"
                title="Copy entire spelling report to clipboard"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>{copiedReport ? "Report Copied!" : "Copy Report"}</span>
              </button>

              <button
                type="button"
                onClick={downloadReport}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/30 hover:text-blue-600 cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" x2="12" y1="15" y2="3" />
                </svg>
                <span>Download Report (.txt)</span>
              </button>

              <button
                type="button"
                onClick={removeFiles}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-600/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-blue-600/40 active:translate-y-0 cursor-pointer"
              >
                <span>Check Another File</span>
                <span>→</span>
              </button>
            </div>

            {/* ONE-CLICK SHARE & REFERRAL CARD */}
            <div className="mx-auto mt-12 max-w-4xl rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-violet-50/60 p-6 sm:p-8 shadow-xs backdrop-blur-md text-center">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold text-blue-600 shadow-2xs">
                <span>📣</span>
                <span>Share with Friends &amp; Colleagues</span>
              </div>

              <h3 className="mt-3 text-lg sm:text-xl font-extrabold text-slate-900">
                Found Spellense helpful? Help others write error-free!
              </h3>
              <p className="mx-auto mt-1.5 max-w-lg text-xs sm:text-sm text-slate-500">
                Share our free, zero-storage visual spell checker with designers, writers, students, and teammates.
              </p>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                {/* WhatsApp */}
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    "Check your documents, images, and text for spelling mistakes for free with Spellense! https://spellense.com"
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#25D366] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#20bd5a] transition active:scale-95 cursor-pointer"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.04 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.53 7.5C9.36 7.5 9.09 7.57 8.87 7.8C8.64 8.04 8 8.64 8 9.87C8 11.1 8.9 12.28 9.03 12.45C9.15 12.62 10.77 15.11 13.25 16.19C13.84 16.45 14.3 16.6 14.66 16.71C15.25 16.9 15.79 16.87 16.22 16.81C16.7 16.74 17.7 16.2 17.91 15.62C18.12 15.04 18.12 14.54 18.06 14.44C18 14.34 17.82 14.28 17.56 14.15C17.29 14.02 16 13.39 15.76 13.3C15.53 13.21 15.36 13.17 15.2 13.42C15.03 13.66 14.55 14.23 14.4 14.4C14.26 14.58 14.11 14.6 13.85 14.47C13.59 14.34 12.75 14.07 11.75 13.18C10.97 12.48 10.45 11.62 10.3 11.37C10.15 11.12 10.29 10.98 10.42 10.85C10.54 10.73 10.68 10.55 10.82 10.39C10.95 10.23 11 10.11 11.09 9.94C11.17 9.77 11.13 9.63 11.07 9.5C11 9.38 10.54 8.24 10.34 7.78C10.15 7.33 9.96 7.39 9.81 7.38C9.68 7.38 9.53 7.38 9.53 7.5Z" />
                  </svg>
                  <span>Share on WhatsApp</span>
                </a>

                {/* LinkedIn */}
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://spellense.com")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#0A66C2] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#095196] transition active:scale-95 cursor-pointer"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.64 1.64 0 1 0 0-3.28 1.64 1.64 0 0 0 0 3.28M7.86 18.5V10.13H5.07V18.5h2.79Z" />
                  </svg>
                  <span>Share on LinkedIn</span>
                </a>

                {/* X / Twitter */}
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                    "Check your documents, PDFs, and images for spelling mistakes for free with Spellense!"
                  )}&url=${encodeURIComponent("https://spellense.com")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-black transition active:scale-95 cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  <span>Post on X</span>
                </a>

                {/* Copy Link */}
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText("https://spellense.com");
                    setCopiedShare(true);
                    setTimeout(() => setCopiedShare(false), 2500);
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition active:scale-95 cursor-pointer"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <span>{copiedShare ? "Copied Link!" : "Copy Link"}</span>
                </button>
              </div>
            </div>

          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-slate-200/70 bg-white px-5 py-8">
          <div className="mx-auto max-w-7xl text-center">
            <div className="text-lg font-bold">
              Spel<span className="text-blue-600">lense</span>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Simple English spell checking for visual content.
            </p>
            <div className="mt-5 text-[11px] text-gray-300">
              © 2026 Spellense. All rights reserved.
            </div>
          </div>
        </footer>

      </main>
    );
  }


  // ==========================================
  // MAIN UPLOAD PAGE
  // ==========================================

  const homeFaqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How does Spellense detect spelling mistakes in images and visual designs?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Spellense applies high-precision Optical Character Recognition (OCR) to detect text tokens inside images (PNG, JPG, WebP) and scanned PDF pages. Each word token is verified against comprehensive English dictionaries, and suspected typos are highlighted with red bounding boxes drawn directly over your original artwork.",
        },
      },
      {
        "@type": "Question",
        name: "Are my uploaded files, contracts, or presentations saved on your server?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. Spellense operates on a strict zero-storage, in-memory architecture. Files are processed ephemerally in RAM exclusively for OCR analysis and dictionary checking, then discarded immediately after results are returned. Files are never stored on disk or used to train artificial intelligence models.",
        },
      },
      {
        "@type": "Question",
        name: "Which document formats and file sizes are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Spellense supports PNG, JPG, JPEG, and WebP images, native and scanned multi-page PDF documents, Microsoft Word (DOCX), PowerPoint (PPTX) slide decks, and Excel (XLSX) workbooks up to 25 MB per file.",
        },
      },
      {
        "@type": "Question",
        name: "Does Spellense support both American and British English spelling?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. You can switch effortlessly between American English (en-US) and British English (en-GB) dictionaries to ensure accurate suggestions for regional variations like color/colour, organize/organise, and center/centre.",
        },
      },
      {
        "@type": "Question",
        name: "Is Spellense completely free to use?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, Spellense is 100% free with no account creation, no subscriptions, and no paywalls. All features including OCR inspection and case converters are immediately available.",
        },
      },
    ],
  };

  return (

    <main id="main-content" className="min-h-screen bg-[#f8fafc] text-[#101828]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeFaqSchema) }}
      />

      {/* NAVBAR */}
      <Navbar onUploadClick={openFilePicker} />


      {/* FILE INPUT */}

      <input
        id="file-upload-input"
        aria-label="Upload document or image file for visual spell checking"
        ref={fileInput}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.pdf,.docx,.pptx,.xlsx"
        className="hidden"
        onChange={(e) =>
          handleFiles(e.target.files)
        }
      />


      {/* HERO */}

      <section className="relative overflow-hidden bg-dot-pattern">

        {/* Ambient background glows / mesh */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[560px] w-[920px] rounded-full bg-gradient-to-tr from-blue-400/20 via-indigo-400/20 to-purple-400/15 blur-[120px] opacity-80 animate-pulse-glow" />
        <div className="pointer-events-none absolute top-40 -left-28 h-[400px] w-[400px] rounded-full bg-blue-200/40 blur-[100px]" />
        <div className="pointer-events-none absolute top-36 -right-28 h-[420px] w-[420px] rounded-full bg-indigo-200/40 blur-[110px]" />


        <div className="relative mx-auto max-w-7xl px-5 pb-12 pt-4 sm:px-6 sm:pt-6 lg:px-10 lg:pt-7">

          {/* HERO */}

          <div className="mx-auto max-w-4xl text-center">

            {/* TOP ANNOUNCEMENT PILL */}
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-white/80 px-3.5 py-1.5 shadow-xs shadow-blue-500/5 backdrop-blur-md transition-all hover:border-blue-300">
              <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              <span className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 bg-clip-text text-[11px] font-bold uppercase tracking-wider text-transparent">
                Intelligent OCR & Spell Checker
              </span>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                v1.0
              </span>
            </div>

            <h1 className="mt-3 text-[32px] font-extrabold leading-[1.12] tracking-[-1.8px] text-slate-900 sm:text-[46px] lg:text-[54px]">
              Great design deserves{" "}
              <br />
              <span className="inline-block whitespace-nowrap bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                flawless spelling.
              </span>
            </h1>

            <p className="mx-auto mt-2.5 max-w-[620px] text-[14px] leading-relaxed text-slate-600 sm:text-[15px]">
              AI &amp; OCR-powered spell checking for images, documents, slides, and sheets.
              <br className="hidden sm:inline" />
              Catch hidden English typos across your visual designs before going live.
            </p>

            {/* QUICK HIGHLIGHT PILLS */}
            <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-slate-500">
              <div className="flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/70 px-3 py-1 shadow-2xs backdrop-blur-xs">
                <svg className="h-3.5 w-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                <span>100% In-Memory Safe</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/70 px-3 py-1 shadow-2xs backdrop-blur-xs">
                <svg className="h-3.5 w-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                <span>Instant OCR Parsing</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/70 px-3 py-1 shadow-2xs backdrop-blur-xs">
                <svg className="h-3.5 w-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                <span>No Sign-up Needed</span>
              </div>
            </div>

          </div>


          {/* UPLOAD & TEXT CHECK SECTION */}

          <div className="mx-auto mt-5 max-w-[920px]">

            {/* MODE & DIALECT SELECTOR BAR */}
            <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2.5 px-1">
              {/* INPUT MODE TABS */}
              <div className="inline-flex items-center rounded-2xl bg-white/85 p-1 border border-slate-200/80 shadow-xs backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setInputMode("upload")}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                    inputMode === "upload"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
                  }`}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <span>Upload Document</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("text")}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                    inputMode === "text"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
                  }`}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9"/>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                  </svg>
                  <span>Paste or Type Text</span>
                  <span className={`rounded-full px-1.5 py-0.2 text-[9px] font-black ${
                    inputMode === "text" ? "bg-white/20 text-white" : "bg-blue-100 text-blue-600"
                  }`}>NEW</span>
                </button>
              </div>

              {/* DIALECT SELECTOR TOGGLE */}
              <div className="inline-flex items-center gap-1 rounded-2xl bg-white/85 p-1 border border-slate-200/80 shadow-xs backdrop-blur-md">
                <span className="hidden sm:inline-block pl-2.5 pr-1 text-[11px] font-semibold text-slate-400">Dictionary:</span>
                <button
                  type="button"
                  onClick={() => handleDialectChange("en-US")}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    dialect === "en-US"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  }`}
                  title="Check spelling using American English rules (e.g., color, organize)"
                >
                  <span>🇺🇸 US</span>
                  <span className="hidden sm:inline">English</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDialectChange("en-GB")}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    dialect === "en-GB"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  }`}
                  title="Check spelling using British English rules (e.g., colour, organise)"
                >
                  <span>🇬🇧 UK</span>
                  <span className="hidden sm:inline">English</span>
                </button>
              </div>
            </div>

            {/* UPLOAD VALIDATION ERROR BANNER */}
            {uploadError && (
              <div className="mx-auto mb-4 flex items-center justify-between rounded-2xl border border-rose-200/90 bg-rose-50/95 px-5 py-3.5 text-sm font-semibold text-rose-700 shadow-sm backdrop-blur-md animate-in fade-in duration-200">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <p>{uploadError}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadError(null)}
                  aria-label="Dismiss error message"
                  className="ml-3 rounded-lg p-1.5 text-rose-400 transition hover:bg-rose-100 hover:text-rose-700 cursor-pointer"
                  title="Dismiss error"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            )}

            {inputMode === "text" ? (
              <div className="relative rounded-[32px] bg-white/95 backdrop-blur-xl p-6 sm:p-8 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.07),0_0_20px_rgba(59,130,246,0.04)]">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-blue-600" />
                    <label htmlFor="pasted-text-input" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Paste or write your English text
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPastedText(
                          "We definately want to recieve your feedback on our new documnet. The acommodation was wonderfull, but the calender had an unecesary error in the schedual."
                        );
                      }}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      Try Sample Text
                    </button>
                    {pastedText && (
                      <button
                        type="button"
                        onClick={() => setPastedText("")}
                        className="text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer ml-2"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  id="pasted-text-input"
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Type or paste any text here (essays, emails, blog posts, articles) to instantly scan for typos and spelling mistakes..."
                  rows={8}
                  className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-sm leading-relaxed text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 font-mono sm:font-sans"
                />

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                    <span>
                      <strong className="text-slate-800">
                        {pastedText.trim() ? pastedText.trim().split(/\s+/).length : 0}
                      </strong>{" "}
                      words
                    </span>
                    <span>•</span>
                    <span>
                      <strong className="text-slate-800">{pastedText.length}</strong> characters
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={checkPastedText}
                    disabled={checking || !pastedText.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-600/35 disabled:cursor-not-allowed disabled:opacity-50 active:translate-y-0 cursor-pointer"
                  >
                    {checking ? (
                      <>
                        <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                        </svg>
                        <span>{checkingMessage}</span>
                      </>
                    ) : (
                      <>
                        <span>Check My Text</span>
                        <span>→</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
            <div
              onDragEnter={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                handleFiles(
                  e.dataTransfer.files
                );
              }}
              onClick={() => {
                if (files.length === 0) {
                  openFilePicker();
                }
              }}
              className={`group relative rounded-[32px] transition-all duration-300 cursor-pointer overflow-hidden ${
                dragging
                  ? "bg-blue-50/95 shadow-[0_0_60px_rgba(59,130,246,0.25)] scale-[1.01]"
                  : "bg-white/95 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.07),0_0_20px_rgba(59,130,246,0.04)] hover:shadow-[0_25px_70px_-15px_rgba(59,130,246,0.14)]"
              }`}
            >

              <div className="relative rounded-[32px] backdrop-blur-2xl p-4 sm:p-7 text-center transition-all duration-300">

                {/* BEFORE UPLOAD */}

                {files.length === 0 && (

                  <div className={`relative rounded-[24px] transition-all duration-300 px-5 py-7 sm:px-8 sm:py-9 ${
                    dragging
                      ? "bg-blue-100/40"
                      : "bg-gradient-to-b from-blue-50/30 via-slate-50/35 to-transparent group-hover:bg-blue-50/20"
                  }`}>

                    {/* FLOATING 3D ICON */}
                    <div className="relative mx-auto flex h-18 w-18 items-center justify-center">
                      <div className="absolute inset-0 rounded-3xl bg-blue-500/25 blur-xl transition-all duration-500 group-hover:scale-130 group-hover:bg-blue-500/35" />
                      <div className="relative flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white shadow-xl shadow-blue-600/35 ring-4 ring-blue-50/90 transition-all duration-300 group-hover:-translate-y-1.5 group-hover:scale-105 group-hover:shadow-blue-600/45">
                        <svg
                          width="30"
                          height="30"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                          <path d="M12 12v9" />
                          <path d="m8 16 4-4 4 4" />
                        </svg>
                      </div>
                    </div>

                    <h2 className="mt-4 text-xl sm:text-2xl font-black tracking-[-0.5px] text-slate-900 group-hover:text-blue-900 transition-colors">
                      {dragging ? "Release your file to inspect" : "Drop your image, PDF, or document here"}
                    </h2>

                    <p className="mx-auto mt-1 max-w-md text-xs sm:text-sm text-slate-500 font-medium">
                      Drag and drop anywhere inside, or choose a file from your computer • Max 25 MB
                    </p>

                    {/* BUTTONS */}
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openFilePicker();
                        }}
                        className="inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-600/35 active:translate-y-0 active:scale-98 cursor-pointer"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span>Choose a file</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          loadSampleFile();
                        }}
                        disabled={loadingSample}
                        className="inline-flex items-center gap-2 rounded-2xl bg-slate-100/90 hover:bg-blue-50/70 px-5 py-3 text-sm font-bold text-slate-700 shadow-2xs backdrop-blur-xs transition hover:text-blue-600 disabled:opacity-60 cursor-pointer"
                        title="Test immediately with a sample document"
                      >
                        {loadingSample ? (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                          </svg>
                        )}
                        <span>Try Sample Document</span>
                      </button>
                    </div>

                    {/* FORMAT BADGES */}
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100/80 px-3 py-1 text-[11px] font-bold text-slate-700 shadow-2xs transition hover:scale-105 hover:bg-rose-50 hover:text-rose-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        PDF
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100/80 px-3 py-1 text-[11px] font-bold text-slate-700 shadow-2xs transition hover:scale-105 hover:bg-blue-50 hover:text-blue-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        DOCX
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100/80 px-3 py-1 text-[11px] font-bold text-slate-700 shadow-2xs transition hover:scale-105 hover:bg-amber-50 hover:text-amber-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        PPTX
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100/80 px-3 py-1 text-[11px] font-bold text-slate-700 shadow-2xs transition hover:scale-105 hover:bg-emerald-50 hover:text-emerald-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        XLSX
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100/80 px-3 py-1 text-[11px] font-bold text-slate-700 shadow-2xs transition hover:scale-105 hover:bg-purple-50 hover:text-purple-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                        JPG • PNG • WEBP
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100/80 px-3 py-1 text-[11px] font-bold text-slate-500 shadow-2xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                        MAX 25 MB
                      </span>
                    </div>

                  </div>

                )}


                {/* AFTER UPLOAD */}

                {files.length > 0 && (

                  <div className="mx-auto max-w-[620px]">

                    <div className="relative mx-auto flex h-20 w-20 items-center justify-center">

                      <div className="absolute inset-0 rounded-3xl bg-emerald-500/20 blur-xl" />

                      <div className="relative flex h-18 w-18 items-center justify-center rounded-[24px] bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-xl shadow-emerald-500/30 ring-4 ring-emerald-50">

                        <svg
                          width="34"
                          height="34"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >

                          <path d="m4.5 12.5 5 5L19.5 7.5" />

                        </svg>

                      </div>

                    </div>


                    <p className="mt-5 text-[11px] font-bold uppercase tracking-[1.8px] text-emerald-600">
                      File Loaded & Ready
                    </p>


                    <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.6px] text-slate-900">
                      Ready for spell analysis
                    </h2>


                    {/* FILE ITEM LIST */}

                    <div className="mt-6 space-y-2.5">

                      {files.map((file) => {
                        const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
                        const isDocx = file.name.toLowerCase().endsWith(".docx");
                        const isPptx = file.name.toLowerCase().endsWith(".pptx");
                        const isXlsx = file.name.toLowerCase().endsWith(".xlsx");
                        const formatLabel = isPdf ? "PDF" : isDocx ? "DOCX" : isPptx ? "PPTX" : isXlsx ? "XLSX" : "IMAGE";
                        const formatColor = isPdf
                          ? "bg-rose-50 text-rose-600 border-rose-200/80"
                          : isDocx
                            ? "bg-blue-50 text-blue-600 border-blue-200/80"
                            : isPptx
                              ? "bg-amber-50 text-amber-600 border-amber-200/80"
                              : isXlsx
                                ? "bg-emerald-50 text-emerald-600 border-emerald-200/80"
                                : "bg-purple-50 text-purple-600 border-purple-200/80";

                        return (
                          <div
                            key={`${file.name}-${file.size}`}
                            className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/95 p-4 text-left shadow-xs backdrop-blur-md"
                          >
                            <div className="flex min-w-0 items-center gap-3.5">
                              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-[11px] font-black tracking-tight ${formatColor}`}>
                                {formatLabel}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-slate-800">
                                  {file.name}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB • Ready
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFiles();
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                              title="Remove file"
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>
                        );
                      })}

                    </div>


                    {/* CHECK BUTTON */}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        checkFile();
                      }}
                      disabled={checking}
                      className="group mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 py-4 text-sm font-bold text-white shadow-xl shadow-blue-600/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-blue-600/40 disabled:cursor-not-allowed disabled:opacity-75 active:translate-y-0"
                    >

                      {checking ? (
                        <>
                          <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                          </svg>
                          <span>{checkingMessage}</span>
                        </>
                      ) : (
                        <>
                          <span>Check My Words</span>
                          <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                        </>
                      )}

                    </button>


                    {/* CHANGE FILE */}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFiles();
                      }}
                      disabled={checking}
                      className="mt-3.5 text-xs font-semibold text-slate-400 transition hover:text-blue-600 disabled:cursor-not-allowed"
                    >
                      Choose a different file
                    </button>

                  </div>

                )}

              </div>

            </div>
            )}


            {/* TRUST BADGES */}

            <div className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-4">

              <TrustItem
                icon="signup"
                title="No signup"
                text="Start instantly"
              />

              <TrustItem
                icon="free"
                title="100% Free"
                text="No payment required"
              />

              <TrustItem
                icon="private"
                title="Zero storage"
                text="In-memory processing"
              />

              <TrustItem
                icon="easy"
                title="Precise OCR"
                text="Visual layout aware"
              />

            </div>

          </div>

          <section className="mx-auto mt-20 max-w-5xl border-t border-slate-200/80 pt-16">

            {/* SECTION HEADER */}
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-white/90 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-600 shadow-2xs backdrop-blur-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                HOW IT WORKS
              </div>

              <h2 className="mt-4 text-3xl font-extrabold tracking-[-1px] text-slate-900 sm:text-4xl lg:text-[42px] sm:leading-[1.15]">
                Intelligent visual spell checking for images, documents & slides
              </h2>

              <p className="mt-4 text-[15px] leading-relaxed text-slate-600 sm:text-base">
                Spellense combines high-precision OCR (Optical Character Recognition) with deep English dictionaries to pinpoint spelling mistakes buried inside visual designs, graphics, multi-page PDFs, and presentation decks before you publish or print.
              </p>
            </div>

            {/* 3-STEP MODERN CARDS */}
            <div className="mt-10 grid gap-5 md:grid-cols-3">

              {/* STEP 1 */}
              <div className="group relative rounded-3xl border border-white/90 bg-white/80 p-6 shadow-xs backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:bg-white hover:shadow-xl hover:shadow-blue-500/5">
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-xs font-black text-blue-600 ring-1 ring-blue-100">
                    01
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 group-hover:text-blue-600 transition">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" x2="12" y1="3" y2="15" />
                    </svg>
                  </div>
                </div>

                <h3 className="mt-5 text-lg font-bold text-slate-900">
                  Upload any visual asset
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Drag and drop JPG, PNG, WebP graphics, multi-page PDFs, Word documents (DOCX), PowerPoint decks (PPTX), or Excel tables (XLSX). No sign-up or installation required.
                </p>
              </div>

              {/* STEP 2 */}
              <div className="group relative rounded-3xl border border-white/90 bg-white/80 p-6 shadow-xs backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:bg-white hover:shadow-xl hover:shadow-blue-500/5">
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-xs font-black text-indigo-600 ring-1 ring-indigo-100">
                    02
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 group-hover:text-indigo-600 transition">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                      <path d="M11 8v6" />
                      <path d="M8 11h6" />
                    </svg>
                  </div>
                </div>

                <h3 className="mt-5 text-lg font-bold text-slate-900">
                  Precision OCR extraction
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Advanced Optical Character Recognition extracts visible English text tokens while mapping coordinates to original pages and slides, keeping layout context intact.
                </p>
              </div>

              {/* STEP 3 */}
              <div className="group relative rounded-3xl border border-white/90 bg-white/80 p-6 shadow-xs backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:bg-white hover:shadow-xl hover:shadow-blue-500/5">
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-xs font-black text-emerald-600 ring-1 ring-emerald-100">
                    03
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 group-hover:text-emerald-600 transition">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 12 2 2 4-4" />
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                  </div>
                </div>

                <h3 className="mt-5 text-lg font-bold text-slate-900">
                  Smart visual inspection
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Review highlighted spelling errors with instant replacement suggestions, navigate multi-page previews, and whitelist custom brand names or technical jargon.
                </p>
              </div>

            </div>

            {/* USE CASES & SEO FEATURE HIGHLIGHTS */}
            <div className="mt-14 grid gap-6 sm:grid-cols-2">

              <div className="rounded-3xl border border-white/90 bg-gradient-to-br from-white via-white to-slate-50/70 p-7 shadow-xs backdrop-blur-md transition-all hover:border-blue-200">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="m9 9 6 6" />
                    <path d="m15 9-6 6" />
                  </svg>
                </div>
                <h3 className="mt-4 text-xl font-bold text-slate-900">
                  Catch what standard spell-checkers miss
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
                  Traditional spellcheck tools only work inside plain text fields. Spellense bridges the gap by proofreading rasterized text in social media flyers, restaurant menus, infographic graphics, certificates, resumes, and PDF brochures.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1">Photoshop & Canva graphics</span>
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1">Scanned PDF contracts</span>
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1">Ad banners & flyers</span>
                </div>
              </div>

              <div className="rounded-3xl border border-white/90 bg-gradient-to-br from-white via-white to-slate-50/70 p-7 shadow-xs backdrop-blur-md transition-all hover:border-indigo-200">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <h3 className="mt-4 text-xl font-bold text-slate-900">
                  Human-in-the-loop accuracy & privacy
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
                  Automated checkers often flag acronyms, brand names, and artistic fonts. Spellense displays suspected typos directly on your document canvas, giving you full control to verify before final sign-off. Everything stays private in memory.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1">Zero file logging</span>
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1">Side-by-side preview</span>
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1">Exportable report</span>
                </div>
              </div>

            </div>

            {/* EXPANDED FORMATS & EDUCATIONAL GUIDE */}
            <div className="mt-14 space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  Intelligent visual spell checking for modern media
                </h2>
                <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                  Proofread creative banners, corporate documents, and scanned pages in one fast, private workspace.
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/90 bg-white/80 p-6 shadow-xs backdrop-blur-md transition-all hover:border-blue-200">
                  <div className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    Image Spell Check
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-slate-900">
                    PNG, JPG &amp; WebP Graphics
                  </h3>
                  <p className="mt-2.5 text-xs leading-relaxed text-slate-600">
                    Graphic designers export banners, social carousels, and flyers from Figma or Canva where text becomes pixels. Spellense uses optical character recognition to read the letters directly from your artwork and highlights typos in place.
                  </p>
                </div>

                <div className="rounded-3xl border border-white/90 bg-white/80 p-6 shadow-xs backdrop-blur-md transition-all hover:border-indigo-200">
                  <div className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                    Document Inspection
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-slate-900">
                    Multi-Page PDFs &amp; Slides
                  </h3>
                  <p className="mt-2.5 text-xs leading-relaxed text-slate-600">
                    Pitch decks and contracts often mix vector text and scanned pages. Spellense renders a visual multi-page proofing canvas so you can navigate slides, inspect bounding boxes, and confirm suggestions before executive presentations.
                  </p>
                </div>

                <div className="rounded-3xl border border-white/90 bg-white/80 p-6 shadow-xs backdrop-blur-md transition-all hover:border-blue-200">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                    Dialect Awareness
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-slate-900">
                    US &amp; UK English Rules
                  </h3>
                  <p className="mt-2.5 text-xs leading-relaxed text-slate-600">
                    Target your audience with confidence. Switch seamlessly between American English rules (color, organize, defense) and British English conventions (colour, organise, defence) with dialect-accurate suggestion engines.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-white/90 bg-white/85 p-7 shadow-xs backdrop-blur-md">
                <h3 className="text-lg font-bold text-slate-900">
                  Why visual proofreading matters for creators and businesses
                </h3>
                <div className="mt-3 grid gap-5 sm:grid-cols-3 text-xs leading-relaxed text-slate-600">
                  <div>
                    <strong className="block text-slate-800 font-bold mb-1">Protect Brand Credibility</strong>
                    Typographical errors on marketing graphics and resumes undermine credibility. Spellense catches subtle letter swaps before public release.
                  </div>
                  <div>
                    <strong className="block text-slate-800 font-bold mb-1">Avoid Costly Printing Reprints</strong>
                    Catch mistakes on flyers, restaurant menus, certificates, and brochures before sending large print orders to press.
                  </div>
                  <div>
                    <strong className="block text-slate-800 font-bold mb-1">Zero-Storage Privacy</strong>
                    Files are held in RAM solely for OCR analysis and immediately discarded. Your proprietary pitch decks and contracts remain strictly private.
                  </div>
                </div>
              </div>
            </div>

            {/* HOMEPAGE FAQ ACCORDION */}
            <div className="mt-14 space-y-4">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/70 bg-white/80 px-3 py-1 shadow-2xs backdrop-blur-md">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                    Frequently Asked Questions
                  </span>
                </div>
                <h2 className="mt-2.5 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  Everything you need to know about Spellense
                </h2>
                <p className="mx-auto mt-1.5 max-w-xl text-xs text-slate-500 sm:text-sm">
                  Quick answers about our in-memory OCR proofreading, supported formats, and privacy policies.
                </p>
              </div>

              <div className="space-y-3 max-w-3xl mx-auto">
                <details className="group rounded-2xl border border-slate-200/80 bg-white/85 p-5 shadow-xs backdrop-blur-md transition-all open:border-blue-300 open:shadow-md">
                  <summary className="flex cursor-pointer items-center justify-between font-bold text-slate-900 text-sm sm:text-base list-none">
                    <span>How does Spellense detect spelling mistakes in images and visual designs?</span>
                    <span className="ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition-transform duration-200 group-open:rotate-180">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </span>
                  </summary>
                  <p className="mt-3 text-xs sm:text-sm leading-relaxed text-slate-600">
                    Spellense applies high-precision Optical Character Recognition (OCR) to detect readable text inside raster graphics (PNG, JPG, WebP) and scanned PDF pages. Each word token is verified against comprehensive English dictionaries, and suspected typos are highlighted with red bounding boxes drawn directly over your original artwork.
                  </p>
                </details>

                <details className="group rounded-2xl border border-slate-200/80 bg-white/85 p-5 shadow-xs backdrop-blur-md transition-all open:border-blue-300 open:shadow-md">
                  <summary className="flex cursor-pointer items-center justify-between font-bold text-slate-900 text-sm sm:text-base list-none">
                    <span>Are my uploaded files, contracts, or presentations saved on your server?</span>
                    <span className="ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition-transform duration-200 group-open:rotate-180">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </span>
                  </summary>
                  <p className="mt-3 text-xs sm:text-sm leading-relaxed text-slate-600">
                    No. Spellense operates on a strict zero-storage, in-memory architecture. Files are processed ephemerally in RAM exclusively for OCR analysis and dictionary checking, then discarded immediately after results are returned. Files are never stored on disk or used to train artificial intelligence models.
                  </p>
                </details>

                <details className="group rounded-2xl border border-slate-200/80 bg-white/85 p-5 shadow-xs backdrop-blur-md transition-all open:border-blue-300 open:shadow-md">
                  <summary className="flex cursor-pointer items-center justify-between font-bold text-slate-900 text-sm sm:text-base list-none">
                    <span>Which document formats and file sizes are supported?</span>
                    <span className="ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition-transform duration-200 group-open:rotate-180">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </span>
                  </summary>
                  <p className="mt-3 text-xs sm:text-sm leading-relaxed text-slate-600">
                    Spellense supports PNG, JPG, JPEG, and WebP images, native and scanned multi-page PDF documents, Microsoft Word (DOCX), PowerPoint (PPTX) slide decks, and Excel (XLSX) workbooks up to 25 MB per file.
                  </p>
                </details>

                <details className="group rounded-2xl border border-slate-200/80 bg-white/85 p-5 shadow-xs backdrop-blur-md transition-all open:border-blue-300 open:shadow-md">
                  <summary className="flex cursor-pointer items-center justify-between font-bold text-slate-900 text-sm sm:text-base list-none">
                    <span>Does Spellense support both American and British English spelling?</span>
                    <span className="ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition-transform duration-200 group-open:rotate-180">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </span>
                  </summary>
                  <p className="mt-3 text-xs sm:text-sm leading-relaxed text-slate-600">
                    Yes. You can switch effortlessly between American English (en-US) and British English (en-GB) dictionaries to ensure accurate suggestions for regional variations like color/colour, organize/organise, and center/centre.
                  </p>
                </details>

                <details className="group rounded-2xl border border-slate-200/80 bg-white/85 p-5 shadow-xs backdrop-blur-md transition-all open:border-blue-300 open:shadow-md">
                  <summary className="flex cursor-pointer items-center justify-between font-bold text-slate-900 text-sm sm:text-base list-none">
                    <span>Is Spellense completely free to use?</span>
                    <span className="ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition-transform duration-200 group-open:rotate-180">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </span>
                  </summary>
                  <p className="mt-3 text-xs sm:text-sm leading-relaxed text-slate-600">
                    Yes, Spellense is 100% free with no account creation, no subscriptions, and no paywalls. All features including OCR inspection and case converters are immediately available.
                  </p>
                </details>
              </div>
            </div>

            {/* ACTION LINKS */}
            <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200/70 pt-8">
              <div className="flex flex-wrap items-center gap-6 text-sm font-semibold">
                <Link href="/faq" className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 hover:underline">
                  <span>Explore Frequently Asked Questions</span>
                  <span>→</span>
                </Link>
                <Link href="/privacy" className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 hover:underline">
                  <span>Read our Zero-Storage Privacy Policy</span>
                </Link>
              </div>

              <button
                type="button"
                onClick={openFilePicker}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-600 active:scale-95"
              >
                <span>Check your file now</span>
                <span>↑</span>
              </button>
            </div>

          </section>

        </div>

      </section>


      {/* FOOTER */}

      <footer
        id="privacy"
        className="border-t border-slate-200/70 bg-white px-5 py-8 sm:px-6"
      >

        <div className="mx-auto max-w-7xl">

          <div className="flex flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">

            <div>

              <div className="text-lg font-bold">
                Spel<span className="text-blue-600">lense</span>
              </div>

              <p className="mt-1 text-xs text-gray-400">
                Simple English spell checking for visual content.
              </p>

            </div>


            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs text-gray-400">

              <Link
                href="/"
                className="transition hover:text-gray-700"
              >
                Home
              </Link>

              <Link
                href="/about"
                className="transition hover:text-gray-700"
              >
                About
              </Link>

              <Link
                href="/case-converter"
                className="transition hover:text-gray-700"
              >
                Case Converter
              </Link>

              <Link
                href="/us-uk-converter"
                className="transition hover:text-gray-700"
              >
                US ↔ UK Dialect
              </Link>

              <Link
                href="/faq"
                className="transition hover:text-gray-700"
              >
                FAQ
              </Link>

              <Link
                href="/privacy"
                className="transition hover:text-gray-700"
              >
                Privacy
              </Link>

              <Link
                href="/terms"
                className="transition hover:text-gray-700"
              >
                Terms
              </Link>

              <a
                href="mailto:hello@spellense.com"
                className="transition hover:text-gray-700"
              >
                Contact
              </a>

            </div>

          </div>


          <div className="mt-6 border-t border-gray-100 pt-5 text-center text-[11px] text-gray-300">
            © 2026 Spellense. All rights reserved.
          </div>

        </div>

      </footer>

    </main>
  );
}


/* ==========================================
   TRUST ITEM
========================================== */

function TrustItem({
  icon,
  title,
  text,
}: {
  icon: "signup" | "free" | "private" | "easy";
  title: string;
  text: string;
}) {

  return (

    <div className="group relative flex items-center gap-3.5 rounded-2xl border border-white/90 bg-white/75 p-3.5 shadow-xs backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200/80 hover:bg-white/95 hover:shadow-md hover:shadow-blue-500/5 sm:p-4">

      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 via-indigo-50/60 to-blue-100/60 text-blue-600 ring-1 ring-blue-100 transition-all duration-300 group-hover:scale-105 group-hover:text-indigo-600 sm:h-13 sm:w-13">
        <TrustIcon icon={icon} />
      </div>


      <div className="min-w-0">

        <p className="truncate text-xs font-bold text-slate-800 sm:text-[13px]">
          {title}
        </p>

        <p className="mt-0.5 truncate text-[10px] font-medium text-slate-400 sm:text-[11px]">
          {text}
        </p>

      </div>

    </div>

  );
}

function TrustIcon({
  icon,
}: {
  icon: "signup" | "free" | "private" | "easy";
}) {
  const sharedProps = {
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (icon === "signup") {
    return (
      <svg {...sharedProps}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="m16 11 2 2 4-4" />
      </svg>
    );
  }

  if (icon === "free") {
    return (
      <svg {...sharedProps}>
        <rect x="3" y="8" width="18" height="13" rx="2" />
        <path d="M12 8v13" />
        <path d="M3 12h18" />
        <path d="M12 8H7.5a2.5 2.5 0 1 1 2.5-2.5V8Z" />
        <path d="M12 8h4.5A2.5 2.5 0 1 0 14 5.5V8Z" />
      </svg>
    );
  }

  if (icon === "private") {
    return (
      <svg {...sharedProps}>
        <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z" />
        <path d="m8.5 12 2.2 2.2 4.8-4.8" />
      </svg>
    );
  }

  return (
    <svg {...sharedProps}>
      <path d="m13 3-1.2 5.1L7 9.3l4.8 1.2L13 16l1.2-5.5L19 9.3l-4.8-1.2L13 3Z" />
      <path d="m5 15-.6 2.4L2 18l2.4.6L5 21l.6-2.4L8 18l-2.4-.6L5 15Z" />
    </svg>
  );
}
