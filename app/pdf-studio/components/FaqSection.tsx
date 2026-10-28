import React from "react";
import { ChevronDown } from "lucide-react";

export const FAQ_ITEMS = [
  {
    q: "Are my confidential PDF documents uploaded to any server?",
    a: "No. Spellense PDF Studio processes 100% locally in your web browser RAM using HTML5 Canvas and WebAssembly. Your documents, banking statements, and legal agreements are never uploaded or transmitted to any external server.",
  },
  {
    q: "What happens to redacted pages when I export?",
    a: "Edited or redacted pages are flattened into images when exported, so their original text is no longer selectable in the exported PDF; untouched pages keep their original selectable text. Pixel Blur may be partly recoverable, so use Blackout for sensitive data. The source document remains in this browser tab's memory while you are editing.",
  },
  {
    q: "Can I patch outdated prices, dates, or typos?",
    a: "Yes! Use the Whiteout tool to seamlessly cover the outdated price or text, then select the Text tool to type your updated information with matching font and size.",
  },
  {
    q: "Can I combine multiple PDFs or reorder pages?",
    a: "Yes. In the Pages organizer mode, you can reorder pages with simple move buttons, rotate pages 90 degrees, delete unwanted pages, and click 'Add Pages' to merge pages from other PDF files or images.",
  },
];

export default function FaqSection() {
  return (
    <section
      style={{ borderTop: "1px solid #e5e5df" }}
      className="mt-16 sm:mt-24 pt-12 sm:pt-16"
    >
      <div className="mx-auto max-w-4xl text-center mb-8">
        <span className="text-xs font-bold uppercase tracking-wider text-[#3158d5]">FAQ</span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1c201a] mt-1">
          Frequently Asked Questions
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-[#70746d]">
          Everything you need to know about in-browser editing, whiteout patching, and redaction.
        </p>
      </div>

      <div className="mx-auto max-w-3xl space-y-3">
        {FAQ_ITEMS.map((faq, i) => (
          <details
            key={i}
            style={{ borderColor: "#eeede6", backgroundColor: "#ffffff" }}
            className="group rounded-2xl border p-4 shadow-2xs transition-all open:border-[#3158d5]/50"
          >
            <summary className="flex cursor-pointer items-center justify-between font-bold text-sm text-[#1c201a] list-none">
              <span>{faq.q}</span>
              <span className="ml-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f6f5f3] text-slate-500 transition-transform duration-200 group-open:rotate-180">
                <ChevronDown className="w-3.5 h-3.5" />
              </span>
            </summary>
            <p className="mt-2.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
              {faq.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

