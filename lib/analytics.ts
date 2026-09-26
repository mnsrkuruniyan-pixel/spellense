/**
 * Google Analytics 4 (GA4) Custom Event Tracking Utility
 * Safely dispatches events to window.gtag
 */

declare global {
  interface Window {
    gtag?: (
      command: "event" | "config" | "set" | "js",
      targetIdOrAction: string,
      params?: Record<string, unknown>
    ) => void;
  }
}

/**
 * Low-level safe event dispatcher
 */
export function trackEvent(
  action: string,
  params?: Record<string, unknown>
) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    try {
      window.gtag("event", action, params);
    } catch (err) {
      console.warn("[GA4] Tracking failed:", err);
    }
  }
}

/**
 * Triggered when a user selects or drops a file
 */
export function trackFileUpload(
  tool: "spellcheck" | "image_to_text" | "design_check",
  file: File
) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "unknown";
  trackEvent("file_upload", {
    tool,
    file_name: file.name,
    file_type: file.type || extension,
    file_extension: extension,
    file_size_mb: Number((file.size / (1024 * 1024)).toFixed(2)),
  });
}

/**
 * Triggered when spellcheck finishes successfully (KEY EVENT / CONVERSION)
 */
export function trackSpellcheckComplete(params: {
  tool?: string;
  file_type?: string;
  error_count: number;
  word_count?: number;
  dialect?: string;
  duration_ms?: number;
}) {
  trackEvent("spellcheck_completed", {
    tool: params.tool || "spellcheck",
    file_type: params.file_type || "unknown",
    error_count: params.error_count,
    word_count: params.word_count || 0,
    dialect: params.dialect || "en-US",
    duration_ms: params.duration_ms || 0,
  });
}

/**
 * Triggered when pasted text is submitted for proofreading
 */
export function trackPastedTextSubmitted(params: {
  char_count: number;
  word_count: number;
  dialect?: string;
}) {
  trackEvent("pasted_text_submitted", {
    tool: "spellcheck",
    char_count: params.char_count,
    word_count: params.word_count,
    dialect: params.dialect || "en-US",
  });
}

/**
 * Triggered when a user downloads or exports a proofreading report or extracted text
 */
export function trackReportDownload(params: {
  tool: "spellcheck" | "image_to_text" | "design_check";
  format: "txt" | "pdf" | "json";
  error_count?: number;
}) {
  trackEvent("report_downloaded", {
    tool: params.tool,
    format: params.format,
    error_count: params.error_count ?? 0,
  });
}

/**
 * Triggered when a user copies text to their clipboard
 */
export function trackTextCopied(tool: "spellcheck" | "image_to_text" | "design_check") {
  trackEvent("text_copied", { tool });
}

/**
 * Triggered when Image to Text extraction completes
 */
export function trackImageToTextComplete(params: {
  file_type: string;
  char_count: number;
  word_count: number;
  duration_ms?: number;
}) {
  trackEvent("image_to_text_completed", {
    tool: "image_to_text",
    file_type: params.file_type,
    char_count: params.char_count,
    word_count: params.word_count,
    duration_ms: params.duration_ms || 0,
  });
}

/**
 * Triggered when Design Pre-Flight Check completes
 */
export function trackDesignCheckComplete(params: {
  file_type: string;
  issue_count: number;
  score: number;
  verdict?: string;
}) {
  trackEvent("design_check_completed", {
    tool: "design_check",
    file_type: params.file_type,
    issue_count: params.issue_count,
    score: params.score,
    verdict: params.verdict || "unknown",
  });
}
