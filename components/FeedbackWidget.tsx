"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";

export type FeedbackType = "feedback" | "bug" | "suggestion" | "praise";

const FEEDBACK_TYPES: { id: FeedbackType; label: string; icon: React.ReactNode }[] = [
  {
    id: "feedback",
    label: "Feedback",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: "bug",
    label: "Bug",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="8" height="14" x="8" y="6" rx="4" />
        <path d="m19 7-3 2" />
        <path d="m5 7 3 2" />
        <path d="m19 19-3-2" />
        <path d="m5 19 3-2" />
        <path d="M20 13h-4" />
        <path d="M4 13h4" />
        <path d="m10 4 1 2" />
        <path d="m14 4-1 2" />
      </svg>
    ),
  },
  {
    id: "suggestion",
    label: "Suggestion",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-1 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
        <path d="M9 18h6" />
        <path d="M10 22h4" />
      </svg>
    ),
  },
  {
    id: "praise",
    label: "Love it",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    ),
  },
];

const SESSION_START_KEY = "spellense_session_start";
const FEEDBACK_DISMISSED_KEY = "spellense_feedback_dismissed";
const FEEDBACK_SUBMITTED_KEY = "spellense_feedback_submitted";
const FIVE_MINUTES_MS = 5 * 60 * 1000; // 300,000 ms = 5 minutes

