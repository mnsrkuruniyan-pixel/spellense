"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";

type FeedbackType = "idea" | "bug" | "praise" | "general";

const FEEDBACK_TYPES: { id: FeedbackType; label: string; icon: string }[] = [
  { id: "idea", label: "Idea", icon: "💡" },
  { id: "bug", label: "Bug", icon: "🐛" },
  { id: "praise", label: "Love it", icon: "❤️" },
  { id: "general", label: "Other", icon: "💬" },
];

export default function FeedbackWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("idea");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      // Focus textarea on open
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  // Escape key closes widget
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setErrorMessage("Please enter your message or suggestion.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          message: message.trim(),
          email: email.trim(),
          path: pathname || "/",
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to send feedback");
      }

      setSubmitted(true);
      setMessage("");
      setEmail("");
    } catch (err) {
      console.error("Feedback submit error:", err);
      // Fallback: provide direct mailto action
      setErrorMessage(
        "Could not send automatically. Please email us directly at hello@spellense.com"
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
    }
    setIsOpen(!isOpen);
  };

  return (
    <div ref={containerRef} className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40">
      {/* FLOATING FEEDBACK POP-UP CARD */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-[350px] max-w-[calc(100vw-2.5rem)] rounded-3xl border border-slate-200/80 bg-white/95 p-5 sm:p-6 shadow-2xl shadow-blue-900/15 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-200">
          {/* HEADER */}
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold text-slate-900">
                  Share Your Feedback
                </span>
                <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              </div>
              <p className="mt-0.5 text-xs text-slate-500 font-normal">
                Help us make Spellense even better for you.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              aria-label="Close feedback widget"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {submitted ? (
            /* SUCCESS STATE */
            <div className="py-6 text-center animate-in fade-in duration-200">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl text-emerald-600 shadow-xs">
                🎉
              </div>
              <h4 className="mt-3.5 text-base font-extrabold text-slate-900">
                Thank You!
              </h4>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 font-normal max-w-xs mx-auto">
                Your feedback was sent directly to our team at{" "}
                <span className="font-semibold text-blue-600">hello@spellense.com</span>. We truly appreciate your time!
              </p>
              <div className="mt-5 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Send another
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
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
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Category
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {FEEDBACK_TYPES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setType(item.id)}
                      className={`flex flex-col items-center justify-center gap-1 rounded-xl p-2 text-[11px] font-bold transition cursor-pointer ${
                        type === item.id
                          ? "bg-blue-600 text-white shadow-xs shadow-blue-600/25 scale-[1.02]"
                          : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/70"
                      }`}
                    >
                      <span className="text-sm">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* MESSAGE TEXTAREA */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Your Message
                </label>
                <textarea
                  ref={textareaRef}
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What's on your mind? What can we improve, add, or fix?"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition resize-none font-normal"
                />
              </div>

              {/* EMAIL (OPTIONAL) */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Email <span className="font-normal text-slate-400 lowercase">(optional, for replies)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition font-normal"
                />
              </div>

              {errorMessage && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-center text-xs font-semibold text-rose-700">
                  {errorMessage}
                </div>
              )}

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={isSubmitting || !message.trim()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2.5 px-4 text-xs shadow-md shadow-blue-600/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <span>Send to hello@spellense.com</span>
                    <span>→</span>
                  </>
                )}
              </button>

              {/* FOOTER DIRECT EMAIL LINK */}
              <div className="text-center pt-1 border-t border-slate-100">
                <a
                  href={`mailto:hello@spellense.com?subject=Spellense Feedback (${type})&body=${encodeURIComponent(message || "")}`}
                  className="text-[11px] text-slate-400 hover:text-blue-600 transition"
                >
                  Or email directly to <span className="font-semibold text-slate-600 hover:text-blue-600">hello@spellense.com</span>
                </a>
              </div>
            </form>
          )}
        </div>
      )}

      {/* FLOATING ACTION CIRCLE BUTTON (FAB) */}
      <div className="relative flex items-center gap-2">
        {/* HOVER TOOLTIP PILL */}
        {!isOpen && !hasInteracted && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-blue-200/80 bg-white/95 px-3 py-1.5 text-xs font-bold text-blue-700 shadow-md shadow-blue-900/5 backdrop-blur-md animate-bounce">
            <span>💬</span>
            <span>Feedback?</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleToggle}
          aria-label={isOpen ? "Close feedback form" : "Open feedback form"}
          aria-expanded={isOpen}
          className={`flex h-13 w-13 items-center justify-center rounded-full text-white shadow-xl shadow-blue-600/30 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer ${
            isOpen
              ? "bg-slate-900 hover:bg-black rotate-90 shadow-slate-900/30"
              : "bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 border-2 border-white/40 hover:shadow-blue-600/50"
          }`}
        >
          {isOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
