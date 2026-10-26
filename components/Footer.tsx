import Link from "next/link";

const FOOTER_ROW_1 = [
  { label: "Home", href: "/" },
  { label: "3D Flipbook", href: "/flipbook", badge: "New" },
  { label: "Image Compressor", href: "/image-compressor" },
  { label: "ID Print Maker", href: "/print-sheet-maker", badge: "New" },
  { label: "QR Code Generator", href: "/qr-code-generator", badge: "New" },
  { label: "Image to Text", href: "/image-to-text" },
];

const FOOTER_ROW_2 = [
  { label: "Design Check", href: "/design-check", badge: "New" },
  { label: "Case Converter", href: "/case-converter" },
  { label: "US ↔ UK Dialect", href: "/us-uk-converter" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Contact", href: "/contact" },
];

export default function Footer({ currentPath }: { currentPath?: string }) {
  const renderLink = (link: { label: string; href: string; badge?: string }) => {
    const isCurrent = currentPath === link.href;
    return (
      <Link
        key={link.href}
        href={link.href}
        className={`inline-flex items-center gap-1 transition ${
          isCurrent
            ? "font-bold text-blue-600"
            : "hover:text-slate-900"
        }`}
      >
        <span>{link.label}</span>
        {link.badge && (
          <span className="rounded bg-blue-50 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-600">
            {link.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <footer className="border-t border-slate-200/70 bg-white px-5 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center justify-between gap-6 text-center sm:flex-row sm:items-start sm:text-left">
          <div className="sm:max-w-[275px] shrink-0">
            <div className="text-lg font-bold text-slate-900 leading-none">
              Spellense
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Free online tools for images, documents,<br className="hidden sm:inline" /> and creative workflows — 100% private and browser-based.
            </p>
          </div>

          <div className="flex flex-col items-center sm:items-end gap-2.5 flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3.5 sm:gap-x-5 text-xs text-slate-500 leading-none">
              {FOOTER_ROW_1.map(renderLink)}
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3.5 sm:gap-x-5 text-xs text-slate-500 leading-none">
              {FOOTER_ROW_2.map(renderLink)}
            </div>

            <div className="flex justify-center sm:justify-end pt-1">
              <a
                href="https://twelve.tools"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Featured on Twelve Tools"
                className="inline-flex items-center justify-center transition-opacity duration-200 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2"
              >
                <img
                  src="https://twelve.tools/badge0-white.svg"
                  alt="Featured on Twelve Tools"
                  width={148}
                  height={40}
                  className="h-10 w-[148px] object-contain"
                  loading="lazy"
                />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-100 pt-5 text-center text-[11px] text-slate-400">
          &copy; {new Date().getFullYear()} Spellense. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