export default function FeedbackWidget() {
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [isAutoTriggered, setIsAutoTriggered] = useState(false);
  const [type, setType] = useState<FeedbackType>("feedback");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [lastSubmitted, setLastSubmitted] = useState<{ type: string; message: string } | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Close handler that permanently marks feedback as dismissed so it NEVER pops up again
  const handleClose = useCallback((explicitDismiss = true) => {
    setIsOpen(false);
    if (explicitDismiss && typeof window !== "undefined") {
      try {
        localStorage.setItem(FEEDBACK_DISMISSED_KEY, "true");
      } catch {
        // LocalStorage disabled or quota exceeded
      }
    }
  }, []);

  // 5-Minute Continuous Session Timer & Auto-Popup Logic
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Fast-path test via query param: ?feedback_test=1 or ?feedback=open
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("feedback_test") === "1" || urlParams.get("feedback") === "open") {
        setIsOpen(true);
        setIsAutoTriggered(true);
        return;
      }
    } catch {
      // Query param parsing failed
    }

    // Expose developer helpers in browser console
    // @ts-expect-error dev test helpers
    window.__openFeedbackTest = () => {
      setIsOpen(true);
      setIsAutoTriggered(true);
      console.log("[FeedbackWidget] Test popup triggered");
    };
    // @ts-expect-error dev test helpers
    window.__resetFeedbackTest = () => {
      localStorage.removeItem(FEEDBACK_DISMISSED_KEY);
      localStorage.removeItem(FEEDBACK_SUBMITTED_KEY);
      sessionStorage.removeItem(SESSION_START_KEY);
      console.log("[FeedbackWidget] Storage reset. Reload page to start new 5-min timer.");
    };

    // If user already dismissed or submitted, DO NOT auto-trigger
    const isDismissed = localStorage.getItem(FEEDBACK_DISMISSED_KEY) === "true";
    const isSubmitted = localStorage.getItem(FEEDBACK_SUBMITTED_KEY) === "true";
    if (isDismissed || isSubmitted) {
      return;
    }

    // Track continuous session start across page navigation in sessionStorage
    let sessionStart = Number(sessionStorage.getItem(SESSION_START_KEY));
    if (!sessionStart || isNaN(sessionStart)) {
      sessionStart = Date.now();
      sessionStorage.setItem(SESSION_START_KEY, String(sessionStart));
    }

    const elapsed = Date.now() - sessionStart;
    const remaining = Math.max(0, FIVE_MINUTES_MS - elapsed);

    const timer = setTimeout(() => {
      const dismissedNow = localStorage.getItem(FEEDBACK_DISMISSED_KEY) === "true";
      const submittedNow = localStorage.getItem(FEEDBACK_SUBMITTED_KEY) === "true";
      if (!dismissedNow && !submittedNow) {
        setIsAutoTriggered(true);
        setIsOpen(true);
      }
    }, remaining);

    return () => clearTimeout(timer);
  }, []);

  // Close when clicking outside (mouse and touch)
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        handleClose(true);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("touchstart", handleOutsideClick);
      const focusTimer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 120);
      return () => {
        clearTimeout(focusTimer);
        document.removeEventListener("mousedown", handleOutsideClick);
        document.removeEventListener("touchstart", handleOutsideClick);
      };
    }
  }, [isOpen, handleClose]);

  // Escape key closes widget and saves dismissal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setErrorMessage("Please enter your message or suggestion before submitting.");
      textareaRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const payload = {
      type,
      message: message.trim(),
      email: email.trim(),
    };

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          path: pathname || "/",
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to send feedback");
      }

      setLastSubmitted(payload);
      setSubmitted(true);
      setMessage("");
      setEmail("");

      // Permanently mark as submitted and dismissed so popup never triggers again
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(FEEDBACK_SUBMITTED_KEY, "true");
          localStorage.setItem(FEEDBACK_DISMISSED_KEY, "true");
        } catch {
          // ignore
        }
      }
    } catch (err: unknown) {
      console.error("Feedback submit error:", err);
      setErrorMessage(
        "Could not submit online. Please email us directly at hello@spellense.com"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = () => {
    setHasInteracted(true);
    if (!isOpen) {
      setSubmitted(false);
      setErrorMessage(null);
      setIsOpen(true);
    } else {
      handleClose(true);
    }
  };

  const mailtoUrl = `mailto:hello@spellense.com?subject=${encodeURIComponent(
    `[Spellense Feedback: ${type.toUpperCase()}] from ${pathname || "/"}`
  )}&body=${encodeURIComponent(
    `${message || ""}\n\n---\nSent from: ${pathname || "/"}${email ? `\nReply to: ${email}` : ""}`
  )}`;

  const isPrintSheet = pathname?.startsWith("/print-sheet-maker");

  return (
    <div ref={containerRef}>
      {/* FLOATING FEEDBACK POP-UP CARD */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Spellense Feedback Form"
          style={{
            position: "fixed",
            bottom: isPrintSheet ? "96px" : "84px",
            left: "16px",
            right: "16px",
            maxWidth: "360px",
            marginLeft: "auto",
            marginRight: "0",
            maxHeight: "calc(100dvh - 100px)",
            backgroundColor: "#ffffff",
            borderColor: "#e5e5df",
            zIndex: 9999,
          }}
          className="overflow-y-auto rounded-2xl border p-5 sm:p-6 shadow-xl shadow-black/8 ring-1 ring-black/5"
        >
          {/* HEADER */}
          <div
            style={{ borderColor: "#f0efe9" }}
            className="flex items-start justify-between gap-2 border-b pb-3.5"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-bold text-[#1c201a] tracking-tight">
                  {isAutoTriggered ? "How's your experience?" : "Share Your Feedback"}
                </span>
                <span
                  style={{ backgroundColor: "#3158d5" }}
                  className="flex h-2 w-2 rounded-full animate-pulse"
                />
              </div>
              <p className="mt-0.5 text-[11px] sm:text-xs text-[#767a74] font-normal">
                {isAutoTriggered
                  ? "Found a bug, have a suggestion, or feedback?"
                  : "Help us make Spellense even better for you."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleClose(true)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#767a74] hover:bg-[#f6f5f3] hover:text-[#1c201a] transition cursor-pointer"
              aria-label="Close and don't show again"
              title="Close (will not show again)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {submitted ? (
            /* SUCCESS STATE */
            <div className="py-6 text-center animate-in fade-in duration-200">
              <div
                style={{ backgroundColor: "#f0fdf4", borderColor: "#bbf7d0", color: "#16a34a" }}
                className="mx-auto flex h-13 w-13 items-center justify-center rounded-xl border shadow-2xs"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h4 className="mt-3.5 text-base font-bold text-[#1c201a]">
                Thank You!
              </h4>
              <p className="mt-1 text-xs leading-relaxed text-[#767a74] font-normal max-w-xs mx-auto">
                Your feedback has been saved! Thank you for helping us improve Spellense.
              </p>
              {lastSubmitted && (
                <div
                  style={{ backgroundColor: "#f6f5f3", borderColor: "#e5e5df" }}
                  className="mt-3.5 mx-auto max-w-[280px] p-2.5 rounded-xl border text-left text-[11px] text-[#4b5563]"
                >
                  <span className="font-bold text-[#1c201a] block text-[10px] uppercase tracking-wider mb-0.5">Recorded:</span>
                  <p className="line-clamp-2 italic text-[#4b5563]">&ldquo;{lastSubmitted.message}&rdquo;</p>
                </div>
              )}
              <div className="mt-5 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  style={{ borderColor: "#e5e5df", backgroundColor: "#ffffff" }}
                  className="rounded-lg border px-3.5 py-1.5 text-xs font-semibold text-[#1c201a] hover:bg-[#f6f5f3] transition cursor-pointer"
                >
                  Send another
                </button>
                <button
                  type="button"
                  onClick={() => handleClose(true)}
                  style={{ backgroundColor: "#3158d5", color: "#ffffff" }}
                  className="rounded-lg px-4 py-1.5 text-xs font-bold shadow-xs hover:opacity-95 transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* FORM STATE */
            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              {/* FEEDBACK CATEGORY CHIPS */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#767a74] block mb-1.5">
                  Select Category
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {FEEDBACK_TYPES.map((item) => {
                    const isSelected = type === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setType(item.id)}
                        style={
                          isSelected
                            ? { backgroundColor: "#3158d5", color: "#ffffff", borderColor: "#3158d5" }
                            : { backgroundColor: "#f6f5f3", color: "#4a5568", borderColor: "#e5e5df" }
                        }
                        className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2 text-[11px] font-semibold transition cursor-pointer active:scale-95 ${
                          isSelected
                            ? "shadow-xs"
                            : "hover:bg-[#eeede6] hover:text-[#1c201a]"
                        }`}
                      >
                        <span className="text-sm">{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* MESSAGE TEXTAREA */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#767a74] block mb-1.5">
                  Your Message <span className="text-rose-500">*</span>
                </label>
                <textarea
                  ref={textareaRef}
                  rows={3}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  style={{
                    backgroundColor: "#f6f5f3",
                    borderColor: "#e5e5df",
                    color: "#1c201a",
                  }}
                  placeholder={
                    type === "bug"
                      ? "Describe the issue and what you were doing..."
                      : type === "suggestion"
                      ? "What tool or feature would you love to see next?"
                      : type === "praise"
                      ? "What do you like most about Spellense?"
                      : "What's on your mind? What can we improve?"
                  }
                  className="w-full rounded-xl border p-3 text-xs placeholder:text-[#9ca3af] focus:border-[#3158d5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3158d5]/15 transition resize-none font-normal"
                />
              </div>

              {/* EMAIL (OPTIONAL) */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#767a74] block mb-1.5">
                  Email <span className="font-normal text-[#9ca3af] lowercase">(optional, for replies)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    backgroundColor: "#f6f5f3",
                    borderColor: "#e5e5df",
                    color: "#1c201a",
                  }}
                  placeholder="you@company.com"
                  className="w-full rounded-xl border px-3 py-2 text-xs placeholder:text-[#9ca3af] focus:border-[#3158d5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3158d5]/15 transition font-normal"
                />
              </div>

              {errorMessage && (
                <div
                  style={{ backgroundColor: "#fef2f2", borderColor: "#fecaca", color: "#b91c1c" }}
                  className="rounded-xl border p-2.5 text-center text-xs font-semibold"
                >
                  <p>{errorMessage}</p>
                  <a
                    href={mailtoUrl}
                    style={{ color: "#3158d5" }}
                    className="mt-1.5 inline-flex items-center gap-1 font-bold underline hover:opacity-85"
                  >
                    <span>Open Mail App</span>
                    <span>↗</span>
                  </a>
                </div>
              )}

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={isSubmitting}
                style={{ backgroundColor: "#3158d5", color: "#ffffff" }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-bold shadow-xs hover:opacity-95 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit {FEEDBACK_TYPES.find((t) => t.id === type)?.label || "Feedback"}</span>
                )}
              </button>

              {/* DIRECT EMAIL OPTION & DISMISSAL NOTE */}
              <div
                style={{ borderColor: "#f0efe9" }}
                className="pt-2.5 border-t flex items-center justify-between text-[11px] text-[#767a74]"
              >
                <button
                  type="button"
                  onClick={() => handleClose(true)}
                  className="text-[#9ca3af] hover:text-[#1c201a] underline cursor-pointer"
                >
                  Don&apos;t show again
                </button>
                <a
                  href={mailtoUrl}
                  style={{ color: "#3158d5" }}
                  className="font-semibold hover:opacity-85 hover:underline inline-flex items-center gap-0.5"
                >
                  <span>hello@spellense.com</span>
                  <span className="text-[10px]">↗</span>
                </a>
              </div>
            </form>
          )}
        </div>
      )}

      {/* FLOATING ACTION CIRCLE BUTTON (FAB) */}
      <div
        className={`fixed ${
          isPrintSheet ? "bottom-20 right-3 sm:bottom-6 sm:right-6" : "bottom-5 right-5 sm:bottom-6 sm:right-6"
        } z-50 flex items-center gap-2`}
      >
        {/* HOVER TOOLTIP PILL */}
        {!isOpen && !hasInteracted && !isPrintSheet && (
          <div
            style={{ backgroundColor: "#ffffff", borderColor: "#e5e5df" }}
            className="hidden sm:flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold text-[#1c201a] shadow-xs backdrop-blur-md"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3158d5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>Feedback</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleToggle}
          aria-label={isOpen ? "Close feedback form" : "Open feedback form"}
          aria-expanded={isOpen}
          style={
            isOpen
              ? { backgroundColor: "#1c201a", color: "#ffffff" }
              : { backgroundColor: "#3158d5", color: "#ffffff" }
          }
          className="flex h-13 w-13 sm:h-14 sm:w-14 items-center justify-center rounded-full text-white shadow-lg shadow-black/10 border border-white/20 transition-all duration-200 hover:opacity-95 active:scale-95 cursor-pointer"
        >
          {isOpen ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <line x1="9" y1="10" x2="15" y2="10" />
              <line x1="12" y1="7" x2="12" y2="13" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
